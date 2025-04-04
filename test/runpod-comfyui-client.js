const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

class RunPodComfyUIClient {
  constructor(apiKey, endpointId) {
    this.apiKey = apiKey;
    this.endpointId = endpointId;
    this.baseUrl = `https://api.runpod.ai/v2/${endpointId}`;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  /**
   * Check if the RunPod endpoint is healthy
   * @returns {Promise<Object>} Health check results
   */
  async checkHealth() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate an image using the direct prompt format (Format 6)
   * 
   * @param {Object} options Image generation options
   * @param {string} options.prompt The positive prompt text
   * @param {string} options.negative_prompt The negative prompt text
   * @param {number} options.width Image width (default: 512)
   * @param {number} options.height Image height (default: 512)
   * @param {number} options.steps Number of sampling steps (default: 20)
   * @param {number} options.cfg_scale CFG scale (default: 7.0)
   * @param {string} options.sampler Sampler name (default: "euler")
   * @param {number} options.seed Random seed (default: random)
   * @param {string} options.model Model to use (default: "CounterfeitV25_25")
   * @returns {Promise<Object>} Job information including the job ID
   */
  async generateImageDirectFormat(options = {}) {
    const defaultOptions = {
      prompt: "anime girl",
      negative_prompt: "bad quality, low quality",
      width: 512,
      height: 512,
      steps: 20,
      cfg_scale: 7.0,
      sampler: "euler",
      seed: Math.floor(Math.random() * 2147483647),
      model: "CounterfeitV25_25"
    };

    const payload = { ...defaultOptions, ...options };

    try {
      const response = await axios.post(
        `${this.baseUrl}/run`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Image generation failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Generate an image using ComfyUI native format (Format 7)
   * 
   * @param {Object} options Image generation options
   * @param {string} options.prompt The positive prompt text
   * @param {string} options.negative_prompt The negative prompt text
   * @param {number} options.width Image width (default: 512)
   * @param {number} options.height Image height (default: 512)
   * @param {number} options.steps Number of sampling steps (default: 20)
   * @param {number} options.cfg Guidance scale (default: 7.0)
   * @param {string} options.sampler_name Sampler name (default: "euler")
   * @param {string} options.scheduler Scheduler (default: "normal")
   * @param {number} options.seed Random seed (default: random)
   * @param {string} options.model Model to use (default: "CounterfeitV25_25")
   * @returns {Promise<Object>} Job information including the job ID
   */
  async generateImageComfyFormat(options = {}) {
    const defaultOptions = {
      prompt: "anime girl",
      negative_prompt: "bad quality, low quality",
      width: 512,
      height: 512,
      steps: 20,
      cfg: 7.0,
      sampler_name: "euler",
      scheduler: "normal",
      seed: Math.floor(Math.random() * 2147483647),
      model: "CounterfeitV25_25"
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Create ComfyUI workflow structure based on options
    const payload = {
      prompt: {
        "3": {
          "inputs": {
            "seed": mergedOptions.seed,
            "steps": mergedOptions.steps,
            "cfg": mergedOptions.cfg,
            "sampler_name": mergedOptions.sampler_name,
            "scheduler": mergedOptions.scheduler,
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
            "ckpt_name": mergedOptions.model
          },
          "class_type": "CheckpointLoaderSimple"
        },
        "5": {
          "inputs": {
            "text": mergedOptions.prompt,
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "6": {
          "inputs": {
            "text": mergedOptions.negative_prompt,
            "clip": ["4", 1]
          },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": {
            "width": mergedOptions.width,
            "height": mergedOptions.height,
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
            "images": ["8", 0]
          },
          "class_type": "PreviewImage"
        }
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/run`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Image generation failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Simplified interface for generating images, tries the direct format first
   * and falls back to ComfyUI format if that fails
   * 
   * @param {Object} options Image generation options
   * @returns {Promise<Object>} Job information including the job ID
   */
  async generateImage(options = {}) {
    try {
      // Try the direct format first (simpler)
      return await this.generateImageDirectFormat(options);
    } catch (error) {
      console.log('Direct format failed, trying ComfyUI format...');
      // Fall back to ComfyUI format
      return await this.generateImageComfyFormat(options);
    }
  }

  /**
   * Check the status of a job
   * 
   * @param {string} jobId The job ID to check
   * @returns {Promise<Object>} Job status information
   */
  async checkJobStatus(jobId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/status/${jobId}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Job status check failed:', error.message);
      throw error;
    }
  }

  /**
   * Wait for a job to complete
   * 
   * @param {string} jobId The job ID to wait for
   * @param {number} maxAttempts Maximum number of polling attempts (default: 30)
   * @param {number} interval Polling interval in milliseconds (default: 5000)
   * @param {Function} progressCallback Optional callback for status updates
   * @returns {Promise<Object>} Final job result
   */
  async waitForJobCompletion(jobId, maxAttempts = 30, interval = 5000, progressCallback = null) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const statusResponse = await this.checkJobStatus(jobId);
      const status = statusResponse.status;
      
      if (progressCallback) {
        progressCallback(statusResponse, attempts);
      }
      
      if (status === 'COMPLETED') {
        return statusResponse;
      } else if (status === 'FAILED') {
        throw new Error(`Job ${jobId} failed: ${JSON.stringify(statusResponse)}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    }
    
    throw new Error(`Job ${jobId} did not complete within the time limit`);
  }
}

// Export the client class
module.exports = RunPodComfyUIClient;

// Example usage
async function example() {
  // Load API key and endpoint ID from environment variables
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  if (!apiKey || !endpointId) {
    console.error('Missing RunPod credentials. Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in your .env file.');
    return;
  }
  
  // Create a client instance
  const client = new RunPodComfyUIClient(apiKey, endpointId);
  
  try {
    // Check if the endpoint is healthy
    console.log('Checking endpoint health...');
    const health = await client.checkHealth();
    console.log('Endpoint health:', health);
    
    // Generate an image
    console.log('Generating image...');
    const job = await client.generateImage({
      prompt: "anime girl with blue hair and green eyes, detailed portrait",
      negative_prompt: "bad quality, low quality, blurry, distorted",
      width: 512,
      height: 768,
      steps: 25,
      cfg_scale: 7.5,
      sampler: "euler_ancestral"
    });
    
    console.log('Job started:', job);
    
    // Wait for the job to complete with progress updates
    console.log('Waiting for job completion...');
    const result = await client.waitForJobCompletion(
      job.id, 
      60, // Check for up to 5 minutes (60 * 5s)
      5000, // Poll every 5 seconds
      (status, attempt) => console.log(`Job status (attempt ${attempt + 1}): ${status.status}`)
    );
    
    console.log('Job completed!');
    console.log('Output:', result.output);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Uncomment to run the example
// example(); 