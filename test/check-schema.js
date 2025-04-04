const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

async function checkEndpointSchema() {
  try {
    const apiKey = process.env.RUNPOD_API_KEY;
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;
    
    console.log(`Checking schema for RunPod endpoint ${endpointId}...`);
    
    // Try to get the schema from the endpoint
    const response = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/schema`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Endpoint schema:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Also check endpoint status
    const statusResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('\nEndpoint status:');
    console.log(JSON.stringify(statusResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the check
checkEndpointSchema(); 