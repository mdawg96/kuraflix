const axios = require('axios');

async function checkEndpointStatus() {
  try {
    const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
    const endpointId = 'uvxzkxhbz4ocnw';
    
    console.log('Checking endpoint status for ID:', endpointId);
    
    // First, try HEAD request to see if endpoint exists
    try {
      const headResponse = await axios.head(
        `https://api.runpod.ai/v2/${endpointId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      console.log('Endpoint exists, status:', headResponse.status);
    } catch (headError) {
      console.error('Endpoint may not exist:', headError.message);
      if (headError.response) {
        console.error('Response status:', headError.response.status);
      }
    }
    
    // Try to get health status
    try {
      const healthResponse = await axios.get(
        `https://api.runpod.ai/v2/${endpointId}/health`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      console.log('Health status:', healthResponse.data);
    } catch (healthError) {
      console.error('Could not check health:', healthError.message);
      if (healthError.response) {
        console.error('Response status:', healthError.response.status);
      }
    }
    
    // Try with different variations of the ID
    const variations = [
      endpointId,
      endpointId.toLowerCase(),
      endpointId.toUpperCase(),
      endpointId.replace('z', 'Z'),
      'uvxzkxhbz4ocnv', // Maybe typo in last character?
      'uvxzkxhbz4ocnl', // Maybe typo in last character?
      'uvxzkxhbz4ncnw'  // Maybe typo in middle?
    ];
    
    for (const variation of variations) {
      if (variation === endpointId) continue; // Skip the original ID, we already tried it
      
      try {
        console.log(`\nTrying variation: ${variation}`);
        
        const response = await axios.post(
          `https://api.runpod.ai/v2/${variation}/run`,
          { input: { prompt: "test" } },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );
        
        console.log('Success! Found working endpoint ID:', variation);
        console.log('Response:', response.data);
        break;
      } catch (error) {
        console.error(`Variation ${variation} failed:`, error.message);
        if (error.response && error.response.status !== 404) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
      }
    }
  } catch (error) {
    console.error('Error in endpoint check:', error.message);
  }
}

checkEndpointStatus(); 