import axios from 'axios';

// Configure the base URL with fallback options
const API_URL = 'http://localhost:5001';

// Create a custom axios instance with better error handling
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error: Is the backend server running at ' + API_URL + '?');
    }
    return Promise.reject(error);
  }
);

// Character API with improved error handling
export const characterAPI = {
  generateCharacter: async (data) => {
    try {
      console.log('Attempting to call backend API at:', API_URL);
      const response = await apiClient.post('/api/generate-character', data);
      
      console.log('Full API response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success && response.data.character) {
        if (response.data.character.imagePath && !response.data.character.imageUrl) {
          // If the image path is relative, prepend the API_URL
          const imagePath = response.data.character.imagePath;
          if (imagePath.startsWith('/')) {
            response.data.character.imageUrl = API_URL + imagePath;
          } else {
            response.data.character.imageUrl = imagePath;
          }
          console.log('Image URL set to:', response.data.character.imageUrl);
        }
      }
      return response;
    } catch (error) {
      console.error('API error:', error);
      
      // Return an error response without placeholder
      return {
        data: {
          success: false,
          message: error.message || 'Generation failed. Please try again.',
        }
      };
    }
  },
  getCharacters: () => apiClient.get('/api/characters'),
  getCharacter: (id) => apiClient.get(`/api/characters/${id}`),
  saveCharacter: (data) => apiClient.post('/api/characters', data),
  updateCharacter: (id, data) => apiClient.put(`/api/characters/${id}`, data),
  deleteCharacter: (id) => apiClient.delete(`/api/characters/${id}`),
};

// Scene API
export const sceneAPI = {
  generateScene: (data) => apiClient.post('/api/generate-scene', data),
  getScenes: () => apiClient.get('/api/scenes'),
  getScene: (id) => apiClient.get(`/api/scenes/${id}`),
  saveScene: (data) => apiClient.post('/api/scenes', data),
  updateScene: (id, data) => apiClient.put(`/api/scenes/${id}`, data),
  deleteScene: (id) => apiClient.delete(`/api/scenes/${id}`),
};

// Voice API
export const voiceAPI = {
  generateVoice: (data) => apiClient.post('/api/generate-voice', data),
};

// Manga API
export const mangaAPI = {
  generatePanel: (data) => apiClient.post('/api/generate-manga-panel', data),
  getMangaStories: () => apiClient.get('/api/manga-stories'),
  getMangaStory: (id) => apiClient.get(`/api/manga-stories/${id}`),
  saveMangaStory: (data) => apiClient.post('/api/manga-stories', data),
  updateMangaStory: (id, data) => apiClient.put(`/api/manga-stories/${id}`, data),
  deleteMangaStory: (id) => apiClient.delete(`/api/manga-stories/${id}`),
  checkGenerationStatus: (jobId) => apiClient.get(`/api/generate-manga-panel/status/${jobId}`),
};

// Episode API
export const episodeAPI = {
  renderEpisode: (data) => apiClient.post('/api/render-episode', data),
  getRenderStatus: (jobId) => apiClient.get(`/api/render-status/${jobId}`),
  getEpisodes: () => apiClient.get('/api/episodes'),
  getEpisode: (id) => apiClient.get(`/api/episodes/${id}`),
  saveEpisode: (data) => apiClient.post('/api/episodes', data),
  updateEpisode: (id, data) => apiClient.put(`/api/episodes/${id}`, data),
  deleteEpisode: (id) => apiClient.delete(`/api/episodes/${id}`),
};

export default {
  character: characterAPI,
  scene: sceneAPI,
  voice: voiceAPI,
  manga: mangaAPI,
  episode: episodeAPI,
}; 