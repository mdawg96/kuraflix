const axios = require('axios');
require('dotenv').config({ path: '../backend/.env' });

// Test workflow with corrected values
const testWorkflow = {
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "CounterfeitV25_25"
    }
  },
  "2": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 768,
      "batch_size": 1
    }
  },
  "3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "anime portrait of a girl with long black hair, detailed manga style, high quality",
      "clip": ["1", 0]
    }
  },
  "4": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "blurry, low quality, worst quality, bad anatomy",
      "clip": ["1", 0]
    }
  },
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 42,
      "steps": 28,
      "cfg": 7.5,
      "sampler_name": "euler_ancestral",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["1", 0],
      "positive": ["3", 0],
      "negative": ["4", 0],
      "latent_image": ["2", 0]
    }
  },
  "6": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["5", 0],
      "vae": ["1", 2]
    }
  },
  "7": {
    "class_type": "PreviewImage",
    "inputs": {
      "images": ["6", 0]
    }
  }
};

// Try a super simplified request
const simpleRequest = {
  "prompt": "anime girl with black hair"
};

// Create a simplified workflow instead
const simpleWorkflow = {
  "3": {
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["4", 0],
      "positive": ["5", 0],
      "negative": ["6", 0],
      "latent_image": ["7", 0]
    },
    "class_type": "KSampler"
  },
  "4": {
    "inputs": {
      "ckpt_name": "deliberate_v2"
    },
    "class_type": "CheckpointLoaderSimple"
  },
  "5": {
    "inputs": {
      "text": "anime girl with black hair",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "6": {
    "inputs": {
      "text": "bad quality, low quality",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage"
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {
      "images": ["8", 0],
      "filename_prefix": "output"
    },
    "class_type": "SaveImage"
  }
};

// Update to use more common model name
const finalWorkflow = {
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "deliberate_v2"
    }
  },
  "2": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    }
  },
  "3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "anime girl with black hair",
      "clip": ["1", 0]
    }
  },
  "4": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "bad quality, low quality, worst quality",
      "clip": ["1", 0]
    }
  },
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["1", 0],
      "positive": ["3", 0],
      "negative": ["4", 0],
      "latent_image": ["2", 0]
    }
  },
  "6": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["5", 0],
      "vae": ["1", 2]
    }
  },
  "7": {
    "class_type": "SaveImage",
    "inputs": {
      "images": ["6", 0],
      "filename_prefix": "output"
    }
  }
};

// Use the simplest request as shown in the screenshot
const minimalistRequest = {
  "input": {
    "prompt": "anime girl with black hair"
  }
};

// Use this super simple test workflow
const superSimpleWorkflow = {
  "1": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "CounterfeitV25_25"
    }
  },
  "2": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    }
  },
  "3": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "anime girl with black hair",
      "clip": ["1", 0]
    }
  },
  "4": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "low quality, bad quality",
      "clip": ["1", 0]
    }
  },
  "5": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["1", 0],
      "positive": ["3", 0],
      "negative": ["4", 0],
      "latent_image": ["2", 0]
    }
  },
  "6": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["5", 0],
      "vae": ["1", 2]
    }
  },
  "7": {
    "class_type": "PreviewImage",
    "inputs": {
      "images": ["6", 0]
    }
  }
};

// Add this extremely simple workflow that should work on any ComfyUI instance
const basicWorkflow = {
  "1": {
    "class_type": "KSampler",
    "inputs": {
      "cfg": 8,
      "denoise": 1,
      "latent_image": {
        "samples": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        }
      },
      "model": {
        "ckpt_name": "deliberate_v2"
      },
      "negative": {
        "text": "bad quality"
      },
      "positive": {
        "text": "anime girl with black hair"
      },
      "sampler_name": "euler",
      "scheduler": "normal",
      "seed": 42,
      "steps": 20
    }
  },
  "2": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["1", 0],
      "vae": ["1", 2]
    }
  },
  "3": {
    "class_type": "PreviewImage",
    "inputs": {
      "images": ["2", 0]
    }
  }
};

// Try another format based on API documentation
const apiFormatWorkflow = {
  "prompt": {
    "3": {
      "inputs": {
        "seed": 42,
        "steps": 20,
        "cfg": 7.0,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["5", 0],
        "negative": ["6", 0],
        "latent_image": ["7", 0]
      },
      "class_type": "KSampler"
    },
    "4": {
      "inputs": {
        "ckpt_name": "deliberate_v2"
      },
      "class_type": "CheckpointLoaderSimple"
    },
    "5": {
      "inputs": {
        "text": "anime girl with black hair",
        "clip": ["4", 0]
      },
      "class_type": "CLIPTextEncode"
    },
    "6": {
      "inputs": {
        "text": "bad quality, low quality",
        "clip": ["4", 0]
      },
      "class_type": "CLIPTextEncode"
    },
    "7": {
      "inputs": {
        "width": 512,
        "height": 512,
        "batch_size": 1
      },
      "class_type": "EmptyLatentImage"
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode"
    },
    "9": {
      "inputs": {
        "images": ["8", 0]
      },
      "class_type": "PreviewImage"
    }
  },
  "workflow": {
    "last_node_id": 9,
    "last_link_id": 8,
    "nodes": [
      {
        "id": 3,
        "type": "KSampler",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 300,
          "1": 500
        },
        "flags": {},
        "order": 0,
        "mode": 0,
        "inputs": [
          {
            "name": "model",
            "type": "MODEL",
            "link": 0
          },
          {
            "name": "positive",
            "type": "CONDITIONING",
            "link": 1
          },
          {
            "name": "negative",
            "type": "CONDITIONING",
            "link": 2
          },
          {
            "name": "latent_image",
            "type": "LATENT",
            "link": 3
          }
        ],
        "outputs": [
          {
            "name": "LATENT",
            "type": "LATENT",
            "links": [
              4
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "KSampler"
        },
        "widgets_values": [
          42,
          20,
          7,
          "euler",
          "normal",
          1
        ]
      },
      {
        "id": 4,
        "type": "CheckpointLoaderSimple",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 300,
          "1": 100
        },
        "flags": {},
        "order": 1,
        "mode": 0,
        "outputs": [
          {
            "name": "MODEL",
            "type": "MODEL",
            "links": [
              0
            ]
          },
          {
            "name": "CLIP",
            "type": "CLIP",
            "links": [
              5,
              6
            ]
          },
          {
            "name": "VAE",
            "type": "VAE",
            "links": [
              7
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "CheckpointLoaderSimple"
        },
        "widgets_values": [
          "deliberate_v2"
        ]
      },
      {
        "id": 5,
        "type": "CLIPTextEncode",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 400,
          "1": 200
        },
        "flags": {},
        "order": 2,
        "mode": 0,
        "inputs": [
          {
            "name": "clip",
            "type": "CLIP",
            "link": 5
          }
        ],
        "outputs": [
          {
            "name": "CONDITIONING",
            "type": "CONDITIONING",
            "links": [
              1
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "CLIPTextEncode"
        },
        "widgets_values": [
          "anime girl with black hair"
        ]
      },
      {
        "id": 6,
        "type": "CLIPTextEncode",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 400,
          "1": 200
        },
        "flags": {},
        "order": 3,
        "mode": 0,
        "inputs": [
          {
            "name": "clip",
            "type": "CLIP",
            "link": 6
          }
        ],
        "outputs": [
          {
            "name": "CONDITIONING",
            "type": "CONDITIONING",
            "links": [
              2
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "CLIPTextEncode"
        },
        "widgets_values": [
          "bad quality, low quality"
        ]
      },
      {
        "id": 7,
        "type": "EmptyLatentImage",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 300,
          "1": 100
        },
        "flags": {},
        "order": 4,
        "mode": 0,
        "outputs": [
          {
            "name": "LATENT",
            "type": "LATENT",
            "links": [
              3
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "EmptyLatentImage"
        },
        "widgets_values": [
          512,
          512,
          1
        ]
      },
      {
        "id": 8,
        "type": "VAEDecode",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 200,
          "1": 100
        },
        "flags": {},
        "order": 5,
        "mode": 0,
        "inputs": [
          {
            "name": "samples",
            "type": "LATENT",
            "link": 4
          },
          {
            "name": "vae",
            "type": "VAE",
            "link": 7
          }
        ],
        "outputs": [
          {
            "name": "IMAGE",
            "type": "IMAGE",
            "links": [
              8
            ]
          }
        ],
        "properties": {
          "Node name for S&R": "VAEDecode"
        }
      },
      {
        "id": 9,
        "type": "PreviewImage",
        "pos": [
          0,
          0
        ],
        "size": {
          "0": 500,
          "1": 400
        },
        "flags": {},
        "order": 6,
        "mode": 0,
        "inputs": [
          {
            "name": "images",
            "type": "IMAGE",
            "link": 8
          }
        ],
        "properties": {
          "Node name for S&R": "PreviewImage"
        }
      }
    ],
    "links": [
      {
        "id": 0,
        "origin_node_id": 4,
        "origin_slot": 0,
        "target_node_id": 3,
        "target_slot": 0
      },
      {
        "id": 1,
        "origin_node_id": 5,
        "origin_slot": 0,
        "target_node_id": 3,
        "target_slot": 1
      },
      {
        "id": 2,
        "origin_node_id": 6,
        "origin_slot": 0,
        "target_node_id": 3,
        "target_slot": 2
      },
      {
        "id": 3,
        "origin_node_id": 7,
        "origin_slot": 0,
        "target_node_id": 3,
        "target_slot": 3
      },
      {
        "id": 4,
        "origin_node_id": 3,
        "origin_slot": 0,
        "target_node_id": 8,
        "target_slot": 0
      },
      {
        "id": 5,
        "origin_node_id": 4,
        "origin_slot": 1,
        "target_node_id": 5,
        "target_slot": 0
      },
      {
        "id": 6,
        "origin_node_id": 4,
        "origin_slot": 1,
        "target_node_id": 6,
        "target_slot": 0
      },
      {
        "id": 7,
        "origin_node_id": 4,
        "origin_slot": 2,
        "target_node_id": 8,
        "target_slot": 1
      },
      {
        "id": 8,
        "origin_node_id": 8,
        "origin_slot": 0,
        "target_node_id": 9,
        "target_slot": 0
      }
    ],
    "groups": []
  }
};

// Try the ComfyUI API format exactly as documented
const comfyApiFormat = {
  "3": {
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 7.0,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1.0,
      "model": ["4", 0],
      "positive": ["5", 0],
      "negative": ["6", 0],
      "latent_image": ["7", 0]
    },
    "class_type": "KSampler"
  },
  "4": {
    "inputs": {
      "ckpt_name": "deliberate_v2"
    },
    "class_type": "CheckpointLoaderSimple"
  },
  "5": {
    "inputs": {
      "text": "anime girl with black hair",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "6": {
    "inputs": {
      "text": "bad quality, low quality",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 1
    },
    "class_type": "EmptyLatentImage"
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {
      "images": ["8", 0],
      "filename_prefix": "output"
    },
    "class_type": "SaveImage"
  }
};

// Try the simplest format as mentioned in the blib-la/runpod-worker-comfy repository
const simplePromptFormat = {
  "prompt": "anime girl with black hair",
  "negative_prompt": "bad quality, low quality",
  "model": "deliberate_v2",
  "width": 512,
  "height": 512,
  "steps": 20,
  "cfg_scale": 7.0,
  "sampler": "euler"
};

const ultrasimpleworkflow = {
  "prompt": "anime girl with black hair",
  "negative_prompt": "bad quality, ugly, deformed",
  "model": "deliberate_v2", 
  "width": 512,
  "height": 512,
  "sampler": "euler_a",
  "scheduler": "normal",
  "steps": 20,
  "cfg_scale": 7.0,
  "seed": 42
};

async function testRunPodWorkflow() {
  console.log('RunPod API Key:', process.env.RUNPOD_API_KEY ? '✅ Found' : '❌ Missing');
  console.log('RunPod Endpoint ID:', process.env.RUNPOD_ENDPOINT_ID ? '✅ Found' : '❌ Missing');
  
  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID) {
    console.error('ERROR: Missing RunPod credentials. Make sure your .env file has the required variables.');
    return;
  }
  
  try {
    // First, let's check if the endpoint is healthy
    console.log('\nChecking RunPod endpoint health...');
    const healthCheck = await axios.get(
      `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/health`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
        }
      }
    );
    
    console.log('RunPod endpoint health check:', healthCheck.data);
    
    if (!healthCheck.data || !healthCheck.data.workers || 
        (healthCheck.data.workers.ready === 0 && healthCheck.data.workers.idle === 0)) {
      console.error('No ready workers available on RunPod endpoint');
      return;
    }
    
    // Define all formats to try
    const formats = [
      // Format 1: Standard workflow inside input (from blib-la/runpod-worker-comfy docs)
      {
        name: "Standard workflow in input",
        payload: {
          "input": {
            "workflow": simpleWorkflow
          }
        }
      },
      
      // Format 2: Direct prompt format (simple txt2img)
      {
        name: "Simple prompt format",
        payload: {
          "input": simplePromptFormat
        }
      },
      
      // Format 3: API format with api_name field
      {
        name: "API format with api_name",
        payload: {
          "input": {
            "api_name": "txt2img"
          },
          "workflow": simpleWorkflow
        }
      },
      
      // Format 4: prompt at top level in input
      {
        name: "Prompt at top level",
        payload: {
          "input": {
            "prompt": "anime girl with black hair",
            "negative_prompt": "bad quality, low quality",
            "width": 512,
            "height": 512,
            "steps": 20,
            "cfg_scale": 7.0,
            "sampler": "euler",
            "seed": 42,
            "model": "deliberate_v2"
          }
        }
      },
      
      // Format 5: API prompt inside workflow
      {
        name: "API prompt inside workflow",
        payload: {
          "input": {
            "workflow": {
              "prompt": "anime girl with black hair",
              "negative_prompt": "bad quality, low quality",
              "width": 512,
              "height": 512,
              "steps": 20,
              "cfg_scale": 7.0,
              "sampler": "euler",
              "seed": 42,
              "model": "deliberate_v2"
            }
          }
        }
      },
      
      // Format 6: Only the API prompt object
      {
        name: "Only API prompt object",
        payload: {
          "prompt": "anime girl with black hair",
          "negative_prompt": "bad quality, low quality",
          "width": 512,
          "height": 512,
          "steps": 20,
          "cfg_scale": 7.0,
          "sampler": "euler",
          "seed": 42,
          "model": "deliberate_v2"
        }
      },
      
      // Format 7: prompt at top level with comfy API key
      {
        name: "Prompt with comfy API key",
        payload: {
          "prompt": {
            "3": {
              "inputs": {
                "seed": 42,
                "steps": 20,
                "cfg": 7.0,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
              },
              "class_type": "KSampler"
            },
            "4": {
              "inputs": {
                "ckpt_name": "deliberate_v2"
              },
              "class_type": "CheckpointLoaderSimple"
            },
            "5": {
              "inputs": {
                "text": "anime girl with black hair",
                "clip": ["4", 1]
              },
              "class_type": "CLIPTextEncode"
            },
            "6": {
              "inputs": {
                "text": "bad quality, low quality",
                "clip": ["4", 1]
              },
              "class_type": "CLIPTextEncode"
            },
            "7": {
              "inputs": {
                "width": 512,
                "height": 512,
                "batch_size": 1
              },
              "class_type": "EmptyLatentImage"
            },
            "8": {
              "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
              },
              "class_type": "VAEDecode"
            },
            "9": {
              "inputs": {
                "images": ["8", 0],
                "filename_prefix": "output"
              },
              "class_type": "SaveImage"
            }
          }
        }
      }
    ];
    
    // Try each format
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      console.log(`\n\n========= TESTING FORMAT ${i+1}: ${format.name} =========`);
      console.log('Payload:', JSON.stringify(format.payload, null, 2));
      
      try {
        console.log(`\nStarting RunPod job with format ${i+1}...`);
        const startJobResponse = await axios.post(
          `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`,
          format.payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
            }
          }
        );
        
        console.log(`✅ Format ${i+1} ACCEPTED! RunPod job started:`, startJobResponse.data);
        
        const jobId = startJobResponse.data.id;
        console.log(`\nPolling for job ${jobId} status...`);
        
        // Poll for completion
        let attempts = 0;
        let completed = false;
        
        while (!completed && attempts < 10) {
          try {
            console.log(`\nPolling job status (attempt ${attempts + 1}/10)...`);
            
            const statusResponse = await axios.get(
              `https://api.runpod.ai/v2/${process.env.RUNPOD_ENDPOINT_ID}/status/${jobId}`,
              {
                headers: {
                  'Authorization': `Bearer ${process.env.RUNPOD_API_KEY}`
                }
              }
            );
            
            const status = statusResponse.data.status;
            console.log(`Job ${jobId} status:`, status);
            
            if (status === 'COMPLETED') {
              console.log('\n✅ SUCCESS: Job completed successfully!');
              console.log('Output structure:', JSON.stringify(statusResponse.data.output, null, 2));
              completed = true;
              
              // Display success info
              console.log(`\n----------------------------------------------`);
              console.log(`✅ WORKING FORMAT FOUND: FORMAT ${i+1} - ${format.name}`);
              console.log(`----------------------------------------------`);
              console.log(`Use this format in your application:`);
              console.log(JSON.stringify(format.payload, null, 2));
              console.log(`----------------------------------------------`);
              
              // Exit early - we found a working format
              return;
              
            } else if (status === 'FAILED') {
              console.error(`\n❌ Job ${jobId} failed:`, statusResponse.data);
              break;
            } else {
              // Wait before polling again
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
            }
          } catch (error) {
            console.error(`\n❌ Error polling job status:`, error.message);
            if (error.response) {
              console.error('Response data:', error.response.data);
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
      } catch (error) {
        console.error(`\n❌ Format ${i+1} FAILED:`, error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
      }
    }
    
    console.log('\n\n======================================');
    console.log('❌ ALL FORMATS FAILED');
    console.log('======================================');
    console.log('Possible issues:');
    console.log('1. Your RunPod ComfyUI endpoint might require a custom format');
    console.log('2. The model "deliberate_v2" might not be available on your endpoint');
    console.log('3. Your endpoint might be malfunctioning or configured incorrectly');
    console.log('\nNext steps:');
    console.log('1. Try checking the RunPod logs for your endpoint');
    console.log('2. Verify what models are available on your endpoint');
    console.log('3. Try the ComfyUI web UI directly and extract a working workflow');
    console.log('4. Contact RunPod support if issues persist');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testRunPodWorkflow(); 