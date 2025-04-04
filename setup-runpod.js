const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const dotenv = require('dotenv');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to the .env file
const envPath = path.join(__dirname, 'backend', '.env');

// Main setup function
async function setupRunPod() {
  console.log('\n🚀 KuraFlix Manga Studio - RunPod Setup Wizard 🚀\n');
  console.log('This wizard will help you configure RunPod for manga image generation.\n');
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ Error: .env file not found in the backend directory.');
    console.log('Please make sure you\'re running this script from the project root.');
    rl.close();
    return;
  }
  
  // Load existing .env file
  dotenv.config({ path: envPath });
  
  // Ask for API key if not in .env
  let apiKey = process.env.RUNPOD_API_KEY;
  if (!apiKey || apiKey === 'your_runpod_api_key_here') {
    apiKey = await promptForInput('Enter your RunPod API key: ');
    if (!apiKey) {
      console.log('❌ Error: API key is required to continue.');
      rl.close();
      return;
    }
  } else {
    console.log('✅ Found existing RunPod API key in .env file.');
  }
  
  // Verify API key works by checking endpoints (simpler API call)
  console.log('\n🔑 Verifying your RunPod API key...');
  try {
    const response = await axios.get('https://api.runpod.io/v2/endpoints', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // If we got a response, the API key is valid
    console.log('✅ API key is valid!');
    
    // Update .env with API key if needed
    if (process.env.RUNPOD_API_KEY !== apiKey) {
      updateEnvFile('RUNPOD_API_KEY', apiKey);
    }
  } catch (error) {
    console.log('❌ Error verifying API key:', error.message);
    rl.close();
    return;
  }
  
  // Check for existing endpoint
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  let useExistingEndpoint = false;
  
  if (endpointId && endpointId !== 'your_endpoint_id_here') {
    console.log(`\n🔍 Found existing endpoint ID: ${endpointId}`);
    const useExisting = await promptForInput('Do you want to use this existing endpoint? (y/n): ');
    useExistingEndpoint = useExisting.toLowerCase() === 'y';
  }
  
  if (useExistingEndpoint) {
    console.log('✅ Using existing endpoint.');
  } else {
    console.log('\n🔄 Checking for available endpoints...');
    
    try {
      // Get list of existing endpoints
      const response = await axios.get('https://api.runpod.io/v2/endpoints', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        const comfyEndpoints = response.data.filter(ep => 
          ep.name.toLowerCase().includes('comfy') || 
          ep.name.toLowerCase().includes('sd') || 
          ep.templateId === 'sd-comfy'
        );
        
        if (comfyEndpoints.length > 0) {
          console.log('✅ Found existing ComfyUI endpoints:');
          comfyEndpoints.forEach((ep, index) => {
            console.log(`${index + 1}. ${ep.name} (ID: ${ep.id}, Status: ${ep.status})`);
          });
          
          const selection = await promptForInput('Enter the number of the endpoint to use (or press Enter to create a new one): ');
          
          if (selection && !isNaN(parseInt(selection)) && parseInt(selection) <= comfyEndpoints.length) {
            const selectedEndpoint = comfyEndpoints[parseInt(selection) - 1];
            console.log(`✅ Selected endpoint: ${selectedEndpoint.name} (${selectedEndpoint.id})`);
            updateEnvFile('RUNPOD_ENDPOINT_ID', selectedEndpoint.id);
          } else {
            await createNewEndpoint(apiKey);
          }
        } else {
          console.log('No ComfyUI endpoints found. Creating a new one...');
          await createNewEndpoint(apiKey);
        }
      }
    } catch (error) {
      console.log('❌ Error checking endpoints:', error.message);
      console.log('Creating a new endpoint instead...');
      await createNewEndpoint(apiKey);
    }
  }
  
  console.log('\n🎉 Setup complete! Your RunPod configuration is ready.');
  console.log('\nNext steps:');
  console.log('1. Start your backend server: cd backend && npm run dev');
  console.log('2. Start your frontend: cd frontend && npm run dev');
  console.log('3. Go to the Manga Creator page and start generating manga panels!');
  
  rl.close();
}

// Function to create a new endpoint
async function createNewEndpoint(apiKey) {
  console.log('\n🔧 Creating a new ComfyUI endpoint...');
  console.log('This will set up a Stable Diffusion ComfyUI endpoint for manga generation.');
  
  // Ask for endpoint name
  const endpointName = await promptForInput('Enter a name for your endpoint (or press Enter for default): ') || 'KuraFlix Manga Studio';
  
  // Ask for GPU type
  console.log('\nChoose GPU type:');
  console.log('1. NVIDIA A40 (Balanced performance & cost)');
  console.log('2. NVIDIA A100 (Higher performance, higher cost)');
  console.log('3. NVIDIA RTX A6000 (Good for large batch processing)');
  const gpuType = await promptForInput('Enter your choice (1-3) or press Enter for default: ') || '1';
  
  let gpuId;
  switch (gpuType) {
    case '1': 
      gpuId = 'NVIDIA A40'; 
      break;
    case '2': 
      gpuId = 'NVIDIA A100'; 
      break;
    case '3': 
      gpuId = 'NVIDIA RTX A6000'; 
      break;
    default: 
      gpuId = 'NVIDIA A40';
  }
  
  // Ask for worker type
  console.log('\nWorker pricing:');
  console.log('1. Spot (Cheaper but may have wait times)');
  console.log('2. On-Demand (More expensive but available immediately)');
  const workerType = await promptForInput('Enter your choice (1-2) or press Enter for default: ') || '1';
  
  const workerTypeValue = workerType === '2' ? 'DEDICATED' : 'SPOT';
  
  // Configure the endpoint
  try {
    console.log('\n⏳ Creating endpoint. This may take a minute...');
    
    const response = await axios.post(
      'https://api.runpod.io/v2/endpoints',
      {
        name: endpointName,
        templateId: 'runpod-worker-comfy',
        gpuIds: [gpuId],
        workerType: workerTypeValue,
        minWorkers: 0,
        maxWorkers: 1,
        idleTimeout: 5, // minutes
        diskSizeGB: 10,
        networkVolumeId: null,
        envs: [
          {
            key: 'COMFYUI_MODEL',
            value: 'anything-v5-PrtRE'
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.id) {
      console.log(`✅ Endpoint created successfully with ID: ${response.data.id}`);
      updateEnvFile('RUNPOD_ENDPOINT_ID', response.data.id);
    } else {
      console.log('❌ Error creating endpoint:', response.data);
    }
  } catch (error) {
    console.log('❌ Error creating endpoint:', error.response?.data || error.message);
    console.log('Please create an endpoint manually through the RunPod dashboard.');
    
    // Offer guidance on manual setup
    console.log('\n📋 Manual Setup Instructions:');
    console.log('1. Visit https://www.runpod.io/console/serverless');
    console.log('2. Click "Deploy" and select "ComfyUI"');
    console.log('3. Choose SPOT pricing for the best value');
    console.log('4. Set Min/Max Workers to 1 (to control costs)');
    console.log('5. After deployment, copy the Endpoint ID');
    console.log('6. Add the ID to your .env file as RUNPOD_ENDPOINT_ID=your_id_here');
  }
}

// Function to update the .env file
function updateEnvFile(key, value) {
  let envData = fs.readFileSync(envPath, 'utf8');
  
  // Check if the key already exists and replace its value
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (envData.match(regex)) {
    envData = envData.replace(regex, `${key}=${value}`);
  } else {
    // If the key doesn't exist, add it to the end of the file
    envData += `\n${key}=${value}`;
  }
  
  fs.writeFileSync(envPath, envData);
  console.log(`✅ Updated ${key} in .env file.`);
}

// Function to prompt for user input
function promptForInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the setup
setupRunPod().catch((error) => {
  console.error('An unexpected error occurred:', error);
  rl.close();
}); 