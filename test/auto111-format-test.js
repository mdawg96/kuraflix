const axios = require('axios');

// RunPod API format test
async function testRunPodAPI() {
  const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
  const endpointId = '3kycmn2drm6u2e';
  
  try {
    console.log('Testing RunPod format 1: simple input object');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          prompt: "anime girl with black hair",
          negative_prompt: "bad quality",
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
    
    console.log('✅ Format 1 worked!');
    console.log('Response:', response.data);
    return;
  } catch (error) {
    console.log('❌ Format 1 failed:', error.message);
  }
  
  try {
    console.log('\nTesting RunPod format 2: with endpoint field');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          endpoint: "txt2img",
          params: {
            prompt: "anime girl with black hair",
            negative_prompt: "bad quality",
            width: 512,
            height: 512, 
            steps: 20,
            cfg_scale: 7.5,
            sampler_name: "Euler a"
          }
        }
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('✅ Format 2 worked!');
    console.log('Response:', response.data);
    return;
  } catch (error) {
    console.log('❌ Format 2 failed:', error.message);
  }
  
  try {
    console.log('\nTesting RunPod format 3: AUTOMATIC1111 exact format');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          api_name: "txt2img",
          prompt: "anime girl with black hair",
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
    
    console.log('✅ Format 3 worked!');
    console.log('Response:', response.data);
    return;
  } catch (error) {
    console.log('❌ Format 3 failed:', error.message);
  }
  
  console.log('\nAll formats failed. Please check the endpoint logs for more information.');
}

testRunPodAPI(); 