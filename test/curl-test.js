const axios = require('axios');

async function testWithCurlFormat() {
  try {
    const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
    const endpointId = 'uvxzkxhbz4ocnw';
    
    console.log('Testing endpoint with curl format example...');
    
    // Following exactly the format shown in dashboard example
    const payload = {
      input: {
        prompt: "Your prompt"
      }
    };
    
    console.log('Request URL:', `https://api.runpod.ai/v2/${endpointId}/run`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
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
    
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error making API call:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testWithCurlFormat(); 