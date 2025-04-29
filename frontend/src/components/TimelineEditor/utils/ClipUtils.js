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

/**
 * Mark a clip as finalized for timeline persistence
 * This ensures only clips added to the timeline get saved to Firebase
 * @param {Object} clip - The clip to finalize
 * @returns {Object} - The finalized clip
 */
export const finalizeClipForTimeline = (clip) => {
  if (!clip) return null;
  
  // Create a copy to avoid modifying the original
  const finalizedClip = { ...clip };
  
  // Mark clip as finalized for timeline and not a draft
  finalizedClip.finalized = true;
  finalizedClip.draft = false;
  
  // Ensure it has required properties for the timeline
  if (finalizedClip.startTime === undefined) finalizedClip.startTime = 0;
  if (finalizedClip.endTime === undefined) {
    // Default to 5 seconds if no duration is specified
    finalizedClip.endTime = finalizedClip.startTime + (finalizedClip.duration || 5);
  }
  
  // Ensure proper formatting based on clip type
  if (clip.type === 'sound') {
    // Ensure sound clips have required fields
    finalizedClip.soundUrl = finalizedClip.soundUrl || finalizedClip.url || '';
    finalizedClip.title = finalizedClip.title || 'Sound Clip';
    finalizedClip.source = finalizedClip.source || 'user';
    
    // Ensure duration is correctly set
    if (finalizedClip.endTime && finalizedClip.startTime) {
      finalizedClip.duration = finalizedClip.endTime - finalizedClip.startTime;
    } else if (finalizedClip.duration && finalizedClip.startTime) {
      finalizedClip.endTime = finalizedClip.startTime + finalizedClip.duration;
    }
  } else if (clip.type === 'narration') {
    // Ensure narration clips have all required fields
    finalizedClip.narrationText = finalizedClip.narrationText || '';
    finalizedClip.narrationUrl = finalizedClip.narrationUrl || '';
    finalizedClip.narrationVoice = finalizedClip.narrationVoice || 'alloy';
  } else if (clip.type === 'static' || clip.type === 'video') {
    // Ensure image/video clips have required fields
    finalizedClip.image = finalizedClip.image || '';
  }
  
  return finalizedClip;
};

/**
 * Filter out draft clips that should not be saved to Firebase
 * @param {Array} clips - Array of all clips
 * @returns {Array} - Array of only finalized clips to save
 */
export const getClipsForSaving = (clips) => {
  if (!clips || !Array.isArray(clips)) {
    console.error("Invalid clips array provided to getClipsForSaving:", clips);
    return [];
  }
  
  // Filter out any draft clips that shouldn't be saved
  return clips.filter(clip => {
    // Skip clips explicitly marked as drafts
    if (clip.draft === true) {
      console.log(`Clip ${clip.id} filtered out: marked as draft`);
      return false;
    }
    
    // Keep all non-draft clips
    return true;
  }).map(clip => finalizeClipForTimeline(clip));
}; 