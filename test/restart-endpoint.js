const axios = require('axios');

// Your RunPod API key and endpoint ID
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';

// GraphQL API endpoint
const runpodGraphQL = 'https://api.runpod.io/graphql';

async function stopEndpoint() {
  console.log(`Stopping endpoint ${endpointId}...`);
  
  try {
    const response = await axios.post(
      runpodGraphQL,
      {
        query: `mutation {
          stopServerlessFunction(input: {id: "${endpointId}"}) {
            id
            status
          }
        }`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.data && response.data.data.stopServerlessFunction) {
      console.log('✅ Stop request successful:', response.data.data.stopServerlessFunction);
    } else if (response.data.errors) {
      console.log('❌ Error stopping endpoint:', response.data.errors);
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('Error stopping endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
  }
}

async function startEndpoint() {
  console.log(`Starting endpoint ${endpointId}...`);
  
  try {
    const response = await axios.post(
      runpodGraphQL,
      {
        query: `mutation {
          startServerlessFunction(input: {id: "${endpointId}"}) {
            id
            status
          }
        }`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.data && response.data.data.startServerlessFunction) {
      console.log('✅ Start request successful:', response.data.data.startServerlessFunction);
    } else if (response.data.errors) {
      console.log('❌ Error starting endpoint:', response.data.errors);
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('Error starting endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
  }
}

async function checkStatus() {
  console.log(`Checking status of endpoint ${endpointId}...`);
  
  try {
    const response = await axios.post(
      runpodGraphQL,
      {
        query: `query {
          myself {
            serverlessFunctions(ids: ["${endpointId}"]) {
              id
              name
              status
              workersMin
              workersMax
              idleTimeout
            }
          }
        }`
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (response.data && response.data.data && response.data.data.myself) {
      console.log('Current status:', response.data.data.myself.serverlessFunctions[0]);
    } else if (response.data.errors) {
      console.log('❌ Error checking status:', response.data.errors);
    } else {
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.error('Error checking status:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Error details:', error.response.data);
    }
  }
}

async function restartEndpoint() {
  // First check the current status
  await checkStatus();
  
  // Stop the endpoint
  await stopEndpoint();
  
  // Wait for 10 seconds
  console.log('\nWaiting 10 seconds for endpoint to fully stop...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check status after stopping
  await checkStatus();
  
  // Wait for additional 5 seconds
  console.log('\nWaiting additional 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Start the endpoint
  await startEndpoint();
  
  // Wait for 10 seconds
  console.log('\nWaiting 10 seconds for endpoint to start...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Check final status
  await checkStatus();
  
  console.log('\nRestart process completed. The endpoint may take a few minutes to fully initialize.');
  console.log('Check the RunPod dashboard for current status.');
}

// Run the restart process
restartEndpoint(); 