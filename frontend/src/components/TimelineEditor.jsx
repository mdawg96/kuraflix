import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Add a Jamendo-only audio system at the top of the file, outside any component

// Jamendo helper functions
const isJamendoUrl = (url) => {
  return url && typeof url === 'string' && url.includes('jamendo.com');
};

// Default Jamendo tracks to use as replacements
const getJamendoReplacement = () => {
  const jamendoTracks = [
    'https://mp3d.jamendo.com/download/track/1884527/mp32',  // "Epic Cinematic" by Alexander Nakarada
    'https://mp3d.jamendo.com/download/track/1219978/mp32',  // "Distant Lands" by Borrtex
    'https://mp3d.jamendo.com/download/track/1219500/mp32'   // "Dawn" by Borrtex
  ];
  
  return jamendoTracks[Math.floor(Math.random() * jamendoTracks.length)];
};

const TimelineEditor = ({
  scenes,
  currentScene,
  selectedClip,
  onClipClick,
  onAddClip,
  storyTitle,
  setStoryTitle,
  author,
  setAuthor,
  description,
  setDescription,
  onBackToProjects,
  onShowPublishModal,
  onOpenClipEditor,
  onUpdateClip
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragState, setDragState] = useState(null);
  const timelineRef = useRef(null);
  const videoTrackRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  
  // Initialize state for auto-scrolling
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  
  // Add state for position guideline
  const [positionGuide, setPositionGuide] = useState(null);
  
  // Add state for playback error
  const [playbackError, setPlaybackError] = useState(false);
  
  console.log('TimelineEditor - Props check:');
  console.log('- scenes:', scenes);
  console.log('- currentScene:', currentScene);
  console.log('- onAddClip:', typeof onAddClip === 'function' ? 'Function available' : 'Missing');
  console.log('- onUpdateClip:', typeof onUpdateClip === 'function' ? 'Function available' : 'Missing');
  
  // Get clips from the current scene
  const clips = scenes && scenes[currentScene] && Array.isArray(scenes[currentScene].clips) 
    ? scenes[currentScene].clips 
    : [];
  
  // Debug: Check for duplicate clip IDs  
  const clipIds = {};
  const duplicateIds = [];
  clips.forEach(clip => {
    if (clipIds[clip.id]) {
      console.error(`DUPLICATE CLIP ID FOUND: ${clip.id}`, clip);
      duplicateIds.push(clip.id);
      clipIds[clip.id]++;
    } else {
      clipIds[clip.id] = 1;
    }
  });
  
  // If duplicates found, log additional details to help debugging
  if (duplicateIds.length > 0) {
    console.error(`Found ${duplicateIds.length} duplicate clip IDs:`, duplicateIds);
    console.error("Full list of clips with IDs:");
    clips.forEach((clip, index) => {
      console.log(`Clip[${index}]: id=${clip.id}, type=${clip.type}, startTime=${clip.startTime}`);
    });
  }
  
  console.log(`Found ${clips.length} clips in scene ${currentScene}:`, clips);
  
  // Calculate total duration of the project based on the latest ending clip
  const totalDuration = clips.length > 0 
    ? Math.min(120, Math.max(...clips.map(clip => clip.endTime))) 
    : 5; // Default duration, capped at 120 seconds (2 minutes)
  
  // Handle scrubber change
  const handleScrubberChange = (e) => {
    const newPosition = parseFloat(e.target.value);
    setScrubPosition(newPosition);
    const newTime = (newPosition / 100) * totalDuration;
    setCurrentTime(newTime);
    
    // Scroll to make the current time visible
    setTimeout(scrollToCurrentTime, 50);
  };
  
  // Improved drag and drop implementation
  const startDrag = (e, clip, index) => {
    e.preventDefault();
    
    // Clear any existing auto-scroll interval
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
    
    // Get track container
    const trackRect = videoTrackRef.current.getBoundingClientRect();
    const trackContainer = videoTrackRef.current.closest('.overflow-x-auto');
    const scrollLeft = trackContainer ? trackContainer.scrollLeft : 0;
    
    // Calculate initial click position relative to clip start
    const clipStartX = clip.startTime * 100 * zoomLevel;
    const clickX = e.clientX - trackRect.left + scrollLeft;
    const offsetX = clickX - clipStartX;
    
    console.log(`Starting drag for clip ${clip.id}`);
    
    // Initialize drag state
    setDragState({
      clip,
      index,
      offsetX,
      originalStart: clip.startTime,
      originalEnd: clip.endTime,
      isDragging: true,
      trackContainer
    });
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);
    
    // Add a class to the body to indicate dragging
    document.body.classList.add('timeline-dragging');
  };
  
  // Handle clip being dragged
  const handleDrag = (e) => {
    if (!dragState || !dragState.isDragging || !videoTrackRef.current) return;
    
    // Get current mouse position with scroll adjustment
    const trackRect = videoTrackRef.current.getBoundingClientRect();
    const trackContainer = dragState.trackContainer;
    const scrollLeft = trackContainer ? trackContainer.scrollLeft : 0;
    const mouseX = e.clientX - trackRect.left + scrollLeft;
    
    // Calculate new position
    const newX = mouseX - dragState.offsetX;
    const newStartTime = Math.max(0, newX / (100 * zoomLevel));
    
    // Optional: Implement a snap-to-grid effect
    // We'll snap to full seconds
    const snapThreshold = 15; // pixels
    const snapPoints = [];
    
    // Create snap points at every second
    for (let i = 0; i <= Math.ceil(totalDuration); i++) {
      snapPoints.push(i * 100 * zoomLevel); // Position in pixels for each second
    }
    
    // Add snap points at the end of each clip
    clips.forEach(clip => {
      if (clip.id !== dragState.clip.id) {
        // Snap to start and end points of other clips
        snapPoints.push(clip.startTime * 100 * zoomLevel);
        snapPoints.push(clip.endTime * 100 * zoomLevel);
      }
    });
    
    // Check if we should snap
    let snappedX = newX;
    let snappedTime = newStartTime;
    let isSnapped = false;
    
    snapPoints.forEach(snapPoint => {
      const distance = Math.abs(newX - snapPoint);
      if (distance < snapThreshold) {
        snappedX = snapPoint;
        snappedTime = snapPoint / (100 * zoomLevel);
        isSnapped = true;
      }
    });
    
    // Get the clip element
    const clipElement = document.getElementById(`clip-${dragState.clip.id}`);
    if (clipElement) {
      // Update visual position during drag
      clipElement.style.left = `${isSnapped ? snappedX : newX}px`;
      clipElement.style.zIndex = '30';
      clipElement.style.opacity = '0.7';
      clipElement.style.boxShadow = isSnapped 
        ? '0px 0px 10px rgba(0, 255, 0, 0.7)' // Green glow when snapped
        : '0px 0px 10px rgba(59, 130, 246, 0.7)'; // Blue glow when not snapped
      
      const duration = dragState.clip.endTime - dragState.clip.startTime;
      
      // Show position guide
      setPositionGuide({
        time: isSnapped ? snappedTime : newStartTime,
        position: isSnapped ? snappedX : newX,
        isSnapped
      });
      
      // Update the drag state with current position for use in endDrag
      setDragState(prevState => ({
        ...prevState,
        currentStartTime: isSnapped ? snappedTime : newStartTime,
        currentEndTime: (isSnapped ? snappedTime : newStartTime) + duration
      }));
      
      // Handle auto-scrolling when near the edges
      if (trackContainer) {
        const containerRect = trackContainer.getBoundingClientRect();
        const edgeThreshold = 50; // pixels from edge to trigger scroll
        
        // Clear any existing auto-scroll
        if (autoScrollInterval) {
          clearInterval(autoScrollInterval);
          setAutoScrollInterval(null);
        }
        
        // Check if mouse is near right edge
        if (e.clientX > containerRect.right - edgeThreshold) {
          const scrollInterval = setInterval(() => {
            trackContainer.scrollBy({ left: 10, behavior: 'auto' });
          }, 16);
          setAutoScrollInterval(scrollInterval);
        }
        // Check if mouse is near left edge
        else if (e.clientX < containerRect.left + edgeThreshold) {
          const scrollInterval = setInterval(() => {
            trackContainer.scrollBy({ left: -10, behavior: 'auto' });
          }, 16);
          setAutoScrollInterval(scrollInterval);
        }
      }
    }
  };
  
  // Handle end of dragging
  const endDrag = (e) => {
    if (!dragState || !dragState.isDragging || !videoTrackRef.current) return;
    
    // Clear position guide
    setPositionGuide(null);
    
    // Clear any auto-scroll interval
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
    
    try {
      // Get the clip element
      const clipElement = document.getElementById(`clip-${dragState.clip.id}`);
      if (!clipElement) {
        setDragState(null);
        return;
      }
      
      // Reset clip appearance
      clipElement.style.zIndex = '10';
      clipElement.style.opacity = '1';
      clipElement.style.boxShadow = 'none';
      
      // Get final position from the dragState that was updated during drag
      const duration = dragState.clip.endTime - dragState.clip.startTime;
      const newStartTime = dragState.currentStartTime || 0;
      
      console.log(`Completing drag: ${dragState.originalStart} -> ${newStartTime}`);
      
      // Create updated clip
      const updatedClip = {
        ...dragState.clip,
        startTime: newStartTime,
        endTime: newStartTime + duration
      };
      
      // Clear the left style property to let the calculated marginLeft take effect
      clipElement.style.left = '';
      
      // Reposition all clips - include visual, video and animated clips
      const visualVideoClips = clips.filter(c => c.type === 'video' || c.type === 'visual' || c.animated);
      
      // Sort by start time and reposition to avoid gaps
      const finalClips = repositionClips(visualVideoClips, updatedClip);
      
      // If we have an update function, use it
      if (typeof onUpdateClip === 'function') {
        finalClips.forEach(clip => {
          console.log(`Updating clip ${clip.id}: ${clip.startTime}-${clip.endTime}`);
          onUpdateClip(clip);
        });
      }
    } catch (err) {
      console.error("Error during drag completion:", err);
    } finally {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', endDrag);
      document.body.classList.remove('timeline-dragging');
      
      // Reset state
      setDragState(null);
    }
  };
  
  // Cleanup auto-scroll interval when component unmounts
  useEffect(() => {
    return () => {
      // Clean up event listeners when component unmounts
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', endDrag);
      document.body.classList.remove('timeline-dragging');
      
      // Clear any auto-scroll interval
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [autoScrollInterval]);
  
  // This function takes all clips and one that was moved, repositioning 
  // everything to ensure no overlaps and no gaps
  const repositionClips = (allClips, movedClip) => {
    // 1. Sort clips by startTime
    const sortedClips = [...allClips].sort((a, b) => a.startTime - b.startTime);
    
    // 2. Get separate arrays for audio and non-audio clips
    // Audio clips (sound and narration) can overlap with video clips but video clips cannot overlap each other
    // Non-audio clips include: video, visual, animation, static
    const audioClips = sortedClips.filter(clip => clip.type === 'sound' || clip.type === 'narration');
    const nonAudioClips = sortedClips.filter(clip => clip.type !== 'sound' && clip.type !== 'narration');
    
    // 3. Process non-audio clips to avoid overlaps
    for (let i = 0; i < nonAudioClips.length; i++) {
      // Skip the moved clip as we want to position other clips around it
      if (nonAudioClips[i].id === movedClip.id) continue;
      
      // 3.1 Check if this clip overlaps with any previous clips
      for (let j = 0; j < i; j++) {
        // Skip checking against the moved clip
        if (nonAudioClips[j].id === movedClip.id) continue;
        
        // Check for overlap
        if (nonAudioClips[i].startTime < nonAudioClips[j].endTime) {
          // Push this clip to start after the previous one ends
          nonAudioClips[i].startTime = nonAudioClips[j].endTime;
          nonAudioClips[i].endTime = nonAudioClips[i].startTime + (nonAudioClips[i].endTime - nonAudioClips[i].startTime);
        }
      }
    }
    
    // 3.2 Sort the updated non-audio clips
    nonAudioClips.sort((a, b) => a.startTime - b.startTime);
    
    // 4. Combine audio and non-audio clips
    return [...nonAudioClips, ...audioClips];
  };
  
  // Update the getCurrentClip function to sanitize non-Jamendo URLs
  const getCurrentClip = (currentTime) => {
    if (!scenes || !scenes[currentScene] || !scenes[currentScene].clips || !Array.isArray(scenes[currentScene].clips) || scenes[currentScene].clips.length === 0) {
      return null;
    }
    
    // First check for visual clips (video)
    for (const clip of scenes[currentScene].clips) {
      if (clip.type === 'video' && 
          currentTime >= clip.startTime && 
          currentTime < (clip.startTime + clip.duration)) {
        console.log("Using video clip at time", currentTime);
        return clip;
      }
    }
    
    // Then check for narration clips
    for (const clip of scenes[currentScene].clips) {
      if (clip.type === 'narration' && 
          currentTime >= clip.startTime && 
          currentTime < (clip.startTime + clip.duration)) {
        console.log("Using narration clip at time", currentTime);
        return clip;
      }
    }
    
    // Finally check for sound clips - WITH JAMENDO VALIDATION
    for (const clip of scenes[currentScene].clips) {
      if (clip.type === 'sound' && 
          currentTime >= clip.startTime && 
          currentTime < (clip.startTime + clip.duration)) {
        console.log("Using sound clip at time", currentTime);
        
        // Check if it's a Jamendo URL
        const soundUrl = clip.soundUrl || clip.url;
        if (soundUrl && !isJamendoUrl(soundUrl)) {
          console.warn("Non-Jamendo URL detected:", soundUrl);
          
          // Create replacement with Jamendo track
          const jamendoUrl = getJamendoReplacement();
          const updatedClip = { ...clip, soundUrl: jamendoUrl };
          
          // Update the clip in the timeline
          setTimeout(() => {
            onUpdateClip(updatedClip);
            toast.error("Audio replaced with Jamendo track");
          }, 0);
          
          // Return updated clip immediately
          return updatedClip;
        }
        
        return clip;
      }
    }
    
    // No clip found
    return null;
  };

  // Format time as mm:ss:ms
  const formatTime = (seconds) => {
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
  
  // Determine current clip for preview
  const currentClip = getCurrentClip(currentTime);
  
  // Function to add clip and immediately open editor
  const handleAddVideoClick = () => {
    try {
      console.log("Adding video clip...");
      // Force pause playback and reset to beginning to avoid race conditions
      setIsPlaying(false);
      setCurrentTime(0);
      setScrubPosition(0);
      
      // Ensure onAddClip is a function
      if (typeof onAddClip !== 'function') {
        console.error("onAddClip is not a function");
        return;
      }
      
      // Now add the new video clip
      onAddClip('video');
      console.log("onAddClip called with 'video'");
    } catch (error) {
      console.error("Error adding video clip:", error);
    }
  };
  
  // Add a scroll to current time function and use it in the playhead indicator
  const scrollToCurrentTime = () => {
    const container = document.querySelector('.timeline-scroll-container');
    if (!container) return;
    
    const timelineWidth = container.scrollWidth;
    const containerWidth = container.clientWidth;
    
    // Calculate the position of the current time
    const position = (currentTime / totalDuration) * timelineWidth;
    
    // If the position is outside the visible area, scroll to it
    if (position < container.scrollLeft || position > container.scrollLeft + containerWidth - 100) {
      container.scrollTo({
        left: Math.max(0, position - (containerWidth / 2)),
        behavior: 'smooth'
      });
    }
  };
  
  // NEW: Add effect to control video playback when isPlaying changes
  useEffect(() => {
    console.log("isPlaying changed to:", isPlaying);
    
    if (videoRef.current) {
      if (isPlaying) {
        console.log("Attempting to play video...");
        videoRef.current.play()
          .then(() => console.log("Video playback started successfully"))
          .catch(error => {
            console.error("Error playing video:", error);
            // If autoplay fails, update state to reflect actual state
            setIsPlaying(false);
        });
      } else {
        console.log("Pausing video...");
        videoRef.current.pause();
      }
    } else {
      console.log("No video element available");
    }
  }, [isPlaying]);
  
  // NEW: Simplified playback timer - only used when no video is active
  useEffect(() => {
    // Only use this timer when there's no active video but playback is requested
    if (isPlaying && (!videoRef.current || !currentClip || !currentClip.animationUrl)) {
      const timer = setInterval(() => {
        setCurrentTime(prevTime => {
          // Move at a reasonable real-time pace (about 1 second per second)
          const nextTime = prevTime + 0.05;
          
          // Stop at the end of timeline
          if (nextTime >= totalDuration) {
            setIsPlaying(false);
            clearInterval(timer);
            return totalDuration;
          }
          
          // Update scrubber position
          setScrubPosition((nextTime / totalDuration) * 100);
          return nextTime;
        });
      }, 50); // 20 updates per second for smoother movement
      
      return () => clearInterval(timer);
    }
  }, [isPlaying, currentClip, totalDuration]);
  
  // NEW: Add effect to handle current clip changes
  useEffect(() => {
    // When the current clip changes, ensure video timing is correctly synchronized
    if (currentClip && videoRef.current && currentClip.animationUrl) {
      console.log("Current clip changed to:", currentClip.id);
      console.log("Timeline position:", currentTime, "Clip range:", currentClip.startTime, "-", currentClip.endTime);
      
      // Check if currentTime is within this clip
      if (currentTime >= currentClip.startTime && currentTime < currentClip.endTime) {
        // Calculate the correct position within the video
        const relativePosition = currentTime - currentClip.startTime;
        console.log("Setting video to relative position:", relativePosition);
        
        // Set the video's current time
        videoRef.current.currentTime = relativePosition;
      } else {
        // If current time is not in clip range, position at beginning of clip
        console.log("Current time outside clip range, setting to clip start");
        videoRef.current.currentTime = 0;
        
        // Update the timeline position to match the clip start
        setCurrentTime(currentClip.startTime);
        setScrubPosition((currentClip.startTime / totalDuration) * 100);
      }
    }
  }, [currentClip, totalDuration]);
  
  // NEW: Current time debugging
  useEffect(() => {
    console.log("⏱️ Current timeline time:", currentTime.toFixed(2), 
                "Scrub position:", scrubPosition.toFixed(2) + "%");
    
    // Find which clip this time falls within
    const activeClip = clips.find(clip => 
      currentTime >= clip.startTime && currentTime < clip.endTime
    );
    
    if (activeClip) {
      console.log("🎬 Active clip:", activeClip.id, 
                  "Range:", activeClip.startTime.toFixed(2), "-", activeClip.endTime.toFixed(2),
                  "Position within clip:", (currentTime - activeClip.startTime).toFixed(2));
    } else {
      console.log("⚠️ No active clip at current time");
    }
  }, [currentTime, clips]);
  
  // Zoom handling
  const handleZoomIn = () => {
    setZoomLevel(prevZoom => Math.min(prevZoom * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prevZoom => Math.max(prevZoom / 1.2, 0.5));
  };
  
  // Add an effect to handle audio playback (narration and sound)
  useEffect(() => {
    // Create a local audio instance for this effect closure
    let audioElement = audioRef.current;
    
    // Only create a new audio element if needed
    if (!audioElement) {
      audioElement = new Audio();
      audioRef.current = audioElement;
    }
    
    // Check if current clip is a narration clip
    if (currentClip && currentClip.type === 'narration' && currentClip.narrationUrl) {
      console.log("Current clip is narration, setting up audio playback:", currentClip.narrationUrl);
      
      // Set the audio source - only if it's different from current source
      if (audioElement.src !== currentClip.narrationUrl) {
        console.log("Setting new narration source:", currentClip.narrationUrl);
        audioElement.src = currentClip.narrationUrl;
        
        // Reset audio state
        audioElement.currentTime = 0;
      }
      
      // Set playback rate based on narration speed
      if (currentClip.narrationSpeed) {
        audioElement.playbackRate = currentClip.narrationSpeed;
      }
      
      // Calculate relative position within the narration clip
      if (currentTime >= currentClip.startTime && currentTime < currentClip.endTime) {
        const relativePosition = currentTime - currentClip.startTime;
        console.log("Setting narration to relative position:", relativePosition);
        // Only update if significant change to avoid interruption errors
        const currentPos = audioElement.currentTime;
        if (Math.abs(currentPos - relativePosition) > 0.3) {
          audioElement.currentTime = relativePosition;
        }
      }
    }
    // Check if current clip is a sound clip
    else if (currentClip && currentClip.type === 'sound' && currentClip.soundUrl) {
      console.log("Current clip is sound, setting up audio playback:", currentClip.soundUrl);
      
      // Set the audio source - only if it's different from current source
      if (audioElement.src !== currentClip.soundUrl) {
        console.log("Setting new sound source:", currentClip.soundUrl);
        audioElement.src = currentClip.soundUrl;
        
        // Reset audio state
        audioElement.currentTime = 0;
      }
      
      // Calculate relative position within the sound clip
      if (currentTime >= currentClip.startTime && currentTime < currentClip.endTime) {
        const relativePosition = currentTime - currentClip.startTime;
        console.log("Setting sound to relative position:", relativePosition);
        // Only update if significant change to avoid interruption errors
        const currentPos = audioElement.currentTime;
        if (Math.abs(currentPos - relativePosition) > 0.3) {
          audioElement.currentTime = relativePosition;
        }
      }
    }
    else if (audioRef.current) {
      // If we switched to a non-audio clip, pause any playing audio
      try {
        audioRef.current.pause();
      } catch (e) {
        console.error("Error pausing audio when switching clips:", e);
      }
      return;
    }
    
    // Play or pause based on isPlaying state - with error handling
    const updatePlayState = async () => {
      console.log("isPlaying changed to:", isPlaying);
      
      // Handle video element if needed
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        } else {
          videoRef.current.pause();
        }
      } else {
        console.log("No video element available");
      }
      
      // Get current active clip - already sanitized by getCurrentClip
      const clip = getCurrentClip(currentTime);
      
      // Handle audio playback for sound clips
      if (clip && clip.type === 'sound') {
        // Get the URL from the sound clip
        const soundUrl = clip.soundUrl || clip.url;
        
        if (soundUrl) {
          // Verify Jamendo URL - safety check
          if (!isJamendoUrl(soundUrl)) {
            console.error("Non-Jamendo URL detected in playback:", soundUrl);
            return; // Skip non-Jamendo audio entirely
          }
          
          console.log("Playing Jamendo track:", soundUrl);
          
          // Initialize audio element if needed
          if (!audioRef.current) {
            audioRef.current = new Audio();
            
            // Add debugging listeners
            audioRef.current.addEventListener('error', (e) => {
              console.error('Audio error:', e);
              setPlaybackError(true);
            });
            
            audioRef.current.addEventListener('canplay', () => {
              console.log('Jamendo audio ready to play');
              setPlaybackError(false);
            });

            // Preload setting for better buffering
            audioRef.current.preload = "auto";
          }
          
          try {
            // Update source if needed
            if (audioRef.current.src !== soundUrl) {
              console.log("Setting new audio source:", soundUrl);
              
              // Pause and reset any existing playback
              audioRef.current.pause();
              
              // Set source and force preload
              audioRef.current.src = soundUrl;
              audioRef.current.load(); // Force reload and buffer
              
              // Set a longer buffer timeout to ensure audio is ready
              setTimeout(() => {
                // Set position within the clip
                const relativePosition = Math.max(0, currentTime - clip.startTime);
                audioRef.current.currentTime = relativePosition;
                
                // Play if needed
                if (isPlaying && audioRef.current.readyState >= 2) {
                  audioRef.current.volume = 0.5; // Set volume to match preview
                  audioRef.current.play().catch(error => {
                    console.error("Error playing Jamendo audio:", error);
                    toast.error("Could not play audio");
                    setPlaybackError(true);
                  });
                }
              }, 500); // Longer wait to ensure proper buffering
            } else {
              // Same source, just update position and play state
              
              // Set position within the clip
              const relativePosition = Math.max(0, currentTime - clip.startTime);
              audioRef.current.currentTime = relativePosition;
              
              // Play or pause based on state
              if (isPlaying) {
                if (audioRef.current.paused) {
                  audioRef.current.volume = 0.5;
                  audioRef.current.play().catch(error => {
                    console.error("Error resuming Jamendo audio:", error);
                    setPlaybackError(true);
                  });
                }
              } else {
                audioRef.current.pause();
              }
            }
          } catch (error) {
            console.error("Audio playback error:", error);
            toast.error("Audio playback error");
            setPlaybackError(true);
            
            // Log detailed information about the clip to help debugging
            console.error("Problem clip details:", {
              clipId: clip.id,
              clipType: clip.type,
              soundUrl: soundUrl,
              allProps: Object.keys(clip),
              audioReadyState: audioRef.current?.readyState,
              audioNetworkState: audioRef.current?.networkState
            });
          }
        } else {
          console.error("Sound clip has no URL:", clip);
          toast.error("Sound clip missing URL");
        }
      } else if (audioRef.current) {
        // No active sound clip, pause any playing audio
        audioRef.current.pause();
      }
    };
    
    updatePlayState();
    
    // Clean up function
    return () => {
      // Safely pause and clean up the audio element
      try {
        if (audioElement) {
          audioElement.pause();
          // Don't reset src here to prevent unnecessary loading
        }
      } catch (e) {
        console.error("Error cleaning up audio:", e);
      }
    };
  }, [currentClip, isPlaying, currentTime]);
  
  return (
    <div className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Anime Studio</h1>
          <p className="text-gray-400 mt-1">Create your animation with a timeline-based editor</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onBackToProjects}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-300 mr-2"
          >
            Back to Projects
          </button>
          <button 
            onClick={onShowPublishModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300"
          >
            Export
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Preview Window - Takes 3/4 of the space */}
        <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Preview</h2>
            <div className="flex space-x-2">
              <span className="text-white">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
            </div>
          </div>
          
          {/* Preview Window */}
          <div className="rounded-md bg-gray-800 text-white p-4 border border-gray-700 shadow-lg mb-4">
            <div className="mb-2">Preview</div>
            <div className="bg-gray-900 rounded-lg overflow-hidden h-64 md:h-96 flex items-center justify-center">
              {currentClip ? (
                // If there's a current clip, display it
                currentClip.type === 'video' || currentClip.animated ? (
                  <div className="w-full h-full relative">
                    {console.log("Rendering video preview for clip:", {
                      id: currentClip.id,
                      type: currentClip.type,
                      animated: currentClip.animated,
                      hasUrl: !!currentClip.animationUrl,
                      url: currentClip.animationUrl || "not available"
                    })}
                    {currentClip.animationUrl ? (
                      <video
                        ref={videoRef}
                        src={currentClip.animationUrl}
                        className="w-full h-full object-contain"
                        autoPlay={isPlaying}
                        playsInline
                        muted={false}
                        onLoadedData={() => {
                          console.log("Video loaded:", currentClip.animationUrl);
                          
                          // Position video at the correct timeline position
                          if (videoRef.current) {
                            // If currentTime is within this clip's time range,
                            // adjust the video's current time to match
                            if (currentTime >= currentClip.startTime && 
                                currentTime < currentClip.endTime) {
                              // Calculate the relative position within the clip
                              const relativePosition = currentTime - currentClip.startTime;
                              videoRef.current.currentTime = relativePosition;
                              console.log("Positioned video at relative time:", relativePosition);
                            }
                            
                            // Start playing if isPlaying is true
                            if (isPlaying) {
                              videoRef.current.play().catch(e => console.error("Could not autoplay on load:", e));
                            }
                          }
                        }}
                        onTimeUpdate={(e) => {
                          // This is where we synchronize the video with the timeline playhead
                          if (!videoRef.current || !currentClip) return;
                          
                          // Get video's internal currentTime (position within the video)
                          const videoInternalTime = e.target.currentTime;
                          
                          // Calculate absolute timeline position 
                          // (clip's start time + position within the video)
                          const absoluteTimelinePosition = currentClip.startTime + videoInternalTime;
                          
                          // Log detailed positioning information for debugging
                          console.log("🎞️ Video internal time:", videoInternalTime.toFixed(2), 
                                      "Timeline position:", absoluteTimelinePosition.toFixed(2));
                          
                          // Force the playhead to match this exact position
                          if (Math.abs(absoluteTimelinePosition - currentTime) > 0.02) {
                            console.log("📍 Updating playhead position to:", absoluteTimelinePosition.toFixed(2));
                            
                            // Update the timeline position state
                            setCurrentTime(absoluteTimelinePosition);
                            
                            // Update the scrubber position (as percentage of total duration)
                            const newScrubPosition = (absoluteTimelinePosition / totalDuration) * 100;
                            setScrubPosition(newScrubPosition);
                          }
                          
                          // Check if we've reached the end of this clip
                          if (videoInternalTime >= e.target.duration - 0.05) {
                            console.log("📍 Reached end of video");
                            
                            // If there's no next clip, pause playback
                            const nextClip = clips.find(clip => 
                              clip.startTime >= currentClip.endTime && 
                              (clip.type === 'video' || clip.animated)
                            );
                            
                            if (!nextClip) {
                              console.log("📍 No next clip, pausing");
                              setIsPlaying(false);
                            }
                          }
                        }}
                        onEnded={() => {
                          // Find the next clip in the timeline
                          const nextClip = clips.find(clip => 
                            clip.startTime >= currentClip.endTime && 
                            (clip.type === 'video' || clip.animated)
                          );
                          
                          if (nextClip) {
                            // Move to the next clip's start
                            console.log("Video ended, advancing to next clip:", nextClip.id);
                            setCurrentTime(nextClip.startTime);
                            setScrubPosition((nextClip.startTime / totalDuration) * 100);
                          } else {
                            // No more clips, stop at the end of this clip
                            console.log("Video ended, no more clips to play");
                            setIsPlaying(false);
                            setCurrentTime(currentClip.endTime);
                            setScrubPosition((currentClip.endTime / totalDuration) * 100);
                          }
                        }}
                        onError={(e) => console.error("Video error:", e, currentClip.animationUrl)}
                      />
                    ) : (
                      // Fallback to showing image if no animation URL available
                      <div className="w-full h-full flex items-center justify-center">
                        {currentClip.image ? (
                          <img 
                            src={currentClip.image} 
                            alt="Animation Preview"
                            className="max-w-full max-h-full object-contain" 
                          />
                        ) : (
                          <div className="text-purple-400 text-center">
                            <div className="text-2xl mb-2">⚠️</div>
                            <div>Animation URL missing</div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Type indicator badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs text-white bg-black bg-opacity-50">
                      {currentClip.animated ? "Animated Video" : currentClip.type === 'video' ? "Video" : "Visual"}
                    </div>
                    {currentClip.subtitles && (
                      <div className="absolute bottom-4 left-0 right-0 text-center bg-black bg-opacity-50 p-2">
                        {currentClip.subtitles}
                      </div>
                    )}
                  </div>
                ) : currentClip.type === 'narration' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-gray-800 to-gray-900">
                    <div className="text-center p-6 max-w-md">
                      <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {currentClip.hasNarration ? "Narration" : "Narration Not Generated"}
                      </h3>
                      {currentClip.narrationText ? (
                        <>
                          <p className="text-gray-300 mb-4">"{currentClip.narrationText.substring(0, 150)}..."</p>
                          <div className="text-sm text-gray-400">
                            <p>Voice: {currentClip.narrationVoice || "Default"}</p>
                            <p>Speed: {currentClip.narrationSpeed || 1}x</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-400">Double-click the narration clip to add text</p>
                      )}
                      {currentClip.narrationUrl && (
                        <div className="mt-4">
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-700">
                              <div 
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-amber-500"
                                style={{ width: `${((currentTime - currentClip.startTime) / (currentClip.endTime - currentClip.startTime)) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // Otherwise it's an image
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={currentClip.image}
                      alt="Clip Preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => console.error("Image error:", e, currentClip.image)}
                    />
                    {/* Type indicator badge */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs text-white bg-black bg-opacity-50">
                      {currentClip.type}
                    </div>
                  </div>
                )
              ) : (
                // No current clip
                <div className="text-gray-500">No content to preview</div>
              )}
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
                setScrubPosition(0);
              }}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14M19 5v14" />
              </svg>
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                value={scrubPosition}
                onChange={handleScrubberChange}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer relative z-20"
                style={{
                  background: 'linear-gradient(to right, #3b82f6 0%, #3b82f6 var(--value), #374151 var(--value), #374151 100%)',
                  '--value': `${scrubPosition}%`
                }}
              />
            </div>
          </div>
          
          {/* Timeline */}
          <div className="bg-gray-900 rounded-lg p-4" ref={timelineRef}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Timeline</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-white text-sm">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Timeline scroll controls */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const container = document.querySelector('.timeline-scroll-container');
                    if (container) {
                      container.scrollBy({ left: -200, behavior: 'smooth' });
                    }
                  }}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"
                  title="Scroll left"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const container = document.querySelector('.timeline-scroll-container');
                    if (container) {
                      container.scrollBy({ left: 200, behavior: 'smooth' });
                    }
                  }}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded"
                  title="Scroll right"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-gray-400">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>
            
            {/* Timeline container with horizontal scrolling - add timeline-scroll-container class */}
            <div className="overflow-x-auto timeline-scroll-container" style={{ maxWidth: '100%' }}>
              <div className="flex">
                {/* Track labels column - fixed position */}
                <div className="flex-shrink-0 mr-2" style={{ width: '80px' }}>
                  <div className="h-6 flex items-end">
                    <span className="text-gray-500 text-xs">Time</span>
                  </div>
                  <div className="h-16 flex items-center">
                    <span className="text-white text-xs">Video</span>
                  </div>
                  <div className="h-10 flex items-center">
                    <span className="text-white text-xs">Sound</span>
                  </div>
                </div>
                
                {/* Timeline tracks with content */}
                <div>
                  {/* Time markers */}
                  <div className="flex h-6 border-b border-gray-700 mb-1"
                    onClick={(e) => {
                      // Get the container and its dimensions
                      const container = e.currentTarget.parentElement;
                      if (!container) return;
                      
                      const containerRect = container.getBoundingClientRect();
                      const trackContainer = container.closest('.timeline-scroll-container');
                      if (!trackContainer) return;
                      
                      const scrollLeft = trackContainer.scrollLeft;
                      
                      // Calculate click position relative to the time markers
                      const clickX = e.clientX - containerRect.left + scrollLeft;
                      
                      // Convert to time
                      const clickTime = (clickX / (100 * zoomLevel));
                      
                      // Set the current time and scrub position
                      const newTime = Math.min(Math.max(0, clickTime), totalDuration);
                      setCurrentTime(newTime);
                      setScrubPosition((newTime / totalDuration) * 100);
                      
                      // Scroll to make the time visible
                      scrollToCurrentTime();
                    }}
                  >
                    {/* Use a more precise time marker positioning */}
                    {Array.from({ length: 121 }).map((_, i) => (
                      <div 
                        key={`time-${i}`} 
                        className="text-gray-500 text-xs flex-shrink-0 relative" 
                        style={{ 
                          width: `${100 * zoomLevel}px`,
                          borderLeft: i > 0 ? '1px solid rgba(75, 85, 99, 0.5)' : 'none'
                        }}
                      >
                        <span className="absolute left-1">{formatTime(i)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Scenes timeline */}
                  <div className="flex flex-col space-y-2 relative">
                    {/* Playhead */}
                    <div
                      className="absolute top-0 h-full w-0.5 bg-red-500 z-30 pointer-events-none"
                      style={{
                        left: `${currentTime * 100 * zoomLevel}px`,
                        height: '100%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                    
                    {/* Visual track */}
                    <div className="relative">
                      <div 
                        ref={videoTrackRef}
                        className="flex h-16 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                          // Removed maxWidth to ensure full 120 seconds are shown
                        }}
                      >
                        {/* Position guide */}
                        {positionGuide && (
                          <div 
                            className={`absolute top-0 bottom-0 w-0.5 ${positionGuide.isSnapped ? 'bg-green-500' : 'bg-white'} z-20 pointer-events-none`}
                            style={{ 
                              left: `${positionGuide.position}px`,
                              height: '100%',
                              boxShadow: positionGuide.isSnapped ? '0 0 4px rgba(0, 255, 0, 0.7)' : '0 0 4px rgba(255, 255, 255, 0.7)'
                            }}
                          >
                            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded">
                              {formatTime(positionGuide.time)}
                            </div>
                          </div>
                        )}
                        
                        {console.log('Rendering video/visual clips:', clips.filter(clip => clip.type === 'video' || clip.type === 'visual' || clip.type === 'static' || clip.animated))}
                        {clips
                          .filter(clip => clip.type === 'video' || clip.type === 'visual' || clip.type === 'static' || clip.animated)
                          .map((clip, clipIndex) => {
                            console.log(`Rendering clip ${clipIndex}:`, clip.id, clip.type, `${clip.startTime}-${clip.endTime}`);
                            return (
                            <div
                              key={`video-${clip.id}`}
                              id={`clip-${clip.id}`}
                              className={`h-full rounded-lg ${
                                selectedClip?.id === clip.id 
                                  ? 'ring-2 ring-white' 
                                  : ''
                              } ${
                                clip.animated 
                                  ? 'bg-gradient-to-r from-blue-800 to-purple-800' 
                                  : clip.type === 'static'
                                  ? 'bg-teal-800'
                                  : clip.type === 'visual'
                                  ? 'bg-green-800'
                                  : 'bg-blue-800'
                              } flex flex-col overflow-hidden cursor-move relative ${
                                dragState?.clip?.id === clip.id && dragState.isDragging ? 'opacity-70' : ''
                              }`}
                              style={{
                                width: `${(clip.endTime - clip.startTime) * 100 * zoomLevel}px`,
                                marginLeft: `${clip.startTime * 100 * zoomLevel}px`,
                                position: 'absolute',
                                left: 0,
                                zIndex: dragState?.clip?.id === clip.id && dragState.isDragging ? '30' : '10',
                              }}
                              onClick={(e) => {
                                // Only trigger click if not dragging
                                if (!dragState || !dragState.isDragging) {
                                  onClipClick && onClipClick(clip);
                                }
                              }}
                              onDoubleClick={(e) => {
                                // Prevent default to avoid text selection
                                e.preventDefault();
                                
                                // Prevent event bubbling
                                e.stopPropagation();
                                
                                // Make sure we're not in the middle of a drag operation
                                if (!dragState || !dragState.isDragging) {
                                  console.log(`Double click on clip ${clip.id}, opening editor...`);
                                  // Open the clip editor directly with the clip index
                                  onOpenClipEditor && onOpenClipEditor(clipIndex);
                                }
                              }}
                              onMouseDown={(e) => startDrag(e, clip, clipIndex)}
                            >
                              {/* Clip thumbnail */}
                              {(clip.image || clip.animationUrl) && (
                                <div className="h-1/2 w-full overflow-hidden border-b border-gray-600">
                                  {clip.animated ? (
                                    <div className="h-full w-full flex items-center justify-center relative">
                                      {/* Video thumbnail indicator */}
                                      <span className="absolute bottom-0 right-0 bg-purple-700 text-white text-[6px] px-1 rounded-sm z-20">
                                        VIDEO
                                      </span>
                                      <img 
                                        src={clip.image || `${clip.animationUrl}#t=0.1`}
                                        alt="Clip thumbnail"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          console.error("Timeline thumbnail error:", e);
                                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAxMDAgNTAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiM0MzQzNTYiLz48dGV4dCB4PSI1MCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+VmlkZW88L3RleHQ+PC9zdmc+';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <img 
                                      src={clip.image}
                                      alt="Clip thumbnail"
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        console.error("Timeline thumbnail error:", e);
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAxMDAgNTAiPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiM0MzQzNTYiLz48dGV4dCB4PSI1MCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                              
                              {/* Clip label */}
                              <div className="p-1 flex-1 flex items-center overflow-hidden">
                                <span className="text-white text-xs truncate">
                                  {clip.animated ? 'Animation ' : 
                                   clip.type === 'static' ? 'Static Image ' :
                                   clip.type === 'visual' ? 'Visual ' : 
                                   'Video '}
                                  {formatTime(clip.startTime)}-{formatTime(clip.endTime)}
                                </span>
                              </div>
                              
                              {/* Duration indicator */}
                              <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 text-[6px] text-white text-center">
                                {formatTime(clip.endTime - clip.startTime)}
                              </div>
                            </div>
                          )})}
                        
                        {/* Drag preview element */}
                        {draggedClip && (
                          <div
                            id="drag-preview"
                            className="h-full rounded-lg bg-green-700 opacity-70 flex flex-col overflow-hidden absolute z-20 pointer-events-none border-2 border-green-500"
                            style={{
                              width: `${(draggedClip.endTime - draggedClip.startTime) * 100 * zoomLevel}px`,
                              left: `${draggedClip.startTime * 100 * zoomLevel}px`,
                            }}
                          >
                            <div className="p-1 flex-1 flex items-center justify-center overflow-hidden">
                              <span className="text-white text-xs truncate">
                                {formatTime(draggedClip.endTime - draggedClip.startTime)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Sound track */}
                    <div className="relative">
                      <div 
                        className="flex h-10 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                        }}
                      >
                        {clips
                          .filter(clip => clip.type === 'sound')
                          .map((clip, clipIndex) => (
                            <div
                              key={`sound-${clip.id}`}
                              id={`clip-${clip.id}`}
                              className={`h-full bg-purple-800 hover:bg-purple-700 rounded-lg ${
                                selectedClip?.id === clip.id ? 'ring-2 ring-white' : ''
                              } flex items-center justify-center cursor-move relative overflow-hidden`}
                              style={{
                                width: `${(clip.endTime - clip.startTime) * 100 * zoomLevel}px`,
                                marginLeft: `${clip.startTime * 100 * zoomLevel}px`,
                                position: 'absolute',
                                left: 0,
                                zIndex: 10,
                              }}
                              onClick={() => onClipClick && onClipClick(clipIndex)}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onOpenClipEditor) {
                                  onOpenClipEditor(clipIndex);
                                }
                              }}
                              onMouseDown={(e) => startDrag(e, clip, clipIndex)}
                            >
                              <div className="p-1 h-full flex items-center overflow-hidden w-full">
                                <div className="text-white text-xs truncate w-full flex items-center">
                                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                  </svg>
                                  <span className="truncate flex-grow">
                                    {clip.title || "Background Music"}
                                  </span>
                                  <span className="flex-shrink-0 bg-purple-900 rounded px-1 ml-1 text-xs">
                                    {formatTime(clip.endTime - clip.startTime)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {/* Narration track */}
                    <div className="relative">
                      <div 
                        className="flex h-10 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                        }}
                      >
                        {clips
                          .filter(clip => clip.type === 'narration')
                          .map((clip, clipIndex) => (
                            <div
                              key={`narration-${clip.id}`}
                              id={`clip-${clip.id}`}
                              className={`h-full bg-amber-700 rounded-lg ${selectedClip?.id === clip.id ? 'ring-2 ring-white' : ''}`}
                              style={{
                                width: `${(clip.endTime - clip.startTime) * 100 * zoomLevel}px`,
                                marginLeft: `${clip.startTime * 100 * zoomLevel}px`,
                                position: 'absolute',
                                left: 0,
                                zIndex: 10,
                              }}
                              onClick={() => onClipClick && onClipClick(clipIndex)}
                              onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onOpenClipEditor) {
                                  console.log(`Double click on narration clip ${clip.id}, opening editor...`);
                                  onOpenClipEditor(clipIndex);
                                }
                              }}
                              onMouseDown={(e) => startDrag(e, clip, clipIndex)}
                            >
                              <div className="p-1 h-full flex items-center overflow-hidden">
                                <span className="text-white text-xs truncate">
                                  Narration {formatTime(clip.startTime)}-{formatTime(clip.endTime)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Timeline controls */}
            <div className="flex justify-between mt-4">
              <div className="text-gray-400 text-xs">
                <span className="mr-2"><i className="fas fa-arrows-alt"></i> Drag to reposition clips</span>
                <span className="mr-2">•</span>
                <span>Clips will automatically snap to avoid gaps</span>
              </div>
              <div>
                <button
                  onClick={handleAddVideoClick}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm mr-2"
                >
                  Add Video
                </button>
                <button
                  onClick={() => onAddClip('sound')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm mr-2"
                >
                  Add Sound
                </button>
                <button
                  onClick={() => onAddClip('narration')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm"
                >
                  Add Narration
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar - Clip Properties or Media Library */}
        <div className="lg:col-span-1">
          {/* Media Library Tab */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Media Library</h2>
            <div className="grid grid-cols-2 gap-2">
              {/* Sample media items */}
              {[1, 2, 3, 4, 5, 6].map(item => (
                <div key={item} className="bg-gray-700 rounded-lg aspect-video overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Media {item}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Import Media
            </button>
          </div>
          
          {/* Transitions Tab */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Clip Properties</h2>
            {selectedClip ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Clip Type</label>
                  <div className="text-white">{selectedClip.type}</div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Duration</label>
                  <div className="text-white">{(selectedClip.endTime - selectedClip.startTime).toFixed(1)}s</div>
                </div>
                {selectedClip.type === 'video' && (
                  <button
                    onClick={() => {
                      // Use onOpenClipEditor directly with the selected clip
                      if (clips.length > 0) {
                        const clipIndex = clips.findIndex(c => c.id === selectedClip.id);
                        if (clipIndex !== -1) {
                          onOpenClipEditor(clipIndex);
                        } else {
                          console.error("Selected clip not found in current scene:", selectedClip.id);
                        }
                      } else {
                        console.error("No clips available in current scene");
                      }
                    }}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    Edit Video
                  </button>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">
                Select a clip to view properties
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Playback error message */}
      {playbackError && (
        <div className="bg-red-800 text-white px-3 py-2 rounded-md text-sm mb-2">
          <p>
            <strong>Audio playback failed:</strong> External audio files may be blocked by CORS policies. 
            Consider uploading your own audio files instead of using direct FreePD links.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineEditor; 