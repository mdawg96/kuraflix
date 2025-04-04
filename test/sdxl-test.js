const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

async function testStableDiffusionXL() {
  try {
    const apiKey = process.env.RUNPOD_API_KEY || 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
    const endpointId = 'uxxzkxhbz4ocnw'; // Corrected ID
    
    console.log('Testing Stable Diffusion XL API with endpoint ID:', endpointId);
    
    // Standard SDXL payload format
    const payload = {
      input: {
        prompt: "masterpiece, best quality, detailed, vibrant colors, anime girl with blue hair",
        negative_prompt: "bad quality, worst quality, blurry, low resolution",
        width: 1024, 
        height: 1024,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        num_images: 1
      }
    };
    
    console.log('Sending request to RunPod SDXL endpoint...');
    console.log(JSON.stringify(payload, null, 2));
    
    const url = `https://api.runpod.ai/v2/${endpointId}/run`;
    console.log('Request URL:', url);
    
    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Job started:', response.data);
    
    // Poll for job completion
    const jobId = response.data.id;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      console.log(`Checking job status (attempt ${attempts + 1}/${maxAttempts})...`);
      
      const statusResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      const status = statusResponse.data.status;
      console.log(`Status: ${status}`);
      
      if (status === 'COMPLETED') {
        console.log('Job completed successfully!');
        if (statusResponse.data.output) {
          const imageData = statusResponse.data.output;
          console.log('Image generation successful!');
          console.log('Output data:', JSON.stringify(imageData, null, 2));
        } else {
          console.error('Job completed but no output data found.');
        }
        break;
      } else if (status === 'FAILED') {
        console.error('Job failed:', statusResponse.data);
        break;
      }
      
      // Wait before checking again
      console.log('Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.error(`Job ${jobId} did not complete within the time limit.`);
    }
    
  } catch (error) {
    console.error('Error making API call:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testStableDiffusionXL(); 