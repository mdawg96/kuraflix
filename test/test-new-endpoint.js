const axios = require('axios');

// Use credentials directly for testing
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function testEndpoint() {
  try {
    console.log('Testing connection to RunPod endpoint...');
    
    // Check health
    const healthResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/health`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    console.log('Health check response:', JSON.stringify(healthResponse.data, null, 2));
    
    // Run a simple test job for Automatic1111
    console.log('\nSubmitting test job to Automatic1111...');
    
    // Use the specific format expected by AUTOMATIC1111 (txt2img endpoint)
    const jobResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          api_name: "txt2img",
          prompt: "anime girl with black hair",
          negative_prompt: "bad quality, low quality",
          width: 512,
          height: 512,
          steps: 20,
          cfg_scale: 7.5,
          sampler_name: "Euler a"
        }
      },
      { headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` 
      }}
    );
    
    console.log('Job started successfully:', jobResponse.data);
    console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${jobResponse.data.id}`);
    
    // Monitor job status
    const jobId = jobResponse.data.id;
    let completed = false;
    let attempts = 0;
    
    console.log('\nMonitoring job status...');
    
    while (!completed && attempts < 60) {  // Increased to 60 attempts (2 minutes)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      
      console.log(`Attempt ${attempts + 1}/60: Status = ${statusResponse.data.status}`);
      
      if (statusResponse.data.status === 'COMPLETED') {
        console.log('\n✅ SUCCESS! Job completed!');
        console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
        completed = true;
      } else if (statusResponse.data.status === 'FAILED') {
        console.log('\n❌ Job failed:', statusResponse.data);
        completed = true;
      } else if (statusResponse.data.status === 'IN_PROGRESS') {
        console.log('Job is now processing...');
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('\n⏳ Job is still processing after 60 attempts. Check the status URL for results.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testEndpoint(); 