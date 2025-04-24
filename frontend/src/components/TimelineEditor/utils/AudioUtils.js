// Audio utility functions for TimelineEditor

// Jamendo helper functions
export const isJamendoUrl = (url) => {
  return url && typeof url === 'string' && url.includes('jamendo.com');
};

// Default Jamendo tracks to use as replacements
export const getJamendoReplacement = () => {
  const jamendoTracks = [
    'https://mp3d.jamendo.com/download/track/1884527/mp32',  // "Epic Cinematic" by Alexander Nakarada
    'https://mp3d.jamendo.com/download/track/1219978/mp32',  // "Distant Lands" by Borrtex
    'https://mp3d.jamendo.com/download/track/1219500/mp32'   // "Dawn" by Borrtex
  ];
  
  return jamendoTracks[Math.floor(Math.random() * jamendoTracks.length)];
};

// Helper function to safely play audio and handle AbortError
export const safePlayAudio = async (audioElement) => {
  if (!audioElement || !audioElement.play) return Promise.reject(new Error("Invalid audio element"));
  
  // Only attempt to play if the audio is paused
  if (audioElement.paused) {
    try {
      // Add a small delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 10));
      return await audioElement.play();
    } catch (error) {
      // Handle AbortError gracefully - it happens when play is interrupted
      if (error.name === 'AbortError') {
        console.log('Audio play aborted - likely due to rapid play/pause calls');
        return Promise.resolve(); // Resolve gracefully for AbortError
      }
      // Re-throw other errors
      return Promise.reject(error);
    }
  }
  return Promise.resolve(); // Already playing, no need to call play again
}; 