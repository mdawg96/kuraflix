import React, { useState, useEffect, useRef } from 'react';
import mangaPlaceholderImage from '../assets/images/placeholders/manga.png';
import { Bubble } from './';

// Helper function to format duration from seconds to MM:SS format
const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' + secs : secs}`;
};

const MangaViewer = ({ manga, onExit }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const audioRef = useRef(null);
  const viewerRef = useRef(null);

  // Get current page data
  const page = manga.pages[currentPage];
  const totalPages = manga.pages.length;
  
  // Get the rows from the current page
  const pageRows = page?.panels || [];
  const totalRows = pageRows.length;
  
  // Get the current row's panels
  const currentRowPanels = pageRows[currentRow] || [];

  // Function to handle moving to the next row
  const handleNext = () => {
    setLastActivity(Date.now());
    if (currentRow < totalRows - 1) {
      // Move to next row in the same page
      setCurrentRow(currentRow + 1);
      
      // Scroll to top of the new row
      if (viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      }
      
      // Don't stop audio when navigating between rows on the same page
    } else if (currentPage < totalPages - 1) {
      // Move to first row of the next page
      setCurrentPage(currentPage + 1);
      setCurrentRow(0);
      
      // Scroll to top of the new row
      if (viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      }
      
      // Audio will be managed by the useEffect hook when currentPage changes
      // We don't need to manually stop it here
    }
  };

  // Function to handle moving to the previous row
  const handlePrevious = () => {
    setLastActivity(Date.now());
    if (currentRow > 0) {
      // Move to previous row in the same page
      setCurrentRow(currentRow - 1);
      
      // Scroll to top of the new row
      if (viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      }
      
      // Don't stop audio when navigating between rows on the same page
    } else if (currentPage > 0) {
      // Move to last row of the previous page
      const prevPage = manga.pages[currentPage - 1];
      const prevPageRows = prevPage?.panels || [];
      const prevPageTotalRows = prevPageRows.length;
      
      setCurrentPage(currentPage - 1);
      setCurrentRow(prevPageTotalRows - 1);
      
      // Scroll to top of the new row
      if (viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      }
      
      // Audio will be managed by the useEffect hook when currentPage changes
      // We don't need to manually stop it here
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      setLastActivity(Date.now());
      setShowControls(true);
      
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scrolling
        handleNext();
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        onExit && onExit();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, currentRow, totalRows, totalPages, onExit]); // Update dependencies

  // Handle mouse movement to show controls
  useEffect(() => {
    const handleMouseMove = () => {
      setLastActivity(Date.now());
      setShowControls(true);
    };

    // Add event listener
    window.addEventListener('mousemove', handleMouseMove);

    // Clean up
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Hide controls after inactivity
  useEffect(() => {
    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastActivity > 3000) {
        setShowControls(false);
      }
    }, 1000);

    return () => clearInterval(inactivityTimer);
  }, [lastActivity]);

  // Handle audio playback when page changes
  // In manga, audio is associated with the entire page, not individual rows
  useEffect(() => {
    const currentPageData = manga.pages[currentPage];
    
    // If there's an audio track for this page
    if (currentPageData?.audioTrack?.url) {
      // Create a new audio element
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(currentPageData.audioTrack.url);
      audio.loop = true;
      audioRef.current = audio;
      
      // Auto-play the audio
      audio.play()
        .then(() => {
          setAudioPlaying(true);
        })
        .catch(error => {
          console.error('Audio playback failed:', error);
          setAudioPlaying(false);
        });
    } else {
      // No audio for this page, stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setAudioPlaying(false);
      }
    }
    
    // Cleanup function to stop audio when component unmounts or page changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentPage, manga.pages]);

  // Toggle audio playback
  const toggleAudio = () => {
    setLastActivity(Date.now());
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setAudioPlaying(!audioPlaying);
    }
  };

  if (!manga || !manga.pages || manga.pages.length === 0) {
    return <div className="text-white text-center p-8">No manga data available</div>;
  }

  return (
    <div 
      className="manga-viewer fixed inset-0 z-50 bg-black overflow-y-auto"
      ref={viewerRef}
      onClick={() => {
        setLastActivity(Date.now());
        setShowControls(!showControls);
      }}
    >
      {/* Fullscreen content */}
      <div className="min-h-screen w-screen flex flex-col items-center py-16">
        {/* Display all panels from the current row vertically */}
          <div 
          className="w-full max-w-4xl mx-auto px-4 py-8"
            style={{
              backgroundColor: page.backgroundColor || '#121212',
            }}
          >
          {/* Display panels from current row stacked vertically */}
          {currentRowPanels.map((panel, panelIndex) => (
            <div 
              key={`panel-${panel.id || `${currentRow}-${panelIndex}`}`}
              className="manga-panel relative overflow-hidden border-ink-black mx-auto mb-8 max-w-4xl"
              style={{
                backgroundColor: '#121212',
              }}
            >
              {panel.image ? (
                <div className="w-full h-full relative">
                  <img 
                    src={panel.image} 
                    alt={`Panel ${currentRow}-${panelIndex}`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      console.error(`Error loading image for panel ${panel.id}:`, e);
                      e.target.onerror = null;
                      e.target.src = mangaPlaceholderImage;
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                </div>
              ) : (
                <div className="min-h-[200px] flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No image</p>
                </div>
              )}
              
              {/* Text bubbles */}
              {panel.textBoxes && panel.textBoxes.map(textBox => (
                <div
                  key={textBox.id}
                  className="absolute"
                  style={{
                    top: `${textBox.position?.y || 0}%`,
                    left: `${textBox.position?.x || 0}%`,
                    transform: 'translate(-50%, -50%)', // Center the bubble on its position point
                    zIndex: 10
                  }}
                >
                  <Bubble
                    type={textBox.type || 'speech'}
                    text={textBox.text || ''}
                    position={{ x: 0, y: 0 }} // Position is handled by parent div
                    tailPosition={textBox.tailPosition || 'bottom'}
                    fontSize={textBox.style?.fontSize}
                    size={textBox.size || 'md'}
                    bgColor={textBox.style?.backgroundColor || 'white'}
                    textColor={textBox.style?.color || 'black'}
                    className={`${textBox.style?.bold ? 'font-bold' : ''} ${textBox.style?.italic ? 'italic' : ''} ${textBox.style?.fontFamily ? `font-${textBox.style.fontFamily}` : 'font-comic'}`}
                    draggable={false}
                    scale={0.75} // Apply a scale factor for the manga viewer - slightly larger than page editor but still scaled to match panel editor
                  />
                </div>
              ))}
            </div>
          ))}
          </div>
      </div>
      
      {/* Floating controls - visible on hover/activity */}
      <div 
        className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onMouseOver={() => setShowControls(true)}
      >
        {/* Navigation buttons */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-6">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            disabled={currentPage === 0 && currentRow === 0}
            className={`p-3 rounded-full ${
              currentPage === 0 && currentRow === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            } focus:outline-none`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            disabled={currentPage === totalPages - 1 && currentRow === totalRows - 1}
            className={`p-3 rounded-full ${
              currentPage === totalPages - 1 && currentRow === totalRows - 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            } focus:outline-none`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Top control bar */}
        <div className="fixed top-0 left-0 right-0 flex justify-between items-center bg-black bg-opacity-50 p-4">
          <div className="flex items-center space-x-4">
            {/* Exit button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onExit && onExit();
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h1 className="text-white text-lg font-medium">{manga.title || 'Untitled Manga'}</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-gray-300 text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              Page {currentPage + 1} / {totalPages} • Row {currentRow + 1} / {totalRows}
            </span>
            
            {/* Audio control */}
            {page?.audioTrack && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAudio();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2 focus:outline-none"
              >
                {audioPlaying ? (
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
            )}
          </div>
        </div>

        {/* Keyboard shortcuts help */}
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-center text-gray-400 text-sm py-2 px-4 rounded">
          <p>Press <span className="bg-gray-700 px-2 py-1 rounded">Space</span> or <span className="bg-gray-700 px-2 py-1 rounded">→</span> for next row • <span className="bg-gray-700 px-2 py-1 rounded">←</span> for previous row • <span className="bg-gray-700 px-2 py-1 rounded">Esc</span> to exit</p>
        </div>
      </div>
      
      {/* Audio info overlay */}
      {page.audioTrack && audioPlaying && (
        <div className="fixed bottom-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-tl text-xs">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="truncate max-w-[200px]">{page.audioTrack.title}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MangaViewer; 