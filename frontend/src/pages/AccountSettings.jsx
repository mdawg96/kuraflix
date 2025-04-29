import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../firebase/auth';
import { deleteUser, updateEmail, updateProfile, sendEmailVerification, EmailAuthProvider, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const AccountSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser, reloadUser } = useAuth();
  const navigate = useNavigate();
  
  // User info states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Mode states
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Load current user details when component mounts
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Function to update profile information
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!displayName.trim()) {
        throw new Error('Display name cannot be empty');
      }
      
      await updateProfile(currentUser, {
        displayName: displayName.trim()
      });
      
      // Reload user to get updated info
      await reloadUser();
      
      setSuccess('Profile updated successfully');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update email
  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Email validation
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // If email hasn't changed, don't proceed
      if (email === currentUser.email) {
        setChangingEmail(false);
        setLoading(false);
        return;
      }
      
      // Reauthenticate user before changing email
      if (!currentPassword) {
        throw new Error('Please enter your current password to verify your identity');
      }
      
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update email
      await updateEmail(currentUser, email);
      
      // Send verification email
      await sendEmailVerification(currentUser);
      
      // Reload user to get updated info
      await reloadUser();
      
      setSuccess('Email updated successfully. Please check your inbox to verify your new email address.');
      setChangingEmail(false);
      setCurrentPassword('');
    } catch (error) {
      console.error('Error updating email:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use by another account.');
      } else {
        setError('Failed to update email: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Function to change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate passwords
      if (!currentPassword) {
        throw new Error('Please enter your current password');
      }
      
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await firebaseUpdatePassword(currentUser, newPassword);
      
      setSuccess('Password updated successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Incorrect current password. Please try again.');
      } else {
        setError('Failed to change password: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // Ask for password to re-authenticate before deletion
      const password = prompt('Please enter your password to confirm account deletion:');
      if (!password) {
        setLoading(false);
        return;
      }
      
      // Create credential with user's email and password
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      
      // Re-authenticate
      await reauthenticateWithCredential(currentUser, credential);
      
      // For all providers, we can delete directly
      await deleteUser(currentUser);
      
      // Log out (Firebase auth state will update automatically)
      await logOut();
      navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
    } catch (error) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Incorrect password. Unable to delete account.');
      } else {
        setError('Failed to delete account: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out: ' + error.message);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold text-white mb-2">Not Logged In</h2>
          <p className="text-gray-400 mb-4">Please log in to access account settings</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
      
      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md text-sm mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500 text-white p-3 rounded-md text-sm mb-4">
          {success}
        </div>
      )}
      
      {/* Profile Information */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-white">Profile Information</h3>
          {!editingProfile && (
            <button 
              onClick={() => {
                setEditingProfile(true);
                setChangingEmail(false);
                setChangingPassword(false);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Edit
            </button>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-md">
          {editingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your display name"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setDisplayName(currentUser.displayName || '');
                  }}
                  className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 rounded text-white hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0] || '?'}
                </span>
              </div>
              <div className="ml-4">
                <p className="text-white font-medium">
                  {currentUser?.displayName || 'No display name'}
                </p>
                <p className="text-gray-400 text-sm flex items-center">
                  {currentUser?.email}
                  {currentUser?.emailVerified ? (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-900 text-green-200 rounded-full flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-900 text-yellow-200 rounded-full">Not Verified</span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-700 mt-4 pt-4 text-sm text-gray-400">
            <div className="mb-2">
              <span className="font-medium text-gray-300">Account Type:</span> {currentUser?.providerData?.[0]?.providerId || 'Unknown provider'}
            </div>
            <div className="mb-2">
              <span className="font-medium text-gray-300">Account Created:</span> {currentUser?.metadata?.creationTime ? new Date(currentUser.metadata.creationTime).toLocaleDateString() : 'Unknown'}
            </div>
            <div>
              <span className="font-medium text-gray-300">Last Sign In:</span> {currentUser?.metadata?.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 'Unknown'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Settings */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-white">Email Settings</h3>
          {!changingEmail && (
            <button 
              onClick={() => {
                setChangingEmail(true);
                setEditingProfile(false);
                setChangingPassword(false);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Change Email
            </button>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-md">
          {changingEmail ? (
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  New Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your-email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Current Password (to verify identity)
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your current password"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setChangingEmail(false);
                    setEmail(currentUser.email || '');
                    setCurrentPassword('');
                  }}
                  className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 rounded text-white hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white mb-1">Your Email</div>
                  <div className="text-gray-400">{currentUser?.email}</div>
                </div>
                {!currentUser?.emailVerified && (
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        await sendEmailVerification(currentUser);
                        setSuccess('Verification email sent. Please check your inbox.');
                      } catch (error) {
                        setError('Failed to send verification email: ' + error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1 bg-yellow-600 rounded text-white text-xs hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Verify Email'}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your email is used for login and account recovery.
                {!currentUser?.emailVerified && " Please verify your email to fully secure your account."}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Password Settings */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-white">Password Settings</h3>
          {!changingPassword && (
            <button 
              onClick={() => {
                setChangingPassword(true);
                setEditingProfile(false);
                setChangingEmail(false);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Change Password
            </button>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded-md">
          {changingPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPasswordForChange" className="block text-sm font-medium text-gray-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPasswordForChange"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your current password"
                />
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="New password (min 6 characters)"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-3 py-1 border border-gray-600 rounded text-gray-300 hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 rounded text-white hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col">
              <div className="text-gray-400 text-sm">
                Password last changed: <span className="text-white">Unknown</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use a strong, unique password for your account to prevent unauthorized access.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Account Actions */}
      <div className="border-t border-gray-700 pt-6 mb-6">
        <h3 className="text-lg font-medium text-white mb-3">Account Actions</h3>
        
        <div className="space-y-3">
          <div className="bg-gray-800 p-4 rounded-md flex justify-between items-center">
            <div>
              <div className="text-white">Sign Out</div>
              <p className="text-xs text-gray-400">Log out of your account</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Sign Out
            </button>
          </div>
          
          <div className="bg-red-900 bg-opacity-30 p-4 rounded-md">
            <h4 className="text-red-300 font-medium mb-2">Danger Zone</h4>
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
      </div>
    </div>
  );
};

export default AccountSettings; 