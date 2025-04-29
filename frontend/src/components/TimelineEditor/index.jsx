import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Import utility functions
import { isJamendoUrl, getJamendoReplacement, safePlayAudio } from './utils/AudioUtils';
import { formatTime } from './utils/TimeUtils';
import { enforce2MinuteLimit, repositionClips, updateClipPosition, checkOverlap, getCurrentClip, finalizeClipForTimeline, getClipsForSaving } from './utils/ClipUtils';
import { scrollToCurrentTime, handleAutoScroll } from './utils/ScrollUtils';

// Import handler functions
import { startDrag, handleDrag, endDrag } from './handlers/DragHandlers';

// Import components
import SnapIndicator from './components/SnapIndicator';

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
  onUpdateClip,
  onDeleteClip,
  onSaveProject
}) => {
  // Timeline state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);
  
  // Drag and trim state
  const [dragState, setDragState] = useState(null);
  const [draggedClip, setDraggedClip] = useState(null);
  const [positionGuide, setPositionGuide] = useState(null);
  
  // State for playback error
  const [playbackError, setPlaybackError] = useState(false);
  
  // Add direct drag functionality for clips
  const [directDragState, setDirectDragState] = useState(null);
  const [selectedClipId, setSelectedClipId] = useState(null);
  
  // Local copy of clips for real-time updates during dragging
  const [localClips, setLocalClips] = useState([]);
  
  // DOM references
  const timelineRef = useRef(null);
  const videoTrackRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  
  // New state variables
  const [positionInputValue, setPositionInputValue] = useState("");
  const [startTimeInputValue, setStartTimeInputValue] = useState("");
  const [endTimeInputValue, setEndTimeInputValue] = useState("");
  
  // At the top of the component, add these state variables
  const [inputValues, setInputValues] = useState({
    position: null,
    startTime: null,
    endTime: null
  });
  
  // Function to convert time (in seconds) to pixels based on zoom level
  const timeToPixels = (time) => {
    return time * 100 * zoomLevel;
  };
  
  console.log('TimelineEditor - Props check:');
  console.log('- scenes:', scenes);
  console.log('- currentScene:', currentScene);
  console.log('- onAddClip:', typeof onAddClip === 'function' ? 'Function available' : 'Missing');
  console.log('- onUpdateClip:', typeof onUpdateClip === 'function' ? 'Function available' : 'Missing');
  
  // Get clips from the current scene
  const clips = scenes && scenes[currentScene] && Array.isArray(scenes[currentScene].clips) 
    ? scenes[currentScene].clips 
    : [];
  
  // Keep localClips in sync with clips from props
  useEffect(() => {
    setLocalClips(clips);
  }, [scenes, currentScene]);
  
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
    : 0; // If no clips, duration is 0
  
  // Handle scrubber change
  const handleScrubberChange = (e) => {
    const newPosition = parseFloat(e.target.value);
    setScrubPosition(newPosition);
    const newTime = (newPosition / 100) * totalDuration;
    setCurrentTime(newTime);
    
    // Scroll to make the current time visible
    setTimeout(() => scrollToCurrentTime(
      document.querySelector('.timeline-scroll-container'), 
      newTime, 
      zoomLevel
    ), 50);
  };
  
  // Wrapped drag handlers with state and props
  const handleStartDrag = (e, clip, index) => {
    console.log(`Initializing drag for clip ${clip.id}`);
    startDrag(
      e, 
      clip, 
      index, 
      { videoTrackRef }, 
      { 
        zoomLevel, 
        autoScrollInterval, 
        dragState,
        clips
      },
      { 
        setDragState, 
        setDraggedClip, 
        setAutoScrollInterval,
        setPositionGuide,
        setClipsList: (updatedClip) => {
          console.log("Updating clip position:", updatedClip.id, updatedClip.startTime, updatedClip.endTime);
          if (onUpdateClip) {
            onUpdateClip(updatedClip);
          }
        }
      }
    );
  };
  
  // Determine current clip for preview
  const currentClip = getCurrentClip(clips, currentTime);
  
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
  
  // Function to scroll to current time
  const scrollToCurrentTimeWrapper = () => {
    const container = document.querySelector('.timeline-scroll-container');
    if (container) {
      scrollToCurrentTime(container, currentTime, zoomLevel);
    }
  };
  
  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prevZoom => Math.min(prevZoom * 1.2, 5));
    setTimeout(scrollToCurrentTimeWrapper, 50); // Scroll after zoom updates
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prevZoom => Math.max(prevZoom / 1.2, 0.5));
    setTimeout(scrollToCurrentTimeWrapper, 50); // Scroll after zoom updates
  };
  
  // Play/pause functionality
  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };
  
  // Handle clip selection
  const handleClipSelection = (clip, clipIndex) => {
    console.log(`Selecting clip: ${clip.id}, type: ${clip.type}`);
    
    // For static images, add extra debug info
    if (clip.type === 'static' || clip.type === 'static_image') {
      console.log(`Static image clip details:`, {
        id: clip.id,
        startTime: clip.startTime,
        endTime: clip.endTime,
        duration: clip.endTime - clip.startTime,
        image: clip.image ? "Image present" : "No image"
      });
    }
    
    // Highlight the selected clip visually
    const allClips = document.querySelectorAll('.timeline-clip');
    allClips.forEach(el => {
      el.classList.remove('ring-2', 'ring-yellow-400');
    });
    
    const selectedElement = document.getElementById(`clip-${clip.id}`);
    if (selectedElement) {
      selectedElement.classList.add('ring-2', 'ring-yellow-400');
    }
    
    if (onClipClick) {
      // Check if onClipClick expects an index or a clip object
      if (typeof clipIndex === 'number') {
        // If we have an index, pass it
        console.log("Calling onClipClick with index:", clipIndex);
        onClipClick(clipIndex);
      } else {
        // Otherwise just pass the clip object
        console.log("Calling onClipClick with clip object:", clip);
        onClipClick(clip);
      }
    }
  };
  
  // Cleanup auto-scroll on unmount
  useEffect(() => {
    return () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [autoScrollInterval]);
  
  // Effect for playback control
  useEffect(() => {
    let animationFrame = null;
    let lastPlayingClip = null;
    
    const updatePlayState = async () => {
      try {
        // Setup video/audio elements
        const video = videoRef.current;
        const audio = audioRef.current;
        const staticPreview = document.getElementById('static-image-preview');
        const staticImg = document.getElementById('static-preview-img');
        const placeholder = document.getElementById('preview-placeholder');
        
        // Find the clip at current time position
        const clipAtCurrentTime = getCurrentClip(clips, currentTime);
        
        // Handle play/pause state
        if (isPlaying) {
          // Hide placeholder when playing
          if (placeholder) {
            placeholder.style.opacity = '0';
          }
          
          // Handle clip transitions
          if (clipAtCurrentTime !== lastPlayingClip) {
            lastPlayingClip = clipAtCurrentTime;
            
            // Reset audio/video when switching clips
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
              audio.src = '';
            }
            
            if (video) {
              video.pause();
              video.currentTime = 0;
              video.src = '';
              video.style.display = 'none';
            }
            
            // Hide static image preview
            if (staticPreview) {
              staticPreview.style.display = 'none';
            }
            
            // Set up playback for the current clip
            if (clipAtCurrentTime) {
              console.log('Setting up playback for clip:', clipAtCurrentTime.id, clipAtCurrentTime.type);
              
              try {
                // Handle video clips
                if (clipAtCurrentTime.type === 'video') {
                  const videoUrl = clipAtCurrentTime.videoUrl || clipAtCurrentTime.animationUrl;
                  if (videoUrl) {
                    console.log('Playing video with URL:', videoUrl);
                    video.src = videoUrl;
                    video.currentTime = 0;
                    video.style.display = 'block';
                    video.play().catch(e => console.log('Video autoplay prevented:', e));
                  } else {
                    console.error('No video URL found for video clip');
                  }
                } 
                // Handle static image clips
                else if (clipAtCurrentTime.type === 'static' && clipAtCurrentTime.image) {
                  console.log('Displaying static image:', clipAtCurrentTime.id);
                  if (staticImg && staticPreview) {
                    staticImg.src = clipAtCurrentTime.image;
                    staticPreview.style.display = 'block';
                  } else {
                    console.error('Static image preview elements not found');
                  }
                } 
                // Handle sound clips - check multiple possible URL property names
                else if (clipAtCurrentTime.type === 'sound') {
                  const soundUrl = clipAtCurrentTime.soundUrl || clipAtCurrentTime.url;
                  if (soundUrl) {
                    console.log('Playing sound with URL:', soundUrl);
                    audio.src = soundUrl;
                    audio.currentTime = 0;
                    audio.play().catch(e => console.log('Audio autoplay prevented:', e));
                  } else {
                    console.error('No sound URL found for sound clip');
                  }
                } 
                // Handle narration clips
                else if (clipAtCurrentTime.type === 'narration' && clipAtCurrentTime.narrationUrl) {
                  console.log('Playing narration with URL:', clipAtCurrentTime.narrationUrl);
                  audio.src = clipAtCurrentTime.narrationUrl;
                  audio.currentTime = 0;
                  audio.play().catch(e => console.log('Narration autoplay prevented:', e));
                }
              } catch (err) {
                console.error("Error setting up clip playback:", err);
              }
            }
          }
          
          // Advance time for animation
          setCurrentTime(prev => {
            const newTime = prev + 1/60; // Roughly 60fps
            
            // Loop back to start if we hit the end
            if (newTime >= totalDuration) {
              return 0;
            }
            
            // Update scrubber position
            setScrubPosition((newTime / totalDuration) * 100);
            return newTime;
          });
          
          // Request next frame
          animationFrame = requestAnimationFrame(updatePlayState);
        } else {
          // Show placeholder when paused
          if (placeholder) {
            placeholder.style.opacity = '1';
          }
          
          // Pause playback
          if (video && !video.paused) {
            video.pause();
          }
          
          if (audio && !audio.paused) {
            audio.pause();
          }
        }
      } catch (error) {
        console.error("Error in playback loop:", error);
        setIsPlaying(false);
      }
    };
    
    // Start the playback loop if playing
    if (isPlaying) {
      animationFrame = requestAnimationFrame(updatePlayState);
    }
    
    // Cleanup animation frame on state change
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, totalDuration, clips, currentTime]);
  
  // Prevent auto-playing when clips are added/modified
  useEffect(() => {
    // This will run whenever clips change
    console.log("Clips updated, ensuring playback is stopped");
    setIsPlaying(false);
  }, [clips]);
  
  // Log clips structure for debugging
  useEffect(() => {
    if (clips && clips.length > 0) {
      console.log('Current clips in timeline:', clips.map(clip => ({
        id: clip.id,
        type: clip.type,
        startTime: clip.startTime,
        endTime: clip.endTime,
        hasImage: clip.type === 'static' ? !!clip.image : undefined,
        hasVideoUrl: clip.type === 'video' ? !!clip.videoUrl : undefined,
        hasSoundUrl: clip.type === 'sound' ? !!clip.soundUrl : undefined,
      })));
    }
  }, [clips]);
  
  // Modify the updateClip function to finalize clips when they're updated in the timeline
  const updateClip = (updatedClip) => {
    console.log("Updating clip in timeline:", updatedClip.id);
    
    // Always finalize the clip when it's added or updated in the timeline
    const finalizedClip = finalizeClipForTimeline(updatedClip);
    
    // Update in local state
    if (onUpdateClip) {
      console.log("Finalizing clip for timeline:", finalizedClip.id);
      onUpdateClip(finalizedClip);
    }
    
    // Provide feedback for successful change
    if (typeof toast !== 'undefined') {
      toast.success(`Clip updated`);
    }
  };
  
  // Replace the handleClipPositionChange function to use our finalized clip
  const handleClipPositionChange = (clipId, newPosition) => {
    console.log(`Shifting clip ${clipId} to position ${newPosition}`);
    
    // Get the clip to adjust
    const clipToAdjust = localClips.find(clip => clip.id === clipId);
    if (!clipToAdjust) {
      console.error(`Clip with ID ${clipId} not found`);
      return;
    }
    
    // Parse the new value and validate
    const parsedPosition = parseFloat(newPosition);
    if (isNaN(parsedPosition)) {
      console.error(`Invalid position value: ${newPosition}`);
      toast.error("Please enter a valid number");
      return;
    }
    
    // Calculate the duration which should be preserved
    const duration = clipToAdjust.endTime - clipToAdjust.startTime;
    
    // Create updated clip with new start and end times, preserving duration
    const updatedClip = { 
      ...clipToAdjust,
      startTime: parsedPosition,
      endTime: parsedPosition + duration
    };
    
    // Ensure we're not going beyond timeline bounds
    if (updatedClip.endTime > 120) {
      const maxStartPosition = 120 - duration;
      updatedClip.startTime = maxStartPosition;
      updatedClip.endTime = 120;
    }
    
    // Check for collisions with other clips of the same type
    const otherClips = localClips.filter(c => c.id !== clipId && c.type === clipToAdjust.type);
    const hasCollision = otherClips.some(otherClip => 
      updatedClip.startTime < otherClip.endTime && updatedClip.endTime > otherClip.startTime
    );
    
    if (hasCollision) {
      // If there's a collision, show a warning and don't apply the change
      toast.error("This position overlaps with another clip");
      return;
    }
    
    // Update the visual position of the clip in the timeline
    const clipElement = document.getElementById(`clip-${clipId}`);
    if (clipElement) {
      // Add a smooth transition
      clipElement.style.transition = 'left 0.3s ease';
      
      // Update position
      clipElement.style.left = `${timeToPixels(updatedClip.startTime)}px`;
      
      // Reset transition after animation completes
      setTimeout(() => {
        if (clipElement) {
          clipElement.style.transition = '';
        }
      }, 300);
    }
    
    // Update local state for immediate visual feedback
    setLocalClips(prevClips => 
      prevClips.map(clip => clip.id === clipId ? updatedClip : clip)
    );
    
    // Also update selected clip if this is the selected clip
    if (selectedClip && selectedClip.id === clipId) {
      handleClipSelection(updatedClip, localClips.findIndex(c => c.id === clipId));
    }
    
    // Update clips in parent component with finalized clip
    updateClip(updatedClip);
  };
  
  // Replace the handleClipTimeAdjustment to use finalized clips
  const handleClipTimeAdjustment = (clipId, property, newValue) => {
    console.log(`Adjusting clip ${clipId} ${property} to ${newValue}`);
    
    // Get the clip to adjust
    const clipToAdjust = localClips.find(clip => clip.id === clipId);
    if (!clipToAdjust) {
      console.error(`Clip with ID ${clipId} not found`);
      return;
    }
    
    // Parse the new value and validate
    const parsedValue = parseFloat(newValue);
    if (isNaN(parsedValue)) {
      console.error(`Invalid value for ${property}: ${newValue}`);
      toast.error("Please enter a valid number");
      return;
    }
    
    // Create updated clip
    let updatedClip = { ...clipToAdjust };
    
    // For start time adjustment, need to ensure we stay within valid range
    if (property === 'startTime') {
      // Ensure start time is not negative and not too close to end
      const minValue = 0;
      const maxValue = clipToAdjust.endTime - 0.5;  // Minimum clip duration of 0.5s
      
      updatedClip.startTime = Math.max(minValue, Math.min(parsedValue, maxValue));
    } 
    // For end time adjustment, ensure it's after start and doesn't exceed timeline limit
    else if (property === 'endTime') {
      const minValue = clipToAdjust.startTime + 0.5;  // Minimum clip duration of 0.5s
      const maxValue = 120;  // Maximum timeline duration
      
      updatedClip.endTime = Math.max(minValue, Math.min(parsedValue, maxValue));
    }
    
    // Check for collisions with other clips of the same type
    const otherClips = localClips.filter(c => c.id !== clipId && c.type === clipToAdjust.type);
    const hasCollision = otherClips.some(otherClip => 
      updatedClip.startTime < otherClip.endTime && updatedClip.endTime > otherClip.startTime
    );
    
    if (hasCollision) {
      toast.error("This position overlaps with another clip");
      return;
    }
    
    // Update the visual position of the clip in the timeline
    const clipElement = document.getElementById(`clip-${clipId}`);
    if (clipElement) {
      // Add a smooth transition
      clipElement.style.transition = 'left 0.3s ease, width 0.3s ease';
      
      // Update position and width
      if (property === 'startTime') {
        clipElement.style.left = `${timeToPixels(updatedClip.startTime)}px`;
        clipElement.style.width = `${timeToPixels(updatedClip.endTime - updatedClip.startTime)}px`;
      } else if (property === 'endTime') {
        clipElement.style.width = `${timeToPixels(updatedClip.endTime - updatedClip.startTime)}px`;
      }
      
      // Reset transition after animation completes
      setTimeout(() => {
        if (clipElement) {
          clipElement.style.transition = '';
        }
      }, 300);
    }
    
    // First update local state for immediate visual feedback
    setLocalClips(prevClips => 
      prevClips.map(clip => clip.id === clipId ? updatedClip : clip)
    );
    
    // Also update selected clip if this is the selected clip
    if (selectedClip && selectedClip.id === clipId) {
      handleClipSelection(updatedClip, localClips.findIndex(c => c.id === clipId));
    }
    
    // Update clips in parent component with finalized clip
    updateClip(updatedClip);
  };
  
  // Add direct drag functionality for clips
  // Note: Edge-based trimming has been replaced with numeric inputs in the clip properties panel
  const handleDirectDragStart = (e, clip) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start dragging if we're already dragging
    if (directDragState) return;
    
    const trackContainer = e.currentTarget.closest('.overflow-x-auto');
    if (!trackContainer) {
      console.error("No track container found for dragging");
      return;
    }
    
    const trackRect = trackContainer.getBoundingClientRect();
    const scrollLeft = trackContainer.scrollLeft;
    
    // Calculate offset from the left edge of the clip
    const clipLeft = e.currentTarget.getBoundingClientRect().left - trackRect.left + scrollLeft;
    const mouseX = e.clientX - trackRect.left + scrollLeft;
    const offsetX = mouseX - clipLeft;
    
    console.log(`Starting drag for clip ${clip.id}, offset: ${offsetX}px, startTime: ${clip.startTime}s`);
    
    // Also select the clip when starting to drag
    setSelectedClipId(clip.id);
    handleClipSelection(clip, clips.findIndex(c => c.id === clip.id));
    
    // Store initial state
    setDirectDragState({
      clip,
      trackContainer,
      mouseStartX: mouseX,
      offsetX,
      originalStartTime: clip.startTime,
      originalEndTime: clip.endTime,
      trackRect,
      isDragging: true
    });
    
    // Apply visual feedback
    e.currentTarget.style.cursor = 'grabbing';
    e.currentTarget.style.boxShadow = '0px 0px 10px rgba(255, 193, 7, 0.7)';
    e.currentTarget.style.zIndex = '20';
    
    // Add document event listeners
    document.addEventListener('mousemove', handleDirectDragMove);
    document.addEventListener('mouseup', handleDirectDragEnd);
  };
  
  const handleDirectDragMove = (e) => {
    if (!directDragState || !directDragState.isDragging) return;
    
    e.preventDefault();
    
    const { trackContainer, offsetX, clip, originalStartTime, originalEndTime } = directDragState;
    const duration = originalEndTime - originalStartTime;
    
    if (!trackContainer) {
      console.error("Track container lost during drag");
      return;
    }
    
    const trackRect = trackContainer.getBoundingClientRect();
    const scrollLeft = trackContainer.scrollLeft;
    
    // Calculate new position
    const mouseX = e.clientX - trackRect.left + scrollLeft;
    const clipX = mouseX - offsetX;
    const newStartTime = Math.max(0, clipX / (100 * zoomLevel));
    const newEndTime = newStartTime + duration;
    
    // Check for collisions with other clips of the same type
    const otherClips = localClips.filter(c => c.id !== clip.id && c.type === clip.type);
    const hasCollision = otherClips.some(otherClip => 
      newStartTime < otherClip.endTime && newEndTime > otherClip.startTime
    );
    
    // Create a temporarily updated clip to maintain internal state consistency
    const updatedClip = {
      ...clip,
      startTime: newStartTime,
      endTime: newEndTime
    };
    
    // Update our local clips during dragging (doesn't affect parent state yet)
    if (!hasCollision) {
      setLocalClips(prevClips => 
        prevClips.map(c => c.id === clip.id ? updatedClip : c)
      );
    }
    
    // Update clip visual position
    const clipElement = document.getElementById(`clip-${clip.id}`);
    if (clipElement) {
      // Use absolute positioning with left instead of marginLeft
      clipElement.style.left = `${timeToPixels(newStartTime)}px`;
      
      // Visual feedback based on collision state
      if (hasCollision) {
        clipElement.style.boxShadow = '0px 0px 10px rgba(255, 0, 0, 0.7)';
      } else {
        clipElement.style.boxShadow = '0px 0px 10px rgba(255, 193, 7, 0.7)';
      }
      
      // Update the width in case we need to adapt to changes during drag
      clipElement.style.width = `${timeToPixels(duration)}px`;
    } else {
      console.warn(`Clip element not found for id: clip-${clip.id}`);
    }
    
    // Update drag state
    setDirectDragState({
      ...directDragState,
      newStartTime,
      newEndTime,
      hasCollision,
      updatedClip // Store the updated clip in drag state for reference
    });
    
    // Update time display during drag if needed
    if (selectedClip && selectedClip.id === clip.id && !hasCollision) {
      // This keeps the clip property panel in sync with the visual position
      handleClipSelection(updatedClip, localClips.findIndex(c => c.id === clip.id));
    }
  };
  
  const handleDirectDragEnd = (e) => {
    if (!directDragState) return;
    
    // Remove document event listeners
    document.removeEventListener('mousemove', handleDirectDragMove);
    document.removeEventListener('mouseup', handleDirectDragEnd);
    
    const { clip, newStartTime, newEndTime, hasCollision, updatedClip } = directDragState;
    
    // Find and update the clip element
    const clipElement = document.getElementById(`clip-${clip.id}`);
    if (clipElement) {
      clipElement.style.cursor = '';
      clipElement.style.boxShadow = '';
      clipElement.style.zIndex = '10';
      
      // Reset any inline styles that might conflict with the updated clip
      clipElement.style.transition = 'left 0.2s ease';
    }
    
    // Only update clip position if valid and no collision
    if (!hasCollision && typeof newStartTime === 'number' && typeof newEndTime === 'number') {
      console.log(`Drag complete: clip ${clip.id} moved to ${newStartTime.toFixed(2)} - ${newEndTime.toFixed(2)}`);
      
      // Create updated clip with cleaned values
      const finalClip = {
        ...clip,
        startTime: parseFloat(newStartTime.toFixed(2)),
        endTime: parseFloat(newEndTime.toFixed(2))
      };
      
      // Update via parent component - this makes the change permanent
      if (onUpdateClip) {
        console.log("Finalizing clip position via onUpdateClip:", finalClip);
        onUpdateClip(finalClip);
      }
      
      // Make sure our local state is also consistent
      setLocalClips(prevClips => prevClips.map(c => c.id === clip.id ? finalClip : c));
      
      // If this was the selected clip, update the selection
      if (selectedClip && selectedClip.id === clip.id) {
        handleClipSelection(finalClip, clips.findIndex(c => c.id === clip.id));
      }
    } else if (hasCollision && clipElement) {
      // Reset position on collision
      console.log("Collision detected, resetting position");
      clipElement.style.left = `${timeToPixels(clip.startTime)}px`;
      
      // Reset local clips to match the original clip data
      setLocalClips(prevClips => prevClips.map(c => c.id === clip.id ? clip : c));
      
      // Show a toast or some visual feedback about the collision
      if (typeof toast !== 'undefined') {
        toast.error("Can't place clips over each other");
      }
    }
    
    // Clear drag state
    setTimeout(() => {
      if (clipElement) {
        clipElement.style.transition = '';
      }
      setDirectDragState(null);
    }, 200);
  };

  // Render a clip in the timeline
  const renderClip = (clip, index) => {
    // Calculate clip position and width based on times
    const clipLeft = timeToPixels(clip.startTime);
    const clipWidth = timeToPixels(clip.endTime - clip.startTime);
    
    let clipClass = "absolute rounded border-2 shadow-md cursor-grab opacity-90 hover:opacity-100 transition-opacity";
    let clipStyle = {
      left: `${clipLeft}px`,
      width: `${clipWidth}px`,
      height: "60px",
      zIndex: directDragState?.clip?.id === clip.id ? 20 : 10,
    };
    
    // Apply different styles based on clip type
    if (clip.type === "static_image") {
      clipClass += " border-purple-500 bg-purple-200";
    } else if (clip.type === "video") {
      clipClass += " border-blue-500 bg-blue-200";
    } else if (clip.type === "sound") {
      clipClass += " border-green-500 bg-green-200";
      clipStyle.height = "40px";
    }
    
    // Apply shadow and grab cursor if being dragged
    if (directDragState?.clip?.id === clip.id) {
      clipStyle.boxShadow = "0px 0px 10px rgba(255, 193, 7, 0.7)";
      clipStyle.cursor = "grabbing";
    }
    
    return (
      <div
        key={index}
        id={`clip-${clip.id}`}
        className={`${clipClass} timeline-clip`}
        style={clipStyle}
        onClick={(e) => {
          // Set the selected clip ID
          setSelectedClipId(clip.id);
          // Also call the handleClipSelection function to properly update selectedClip
          handleClipSelection(clip, index);
          e.stopPropagation();
        }}
        onMouseDown={(e) => handleDirectDragStart(e, clip)}
      >
        <div className="p-1 text-xs truncate font-semibold">
          {clip.name || `Clip ${index + 1}`}
          <div className="text-xs text-gray-600">
            {formatTime(clip.startTime)} - {formatTime(clip.endTime)}
          </div>
        </div>
      </div>
    );
  };
  
  // When selectedClip changes, reset the input values
  useEffect(() => {
    if (selectedClip) {
      // Reset input values when selected clip changes
      setInputValues({
        position: null,
        startTime: null,
        endTime: null
      });
    }
  }, [selectedClip?.id]);
  
  // For handling position input change
  const handlePositionInputChange = (e) => {
    setInputValues(prev => ({
      ...prev,
      position: e.target.value
    }));
  };
  
  // For handling start time input change
  const handleStartTimeInputChange = (e) => {
    setInputValues(prev => ({
      ...prev,
      startTime: e.target.value
    }));
  };
  
  // For handling end time input change
  const handleEndTimeInputChange = (e) => {
    setInputValues(prev => ({
      ...prev,
      endTime: e.target.value
    }));
  };
  
  // For applying position change
  const applyPositionChange = () => {
    if (inputValues.position !== null && selectedClip) {
      handleClipPositionChange(selectedClip.id, inputValues.position);
      // Clear input value after applying
      setInputValues(prev => ({
        ...prev,
        position: null
      }));
    }
  };
  
  // For applying start time change
  const applyStartTimeChange = () => {
    if (inputValues.startTime !== null && selectedClip) {
      handleClipTimeAdjustment(selectedClip.id, 'startTime', inputValues.startTime);
      // Clear input value after applying
      setInputValues(prev => ({
        ...prev,
        startTime: null
      }));
    }
  };
  
  // For applying end time change
  const applyEndTimeChange = () => {
    if (inputValues.endTime !== null && selectedClip) {
      handleClipTimeAdjustment(selectedClip.id, 'endTime', inputValues.endTime);
      // Clear input value after applying
      setInputValues(prev => ({
        ...prev,
        endTime: null
      }));
    }
  };
  
  return (
    <div className="text-white">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Timeline and Preview Column - Takes up 3/4 of the screen on large displays */}
        <div className="lg:col-span-3">
          {/* Top navigation and controls */}
          <div className="flex justify-between mb-4">
            <button
              onClick={onBackToProjects}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Projects
            </button>
            
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-800 rounded-lg border border-gray-700">
              <button
                onClick={togglePlayPause}
                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-full"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              
              <input
                type="range"
                min="0"
                max="100"
                value={scrubPosition}
                onChange={handleScrubberChange}
                className="w-48"
              />
              
              <span className="text-gray-300 text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>
          </div>
          
          {/* Video Preview Area */}
          <div className="bg-gray-900 rounded-lg mb-4 overflow-hidden relative border border-gray-700">
            <div className="aspect-[9/16] max-w-[500px] mx-auto bg-black flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center z-10" id="preview-placeholder" 
                   style={{ opacity: isPlaying ? 0 : 1, transition: 'opacity 0.3s ease' }}>
                {/* Placeholder visible when not playing */}
                <div className="text-gray-500 text-center">
                  <div className="text-xl font-bold">Timeline Preview</div>
                  <div className="text-sm">Clips will be shown here during playback</div>
                </div>
              </div>
              
              {/* Video element for playback */}
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain z-20"
                playsInline
                muted
                style={{ display: 'none' }}
              />
              
              {/* Static image preview element */}
              <div 
                id="static-image-preview" 
                className="absolute inset-0 w-full h-full z-20"
                style={{ display: 'none' }}
              >
                <img 
                  id="static-preview-img" 
                  className="w-full h-full object-contain" 
                  src="" 
                  alt="Static preview" 
                />
              </div>
              
              {/* Hidden audio element for playback */}
              <audio 
                ref={audioRef}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Timeline */}
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-700" ref={timelineRef}>
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
                
                <button
                  onClick={togglePlayPause}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-400">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>
            </div>
            
            {/* Timeline container with horizontal scrolling */}
            <div className="overflow-x-auto timeline-scroll-container">
              <div className="min-w-max">
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
                    scrollToCurrentTimeWrapper();
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
                
                {/* Timeline tracks */}
                <div className="flex flex-col space-y-2 relative">
                  {/* Position guide for snapping */}
                  {positionGuide && (
                    <SnapIndicator 
                      position={positionGuide.position} 
                      type={positionGuide.snapType || "time"} 
                    />
                  )}
                  
                  {/* Playhead */}
                  <div
                    className="absolute top-0 h-full w-5 cursor-col-resize z-30"
                    style={{
                      left: `${currentTime * 100 * zoomLevel}px`,
                      height: '100%',
                      transform: 'translateX(-50%)',
                      touchAction: 'none',
                    }}
                  >
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-red-500 transform -translate-x-1/2"></div>
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  
                  {/* Video track */}
                  <div className="video-track-container overflow-hidden">
                    <div className="text-gray-400 text-xs mb-1">Video</div>
                    <div className="relative" ref={videoTrackRef}>
                      <div 
                        className="flex h-10 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                        }}
                      >
                        {/* Video clips */}
                        {localClips
                          .filter(clip => clip.type === 'video' || clip.type === 'static')
                          .map((clip, clipIndex) => (
                            renderClip(clip, clipIndex))
                          )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sound track - Similar structure to video track */}
                  <div className="sound-track-container overflow-hidden">
                    <div className="text-gray-400 text-xs mb-1">Sound</div>
                    <div className="relative">
                      <div 
                        className="flex h-10 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                        }}
                      >
                        {/* Sound clips */}
                        {localClips
                          .filter(clip => clip.type === 'sound')
                          .map((clip, clipIndex) => (
                            renderClip(clip, clipIndex))
                          )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Narration track - Similar structure to video track */}
                  <div className="narration-track-container overflow-hidden">
                    <div className="text-gray-400 text-xs mb-1">Narration</div>
                    <div className="relative">
                      <div 
                        className="flex h-10 bg-gray-700 rounded-lg relative"
                        style={{ 
                          width: `${Math.max(Math.min(totalDuration, 120), 120) * 100 * zoomLevel}px`, 
                          minWidth: '500px'
                        }}
                      >
                        {/* Narration clips */}
                        {localClips
                          .filter(clip => clip.type === 'narration')
                          .map((clip, clipIndex) => (
                            renderClip(clip, clipIndex))
                          )}
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
          {/* Story Editor Tab */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Story Editor</h2>
            <div className="text-amber-400 text-sm mb-3 p-2 bg-amber-900 bg-opacity-30 rounded-md">
              Please complete these fields before saving or exporting your animation.
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Story Title</label>
                <input
                  type="text"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Enter story title"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
                </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                />
            </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your story"
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-24"
                />
              </div>
              
              <button
                onClick={onSaveProject}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mb-2 relative overflow-hidden flex items-center justify-center gap-2 font-bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                SAVE PROJECT
              </button>
              
              <div className="text-xs text-gray-400 mb-2 text-center bg-gray-700 p-2 rounded border border-gray-600">
                <strong className="text-yellow-400">Important:</strong> Your work is not saved automatically. Click "Save Project" to store your changes.
              </div>
              
              <button
                onClick={onShowPublishModal}
                className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                Export Animation
            </button>
            </div>
          </div>
          
          {/* Clip Properties Tab */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">Clip Properties</h2>
            {selectedClip && localClips.some(clip => clip.id === selectedClip.id) ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Clip Type</label>
                  <div className="text-white capitalize">{selectedClip.type}</div>
                </div>
                
                {/* New clip timing controls */}
                <div className="border border-gray-700 rounded p-4 bg-gray-800">
                  <h3 className="text-white text-sm font-semibold mb-4">Clip Timing Controls</h3>
                  
                  {/* Duration display */}
                  <div className="bg-gray-900 p-2 rounded mb-4 text-center">
                    <div className="text-gray-400 text-xs mb-1">Total Duration</div>
                    <div className="text-white text-lg font-mono">{(selectedClip.endTime - selectedClip.startTime).toFixed(1)}s</div>
                  </div>

                  {/* Clip position control */}
                  <div className="mb-5 pb-4 border-b border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-gray-300 font-medium">Clip Position</label>
                      <div className="text-gray-400 text-xs">
                        Current: {selectedClip.startTime.toFixed(1)}s
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Position adjustment buttons */}
                      <button 
                        onClick={() => {
                          const newPos = Math.max(0, selectedClip.startTime - 0.1);
                          handleClipPositionChange(selectedClip.id, newPos.toFixed(1));
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded flex items-center justify-center"
                      >
                        <span className="text-xl">-</span>
                      </button>
                      
                      {/* Position input field */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={inputValues.position !== null ? inputValues.position : selectedClip.startTime.toFixed(1)}
                          onChange={handlePositionInputChange}
                          onBlur={applyPositionChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full bg-gray-600 text-white border border-gray-500 rounded px-3 py-2 text-center"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          const maxPos = 120 - (selectedClip.endTime - selectedClip.startTime);
                          const newPos = Math.min(maxPos, selectedClip.startTime + 0.1);
                          handleClipPositionChange(selectedClip.id, newPos.toFixed(1));
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white w-8 h-8 rounded flex items-center justify-center"
                      >
                        <span className="text-xl">+</span>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      Moves entire clip without changing duration
                    </div>
                  </div>
                  
                  {/* Start time adjustment */}
                  <div className="mb-5 pb-4 border-b border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-gray-300 font-medium">Start Time</label>
                      <div className="text-gray-400 text-xs">
                        Current: {selectedClip.startTime.toFixed(1)}s
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          // Move start time earlier (decrease) - makes clip longer
                          const newStart = Math.max(0, selectedClip.startTime - 0.1);
                          handleClipTimeAdjustment(selectedClip.id, 'startTime', newStart.toFixed(1));
                        }}
                        className="bg-blue-800 hover:bg-blue-700 text-white w-8 h-8 rounded flex items-center justify-center"
                        title="Extend clip start"
                      >
                        <span className="text-xl">←</span>
                      </button>
                      
                      {/* Start time input field */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={inputValues.startTime !== null ? inputValues.startTime : selectedClip.startTime.toFixed(1)}
                          onChange={handleStartTimeInputChange}
                          onBlur={applyStartTimeChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full bg-blue-900 bg-opacity-30 text-white border border-blue-700 rounded px-3 py-2 text-center"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          // Move start time later (increase) - makes clip shorter
                          const minDuration = 0.5; // Minimum clip duration in seconds
                          const newStart = Math.min(selectedClip.endTime - minDuration, selectedClip.startTime + 0.1);
                          handleClipTimeAdjustment(selectedClip.id, 'startTime', newStart.toFixed(1));
                        }}
                        className="bg-blue-800 hover:bg-blue-700 text-white w-8 h-8 rounded flex items-center justify-center"
                        title="Shorten clip start"
                      >
                        <span className="text-xl">→</span>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      Adjusts start point (keeps end fixed)
                    </div>
                  </div>
                  
                  {/* End time adjustment */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-gray-300 font-medium">End Time</label>
                      <div className="text-gray-400 text-xs">
                        Current: {selectedClip.endTime.toFixed(1)}s
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          // Move end time earlier (decrease) - makes clip shorter
                          const minDuration = 0.5; // Minimum clip duration in seconds
                          const newEnd = Math.max(selectedClip.startTime + minDuration, selectedClip.endTime - 0.1);
                          handleClipTimeAdjustment(selectedClip.id, 'endTime', newEnd.toFixed(1));
                        }}
                        className="bg-green-800 hover:bg-green-700 text-white w-8 h-8 rounded flex items-center justify-center"
                        title="Shorten clip end"
                      >
                        <span className="text-xl">←</span>
                      </button>
                      
                      {/* End time input field */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={inputValues.endTime !== null ? inputValues.endTime : selectedClip.endTime.toFixed(1)}
                          onChange={handleEndTimeInputChange}
                          onBlur={applyEndTimeChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="w-full bg-green-900 bg-opacity-30 text-white border border-green-700 rounded px-3 py-2 text-center"
                        />
                      </div>
                      
                      <button 
                        onClick={() => {
                          // Move end time later (increase) - makes clip longer
                          const newEnd = Math.min(120, selectedClip.endTime + 0.1);
                          handleClipTimeAdjustment(selectedClip.id, 'endTime', newEnd.toFixed(1));
                        }}
                        className="bg-green-800 hover:bg-green-700 text-white w-8 h-8 rounded flex items-center justify-center"
                        title="Extend clip end"
                      >
                        <span className="text-xl">→</span>
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      Adjusts end point (keeps start fixed)
                    </div>
                  </div>
                  
                  {/* Timeline visualization */}
                  <div className="mt-4">
                    <div className="h-6 w-full bg-gray-900 rounded-md overflow-hidden relative">
                      {/* Position indicator */}
                      <div className="absolute top-0 bottom-0 bg-gray-800 rounded-md border border-gray-600" 
                           style={{
                             left: `${(selectedClip.startTime / 120) * 100}%`,
                             width: `${((selectedClip.endTime - selectedClip.startTime) / 120) * 100}%`
                           }}>
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                          {(selectedClip.endTime - selectedClip.startTime).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0s</span>
                      <span>30s</span>
                      <span>60s</span>
                      <span>90s</span>
                      <span>120s</span>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons based on clip type */}
                <div className="space-y-2">
                  {selectedClip.type === 'video' && (
                    <button
                      onClick={() => {
                        if (clips.length > 0) {
                          const clipIndex = clips.findIndex(c => c.id === selectedClip.id);
                          if (clipIndex !== -1) {
                            onOpenClipEditor(clipIndex);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      Edit {selectedClip.type}
                    </button>
                  )}
                  
                  {selectedClip.type === 'sound' && (
                    <button
                      onClick={() => onAddClip('sound')}
                      className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                    >
                      Replace Sound
                    </button>
                  )}
                  
                  {selectedClip.type === 'narration' && (
                    <button
                      onClick={() => {
                        if (clips.length > 0) {
                          const clipIndex = clips.findIndex(c => c.id === selectedClip.id);
                          if (clipIndex !== -1) {
                            onOpenClipEditor(clipIndex);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm"
                    >
                      Edit Narration
                    </button>
                  )}
                  
                  {/* Delete button for all clip types */}
                  <button
                    onClick={() => {
                      if (onDeleteClip && selectedClip) {
                        if (window.confirm(`Are you sure you want to delete this ${selectedClip.type} clip?`)) {
                          onDeleteClip(selectedClip.id);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    Delete Clip
                  </button>
                </div>
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