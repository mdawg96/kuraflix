const axios = require('axios');

// API Key
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';

// List of possible endpoint IDs to try
const endpointIds = [
  'unemployed_bronze_boa',        // Display name as shown in UI
  'unemployed-bronze-boa',        // With hyphens
  'unemployedbronzeboa',          // No separator
  '3kycmn2drm6u2e'                // Previous numeric ID
];

async function checkEndpoint(id) {
  try {
    console.log(`\nTrying endpoint ID: ${id}`);
    
    const response = await axios.get(
      `https://api.runpod.ai/v2/${id}/health`,
      { 
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 5000
      }
    );
    
    console.log(`✅ SUCCESS with ID: ${id}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log(`❌ Failed with ID: ${id}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
    } else {
      console.log(`Error: ${error.message}`);
    }
    return false;
  }
}

async function findEndpointId() {
  console.log('Searching for working endpoint ID...');
  
  let workingId = null;
  
  for (const id of endpointIds) {
    const success = await checkEndpoint(id);
    if (success) {
      workingId = id;
      break;
    }
  }
  
  if (workingId) {
    console.log(`\n✅ Found working endpoint ID: ${workingId}`);
    console.log(`Use this ID in your .env file and code.`);
  } else {
    console.log(`\n❌ None of the tried endpoint IDs worked.`);
    console.log(`Please check the RunPod dashboard for the correct endpoint ID.`);
  }
}

findEndpointId(); 