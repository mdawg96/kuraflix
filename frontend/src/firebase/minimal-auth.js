// Import only the necessary Firebase auth elements
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { auth } from "./config";

// Create a Google provider instance
const googleProvider = new GoogleAuthProvider();

/**
 * Simplified Google Sign-in function that only uses popup mode
 * This is a minimal implementation to avoid any potential conflicts
 */
export const simpleGoogleSignIn = async () => {
  console.log("Starting simple Google sign-in...");
  try {
    // Clear any redirect flags left over from previous attempts
    sessionStorage.removeItem('googleSignInRedirect');
    
    // Set minimal configuration to reduce problems
    googleProvider.setCustomParameters({
      'prompt': 'select_account'
    });
    
    // Attempt popup sign-in
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Simple Google sign-in successful");
    
    // Check if this is a new user
    const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    
    return {
      user: result.user,
      isNewUser
    };
  } catch (error) {
    console.error("Simple Google sign-in error:", error);
    // If popup was blocked or closed, we want to throw so that the
    // fallback method in the login page can be used
    throw error;
  }
};

export default {
  simpleGoogleSignIn
}; 