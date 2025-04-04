import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { revokeAppleTokenAndDeleteAccount } from '../firebase/auth';
import { generateRandomString, sha256 } from '../utils/cryptoUtils';

const AccountSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser, setCurrentUser, setIsLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  const isAppleUser = currentUser?.providerData?.[0]?.providerId === 'apple.com';

  // Get a user-friendly error message
  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/requires-recent-login':
        return 'For security reasons, please log in again before deleting your account.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'The process was cancelled because the popup was closed.';
      case 'auth/operation-not-allowed':
        return 'This operation is not allowed. Please contact support.';
      default:
        return 'An error occurred. Please try again or contact support.';
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true);
      setError('');

      try {
        // Apple users need special handling for token revocation
        if (isAppleUser) {
          // For Apple users, we need to initiate a new Sign In with Apple flow
          // to get a fresh authorization code
          if (window.AppleID) {
            // Generate a nonce
            const nonce = generateRandomString(32);
            const hashedNonce = await sha256(nonce);
            
            // Store the nonce in session storage for verification
            sessionStorage.setItem('appleNonce', nonce);
            
            // Trigger Apple sign-in for token revocation
            window.AppleID.auth.signIn({
              clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
              scope: 'name email',
              redirectURI: window.location.origin + '/apple-auth-callback',
              state: 'delete-account',
              nonce: hashedNonce
            });
            return;
          } else {
            setError('Apple Sign In is not available on this device. Please try using a different device.');
          }
        } else {
          // For other providers, we can delete directly
          await currentUser.delete();
          setCurrentUser(null);
          setIsLoggedIn(false);
          navigate('/');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        setError(getFriendlyErrorMessage(error.code || error.message));
      } finally {
        setLoading(false);
      }
    }
  };

  // This would be called after returning from Apple auth flow
  const handleAppleAuthCallback = async (authorizationCode) => {
    try {
      const { error } = await revokeAppleTokenAndDeleteAccount(authorizationCode);
      if (error) {
        setError(getFriendlyErrorMessage(error.code || error));
        return;
      }
      
      setCurrentUser(null);
      setIsLoggedIn(false);
      navigate('/');
    } catch (error) {
      console.error('Error in Apple callback:', error);
      setError(getFriendlyErrorMessage(error.code || error.message));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Profile Information</h3>
        <div className="bg-gray-800 p-4 rounded-md">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {currentUser?.displayName?.[0] || currentUser?.email?.[0] || '?'}
              </span>
            </div>
            <div className="ml-4">
              <p className="text-white font-medium">
                {currentUser?.displayName || 'No display name'}
              </p>
              <p className="text-gray-400 text-sm">{currentUser?.email}</p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mb-2">
            <span className="font-medium text-gray-300">Account Type:</span> {currentUser?.providerData?.[0]?.providerId || 'Unknown provider'}
          </div>
          
          <div className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Account Created:</span> {currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-6 mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Danger Zone</h3>
        <p className="text-gray-400 text-sm mb-4">
          Deleting your account will permanently remove all your data and cannot be undone.
        </p>
        
        <button
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-red-800 disabled:cursor-not-allowed"
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
};

export default AccountSettings; 