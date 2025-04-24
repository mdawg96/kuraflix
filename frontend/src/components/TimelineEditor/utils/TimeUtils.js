// Time formatting utilities for TimelineEditor

/**
 * Formats a time value in seconds to a MM:SS:MS format
 * @param {number} seconds - Time value in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return "00:00:00"; // Return default formatted time if invalid
  }
  
  // Ensure seconds is a valid number
  const validSeconds = Math.max(0, Number(seconds));
  
  const mins = Math.floor(validSeconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(validSeconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((validSeconds % 1) * 100).toString().padStart(2, '0');
  return `${mins}:${secs}:${ms}`;
}; 