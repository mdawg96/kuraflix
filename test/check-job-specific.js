const axios = require('axios');

// Use credentials directly for testing
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

// The job ID to check
const jobId = 'c7a5f66c-63cc-4a16-8581-a655c8b8b63f-u1';

async function checkJob() {
  try {
    console.log(`Checking status of job ${jobId}...`);
    
    const statusResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    console.log('Job status:', statusResponse.data.status);
    console.log('Full response:', JSON.stringify(statusResponse.data, null, 2));
    
    // Also check endpoint health
    const healthResponse = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/health`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    
    console.log('\nEndpoint health:', JSON.stringify(healthResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkJob(); 