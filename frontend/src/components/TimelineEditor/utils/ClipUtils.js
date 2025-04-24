// Utility functions for manipulating timeline clips

/**
 * Enforce a 2-minute limit on clip positioning and length
 * @param {Object} clip - The clip to check
 * @returns {Object} The clip with enforced limits
 */
export const enforce2MinuteLimit = (clip) => {
  if (!clip) return clip;
  
  // Create a copy to avoid modifying the original
  const updatedClip = { ...clip };
  
  // Maximum timeline duration is 2 minutes (120 seconds)
  const MAX_DURATION = 120;
  
  // Ensure startTime is within bounds (0 to MAX_DURATION)
  updatedClip.startTime = Math.max(0, Math.min(updatedClip.startTime, MAX_DURATION));
  
  // Ensure endTime is within bounds (startTime to MAX_DURATION)
  updatedClip.endTime = Math.max(
    updatedClip.startTime, 
    Math.min(updatedClip.endTime, MAX_DURATION)
  );
  
  return updatedClip;
};

/**
 * Check if two clips overlap
 * @param {Object} a - First clip
 * @param {Object} b - Second clip
 * @returns {boolean} True if clips overlap
 */
export const checkOverlap = (a, b) => {
  // No overlap if clips are on different tracks
  if (a.type !== b.type) return false;
  
  // Check for overlap
  return (a.startTime < b.endTime && a.endTime > b.startTime);
};

/**
 * Find the currently playing clip based on time
 * @param {Array} clips - Array of all clips
 * @param {number} currentTime - Current playback time
 * @returns {Object|null} The current clip or null
 */
export const getCurrentClip = (clips, currentTime) => {
  if (!clips || !clips.length) return null;
  
  // Try to find a clip at the current time
  for (const clip of clips) {
    if (currentTime >= clip.startTime && currentTime < clip.endTime) {
      return clip;
    }
  }
  
  return null;
};

/**
 * Independent clip update that doesn't reposition other clips
 * @param {Array} clips - Array of clip objects 
 * @param {Object} updatedClip - The clip that was modified
 * @returns {Array} - New array of clips with only the updated clip modified
 */
export const updateClipPosition = (clips, updatedClip) => {
  // If we don't have clips or an updated clip, return original array
  if (!clips || !updatedClip) return clips;
  
  // Create a deep copy of the clips array
  const newClips = JSON.parse(JSON.stringify(clips));
  
  // Find the index of the updated clip
  const updatedIndex = newClips.findIndex(clip => clip.id === updatedClip.id);
  
  // If the clip doesn't exist in the array, add it
  if (updatedIndex === -1) {
    newClips.push(updatedClip);
    return newClips;
  }
  
  // Only update the specific clip, leave all others unchanged
  newClips[updatedIndex] = updatedClip;
  
  return newClips;
};

/**
 * Calculates the duration of a clip
 * @param {Object} clip - The clip to calculate duration for
 * @returns {number} - The duration in seconds
 */
export const getClipDuration = (clip) => {
  if (!clip) return 0;
  return clip.endTime - clip.startTime;
};

/**
 * Gets the total timeline duration based on all clips
 * @param {Array} clips - Array of clip objects
 * @returns {number} - The total duration in seconds
 */
export const getTimelineDuration = (clips) => {
  if (!clips || clips.length === 0) return 0;
  
  // Find the clip with the latest end time
  let maxEndTime = 0;
  clips.forEach(clip => {
    if (clip.endTime > maxEndTime) {
      maxEndTime = clip.endTime;
    }
  });
  
  return maxEndTime;
};

/**
 * Repositions clips to avoid overlap while respecting user-defined positions
 * @param {Array} clips - Array of clip objects 
 * @param {Object} updatedClip - The clip that was modified
 * @returns {Array} - New array of clips with adjusted positions
 */
export const repositionClips = (clips, updatedClip) => {
  // We'll now just call updateClipPosition to prevent automatic repositioning
  return updateClipPosition(clips, updatedClip);
}; 