const axios = require('axios');

// Use credentials directly for testing
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

async function testBasic() {
  try {
    console.log('Testing with very basic payload format...');
    
    // The most basic payload format for AUTOMATIC1111
    const jobResponse = await axios.post(
      `https://api.runpod.ai/v2/${endpointId}/run`,
      {
        input: {
          prompt: "anime girl with black hair"
        }
      },
      { headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` 
      }}
    );
    
    console.log('Job started:', jobResponse.data);
    console.log(`Job status URL: https://www.runpod.io/console/serverless/status/${jobResponse.data.id}`);
    
    // Try with simple polling
    console.log('\nMonitoring job...');
    const jobId = jobResponse.data.id;
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await axios.get(
          `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
          { headers: { 'Authorization': `Bearer ${apiKey}` } }
        );
        
        console.log(`Check ${i+1}/15: Status = ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'COMPLETED' || statusResponse.data.status === 'FAILED') {
          console.log('Final response:', JSON.stringify(statusResponse.data, null, 2));
          break;
        }
      } catch (e) {
        console.error(`Error checking status: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error starting job:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBasic(); 