const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

class FastRunPodComfyUIClient {
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
   * Start a new job on RunPod
   * 
   * @param {Object} payload The request payload to send
   * @returns {Promise<Object>} Job information including the job ID
   */
  async startJob(payload) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/run`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to start job:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Generate an image with optimized settings for the newly created template
   * 
   * @param {Object} options Image generation options
   * @returns {Promise<Object>} Job information including the job ID
   */
  async generateFastImage(options = {}) {
    // Default options optimized for speed
    const defaultOptions = {
      prompt: "anime character",
      negative_prompt: "bad quality, low quality",
      width: 320,  // Even smaller width for faster generation
      height: 384, // Smaller height for faster generation
      steps: 10,   // Reduce steps further
      cfg_scale: 7,
      sampler_name: "Euler a", // Fast sampler
      seed: Math.floor(Math.random() * 2147483647)
    };

    // Merge provided options with defaults
    const combinedOptions = { ...defaultOptions, ...options };
    console.log("Using optimized parameters for fast generation:");
    console.log(JSON.stringify(combinedOptions, null, 2));

    try {
      // Use the format that we just tested and confirmed works
      const job = await this.startJob({
        input: {
          api_name: "txt2img",
          prompt: combinedOptions.prompt,
          negative_prompt: combinedOptions.negative_prompt,
          width: combinedOptions.width,
          height: combinedOptions.height,
          steps: combinedOptions.steps,
          cfg_scale: combinedOptions.cfg_scale,
          sampler_name: combinedOptions.sampler_name || "Euler a",
          seed: combinedOptions.seed
        }
      });
      
      console.log(`Job started with ID: ${job.id}`);
      console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${job.id}`);
      return job;
    } catch (error) {
      console.log("Standard format failed, trying fallback to ComfyUI workflow format");
      console.error("Error details:", error.message);
      
      // If direct format fails, try with a workflow format
      const workflow = this.buildWorkflowFromOptions(combinedOptions);
      
      const job = await this.startJob({
        input: {
          workflow: workflow
        }
      });
      
      console.log(`ComfyUI workflow job started with ID: ${job.id}`);
      console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${job.id}`);
      return job;
    }
  }

  // Helper method to build a ComfyUI workflow from options
  buildWorkflowFromOptions(options) {
    // Create a workflow compatible with ComfyUI's expected format
    return {
      "3": {
        "inputs": {
          "seed": options.seed,
          "steps": options.steps,
          "cfg": options.cfg_scale || 7,
          "sampler_name": options.sampler_name,
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
          "ckpt_name": options.model
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "text": options.prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "6": {
        "inputs": {
          "text": options.negative_prompt,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "width": options.width,
          "height": options.height,
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
          "filename_prefix": "output"
        },
        "class_type": "SaveImage"
      }
    };
  }

  /**
   * Generate an image using ComfyUI workflow format with optimized settings
   * 
   * @param {Object} options Image generation options
   * @returns {Promise<Object>} Job information including the job ID
   */
  async generateFastComfyFormat(options = {}) {
    // Default options super-optimized for speed
    const defaultOptions = {
      prompt: "anime girl",
      negative_prompt: "bad quality, low quality",
      width: 384,         // Smaller width
      height: 512,        // Smaller height
      steps: 12,          // Fewer steps
      cfg: 7.0,
      sampler_name: "euler", // Fast sampler
      scheduler: "normal",
      denoise: 1.0,
      seed: Math.floor(Math.random() * 2147483647),
      model: "v1-5-pruned-emaonly-fp16" // Use the model that exists on the pod
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Create simplified ComfyUI workflow structure based on options
    const payload = {
      prompt: {
        "3": {
          "inputs": {
            "seed": mergedOptions.seed,
            "steps": mergedOptions.steps,
            "cfg": mergedOptions.cfg,
            "sampler_name": mergedOptions.sampler_name,
            "scheduler": mergedOptions.scheduler,
            "denoise": mergedOptions.denoise,
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

    console.log('Using Fast ComfyUI Format with optimized parameters:');
    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${this.baseUrl}/run`,
        payload,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      // If there's an error, don't try another model (we're already using the right one)
      console.error('Image generation failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Try multiple models and parameter combinations until one works
   * This is helpful when you're not sure which models are available on the endpoint
   * 
   * @param {Object} options Base options for generation
   * @returns {Promise<Object>} Job information for the successful attempt
   */
  async generateWithFallbacks(options = {}) {
    // First try with fast direct format
    try {
      console.log('Attempting to generate with fast direct format...');
      const job = await this.generateFastImage(options);
      return job;
    } catch (error) {
      console.error('Fast direct format failed:', error.message);
      
      // Try with ComfyUI format
      try {
        console.log('Attempting to generate with ComfyUI format...');
        const job = await this.generateFastComfyFormat(options);
        return job;
      } catch (error2) {
        console.error('ComfyUI format also failed:', error2.message);
        
        // Try with default format as last resort
        try {
          console.log('Attempting to generate with default format as last resort...');
          const job = await this.generateWithFallbacks(options);
          return job;
        } catch (error3) {
          console.error('All generation attempts failed!');
          console.error('Original error:', error.message);
          console.error('ComfyUI error:', error2.message);
          console.error('Default format error:', error3.message);
          throw new Error('Failed to generate image after trying all available formats');
        }
      }
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
   * @param {number} interval Polling interval in milliseconds (default: 2000)
   * @param {Function} progressCallback Optional callback for status updates
   * @returns {Promise<Object>} Final job result
   */
  async waitForJobCompletion(jobId, maxAttempts = 30, interval = 2000, progressCallback = null) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const statusResponse = await axios.get(
          `https://api.runpod.ai/v2/${this.endpointId}/status/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );
        
        const status = statusResponse.data;
        
        if (progressCallback) {
          progressCallback(status, attempts);
        } else {
          console.log(`Attempt ${attempts + 1}/${maxAttempts}: Status = ${status.status}`);
        }
        
        if (status.status === 'COMPLETED') {
          console.log('RunPod job complete, full response:', JSON.stringify(status, null, 2));
          if (status.output && status.output.images && status.output.images.length > 0) {
            // Image is ready
            console.log('Image data present in response');
            return status;
          } else if (status.output) {
            // Job completed but no images
            console.warn('Job marked as COMPLETED but no images found in output:', JSON.stringify(status.output, null, 2));
            return status;
          }
        } else if (status.status === 'FAILED') {
          console.error('RunPod job failed with error:', status.error);
          throw new Error(`Job failed: ${JSON.stringify(status)}`);
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error checking job status (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    throw new Error(`Job ${jobId} did not complete within the time limit. Please check the RunPod dashboard for status.`);
  }
}

// Export the client class
module.exports = FastRunPodComfyUIClient; 