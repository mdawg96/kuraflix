const axios = require('axios');

// RunPod API credentials
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function tryDifferentFormats() {
  console.log(`Testing AUTOMATIC1111 API formats with endpoint: ${endpointId}`);
  
  // Format A: standard AUTOMATIC1111 format with api_name
  try {
    console.log('\n[TEST 1] Using standard AUTOMATIC1111 format with api_name...');
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
    
    console.log('✅ FORMAT 1 WORKED!');
    console.log('Job ID:', response.data.id);
    console.log('Job URL: https://www.runpod.io/console/serverless/status/' + response.data.id);
    return;
  } catch (error) {
    console.log('❌ Format 1 failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Format B: AUTOMATIC1111 with different parameter organization
  try {
    console.log('\n[TEST 2] Using AUTOMATIC1111 format with endpoint parameter...');
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
    
    console.log('✅ FORMAT 2 WORKED!');
    console.log('Job ID:', response.data.id);
    console.log('Job URL: https://www.runpod.io/console/serverless/status/' + response.data.id);
    return;
  } catch (error) {
    console.log('❌ Format 2 failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // Format C: Raw flat API format 
  try {
    console.log('\n[TEST 3] Using flat API format (no nesting)...');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        prompt: "anime girl with black hair",
        negative_prompt: "bad quality",
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7.5,
        sampler_name: "Euler a"
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('✅ FORMAT 3 WORKED!');
    console.log('Job ID:', response.data.id);
    console.log('Job URL: https://www.runpod.io/console/serverless/status/' + response.data.id);
    return;
  } catch (error) {
    console.log('❌ Format 3 failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // One more try with simplest possible format
  try {
    console.log('\n[TEST 4] Using simplest possible format...');
    const response = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          prompt: "anime girl"
        }
      },
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('✅ FORMAT 4 WORKED!');
    console.log('Job ID:', response.data.id);
    console.log('Job URL: https://www.runpod.io/console/serverless/status/' + response.data.id);
    return;
  } catch (error) {
    console.log('❌ Format 4 failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n❌ ALL FORMATS FAILED!');
  console.log('Recommendation: Restart your endpoint completely or create a new one using the official AUTOMATIC1111 template.');
}

tryDifferentFormats(); 