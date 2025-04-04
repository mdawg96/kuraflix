import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';

const UsernameSetupModal = ({ user, onComplete, onCancel }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Update the user's profile with the new username
      await updateProfile(user, {
        displayName: username
      });
      
      onComplete(username);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-white mb-4">Complete Your Profile</h2>
        <p className="text-gray-300 mb-4">
          Please choose a username for your account. This will be how other users see you.
        </p>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Choose a username"
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800"
              disabled={loading}
            >
              Skip
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Username'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsernameSetupModal; 