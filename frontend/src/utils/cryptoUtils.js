/**
 * Utility functions for cryptographic operations needed for Apple Sign In
 */

/**
 * Generates a random string for use as a nonce
 * @param {number} length - Length of the random string
 * @returns {string} - Random string
 */
export const generateRandomString = (length = 32) => {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  let result = '';
  
  // Use crypto.getRandomValues for cryptographically secure random values
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
};

/**
 * Hashes a string using SHA-256
 * @param {string} input - String to hash
 * @returns {Promise<string>} - SHA-256 hash as a hex string
 */
export const sha256 = async (input) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}; 