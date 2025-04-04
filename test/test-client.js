const RunPodComfyUIClient = require('./runpod-comfyui-client');

async function testClient() {
  // Load API key and endpoint ID from environment variables
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  if (!apiKey || !endpointId) {
    console.error('Missing RunPod credentials. Set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID in your .env file.');
    return;
  }
  
  // Create a client instance
  const client = new RunPodComfyUIClient(apiKey, endpointId);
  
  try {
    // Check if the endpoint is healthy
    console.log('Checking endpoint health...');
    const health = await client.checkHealth();
    console.log('Endpoint health:', health);
    
    // Generate an image using the direct format (Format 6)
    console.log('\n--- Testing Direct Format ---');
    console.log('Generating image...');
    const directJob = await client.generateImageDirectFormat({
      prompt: "anime girl with blue hair, detailed portrait",
      negative_prompt: "bad quality, low quality",
      width: 512,
      height: 512,
      steps: 20,
      cfg_scale: 7.0,
      sampler: "euler",
      seed: 123456,
      model: "CounterfeitV25_25"
    });
    
    console.log('Direct format job started:', directJob);
    console.log('Job ID:', directJob.id);
    console.log('See the job status at https://www.runpod.io/console/serverless/status/' + directJob.id);
    
    // Only poll a few times to avoid waiting too long
    console.log('\nChecking status for a few attempts...');
    for (let i = 0; i < 5; i++) {
      console.log(`\nPolling job status (attempt ${i + 1}/5)...`);
      const status = await client.checkJobStatus(directJob.id);
      console.log('Status:', status.status);
      
      // Wait 5 seconds between checks
      if (i < 4) { // don't wait after the last check
        console.log('Waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Generate an image using the ComfyUI format (Format 7)
    console.log('\n\n--- Testing ComfyUI Format ---');
    console.log('Generating image with ComfyUI workflow format...');
    const comfyJob = await client.generateImageComfyFormat({
      prompt: "anime girl with red hair, detailed portrait",
      negative_prompt: "bad quality, low quality, deformed",
      width: 512,
      height: 512,
      steps: 20,
      cfg: 7.0,
      sampler_name: "euler",
      scheduler: "normal",
      seed: 654321,
      model: "CounterfeitV25_25"
    });
    
    console.log('ComfyUI format job started:', comfyJob);
    console.log('Job ID:', comfyJob.id);
    console.log('See the job status at https://www.runpod.io/console/serverless/status/' + comfyJob.id);
    
    // Only poll a few times
    console.log('\nChecking status for a few attempts...');
    for (let i = 0; i < 5; i++) {
      console.log(`\nPolling job status (attempt ${i + 1}/5)...`);
      const status = await client.checkJobStatus(comfyJob.id);
      console.log('Status:', status.status);
      
      // Wait 5 seconds between checks
      if (i < 4) { // don't wait after the last check
        console.log('Waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Use the simplified interface
    console.log('\n\n--- Testing Simplified Interface ---');
    console.log('Generating image with automatic format selection...');
    const autoJob = await client.generateImage({
      prompt: "anime girl with green hair, detailed portrait",
      negative_prompt: "bad quality, low quality, deformed",
      width: 512,
      height: 512,
      steps: 20,
      cfg_scale: 7.0,
      sampler: "euler",
      seed: 789012,
      model: "CounterfeitV25_25"
    });
    
    console.log('Job started with automatic format:', autoJob);
    console.log('Job ID:', autoJob.id);
    console.log('See the job status at https://www.runpod.io/console/serverless/status/' + autoJob.id);
    
    // Final message
    console.log('\n\n=================================================');
    console.log('All test jobs have been submitted successfully!');
    console.log('=================================================');
    console.log('Note: Jobs will continue running in the background.');
    console.log('Check your RunPod dashboard to see the results:');
    console.log('https://www.runpod.io/console/serverless');
    console.log('=================================================');
    
  } catch (error) {
    console.error('\nError in client test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testClient(); 