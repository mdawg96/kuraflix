import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { checkRedirectResult } from '../firebase/auth';

// Create the auth context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectChecked, setRedirectChecked] = useState(false);
  
  // Immediately redirect if on the auth handler page
  useEffect(() => {
    // Check if we're on the auth handler page using window.location
    const isAuthHandlerPage = window.location.pathname.includes('/__/auth/handler');
    
    if (isAuthHandlerPage) {
      console.log("Detected auth handler page, redirecting to home");
      window.location.href = '/';
    }
  }, []);

  // Handle Google redirect result
  useEffect(() => {
    const handleRedirectResult = async () => {
      console.log("Starting redirect check...");
      try {
        // Check if we're on the auth handler page
        const isAuthHandlerPage = window.location.pathname.includes('/__/auth/handler');
        console.log("Is auth handler page:", isAuthHandlerPage);
        
        // Check if we've initiated a redirect previously
        const hasRedirected = sessionStorage.getItem('googleSignInRedirect') === 'true';
        console.log("Has redirect flag:", hasRedirected);
        
        // If we're on the auth handler page, redirect immediately
        if (isAuthHandlerPage) {
          console.log("Redirecting from auth handler to home page");
          sessionStorage.removeItem('googleSignInRedirect');
          window.location.href = '/';
          return;
        }
        
        console.log("Checking for Google sign-in redirect result...");
        const result = await checkRedirectResult();
        console.log("Redirect check result:", result);
        
        if (result.user) {
          console.log("User signed in via redirect:", result.user);
          setCurrentUser(result.user);
        } else if (result.error) {
          console.error("Redirect error:", result.error);
        } else {
          console.log("No redirect result found");
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      } finally {
        setRedirectChecked(true);
        // Clear the redirect flag
        sessionStorage.removeItem('googleSignInRedirect');
      }
    };
    
    // Only run if not on auth handler page (to avoid duplicate redirects)
    const isAuthHandlerPage = window.location.pathname.includes('/__/auth/handler');
    if (!isAuthHandlerPage) {
      handleRedirectResult();
    }
  }, []);

  // Set up the auth state listener when the component mounts
  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      setCurrentUser(user);
      setLoading(redirectChecked ? false : loading);
    });

    // Clean up the listener when the component unmounts
    return unsubscribe;
  }, [redirectChecked, loading]);

  // The value that will be given to the context
  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    reloadUser: () => auth.currentUser?.reload()
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 