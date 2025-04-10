import { characterFirestore } from '../firebase/firestore';
import { auth, db } from '../firebase/config';

// Add database information to all service calls for debugging
const addDebugInfo = (response) => {
  const debugInfo = {
    projectId: db._databaseId?.projectId || 'unknown',
    isAuthenticated: !!auth.currentUser,
    uid: auth.currentUser?.uid || 'not_authenticated',
    timestamp: new Date().toISOString()
  };
  
  return {
    ...response,
    _debug: debugInfo
  };
};

/**
 * Firestore Service - Wrapper around Firebase Firestore operations
 * Provides consistent error handling and response format
 */
export const firestoreService = {
  /**
   * Get authenticated user ID
   * @returns {string|null} User ID or null if not authenticated
   */
  getCurrentUserId: () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('User not authenticated in firestoreService.getCurrentUserId()');
      return null;
    }
    return currentUser.uid;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated: () => {
    return auth.currentUser !== null;
  },

  /**
   * Get all characters for the current user with standardized response format
   * @returns {Promise<Object>} Response object with success flag, characters array, and optional error
   */
  getUserCharacters: async () => {
    try {
      // Check authentication
      if (!firestoreService.isAuthenticated()) {
        console.warn('User not authenticated in firestoreService.getUserCharacters()');
        return addDebugInfo({
          success: false,
          characters: [],
          error: 'User not authenticated'
        });
      }

      // Call the Firestore function
      console.log('Calling characterFirestore.getUserCharacters()');
      const response = await characterFirestore.getUserCharacters();
      console.log('Response from characterFirestore:', response);

      // Return standardized response
      // The characterFirestore.getUserCharacters returns { success, characters, debugInfo }
      if (response && response.success) {
        return addDebugInfo({
          success: true,
          characters: response.characters || [],
          error: null
        });
      } else {
        return addDebugInfo({
          success: false,
          characters: [],
          error: response?.error || 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error in firestoreService.getUserCharacters():', error);
      return addDebugInfo({
        success: false,
        characters: [],
        error: error.message || 'Failed to fetch characters'
      });
    }
  },
  
  /**
   * Get characters assigned to a specific project
   * @param {string} projectId - The ID of the project
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  getProjectCharacters: async (projectId) => {
    try {
      console.log(`FirestoreService: Fetching characters for project ${projectId}`);
      const response = await characterFirestore.getProjectCharacters(projectId);
      console.log("FirestoreService: Raw response from Firestore:", response);
      
      if (response?.data?.success) {
        return {
          success: true,
          data: response.data.characters || []
        };
      } else {
        console.error("FirestoreService: Invalid response structure:", response);
        return {
          success: false,
          data: [],
          error: "Invalid response structure from Firestore"
        };
      }
    } catch (error) {
      console.error(`FirestoreService: Error fetching characters for project ${projectId}:`, error);
      return {
        success: false,
        data: [],
        error: error.message || "Failed to fetch project characters"
      };
    }
  },
  
  /**
   * Assign a character to a project
   * @param {string} characterId - The ID of the character
   * @param {string} projectId - The ID of the project
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  assignCharacterToProject: async (characterId, projectId) => {
    try {
      console.log(`FirestoreService: Assigning character ${characterId} to project ${projectId}`);
      const response = await characterFirestore.assignCharacterToProject(characterId, projectId);
      console.log("FirestoreService: Raw response from Firestore:", response);
      
      if (response?.data?.success) {
        return { success: true };
      } else {
        console.error("FirestoreService: Invalid response structure:", response);
        return {
          success: false,
          error: "Invalid response structure from Firestore"
        };
      }
    } catch (error) {
      console.error(`FirestoreService: Error assigning character ${characterId} to project ${projectId}:`, error);
      return {
        success: false,
        error: error.message || "Failed to assign character to project"
      };
    }
  },
  
  /**
   * Remove a character from a project
   * @param {string} characterId - The ID of the character
   * @param {string} projectId - The ID of the project
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  removeCharacterFromProject: async (characterId, projectId) => {
    try {
      console.log(`FirestoreService: Removing character ${characterId} from project ${projectId}`);
      const response = await characterFirestore.removeCharacterFromProject(characterId, projectId);
      console.log("FirestoreService: Raw response from Firestore:", response);
      
      if (response?.data?.success) {
        return { success: true };
      } else {
        console.error("FirestoreService: Invalid response structure:", response);
        return {
          success: false,
          error: "Invalid response structure from Firestore"
        };
      }
    } catch (error) {
      console.error(`FirestoreService: Error removing character ${characterId} from project ${projectId}:`, error);
      return {
        success: false,
        error: error.message || "Failed to remove character from project"
      };
    }
  },
  
  /**
   * Delete a character
   * @param {string} characterId - The ID of the character to delete
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  deleteCharacter: async (characterId) => {
    try {
      console.log(`FirestoreService: Deleting character ${characterId}`);
      const response = await characterFirestore.deleteCharacter(characterId);
      console.log("FirestoreService: Raw response from Firestore:", response);
      
      if (response?.success) {
        return { success: true };
      } else {
        console.error("FirestoreService: Invalid response structure:", response);
        return {
          success: false,
          error: response?.error || "Invalid response structure from Firestore"
        };
      }
    } catch (error) {
      console.error(`FirestoreService: Error deleting character ${characterId}:`, error);
      return {
        success: false,
        error: error.message || "Failed to delete character"
      };
    }
  }
}; 