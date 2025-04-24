// Trim handling functionality for timeline clips

/**
 * Handle edge hover detection for clip trimming
 * @param {Event} e - Mouse event 
 * @param {Object} clip - The clip being hovered
 * @param {Object} state - Current state
 * @param {Object} setState - State setter functions
 * @returns {string|null} The edge being hovered ('start', 'end', or null)
 */
export const detectEdgeHover = (e, clip, state, setState) => {
  const { zoomLevel } = state;
  const { setHoverEdge } = setState;
  
  if (!e.target.closest('.timeline-clip')) return null;
  
  const clipElement = e.target.closest('.timeline-clip');
  
  // Get the bounding rect of the clip element
  const rect = clipElement.getBoundingClientRect();
  
  // Detect if we're hovering near the edges (within 5px)
  const edgeThreshold = 5;
  const mouseX = e.clientX;
  
  // Check start edge
  if (Math.abs(mouseX - rect.left) <= edgeThreshold) {
    setHoverEdge('start');
    return 'start';
  }
  
  // Check end edge
  if (Math.abs(mouseX - rect.right) <= edgeThreshold) {
    setHoverEdge('end');
    return 'end';
  }
  
  // Not hovering over an edge
  setHoverEdge(null);
  return null;
};

// Set up the end trim event handler for document level events
let endTrimOnDocument;

/**
 * Initializes the trim operation when a trim handle is clicked
 * @param {Event} e - The mouse down event
 * @param {String} clipId - ID of the clip being trimmed
 * @param {String} side - Which side is being trimmed ('left' or 'right')
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @param {Function} onTrimmingStateChange - Callback for trimming state changes
 */
export const startTrim = (e, clipId, side, state, setState, onTrimmingStateChange) => {
  const { clipsList } = state;
  const { setTrimState, setTrimPreview } = setState;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Find the clip we're trimming
  const clipToTrim = clipsList.find(clip => clip.id === clipId);
  if (!clipToTrim) return;
  
  // Store a copy of the original clip
  const originalClip = { ...clipToTrim };
  
  // Initialize trim state
  const newTrimState = {
    active: true,
    clipId,
    side,
    originalClip
  };
  
  // Set cursor style based on which side we're trimming
  document.body.style.cursor = side === 'start' || side === 'left' ? 'w-resize' : 'e-resize';
  
  // Initialize trim preview with original clip data
  setTrimPreview({ ...originalClip });
  
  // Create bound handlers with the current state and setters
  const boundHandleTrim = (e) => handleTrim(
    e, 
    { ...state, trimState: newTrimState }, 
    setState, 
    state.timelineRef, 
    state.pixelsToTime || ((pixels) => pixels / (100 * state.zoomLevel)),
    onTrimmingStateChange
  );
  
  const boundEndTrim = (e) => endTrim(
    e, 
    { ...state, trimState: newTrimState }, 
    setState, 
    state.timelineRef, 
    state.pixelsToTime || ((pixels) => pixels / (100 * state.zoomLevel)),
    onTrimmingStateChange
  );
  
  // Update trim state with bound handlers
  setTrimState({
    ...newTrimState,
    boundHandleTrim,
    boundEndTrim
  });
  
  // Notify parent component that trimming has started
  if (onTrimmingStateChange) {
    onTrimmingStateChange({
      trimming: true,
      clipId,
      side
    });
  }
  
  // Add event listeners with bound handlers
  document.addEventListener('mousemove', boundHandleTrim);
  document.addEventListener('mouseup', boundEndTrim);
};

/**
 * Handles the ongoing trimming operation during mouse movement
 * @param {Event} e - The mouse move event
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @param {Object} timelineRef - Reference to the timeline element
 * @param {Function} pixelsToTime - Function to convert pixels to time
 * @param {Function} onTrimmingStateChange - Callback for trimming state changes
 */
export const handleTrim = (e, state, setState, timelineRef, pixelsToTime, onTrimmingStateChange) => {
  const { clipsList, trimState, trimPreview } = state;
  const { setTrimPreview } = setState;
  
  // If no active trim state, exit
  if (!trimState || !trimState.active) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Get the clip being trimmed
  const targetClip = clipsList.find(clip => clip.id === trimState.clipId);
  if (!targetClip) return;
  
  // Get mouse position relative to timeline
  const timelineRect = timelineRef.current.getBoundingClientRect();
  const mouseX = e.clientX - timelineRect.left;
  
  // Convert current mouse position to time
  const mouseTimePosition = pixelsToTime(mouseX);
  
  // Create a new preview based on which side we're trimming
  let newPreview = { ...trimState.originalClip };
  
  // Set a minimum clip duration (e.g., 0.5 seconds)
  const MIN_DURATION = 0.5;
  
  // Define snap threshold in seconds (approx 10px at default zoom)
  const snapThresholdInSeconds = pixelsToTime(10) - pixelsToTime(0);
  let snapped = false;
  
  // Potential snap points (seconds)
  const snapPoints = [];
  
  // Add whole-second markers as snap points
  for (let i = 0; i <= 120; i++) {
    snapPoints.push(i);
  }
  
  // For "start" side trim (left edge)
  if (trimState.side === 'start' || trimState.side === 'left') {
    // Max allowed start time ensures minimum duration
    const maxStartTime = trimState.originalClip.endTime - MIN_DURATION;
    
    // Raw new start time before snapping
    let newStartTime = Math.min(mouseTimePosition, maxStartTime);
    
    // Check for snapping to whole seconds, but only if very close
    for (const snapPoint of snapPoints) {
      if (Math.abs(newStartTime - snapPoint) < snapThresholdInSeconds) {
        newStartTime = snapPoint;
        snapped = true;
        break;
      }
    }
    
    // Ensure start time is not negative
    newStartTime = Math.max(0, newStartTime);
    
    newPreview = {
      ...newPreview,
      startTime: newStartTime,
      duration: newPreview.endTime - newStartTime
    };
  } 
  // For "end" side trim (right edge)
  else if (trimState.side === 'end' || trimState.side === 'right') {
    // Min allowed end time ensures minimum duration
    const minEndTime = trimState.originalClip.startTime + MIN_DURATION;
    
    // Raw new end time before snapping
    let newEndTime = Math.max(mouseTimePosition, minEndTime);
    
    // Check for snapping to whole seconds, but only if very close
    for (const snapPoint of snapPoints) {
      if (Math.abs(newEndTime - snapPoint) < snapThresholdInSeconds) {
        newEndTime = snapPoint;
        snapped = true;
        break;
      }
    }
    
    // Ensure end time doesn't exceed timeline limit
    newEndTime = Math.min(120, newEndTime);
    
    newPreview = {
      ...newPreview,
      endTime: newEndTime,
      duration: newEndTime - newPreview.startTime
    };
  }
  
  // Update the trim preview
  setTrimPreview(newPreview);
  
  // Update cursor based on side being trimmed
  document.body.style.cursor = trimState.side === 'start' || trimState.side === 'left' ? 'w-resize' : 'e-resize';
};

/**
 * Ends a clip trimming operation and finalizes the changes
 * @param {Event} e - The mouse up event
 * @param {Object} state - Current component state
 * @param {Object} setState - State setter functions
 * @param {Object} timelineRef - Reference to the timeline element
 * @param {Function} pixelsToTime - Function to convert pixels to time
 * @param {Function} onTrimmingStateChange - Callback for trimming state changes
 */
export const endTrim = (e, state, setState, timelineRef, pixelsToTime, onTrimmingStateChange) => {
  const { clipsList, trimState, trimPreview } = state;
  const { setClipsList, setTrimState, setTrimPreview } = setState;
  
  // Remove event listeners
  if (trimState && trimState.boundHandleTrim) {
    document.removeEventListener('mousemove', trimState.boundHandleTrim);
  }
  
  if (trimState && trimState.boundEndTrim) {
    document.removeEventListener('mouseup', trimState.boundEndTrim);
  }
  
  // Reset cursor style
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  // Only proceed if we're in an active trimming state
  if (trimState && trimState.active && trimPreview) {
    // Create a copy of the clips list
    const updatedClips = [...clipsList];
    
    // Find the index of the clip being trimmed
    const clipIndex = updatedClips.findIndex(clip => clip.id === trimState.clipId);
    
    if (clipIndex !== -1) {
      // We found the clip - only update this specific clip
      updatedClips[clipIndex] = {
        ...updatedClips[clipIndex],
        startTime: trimPreview.startTime,
        endTime: trimPreview.endTime,
        duration: trimPreview.endTime - trimPreview.startTime
      };
      
      // Set the updated clips list - notice we're not repositioning anything else
      setClipsList(updatedClips);
      
      console.log(`Trim complete: Clip ${trimState.clipId} updated to start=${trimPreview.startTime}, end=${trimPreview.endTime}`);
    }
  }
  
  // Reset trimming state
  setTrimState(null);
  setTrimPreview(null);
  
  // Notify parent component that trimming has ended
  if (onTrimmingStateChange) {
    onTrimmingStateChange(false);
  }
}; 