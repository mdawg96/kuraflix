import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "./config";

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Check if this is a new user
    const isNewUser = result._tokenResponse?.isNewUser || false;
    
    return { 
      user: result.user, 
      isNewUser, 
      error: null 
    };
  } catch (error) {
    console.error("Google sign-in error:", error);
    // Check if the error is related to popup blocking
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      console.warn("Popup was blocked or closed by user. This is expected behavior.");
    }
    return { user: null, isNewUser: false, error: error.message };
  }
};

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Register with email and password
export const registerWithEmailAndPassword = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user profile with the display name
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Listen for auth state changes
export const onAuthStateChanged = (callback) => {
  return auth.onAuthStateChanged(callback);
}; 