const axios = require('axios');

async function testDirectApi() {
  try {
    console.log('Testing direct AUTOMATIC1111 API...');
    
    // This calls the txt2img endpoint directly on the AUTOMATIC1111 API
    const response = await axios.post(
      'https://3kycmn2drm6u2e-input.runpod.net/sdapi/v1/txt2img',
      {
        prompt: "anime girl with black hair",
        negative_prompt: "bad quality, blurry",
        width: 512,
        height: 512,
        steps: 20,
        cfg_scale: 7.5,
        sampler_name: "Euler a"
      },
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000  // 60 second timeout
      }
    );
    
    console.log('Success! Response received:', 
      Object.keys(response.data).join(', '));
    
    if (response.data.images && response.data.images.length > 0) {
      console.log('✅ Image generated!');
      console.log('Image data (sample):', 
        response.data.images[0].substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Check if the error is due to the site not being reachable
    if (error.code === 'ENOTFOUND') {
      console.error('\n⚠️ The endpoint URL could not be reached.');
      console.error('This suggests networking/DNS issues with your endpoint.');
      console.error('Try accessing https://3kycmn2drm6u2e-input.runpod.net in your browser.');
    }
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDirectApi(); 