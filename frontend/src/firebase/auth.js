import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged
} from "firebase/auth";
import { auth, googleProvider } from "./config";

/**
 * Sign in with Google using a popup
 * @returns {Promise<Object>} Result with user data or error
 */
export const signInWithGoogle = async () => {
  console.log("Starting Google sign-in...");
  try {
    // Force popup mode for all devices to avoid redirect issues
    // This is a more reliable approach when having issues with redirects
    const usePopup = true;
    
    // Set custom parameters for Google sign-in with fewer restrictions
    googleProvider.setCustomParameters({
      'prompt': 'select_account',
    });
    
    if (!usePopup) {
      console.log("Using redirect method for mobile device");
      
      // Store a flag to indicate we've initiated a redirect
      sessionStorage.setItem('googleSignInRedirect', 'true');
      
      // Redirect to the Google sign-in page
      await signInWithRedirect(auth, googleProvider);
      console.log("Redirect initiated - page should reload");
      return { redirecting: true };
    } else {
      console.log("Using popup method for all devices");
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
        
        console.log("Google sign-in successful:", {
          email: result.user.email,
          isNewUser,
          displayName: result.user.displayName
        });
        
        return { user: result.user, isNewUser };
      } catch (popupError) {
        console.error("Popup sign-in failed, falling back to redirect:", popupError);
        
        // If popup fails (e.g., popup blockers), fall back to redirect
        sessionStorage.setItem('googleSignInRedirect', 'true');
        await signInWithRedirect(auth, googleProvider);
        return { redirecting: true };
      }
    }
  } catch (error) {
    console.error("Google sign-in error:", error);
    return { error };
  }
};

/**
 * Check for redirect result from Google sign-in
 * @returns {Promise<Object>} Result with user data or error
 */
export const checkRedirectResult = async () => {
  console.log("Checking for redirect result...");
  try {
    // Check if we're on the auth handler page
    const isAuthHandlerPage = window.location.href.includes('/__/auth/handler');
    console.log("Is auth handler page:", isAuthHandlerPage);
    
    // Check if we've initiated a redirect previously
    const hasRedirected = sessionStorage.getItem('googleSignInRedirect') === 'true';
    console.log("Has redirected flag:", hasRedirected);
    
    // If we're on the auth handler page and we've initiated a redirect, redirect to home
    if (isAuthHandlerPage) {
      console.log("On auth handler page, redirecting to home");
      sessionStorage.removeItem('googleSignInRedirect');
      window.location.href = '/';
      return { redirecting: true };
    }
    
    const result = await getRedirectResult(auth);
    
    // Clear the redirect flag
    sessionStorage.removeItem('googleSignInRedirect');
    
    if (result) {
      const isNewUser = result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
      
      console.log("Redirect result successful:", {
        email: result.user.email,
        isNewUser,
        displayName: result.user.displayName
      });
      
      return { user: result.user, isNewUser };
    }
    
    console.log("No redirect result found");
    return { user: null };
  } catch (error) {
    console.error("Error getting redirect result:", error);
    sessionStorage.removeItem('googleSignInRedirect');
    return { error };
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

/**
 * Sign out the current user
 * @returns {Promise<boolean>} Success indicator
 */
export const signOutUser = async () => {
  console.log("Signing out user...");
  try {
    await signOut(auth);
    console.log("User signed out successfully");
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

// Add alias export for backward compatibility
export const logOut = signOutUser;

/**
 * Listen for authentication state changes
 * @param {Function} callback Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const listenToAuthChanges = (callback) => {
  console.log("Setting up auth state listener");
  return onAuthStateChanged(auth, user => {
    callback(user);
    console.log("Auth state changed:", user ? `User: ${user.email}` : "Not authenticated");
  });
};

/**
 * Get the current authenticated user
 * @returns {Object|null} Current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if a user is currently signed in
 * @returns {boolean} Whether a user is signed in
 */
export const isUserSignedIn = () => {
  return !!auth.currentUser;
};

/**
 * Wait for authentication to initialize
 * @returns {Promise<Object|null>} Current user or null
 */
export const waitForAuthInit = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export default {
  signInWithGoogle,
  checkRedirectResult,
  signOutUser,
  logOut,
  listenToAuthChanges,
  getCurrentUser,
  isUserSignedIn,
  waitForAuthInit
}; 