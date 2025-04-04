const FastRunPodComfyUIClient = require('./fast-runpod-client');
require('dotenv').config({ path: './backend/.env' });

async function testFastClient() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  
  if (!apiKey || !endpointId) {
    console.error('Missing RunPod credentials. Check your .env file');
    return;
  }
  
  const client = new FastRunPodComfyUIClient(apiKey, endpointId);
  
  try {
    // Check health first
    console.log('Checking RunPod endpoint health...');
    const health = await client.checkHealth();
    console.log('Health check result:', health);
    
    // Generate with optimized settings
    console.log('\nGenerating image with optimized settings...');
    
    const job = await client.generateFastImage({
      prompt: "anime girl with black hair", 
      negative_prompt: "bad quality, low quality",
      // Using optimized parameters for much faster generation
      width: 384,         // Smaller width
      height: 512,        // Smaller height
      steps: 15,          // Fewer steps
      cfg_scale: 7.0,
      sampler: "euler",   // Fast sampler
      model: "CounterfeitV25_25" // Use model we know works
    });
    
    console.log('Job started with ID:', job.id);
    console.log('Job status URL:', `https://www.runpod.io/console/serverless/status/${job.id}`);
    console.log('\nPolling for results...');
    
    // Poll for results with logging
    const result = await client.waitForJobCompletion(
      job.id,
      30, // Max attempts (unchanged)
      2000, // Poll every 2 seconds
      (status, attempt) => console.log(`Attempt ${attempt + 1}/30: Status = ${status.status}`)
    );
    
    if (result.status === 'COMPLETED') {
      console.log('\n✅ SUCCESS! Job completed successfully!');
      console.log('Image generation time:', 
        new Date(result.executionTime?.endTime) - new Date(result.executionTime?.startTime), 'ms');
      
      if (result.output && result.output.images && result.output.images.length > 0) {
        console.log('Image generated successfully!');
        // First 100 chars of the image data
        console.log('Image data preview:', result.output.images[0].image.substring(0, 100) + '...');
      } else {
        console.log('No image in output, but job completed');
        console.log('Full result:', JSON.stringify(result, null, 2));
      }
    } else {
      console.log('\n❌ Job did not complete successfully');
      console.log('Final status:', result.status);
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
    
    if (error.message.includes('did not complete within the time limit')) {
      console.log('\n⚠️ IMPORTANT DIAGNOSIS:');
      console.log('The job is still running on RunPod but our client timed out waiting for it.');
      console.log('This suggests your RunPod instance is running but very slow.');
      console.log('Possible causes:');
      console.log('1. Your RunPod endpoint has limited resources (GPU memory/compute)');
      console.log('2. The model "CounterfeitV25_25" might be large and slow to load');
      console.log('3. Your endpoint might be handling other requests in parallel');
      console.log('\nRecommendations:');
      console.log('1. Check the RunPod dashboard to see if jobs eventually complete');
      console.log('2. Try a smaller/faster model if available');
      console.log('3. Increase your endpoint resources/GPU if possible');
    }
  }
}

// Run the test
testFastClient(); 