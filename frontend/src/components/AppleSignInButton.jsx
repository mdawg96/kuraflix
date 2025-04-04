import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithApple } from '../firebase/auth';
import { AuthContext } from '../App';

/**
 * Apple Sign In Button Component
 */
const AppleSignInButton = ({ onSuccess, onError, className }) => {
  const [loading, setLoading] = useState(false);
  const { setIsLoggedIn, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { user, error } = await signInWithApple();
      
      if (error) {
        console.error('Apple Sign In Error:', error);
        if (onError) onError(error.code || error);
        return;
      }
      
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        if (onSuccess) {
          onSuccess(user);
        } else {
          navigate('/studio');
        }
      }
    } catch (error) {
      console.error('Apple Sign In Error:', error);
      if (onError) onError(error.code || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`flex items-center justify-center bg-white text-black font-medium py-2 px-4 rounded-md shadow-md hover:bg-gray-100 ${className}`}
      onClick={handleSignIn}
      disabled={loading}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )}
      {loading ? 'Signing in...' : 'Sign in with Apple'}
    </button>
  );
};

export default AppleSignInButton; 