# AI Anime Creator

A web application that allows users to create their own 2D anime-style animations using AI. This platform lets users design characters, write scripts, generate scenes, and combine them into full episodes.

## Features

- Character creation with AI-generated designs
- Scene editor with background selection and dialogue scripting
- Animation studio for assembling scenes into full episodes
- Multi-language support for dialogue and voiceovers
- Library management for characters, scenes, and episodes

## Tech Stack

### Frontend
- React.js with Vite
- TailwindCSS for styling
- Axios for API requests
- React Router for navigation

### Backend
- Node.js with Express
- FFmpeg for video processing
- Multer for file uploads
- Integrates with open-source AI models (Stable Diffusion, AnimateDiff, Coqui TTS)

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- FFmpeg (for video processing)
- MongoDB (optional for data persistence)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-anime-creator.git
cd ai-anime-creator
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd ../backend
npm install
```

### Running the Application

1. Start the backend server
```bash
cd backend
npm run dev
```

2. Start the frontend development server
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Cost-Efficient AI Integration

This application is designed to be cost-efficient by:

- Using open-source AI models self-hosted on your own infrastructure
- Implementing a queuing system for render jobs to optimize GPU usage
- Reusing character assets across multiple scenes
- Offering 720p as the default resolution with 15 FPS (suitable for anime style)
- Batching render jobs during off-peak hours

## License

MIT

## Acknowledgements

- [React](https://reactjs.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Express](https://expressjs.com/)
- [FFmpeg](https://ffmpeg.org/)
- [Stable Diffusion](https://github.com/CompVis/stable-diffusion)
- [AnimateDiff](https://github.com/guoyww/AnimateDiff)
- [Coqui TTS](https://github.com/coqui-ai/TTS)

# KuraFlix - Anime & Manga Creation Studio

Create and share anime and manga stories with AI-powered tools.

## Manga Studio - Image Generation

KuraFlix uses Stable Diffusion with anime-optimized models for manga panel generation. The implementation provides:

- **Multiple AI Models**: Choose from Anything V5, Counterfeit, MeinaMix, or ToonYou
- **Art Style Controls**: Traditional manga, colored anime, realistic manga, chibi, or sketch styles
- **Customization Options**: Fine-tune with advanced settings like negative prompts
- **Ultra-Affordable API Integration**: Uses RunPod for cost-effective generation (~$0.0009 per image)

## Setup Instructions

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure your `.env` file with your RunPod API key:
```
RUNPOD_API_KEY=your_api_key_here
```

3. Get a RunPod API key:
   - Create an account at [runpod.io](https://www.runpod.io/)
   - Go to your Account Settings to find your API key
   - Images cost as low as $0.0009 each (5x cheaper than alternatives!)
   - Free credits are available for new accounts

4. Start the backend:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the frontend:
```bash
npm run dev
```

## Using Manga Studio

1. Go to the Manga Creator page
2. Create panel layouts for your manga pages
3. Select characters, environments, and actions for each panel
4. Use advanced settings to customize your generation:
   - Choose the AI model that best fits your style
   - Select an art style
   - Add negative prompts to avoid unwanted elements
5. Generate your manga panels with AI
6. Add text bubbles and effects
7. Publish and share your manga story

## API Reference

### Generate Manga Panel

```
POST /api/generate-manga-panel
```

Request body:
```json
{
  "characters": [{"id": 1, "name": "Character Name"}],
  "environment": "Forest",
  "action": "Character is running through the forest",
  "style": "manga",
  "model": "anything-v5",
  "negativePrompt": "low quality, bad anatomy"
}
```

Response:
```json
{
  "success": true,
  "panel": {
    "id": "1234567890",
    "imageUrl": "/outputs/manga_1234567890.png",
    "environment": "Forest",
    "characters": [{"id": 1, "name": "Character Name"}],
    "action": "Character is running through the forest",
    "style": "manga",
    "model": "anything-v5",
    "timestamp": "2023-10-01T12:00:00.000Z"
  }
}
```

## Advanced Customization

For more customization options:

1. **ControlNet**: For pose and composition control, modify the ComfyUI workflow in `backend/server.js`
2. **LoRA Models**: Add custom character styles by implementing LoRA support in the ComfyUI workflow
3. **Self-hosting**: For even higher volume usage, you can deploy your own RunPod server with ComfyUI

## Why RunPod with ComfyUI?

- **5x Cost Savings**: Much cheaper than other API services at ~$0.0009 per image
- **Higher Quality**: Full control over the generation pipeline with ComfyUI
- **Flexibility**: Use the latest anime-optimized models and techniques
- **Speed**: Access to fast GPUs (A10G, A100) for quick generation
- **Scaling**: Easy to scale as your needs grow

## License

MIT

# RunPod ComfyUI Client

A JavaScript client library for generating images with ComfyUI running on RunPod.

## Overview

This client provides a simple way to interact with ComfyUI deployments running on RunPod's serverless infrastructure. It supports multiple API formats and handles the communication with the RunPod API.

## Features

- Health check for RunPod endpoints
- Image generation using multiple formats:
  - Simple prompt format (Format 6)
  - ComfyUI workflow format (Format 7)
- Status checking and polling for job completion
- Automatic format selection

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install axios dotenv
```

3. Create a `.env` file in the backend directory with your RunPod credentials:

```
RUNPOD_API_KEY=your_api_key_here
RUNPOD_ENDPOINT_ID=your_endpoint_id_here
```

## Usage

### Basic Usage

```javascript
const RunPodComfyUIClient = require('./runpod-comfyui-client');

// Create a client instance
const client = new RunPodComfyUIClient(
  process.env.RUNPOD_API_KEY,
  process.env.RUNPOD_ENDPOINT_ID
);

// Generate an image with automatic format selection
async function generateImage() {
  try {
    // Start the image generation job
    const job = await client.generateImage({
      prompt: "anime girl with blue hair, detailed portrait",
      negative_prompt: "bad quality, low quality",
      width: 512,
      height: 512,
      steps: 20,
      cfg_scale: 7.0,
      sampler: "euler",
      seed: 123456,
      model: "CounterfeitV25_25" // Make sure this model is available on your endpoint
    });
    
    console.log('Job started:', job.id);
    
    // Wait for job completion
    const result = await client.waitForJobCompletion(
      job.id, 
      60, // Check for up to 5 minutes (60 * 5s)
      5000, // Poll every 5 seconds
      (status, attempt) => console.log(`Job status (attempt ${attempt + 1}): ${status.status}`)
    );
    
    console.log('Job completed!');
    console.log('Output:', result.output);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateImage();
```

### Available Methods

#### `checkHealth()`

Checks if the RunPod endpoint is healthy.

#### `generateImageDirectFormat(options)`

Generates an image using the direct prompt format (Format 6).

Options:
- `prompt`: Positive prompt text
- `negative_prompt`: Negative prompt text
- `width`: Image width (default: 512)
- `height`: Image height (default: 512)
- `steps`: Number of sampling steps (default: 20)
- `cfg_scale`: CFG scale (default: 7.0)
- `sampler`: Sampler name (default: "euler")
- `seed`: Random seed (default: random)
- `model`: Model to use (default: "CounterfeitV25_25")

#### `generateImageComfyFormat(options)`

Generates an image using the ComfyUI workflow format (Format 7).

Options:
- `prompt`: Positive prompt text
- `negative_prompt`: Negative prompt text
- `width`: Image width (default: 512)
- `height`: Image height (default: 512)
- `steps`: Number of sampling steps (default: 20)
- `cfg`: Guidance scale (default: 7.0)
- `sampler_name`: Sampler name (default: "euler")
- `scheduler`: Scheduler (default: "normal")
- `seed`: Random seed (default: random)
- `model`: Model to use (default: "CounterfeitV25_25")

#### `generateImage(options)`

Simplified interface that tries the direct format first and falls back to ComfyUI format if that fails.

#### `checkJobStatus(jobId)`

Checks the status of a job.

#### `waitForJobCompletion(jobId, maxAttempts, interval, progressCallback)`

Waits for a job to complete.

Parameters:
- `jobId`: The job ID to wait for
- `maxAttempts`: Maximum number of polling attempts (default: 30)
- `interval`: Polling interval in milliseconds (default: 5000)
- `progressCallback`: Optional callback for status updates

## Testing

Run the test script to verify that the client works correctly:

```bash
node test/test-client.js
```

## Important Notes

1. Make sure the model specified in your options is available on your RunPod endpoint.
2. Image generation can take a long time, especially for high-quality images or complex prompts.
3. Check your RunPod dashboard for job status and results.
4. The RunPod serverless API has rate limits, so be careful when submitting many requests.

## License

MIT 