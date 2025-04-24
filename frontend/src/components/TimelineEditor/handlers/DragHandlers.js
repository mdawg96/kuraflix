// Drag handling functionality for timeline clips

/**
 * Initiates the drag operation for a clip
 * @param {Event} e - Mouse event
 * @param {Object} clip - The clip being dragged
 * @param {number} index - Index of the clip in the array
 * @param {Object} refs - References to DOM elements
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @returns {void}
 */
export const startDrag = (e, clip, index, refs, state, setState) => {
  e.preventDefault();
  e.stopPropagation(); // Prevent event bubbling to parent elements
  
  const { 
    autoScrollInterval, 
    isTrimming,
    zoomLevel
  } = state;
  
  const { 
    setDragState, 
    setDraggedClip, 
    setAutoScrollInterval 
  } = setState;
  
  // Don't start a new drag if one is in progress
  if (state.dragState?.isDragging || isTrimming) {
    console.log("Drag/trim already in progress, ignoring new drag attempt");
    return;
  }
  
  // Clear any existing auto-scroll interval
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    setAutoScrollInterval(null);
  }
  
  // Get track container
  const trackRef = clip.type === 'sound' ? document.querySelector('.sound-track-container') :
                   clip.type === 'narration' ? document.querySelector('.narration-track-container') :
                   refs.videoTrackRef.current;
                   
  if (!trackRef) {
    console.error("Could not find track reference for clip type:", clip.type);
    return;
  }
  
  const trackRect = trackRef.getBoundingClientRect();
  const trackContainer = trackRef.closest('.overflow-x-auto');
  const scrollLeft = trackContainer ? trackContainer.scrollLeft : 0;
  
  // Calculate initial click position relative to clip start
  const clipStartX = clip.startTime * 100 * zoomLevel;
  const clickX = e.clientX - trackRect.left + scrollLeft;
  const offsetX = clickX - clipStartX;
  
  console.log(`Starting drag for ${clip.type} clip ${clip.id}, offset: ${offsetX}px, startTime: ${clip.startTime}s, zoom: ${zoomLevel}`);
  
  // Set dragged clip for visual preview
  setDraggedClip({
    ...clip,
    startTime: clip.startTime,
    endTime: clip.endTime
  });
  
  // Create bound handlers with the current state and setters
  const boundHandleDrag = (e) => handleDrag(e, state, setState);
  const boundEndDrag = (e) => endDrag(e, state, setState, (updatedClips) => {
    if (setState.setClipsList) {
      setState.setClipsList(updatedClips);
    }
  });
  
  // Store references to the bound handlers for removal later
  setDragState(prevState => ({
    ...prevState,
    clip,
    index,
    offsetX,
    initialClickOffset: offsetX,
    originalStart: clip.startTime,
    originalEnd: clip.endTime,
    originalDuration: clip.endTime - clip.startTime,
    isDragging: true,
    trackContainer,
    clipType: clip.type,
    boundHandleDrag,
    boundEndDrag
  }));
  
  // Add global event listeners with bound handlers
  document.addEventListener('mousemove', boundHandleDrag);
  document.addEventListener('mouseup', boundEndDrag);
};

/**
 * Handles dragging motion
 * @param {Event} e - Mouse event
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @param {Function} calculateDistance - Function to calculate distance
 */
export const handleDrag = (e, state, setState) => {
  const { dragState, zoomLevel, clips } = state;
  const { setDragState, setPositionGuide, setDraggedClip } = setState;
  
  // Only continue if we're in drag state
  if (!dragState || !dragState.isDragging) return;
  
  e.preventDefault();
  
  const { 
    clip, 
    initialClickOffset, 
    trackContainer, 
    clipType, 
    originalDuration
  } = dragState;
  
  if (!trackContainer) return;
  
  // Get track element based on clip type
  const trackRef = clipType === 'sound' 
    ? document.querySelector('.sound-track-container') 
    : clipType === 'narration' 
      ? document.querySelector('.narration-track-container') 
      : document.querySelector('.video-track-container');
  
  if (!trackRef) return;
  
  // Calculate positions
  const trackRect = trackRef.getBoundingClientRect();
  const scrollLeft = trackContainer.scrollLeft;
  
  // Calculate mouse position relative to track
  const mouseX = e.clientX - trackRect.left + scrollLeft;
  
  // Calculate new startTime position (adjust by initial click offset)
  const newStartRaw = (mouseX - initialClickOffset) / (100 * zoomLevel);
  const newStart = Math.max(0, newStartRaw);
  
  // Calculate the end time based on the start and duration
  const newEnd = newStart + originalDuration;
  
  // Prevent overlapping with other clips of same type
  let finalStartTime = newStart;
  let finalEndTime = newEnd;
  let hasCollision = false;
  
  // Find other clips of the same type
  const otherClips = clips.filter(c => c.type === clipType && c.id !== clip.id);
  
  // Check for collisions with other clips
  for (const otherClip of otherClips) {
    // Check if our new position would overlap with this clip
    if (newStart < otherClip.endTime && newEnd > otherClip.startTime) {
      hasCollision = true;
      
      // Calculate how much we need to move to avoid collision
      const moveAfter = Math.abs(otherClip.endTime - newStart);
      const moveBefore = Math.abs(otherClip.startTime - newEnd);
      
      // Choose the smaller move distance
      if (moveAfter <= moveBefore) {
        // Move after this clip
        finalStartTime = otherClip.endTime;
        finalEndTime = finalStartTime + originalDuration;
      } else {
        // Move before this clip
        finalEndTime = otherClip.startTime;
        finalStartTime = finalEndTime - originalDuration;
      }
      
      // Ensure we're not negative
      if (finalStartTime < 0) {
        finalStartTime = 0;
        finalEndTime = originalDuration;
      }
      
      break; // Exit after finding the first collision
    }
  }
  
  // Only snap if very close to snap points
  const SNAP_THRESHOLD = 10; // 10px threshold for snapping
  
  // Calculate snap points
  const snapPoints = [];
  
  // Add second markers as possible snap points
  for (let i = 0; i <= 120; i++) {
    snapPoints.push({
      time: i,
      pixel: i * 100 * zoomLevel,
      type: 'second'
    });
  }
  
  // Get all clips of the same type for snapping
  document.querySelectorAll('.timeline-clip').forEach(clipElement => {
    // Skip the clip we're currently dragging
    if (clipElement.id === `clip-${clip.id}`) return;
    
    // Only consider clips of the same type for snapping
    const elementClipType = clipElement.dataset.clipType;
    if (elementClipType === clipType) {
      const clipStart = parseFloat(clipElement.dataset.startTime || 0);
      const clipEnd = parseFloat(clipElement.dataset.endTime || 0);
      
      snapPoints.push({
        time: clipStart,
        pixel: clipStart * 100 * zoomLevel,
        type: 'start',
        clipId: clipElement.id
      });
      
      snapPoints.push({
        time: clipEnd,
        pixel: clipEnd * 100 * zoomLevel,
        type: 'end',
        clipId: clipElement.id
      });
    }
  });
  
  // Find closest snap point for the start position if no collision
  let closestStartDist = SNAP_THRESHOLD;
  let snappedStartTime = finalStartTime;
  let isSnapped = false;
  let snapInfo = null;
  
  if (!hasCollision) {
    snapPoints.forEach(point => {
      const distance = Math.abs((finalStartTime * 100 * zoomLevel) - point.pixel);
      if (distance < closestStartDist) {
        closestStartDist = distance;
        snappedStartTime = point.time;
        isSnapped = true;
        snapInfo = point;
      }
    });
    
    if (isSnapped) {
      finalStartTime = snappedStartTime;
      finalEndTime = finalStartTime + originalDuration;
    }
  }
  
  // Update the visual position of the dragged clip
  const clipElement = document.getElementById(`clip-${clip.id}`);
  if (clipElement) {
    // Update visual position
    const newMarginLeft = finalStartTime * 100 * zoomLevel;
    clipElement.style.marginLeft = `${newMarginLeft}px`;
    
    // Add visual feedback based on state
    if (hasCollision) {
      // Red for collision
      clipElement.style.boxShadow = `0px 0px 10px rgba(255, 0, 0, 0.7)`;
      clipElement.dataset.snapped = 'false';
      clipElement.dataset.collision = 'true';
    } else if (isSnapped) {
      // Green for snapped
      const snapType = snapInfo.type === 'second' ? 'time' : 'clip';
      clipElement.style.boxShadow = `0px 0px 10px rgba(0, 255, 0, 0.7)`;
      clipElement.dataset.snapped = 'true';
      clipElement.dataset.snapType = snapType;
      clipElement.dataset.collision = 'false';
    } else {
      // Yellow for dragging
      clipElement.style.boxShadow = `0px 0px 10px rgba(255, 193, 7, 0.7)`;
      clipElement.dataset.snapped = 'false';
      clipElement.dataset.collision = 'false';
    }
  }
  
  // Update dragged clip preview
  setDraggedClip({
    ...clip,
    startTime: finalStartTime,
    endTime: finalEndTime
  });
  
  // Update marker position guide
  setPositionGuide({
    time: finalStartTime,
    position: finalStartTime * 100 * zoomLevel,
    isSnapped,
    snapType: snapInfo?.type
  });
  
  // Update drag state with new position
  setDragState({
    ...dragState,
    newStartTime: finalStartTime,
    newEndTime: finalEndTime,
    hasCollision: hasCollision
  });
  
  // Handle auto-scrolling if needed
  const trackWidth = trackRef.offsetWidth;
  const scrollThreshold = 50; // pixels from edge
  
  if (e.clientX - trackRect.left < scrollThreshold) {
    // Near left edge - scroll left
    if (!dragState.autoScrolling) {
      const autoScrollInterval = setInterval(() => {
        trackContainer.scrollLeft = Math.max(0, trackContainer.scrollLeft - 10);
      }, 16);
      
      setDragState({
        ...dragState,
        autoScrolling: true,
        autoScrollInterval
      });
    }
  } else if (trackWidth - (e.clientX - trackRect.left) < scrollThreshold) {
    // Near right edge - scroll right
    if (!dragState.autoScrolling) {
      const autoScrollInterval = setInterval(() => {
        trackContainer.scrollLeft += 10;
      }, 16);
      
      setDragState({
        ...dragState, 
        autoScrolling: true,
        autoScrollInterval
      });
    }
  } else if (dragState.autoScrolling) {
    // Clear auto-scroll if no longer near edges
    clearInterval(dragState.autoScrollInterval);
    setDragState({
      ...dragState,
      autoScrolling: false,
      autoScrollInterval: null
    });
  }
};

/**
 * Completes a drag operation
 * @param {Event} e - Mouse event
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @param {Function} updateClips - Function to update the clips
 */
export const endDrag = (e, state, setState, updateClips) => {
  const { dragState, clips } = state;
  const { setDragState, setDraggedClip, setPositionGuide } = setState;
  
  // Only proceed if we're in dragging state
  if (!dragState || !dragState.isDragging) return;
  
  // Remove event listeners first (using the bound handlers)
  if (dragState.boundHandleDrag) {
    document.removeEventListener('mousemove', dragState.boundHandleDrag);
  }
  
  if (dragState.boundEndDrag) {
    document.removeEventListener('mouseup', dragState.boundEndDrag);
  }
  
  // Clear any auto-scroll intervals
  if (dragState.autoScrolling && dragState.autoScrollInterval) {
    clearInterval(dragState.autoScrollInterval);
  }
  
  // Clear the position guide and dragged clip
  setPositionGuide(null);
  setDraggedClip(null);
  
  const { clip, newStartTime, newEndTime, hasCollision } = dragState;
  
  // Don't update the position if there's a collision
  if (hasCollision) {
    console.log("Drag ended with collision - not updating clip position");
    
    // Reset the visual position of the clip
    const clipElement = document.getElementById(`clip-${clip.id}`);
    if (clipElement) {
      clipElement.style.marginLeft = `${clip.startTime * 100 * state.zoomLevel}px`;
    }
  }
  // Only update if we have valid position data and no collision
  else if (typeof newStartTime === 'number' && typeof newEndTime === 'number') {
    console.log(`Drag complete: Updating clip ${clip.id} to start=${newStartTime}, end=${newEndTime}`);
    
    // Find the clip being dragged
    const clipIndex = clips.findIndex(c => c.id === clip.id);
    
    if (clipIndex !== -1) {
      // Update only this clip with its new position
      const updatedClip = {
        ...clips[clipIndex],
        startTime: newStartTime,
        endTime: newEndTime
      };
      
      // Apply updates without repositioning other clips
      if (updateClips) {
        updateClips(updatedClip);
      }
    }
  }
  
  // Reset the drag state
  setDragState(null);
  
  // Remove any snap highlight from all clip elements
  document.querySelectorAll('.timeline-clip').forEach(clipElement => {
    clipElement.style.boxShadow = '';
    clipElement.dataset.snapped = 'false';
    clipElement.dataset.collision = 'false';
    clipElement.style.zIndex = '10';
  });
}; 