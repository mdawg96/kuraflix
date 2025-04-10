import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../firebase/auth';
import { deleteUser } from 'firebase/auth';

const AccountSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // For all providers, we can delete directly
      await deleteUser(currentUser);
      
      // Log out (Firebase auth state will update automatically)
      await logOut();
      navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
    } catch (error) {
      console.error('Error deleting account:', error);
      setError('Failed to delete account: ' + error.message);
    } finally {
      setLoading(false);
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