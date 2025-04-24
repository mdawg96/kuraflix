// Utility functions for scrolling in the TimelineEditor

/**
 * Scrolls the timeline to make the current time visible
 * @param {HTMLElement} containerRef - The scroll container element
 * @param {number} currentTime - Current playback time
 * @param {number} zoomLevel - Current zoom level
 */
export const scrollToCurrentTime = (containerRef, currentTime, zoomLevel) => {
  if (!containerRef) return;
  
  // Get the container reference and calculate the time position
  const container = containerRef;
  
  // Calculate pixel position of current time
  const timePosition = currentTime * 100 * zoomLevel;
  
  // Get container dimensions
  const containerWidth = container.clientWidth;
  const scrollLeft = container.scrollLeft;
  const scrollRight = scrollLeft + containerWidth;
  
  // Check if the time position is outside the visible area
  if (timePosition < scrollLeft + 20) {
    // Scroll left to show the time (with a small margin)
    container.scrollTo({
      left: Math.max(0, timePosition - 100),
      behavior: 'smooth'
    });
  } else if (timePosition > scrollRight - 100) {
    // Scroll right to show the time (with a small margin)
    container.scrollTo({
      left: timePosition - containerWidth + 200,
      behavior: 'smooth'
    });
  }
};

/**
 * Handles auto-scrolling when drag or trim operations approach screen edges
 * @param {Event} e - Mouse event
 * @param {HTMLElement} trackContainer - The scrollable container
 * @param {Function} setAutoScrollInterval - State setter for auto-scroll interval
 * @param {number|null} autoScrollInterval - Current auto-scroll interval ID
 */
export const handleAutoScroll = (e, trackContainer, setAutoScrollInterval, autoScrollInterval) => {
  // Handle auto-scrolling near the edges
  if (!trackContainer) return;
  
  const viewportWidth = trackContainer.clientWidth;
  const edgeThreshold = 100; // pixels from edge to trigger scrolling
  
  // Get mouse position relative to the viewport
  const containerRect = trackContainer.getBoundingClientRect();
  const relativeX = e.clientX - containerRect.left;
  
  // Check if mouse is near left or right edge
  const isNearLeftEdge = relativeX < edgeThreshold;
  const isNearRightEdge = relativeX > viewportWidth - edgeThreshold;
  
  // Clear any existing interval to avoid multiple scrolls
  if (autoScrollInterval) {
    clearInterval(autoScrollInterval);
    setAutoScrollInterval(null);
  }
  
  // Set up auto-scrolling if near an edge
  if (isNearLeftEdge || isNearRightEdge) {
    const scrollSpeed = isNearLeftEdge ? 
      -5 * (1 - relativeX / edgeThreshold) : // Scroll left, faster when closer to edge
      5 * (1 - (viewportWidth - relativeX) / edgeThreshold); // Scroll right, faster when closer to edge
    
    const scrollAmount = Math.round(scrollSpeed * 5); // Adjust multiplier to control scroll speed
    
    // Set an interval to continuously scroll
    const interval = setInterval(() => {
      trackContainer.scrollBy({ left: scrollAmount });
    }, 16); // ~60fps
    
    setAutoScrollInterval(interval);
  }
}; 