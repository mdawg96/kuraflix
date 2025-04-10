const axios = require('axios');
const EventEmitter = require('events');

class RunPodJob extends EventEmitter {
  constructor(client, id, status = null) {
    super();
    this.client = client;
    this.id = id;
    this.status = status;
    this.result = null;
  }

  async getStatus() {
    try {
      const response = await this.client.axios.get(`${this.client.runpodEndpoint}/status/${this.id}`);
      this.status = response.data;
      this.emit('status', this.status);
      return this.status;
    } catch (error) {
      console.error(`Error getting job status for ${this.id}:`, error.message);
      throw error;
    }
  }

  async waitForCompletion(maxAttempts = 60, interval = 2000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const status = await this.getStatus();
        
        if (status.status === 'COMPLETED') {
          this.result = status;
          this.emit('completed', status);
          return status;
        }
        
        if (status.status === 'FAILED') {
          this.emit('failed', status);
          throw new Error(`Job failed: ${JSON.stringify(status.error || 'Unknown error')}`);
        }
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error waiting for job completion (attempt ${attempts}):`, error.message);
        
        // On network errors, wait and retry
        if (error.isAxiosError) {
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // For other errors, rethrow
        throw error;
      }
    }
    
    throw new Error(`Job timed out after ${maxAttempts} attempts`);
  }
}

class FastRunPodComfyUIClient {
  constructor(apiKey, endpointId) {
    this.apiKey = apiKey;
    this.endpointId = endpointId;
    this.runpodEndpoint = `https://api.runpod.ai/v2/${endpointId}`;
    
    this.axios = axios.create({
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`RunPod client initialized for endpoint: ${endpointId}`);
  }
  
  async generate(input) {
    try {
      console.log('Sending generation request to RunPod:', JSON.stringify(input));
      
      const response = await this.axios.post(`${this.runpodEndpoint}/run`, {
        input: {
          prompt: input.prompt || '',
          negative_prompt: input.negative_prompt || '',
          width: input.width || 512,
          height: input.height || 768,
          num_inference_steps: input.num_inference_steps || 25,
          guidance_scale: input.guidance_scale || 7.5,
          scheduler: input.scheduler || 'EulerAncestralDiscreteScheduler',
          seed: input.seed || Math.floor(Math.random() * 2147483647)
        }
      });
      
      console.log('RunPod response:', response.data);
      
      return new RunPodJob(this, response.data.id);
    } catch (error) {
      console.error('Error generating with RunPod:', error.message);
      throw error;
    }
  }
  
  async generateWithFallbacks(input) {
    // Try the main generation method first
    try {
      return await this.generate(input);
    } catch (error) {
      console.error('Primary generation method failed, trying fallback:', error.message);
      
      // Simple fallback: retry once with slightly modified parameters
      try {
        const fallbackInput = {
          ...input,
          num_inference_steps: 20, // Reduced from default 25
          seed: Math.floor(Math.random() * 2147483647) // New random seed
        };
        
        return await this.generate(fallbackInput);
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError.message);
        throw fallbackError;
      }
    }
  }
}

module.exports = FastRunPodComfyUIClient; 