import React, { useState, useEffect, useRef } from 'react';

// Helper function to format duration from seconds to MM:SS format
const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' + secs : secs}`;
};

const MangaViewer = ({ manga }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Get current page data
  const page = manga.pages[currentPage];
  const totalPages = manga.pages.length;
  const totalRows = page?.layout?.rows || 0;

  // Function to handle moving to the next row or page
  const handleNext = () => {
    if (currentRow < totalRows - 1) {
      // Move to next row
      setCurrentRow(currentRow + 1);
    } else if (currentPage < totalPages - 1) {
      // Move to next page, reset row to 0
      setCurrentPage(currentPage + 1);
      setCurrentRow(0);
      
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
    }
  };

  // Function to handle moving to the previous row or page
  const handlePrevious = () => {
    if (currentRow > 0) {
      // Move to previous row
      setCurrentRow(currentRow - 1);
    } else if (currentPage > 0) {
      // Move to previous page, set row to last row of that page
      const prevPage = manga.pages[currentPage - 1];
      const prevPageRows = prevPage?.layout?.rows || 0;
      
      setCurrentPage(currentPage - 1);
      setCurrentRow(prevPageRows - 1);
      
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
    }
  };

  // Handle audio playback when page changes
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
    <div className="manga-viewer bg-gray-900 min-h-screen flex flex-col">
      {/* Header with title and navigation */}
      <div className="bg-gray-800 p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-white text-xl font-bold">{manga.title || 'Untitled Manga'}</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-300 text-sm">
              Page {currentPage + 1} of {totalPages} • Row {currentRow + 1} of {totalRows}
            </span>
            
            {/* Audio control */}
            {page?.audioTrack && (
              <button 
                onClick={toggleAudio}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-2"
                title={audioPlaying ? "Pause Audio" : "Play Audio"}
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
      </div>
      
      {/* Main content area */}
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div 
          className="manga-page relative max-w-4xl w-full mx-auto border-[12px] border-double border-gray-800 shadow-xl rounded"
          style={{ 
            backgroundColor: page.backgroundColor || '#121212',
            minHeight: '70vh'
          }}
        >
          {/* Show only the current row */}
          {page.panels[currentRow] && (
            <div 
              className="grid h-full p-6"
              style={{
                gridTemplateColumns: page.panels[currentRow].length > 0 ? 
                  `repeat(${page.panels[currentRow].length}, minmax(0, 1fr))` : '1fr',
                gap: page.gutterSize === 'small' ? '6px' : 
                     page.gutterSize === 'large' ? '18px' : '10px',
              }}
            >
              {page.panels[currentRow].map((panel, colIndex) => (
                <div 
                  key={panel.id}
                  className="manga-panel border-[3px] border-ink-black relative overflow-hidden"
                  style={{
                    gridColumn: panel.colSpan > 1 ? `span ${panel.colSpan}` : 'auto',
                    gridRow: panel.rowSpan > 1 ? `span ${panel.rowSpan}` : 'auto',
                    backgroundColor: '#121212',
                  }}
                >
                  {panel.image ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={panel.image} 
                        alt={`Panel ${currentRow}-${colIndex}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error(`Error loading image for panel ${panel.id}:`, e);
                          e.target.onerror = null;
                          e.target.src = '/assets/images/placeholders/image.png';
                        }}
                      />
                      <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-gray-500 text-sm">No image</p>
                    </div>
                  )}
                  
                  {/* Text bubbles */}
                  {panel.textBoxes && panel.textBoxes.map(textBox => (
                    <div
                      key={textBox.id}
                      className={`absolute ${
                        textBox.type === 'speech' ? 'bg-white rounded-full p-3' :
                        textBox.type === 'thought' ? 'bg-white rounded-full p-3 bubble-thought' :
                        textBox.type === 'narration' ? 'bg-amber-50 p-2' :
                        textBox.type === 'yell' ? 'bg-yellow-100 p-3 bubble-yell' : 'bg-white p-2'
                      }`}
                      style={{
                        top: `${textBox.position?.y || 0}px`,
                        left: `${textBox.position?.x || 0}px`,
                        maxWidth: '80%',
                        ...(textBox.style || {})
                      }}
                    >
                      <p className={`text-black ${
                        textBox.style?.bold ? 'font-bold' : ''
                      } ${
                        textBox.style?.italic ? 'italic' : ''
                      }`}
                      style={{
                        fontSize: `${textBox.style?.fontSize || 14}px`,
                        color: textBox.style?.color || '#000000'
                      }}
                      >
                        {textBox.text}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          
          {/* Audio info overlay */}
          {page.audioTrack && audioPlaying && (
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-tl text-xs">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="truncate max-w-[200px]">{page.audioTrack.title}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation controls */}
        <div className="mt-6 flex justify-center space-x-4">
          <button 
            onClick={handlePrevious}
            disabled={currentPage === 0 && currentRow === 0}
            className={`px-4 py-2 rounded ${
              currentPage === 0 && currentRow === 0 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Previous
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentPage === totalPages - 1 && currentRow === totalRows - 1}
            className={`px-4 py-2 rounded ${
              currentPage === totalPages - 1 && currentRow === totalRows - 1
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MangaViewer; 