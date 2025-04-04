const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

async function testComfyUIDirectWorkflow() {
  try {
    const apiKey = process.env.RUNPOD_API_KEY;
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    
    console.log('Testing ComfyUI direct workflow format...');
    
    // Build a simple ComfyUI workflow using gsdf/Counterfeit-V2.5 model
    // This matches the MODEL_NAME environment variable in the container
    const prompt = {
      "3": {
        "inputs": {
          "seed": 123456789,
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler_ancestral",
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
          "ckpt_name": "CounterfeitV2_5.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "text": "masterpiece, best quality, anime girl with blue hair",
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "6": {
        "inputs": {
          "text": "bad quality, worst quality, low resolution",
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
          "filename_prefix": "ComfyUI"
        },
        "class_type": "SaveImage"
      }
    };
    
    // ComfyUI API expects a specific format
    const payload = {
      input: {
        api_name: "predict",
        prompt: prompt
      }
    };
    
    console.log('Sending job to RunPod...');
    
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Job started:', response.data);
    
    // Poll for completion
    const jobId = response.data.id;
    let attempts = 0;
    const maxAttempts = 60; // More attempts for ComfyUI which can be slower
    let completed = false;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Checking job status (attempt ${attempts + 1}/${maxAttempts})...`);
        
        const statusResponse = await axios.get(
          `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );
        
        console.log(`Status: ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'COMPLETED') {
          console.log('Job completed!');
          console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
          completed = true;
          break;
        } else if (statusResponse.data.status === 'FAILED') {
          console.error('Job failed:', statusResponse.data);
          break;
        }
        
        // Wait before checking again
        console.log('Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      } catch (error) {
        console.error(`Error polling job (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    if (!completed) {
      console.error(`Job ${jobId} did not complete within the time limit.`);
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testComfyUIDirectWorkflow(); 