const axios = require('axios');

async function testSDXLEndpoint() {
  try {
    const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
    const endpointId = 'uxxzkxhbz4ocnw'; // Corrected ID
    
    console.log('Testing SDXL endpoint with corrected ID:', endpointId);
    
    // Basic SDXL payload
    const payload = {
      input: {
        prompt: "masterpiece, best quality, anime girl with blue hair",
        negative_prompt: "bad quality, worst quality, blurry",
        width: 1024,
        height: 1024,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        num_images: 1
      }
    };
    
    console.log('Sending request to RunPod SDXL...');
    
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
    
    console.log('Success! Job started:', response.data);
    
    if (response.data && response.data.id) {
      const jobId = response.data.id;
      console.log(`Job ID: ${jobId}`);
      
      // Poll for status
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        console.log(`Checking status (attempt ${attempts + 1}/${maxAttempts})...`);
        
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
          console.log(JSON.stringify(statusResponse.data.output, null, 2));
          break;
        } else if (statusResponse.data.status === 'FAILED') {
          console.error('Job failed:', statusResponse.data);
          break;
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testSDXLEndpoint(); 