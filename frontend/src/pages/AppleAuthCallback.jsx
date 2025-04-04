import React, { useEffect, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { createAppleCredential, revokeAppleTokenAndDeleteAccount } from '../firebase/auth';
import { auth } from '../firebase/config';

/**
 * Callback page for handling responses from Apple Sign In
 */
const AppleAuthCallback = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { setIsLoggedIn, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get a user-friendly error message
  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
        return 'The Apple sign in credentials were invalid. Please try again.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials. Try signing in using a different method.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completing the process.';
      case 'auth/cancelled-popup-request':
        return 'The sign-in process was cancelled.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please allow popups for this website.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection and try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  useEffect(() => {
    async function processAppleResponse() {
      try {
        // Parse URL query parameters
        const queryParams = new URLSearchParams(location.search);
        const state = queryParams.get('state');
        const code = queryParams.get('code');
        const id_token = queryParams.get('id_token');
        const error = queryParams.get('error');

        if (error) {
          setError(`Apple sign in was cancelled or denied: ${error}`);
          setLoading(false);
          return;
        }

        if (!code || !id_token) {
          setError('Invalid response from Apple. Please try again.');
          setLoading(false);
          return;
        }

        // Get the stored nonce for verification
        const nonce = sessionStorage.getItem('appleNonce');
        if (!nonce) {
          setError('Authentication session expired. Please try signing in again.');
          setLoading(false);
          return;
        }

        // Clear the stored nonce
        sessionStorage.removeItem('appleNonce');

        // Handle user deletion request
        if (state === 'delete-account') {
          const result = await revokeAppleTokenAndDeleteAccount(code);
          if (result.error) {
            setError(getFriendlyErrorMessage(result.error.code || result.error));
          } else {
            setCurrentUser(null);
            setIsLoggedIn(false);
            navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
          }
        } 
        // Handle sign-in/sign-up
        else {
          // Create the credential
          const credential = createAppleCredential(id_token, nonce);
          
          // Sign in with Firebase
          const userCredential = await auth.signInWithCredential(credential);
          
          // Update state
          setCurrentUser(userCredential.user);
          setIsLoggedIn(true);
          
          // Redirect to app
          navigate('/studio');
        }
      } catch (error) {
        console.error('Error during Apple authentication:', error);
        setError(getFriendlyErrorMessage(error.code || error.message));
      } finally {
        setLoading(false);
      }
    }

    processAppleResponse();
  }, [location, setCurrentUser, setIsLoggedIn, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Processing your sign in...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full bg-gray-900 p-8 rounded-lg">
          <div className="text-red-500 mb-4">
            <svg className="h-8 w-8 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-4">Authentication Error</h2>
          <p className="text-gray-300 text-center mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Redirecting...</p>
      </div>
    </div>
  );
};

export default AppleAuthCallback; 