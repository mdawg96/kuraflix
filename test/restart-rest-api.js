const axios = require('axios');

// Your RunPod API key and endpoint ID
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

// First try stopping via direct serverless API
async function restartViaDirectAPI() {
  try {
    console.log(`Attempting to force restart endpoint ${endpointId} via direct API calls...`);
    
    // Try to stop by sending empty job with special "stop" parameter (undocumented technique)
    console.log('Sending stop signal...');
    const stopResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/runsync`,
      {
        input: {
          __action: "stop"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Stop response:', stopResponse.data);
    
    // Wait 15 seconds
    console.log('Waiting 15 seconds for endpoint to fully stop...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check endpoint health to see if it's down
    try {
      console.log('Checking if endpoint is down...');
      await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/health`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      console.log('Endpoint still responding. Stop might not have worked.');
    } catch (error) {
      console.log('Endpoint appears to be down (good):', error.message);
    }
    
    // Now try to start it again with a normal job
    console.log('Sending start signal by submitting a regular job...');
    const startResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          api_name: "txt2img",
          prompt: "test prompt to restart",
          negative_prompt: "bad quality",
          width: 512,
          height: 512,
          steps: 20,
          cfg_scale: 7.5,
          sampler_name: "Euler a"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Start response:', startResponse.data);
    
    // Wait 15 seconds
    console.log('Waiting 15 seconds for endpoint to start...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Check health again
    try {
      console.log('Checking if endpoint is back up...');
      const healthResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/health`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      console.log('Endpoint health:', healthResponse.data);
      
      if (healthResponse.data && 
          healthResponse.data.workers && 
          (healthResponse.data.workers.ready > 0 || healthResponse.data.workers.idle > 0)) {
        console.log('✅ Restart appears successful! Endpoint has ready workers.');
      } else {
        console.log('Endpoint is back up but might not have ready workers yet. Check dashboard in a few minutes.');
      }
    } catch (error) {
      console.log('Endpoint still appears to be down:', error.message);
      console.log('It may need more time to initialize. Check dashboard in a few minutes.');
    }
    
  } catch (error) {
    console.error('Error restarting via direct API:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.log('\nWe were unable to restart your endpoint through the API.');
    console.log('Recommendation: Create a new endpoint using the AUTOMATIC1111 template with 2 workers.');
  }
}

// Execute the restart
restartViaDirectAPI(); 