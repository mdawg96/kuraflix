const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

async function testDirectStableDiffusion() {
  try {
    const apiKey = process.env.RUNPOD_API_KEY;
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    
    console.log('Testing direct Stable Diffusion API call to RunPod...');
    
    // This is the absolute simplest possible request to a Stable Diffusion endpoint
    const payload = {
      input: {
        prompt: "anime character with blue hair",
        negative_prompt: "bad quality, worst quality",
        width: 512,
        height: 512,
        num_outputs: 1,
        num_inference_steps: 20,
        guidance_scale: 7.5,
        scheduler: "DDIM"
      }
    };
    
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
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
    const maxAttempts = 30;
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
        console.log('Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } catch (error) {
        console.error(`Error polling job (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!completed) {
      console.error(`Job ${jobId} did not complete within the time limit.`);
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testDirectStableDiffusion(); 