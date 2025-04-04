const FastRunPodComfyUIClient = require('./fast-runpod-client');
const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

// Check that we have the required environment variables
if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID) {
  console.error('Missing required environment variables RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID');
  process.exit(1);
}

async function testRunpodConnection() {
  console.log('Testing RunPod connection directly with a ComfyUI workflow...\n');
  
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  // Test workflow that should be very simple
  const simpleWorkflow = {
    "3": {
      "inputs": {
        "seed": 1234567890,
        "steps": 10,
        "cfg": 7,
        "sampler_name": "euler",
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
        "ckpt_name": "CounterfeitV25_25" // Use the most reliable model
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "text": "1girl, simple anime character",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "text": "bad quality, worst quality",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "width": 320,
        "height": 384,
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
  
  // Try different formats
  const formats = [
    {
      name: "Format 1 - Standard ComfyUI input.workflow",
      payload: {
        input: {
          workflow: simpleWorkflow
        }
      }
    },
    {
      name: "Format 2 - Prompt as workflow",
      payload: {
        input: {
          prompt: simpleWorkflow
        }
      }
    },
    {
      name: "Format 3 - Top-level workflow", 
      payload: {
        input: {
          api_name: "compel"
        },
        workflow: simpleWorkflow
      }
    },
    {
      name: "Format 4 - Simple txt2img",
      payload: {
        input: {
          prompt: "1girl, simple anime character",
          negative_prompt: "bad quality, worst quality",
          width: 320,
          height: 384,
          num_inference_steps: 10
        }
      }
    }
  ];
  
  let jobId = null;
  
  // Try each format until one works
  for (const format of formats) {
    try {
      console.log(`Trying ${format.name}...`);
      
      const response = await axios.post(
        `https://api.runpod.ai/v2/${endpointId}/run`,
        format.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      console.log(`${format.name} SUCCESS! Job started with ID: ${response.data.id}`);
      jobId = response.data.id;
      console.log(`\nSuccessfully started job with ${format.name}. Job ID: ${jobId}`);
      console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${jobId}`);
      break;
    } catch (error) {
      console.error(`${format.name} FAILED with error:`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data:`, error.response.data);
      } else {
        console.error(error.message);
      }
      console.log('\n');
    }
  }
  
  // If no format worked, exit
  if (!jobId) {
    console.error('All formats failed, could not start job');
    return;
  }
  
  // Poll for job completion
  let attempts = 0;
  const maxAttempts = 30;
  let completed = false;
  
  while (attempts < maxAttempts) {
    try {
      const statusResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const status = statusResponse.data.status;
      console.log(`Attempt ${attempts + 1}/${maxAttempts}: Status = ${status}`);
      
      if (status === 'COMPLETED') {
        console.log('Job completed successfully!');
        console.log(JSON.stringify(statusResponse.data, null, 2));
        completed = true;
        break;
      } else if (status === 'FAILED') {
        console.log('Job failed:', statusResponse.data);
        break;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.error(`Error checking job status (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!completed) {
    console.error(`Job ${jobId} did not complete within the time limit.`);
  }
}

// Run the test
testRunpodConnection(); 