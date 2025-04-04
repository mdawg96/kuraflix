const axios = require('axios');

// RunPod API credentials
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function testImageGeneration() {
  try {
    console.log(`Testing image generation with endpoint: ${endpointId}`);
    
    // Submit job using Format 1 (which we know works)
    console.log('\nSubmitting job with known working format...');
    const jobResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          prompt: "anime girl with black hair, detailed, intricate, best quality",
          negative_prompt: "bad quality, blurry, worst quality",
          width: 512,
          height: 512,
          num_inference_steps: 20,
          guidance_scale: 7.5
        }
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const jobId = jobResponse.data.id;
    console.log(`Job started with ID: ${jobId}`);
    console.log(`Job URL: https://www.runpod.io/console/serverless/status/${jobId}`);
    
    // Wait for job completion
    console.log('\nWaiting for job to complete...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // More attempts for longer wait time
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3-second poll interval
      
      const statusResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      
      const status = statusResponse.data.status;
      console.log(`Attempt ${attempts + 1}/${maxAttempts}: Status = ${status}`);
      
      if (status === 'COMPLETED') {
        console.log('\n✅ SUCCESS! Job completed successfully!');
        
        // Check if we have image data
        if (statusResponse.data.output && statusResponse.data.output.images) {
          const images = statusResponse.data.output.images;
          console.log(`Generated ${images.length} image(s)`);
          
          // Output URLs if available
          if (Array.isArray(images) && images.length > 0) {
            console.log('First image preview (base64 start):', images[0].substring(0, 50) + '...');
          }
        } else {
          console.log('No images found in output:', JSON.stringify(statusResponse.data, null, 2));
        }
        
        completed = true;
      } else if (status === 'FAILED') {
        console.log('\n❌ ERROR: Job failed');
        console.log('Error details:', JSON.stringify(statusResponse.data, null, 2));
        completed = true;
      } else if (status === 'IN_PROGRESS') {
        console.log('Job is now processing...');
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('\n⚠️ Job did not complete within the timeout period.');
      console.log('This could be due to:');
      console.log('1. High demand on the RunPod endpoint');
      console.log('2. Worker initialization is still in progress');
      console.log('3. Networking issues between workers and RunPod API');
      console.log('\nPlease check the job URL manually for the final result.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testImageGeneration(); 