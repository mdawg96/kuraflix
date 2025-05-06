import React from 'react';
import { Bubble } from './';
import mangaPlaceholderImage from '../assets/images/placeholders/manga.png';

// Helper function to format duration from seconds to MM:SS format
const formatDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' + secs : secs}`;
};

// Helper function to format dates for display
const formatDate = (dateString) => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    
    // Get current date for comparison
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If it's today, show time
    if (date >= today) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // If it's yesterday, show "Yesterday"
    else if (date >= yesterday && date < today) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    // Otherwise show full date
    else {
      return date.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (e) {
    console.error("Error formatting date:", e);
    return null;
  }
};

const PageEditor = ({
  pages,
  currentPage,
  setCurrentPage,
  selectedPanel,
  onPanelClick,
  onAddPage,
  onDeletePage,
  onAdjustLayout,
  onUpdatePanel,
  storyTitle,
  setStoryTitle,
  author,
  setAuthor,
  description,
  setDescription,
  onShowPublishModal,
  onShowSoundSelector,
  onSaveProject,
  currentProject
}) => {
  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Comic Page Display - Takes 3/4 of the space */}
        <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Page Editor</h2>
            <div className="flex space-x-2">
              {pages.length > 1 && (
                <button 
                  onClick={onDeletePage}
                  className="bg-red-600 hover:bg-red-700 text-white rounded p-1.5 text-sm"
                  title="Delete current page"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Page Layout Controls */}
          <div className="bg-gray-700 p-4 rounded-lg mb-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center">
              <label className="text-white text-sm mr-2">Rows:</label>
              <div className="flex">
                <button 
                  onClick={() => onAdjustLayout(Math.max(1, pages[currentPage].layout.rows - 1), pages[currentPage].layout.cols)}
                  className="px-2 py-1 bg-gray-800 text-white rounded-l border border-gray-600"
                  title="Decrease rows"
                >
                  -
                </button>
                <span className="px-3 py-1 bg-gray-900 text-white border-t border-b border-gray-600">
                  {pages[currentPage].layout.rows}
                </span>
                <button 
                  onClick={() => onAdjustLayout(Math.min(8, pages[currentPage].layout.rows + 1), pages[currentPage].layout.cols)}
                  className="px-2 py-1 bg-gray-800 text-white rounded-r border border-gray-600"
                  title="Increase rows"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              <label className="text-white text-sm mr-2">Default Columns:</label>
              <div className="flex">
                <button 
                  onClick={() => onAdjustLayout(pages[currentPage].layout.rows, Math.max(1, pages[currentPage].layout.cols - 1))}
                  className="px-2 py-1 bg-gray-800 text-white rounded-l border border-gray-600"
                  title="Decrease default columns"
                >
                  -
                </button>
                <span className="px-3 py-1 bg-gray-900 text-white border-t border-b border-gray-600">
                  {pages[currentPage].layout.cols}
                </span>
                <button 
                  onClick={() => onAdjustLayout(pages[currentPage].layout.rows, Math.min(5, pages[currentPage].layout.cols + 1))}
                  className="px-2 py-1 bg-gray-800 text-white rounded-r border border-gray-600"
                  title="Increase default columns"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="flex items-center">
              <label className="text-white text-sm mr-2">Gutter:</label>
              <select 
                value={pages[currentPage].gutterSize || 'medium'}
                onChange={(e) => {
                  const newPages = [...pages];
                  newPages[currentPage].gutterSize = e.target.value;
                  onUpdatePanel(newPages[currentPage]);
                }}
                className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="text-white text-sm mr-2">Background:</label>
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: '#232323' }} 
                  onClick={() => {
                    const newPages = [...pages];
                    newPages[currentPage].backgroundColor = '#232323';
                    onUpdatePanel(newPages[currentPage]);
                  }}
                  title="Dark gray (default)"
                ></div>
                <div 
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: '#121212' }} 
                  onClick={() => {
                    const newPages = [...pages];
                    newPages[currentPage].backgroundColor = '#121212';
                    onUpdatePanel(newPages[currentPage]);
                  }}
                  title="Black"
                ></div>
                <div 
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: '#1a1a2e' }} 
                  onClick={() => {
                    const newPages = [...pages];
                    newPages[currentPage].backgroundColor = '#1a1a2e';
                    onUpdatePanel(newPages[currentPage]);
                  }}
                  title="Dark blue"
                ></div>
                <div 
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                  style={{ backgroundColor: '#f5f5dc' }} 
                  onClick={() => {
                    const newPages = [...pages];
                    newPages[currentPage].backgroundColor = '#f5f5dc';
                    onUpdatePanel(newPages[currentPage]);
                  }}
                  title="Beige (traditional manga)"
                ></div>
                <input 
                  type="color" 
                  value={pages[currentPage].backgroundColor || '#232323'}
                  onChange={(e) => {
                    const newPages = [...pages];
                    newPages[currentPage].backgroundColor = e.target.value;
                    onUpdatePanel(newPages[currentPage]);
                  }}
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>
          </div>
          
          {/* Minimal Row Controls - Shown directly over the manga page */}
          <div className="manga-page-container relative z-10">
            {/* Manga Page Container */}
            <div 
              className="p-6 rounded-lg manga-page-container relative z-10 overflow-hidden border-[12px] border-double border-gray-800 shadow-[0_0_15px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(0,0,0,0.3)]" 
              style={{ 
                backgroundColor: pages[currentPage].backgroundColor || '#121212', // Default black background
                flex: 1
              }}
            >
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-manga-grid bg-[size:30px_30px] opacity-10"></div>
              
              {/* Row controls overlaid on the left side */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around h-full pl-1 z-20">
                {Array.from({ length: pages[currentPage].layout.rows }).map((_, rowIndex) => (
                  <div key={`row-control-${rowIndex}`} className="flex items-center opacity-40 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        const newPages = JSON.parse(JSON.stringify(pages));
                        if (newPages[currentPage].panels[rowIndex].length > 0) {
                          newPages[currentPage].panels[rowIndex].pop();
                          onUpdatePanel(newPages[currentPage]);
                        }
                      }}
                      className="w-4 h-4 bg-red-600 text-white text-[10px] rounded-sm flex items-center justify-center"
                      title="Decrease columns in this row"
                    >
                      -
                    </button>
                    <button
                      onClick={() => {
                        const newPages = JSON.parse(JSON.stringify(pages));
                        while (newPages[currentPage].panels.length <= rowIndex) {
                          newPages[currentPage].panels.push([]);
                        }
                        newPages[currentPage].panels[rowIndex].push({
                          id: `panel-${Date.now()}`,
                          colSpan: 1,
                          rowSpan: 1,
                          textBoxes: []
                        });
                        onUpdatePanel(newPages[currentPage]);
                      }}
                      className="w-4 h-4 bg-green-600 text-white text-[10px] rounded-sm flex items-center justify-center ml-1"
                      title="Increase columns in this row"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Manga Page Grid */}
              <div 
                className="grid h-[85vh] relative manga-grid" // Increased height from 70vh to 85vh
                style={{
                  gridTemplateRows: `repeat(${pages[currentPage].layout.rows}, minmax(0, 1fr))`,
                  gap: pages[currentPage].gutterSize === 'small' ? '6px' : 
                       pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
                  padding: pages[currentPage].gutterSize === 'small' ? '6px' : 
                            pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
                }}
              >
                {pages[currentPage].panels.map((row, rowIndex) => 
                  rowIndex < pages[currentPage].layout.rows && (
                    <div 
                      key={rowIndex} 
                      className="grid h-full relative"
                      style={{
                        gridTemplateColumns: row.length > 0 ? `repeat(${row.length}, minmax(0, 1fr))` : '1fr',
                        gap: pages[currentPage].gutterSize === 'small' ? '6px' : 
                             pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
                      }}
                    >
                      {row.length > 0 ? (
                        row.map((panel, colIndex) => (
                          <div 
                            key={panel.id}
                            onClick={() => onPanelClick(rowIndex, colIndex)}
                            className={`manga-panel panel-zoom border-[3px] ${
                              selectedPanel?.id === panel.id 
                                ? 'border-anime-pink shadow-glow-pink' 
                                : 'border-ink-black hover:border-anime-indigo'
                            } relative overflow-hidden cursor-pointer
                              transition-all duration-200`}
                            style={{
                              gridColumn: panel.colSpan > 1 ? `span ${panel.colSpan}` : 'auto',
                              gridRow: panel.rowSpan > 1 ? `span ${panel.rowSpan}` : 'auto',
                              backgroundColor: '#121212', // Black background for panels
                            }}
                          >
                            {panel.image ? (
                              <div className="w-full h-full relative">
                                <img 
                                  src={panel.image} 
                                  alt={`Panel ${rowIndex}-${colIndex}`}
                                  className="w-full h-full object-contain" // Changed from object-cover to object-contain
                                  onError={(e) => {
                                    console.error(`Error loading image for panel ${panel.id}:`, e);
                                    e.target.onerror = null;
                                    e.target.src = mangaPlaceholderImage;
                                  }}
                                />
                                <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center space-y-2">
                                  <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-gray-500 text-sm font-comic">Click to Edit</p>
                                </div>
                              </div>
                            )}
                            
                            {/* Display Text Bubbles if any */}
                            {panel.textBoxes && panel.textBoxes.map(textBox => (
                              <div key={textBox.id} className="absolute inset-0 pointer-events-none z-10">
                                <Bubble
                                  type={textBox.type}
                                  text={textBox.text}
                                  position={textBox.position || { x: 50, y: 50 }}
                                  tailPosition={textBox.tailPosition || 'bottom'}
                                  fontSize={textBox.style?.fontSize}
                                  size={textBox.size || 'md'}
                                  bgColor={textBox.style?.backgroundColor || 'white'}
                                  textColor={textBox.style?.color || 'black'}
                                  className={`${textBox.style?.bold ? 'font-bold' : ''} ${textBox.style?.italic ? 'italic' : ''} ${textBox.style?.fontFamily ? `font-${textBox.style.fontFamily}` : 'font-comic'}`}
                                  selected={false}
                                  draggable={false}
                                  scale={0.65}
                                />
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        /* No message for empty rows - just empty space */
                        <div className="h-full"></div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar with controls - Takes 1/4 of the space */}
        <div className="space-y-4">
          {/* Page Navigation Section */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Page Navigation</h3>
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className={`px-3 py-1.5 rounded-md ${currentPage === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Previous
              </button>
              <span className="text-white">Page {currentPage + 1} of {pages.length}</span>
              <button 
                onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                disabled={currentPage === pages.length - 1}
                className={`px-3 py-1.5 rounded-md ${currentPage === pages.length - 1 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                Next
              </button>
            </div>
            <button 
              onClick={onAddPage}
              className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-300"
            >
              Add New Page
            </button>
          </div>
          
          {/* Audio Section */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Page Audio</h3>
            <div className="space-y-3">
              {pages[currentPage].audioTrack ? (
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-medium truncate flex-1">{pages[currentPage].audioTrack.title}</div>
                    <button 
                      onClick={() => {
                        const audio = document.getElementById(`audio-preview-${currentPage}`);
                        if (audio.paused) {
                          audio.play();
                        } else {
                          audio.pause();
                        }
                      }}
                      className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">
                    {pages[currentPage].audioTrack.artist || 'Unknown Artist'} • {formatDuration(pages[currentPage].audioTrack.duration || 0)}
                  </div>
                  <audio 
                    id={`audio-preview-${currentPage}`} 
                    src={pages[currentPage].audioTrack.url} 
                    preload="none"
                    loop
                    hidden
                  />
                  <div className="flex justify-end mt-2">
                    <button 
                      onClick={() => {
                        const newPages = [...pages];
                        const audio = document.getElementById(`audio-preview-${currentPage}`);
                        if (audio) {
                          audio.pause();
                        }
                        newPages[currentPage].audioTrack = null;
                        onUpdatePanel(newPages[currentPage]);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove Audio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-700 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-400 text-sm mb-2">No audio track for this page</p>
                </div>
              )}
              
              <button
                onClick={() => onShowSoundSelector && onShowSoundSelector()}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors duration-300 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                {pages[currentPage].audioTrack ? 'Change Audio Track' : 'Add Audio Track'}
              </button>
            </div>
          </div>
          
          {/* Story Information Section */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Story Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-300 text-sm mb-1">Title</label>
                <input 
                  type="text" 
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter story title"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Author</label>
                <input 
                  type="text" 
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white h-20"
                  placeholder="Brief description of your story"
                />
              </div>
            </div>
          </div>
          
          {/* Save Button */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <button 
              onClick={() => {
                console.log("Save Project button clicked");
                if (onSaveProject) {
                  onSaveProject({ navigateAfterSave: false });
                } else {
                  console.error("onSaveProject function is not defined");
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-300 flex items-center justify-center active:bg-blue-800 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Project
            </button>
            
            {/* Last saved information */}
            {currentProject?.lastSaved && (
              <div className="mt-2 text-center">
                <p className="text-xs text-green-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Last saved: {formatDate(currentProject.lastSaved)}
                </p>
              </div>
            )}
          </div>

          {/* Publish button */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <button 
              onClick={() => onShowPublishModal && onShowPublishModal()}
              className={`w-full px-4 py-2 ${currentProject?.published ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md transition-colors duration-300 flex items-center justify-center`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {currentProject?.published ? 'Update Published Manga' : 'Publish Manga'}
            </button>
            
            {/* Published status information */}
            {currentProject?.published && (
              <div className="mt-2 text-center">
                <div className="text-xs text-green-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Published {currentProject.lastPublished ? formatDate(currentProject.lastPublished) : ''}
                </div>
              </div>
            )}
          </div>
          
          {/* Exit to Projects button */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <button 
              onClick={() => {
                console.log("Exit to Projects button clicked");
                if (onSaveProject) {
                  // Save and navigate back to projects
                  onSaveProject({ navigateAfterSave: true });
                } else {
                  console.error("onSaveProject function is not defined");
                }
              }}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors duration-300 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              Exit to Projects
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageEditor; 