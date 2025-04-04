const FastRunPodClient = require('./fast-runpod-client');

// Create a new client instance
const apiKey = 'rpa_ND2B4GCBZ5T2OSPB4G7G23LOC89RPLOIQ8GAKPQR14c2oq';
const endpointId = '3kycmn2drm6u2e';
const client = new FastRunPodClient(apiKey, endpointId);

async function testClient() {
  console.log('Testing the updated client implementation...');
  
  try {
    // Step 1: Check endpoint health
    console.log('\nChecking endpoint health...');
    const health = await client.checkHealth();
    console.log('Endpoint health:', health);
    
    // Step 2: Generate an image with the updated format
    console.log('\nGenerating an image with updated format...');
    const job = await client.generateFastImage({
      prompt: "anime girl with blue hair, detailed, intricate",
      negative_prompt: "bad quality, blurry, worst quality"
    });
    
    console.log('Job submitted successfully:', job);
    console.log('Job ID:', job.id);
    console.log('Job URL:', `https://www.runpod.io/console/serverless/status/${job.id}`);
    
    // Step 3: Wait for the job to complete (up to 30 seconds)
    console.log('\nWaiting for job to complete...');
    try {
      // Just monitor the status for a few attempts
      for (let i = 0; i < 10; i++) {
        console.log(`\nChecking status (attempt ${i+1}/10)...`);
        const status = await client.checkJobStatus(job.id);
        console.log('Current status:', status.status);
        
        if (status.status === 'COMPLETED') {
          console.log('✅ Success! Job completed.');
          if (status.output && status.output.images) {
            console.log(`Generated ${status.output.images.length} images`);
          }
          return;
        } else if (status.status === 'FAILED') {
          console.log('❌ Job failed:', status.error);
          return;
        }
        
        // Wait 3 seconds between status checks
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log('Job still running. You can check the status at the job URL.');
    } catch (error) {
      console.error('Error while checking job status:', error.message);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testClient(); 