const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const Queue = require('bull');
const FastRunPodComfyUIClient = require('./test/fast-runpod-client');
const { OpenAI } = require('openai');

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? 
  new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : 
  null;

if (openai) {
  console.log('OpenAI client initialized successfully for image generation');
} else {
  console.warn('OpenAI API key not found. OpenAI image generation will not work.');
}

// Initialize RunPod clients
let runpodClient = null;
let directComfyUIClient = null;
const FORCE_DIRECT_COMFYUI = process.env.FORCE_DIRECT_COMFYUI === 'true';

// Check if we have a RunPod Endpoint ID (serverless)
if (!FORCE_DIRECT_COMFYUI && process.env.RUNPOD_API_KEY && process.env.RUNPOD_ENDPOINT_ID) {
  runpodClient = new FastRunPodComfyUIClient(
    process.env.RUNPOD_API_KEY,
    process.env.RUNPOD_ENDPOINT_ID
  );
  console.log('Fast RunPod ComfyUI client initialized');
} else if (FORCE_DIRECT_COMFYUI) {
  console.log('FORCE_DIRECT_COMFYUI is enabled - serverless RunPod will not be used');
} else {
  console.warn('RunPod credentials not found. Serverless image generation will not work.');
}

// Initialize Redis for rate limiting
let redis = null;
let limiter = null;
let userImageLimiter = null;
let imageGenerationQueue = null;

// Create a simple cache for generated images
const imageCache = new Map();

// Hash function to create a cache key from input parameters
function createCacheKey(params) {
  const { characters, environment, action, style, model } = params;
  const characterNames = characters.map(c => c.name).join(',');
  return `${characterNames}_${environment}_${action}_${style}_${model}`.toLowerCase().replace(/\s+/g, '_');
}

// Function to check cache before generating
function getCachedImage(cacheKey) {
  if (imageCache.has(cacheKey)) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return imageCache.get(cacheKey);
  }
  return null;
}

// Function to cache a generated image
function cacheImage(cacheKey, data) {
  if (!cacheKey || !data || !data.imagePath) {
    console.warn('Cannot cache image: Invalid or missing data');
    return false;
  }
  
  console.log(`Caching image result for key: ${cacheKey}`);
  imageCache.set(cacheKey, {
    ...data,
    generatedAt: new Date()
  });
  return true;
}

// Function to setup Redis and related services
async function setupRedisServices() {
  try {
    // Check if Redis is available by trying to connect with a short timeout
    const redisCheck = new Redis({
      host: 'localhost',
      port: 6379,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Don't retry
    });

    // Wait for ready or error
    await new Promise((resolve, reject) => {
      redisCheck.once('ready', () => {
        console.log('Redis connected');
        resolve();
      });
      
      redisCheck.once('error', (err) => {
        console.warn('Redis not available:', err.message);
        reject(err);
      });
    });

    // If we got here, Redis is available, so create a real connection
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Create rate limiter
    limiter = rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      }),
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 requests per hour per IP
      message: { error: 'Too many requests, please try again later.' }
    });
    
    // User-specific rate limiting for image generation
    userImageLimiter = rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
        prefix: 'user-image-limit:',
      }),
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 50, // 50 images per day per user
      message: { error: 'Daily image generation limit reached. Please try again tomorrow.' }
    });
    
    // Create queue
    imageGenerationQueue = new Queue('image-generation', process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Setup queue processor
    imageGenerationQueue.process(async (job) => {
      try {
        const { prompt, negativePrompt, outputPath, cacheKey } = job.data;
        
        // Set job progress to started
        job.progress(10);
        
        // Use the RunPod client to generate the image
        const runpodJob = await runpodClient.generateWithFallbacks({
          prompt,
          negative_prompt: negativePrompt
        });
        
        // Update progress
        job.progress(50);
        
        // Process the result
        const result = await runpodJob.waitForCompletion(
          30, // 30 attempts max
          3000 // Poll every 3 seconds to reduce API calls
        );
        
        // Update progress
        job.progress(80);
        
        if (!result.output || !result.output.images || result.output.images.length === 0) {
          throw new Error('No image in result');
        }
        
        // Extract filename from path
        const outputFilename = path.basename(outputPath);
        
        // Save the image
        const imageData = result.output.images[0].image;
        
        console.log('Image data received from RunPod:', imageData ? 'Valid data' : 'No data');
        
        // Save the base64 image to a file
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        console.log(`Base64 data length: ${base64Data.length} characters`);
        console.log(`Saving image to ${outputPath}`);
        console.log(`Directory exists: ${fs.existsSync(path.dirname(outputPath))}`);
        
        try {
          // Make sure we have valid base64 data
          if (!base64Data || base64Data.length < 100) {
            throw new Error('Invalid or empty base64 image data received from RunPod');
          }
          
          // Create a buffer from base64
          const imageBuffer = Buffer.from(base64Data, 'base64');
          console.log(`Image buffer created, size: ${imageBuffer.length} bytes`);
          
          // Write the file synchronously
          fs.writeFileSync(outputPath, imageBuffer);
          console.log(`Image saved successfully to ${outputPath}`);
          console.log(`File exists after save: ${fs.existsSync(outputPath)}`);
          console.log(`File size: ${fs.statSync(outputPath).size} bytes`);
        } catch (saveError) {
          console.error(`Error saving image: ${saveError.message}`);
          console.error(saveError.stack);
          throw saveError;
        }
        
        // Create web-accessible path
        const webPath = `/outputs/${outputFilename}`;
        console.log(`Web path for image: ${webPath}`);
        
        // Save to cache
        if (cacheKey) {
          imageCache.set(cacheKey, {
            imagePath: webPath,
            generatedAt: new Date()
          });
        }
        
        // Complete job progress
        job.progress(100);
        
        // Return the result
        return {
          success: true,
          imagePath: webPath,
          generatedAt: new Date()
        };
      } catch (error) {
        console.error('Image generation failed in queue:', error.message);
        throw error;
      }
    }, { 
      concurrency: 2 // Process up to 2 jobs simultaneously
    });
    
    return true;
  } catch (error) {
    console.warn('Redis services disabled:', error.message);
    
    // Fallback to memory store for rate limiting
    limiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 requests per hour per IP
      message: { error: 'Too many requests, please try again later.' }
    });
    
    userImageLimiter = rateLimit({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 50, // 50 images per day per user
      message: { error: 'Daily image generation limit reached. Please try again tomorrow.' }
    });
    
    return false;
  }
}

// Updated helper function for GPT-4o + DALL-E 3 workflow
async function generateImageWithGPT4o(characters, environment, action, style, negativePrompt, outputPath) {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  console.log('Generating panel using GPT-4o + DALL-E 3 workflow...');

  try {
    // 1. Prepare inputs for GPT-4o
    const characterDetails = characters.map(c => `Name: ${c.name}, Description: ${c.description || 'N/A'}`).join('; ');
    const baseTextPrompt = `Create a manga panel in ${style} style. Setting: ${environment}. Action: ${action}. Characters involved: ${characterDetails}. Avoid: ${negativePrompt || 'none'}.`;

    // Create the initial system message
    const messages = [
      {
        role: "system",
        content: "You are an expert manga/anime scene prompt generator. Based on the user's request and the provided character images, create a highly detailed and descriptive prompt suitable for DALL-E 3 to generate the described panel accurately. Focus on visual details: character poses, expressions, composition, background elements, and overall mood, adhering to the requested style. Ensure the prompt explicitly asks DALL-E 3 to reference the provided character images for visual consistency. Incorporate negative constraints directly into the positive prompt. Output *only* the final DALL-E 3 prompt."
      }
    ];
    
    // Start building a user message with clear character identification
    const userMessageContent = [
      { 
        type: "text", 
        text: `You are helping create a manga panel in ${style} style. Below are the character references for the scene.` 
      }
    ];

    // Add character images to the message content, paired with their names
    let imageCount = 0;
    for (const character of characters) {
      // Log the character object to debug image properties
      console.log(`Processing character for GPT-4o: ${character.name}`, {
        imageUrl: character.imageUrl,
        thumbnail: character.thumbnail,
        imagePath: character.imagePath
      });
      
      // Try multiple possible image fields
      const imageUrl = character.imageUrl || character.thumbnail || character.imagePath;
      
      if (imageUrl) {
        try {
          console.log(`Processing character image for ${character.name}: ${imageUrl.substring(0, 60)}...`);
          let imageData;
          
          if (imageUrl.startsWith('http')) {
            // Remote URL - fetch it
            console.log(`Fetching remote image for ${character.name} from: ${imageUrl}`);
            const response = await axios.get(imageUrl, { 
              responseType: 'arraybuffer', 
              timeout: 15000,
              headers: { 'User-Agent': 'Mozilla/5.0 (Manga Creator App)' } // Some servers require a user agent
            });
            imageData = Buffer.from(response.data).toString('base64');
            console.log(`Successfully fetched remote image for ${character.name}, size: ${response.data.length} bytes`);
          } else if (imageUrl.startsWith('/outputs/') || imageUrl.startsWith('./outputs/')) {
            // Local path - read file
            const localPath = path.resolve(
              imageUrl.startsWith('/') 
                ? path.join(__dirname, 'public', imageUrl) 
                : path.join(__dirname, imageUrl)
            );
            console.log(`Looking for local image at: ${localPath}`);
            
            if (fs.existsSync(localPath)) {
              const fileData = fs.readFileSync(localPath);
              imageData = fileData.toString('base64');
              console.log(`Successfully read local image for ${character.name}, size: ${fileData.length} bytes`);
            } else {
              console.warn(`Local character image not found: ${localPath}`);
              continue;
            }
          } else {
            // Try as an absolute path
            const absolutePath = path.resolve(imageUrl);
            console.log(`Trying absolute path: ${absolutePath}`);
            
            if (fs.existsSync(absolutePath)) {
              const fileData = fs.readFileSync(absolutePath);
              imageData = fileData.toString('base64');
              console.log(`Successfully read image from absolute path for ${character.name}`);
            } else {
              console.warn(`Unsupported character image URL format or file not found: ${imageUrl}`);
              continue;
            }
          }

          // Determine image MIME type
          const imageType = imageUrl.split('.').pop().toLowerCase();
          const mimeType = 
            imageType === 'png' ? 'image/png' : 
            imageType === 'jpg' || imageType === 'jpeg' ? 'image/jpeg' :
            imageType === 'webp' ? 'image/webp' :
            'image/png'; // Default to PNG if unknown

          // Add an explicit identifier text before the image
          userMessageContent.push(
            { type: "text", text: `This is ${character.name}:` }
          );
          
          // Add the image
          userMessageContent.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageData}`,
              detail: "high" // Use high detail for character recognition
            }
          });
          
          // Add any character description if available
          if (character.description) {
            userMessageContent.push(
              { type: "text", text: `Description of ${character.name}: ${character.description}` }
            );
          }
          
          imageCount++;
          console.log(`Successfully added image for ${character.name} to GPT-4o prompt`);
        } catch (imgError) {
          console.error(`Failed to fetch or process character image ${imageUrl}: ${imgError.message}`);
          if (imgError.stack) console.error(imgError.stack);
          userMessageContent.push({ type: "text", text: `(Note: Failed to load image for character ${character.name})` });
        }
      } else {
        console.warn(`No image URL found for character: ${character.name}`);
      }
    }
    
    // Now add the final instruction with the action and environment details
    userMessageContent.push({ 
      type: "text", 
      text: `Now generate a prompt for DALL-E 3 to create a manga panel that shows: ${action}
Environment/Setting: ${environment}
Style: ${style}
The prompt should refer to each character by name, matching them to their appearance in the reference images provided above.`
    });
    
    // Add the completed user message to the messages array
    messages.push({
      role: "user",
      content: userMessageContent
    });
    
    console.log(`Added ${imageCount} character images to GPT-4o prompt.`);

    // 2. Call GPT-4o to generate the DALL-E prompt
    console.log("Calling GPT-4o to generate DALL-E prompt...");
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 500 // Allow more tokens for potentially detailed prompts
    });

    if (!chatCompletion.choices || chatCompletion.choices.length === 0 || !chatCompletion.choices[0].message.content) {
        throw new Error('No prompt generated by GPT-4o');
    }
    const dallePrompt = chatCompletion.choices[0].message.content.trim();
    console.log(`Generated DALL-E Prompt (length ${dallePrompt.length}): ${dallePrompt.substring(0, 200)}...`);

    // 3. Call DALL-E 3 to generate the image
    console.log("Calling DALL-E 3 to generate image...");
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: style === 'manga' ? 'natural' : 'vivid',
    });

    console.log('DALL-E 3 response received.');

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }

    const generatedImageUrl = imageResponse.data[0].url;
    if (!generatedImageUrl) {
      throw new Error('No image URL in DALL-E 3 response');
    }

    // 4. Download and save the image
    console.log(`Downloading final image from DALL-E 3: ${generatedImageUrl}`);
    const finalImageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 45000 // Increased timeout for potentially larger DALL-E images
    });
    const imageBuffer = Buffer.from(finalImageResponse.data);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`Final panel image saved to ${outputPath}`);

    const outputFilename = path.basename(outputPath);
    const webPath = `/outputs/${outputFilename}`;

    return {
      success: true,
      imagePath: webPath,
      prompt: dallePrompt // Return the generated prompt for reference
    };

  } catch (error) {
    console.error('Error in GPT-4o/DALL-E 3 image generation workflow:', error.message);
    if (error.response) {
      console.error('OpenAI API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    // Return failure object for the route handler
    return { success: false, message: `GPT-4o/DALL-E 3 Error: ${error.message}` };
  }
}

// Add a specialized function for single character generation
async function generateSingleCharacterWithGPT4o(character, environment, action, style, negativePrompt, outputPath) {
  console.log('Generating single character using GPT-4o + DALL-E 3 workflow...');

  try {
    // Create the initial system message with specific instructions for a SINGLE character
    const messages = [
      {
        role: "system",
        content: "You are an expert character designer. You will create a detailed prompt for DALL-E 3 to generate a SINGLE CHARACTER portrait based on the user's description. Focus on creating a full-body portrait of ONLY ONE CHARACTER with clear details of their appearance. Do NOT introduce additional characters. Output ONLY the final DALL-E 3 prompt."
      }
    ];
    
    // Start building a user message
    const userMessageContent = [
      { 
        type: "text", 
        text: `Create a high-quality ${style || 'anime'} style portrait of a SINGLE CHARACTER.` 
      }
    ];

    // Process character images if available
    const imageUrl = character.imageUrl || character.thumbnail || character.imagePath;
    if (imageUrl) {
      try {
        console.log(`Processing reference image for character: ${imageUrl.substring(0, 60)}...`);
        let imageData;
        
        if (imageUrl.startsWith('http')) {
          // Remote URL - fetch it
          const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer', 
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Character Creator App)' }
          });
          imageData = Buffer.from(response.data).toString('base64');
        } else if (imageUrl.startsWith('/outputs/') || imageUrl.startsWith('./outputs/')) {
          // Local path - read file
          const localPath = path.resolve(
            imageUrl.startsWith('/') 
              ? path.join(__dirname, 'public', imageUrl) 
              : path.join(__dirname, imageUrl)
          );
          
          if (fs.existsSync(localPath)) {
            const fileData = fs.readFileSync(localPath);
            imageData = fileData.toString('base64');
          }
        } else {
          // Try as an absolute path
          const absolutePath = path.resolve(imageUrl);
          
          if (fs.existsSync(absolutePath)) {
            const fileData = fs.readFileSync(absolutePath);
            imageData = fileData.toString('base64');
          }
        }

        if (imageData) {
          // Determine image MIME type
          const imageType = imageUrl.split('.').pop().toLowerCase();
          const mimeType = 
            imageType === 'png' ? 'image/png' : 
            imageType === 'jpg' || imageType === 'jpeg' ? 'image/jpeg' :
            imageType === 'webp' ? 'image/webp' :
            'image/png'; // Default to PNG if unknown

          // Add the image reference
          userMessageContent.push(
            { type: "text", text: `Here's a reference image (if any):` }
          );
          
          userMessageContent.push({
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageData}`,
              detail: "high"
            }
          });
        }
      } catch (imgError) {
        console.log(`Could not process reference image: ${imgError.message}`);
      }
    }
    
    // Add character details
    userMessageContent.push({ 
      type: "text", 
      text: `Character details:
Name: ${character.name || 'Unnamed Character'}
Description: ${character.description || 'No description provided'}

Please create a prompt for DALL-E 3 to generate a FULL BODY PORTRAIT of this SINGLE CHARACTER with the following specs:
- Character should be: ${action || 'standing in a neutral pose'}
- Environment: ${environment || 'simple studio background'}
- Style: ${style || 'anime'}
- Show the ENTIRE body from head to feet
- Character should be centered in the frame
- IMPORTANT: Generate ONLY ONE CHARACTER - do not add any other people or characters to the scene
- DO NOT create a manga panel with multiple characters
- Focus solely on creating this single character as described`
    });
    
    // Add the completed user message to the messages array
    messages.push({
      role: "user",
      content: userMessageContent
    });

    // Call GPT-4o to generate the DALL-E prompt
    console.log("Calling GPT-4o to generate character prompt...");
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 500
    });

    if (!chatCompletion.choices || chatCompletion.choices.length === 0 || !chatCompletion.choices[0].message.content) {
      throw new Error('No prompt generated by GPT-4o');
    }
    const dallePrompt = chatCompletion.choices[0].message.content.trim();
    console.log(`Generated DALL-E Character Prompt: ${dallePrompt.substring(0, 200)}...`);

    // Call DALL-E 3 to generate the image
    console.log("Calling DALL-E 3 to generate character image...");
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: style === 'manga' ? 'natural' : 'vivid',
    });

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error('No image generated by DALL-E 3');
    }

    const generatedImageUrl = imageResponse.data[0].url;
    if (!generatedImageUrl) {
      throw new Error('No image URL in DALL-E 3 response');
    }

    // Download and save the image
    console.log(`Downloading character image from DALL-E 3: ${generatedImageUrl}`);
    const finalImageResponse = await axios.get(generatedImageUrl, {
      responseType: 'arraybuffer',
      timeout: 45000
    });
    const imageBuffer = Buffer.from(finalImageResponse.data);

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`Character image saved to ${outputPath}`);

    const outputFilename = path.basename(outputPath);
    const webPath = `/outputs/${outputFilename}`;

    return {
      success: true,
      imagePath: webPath,
      prompt: dallePrompt
    };

  } catch (error) {
    console.error('Error in GPT-4o/DALL-E 3 character generation:', error.message);
    if (error.response) {
      console.error('OpenAI API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, message: `Character Generation Error: ${error.message}` };
  }
}

// Call setup but don't wait for it
setupRedisServices().then(redisAvailable => {
  console.log(`Redis services ${redisAvailable ? 'enabled' : 'disabled'}`);
});

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Serve static files
app.use('/outputs', express.static(path.join(__dirname, 'public', 'outputs')));
app.use(express.static(path.join(__dirname, 'public')));

// Create directory for outputs
const outputsDir = path.join(__dirname, 'public', 'outputs');
if (!fs.existsSync(outputsDir)) {
  console.log(`Creating outputs directory: ${outputsDir}`);
  fs.mkdirSync(outputsDir, { recursive: true });
  console.log(`Outputs directory created successfully`);
} else {
  console.log(`Outputs directory already exists: ${outputsDir}`);
}

// Store rendering queue and status
const renderQueue = [];
let isProcessing = false;

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// RunPod validation endpoint
app.get('/api/debug/runpod-test', async (req, res) => {
  try {
    if (!runpodClient) {
      return res.json({
        success: false,
        message: 'RunPod client not initialized. Check your API credentials.'
      });
    }
    
    console.log('Testing RunPod connection...');
    
    // Check if credentials work by testing health endpoint
    try {
      const health = await runpodClient.checkHealth();
      console.log('RunPod health check result:', health);
    } catch (healthError) {
      console.error('RunPod health check failed:', healthError.message);
      return res.json({
        success: false,
        message: `RunPod health check failed: ${healthError.message}`,
        error: healthError.message
      });
    }
    
    // Start a simple test job
    try {
      console.log('Starting test job with minimal prompt...');
      const job = await runpodClient.generateWithFallbacks({
        prompt: "simple anime character test",
        negative_prompt: "bad quality"
      });
      
      console.log('Test job started:', job.id);
      return res.json({
        success: true,
        message: 'RunPod test job started. Check server logs for results.',
        jobId: job.id
      });
    } catch (jobError) {
      console.error('Failed to start RunPod test job:', jobError.message);
      return res.json({
        success: false,
        message: `Failed to start RunPod test job: ${jobError.message}`,
        error: jobError.message
      });
    }
  } catch (error) {
    console.error('RunPod test error:', error);
    return res.json({
      success: false,
      message: `RunPod test failed: ${error.message}`
    });
  }
});

// Debug endpoint for testing image save
app.get('/api/debug/save-test-image', (req, res) => {
  try {
    const testOutputFilename = `test_image_${Date.now()}.png`;
    const testOutputPath = path.join(outputsDir, testOutputFilename);
    
    // Create a simple 100x100 black square image in PNG format
    const width = 100;
    const height = 100;
    const buffer = Buffer.alloc(width * height * 4);
    
    for (let i = 0; i < buffer.length; i += 4) {
      buffer[i] = 0;     // R
      buffer[i + 1] = 0; // G
      buffer[i + 2] = 0; // B
      buffer[i + 3] = 255; // A (fully opaque)
    }
    
    console.log(`Saving test image to ${testOutputPath}`);
    console.log(`Directory exists: ${fs.existsSync(path.dirname(testOutputPath))}`);
    
    try {
      // Simple PNG header hack for testing
      const header = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // "IHDR"
        0x00, 0x00, 0x00, 0x64, // width (100)
        0x00, 0x00, 0x00, 0x64, // height (100)
        0x08, 0x06, 0x00, 0x00, 0x00 // bit depth, color type, compression, filter, interlace
      ]);
      
      fs.writeFileSync(testOutputPath, Buffer.concat([header, buffer]));
      console.log(`Test image saved successfully to ${testOutputPath}`);
      console.log(`File exists after save: ${fs.existsSync(testOutputPath)}`);
      
      const webPath = `/outputs/${testOutputFilename}`;
      return res.json({
        success: true,
        message: 'Test image created successfully',
        imagePath: webPath,
        imageUrl: `http://localhost:5001${webPath}`
      });
    } catch (saveError) {
      console.error(`Error saving test image: ${saveError.message}`);
      console.error(saveError.stack);
      throw saveError;
    }
  } catch (error) {
    console.error('Test image creation error:', error);
    return res.json({
      success: false,
      message: `Test image creation failed: ${error.message}`
    });
  }
});

// Debug endpoint for direct ComfyUI
app.get('/api/debug/comfyui-test', async (req, res) => {
  try {
    if (!directComfyUIClient) {
      return res.json({
        success: false,
        message: 'Direct ComfyUI client not initialized. Check your URL configuration.'
      });
    }
    
    console.log('Testing Direct ComfyUI connection...');
    
    // Check if API is accessible
    try {
      const systemStats = await axios.get(`${directComfyUIClient.baseUrl}/system_stats`, {
        timeout: 10000
      });
      
      // Check available models
      const objectInfo = await axios.get(`${directComfyUIClient.baseUrl}/object_info`, {
        timeout: 10000
      });
      
      // Extract available models
      let availableModels = [];
      if (objectInfo.data && objectInfo.data.CheckpointLoaderSimple && 
          objectInfo.data.CheckpointLoaderSimple.input.required.ckpt_name) {
        const ckptInfo = objectInfo.data.CheckpointLoaderSimple.input.required.ckpt_name;
        if (ckptInfo.options) {
          availableModels = ckptInfo.options;
        }
      }
      
      return res.json({
        success: true,
        systemStats: systemStats.data,
        availableModels,
        message: 'ComfyUI connection successful'
      });
    } catch (error) {
      console.error('ComfyUI connection test failed:', error.message);
      return res.json({
        success: false,
        message: `ComfyUI connection test failed: ${error.message}`,
        error: error.message
      });
    }
  } catch (error) {
    console.error('ComfyUI test error:', error);
    return res.json({
      success: false,
      message: `ComfyUI test failed: ${error.message}`
    });
  }
});

// Character generation endpoint
app.post('/api/generate-character', async (req, res) => {
  console.log('Character generation request received:', JSON.stringify(req.body, null, 2));
  
  const { name, description, physicalTraits = {}, facialFeatures = {}, hairFeatures = {}, extras = {}, role, artStyle } = req.body;
  
  try {
    // Create output filename
    const outputFilename = `character_${Date.now()}.png`;
    const outputPath = path.join(outputsDir, outputFilename);
    
    // Construct prompt based on whether we have a description or detailed traits
    let prompt;
    
    if (description) {
      // Use the text description with more explicit full-body framing
      prompt = `${artStyle || 'anime style'}, ENTIRE BODY AND FACE VIEW of character named ${name || 'character'}, ${description}. Full-length portrait showing 100% of body from top of head to bottom of feet. Face fully visible and detailed. Character centered with feet touching bottom edge of frame. No cropping of any body parts. High quality, detailed.`;
    } else {
      // Use the detailed traits with more explicit full-body framing
      prompt = `${artStyle || 'anime style'}, ENTIRE BODY AND FACE VIEW of character named ${name || 'character'}, `;
      
      // Add physical traits
      if (physicalTraits.race) prompt += `${physicalTraits.race}, `;
      if (physicalTraits.age) prompt += `${physicalTraits.age}, `;
      if (physicalTraits.height) prompt += `${physicalTraits.height} height, `;
      if (physicalTraits.bodyType) prompt += `${physicalTraits.bodyType} body type, `;
      
      // Add facial features
      if (facialFeatures.faceShape) prompt += `${facialFeatures.faceShape} face, `;
      if (facialFeatures.skinTone) prompt += `${facialFeatures.skinTone} skin, `;
      if (facialFeatures.eyeColor) prompt += `${facialFeatures.eyeColor} eyes, `;
      if (facialFeatures.eyeShape) prompt += `${facialFeatures.eyeShape} eye shape, `;
      
      // Add hair features
      if (hairFeatures.hairColor) prompt += `${hairFeatures.hairColor} hair, `;
      if (hairFeatures.hairLength && hairFeatures.hairStyle) prompt += `${hairFeatures.hairLength} ${hairFeatures.hairStyle} hair, `;
      
      // Add extras and role
      if (extras.clothingStyle) prompt += `wearing ${extras.clothingStyle} style clothing, `;
      if (role) prompt += `${role} character, `;
      
      prompt += "Full-length portrait showing 100% of body from top of head to bottom of feet. Face fully visible and detailed. Character centered with feet touching bottom edge of frame. No cropping of any body parts. High quality, detailed.";
    }
    
    console.log('Generated prompt:', prompt);
    
    // Prepare negative prompt
    const negativePrompt = "bad quality, low quality, worst quality, mutated hands, extra limbs, poorly drawn face, poorly drawn hands, missing fingers, cropped feet, cropped legs, cut off feet, cut off legs, zoomed in, close up, no feet visible, partial body";
    
    // First try OpenAI if available
    if (openai) {
      try {
        console.log('Attempting to generate character using OpenAI...');
        
        // Create a properly formatted character object for single character generation
        const characterObject = {
          name: name,
          description: description || '',
          // If there's an existing image for this character, include it
          imageUrl: null // No existing image yet since we're generating one
        };
        
        // Set up environment and action based on character details
        const environment = "neutral studio background";
        const action = "standing in a professional character portrait pose, full body visible";
        
        // Use the specialized single character generation function
        const result = await generateSingleCharacterWithGPT4o(characterObject, environment, action, artStyle || 'anime', negativePrompt, outputPath);
        console.log('OpenAI result:', JSON.stringify(result));
        
        if (result && result.success) {
          console.log('Character generated successfully with OpenAI.');
          
          // Return the generated image data without saving to database
          return res.json({
            success: true,
            message: 'Character generated successfully via OpenAI',
            character: {
              name,
              imagePath: result.imagePath,
              prompt,
              role,
              artStyle,
              generatedWith: 'openai'
            }
          });
        } else {
          console.error('OpenAI generation returned unsuccessful result:', result);
          console.log('Falling back to DirectComfyUI...');
        }
      } catch (openaiError) {
        console.error('OpenAI generation failed:', openaiError);
        console.error('Error stack:', openaiError.stack);
        console.log('Falling back to DirectComfyUI...');
      }
    } else {
      console.log('OpenAI client not available. Falling back to DirectComfyUI...');
    }
    
    // Try Direct ComfyUI Pod as fallback
    if (directComfyUIClient) {
      try {
        console.log('Attempting to generate character using direct ComfyUI pod...');
        console.log('Using ComfyUI URL:', directComfyUIClient.baseUrl);
        
        const result = await directComfyUIClient.generateImage(prompt, negativePrompt);
        console.log('Direct ComfyUI result:', JSON.stringify(result));
        
        if (result && result.success) {
          console.log('Character generated successfully with direct ComfyUI pod.');
          
          // Return the generated image data without saving to database
          return res.json({
            success: true,
            message: 'Character generated successfully via direct ComfyUI pod',
            character: {
              name,
              imagePath: result.imagePath,
              prompt,
              role,
              artStyle,
              generatedWith: 'comfyui'
            }
          });
        } else {
          console.error('Direct ComfyUI generation returned unsuccessful result:', result);
          if (FORCE_DIRECT_COMFYUI) {
            return res.status(500).json({
              success: false,
              message: 'Direct ComfyUI generation failed and fallback is disabled'
            });
          }
          console.log('Falling back to RunPod serverless endpoint...');
        }
      } catch (directError) {
        console.error('Direct ComfyUI generation failed:', directError);
        console.error('Error stack:', directError.stack);
        if (FORCE_DIRECT_COMFYUI) {
          return res.status(500).json({
            success: false,
            message: `Direct ComfyUI generation failed and fallback is disabled: ${directError.message}`
          });
        }
        console.log('Falling back to RunPod serverless endpoint...');
      }
    }
    
    // Fall back to RunPod serverless endpoint as final option
    if (!runpodClient) {
      return res.status(500).json({
        success: false,
        message: 'Image generation unavailable. All generation methods failed or are not available.'
      });
    }
    
    // Generate the image using RunPod
    try {
      console.log('Generating character with RunPod as final fallback...');
      
      // Try with fallbacks to find the best model and parameters combination
      const job = await runpodClient.generateWithFallbacks({
        prompt: prompt,
        negative_prompt: negativePrompt
      });
      
      console.log('RunPod job started:', job.id);
      
      // Wait for job completion with a progress callback
      const result = await runpodClient.waitForJobCompletion(
        job.id, 
        60, // 60 attempts (up to 2 minutes)
        2000, // Poll every 2 seconds
        (status, attempt) => console.log(`Job status (attempt ${attempt + 1}/60): ${status.status}`)
      );
      
      console.log('Job completed successfully:', result.status);
      
      // Dump the structure to see what we're getting
      console.log('Result structure:', JSON.stringify({
        status: result.status,
        hasOutput: !!result.output,
        hasImages: result.output ? !!result.output.images : false,
        imageCount: result.output && result.output.images ? result.output.images.length : 0,
        firstImageKeys: result.output && result.output.images && result.output.images.length > 0 ? 
          Object.keys(result.output.images[0]) : []
      }, null, 2));
      
      // Process the result
      if (!result.output || !result.output.images || result.output.images.length === 0) {
        console.log('No image in RunPod result, creating a fallback image');
        
        // Create a fallback image - a colored rectangle with the character name
        const width = 512;
        const height = 768;
        
        // Write fallback image to file
        try {
          // Create a simple colored rectangle image as a fallback
          const testHeaderPNG = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 
            0x00, 0x00, 0x00, 0x0D, 
            0x49, 0x48, 0x44, 0x52, 
            0x00, 0x00, 0x02, 0x00,  // width 512
            0x00, 0x00, 0x03, 0x00,  // height 768
            0x08, 0x06, 0x00, 0x00, 0x00
          ]);
          
          // Create a buffer with random color data
          const dataSize = width * height * 4;
          const buffer = Buffer.alloc(dataSize);
          
          // Fill with a gradient color
          for (let i = 0; i < dataSize; i += 4) {
            buffer[i] = 50 + Math.floor(i / (dataSize/200));  // R increases gradually
            buffer[i + 1] = 80;                               // G constant
            buffer[i + 2] = 120;                              // B constant
            buffer[i + 3] = 255;                              // Alpha
          }
          
          fs.writeFileSync(outputPath, Buffer.concat([testHeaderPNG, buffer]));
          console.log(`Fallback image created at ${outputPath}`);
          
          // Continue with the regular flow using the fallback image
        } catch (fallbackError) {
          console.error('Failed to create fallback image:', fallbackError);
          throw new Error('Failed to generate character image: ' + fallbackError.message);
        }
      } else {
        // Process the actual image from RunPod
        const imageData = result.output.images[0].image;
        
        console.log('Image data received from RunPod:', imageData ? 'Valid data' : 'No data');
        console.log('Image data length:', imageData ? imageData.length : 0);
        
        // Save the base64 image to a file
        const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
        console.log(`Base64 data length: ${base64Data.length} characters`);
        console.log(`Saving image to ${outputPath}`);
        console.log(`Directory exists: ${fs.existsSync(path.dirname(outputPath))}`);
        
        try {
          fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
          console.log(`Image saved successfully to ${outputPath}`);
        } catch (saveError) {
          console.error(`Error saving image: ${saveError.message}`);
          throw saveError;
        }
      }
      
      // Get the relative path for the response
      const webPath = `/outputs/${outputFilename}`;
      console.log(`Web path for image: ${webPath}`);
      
      // Return the generated image data without saving to database
      return res.json({
        success: true,
        character: {
          name,
          imagePath: webPath,
          prompt,
          role,
          artStyle,
          generatedWith: 'runpod'
        }
      });
    } catch (runpodError) {
      console.error('RunPod generation error:', runpodError.message);
      return res.status(500).json({
        success: false,
        message: `Error generating character with RunPod: ${runpodError.message}`
      });
    }
  } catch (error) {
    console.error('Character generation error:', error);
    return res.status(500).json({
      success: false,
      message: `Error generating character: ${error.message}`
    });
  }
});

// Apply rate limiting to all routes (if available)
if (limiter) {
  app.use(limiter);
}

// Character endpoints
app.post('/api/characters', async (req, res) => {
  console.log('Character save request received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { name, description, imagePath, role, artStyle, story, prompt, generatedWith } = req.body;
    
    // Basic validation
    if (!name || !imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Name and imagePath are required fields'
      });
    }
    
    // Return success with the character data
    // Note: We're not saving to MongoDB - the frontend will handle saving to Firestore
    return res.json({
      success: true,
      message: 'Character data validated successfully',
      character: {
        name,
        description: description || null,
        imagePath,
        prompt: prompt || null,
        role: role || null,
        artStyle: artStyle || null,
        story: story || null,
        generatedWith: generatedWith || 'unknown',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error processing character:', error);
    return res.status(500).json({
      success: false,
      message: `Error processing character: ${error.message}`
    });
  }
});

// Scene generation endpoint (placeholder)
app.post('/api/generate-scene', (req, res) => {
  const { description, characters, background, dialogue } = req.body;
  
  // In a real implementation, this would call the AnimateDiff API
  // For now, we'll simulate a response
  setTimeout(() => {
    res.status(200).json({
      success: true,
      scene: {
        id: Date.now().toString(),
        videoUrl: 'https://via.placeholder.com/640x360.png?text=AI+Generated+Scene',
        description,
        duration: '0:30'
      }
    });
  }, 3000);
});

// Voice generation endpoint (placeholder)
app.post('/api/generate-voice', (req, res) => {
  const { text, voice, language } = req.body;
  
  // In a real implementation, this would call the TTS API (like Coqui)
  // For now, we'll simulate a response
  setTimeout(() => {
    res.status(200).json({
      success: true,
      voice: {
        id: Date.now().toString(),
        audioUrl: '/outputs/sample-voice.mp3', // This would be a real file path in production
        text,
        duration: '0:05'
      }
    });
  }, 1500);
});

// Episode rendering endpoint
app.post('/api/render-episode', (req, res) => {
  const { title, scenes, outputSettings } = req.body;
  
  const jobId = Date.now().toString();
  
  // Add to render queue
  renderQueue.push({
    id: jobId,
    title,
    scenes,
    outputSettings,
    status: 'queued',
    progress: 0,
    createdAt: new Date()
  });
  
  // Start processing if not already in progress
  if (!isProcessing) {
    processRenderQueue();
  }
  
  res.status(200).json({
    success: true,
    jobId,
    message: 'Episode added to render queue'
  });
});

// Manga panel generation endpoint
app.post('/api/generate-manga-panel', async (req, res) => {
  try {
    const { characters, environment, action, style, model, negativePrompt } = req.body;
    
    // Basic validation
    if (!characters || characters.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one character is required'
      });
    }
    
    if (!environment) {
      return res.status(400).json({
        success: false,
        message: 'Environment is required'
      });
    }
    
    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }
    
    console.log('Manga panel generation request received:', {
      charactersCount: characters.length,
      environment,
      action,
      style,
      model: model || 'gpt-4o'
    });
    
    // Create a unique job ID
    const jobId = `manga_panel_${Date.now()}_${model || 'gpt-4o'}`;
    
    // Define output path for the generated image
    const outputPath = path.join(__dirname, 'public', 'outputs', `${jobId}.png`);
    
    // Create a cache key for this request
    const cacheKey = createCacheKey({ characters, environment, action, style, model });
    const cachedResult = getCachedImage(cacheKey);
    
    if (cachedResult) {
      console.log(`Returning cached manga panel for key: ${cacheKey}`);
      return res.json({
        success: true,
        imagePath: cachedResult.imagePath,
        prompt: cachedResult.prompt,
        message: 'Retrieved from cache'
      });
    }
    
    // For direct/immediate generation (not queuing)
    if (model === 'gpt-4o') {
      // Start generating immediately and return job ID for status checking
      res.json({
        success: true,
        jobId,
        message: 'Manga panel generation started'
      });
      
      // Process after response is sent
      try {
        // Create the "jobs" map if it doesn't exist yet
        if (!global.jobs) {
          global.jobs = new Map();
        }
        
        // Store job info for status checks
        global.jobs.set(jobId, {
          id: jobId,
          state: 'active',
          progress: 10,
          createdAt: new Date()
        });
        
        // Generate the image
        const result = await generateImageWithGPT4o(
          characters,
          environment,
          action,
          style || 'manga',
          negativePrompt || '',
          outputPath
        );
        
        // Update job with success result
        const imagePath = `/outputs/${jobId}.png`;
        global.jobs.set(jobId, {
          id: jobId,
          state: 'completed',
          progress: 100,
          result: {
            panel: {
              imageUrl: imagePath
            }
          },
          completedAt: new Date()
        });
        
        // Cache the result
        cacheImage(cacheKey, {
          imagePath,
          prompt: result?.prompt || ''
        });
        
        console.log(`Manga panel generated successfully: ${imagePath}`);
      } catch (error) {
        console.error('Error generating manga panel:', error);
        
        // Update job with error result
        if (global.jobs) {
          global.jobs.set(jobId, {
            id: jobId,
            state: 'failed',
            error: error.message,
            completedAt: new Date()
          });
        }
      }
    } else {
      // Fallback or unsupported model
      return res.status(400).json({
        success: false,
        message: `Unsupported model: ${model}. Only gpt-4o is supported for manga panel generation.`
      });
    }
  } catch (error) {
    console.error('Error processing manga panel generation request:', error);
    return res.status(500).json({
      success: false,
      message: `Error generating manga panel: ${error.message}`
    });
  }
});

// Manga panel generation status endpoint
app.get('/api/generate-manga-panel/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  // Check if we have the job in memory
  if (!global.jobs || !global.jobs.has(jobId)) {
    return res.status(404).json({
      success: false,
      message: 'Job not found'
    });
  }
  
  const job = global.jobs.get(jobId);
  
  // Return appropriate response based on job state
  if (job.state === 'completed') {
    return res.json({
      success: true,
      state: 'completed',
      progress: 100,
      result: job.result
    });
  } else if (job.state === 'failed') {
    return res.json({
      success: false,
      state: 'failed',
      message: job.error || 'Unknown error occurred'
    });
  } else {
    // Still processing
    return res.json({
      success: true,
      state: job.state,
      progress: job.progress || 0
    });
  }
});

// Get render status endpoint
app.get('/api/render-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  const job = renderQueue.find(job => job.id === jobId);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'Job not found'
    });
  }
  
  res.status(200).json({
    success: true,
    job
  });
});

// Process render queue (simplified)
function processRenderQueue() {
  if (renderQueue.length === 0 || isProcessing) {
    return;
  }
  
  isProcessing = true;
  const job = renderQueue[0];
  
  // Simple simulation of progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    job.progress = Math.min(progress, 100);
    
    if (progress >= 100) {
      clearInterval(interval);
      job.status = 'completed';
      job.videoUrl = `https://example.com/video-${job.id}.mp4`;
      
      // Remove from queue
      renderQueue.shift();
      isProcessing = false;
      
      // Process next job
      processRenderQueue();
    }
  }, 1000);
}

// Test endpoint for GPT-4o integration
app.get('/api/test-gpt4o', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ success: false, message: 'OpenAI client not initialized' });
  }
  
  try {
    console.log('Testing GPT-4o API connection...');
    
    // Test simple text completion to verify API connection
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello!" }
      ],
      max_tokens: 10
    });
    
    const response = completion.choices[0].message.content;
    
    return res.json({
      success: true,
      message: 'GPT-4o API connection verified',
      response
    });
  } catch (error) {
    console.error('Error testing GPT-4o:', error);
    return res.status(500).json({
      success: false,
      message: `Error testing GPT-4o: ${error.message}`
    });
  }
});

// Start server and capture the server instance
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}, bound to all interfaces`);
});

// Function to gracefully shut down the server
const gracefulShutdown = async () => {
  console.log('Received shutdown signal. Starting graceful shutdown...');
  
  try {
    // Close HTTP server first
    server.close(() => {
      console.log('HTTP server closed.');
    });
    
    // Close Redis connection if available
    if (redis) {
      console.log('Closing Redis connection...');
      await redis.quit();
      console.log('Redis connection closed.');
    }
    
    // Close queues if they exist
    if (renderQueue) {
      console.log('Closing render queue...');
      await renderQueue.close();
      console.log('Render queue closed.');
    }
    
    console.log('All connections closed. Shutting down gracefully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);   // For Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // For kill command 