const axios = require('axios');

// Use credentials directly for testing
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function testAuto111() {
  try {
    console.log('Testing with AUTOMATIC1111 txt2img API format...');
    
    // This is the exact format that AUTOMATIC1111's API expects
    const payload = {
      input: {
        endpoint: "txt2img",  // Explicitly specify endpoint
        params: {
          prompt: "anime girl with black hair",
          negative_prompt: "bad quality, low quality",
          width: 512,
          height: 512,
          steps: 20,
          cfg_scale: 7,
          sampler_name: "Euler a",
          seed: -1  // Random seed
        }
      }
    };
    
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
    
    const jobResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      payload,
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}` 
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    console.log('Job started successfully:', jobResponse.data);
    console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${jobResponse.data.id}`);
    
    // Poll for results
    const jobId = jobResponse.data.id;
    let completed = false;
    let attempts = 0;
    
    console.log('\nMonitoring job status...');
    
    while (!completed && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      try {
        const statusResponse = await axios.get(
          `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        
        console.log(`Attempt ${attempts + 1}/30: Status = ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'COMPLETED') {
          console.log('\n✅ SUCCESS! Job completed!');
          console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
          completed = true;
        } else if (statusResponse.data.status === 'FAILED') {
          console.log('\n❌ Job failed:', JSON.stringify(statusResponse.data, null, 2));
          completed = true;
        } else if (statusResponse.data.status === 'IN_PROGRESS') {
          console.log('Job is processing...');
        }
      } catch (error) {
        console.error(`Error checking status (attempt ${attempts + 1}/30):`, error.message);
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('\n⏳ Job is still in queue after 30 attempts.');
      console.log('Please check the job status URL manually.');
    }
    
  } catch (error) {
    console.error('Error starting job:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAuto111(); 