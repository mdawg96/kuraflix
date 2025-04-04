const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

// Job ID to check - replace with your job ID from the previous test
const JOB_ID = 'e775bce3-0712-437e-b535-18d161cd297c-u2';

async function checkJob() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  if (!apiKey || !endpointId) {
    console.error('Missing RunPod credentials');
    return;
  }
  
  try {
    console.log(`Checking job ${JOB_ID} status...`);
    
    const response = await axios.get(
      `https://api.runpod.ai/v2/${endpointId}/status/${JOB_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('Current status:', response.data.status);
    
    if (response.data.status === 'COMPLETED') {
      console.log('\n✅ SUCCESS! Job completed successfully!');
      
      // Calculate execution time if available
      if (response.data.executionTime) {
        const startTime = new Date(response.data.executionTime.startTime);
        const endTime = new Date(response.data.executionTime.endTime);
        console.log(`Execution time: ${(endTime - startTime) / 1000} seconds`);
      }
      
      // Check if we have image output
      if (response.data.output && response.data.output.images && response.data.output.images.length > 0) {
        console.log('Image generated successfully!');
        console.log('Image data preview:', response.data.output.images[0].image.substring(0, 100) + '...');
      } else {
        console.log('No image in the response');
      }
    } else if (response.data.status === 'FAILED') {
      console.log('❌ Job failed');
      console.log('Error:', response.data.error);
    } else {
      console.log('⏳ Job is still processing');
      console.log('Full status:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error checking job:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkJob(); 