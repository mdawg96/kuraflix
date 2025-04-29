import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, app, db } from './config';
import { onAuthStateChanged } from 'firebase/auth';

// Initialize Storage
const storage = getStorage(app);

// Log connection info for debugging
console.log("Firestore Connection Info:", {
  app: app ? "initialized" : "not initialized",
  auth: auth ? "initialized" : "not initialized",
  db: db ? "initialized" : "not initialized",
  currentUser: auth.currentUser ? auth.currentUser.uid : "not authenticated",
  projectId: db._databaseId?.projectId || "unknown",
  databasePath: db._databaseId?.toString() || "unknown"
});

// Enhanced helper function to get current user ID with explicit auth checking
const getCurrentUserId = () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("No authenticated user found in getCurrentUserId()!");
    console.warn("Auth state:", { 
      currentUser: auth.currentUser,
      uid: auth.currentUser?.uid,
      isSignInWithEmailLink: auth.isSignInWithEmailLink,
      authError: auth.Error
    });
    return null;
  }
  
  console.log("User authenticated:", { 
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    isAnonymous: currentUser.isAnonymous
  });
  
  return currentUser.uid;
};

// Wait for auth to be ready before proceeding with Firestore operations
const waitForAuth = () => {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    }
  });
};

// Upload an image file to Firebase Storage
export const uploadImage = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error("Error uploading file:", error);
    return { success: false, error: error.message };
  }
};

// Character API functions
export const characterFirestore = {
  // Get all user characters
  getUserCharacters: async () => {
    try {
      console.log("Getting user characters...");
      
      // Wait for auth to settle
      const user = await waitForAuth();
      if (!user) {
        console.warn("No user after waiting for auth, returning empty character list");
        return { 
          success: true, 
          characters: [],
          debugInfo: {
            projectId: db._databaseId?.projectId || "unknown",
            authenticated: false
          }
        };
      }
      
      const userId = user.uid;
      console.log(`Auth confirmed. Fetching characters for user: ${userId}`);
      
      // Get characters collection reference
      const charactersRef = collection(db, 'characters');
      const q = query(charactersRef, where("userId", "==", userId));
      console.log("Characters collection reference created");
      
      // Get characters
      const snapshot = await getDocs(q);
      console.log(`Retrieved ${snapshot.size} characters`);
      
      const characters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Characters processed successfully:", characters);
      return { 
        success: true, 
        characters: characters,
        debugInfo: {
          projectId: db._databaseId?.projectId || "unknown",
          authenticated: true,
          userId: userId,
          count: characters.length
        }
      };
    } catch (error) {
      console.error("Error getting user characters:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Check for specific error types
      if (error.code === 'permission-denied') {
        console.error("Permission denied. Check Firestore rules.");
        return { 
          success: false, 
          error: "Permission denied. Please check your authentication.",
          debugInfo: {
            projectId: db._databaseId?.projectId || "unknown",
            authenticated: !!auth.currentUser,
            errorCode: error.code
          }
        };
      } else if (error.code === 'not-found') {
        console.error("Collection not found.");
        return { 
          success: true, 
          characters: [],
          debugInfo: {
            projectId: db._databaseId?.projectId || "unknown",
            authenticated: !!auth.currentUser,
            errorCode: error.code
          }
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        debugInfo: {
          projectId: db._databaseId?.projectId || "unknown",
          authenticated: !!auth.currentUser,
          errorCode: error.code || "unknown_error"
        }
      };
    }
  },
  
  // Get characters assigned to a specific project
  getProjectCharacters: async (projectId) => {
    try {
      const userId = getCurrentUserId();
      const charactersRef = collection(db, 'projectCharacters');
      const q = query(
        charactersRef, 
        where("userId", "==", userId),
        where("projectId", "==", projectId)
      );
      
      const querySnapshot = await getDocs(q);
      const characterIds = [];
      
      querySnapshot.forEach(doc => {
        characterIds.push(doc.data().characterId);
      });
      
      // Now fetch the full character data
      const characters = [];
      for (const id of characterIds) {
        const characterDoc = await getDoc(doc(db, 'characters', id));
        if (characterDoc.exists()) {
          characters.push({
            id: characterDoc.id,
            ...characterDoc.data()
          });
        }
      }
      
      return { 
        data: { 
          success: true, 
          characters 
        } 
      };
    } catch (error) {
      console.error(`Error fetching characters for project ${projectId}:`, error);
      return { 
        data: { 
          success: false, 
          message: error.message 
        }
      };
    }
  },
  
  // Assign a character to a project
  assignCharacterToProject: async (characterId, projectId) => {
    try {
      const userId = getCurrentUserId();
      
      // Check if this assignment already exists
      const projectCharsRef = collection(db, 'projectCharacters');
      const q = query(
        projectCharsRef,
        where("userId", "==", userId),
        where("projectId", "==", projectId),
        where("characterId", "==", characterId)
      );
      
      const existingAssignment = await getDocs(q);
      if (!existingAssignment.empty) {
        return { data: { success: true, message: 'Character already assigned to project' } };
      }
      
      // Create the assignment
      await addDoc(collection(db, 'projectCharacters'), {
        userId,
        projectId,
        characterId,
        createdAt: serverTimestamp()
      });
      
      return { data: { success: true } };
    } catch (error) {
      console.error(`Error assigning character ${characterId} to project ${projectId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Remove a character from a project
  removeCharacterFromProject: async (characterId, projectId) => {
    try {
      const userId = getCurrentUserId();
      
      const projectCharsRef = collection(db, 'projectCharacters');
      const q = query(
        projectCharsRef,
        where("userId", "==", userId),
        where("projectId", "==", projectId),
        where("characterId", "==", characterId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { data: { success: false, message: 'Assignment not found' } };
      }
      
      // Delete all matching assignments
      const deletePromises = [];
      querySnapshot.forEach(docSnapshot => {
        deletePromises.push(deleteDoc(doc(db, 'projectCharacters', docSnapshot.id)));
      });
      
      await Promise.all(deletePromises);
      
      return { data: { success: true } };
    } catch (error) {
      console.error(`Error removing character ${characterId} from project ${projectId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Create a new character
  createCharacter: async (characterData) => {
    try {
      const userId = getCurrentUserId();
      
      if (!userId) {
        console.error("User not authenticated. Please login first.");
        return { 
          success: false, 
          error: "User not authenticated. Please login first."
        };
      }
      
      // Add timestamp and user ID
      const data = {
        ...characterData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'characters'), data);
      
      // Return in the same format as getUserCharacters
      return { 
        success: true, 
        characters: [{
          id: docRef.id,
          ...data
        }]
      };
    } catch (error) {
      console.error('Error creating character:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },
  
  // Update an existing character
  updateCharacter: async (characterId, characterData) => {
    try {
      const userId = getCurrentUserId();
      const characterRef = doc(db, 'characters', characterId);
      
      // Verify ownership
      const characterDoc = await getDoc(characterRef);
      if (!characterDoc.exists()) {
        return { data: { success: false, message: 'Character not found' } };
      }
      
      if (characterDoc.data().userId !== userId) {
        return { data: { success: false, message: 'You don\'t have permission to update this character' } };
      }
      
      // Update the character
      await updateDoc(characterRef, {
        ...characterData,
        updatedAt: serverTimestamp()
      });
      
      return { 
        data: { 
          success: true, 
          character: {
            id: characterId,
            ...characterData,
            userId
          }
        }
      };
    } catch (error) {
      console.error(`Error updating character ${characterId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Delete a character
  deleteCharacter: async (characterId) => {
    try {
      const userId = getCurrentUserId();
      const characterRef = doc(db, 'characters', characterId);
      
      // Verify ownership
      const characterDoc = await getDoc(characterRef);
      if (!characterDoc.exists()) {
        return { success: false, error: 'Character not found' };
      }
      
      if (characterDoc.data().userId !== userId) {
        return { success: false, error: 'You don\'t have permission to delete this character' };
      }
      
      // Delete the character
      await deleteDoc(characterRef);
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting character ${characterId}:`, error);
      return { success: false, error: error.message };
    }
  }
};

// Manga API functions
export const mangaFirestore = {
  // Get all manga stories for the current user
  getMangaStories: async () => {
    try {
      const userId = getCurrentUserId();
      const storiesRef = collection(db, 'mangaStories');
      const q = query(storiesRef, where("userId", "==", userId));
      
      const querySnapshot = await getDocs(q);
      const stories = [];
      
      querySnapshot.forEach(doc => {
        stories.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { data: { success: true, stories } };
    } catch (error) {
      console.error('Error fetching manga stories:', error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Get a specific manga story
  getMangaStory: async (storyId) => {
    try {
      const userId = getCurrentUserId();
      const storyRef = doc(db, 'mangaStories', storyId);
      
      const storyDoc = await getDoc(storyRef);
      if (!storyDoc.exists()) {
        return { data: { success: false, message: 'Story not found' } };
      }
      
      const storyData = storyDoc.data();
      if (storyData.userId !== userId) {
        return { data: { success: false, message: 'You don\'t have permission to access this story' } };
      }
      
      return { 
        data: { 
          success: true, 
          story: {
            id: storyId,
            ...storyData
          }
        }
      };
    } catch (error) {
      console.error(`Error fetching manga story ${storyId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Save a new manga story
  saveMangaStory: async (storyData) => {
    try {
      const userId = getCurrentUserId();
      
      // Add timestamp and user ID
      const data = {
        ...storyData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'mangaStories'), data);
      
      return { 
        data: { 
          success: true, 
          story: {
            id: docRef.id,
            ...data
          }
        }
      };
    } catch (error) {
      console.error('Error saving manga story:', error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Update an existing manga story
  updateMangaStory: async (storyId, storyData) => {
    try {
      const userId = getCurrentUserId();
      const storyRef = doc(db, 'mangaStories', storyId);
      
      // Verify ownership
      const storyDoc = await getDoc(storyRef);
      if (!storyDoc.exists()) {
        return { data: { success: false, message: 'Story not found' } };
      }
      
      if (storyDoc.data().userId !== userId) {
        return { data: { success: false, message: 'You don\'t have permission to update this story' } };
      }
      
      // Update the story
      await updateDoc(storyRef, {
        ...storyData,
        updatedAt: serverTimestamp()
      });
      
      return { 
        data: { 
          success: true, 
          story: {
            id: storyId,
            ...storyData,
            userId
          }
        }
      };
    } catch (error) {
      console.error(`Error updating manga story ${storyId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Delete a manga story
  deleteMangaStory: async (storyId) => {
    try {
      const userId = getCurrentUserId();
      const storyRef = doc(db, 'mangaStories', storyId);
      
      // Verify ownership
      const storyDoc = await getDoc(storyRef);
      if (!storyDoc.exists()) {
        return { data: { success: false, message: 'Story not found' } };
      }
      
      if (storyDoc.data().userId !== userId) {
        return { data: { success: false, message: 'You don\'t have permission to delete this story' } };
      }
      
      // Delete the story
      await deleteDoc(storyRef);
      
      return { data: { success: true } };
    } catch (error) {
      console.error(`Error deleting manga story ${storyId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  }
};

// Anime API functions
export const animeFirestore = {
  // Get all anime projects for the current user
  getAnimeProjects: async () => {
    try {
      const userId = getCurrentUserId();
      const projectsRef = collection(db, 'animeProjects');
      const q = query(projectsRef, where("userId", "==", userId));
      
      const querySnapshot = await getDocs(q);
      const projects = [];
      
      querySnapshot.forEach(doc => {
        projects.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return { data: { success: true, projects } };
    } catch (error) {
      console.error('Error fetching anime projects:', error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Get a specific anime project
  getAnimeProject: async (projectId) => {
    try {
      const userId = getCurrentUserId();
      const projectRef = doc(db, 'animeProjects', projectId);
      
      const projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        return { data: { success: false, message: 'Project not found' } };
      }
      
      const projectData = projectDoc.data();
      if (projectData.userId !== userId) {
        return { data: { success: false, message: 'You don\'t have permission to access this project' } };
      }
      
      return { 
        data: { 
          success: true, 
          project: {
            id: projectId,
            ...projectData
          }
        }
      };
    } catch (error) {
      console.error(`Error fetching anime project ${projectId}:`, error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Save a new anime project
  saveAnimeProject: async (projectData) => {
    try {
      const userId = getCurrentUserId();
      
      // Add timestamp and user ID
      const data = {
        ...projectData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'animeProjects'), data);
      
      return { 
        data: { 
          success: true, 
          project: {
            id: docRef.id,
            ...data
          }
        }
      };
    } catch (error) {
      console.error('Error saving anime project:', error);
      return { data: { success: false, message: error.message } };
    }
  },
  
  // Update an existing anime project
  updateAnimeProject: async (projectId, projectData) => {
    try {
      // Validate inputs
      if (!projectId) {
        console.error("Error: Missing projectId in updateAnimeProject");
        return { data: { success: false, message: 'Project ID is required' } };
      }
      
      if (!projectData) {
        console.error("Error: Missing projectData in updateAnimeProject");
        return { data: { success: false, message: 'Project data is required' } };
      }

      console.log(`Updating anime project with ID: "${projectId}"`);
      
      const userId = getCurrentUserId();
      if (!userId) {
        console.error("Error: No authenticated user in updateAnimeProject");
        return { data: { success: false, message: 'User not authenticated' } };
      }
      
      // Reference to the specific project document
      const projectRef = doc(db, 'animeProjects', projectId);
      
      // Verify project exists and user has ownership
      try {
        const projectDoc = await getDoc(projectRef);
        if (!projectDoc.exists()) {
          console.error(`Project with ID ${projectId} not found`);
          return { data: { success: false, message: 'Project not found' } };
        }
        
        // Verify ownership
        const projectData = projectDoc.data();
        if (projectData.userId !== userId) {
          console.error(`User ${userId} doesn't have permission to update project ${projectId}`);
          return { data: { success: false, message: 'You don\'t have permission to update this project' } };
        }
      } catch (lookupError) {
        console.error(`Error verifying project ${projectId}:`, lookupError);
        return { data: { success: false, message: `Error verifying project: ${lookupError.message}` } };
      }
      
      // Add userId and update timestamp
      const dataToUpdate = {
        ...projectData,
        userId,
        updatedAt: serverTimestamp()
      };
      
      // Update the project document
      await updateDoc(projectRef, dataToUpdate);
      
      return { 
        data: { 
          success: true, 
          project: {
            id: projectId,
            ...dataToUpdate,
          }
        }
      };
    } catch (error) {
      console.error(`Error updating anime project ${projectId}:`, error);
      return { data: { success: false, message: error.message || 'Unknown error updating project' } };
    }
  },
  
  // Delete an anime project
  deleteAnimeProject: async (projectId) => {
    try {
      // Validate projectId
      if (!projectId) {
        console.error("Error: Missing projectId in deleteAnimeProject");
        return { data: { success: false, message: 'Project ID is required' } };
      }

      console.log(`Deleting anime project with ID: "${projectId}"`);
      
      const userId = getCurrentUserId();
      if (!userId) {
        console.error("Error: No authenticated user in deleteAnimeProject");
        return { data: { success: false, message: 'User not authenticated' } };
      }
      
      // First check if the project exists and belongs to this user
      try {
        console.log(`Verifying project ${projectId} exists before deleting...`);
        
        // Query for the project to confirm it exists
        const projectsRef = collection(db, 'animeProjects');
        const q = query(
          projectsRef, 
          where("userId", "==", userId),
          where("id", "==", projectId)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log(`No project found with id=${projectId} for user ${userId}. Checking for document ID match...`);
          
          // Try to get the project directly by document ID
          const projectDocRef = doc(db, 'animeProjects', projectId);
          const projectDoc = await getDoc(projectDocRef);
          
          if (!projectDoc.exists()) {
            console.error(`Project with ID ${projectId} not found in Firestore`);
            return { data: { success: false, message: 'Project not found in database' } };
          }
          
          // Verify user owns this project
          const projectData = projectDoc.data();
          if (projectData.userId !== userId) {
            console.error(`User ${userId} doesn't have permission to delete project ${projectId}`);
            return { data: { success: false, message: 'You don\'t have permission to delete this project' } };
          }
          
          // Delete using the document reference
          await deleteDoc(projectDocRef);
          console.log(`Successfully deleted project ${projectId} by document ID`);
          return { data: { success: true } };
        }
        
        // Project exists in query results, get the document reference
        const projectDoc = querySnapshot.docs[0];
        
        // Delete the project document
        await deleteDoc(doc(db, 'animeProjects', projectDoc.id));
        
        console.log(`Successfully deleted project ${projectId}`);
        return { data: { success: true } };
      } catch (lookupError) {
        console.error(`Error verifying project ${projectId}:`, lookupError);
        return { data: { success: false, message: `Error verifying project: ${lookupError.message}` } };
      }
    } catch (error) {
      console.error(`Error deleting anime project ${projectId}:`, error);
      return { data: { success: false, message: error.message || 'Unknown error deleting project' } };
    }
  }
};

export default {
  character: characterFirestore,
  manga: mangaFirestore,
  anime: animeFirestore,
  uploadImage
}; 