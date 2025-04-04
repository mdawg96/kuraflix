const axios = require('axios');

// Your RunPod API key and endpoint ID
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function testWorker() {
  try {
    console.log(`Testing worker status and job processing for endpoint ${endpointId}...`);
    
    // Check health
    const healthResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/health`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    console.log('Current health status:', JSON.stringify(healthResponse.data, null, 2));
    
    // Try to run a very simple job with minimal parameters
    console.log('\nSubmitting a test job with minimal parameters...');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          api_name: "txt2img",
          prompt: "test image",
          width: 256,
          height: 256,
          steps: 5,
          cfg_scale: 7
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const jobId = response.data.id;
    console.log(`Job submitted with ID: ${jobId}`);
    console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${jobId}`);
    
    // Now poll for status updates
    console.log('\nPolling for status updates...');
    for (let i = 0; i < 10; i++) {
      console.log(`\nCheck ${i+1}/10 - Waiting 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
        console.log('✅ SUCCESS! Job completed successfully');
        console.log('Output:', JSON.stringify(statusResponse.data.output, null, 2));
        return;
      } else if (statusResponse.data.status === 'FAILED') {
        console.log('❌ Job failed');
        console.log('Error:', statusResponse.data.error);
        return;
      }
    }
    
    console.log('Job still running or queued after all checks. Check the status URL for updates.');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testWorker(); 