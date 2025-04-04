const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function checkEndpoint() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  if (!apiKey || !endpointId) {
    console.error('Missing RunPod credentials. Check your .env file');
    console.log('API Key:', apiKey ? '✅ Found' : '❌ Missing');
    console.log('Endpoint ID:', endpointId ? '✅ Found' : '❌ Missing');
    return;
  }
  
  console.log('RunPod Credentials:');
  console.log('API Key:', apiKey ? '✅ Found' : '❌ Missing');
  console.log('Endpoint ID:', endpointId);
  
  console.log('\nChecking RunPod endpoint status...');
  
  try {
    const response = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/health`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Health check response:', JSON.stringify(response.data, null, 2));
    
    // Check for worker status
    if (response.data && response.data.workers) {
      console.log('\n== Worker Status ==');
      console.log(`Ready workers: ${response.data.workers.ready || 0}`);
      console.log(`Busy workers: ${response.data.workers.busy || 0}`);
      console.log(`Idle workers: ${response.data.workers.idle || 0}`);
      
      if (response.data.workers.ready === 0 && response.data.workers.idle === 0) {
        console.log('\n⚠️ WARNING: No available workers found on your endpoint!');
        console.log('This is likely why your jobs are stuck in queue.');
        console.log('\nPossible causes:');
        console.log('1. Your RunPod serverless endpoint is not running or has crashed');
        console.log('2. Your GPU quota/credits may have been exhausted');
        console.log('3. There might be a maintenance or outage at RunPod');
        
        console.log('\nRecommended actions:');
        console.log('1. Visit https://www.runpod.io/console/serverless to check your endpoint status');
        console.log('2. Make sure your endpoint is started and running');
        console.log('3. Check your RunPod account balance and billing status');
      }
    }

    // Let's also check if we can get queue information
    try {
      const queueResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/queue`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      console.log('\n== Queue Status ==');
      console.log('Queue info:', JSON.stringify(queueResponse.data, null, 2));
    } catch (queueError) {
      console.log('\nCannot retrieve queue information:', queueError.message);
    }
    
  } catch (error) {
    console.error('Error checking endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n⚠️ Authentication error! Your API key appears to be invalid or expired.');
      } else if (error.response.status === 404) {
        console.log('\n⚠️ Endpoint not found! Your endpoint ID appears to be invalid or the endpoint was deleted.');
        console.log('\nYour current endpoint ID is:', endpointId);
        console.log('Please verify this at https://www.runpod.io/console/serverless');
      }
    }
    
    console.log('\nPlease check your RunPod account at https://www.runpod.io/console/serverless');
  }
}

// Run the check
checkEndpoint(); 