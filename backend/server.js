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
const Runway = require('@runwayml/sdk');
const { v2: cloudinary } = require('cloudinary');
const mp3Duration = require('mp3-duration');

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

    // Create the initial system message with more cinematic direction and strict instructions to honor user input
    const messages = [
      {
        role: "system",
        content: "You are a world-class anime storyboard artist. Your PRIMARY directive is to faithfully represent the user's specified action and environment EXACTLY as written - never reinterpret, paraphrase, or creatively alter these core elements. After ensuring precise adherence to the user's description, you may enhance the prompt with cinematic elements including pose details, composition, facial expressions, clothing motion, background depth, camera angles, lighting, and visual storytelling. Your prompt should create a dynamic, emotionally resonant scene while STRICTLY maintaining the exact action and environment specified by the user. Accuracy to user intent is your highest priority, with creative enhancements as secondary considerations."
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
    // Enhanced with more cinematic details and direction, with strict adherence to user's input
    const avoidText = negativePrompt ? `Avoid: ${negativePrompt}` : '';
    userMessageContent.push({ 
      type: "text", 
      text: `Now generate a prompt for DALL-E 3 to create a manga panel that shows: ${action}
Environment/Setting: ${environment}
Style: ${style}

CRITICAL INSTRUCTION: The prompt MUST preserve the exact action "${action}" and environment "${environment}" as specified above. Do not reinterpret, paraphrase, or creatively alter these core elements in any way.

After ensuring faithful reproduction of the specified action and environment, you may enhance the prompt with:
- Full body in dynamic action poses true to the specified action
- Dramatic camera angles (such as low-angle, over-the-shoulder, or bird's eye view)
- Clothing and hair in motion
- Realistic limb positioning
- Detailed environment elements with proper perspective
- Specific lighting effects (rim lighting, dramatic shadows, etc.) that enhance the mood
- Visual depth with proper foreground, midground, and background elements

The prompt should refer to each character by name, matching them to their appearance in the reference images provided above.

${avoidText}`
    });
    
    // Add the completed user message to the messages array
    messages.push({
      role: "user",
      content: userMessageContent
    });
    
    console.log(`Added ${imageCount} character images to GPT-4o prompt.`);

    // 2. Call GPT-4o to generate the DALL-E prompt with increased max_tokens
    console.log("Calling GPT-4o to generate DALL-E prompt...");
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000 // Increased from 500 to 1000 for more detailed prompts
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
      size: "1024x1792", // Changed from 1024x1024 to 9:16 aspect ratio
      quality: "hd",
      style: "vivid",
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
        content: "You are a masterful character designer and illustrator. Your PRIMARY directive is to faithfully represent the user's specified character, action, and environment EXACTLY as written - never reinterpret, paraphrase, or creatively alter these core elements. After ensuring precise adherence to the character's description and specified action, you may enhance the prompt with cinematic details like pose dynamics, facial expressions, clothing details, lighting, and composition. Create a full-body portrait that strictly maintains the character's identity and specified action while adding visual depth and professional quality. Accuracy to user intent is your highest priority, with creative enhancements as secondary considerations."
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
    
    // Add character details with enhanced instructions for more dynamic and cinematic presentation
    // while ensuring strict adherence to the character description and action
    const avoidText = negativePrompt ? `Avoid these issues: ${negativePrompt}` : '';
    userMessageContent.push({ 
      type: "text", 
      text: `Character details:
Name: ${character.name || 'Unnamed Character'}
Description: ${character.description || 'No description provided'}
Action: ${action || 'standing in a dynamic pose'}
Environment: ${environment || 'contextually appropriate background'}
Style: ${style || 'high-quality anime'}

CRITICAL INSTRUCTION: The prompt MUST preserve the exact character description and action "${action}" as specified above. Do not reinterpret, paraphrase, or creatively alter these core elements in any way.

Please create a prompt for DALL-E 3 to generate a FULL BODY PORTRAIT of this SINGLE CHARACTER that maintains strict fidelity to the character description and specified action, with these additional enhancements:

- Show the ENTIRE body from head to feet with realistic proportions and anatomy
- Ensure the character's pose accurately represents the specified action without creative reinterpretation
- Include dramatic lighting that creates depth and highlights key character features
- Add environmental elements that interact with the character (wind effects, reflections, shadows)
- Use a cinematic camera angle that best showcases the character's presence
- Pay special attention to clothing details including fabric texture, folds, and how it responds to the pose
- Hair should have volume, individual strands, and natural movement
- Face should have detailed features with expressive eyes that convey emotion
- IMPORTANT: Generate ONLY ONE CHARACTER - do not add any other people
- DO NOT create a manga panel with multiple characters
- Focus solely on creating this single character as described

${avoidText}`
    });
    
    // Add the completed user message to the messages array
    messages.push({
      role: "user",
      content: userMessageContent
    });

    // Call GPT-4o to generate the DALL-E prompt with increased max_tokens
    console.log("Calling GPT-4o to generate character prompt...");
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1000 // Increased from 500 to 1000 for more detailed prompts
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
      size: "1024x1792", // Changed from 1024x1024 to 9:16 aspect ratio
      quality: "hd",
      style: "vivid",
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

// Configure CORS properly
const corsOptions = {
  origin: '*', // In production, restrict to your frontend domain
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  exposedHeaders: ['Content-Length', 'Content-Type']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use('/outputs', express.static(path.join(__dirname, 'outputs'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Content-Type', 'video/mp4'); // Set proper content type for videos
  }
}));
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
        videoUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNjQwIDM2MCI+PHJlY3Qgd2lkdGg9IjY0MCIgaGVpZ2h0PSIzNjAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSIzMjAiIHk9IjE4MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+QUkgR2VuZXJhdGVkIFNjZW5lPC90ZXh0Pjwvc3ZnPg==',
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

// Image generation endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    console.log('Received image generation request:', req.body);
    
    const { prompt, model = 'dall-e-3', size = '1024x1024' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    
    // Check if OpenAI client is initialized
    if (!openai) {
      return res.status(500).json({ 
        success: false, 
        message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
      });
    }
    
    // Create a unique filename based on timestamp
    const timestamp = Date.now();
    const outputDir = path.join(__dirname, 'public', 'outputs');
    const imageFilename = `generated_image_${timestamp}.png`;
    const imagePath = path.join(outputDir, imageFilename);
    const publicPath = `outputs/${imageFilename}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Call OpenAI API
    const openaiResponse = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: 1,
      size: size === "1024x1024" ? "1024x1792" : size, // Use 9:16 ratio if default size was selected
      response_format: 'b64_json'
    });
    
    if (!openaiResponse.data || openaiResponse.data.length === 0) {
      throw new Error('No image generated by OpenAI');
    }
    
    // Get the base64 image data
    const imageData = openaiResponse.data[0].b64_json;
    
    // Write the image to file
    const imageBuffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);
    
    // Return success response with the file path
    res.json({
      success: true,
      message: 'Image generated successfully',
      imagePath: publicPath
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Send error response
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate image',
      error: error.toString()
    });
  }
});

// Animation generation endpoint using Runway SDK
app.post('/api/generate-animation', async (req, res) => {
  try {
    const { image, prompt, duration, style } = req.body;
    
    if (!image || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Image and prompt are required'
      });
    }

    // Initialize Runway client with API key
    const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
    if (!RUNWAY_API_KEY) {
      console.error('Runway API key not found in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Runway API key not configured'
      });
    }

    console.log('Starting animation generation with Runway SDK...');

    // Create a unique filename for the output
    const outputFilename = `animation_${Date.now()}.mp4`;
    const outputPath = path.join(outputsDir, outputFilename);

    try {
      // Initialize the Runway SDK client
      const client = new Runway({ apiKey: RUNWAY_API_KEY });
      console.log('Runway client keys:', Object.keys(client));
      
      // If imageToVideo exists, log its methods
      if (client.imageToVideo) {
        console.log('Runway imageToVideo methods:', Object.keys(client.imageToVideo));
      }
      
      // Start image-to-video generation
      console.log('Starting image-to-video generation...');
      
      // Process the image URL to ensure it's a valid HTTPS URL
      let imageUrl = '';
      
      // If image is already an HTTPS URL, use it directly
      if (image.startsWith('https://')) {
        imageUrl = image;
        console.log('Using provided HTTPS image URL:', imageUrl);
      }
      // If image is HTTP URL, we need to upload it to Cloudinary
      else if (image.startsWith('http://')) {
        // Instead of just changing http to https (which won't work), actually upload to Cloudinary
        console.log('Local HTTP URL detected, uploading to Cloudinary...', image);
        
        try {
          // Fetch the image first
          const response = await fetch(image);
          if (!response.ok) {
            throw new Error(`Failed to fetch image from ${image}`);
          }
          
          // Convert to array buffer and then to base64
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Convert buffer to base64 data URL
          const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
          
          // Upload to Cloudinary
          imageUrl = await uploadToCloudinary(base64Image);
          console.log('Uploaded local image to Cloudinary:', imageUrl);
        } catch (fetchError) {
          console.error('Error fetching and uploading local image:', fetchError);
          throw new Error(`Failed to process local image: ${fetchError.message}`);
        }
      }
      // For data URLs or local paths, upload to Cloudinary
      else {
        console.log('Uploading image to Cloudinary to get HTTPS URL...');
        imageUrl = await uploadToCloudinary(image);
        console.log('Image uploaded to Cloudinary:', imageUrl);
      }
      
      try {
        // Enhance the prompt with GPT-4o if available
        let enhancedPrompt = prompt;
        
        if (openai) {
          console.log("Using GPT-4o to enhance animation prompt...");
          try {
            const messages = [
              {
                role: "system",
                content: "You are a professional animation director. Your task is to enhance animation prompts for Runway Gen-4. IMPORTANT: Your output MUST be less than 800 characters total. Be extremely concise. Your PRIMARY directive is to preserve the user's original content and scene description EXACTLY as provided while adding brief motion directives."
              },
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: `I'm using Runway Gen-4 to animate this image with the following base prompt: "${prompt}". 

CRITICAL: Your enhanced prompt MUST be under 800 characters total. Be extremely concise.
Add brief details about camera movements, dynamic elements, and motion while preserving the original description exactly.`
                  }
                ]
              }
            ];
            
            // Call GPT-4o to generate the enhanced prompt
            const chatCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: messages,
              max_tokens: 400, // Limiting tokens to ensure shorter response
              temperature: 0.7 // Slight creativity while remaining focused
            });
            
            if (chatCompletion.choices && chatCompletion.choices.length > 0 && chatCompletion.choices[0].message.content) {
              enhancedPrompt = chatCompletion.choices[0].message.content.trim();
              
              // Ensure the prompt is under Runway's limit
              if (enhancedPrompt.length > 950) {
                console.log(`Prompt too long (${enhancedPrompt.length} chars), truncating...`);
                enhancedPrompt = enhancedPrompt.substring(0, 950);
              }
              
              console.log(`Enhanced animation prompt generated (${enhancedPrompt.length} chars): ${enhancedPrompt.substring(0, 200)}...`);
            } else {
              console.log("Could not generate enhanced prompt, using original");
            }
          } catch (gptError) {
            console.error("Error enhancing prompt with GPT-4o:", gptError);
            console.log("Using original prompt instead");
          }
        }
        
        // Extra safety check - ensure prompt is under limit
        if (enhancedPrompt.length > 950) {
          console.log(`Final prompt still too long (${enhancedPrompt.length} chars), using truncated version`);
          enhancedPrompt = enhancedPrompt.substring(0, 950);
        }
        
        // Start the generation process
        let videoUrl = null;
        let generationId = null;
        
        // Check if imageToVideo method exists
        if (client.imageToVideo && typeof client.imageToVideo.create === 'function') {
          console.log('Using imageToVideo.create method to create animation');
          // Generate video and get generation ID
          const generation = await client.imageToVideo.create({
            model: 'gen4_turbo',
            promptImage: imageUrl, 
            promptText: enhancedPrompt, // Use the enhanced prompt here
            ratio: '720:1280', // Use the supported 9:16 portrait format (720:1280)
            // Add duration parameter (in seconds) if provided by the client
            duration: duration ? parseInt(duration) : 10 // Use provided duration or default to 10 seconds
          });
          console.log('Generation started:', generation);
          
          if (generation && generation.id) {
            generationId = generation.id;
            console.log('Generation ID:', generationId);
            
            // Wait for the generation to complete using the tasks API
            let maxAttempts = 30; // 30 attempts with 10s delay = up to 5 minutes
            let attempts = 0;
            
            // Poll for task completion using tasks.retrieve
            do {
              // Wait 10 seconds between checks as video generation takes time
              await new Promise(resolve => setTimeout(resolve, 10000));
              attempts++;
              
              console.log(`Checking generation status (attempt ${attempts}/${maxAttempts})...`);
              
              try {
                // Use tasks.retrieve as the primary method for checking status
                if (!client.tasks || typeof client.tasks.retrieve !== 'function') {
                  console.error('client.tasks.retrieve method not available!', Object.keys(client));
                  throw new Error('Runway SDK missing tasks.retrieve method');
                }
                
                const task = await client.tasks.retrieve(generationId);
                console.log(`Task status: ${task.status}`);
                
                // Log the task structure for debugging
                console.log('Task response structure:', JSON.stringify({
                  status: task.status,
                  hasOutput: !!task.output,
                  outputType: task.output ? typeof task.output : 'none',
                  isOutputArray: task.output ? Array.isArray(task.output) : false,
                  hasUrl: !!task.url,
                  keys: Object.keys(task)
                }, null, 2));
                
                if (task.status === 'COMPLETED' || task.status === 'SUCCEEDED') {
                  // Task is complete, extract video URL
                  console.log('Task completed successfully!');
                  
                  // Extract video URL from task response - handle different response formats
                  if (task.output) {
                    // The output could be a string URL directly
                    if (typeof task.output === 'string') {
                      videoUrl = task.output;
                    } 
                    // Or it could be an object with a url property
                    else if (task.output.url) {
                      videoUrl = task.output.url;
                    } 
                    // Or it could be an array of URLs or objects
                    else if (Array.isArray(task.output) && task.output.length > 0) {
                      const firstOutput = task.output[0];
                      videoUrl = typeof firstOutput === 'string' ? firstOutput : firstOutput.url;
                    }
                  } 
                  // Some APIs place the URL directly on the task
                  else if (task.url) {
                    videoUrl = task.url;
                  }
                  
                  if (videoUrl) {
                    console.log('Video URL found:', videoUrl);
                    break;
                  } else {
                    console.error('Task completed but no video URL found in response:', task);
                  }
                } else if (task.status === 'FAILED' || task.status === 'ERROR') {
                  // Task failed
                  const errorMessage = task.error || task.errorMessage || task.failureReason || 'Unknown error';
                  throw new Error(`Generation failed: ${errorMessage}`);
                } else {
                  // Task still in progress
                  console.log(`Task in progress with status: ${task.status}`);
                }
              } catch (statusError) {
                console.error(`Error checking task status (attempt ${attempts}):`, statusError);
                
                if (attempts >= maxAttempts) {
                  throw statusError;
                }
              }
            } while (attempts < maxAttempts);
            
            if (!videoUrl) {
              throw new Error(`Failed to get video URL after ${maxAttempts} attempts`);
            }
          } else {
            throw new Error('No generation ID returned from Runway');
          }
        } else {
          console.error('imageToVideo.create method not available, available methods:', Object.keys(client));
          throw new Error('Runway client does not support video generation');
        }
        
        // Download the generated animation
        console.log('Downloading generated video from:', videoUrl);
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error('Failed to download animation from Runway');
        }

        // Use arrayBuffer() instead of buffer(), then convert to Buffer
        const arrayBuffer = await videoResponse.arrayBuffer();
        const animationBuffer = Buffer.from(arrayBuffer);

        // Ensure the outputs directory exists
        if (!fs.existsSync(outputsDir)) {
          fs.mkdirSync(outputsDir, { recursive: true });
        }

        // Save the animation file
        fs.writeFileSync(outputPath, animationBuffer);
        console.log(`Animation saved to ${outputPath}`);

        // Try to get video information using FFmpeg, if available
        try {
          const { exec } = require('child_process');
          exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${outputPath}`, (error, stdout, stderr) => {
            if (!error && stdout) {
              const actualDuration = parseFloat(stdout.trim());
              console.log(`Video duration from FFmpeg: ${actualDuration} seconds (requested: ${duration || 'default'} seconds)`);
            }
          });
        } catch (e) {
          console.log('FFmpeg not available to check video duration');
        }

        // Return success response with animation URL and enhanced prompt
        return res.json({
          success: true,
          animationUrl: `/video/${outputFilename}`, // Use the new streaming endpoint
          directUrl: `/outputs/${outputFilename}`, // Also include the direct URL as fallback
          enhancedPrompt: enhancedPrompt // Return the enhanced prompt for reference
        });
      } catch (error) {
        console.error('Error during video generation:', error);
        
        // Detailed error logging
        if (error.response) {
          console.error('Runway API response error details:', {
            status: error.response.status,
            data: JSON.stringify(error.response.data, null, 2),
            headers: error.response.headers
          });
        } else if (error.request) {
          console.error('Runway API request error - no response received');
        }
        
        throw new Error(`Runway API error: ${error.message}`);
      }
    } catch (error) {
      console.error('Runway SDK error:', error);
      
      // Add more detailed error logging
      if (error.response) {
        console.error('Runway API response error details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      return res.status(500).json({
        success: false,
        message: `Error generating animation: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Animation generation error:', error);
    return res.status(500).json({
      success: false,
      message: `Error generating animation: ${error.message}`
    });
  }
});

// Upload image to ImgBB and get HTTPS URL
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // ImgBB API key - this is a free service with rate limits
    // In production, you'd want to use a more robust solution like AWS S3
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '2677f6f2d1af6ac9b4489c8b021f4f25';
    
    console.log('Uploading image to ImgBB...');
    
    // Create form data for ImgBB API
    const formData = new FormData();
    
    // Extract base64 data if it's a data URL
    let imageData = image;
    if (image.startsWith('data:')) {
      // Remove the prefix (e.g., data:image/png;base64,)
      imageData = image.split(',')[1];
    }
    
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', imageData);
    
    // Upload to ImgBB
    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`ImgBB API error: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to upload image to ImgBB');
    }
    
    // Return the HTTPS URL of the uploaded image
    return res.json({
      success: true,
      imageUrl: data.data.url,
      displayUrl: data.data.display_url,
      deleteUrl: data.data.delete_url
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({
      success: false,
      message: `Error uploading image: ${error.message}`
    });
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dczw7eaj7',
  api_key: process.env.CLOUDINARY_API_KEY || '447117111331764',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Helper function to upload base64 image to Cloudinary
async function uploadToCloudinary(data, resourceType = 'auto', format = null) {
  try {
    console.log(`Uploading ${resourceType} to Cloudinary...`);
    
    let uploadOptions = {
      folder: 'narutio_temp',
      resource_type: resourceType || 'auto',
      quality: 'auto:best',
      fetch_format: format || 'auto',
      flags: 'attachment'
    };
    
    // Apply transformations only for images
    if (resourceType === 'image') {
      // For Runway Gen-4 Turbo, we need to ensure the image has a valid aspect ratio
      // Valid aspect ratios for Gen-4 Turbo are 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672
      uploadOptions.transformation = [
        // Update dimensions to 1280x720 to match Runway Gen-4 Turbo requirements
        { width: 1280, height: 720, crop: 'fill', gravity: 'center' }
      ];
    }
    
    // Audio-specific options for better quality
    if (resourceType === 'auto' && format === 'mp3') {
      uploadOptions.resource_type = 'raw'; // Use raw for better audio quality
      uploadOptions.quality = 100; // Highest quality
      uploadOptions.bit_rate = '128k'; // Higher bitrate for clearer audio
    }
    
    // If format is specified, set it in the options
    if (format) {
      uploadOptions.format = format;
    }
    
    // If data is a data URL, upload directly
    if (typeof data === 'string' && data.startsWith('data:')) {
      console.log(`Uploading data URL to Cloudinary as ${resourceType}`);
      const result = await cloudinary.uploader.upload(data, uploadOptions);
      console.log(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} uploaded to Cloudinary:`, result.secure_url);
      return result;
    } 
    // If data is already a URL, use upload by URL
    else if (typeof data === 'string' && data.startsWith('http')) {
      console.log(`Uploading from URL to Cloudinary as ${resourceType}`);
      const result = await cloudinary.uploader.upload(data, {
        ...uploadOptions,
        public_id: `narutio_${Date.now()}`
      });
      console.log(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} uploaded to Cloudinary:`, result.secure_url);
      return result;
    }
    // If data is a Buffer (binary data)
    else if (Buffer.isBuffer(data) || (typeof data === 'object' && data instanceof Uint8Array)) {
      console.log(`Uploading binary data to Cloudinary as ${resourceType}`);
      
      // Convert buffer to base64 string for Cloudinary
      const base64Data = Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64');
      const dataUrl = `data:audio/${format || 'mp3'};base64,${base64Data}`;
      
      const result = await cloudinary.uploader.upload(dataUrl, uploadOptions);
      console.log(`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} uploaded to Cloudinary:`, result.secure_url);
      return result;
    }
    
    throw new Error('Unsupported data format');
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

// Add this near the top of the file with the other configuration variables
const USE_CLOUDINARY = process.env.CLOUDINARY_CLOUD_NAME && 
                     process.env.CLOUDINARY_API_KEY && 
                     process.env.CLOUDINARY_API_SECRET ? true : false;

console.log(`Cloudinary integration: ${USE_CLOUDINARY ? 'ENABLED' : 'DISABLED'}`);

// Start server directly on port 5001 - no retry mechanism
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
      // renderQueue is an array, so it doesn't have a close() method
      // Just log that it's been "closed" for consistency
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

// Add a dedicated endpoint for video streaming with range support
app.get('/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, 'public', 'outputs', filename);
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }
  
  // Get file stats
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Handle range requests (essential for video seeking)
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    
    // Set proper headers for range requests
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    });
    
    // Pipe the file stream to response
    file.pipe(res);
  } else {
    // If no range is requested, send the entire file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
    });
    
    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(videoPath);
    fileStream.pipe(res);
  }
});

// Debug endpoint to check if videos are accessible
app.get('/check-video/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'outputs', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.json({ success: true, message: 'Video file exists', path: filePath });
  } else {
    res.status(404).json({ success: false, message: 'Video file not found', path: filePath });
  }
});

// Endpoint to list available output files (especially videos)
app.get('/outputs', (req, res) => {
  const outputsDir = path.join(__dirname, 'outputs');
  try {
    if (!fs.existsSync(outputsDir)) {
      // Create the directory if it doesn't exist
      fs.mkdirSync(outputsDir, { recursive: true });
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(outputsDir);
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error listing output files:', error);
    res.status(500).json({ success: false, message: 'Error listing output files', error: error.message });
  }
});

// Health check endpoint
app.get('/api/health-check', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Add OpenAI narration generation endpoints
app.post('/api/generate-narration', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and voice are required' 
      });
    }
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not set in environment variables");
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured on the server'
      });
    }
    
    console.log("Generating narration with params:", { text, voice, speed });
    
    // Generate a unique filename for the narration audio
    const timestamp = Date.now();
    const outputPath = `outputs/narration_${timestamp}.mp3`;
    const fullOutputPath = path.join(__dirname, outputPath);
    
    // Create directories if they don't exist
    await fs.promises.mkdir(path.dirname(fullOutputPath), { recursive: true });
    
    // Call OpenAI TTS API
    try {
      const oaiResponse = await axios({
        method: 'post',
        url: 'https://api.openai.com/v1/audio/speech',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'tts-1',
          voice: voice,
          input: text,
          speed: parseFloat(speed) || 1.0,
          response_format: 'mp3'
        },
        responseType: 'arraybuffer'
      });
      
      // Save the audio file
      await fs.promises.writeFile(fullOutputPath, oaiResponse.data);
      
      // Calculate audio duration (with fallback)
      let duration = 3; // Default duration
      try {
        if (mp3Duration) {
          duration = await mp3Duration(fullOutputPath);
          console.log(`Generated audio duration: ${duration} seconds`);
        } else {
          console.warn("mp3Duration not available, using default duration");
        }
      } catch (durationError) {
        console.error("Failed to calculate audio duration:", durationError);
        // Continue with default duration
      }
      
      // Upload to Cloudinary if enabled
      let finalUrl = `http://localhost:${PORT}/audio/${path.basename(outputPath)}`;
      
      if (USE_CLOUDINARY) {
        try {
          const cloudinaryResult = await uploadToCloudinary(oaiResponse.data, 'auto', 'mp3');
          if (cloudinaryResult && cloudinaryResult.secure_url) {
            finalUrl = cloudinaryResult.secure_url;
            console.log("Uploaded narration to Cloudinary:", finalUrl);
          }
        } catch (cloudinaryError) {
          console.error("Cloudinary upload failed, using local URL instead:", cloudinaryError);
        }
      } else {
        console.log("Cloudinary disabled, using local URL:", finalUrl);
      }
      
      // Return success with the audio URL and duration
      return res.json({
        success: true,
        audioUrl: finalUrl,
        duration: duration
      });
      
    } catch (oaiError) {
      console.error("OpenAI API error:", oaiError.response?.data || oaiError.message);
      // Get detailed error message if available
      const errorMessage = oaiError.response?.data?.error?.message || 
                           oaiError.response?.data?.message || 
                           oaiError.message || 
                           'Unknown OpenAI API error';
      
      return res.status(500).json({
        success: false,
        message: 'OpenAI TTS generation failed',
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error("Server error in narration generation:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error in narration generation',
      error: error.message
    });
  }
});

// Preview endpoint - uses the same logic but with shorter text
app.post('/api/preview-narration', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and voice are required' 
      });
    }
    
    // Check if OpenAI API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is not set in environment variables");
      return res.status(500).json({
        success: false,
        message: 'OpenAI API key is not configured on the server'
      });
    }
    
    // For preview, only use the first 100 characters
    const previewText = text.substring(0, 100) + (text.length > 100 ? '...' : '');
    console.log("Generating narration preview with params:", { text: previewText, voice, speed });
    
    // Generate a unique filename for the preview
    const timestamp = Date.now();
    const outputPath = `outputs/preview_${timestamp}.mp3`;
    const fullOutputPath = path.join(__dirname, outputPath);
    
    // Create directories if they don't exist
    await fs.promises.mkdir(path.dirname(fullOutputPath), { recursive: true });
    
    // Call OpenAI TTS API
    try {
      const oaiResponse = await axios({
        method: 'post',
        url: 'https://api.openai.com/v1/audio/speech',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'tts-1',
          voice: voice,
          input: previewText,
          speed: parseFloat(speed) || 1.0,
          response_format: 'mp3'
        },
        responseType: 'arraybuffer'
      });
      
      // Save the audio file
      await fs.promises.writeFile(fullOutputPath, oaiResponse.data);
      
      // Preview doesn't need Cloudinary, just use local URL
      const finalUrl = `http://localhost:${PORT}/${outputPath}`;
      
      // Return success with the audio URL
      return res.json({
        success: true,
        audioUrl: finalUrl
      });
      
    } catch (oaiError) {
      console.error("OpenAI API error:", oaiError.response?.data || oaiError.message);
      // Get detailed error message if available
      const errorMessage = oaiError.response?.data?.error?.message || 
                           oaiError.response?.data?.message || 
                           oaiError.message || 
                           'Unknown OpenAI API error';
      
      return res.status(500).json({
        success: false,
        message: 'OpenAI TTS preview generation failed',
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error("Server error in narration preview:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error in narration preview',
      error: error.message
    });
  }
});

// Add mock routes for narration (for testing without OpenAI API key)
app.post('/api/mock-generate-narration', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and voice are required' 
      });
    }
    
    console.log("Mock narration generation with params:", { text, voice, speed });
    
    // Generate a delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock data
    return res.json({
      success: true,
      audioUrl: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3',
      duration: 5.32
    });
  } catch (error) {
    console.error("Server error in mock narration generation:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error in mock narration generation',
      error: error.message
    });
  }
});

app.post('/api/mock-preview-narration', async (req, res) => {
  try {
    const { text, voice, speed } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Text and voice are required' 
      });
    }
    
    // Generate a delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data with a public domain audio file
    return res.json({
      success: true,
      audioUrl: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3'
    });
  } catch (error) {
    console.error("Server error in mock preview generation:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error in mock preview generation',
      error: error.message
    });
  }
});

// Add a dedicated endpoint for audio streaming with proper headers
app.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const audioPath = path.join(__dirname, 'outputs', filename);
  
  // Check if file exists
  if (!fs.existsSync(audioPath)) {
    return res.status(404).send('Audio file not found');
  }
  
  // Get file stats
  const stat = fs.statSync(audioPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Set proper MIME type for MP3
  const contentType = 'audio/mpeg';
  
  // Handle range requests (important for audio seeking)
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(audioPath, { start, end });
    
    // Set proper headers for range requests
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
      'Cache-Control': 'public, max-age=31536000', // Cache for a year
      'X-Content-Type-Options': 'nosniff'
    });
    
    // Pipe the file stream to response
    file.pipe(res);
  } else {
    // If no range is requested, send the entire file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range',
      'Cache-Control': 'public, max-age=31536000', // Cache for a year
      'X-Content-Type-Options': 'nosniff'
    });
    
    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(audioPath);
    fileStream.pipe(res);
  }
});