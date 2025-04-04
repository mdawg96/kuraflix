const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const Queue = require('bull');
const FastRunPodComfyUIClient = require('../test/fast-runpod-client');

// Import models
const User = require('./models/User');
const Character = require('./models/Character');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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

// Initialize Direct ComfyUI client for Pod access (not serverless)
if (process.env.DIRECT_COMFYUI_URL) {
  const comfyUIBaseUrl = process.env.DIRECT_COMFYUI_URL;
  console.log(`Direct ComfyUI client initialized at ${comfyUIBaseUrl}`);
  
  // Create a simple client for direct ComfyUI access
  directComfyUIClient = {
    baseUrl: comfyUIBaseUrl,
    
    async generateImage(prompt, negativePrompt) {
      try {
        console.log(`Generating image with ComfyUI at ${this.baseUrl}...`);
        console.log(`Prompt: ${prompt}`);
        
        // Define the workflow variable at the function level, before any try blocks
        let workflow = {
          "3": {
            "inputs": {
              "seed": Math.floor(Math.random() * 2147483647),
              "steps": 20,
              "cfg": 8.0,
              "sampler_name": "euler", // Matching what's shown in the UI
              "scheduler": "normal",
              "denoise": 1.0,
              "model": ["4", 0],
              "positive": ["5", 0],
              "negative": ["6", 0],
              "latent_image": ["7", 0]
            },
            "class_type": "KSampler"
          },
          "4": {
            "inputs": {
              "ckpt_name": "v1-5-pruned-emaonly-fp16.safetensors" // Using the model from the UI
            },
            "class_type": "CheckpointLoaderSimple"
          },
          "5": {
            "inputs": {
              "text": prompt,
              "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
          },
          "6": {
            "inputs": {
              "text": negativePrompt,
              "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode"
          },
          "7": {
            "inputs": {
              "width": 512,
              "height": 512,
              "batch_size": 1
            },
            "class_type": "EmptyLatentImage"
          },
          "8": {
            "inputs": {
              "samples": ["3", 0],
              "vae": ["4", 2]
            },
            "class_type": "VAEDecode"
          },
          "9": {
            "inputs": {
              "images": ["8", 0],
              "filename_prefix": "ComfyUI" // Using the filename prefix from UI
            },
            "class_type": "SaveImage"
          }
        };
        
        // First check if the ComfyUI API is accessible
        try {
          console.log(`Checking ComfyUI system stats at ${this.baseUrl}/system_stats`);
          const healthResponse = await axios.get(`${this.baseUrl}/system_stats`, { 
            timeout: 10000, // Increased timeout to 10 seconds
            validateStatus: () => true 
          });
          console.log(`System stats response status: ${healthResponse.status}`);
          console.log(`System stats response data:`, healthResponse.data);
          
          if (healthResponse.status !== 200) {
            throw new Error(`ComfyUI API not accessible, status: ${healthResponse.status}`);
          }
          
          console.log('ComfyUI API is accessible, proceeding with image generation');
          
          // Check available models
          try {
            console.log(`Checking available models at ${this.baseUrl}/object_info`);
            const objectInfo = await axios.get(`${this.baseUrl}/object_info`, {
              timeout: 10000
            });
            
            // More robust model detection
            if (objectInfo.data && objectInfo.data.CheckpointLoaderSimple) {
              const ckptInfo = objectInfo.data.CheckpointLoaderSimple.input.required.ckpt_name;
              
              // Check for available models in options or use default
              if (ckptInfo.options && ckptInfo.options.length > 0) {
                const firstModel = ckptInfo.options[0];
                console.log(`Found available model in options: ${firstModel}`);
                workflow["4"].inputs.ckpt_name = firstModel;
              } else if (ckptInfo.default) {
                console.log(`Using default model: ${ckptInfo.default}`);
                workflow["4"].inputs.ckpt_name = ckptInfo.default;
              }
              
              // Also check if VAE is available - if not, modify the workflow
              if (!objectInfo.data.VAEDecode) {
                console.log('VAE may not be available, creating a simplified workflow');
                
                // Create a simplified workflow that doesn't require VAEDecode
                // Remove nodes 8 and 9, and add a direct image save node
                delete workflow["8"];
                delete workflow["9"];
                
                // Add a different output node that doesn't require VAE
                workflow["10"] = {
                  "inputs": {
                    "samples": ["3", 0],
                    "filename_prefix": "output"
                  },
                  "class_type": "SaveLatent" // Save the latent directly
                };
                
                console.log('Created simplified workflow without VAE dependency');
              }
            }
          } catch (modelError) {
            console.warn('Unable to fetch available models:', modelError.message);
            // Continue with our default model
          }
        } catch (healthError) {
          console.error('Failed to connect to ComfyUI API:', healthError);
          throw new Error(`ComfyUI API connection failed: ${healthError.message}`);
        }
        
        // Submit the workflow to ComfyUI
        console.log(`Submitting workflow to ${this.baseUrl}/api/prompt`);
        try {
          const response = await axios.post(`${this.baseUrl}/api/prompt`, 
            { 
              prompt: workflow,
              client_id: Date.now().toString()
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 30000 // Increased timeout to 30 seconds
            }
          );
          
          console.log(`API response status: ${response.status}`);
          console.log(`API response data: ${JSON.stringify(response.data)}`);
          
          if (!response.data || !response.data.prompt_id) {
            throw new Error('Failed to get prompt_id from ComfyUI');
          }
          
          // Get the prompt ID
          const promptId = response.data.prompt_id;
          console.log(`ComfyUI prompt submitted with ID: ${promptId}`);
          
          // Poll for completion
          let imageUrl = null;
          let attempts = 0;
          console.log(`Polling for results with ID: ${promptId}`);
          
          while (!imageUrl && attempts < 90) { // Increased maximum attempts to 90 (3 minutes)
            await new Promise(r => setTimeout(r, 2000));
            attempts++;
            
            try {
              const historyResponse = await axios.get(`${this.baseUrl}/history/${promptId}`, {
                timeout: 10000 // Added timeout
              });
              
              if (attempts % 5 === 0) { // Log every 5 attempts to avoid too much logging
                console.log(`History response attempt ${attempts}: ${JSON.stringify(historyResponse.data)}`);
              }
              
              if (historyResponse.data && historyResponse.data[promptId]) {
                // Check if there are any error messages in the history
                if (historyResponse.data[promptId].error) {
                  console.error(`ComfyUI error: ${historyResponse.data[promptId].error}`);
                  throw new Error(`ComfyUI workflow error: ${historyResponse.data[promptId].error}`);
                }
                
                // Check for execution status
                if (historyResponse.data[promptId].status && historyResponse.data[promptId].status.exec_info && historyResponse.data[promptId].status.exec_info.queue_remaining === 0) {
                  console.log('Workflow is being processed...');
                }
                
                if (historyResponse.data[promptId].outputs) {
                  const outputs = historyResponse.data[promptId].outputs;
                  
                  // Check for both PreviewImage and SaveImage nodes
                  for (const nodeId in outputs) {
                    if (outputs[nodeId].images && outputs[nodeId].images.length > 0) {
                      const imageName = outputs[nodeId].images[0].filename || outputs[nodeId].images[0].image;
                      imageUrl = `${this.baseUrl}/view?filename=${imageName}`;
                      console.log(`Found image URL: ${imageUrl}`);
                      break;
                    }
                  }
                }
              }
            } catch (error) {
              console.log(`Polling attempt ${attempts} failed: ${error.message}`);
              // Continue polling even if there's an error
            }
            
            if (imageUrl) break;
            console.log(`Still waiting for image generation... (attempt ${attempts}/90)`);
          }
          
          if (!imageUrl) {
            throw new Error('Failed to generate image: timeout or no URL found');
          }
          
          // Download the image
          console.log(`Downloading image from ${imageUrl}`);
          const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          const imageBuffer = Buffer.from(imageResponse.data);
          
          // Generate a unique filename
          const outputFilename = `direct_comfyui_${Date.now()}.png`;
          const outputPath = path.join(__dirname, 'public', 'outputs', outputFilename);
          
          // Ensure directory exists
          if (!fs.existsSync(path.dirname(outputPath))) {
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          }
          
          // Save the image
          fs.writeFileSync(outputPath, imageBuffer);
          console.log(`Image saved to ${outputPath}`);
          
          // Return the web-accessible path
          return {
            success: true,
            imagePath: `/outputs/${outputFilename}`
          };
        } catch (promptError) {
          console.error('Error submitting workflow to ComfyUI:', promptError);
          throw new Error(`Failed to submit workflow to ComfyUI: ${promptError.message}`);
        }
      } catch (error) {
        console.error('Direct ComfyUI image generation error:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
      }
    }
  };
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
      // Use the text description
      prompt = `${artStyle || 'anime style'}, full body portrait of a character named ${name || 'character'}, ${description}, high quality, detailed, best quality`;
    } else {
      // Use the detailed traits
      prompt = `${artStyle || 'anime style'}, full body portrait of a ${(physicalTraits.gender || 'male')} character named ${name || 'character'}, `;
      
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
      
      prompt += "high quality, detailed, best quality";
    }
    
    console.log('Generated prompt:', prompt);
    
    // Prepare negative prompt
    const negativePrompt = "bad quality, low quality, worst quality, mutated hands, extra limbs, poorly drawn face, poorly drawn hands, missing fingers";
    
    // Try Direct ComfyUI Pod first if available
    if (directComfyUIClient) {
      try {
        console.log('Attempting to generate character using direct ComfyUI pod...');
        console.log('Using ComfyUI URL:', directComfyUIClient.baseUrl);
        
        const result = await directComfyUIClient.generateImage(prompt, negativePrompt);
        console.log('Direct ComfyUI result:', JSON.stringify(result));
        
        if (result && result.success) {
          console.log('Character generated successfully with direct ComfyUI pod.');
          return res.json({
            success: true,
            message: 'Character generated successfully via direct ComfyUI pod',
            character: {
              name: name || 'Character',
              imagePath: result.imagePath
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
    
    // Fall back to RunPod serverless endpoint if direct ComfyUI failed or is not available
    if (!runpodClient) {
      return res.status(500).json({
        success: false,
        message: 'Image generation unavailable. RunPod API credentials are missing or serverless is disabled.'
      });
    }
    
    // Generate the image using RunPod
    try {
      console.log('Generating character with optimized parameters...');
      
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
      
      // Save character to database
      const character = new Character({
        name,
        description: description || null,
        traits: {
          physical: physicalTraits,
          facial: facialFeatures,
          hair: hairFeatures,
          extras
        },
        imagePath: webPath,
        prompt,
        role: role || null,
        artStyle: artStyle || null,
        createdAt: new Date()
      });
      
      await character.save();
      
      console.log(`Character created and saved to database with ID: ${character._id}`);
      
      // Return success response
      return res.json({
        success: true,
        character: {
          id: character._id,
          name: character.name,
          imagePath: character.imagePath,
          imageUrl: `http://localhost:5001${character.imagePath}`
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

// Update the generate-manga-panel endpoint
app.post('/api/generate-manga-panel', userImageLimiter || ((req, res, next) => next()), async (req, res) => {
  try {
    const { 
      characters, 
      environment, 
      action, 
      style = 'anime', 
      model = 'anything-v5',
      controlNet = null,
      useLoRA = false,
      loraModel = null,
      negativePrompt = 'low quality, bad anatomy, worst quality, blurry',
      userId
    } = req.body;
    
    // Generate cache key from parameters
    const cacheKey = createCacheKey({ characters, environment, action, style, model });
    
    // Check if we already have this image cached
    const cachedResult = getCachedImage(cacheKey);
    if (cachedResult) {
      console.log('Returning cached image result');
      return res.status(200).json({
        success: true,
        ...cachedResult
      });
    }
    
    // Skip user verification during testing
    let userVerified = true;
    
    if (userId) {
      // Verify user exists and has permission
      try {
        const user = await User.findById(userId);
        if (!user) {
          userVerified = false;
        }
      } catch (error) {
        console.warn("User verification skipped:", error.message);
      }
    }

    if (!userVerified) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (redis && userId) {
      // Check if user has reached their daily limit
      const userKey = `user:${userId}:images`;
      const userImageCount = await redis.get(userKey);
      if (userImageCount && parseInt(userImageCount) >= 50) {
        return res.status(429).json({ 
          error: 'Daily image generation limit reached. Please try again tomorrow.' 
        });
      }
    }

    // Create output filename
    const outputFilename = `manga_${Date.now()}.png`;
    const outputPath = path.join(outputsDir, outputFilename);

    // Construct a detailed prompt for manga-style image
    const characterNames = characters.map(c => c.name).join(', ');
    const prompt = `${style} style, ${environment}, ${characterNames} ${action}${style === 'manga' ? ', black and white' : ''}`;

    // Handle image generation with or without queue
    if (imageGenerationQueue) {
      // Add job to queue with minimal data
      const job = await imageGenerationQueue.add({
        prompt,
        negativePrompt,
        outputPath,
        cacheKey,
        userId
      }, {
        removeOnComplete: 100,   // Keep only last 100 completed jobs
        removeOnFail: 50,        // Keep only last 50 failed jobs
        attempts: 2              // Retry once if it fails
      });

      // Return job ID immediately
      res.status(202).json({
        success: true,
        jobId: job.id,
        message: 'Image generation queued successfully'
      });
    } else {
      // Direct processing without queue
      try {
        // Check if the RunPod client is initialized
        if (!runpodClient) {
          throw new Error('RunPod client not initialized. Check your API credentials.');
        }

        console.log('Generating image with optimized parameters...');
        
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
          
          // Create a fallback image - a colored rectangle with the character names
          const width = 512;
          const height = 512;
          
          // Write fallback image to file
          try {
            // Create a simple colored rectangle image as a fallback
            const testHeaderPNG = Buffer.from([
              0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 
              0x00, 0x00, 0x00, 0x0D, 
              0x49, 0x48, 0x44, 0x52, 
              0x00, 0x00, 0x02, 0x00,  // width 512
              0x00, 0x00, 0x02, 0x00,  // height 512
              0x08, 0x06, 0x00, 0x00, 0x00
            ]);
            
            // Create a buffer with random color data
            const dataSize = width * height * 4;
            const buffer = Buffer.alloc(dataSize);
            
            // Fill with a gradient color - different from character images
            for (let i = 0; i < dataSize; i += 4) {
              buffer[i] = 120;                              // R constant
              buffer[i + 1] = 50 + Math.floor(i / (dataSize/200)); // G increases gradually
              buffer[i + 2] = 80;                           // B constant
              buffer[i + 3] = 255;                          // Alpha
            }
            
            fs.writeFileSync(outputPath, Buffer.concat([testHeaderPNG, buffer]));
            console.log(`Fallback manga panel created at ${outputPath}`);
            
            // Continue with the regular flow using the fallback image
          } catch (fallbackError) {
            console.error('Failed to create fallback image:', fallbackError);
            throw new Error('Failed to generate manga panel: ' + fallbackError.message);
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
        
        // Save result to cache for future requests
        imageCache.set(cacheKey, {
          imagePath: webPath,
          generatedAt: new Date()
        });
        
        // Return success response
        return res.json({
          success: true,
          imagePath: webPath,
          environment,
          characters,
          action,
          style,
          model
        });
      } catch (error) {
        console.error('Image generation failed:', error.message);
        return res.status(500).json({
          success: false,
          message: `Image generation failed: ${error.message}`
        });
      }
    }

    // Update user's image count if Redis is available
    if (redis && userId) {
      const userKey = `user:${userId}:images`;
      await redis.incr(userKey);
      await redis.expire(userKey, 24 * 60 * 60); // 24 hour expiry
    }

  } catch (error) {
    console.error('Error queuing manga panel generation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add endpoint to check job status
app.get('/api/generate-manga-panel/status/:jobId', async (req, res) => {
  try {
    if (!imageGenerationQueue) {
      return res.status(503).json({
        success: false,
        message: 'Queue system not available'
      });
    }
    
    const { jobId } = req.params;
    const job = await imageGenerationQueue.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.status(200).json({
      success: true,
      jobId,
      state,
      progress,
      result: job.returnvalue
    });
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({
      success: false,
      message: error.message
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}, bound to all interfaces`);
}); 