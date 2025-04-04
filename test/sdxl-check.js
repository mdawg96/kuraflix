const axios = require('axios');

async function listRunPodEndpoints() {
  try {
    const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
    
    console.log('Listing your RunPod endpoints...');
    
    const response = await axios.get(
      'https://api.runpod.io/v2/endpoints',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.endpoints) {
      console.log('Your RunPod endpoints:');
      response.data.endpoints.forEach(endpoint => {
        console.log(`- ID: ${endpoint.id}, Name: ${endpoint.name}, Status: ${endpoint.status}`);
      });
    } else {
      console.log('No endpoints found or unexpected response format:', response.data);
    }
    
  } catch (error) {
    console.error('Error listing endpoints:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the check
listRunPodEndpoints(); 