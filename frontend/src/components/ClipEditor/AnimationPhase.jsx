import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const AnimationPhase = ({
  selectedClip,
  isAnimating,
  animationProgress,
  animationPrompt,
  setEditorPhase,
  updateClipProperty,
  onUpdateClip,
  autoPlayPreview = false // Default to not auto-play
}) => {
  const videoRef = useRef(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0); // Initialize to 0, will be set when video loads
  const [isPlaying, setIsPlaying] = useState(false); // Start paused by default
  const [videoStatus, setVideoStatus] = useState("loading"); // "loading", "error", "ready"
  const [processedUrl, setProcessedUrl] = useState(null); // Keep track of processed URL to prevent reloading
  const [loadAttempts, setLoadAttempts] = useState(0); // Track load attempts
  const initialUrlProcessed = useRef(false); // Track if we've processed the URL already
  const MAX_DURATION = 5; // Define a constant for maximum duration

  // Additional useEffect to handle initial playback state
  useEffect(() => {
    // Ensure we start paused unless autoPlayPreview is true
    setIsPlaying(autoPlayPreview);
  }, [autoPlayPreview]);

  // Stable function to process URLs
  const getVideoUrl = useCallback((url) => {
    if (!url) {
      console.error("No URL provided to getVideoUrl");
      return null;
    }
    
    console.log("Processing video URL:", url);
    
    // Strip any existing cache busting parameters
    const cleanUrl = url.replace(/[?&]cb=\d+/, '');
    
    // Add cache-busting parameter to prevent browser caching
    const cacheBuster = `?cb=${Date.now()}`;
    
    // Get API base URL from environment or use default
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    
    // If it's a data URL, return it directly
    if (cleanUrl.startsWith('data:')) {
      return cleanUrl;
    }
    
    // For external URLs (not from our origin), use the proxy
    if (cleanUrl.startsWith('http') && !cleanUrl.startsWith(window.location.origin) && !cleanUrl.includes('/api/proxy-')) {
      const proxyUrl = `${apiBaseUrl}/api/proxy-media?url=${encodeURIComponent(cleanUrl)}${cacheBuster}`;
      console.log("Using proxy for external video URL:", proxyUrl);
      return proxyUrl;
    }
    
    // If it's already a full URL, return it with cache buster
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      // Add cache buster only if there's no query param already
      const fullUrl = cleanUrl.includes('?') ? `${cleanUrl}&cb=${Date.now()}` : `${cleanUrl}${cacheBuster}`;
      console.log("Using full URL:", fullUrl);
      return fullUrl;
    }
    
    // If it's just a filename like 'animation_1234567890.mp4'
    if (cleanUrl.match(/^animation_[0-9]+\.mp4$/)) {
      const fullUrl = `${apiBaseUrl}/outputs/${cleanUrl}${cacheBuster}`;
      console.log("Using animation filename URL:", fullUrl);
      return fullUrl;
    }
    
    // If animation_*.mp4 is in the URL but doesn't have proper prefix
    if (cleanUrl.includes('animation_') && cleanUrl.includes('.mp4')) {
      // Extract filename
      const fileNameMatch = cleanUrl.match(/animation_[0-9]+\.mp4/);
      if (fileNameMatch) {
        const fileName = fileNameMatch[0];
        console.log("Extracted animation filename:", fileName);
        const fullUrl = `${apiBaseUrl}/outputs/${fileName}${cacheBuster}`;
        console.log("Using extracted filename URL:", fullUrl);
        return fullUrl;
      }
    }
    
    // If URL includes /outputs/, prefix it with the server address
    if (cleanUrl.includes('/outputs/')) {
      const fullUrl = `${apiBaseUrl}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}${cacheBuster}`;
      console.log("Using outputs path URL:", fullUrl);
      return fullUrl;
    }
    
    // Default case: add server prefix
    const fullUrl = `${apiBaseUrl}/${cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl}${cacheBuster}`;
    console.log("Using default prefix URL:", fullUrl);
    return fullUrl;
  }, []);

  // Initialize the video URL - only runs ONCE when component mounts or clip changes
  useEffect(() => {
    // Skip if we already have a processed URL (this prevents reinitializing on hot reload)
    if (processedUrl) {
      console.log("Skipping URL initialization - already have a processed URL:", processedUrl);
      return;
    }
    
    // Prevent duplicate initialization
    if (initialUrlProcessed.current) {
      console.log("Skipping URL initialization - already processed this clip");
      return;
    }
    
    console.log("Initializing URL for clip:", selectedClip.id);
    
    // 1. Try to use the clip's animation URL first
    if (selectedClip.animationUrl) {
      const processedAnimationUrl = getVideoUrl(selectedClip.animationUrl);
      console.log("Using clip's animation URL:", processedAnimationUrl);
      setProcessedUrl(processedAnimationUrl);
      setVideoStatus("loading");
      initialUrlProcessed.current = true;
      return;
    }
    
    // 2. Try window cache
    if (window.clipAnimationUrls?.[selectedClip.id]) {
      const cachedUrl = getVideoUrl(window.clipAnimationUrls[selectedClip.id]);
      console.log("Using window cache URL:", cachedUrl);
      setProcessedUrl(cachedUrl);
      setVideoStatus("loading");
      
      // Also update the clip itself for persistence
      updateClipProperty('animationUrl', window.clipAnimationUrls[selectedClip.id]);
      updateClipProperty('animated', true);
      
      initialUrlProcessed.current = true;
      return;
    }
    
    // 3. Try localStorage
    try {
      const savedClipId = localStorage.getItem('lastClipId');
      const savedUrl = localStorage.getItem('lastAnimationUrl');
      
      if (savedClipId === selectedClip.id && savedUrl) {
        const localStorageUrl = getVideoUrl(savedUrl);
        console.log("Using localStorage URL:", localStorageUrl);
        setProcessedUrl(localStorageUrl);
        setVideoStatus("loading");
        
        // Also update the clip itself for persistence
        updateClipProperty('animationUrl', savedUrl);
        updateClipProperty('animated', true);
        
        initialUrlProcessed.current = true;
        return;
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }
    
    // 4. Try to infer a URL from the clip ID
    const timestampMatch = selectedClip.id.match(/clip-([0-9]+)/);
    if (timestampMatch && timestampMatch[1]) {
      const inferredUrl = getVideoUrl(`animation_${timestampMatch[1]}.mp4`);
      console.log("Trying inferred URL based on clip ID:", inferredUrl);
      setProcessedUrl(inferredUrl);
      setVideoStatus("loading");
      initialUrlProcessed.current = true;
      return;
    }
    
    // If we reach here, we couldn't find a valid URL
    console.log("No video URL found for clip:", selectedClip.id);
    initialUrlProcessed.current = true;
  }, [selectedClip.id, selectedClip.animationUrl, getVideoUrl, updateClipProperty, processedUrl]);

  // Reset initialization flag when clip changes or component unmounts
  useEffect(() => {
    const currentClipId = selectedClip.id;
    
    return () => {
      // Only reset if the clip ID changes
      if (currentClipId !== selectedClip.id) {
        console.log("Clip ID changed, resetting initialization flag");
        initialUrlProcessed.current = false;
        setProcessedUrl(null); // Also reset processed URL
      }
    };
  }, [selectedClip.id]);

  // Cache the current URL in global storage
  useEffect(() => {
    if (processedUrl && selectedClip.id) {
      // Extract base URL without cache parameters for storage
      const baseUrl = processedUrl.replace(/[?&]cb=\d+/, '');
      
      // Store in window cache
      try {
        if (!window.clipAnimationUrls) {
          window.clipAnimationUrls = {};
        }
        window.clipAnimationUrls[selectedClip.id] = baseUrl;
      } catch (err) {
        console.error("Failed to cache animation URL:", err);
      }
    }
  }, [processedUrl, selectedClip.id]);

  // Modified: Update current time while video plays
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Initial play attempt when video is first mounted
    const attemptInitialPlay = () => {
      if (isPlaying && videoStatus === "ready") {
        console.log("Attempting initial play");
        video.play().catch(err => {
          console.error("Error during initial play:", err);
        });
      }
    };

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      
      // If we're getting time updates, the video is definitely ready
      // Important fix: Always set status to ready when time is updating
      if (video.currentTime > 0) {
        console.log("Video is playing with currentTime:", video.currentTime);
        setVideoStatus("ready");
      }
      
      // Loop the video between trim points
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
    };

    const handleMetadata = () => {
      console.log("Video metadata loaded, duration:", video.duration);
      // Fix for videos reporting zero or NaN duration
      if (video.duration && !isNaN(video.duration) && video.duration > 0) {
        setVideoDuration(video.duration);
        // Initialize the trimEnd to the actual video duration, but cap at MAX_DURATION
        const actualEnd = Math.min(video.duration, MAX_DURATION);
        setTrimEnd(actualEnd);
        console.log(`Setting initial trimEnd to ${actualEnd} seconds (min of duration or MAX_DURATION)`);
      } else {
        console.warn("Video reported invalid duration:", video.duration);
        // Set a fallback duration
        setVideoDuration(MAX_DURATION);
        setTrimEnd(MAX_DURATION);
      }
      
      // Important fix: Set to ready when metadata is loaded
      setVideoStatus("ready");
      console.log("Video status set to ready on metadata load");
    };
    
    const handleError = (e) => {
      console.error('Video event error:', e);
      setVideoStatus("error");
    };
    
    const handleLoadedData = () => {
      console.log("Video data loaded successfully");
      setVideoStatus("ready");
      setLoadAttempts(0); // Reset load attempts on successful load
      
      // Force a currentTime update after load
      setCurrentTime(video.currentTime);
      
      // Attempt to play after load
      attemptInitialPlay();
    };
    
    const handlePlay = () => {
      console.log("Video playback started");
      // Only update state if it's different to prevent cycles
      if (!isPlaying) {
        setIsPlaying(true);
      }
      // Set video status to ready when playing starts
      if (videoStatus !== "ready") {
        setVideoStatus("ready");
      }
    };
    
    const handlePause = () => {
      console.log("Video playback paused");
      // Only update state if it's different to prevent cycles
      if (isPlaying) {
        setIsPlaying(false);
      }
    };

    // Listen for all relevant events
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    // Try initial play
    attemptInitialPlay();

    return () => {
      // Clean up all event listeners
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [trimStart, trimEnd, videoStatus, isPlaying]);

  // Extra check for video duration after component mounts
  useEffect(() => {
    if (videoRef.current && videoStatus === "ready") {
      const video = videoRef.current;
      console.log("Debug - Current videoDuration state:", videoDuration);
      console.log("Debug - Current actual video.duration:", video.duration);
      
      // Force update of video duration regardless of previous value
      if (video.duration && !isNaN(video.duration)) {
        console.log("Force updating videoDuration to", video.duration);
        setVideoDuration(video.duration);
        
        // Also ensure trimEnd is within bounds
        if (trimEnd > video.duration) {
          const newTrimEnd = Math.min(video.duration, MAX_DURATION);
          console.log("Correcting trimEnd from", trimEnd, "to", newTrimEnd);
          setTrimEnd(newTrimEnd);
        }
      }
    }
  }, [videoStatus]);  // Remove videoDuration from dependency array to prevent loops

  // Update clip with trim values
  const confirmTrimming = () => {
    if (!videoRef.current) {
      console.error("Video reference not available");
      return;
    }
    
    // Get current trim values
    const trimStart = currentTrimStart !== null ? currentTrimStart : defaultTrimStart;
    const trimEnd = currentTrimEnd !== null ? currentTrimEnd : defaultTrimEnd;
    
    // Calculate duration
    const duration = trimEnd - trimStart;
    console.log(`Animation duration after trimming: ${duration.toFixed(2)}s`);
    
    if (duration < 0.5) {
      toast.error("Animation must be at least 0.5 seconds long");
      return;
    }
    
    // Update the clip with trim values and other required properties
    const updatedClip = {
      ...selectedClip,
      trimStart,
      trimEnd,
      animationDuration: duration,
      // Add explicit flags to indicate this is ready for the timeline
      confirmedAnimation: true,
      draft: false, // Explicitly mark as not a draft to add to timeline
      type: 'video',  // Explicitly set as video type for the timeline
      animated: true, // Mark as animated for the timeline
      positionSet: false, // Mark that this clip needs positioning
    };
    
    // Apply the update through the parent component
    onUpdateClip(updatedClip);
    
    // Give feedback to the user
    toast.success(`Animation trimmed and added to timeline (${duration.toFixed(1)}s)`);
    
    // Reset the trimming UI
    setIsTrimming(false);
    setCurrentTrimStart(null);
    setCurrentTrimEnd(null);
  };

  // Play/pause toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    // Update state first
    const newPlayState = !isPlaying;
    setIsPlaying(newPlayState);
    
    // Then update the video element accordingly
    if (newPlayState) {
      video.play().catch(err => {
        console.error("Error playing video:", err);
        toast.error("Failed to play video");
        // Reset state if play fails
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  };

  // Format time display (seconds to MM:SS)
  const formatTime = (timeInSeconds) => {
    if (timeInSeconds === undefined || timeInSeconds === null || isNaN(timeInSeconds) || timeInSeconds <= 0) {
      console.log("formatTime received invalid value:", timeInSeconds);
      return "0:00"; // Return default for invalid input
    }
    
    // Ensure it's a finite number and cap it for sanity
    const validTime = Math.min(Math.max(0, timeInSeconds), 300); // Cap at 5 minutes
    console.log("formatTime processing:", timeInSeconds, "->", validTime);
    
    const minutes = Math.floor(validTime / 60);
    const seconds = Math.floor(validTime % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle video loading errors with retry logic
  const handleVideoError = (e) => {
    console.error("Video loading error:", e);
    // Log more details about the error if available
    if (e.target && e.target.error) {
      console.error("Video error code:", e.target.error.code);
      console.error("Video error message:", e.target.error.message);
    }
    
    setVideoStatus("error");
    
    // Try to diagnose the issue
    const video = videoRef.current;
    if (video) {
      // Check network state
      const networkState = video.networkState;
      const networkStates = ["NETWORK_EMPTY", "NETWORK_IDLE", "NETWORK_LOADING", "NETWORK_NO_SOURCE"];
      console.log("Video network state:", networkStates[networkState] || networkState);
      
      // Check ready state
      const readyState = video.readyState;
      const readyStates = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"];
      console.log("Video ready state:", readyStates[readyState] || readyState);
    }
    
    // Check if the error is a CORS error (often doesn't provide much detail)
    if (e.target && e.target.error && e.target.error.code === 4) {
      console.error("Possible CORS error detected");
      toast.error("CORS error: Please check server configuration");
    }
    
    // Cap retries at 3 attempts
    if (loadAttempts >= 3) {
      console.error("Exceeded maximum retry attempts");
      toast.error("Failed to load video after multiple attempts");
      return;
    }
    
    // Incremental backoff for retries
    const delay = 1000 * (loadAttempts + 1);
    
    // Try to recover with a reload
    setTimeout(() => {
      if (videoRef.current && processedUrl) {
        console.log(`Retrying video load (attempt ${loadAttempts + 1}) with URL: ${processedUrl}`);
        setLoadAttempts(prev => prev + 1);
        setVideoStatus("loading");
        
        // More thorough reset sequence
        // First pause the video
        videoRef.current.pause();
        
        // Remove the source attribute completely
        videoRef.current.removeAttribute('src');
        
        // Empty source buffers and reset the element
        videoRef.current.load();
        
        // After a short delay, set the new source
        setTimeout(() => {
          // Double check that element still exists
          if (videoRef.current) {
            videoRef.current.src = processedUrl;
            videoRef.current.load();
            // Try to play automatically after loading
            videoRef.current.play().catch(err => {
              console.log("Could not autoplay after recovery:", err);
            });
          }
        }, 200);
      }
    }, delay);
  };

  // Add a similar pattern to the "Try Again" button handler
  const retryVideoLoad = () => {
    if (!processedUrl) return;
    
    setVideoStatus("loading");
    setLoadAttempts(0);
    
    // Use the same thorough reset sequence
    if (videoRef.current) {
      // First pause the video
      videoRef.current.pause();
      
      // Remove the source attribute completely
      videoRef.current.removeAttribute('src');
      
      // Empty source buffers and reset the element
      videoRef.current.load();
      
      // After a short delay, set the new source
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = processedUrl;
          videoRef.current.load();
          // Try to play automatically
          videoRef.current.play().catch(err => {
            console.log("Could not autoplay after manual retry:", err);
          });
        }
      }, 200);
    }
  };

  // Force update time display
  useEffect(() => {
    // If we have a loaded video but time display is zero, force an update
    const checkAndUpdateTime = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && videoStatus === "ready") {
        // Video is loaded but time might not be updating
        if (currentTime === 0 && video.currentTime > 0) {
          console.log("Forcing time display update from:", currentTime, "to", video.currentTime);
          setCurrentTime(video.currentTime);
        }
        
        // Also update duration if needed
        if (videoDuration === 0 && video.duration > 0) {
          console.log("Forcing duration update from:", videoDuration, "to", video.duration);
          setVideoDuration(video.duration);
        }
      }
    };
    
    // Set an interval to check periodically
    const timeUpdateInterval = setInterval(checkAndUpdateTime, 500);
    
    return () => {
      clearInterval(timeUpdateInterval);
    };
  }, [currentTime, videoDuration, videoStatus]);

  // Update the video's onLoadedData event to respect autoPlayPreview
  const handleVideoLoaded = () => {
    // When video data is loaded, immediately check and update the duration
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration) && video.duration > 0) {
      console.log("LoadedData: setting duration to", video.duration);
      setVideoDuration(video.duration);
      
      // Also update the trim end to match the video duration
      const newTrimEnd = Math.min(video.duration, MAX_DURATION);
      console.log("LoadedData: setting trimEnd to", newTrimEnd);
      setTrimEnd(newTrimEnd);
    }
    
    // Always set to ready on loadeddata
    console.log("Video loaded data - setting to ready");
    setVideoStatus("ready");
    
    // Hide loading indicator
    const loadingIndicator = document.querySelector('.video-loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Only autoplay if explicitly requested
    if (autoPlayPreview && video) {
      video.play().catch(error => {
        console.log("Could not autoplay video:", error);
        setIsPlaying(false);
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Animation Preview</h3>
        {isAnimating ? (
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Generating animation with Runway...</span>
              <span className="text-gray-400">{animationProgress}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${animationProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            {/* Video container - takes 2/3 of space on larger screens */}
            <div className="bg-gray-900 p-4 rounded-lg relative md:w-2/3">
              {selectedClip.animationUrl ? (
                <div className="video-container relative">
                  {/* Only show loading indicator when status is loading */}
                  {videoStatus === "loading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10 video-loading-indicator">
                      <div className="text-white flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading video...</span>
                      </div>
                    </div>
                  )}
                  
                  {processedUrl && (
                    <video
                      key={processedUrl} // Add key prop to force remount when URL changes
                      ref={videoRef}
                      src={processedUrl}
                      autoPlay={false} // Explicitly set to false
                      loop
                      muted
                      playsInline
                      className="w-full object-contain rounded-lg"
                      controls={false}
                      onError={handleVideoError}
                      onTimeUpdate={() => {
                        // Make sure time gets updated
                        const video = videoRef.current;
                        if (video) {
                          setCurrentTime(video.currentTime);
                          // Always set to ready if we're getting time updates
                          if (video.currentTime > 0) {
                            setVideoStatus("ready");
                            const loadingIndicator = document.querySelector('.video-loading-indicator');
                            if (loadingIndicator) {
                              loadingIndicator.style.display = 'none';
                            }
                          }
                          
                          // Also update duration if needed - this helps fix duration issues
                          if (video.duration && !isNaN(video.duration) && video.duration > 0) {
                            // Force update duration on every frame
                            if (Math.abs(videoDuration - video.duration) > 0.1) {
                              console.log("TimeUpdate: updating duration from", videoDuration, "to", video.duration);
                              setVideoDuration(video.duration);
                            }
                          }
                        }
                      }}
                      onLoadedData={handleVideoLoaded}
                      onDurationChange={() => {
                        // This event fires when the duration property changes
                        const video = videoRef.current;
                        if (video && video.duration > 0) {
                          console.log("DurationChange: setting duration to", video.duration);
                          setVideoDuration(video.duration);
                        }
                      }}
                      crossOrigin="anonymous" // Add crossOrigin attribute for CORS requests
                    />
                  )}
                  
                  {videoStatus === "error" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10">
                      <div className="text-white flex flex-col items-center p-4 bg-red-900 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-center">Video loading error</span>
                        <div className="mt-2 text-xs text-gray-300 max-w-xs truncate">
                          URL: {processedUrl}
                        </div>
                        <button 
                          className="mt-3 px-4 py-1 bg-blue-600 rounded-md text-sm"
                          onClick={retryVideoLoad}
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Video controls - always shown */}
                  <div className="flex items-center justify-center mt-4">
                    <button
                      onClick={togglePlayPause}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full mr-3"
                      disabled={videoStatus !== "ready" && videoStatus !== "playing"}
                    >
                      {isPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16"></rect>
                          <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      )}
                    </button>
                    <div className="text-white">
                      {formatTime(currentTime)} / {formatTime(videoDuration)}
                    </div>
                  </div>
                  
                  {/* Simple progress bar to show current time visually */}
                  {videoDuration > 0 && (
                    <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-100"
                        style={{ width: `${(currentTime / videoDuration) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Animation not created yet</p>
                </div>
              )}
            </div>

            {/* Trim controls container - takes 1/3 of space on larger screens */}
            {selectedClip.animated && !isAnimating && selectedClip.animationUrl && videoStatus !== "error" && (
              <div className="bg-gray-800 p-4 rounded-lg md:w-1/3 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Trim Animation</h3>
                  <div className="space-y-4">
                    {/* Start time slider */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Start Time: {formatTime(trimStart)}</span>
                        <span>Duration: {formatTime(trimEnd - trimStart)}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={Math.min(videoDuration || 1, MAX_DURATION)} // Cap at MAX_DURATION
                        step="0.05" // Smaller step for finer control
                        value={trimStart}
                        onChange={(e) => {
                          const newStart = parseFloat(e.target.value);
                          // Ensure start is before end with some margin
                          if (newStart < trimEnd - 0.1) { // Smaller minimum gap
                            setTrimStart(newStart);
                            if (videoRef.current) {
                              videoRef.current.currentTime = newStart;
                            }
                          }
                        }}
                        className="w-full accent-blue-600"
                        disabled={videoStatus === "error" || videoStatus === "loading"}
                      />
                    </div>

                    {/* End time slider */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>End Time: {formatTime(trimEnd)}</span>
                        <span>Full Length: {formatTime(Math.min(
                          videoRef.current?.duration || videoDuration, 
                          MAX_DURATION
                        ))}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max={Math.min(videoDuration || 1, MAX_DURATION)} // Cap at MAX_DURATION
                        step="0.05" // Smaller step for finer control
                        value={trimEnd}
                        onChange={(e) => {
                          const newEnd = parseFloat(e.target.value);
                          // Ensure end is after start with some margin
                          if (newEnd > trimStart + 0.1) { // Smaller minimum gap
                            // Enforce maximum duration of MAX_DURATION seconds
                            const maxEnd = trimStart + MAX_DURATION;
                            if (newEnd > maxEnd) {
                              toast.warning(`Maximum clip duration is ${MAX_DURATION} seconds`);
                              setTrimEnd(maxEnd);
                            } else {
                              setTrimEnd(newEnd);
                            }
                          }
                        }}
                        className="w-full accent-blue-600"
                        disabled={videoStatus === "error" || videoStatus === "loading"}
                      />
                    </div>

                    {/* Timeline visualization */}
                    <div className="relative h-8 bg-gray-900 rounded overflow-hidden">
                      {videoDuration > 0 && (
                        <>
                          <div 
                            className="absolute top-0 h-full bg-blue-900 bg-opacity-50" 
                            style={{ 
                              left: `${((trimStart || 0) / Math.min(videoDuration, MAX_DURATION)) * 100}%`,
                              width: `${(((trimEnd || 0) - (trimStart || 0)) / Math.min(videoDuration, MAX_DURATION)) * 100}%`
                            }}
                          ></div>
                          <div 
                            className="absolute top-0 h-full w-1 bg-white" 
                            style={{ 
                              left: `${((currentTime || 0) / Math.min(videoDuration, MAX_DURATION)) * 100}%`
                            }}
                          ></div>
                        </>
                      )}
                    </div>

                    {/* Maximum duration indicator */}
                    <div className="mt-2 text-center text-sm text-gray-400">
                      <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Maximum clip duration: {MAX_DURATION} seconds</span>
                      </div>
                      {trimEnd - trimStart > MAX_DURATION && (
                        <div className="text-red-400 mt-1">
                          Current selection exceeds maximum duration
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confirm button at bottom of trim controls */}
                <div className="mt-4">
                  <button
                    onClick={confirmTrimming}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={videoStatus === "error" || videoStatus === "loading" || (trimEnd - trimStart) > MAX_DURATION}
                  >
                    Add to Timeline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Always show the back button */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setEditorPhase('image')}
          className="text-blue-400 hover:text-blue-300 text-sm"
          disabled={isAnimating}
        >
          ← Back to image editing
        </button>
      </div>
    </div>
  );
};

export default AnimationPhase; 