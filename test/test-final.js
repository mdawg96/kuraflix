const axios = require('axios');

// Use hardcoded credentials for testing
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';  // Confirmed endpoint ID

async function testEndpoint() {
  console.log(`Testing endpoint: ${endpointId}`);

  try {
    // Check endpoint health
    const healthResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/health`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    console.log('Health check response:', JSON.stringify(healthResponse.data, null, 2));
    
    // Run a simple test job for Automatic1111
    console.log('\nSubmitting test job...');
    
    const jobResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          prompt: "anime girl with black hair",
          negative_prompt: "bad quality, blurry",
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
    
    console.log('Job started:', jobResponse.data);
    console.log(`Job URL: https://www.runpod.io/console/serverless/status/${jobResponse.data.id}`);
    
    // Poll for status
    const jobId = jobResponse.data.id;
    let completed = false;
    let attempts = 0;
    
    console.log('\nMonitoring job status...');
    
    while (!completed && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
        { headers: { 'Authorization': `Bearer ${apiKey}` } }
      );
      
      console.log(`Check ${attempts + 1}/30: Status = ${statusResponse.data.status}`);
      
      if (statusResponse.data.status === 'COMPLETED') {
        console.log('\n✅ SUCCESS! Job completed successfully!');
        console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
        completed = true;
      } else if (statusResponse.data.status === 'FAILED') {
        console.log('\n❌ ERROR: Job failed');
        console.log('Error details:', JSON.stringify(statusResponse.data, null, 2));
        completed = true;
      } else if (statusResponse.data.status === 'IN_PROGRESS') {
        console.log('Job is now processing...');
      }
      
      attempts++;
    }
    
    if (!completed) {
      console.log('\n⚠️ Test timeout: Job is still in queue after 60 seconds');
      console.log('Please check the job URL manually for results');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testEndpoint(); 