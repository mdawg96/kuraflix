const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

// Format 6: Direct API prompt object
const directPromptFormat = {
  "prompt": "anime girl with black hair",
  "negative_prompt": "bad quality, low quality",
  "width": 512,
  "height": 512,
  "steps": 20,
  "cfg_scale": 7.0,
  "sampler": "euler",
  "seed": 42,
  "model": "CounterfeitV25_25" // Try the model from the original script
};

// Format 7: ComfyUI native API format
const comfyPromptFormat = {
  "prompt": {
    "3": {
      "inputs": {
        "seed": 42,
        "steps": 20,
        "cfg": 7.0,
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
        "ckpt_name": "CounterfeitV25_25" // Try the model from the original script
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "text": "anime girl with black hair",
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "text": "bad quality, low quality",
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
        "images": ["8", 0]
      },
      "class_type": "PreviewImage"
    }
  }
};

async function testFinalFormats() {
  console.log('RunPod API Key:', process.env.RUNPOD_API_KEY ? '✅ Found' : '❌ Missing');
  console.log('RunPod Endpoint ID:', process.env.RUNPOD_ENDPOINT_ID ? '✅ Found' : '❌ Missing');
  
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID) {
    console.error('ERROR: Missing RunPod credentials. Make sure your .env file has the required variables.');
    return;
  }
  
  try {
    // First, let's check if the endpoint is healthy
    console.log('\nChecking RunPod endpoint health...');
    const healthCheck = await axios.get(
      `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/health`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
        }
      }
    );
    
    console.log('RunPod endpoint health check:', healthCheck.data);
    
    if (!healthCheck.data || !healthCheck.data.workers || 
        (healthCheck.data.workers.ready === 0 && healthCheck.data.workers.idle === 0)) {
      console.error('No ready workers available on RunPod endpoint');
      return;
    }
    
    // Define formats to try
    const formats = [
      {
        name: "Direct API Prompt (Format 6)",
        payload: directPromptFormat
      },
      {
        name: "ComfyUI API Format (Format 7)",
        payload: comfyPromptFormat
      }
    ];
    
    // Try each format
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      console.log(`\n\n========= TESTING FORMAT: ${format.name} =========`);
      console.log('Payload:', JSON.stringify(format.payload, null, 2));
      
      try {
        console.log(`\nStarting RunPod job...`);
        const startJobResponse = await axios.post(
          `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`,
          format.payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
            }
          }
        );
        
        console.log(`✅ Format ACCEPTED! RunPod job started:`, startJobResponse.data);
        
        const jobId = startJobResponse.data.id;
        console.log(`\nPolling for job ${jobId} status...`);
        
        // Poll for completion with longer timeout (2 minutes)
        let attempts = 0;
        let completed = false;
        
        while (!completed && attempts < 24) { // 24 attempts * 5 seconds = 2 minutes
          try {
            console.log(`\nPolling job status (attempt ${attempts + 1}/24)...`);
            
            const statusResponse = await axios.get(
              `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${jobId}`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
                }
              }
            );
            
            const status = statusResponse.data.status;
            console.log(`Job ${jobId} status:`, status);
            
            if (status === 'COMPLETED') {
              console.log('\n✅ SUCCESS: Job completed successfully!');
              console.log('Output structure:', JSON.stringify(statusResponse.data.output, null, 2));
              completed = true;
              
              // Display success info
              console.log(`\n----------------------------------------------`);
              console.log(`✅ WORKING FORMAT FOUND: ${format.name}`);
              console.log(`----------------------------------------------`);
              console.log(`Use this format in your application:`);
              console.log(JSON.stringify(format.payload, null, 2));
              console.log(`----------------------------------------------`);
              
              // Exit early - we found a working format
              return;
              
            } else if (status === 'FAILED') {
              console.error(`\n❌ Job ${jobId} failed:`, statusResponse.data);
              break;
            } else {
              // Wait before polling again - longer interval of 5 seconds
              await new Promise(resolve => setTimeout(resolve, 5000));
              attempts++;
            }
          } catch (error) {
            console.error(`\n❌ Error polling job status:`, error.message);
            if (error.response) {
              console.error('Response data:', error.response.data);
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        if (!completed) {
          console.log("\n⚠️ Job is still running after 2 minutes. It might still complete, but we're moving to the next format.");
          console.log("Check the RunPod dashboard to see the final result.");
        }
        
      } catch (error) {
        console.error(`\n❌ Format FAILED:`, error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      }
    }
    
    console.log('\n\n======================================');
    console.log('⚠️ Test completed, but no format returned results within 2 minutes.');
    console.log('======================================');
    console.log('1. Check the RunPod dashboard to see if any jobs completed successfully.');
    console.log('2. The jobs might still be processing - image generation can take time.');
    console.log('3. Make sure CounterfeitV25_25 is available on your endpoint.');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testFinalFormats(); 