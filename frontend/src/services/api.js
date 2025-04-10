import axios from 'axios';
import { characterFirestore, mangaFirestore } from '../firebase/firestore';
import { firestoreService } from './firestoreService';

/**
 * API URL Configuration
 * 
 * IMPORTANT: The API_URL constant no longer includes the '/api' path segment.
 * When adding new endpoints, use the appropriate path for the backend API.
 * 
 * Correct endpoint examples:  
 *   - '/generate-manga-panel'
 *   - '/generate-character'
 *   - '/scenes'
 * 
 * If the backend structure changes in the future, only update the API_URL constant,
 * not all the individual endpoints.
 */

// Configure the base URL for backend API (not Firebase)
// This is only for the REST API backend, not for Firebase services
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

console.log('API Configuration:', {
  backendApiUrl: API_URL,
  fullExampleUrl: `${API_URL}/generate-manga-panel`,
  note: 'API_URL no longer includes /api path, endpoints are relative to base URL',
  environment: import.meta.env.VITE_APP_ENV || 'development',
  firebase: {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'configured in config.js',
    usingFirebase: true
  }
});

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
      console.error('This error only affects backend API calls, not Firebase operations');
    }
    return Promise.reject(error);
  }
);

// Character API methods
export const characterAPI = {
  // Get all user characters
  getUserCharacters: async () => {
    try {
      console.log('characterAPI: Getting user characters');
      
      // Use the firestoreService for character operations
      const result = await firestoreService.getUserCharacters();
      console.log('characterAPI: Result from firestoreService:', result);
      
      // Format response to match expected API structure
      if (result.success) {
        return {
          success: true,
          data: { 
            success: true, 
            characters: result.characters 
          }
        };
      } else {
        console.error('characterAPI: Error getting user characters:', result.error);
        return {
          success: false,
          data: { 
            success: false, 
            error: result.error 
          }
        };
      }
    } catch (error) {
      console.error('characterAPI: Unexpected error getting user characters:', error);
      return {
        success: false,
        data: {
          success: false,
          error: error.message || 'An unexpected error occurred'
        }
      };
    }
  },
  
  // Get project characters
  getProjectCharacters: async (projectId) => {
    try {
      console.log(`characterAPI: Getting characters for project ${projectId}`);
      return await characterFirestore.getProjectCharacters(projectId);
    } catch (error) {
      console.error(`Error fetching characters for project ${projectId}:`, error);
      return {
        success: false,
        error: error.message || 'Failed to fetch project characters'
      };
    }
  },
  
  // Assign a character to a project
  assignCharacterToProject: async (characterId, projectId) => {
    try {
      return await characterFirestore.assignCharacterToProject(characterId, projectId);
    } catch (error) {
      console.error(`Error assigning character ${characterId} to project ${projectId}:`, error);
      throw error;
    }
  },
  
  // Remove a character from a project
  removeCharacterFromProject: async (characterId, projectId) => {
    try {
      return await characterFirestore.removeCharacterFromProject(characterId, projectId);
    } catch (error) {
      console.error(`Error removing character ${characterId} from project ${projectId}:`, error);
      throw error;
    }
  },
  
  // Generate a character image (still uses backend API)
  generateCharacter: async (characterData) => {
    try {
      const response = await apiClient.post('/generate-character', characterData);
      return response.data;
    } catch (error) {
      console.error('Error generating character:', error);
      throw error;
    }
  },
  
  // Create a new character
  createCharacter: async (characterData) => {
    try {
      const response = await characterFirestore.createCharacter(characterData);
      console.log('characterAPI: Raw Firestore response from createCharacter:', response);
      return response;
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  },
  
  // Save a character (after generation)
  saveCharacter: async (characterData) => {
    try {
      console.log('characterAPI: Saving character to Firestore');
      // Get the direct response from Firestore without wrapping it
      const response = await characterFirestore.createCharacter(characterData);
      console.log('characterAPI: Raw Firestore response:', response);
      // Pass through the response directly
      return response;
    } catch (error) {
      console.error('Error saving character to Firestore:', error);
      throw error;
    }
  },
  
  // Update an existing character
  updateCharacter: async (characterId, characterData) => {
    try {
      return await characterFirestore.updateCharacter(characterId, characterData);
    } catch (error) {
      console.error(`Error updating character ${characterId}:`, error);
      throw error;
    }
  },
  
  // Delete a character
  deleteCharacter: async (characterId) => {
    try {
      return await characterFirestore.deleteCharacter(characterId);
    } catch (error) {
      console.error(`Error deleting character ${characterId}:`, error);
      throw error;
    }
  }
};

// Scene API still uses backend
export const sceneAPI = {
  generateScene: (data) => apiClient.post('/generate-scene', data),
  getScenes: () => apiClient.get('/scenes'),
  getScene: (id) => apiClient.get(`/scenes/${id}`),
  saveScene: (data) => apiClient.post('/scenes', data),
  updateScene: (id, data) => apiClient.put(`/scenes/${id}`, data),
  deleteScene: (id) => apiClient.delete(`/scenes/${id}`),
};

// Voice API still uses backend
export const voiceAPI = {
  generateVoice: (data) => apiClient.post('/generate-voice', data),
};

// Manga API - mix of Firebase and backend API
export const mangaAPI = {
  // Backend API for AI generation
  generatePanel: (data) => apiClient.post('/generate-manga-panel', data),
  checkGenerationStatus: (jobId) => apiClient.get(`/generate-manga-panel/status/${jobId}`),
  testGPT4o: () => apiClient.get('/test-gpt4o'),
  
  // Firebase for data storage
  getMangaStories: async () => {
    try {
      return await mangaFirestore.getMangaStories();
    } catch (error) {
      console.error('Error fetching manga stories:', error);
      throw error;
    }
  },
  
  getMangaStory: async (id) => {
    try {
      return await mangaFirestore.getMangaStory(id);
    } catch (error) {
      console.error(`Error fetching manga story ${id}:`, error);
      throw error;
    }
  },
  
  saveMangaStory: async (data) => {
    try {
      return await mangaFirestore.saveMangaStory(data);
    } catch (error) {
      console.error('Error saving manga story:', error);
      throw error;
    }
  },
  
  updateMangaStory: async (id, data) => {
    try {
      return await mangaFirestore.updateMangaStory(id, data);
    } catch (error) {
      console.error(`Error updating manga story ${id}:`, error);
      throw error;
    }
  },
  
  deleteMangaStory: async (id) => {
    try {
      return await mangaFirestore.deleteMangaStory(id);
    } catch (error) {
      console.error(`Error deleting manga story ${id}:`, error);
      throw error;
    }
  },
};

// Episode API still uses backend
export const episodeAPI = {
  renderEpisode: (data) => apiClient.post('/render-episode', data),
  getRenderStatus: (jobId) => apiClient.get(`/render-status/${jobId}`),
  getEpisodes: () => apiClient.get('/episodes'),
  getEpisode: (id) => apiClient.get(`/episodes/${id}`),
  saveEpisode: (data) => apiClient.post('/episodes', data),
  updateEpisode: (id, data) => apiClient.put(`/episodes/${id}`, data),
  deleteEpisode: (id) => apiClient.delete(`/episodes/${id}`),
};

export default {
  character: characterAPI,
  scene: sceneAPI,
  voice: voiceAPI,
  manga: mangaAPI,
  episode: episodeAPI,
}; 