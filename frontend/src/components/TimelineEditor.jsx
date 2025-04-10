import React, { useState, useRef, useEffect } from 'react';

const TimelineEditor = ({
  scenes,
  currentScene,
  setCurrentScene,
  selectedClip,
  onClipClick,
  onAddScene,
  onDeleteScene,
  onUpdateClip,
  onAddClip,
  onSetTransition,
  storyTitle,
  setStoryTitle,
  author,
  setAuthor,
  description,
  setDescription,
  onBackToProjects,
  onShowPublishModal
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineRef = useRef(null);
  
  // Calculate total duration of the project
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0);
  
  // Effect for playback
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = prevTime + 0.1;
          if (newTime >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          setScrubPosition((newTime / totalDuration) * 100);
          return newTime;
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, totalDuration]);
  
  // Handle scrubber drag
  const handleScrubberChange = (e) => {
    const percent = parseFloat(e.target.value);
    setScrubPosition(percent);
    setCurrentTime((percent / 100) * totalDuration);
  };
  
  // Get the current scene and clip based on the current time
  const getCurrentTimeInfo = () => {
    let elapsedTime = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (currentTime >= elapsedTime && currentTime < elapsedTime + scene.duration) {
        const sceneTime = currentTime - elapsedTime;
        // Find the clip that contains this time point
        const clip = scene.clips.find(clip => 
          sceneTime >= clip.startTime && sceneTime < clip.endTime
        );
        return { sceneIndex: i, clipIndex: clip ? scene.clips.indexOf(clip) : -1 };
      }
      elapsedTime += scene.duration;
    }
    return { sceneIndex: 0, clipIndex: -1 };
  };
  
  // Format time as mm:ss:ms
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return `${mins}:${secs}:${ms}`;
  };
  
  // Determine current clip for preview
  const currentTimeInfo = getCurrentTimeInfo();
  const currentClip = currentTimeInfo.clipIndex !== -1 
    ? scenes[currentTimeInfo.sceneIndex].clips[currentTimeInfo.clipIndex] 
    : null;
  
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
          <div className="bg-black aspect-video relative rounded-lg overflow-hidden mb-4">
            {currentClip && currentClip.image ? (
              <img
                src={currentClip.image}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">No content to preview</p>
              </div>
            )}
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
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          {/* Timeline */}
          <div className="bg-gray-900 rounded-lg p-4" ref={timelineRef}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium">Timeline</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-white text-sm">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Time markers */}
            <div className="flex h-6 border-b border-gray-700 mb-1">
              {Array.from({ length: Math.ceil(totalDuration) }).map((_, i) => (
                <div key={`time-${i}`} className="text-gray-500 text-xs flex-shrink-0" style={{ width: `${100 * zoomLevel}px` }}>
                  {formatTime(i)}
                </div>
              ))}
            </div>
            
            {/* Scenes timeline */}
            <div className="flex flex-col space-y-2">
              {scenes.map((scene, sceneIndex) => {
                // Calculate scene start time
                const sceneStartTime = scenes.slice(0, sceneIndex).reduce((total, s) => total + s.duration, 0);
                
                return (
                  <div key={scene.id} className="relative">
                    <div className="flex items-center">
                      <span className="text-white text-xs w-20 truncate">Scene {sceneIndex + 1}</span>
                      <div 
                        className={`flex h-12 bg-gray-700 rounded-lg ${currentScene === sceneIndex ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ width: `${scene.duration * 100 * zoomLevel}px` }}
                        onClick={() => setCurrentScene(sceneIndex)}
                      >
                        {scene.clips.map((clip, clipIndex) => (
                          <div
                            key={clip.id}
                            className={`h-full ${clip.type === 'visual' ? 'bg-blue-800' : 'bg-purple-800'} rounded-lg ${selectedClip?.id === clip.id ? 'ring-2 ring-white' : ''}`}
                            style={{
                              width: `${(clip.endTime - clip.startTime) * 100 * zoomLevel}px`,
                              marginLeft: `${clip.startTime * 100 * zoomLevel}px`,
                              position: 'absolute',
                              left: 0,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onClipClick(clipIndex);
                            }}
                          >
                            <div className="p-1 h-full flex items-center overflow-hidden">
                              <span className="text-white text-xs truncate">
                                {clip.type === 'visual' ? 'Visual' : 'Audio'} {formatTime(clip.startTime)}-{formatTime(clip.endTime)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Timeline controls */}
            <div className="flex justify-between mt-4">
              <div>
                <button
                  onClick={onAddScene}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm mr-2"
                >
                  Add Scene
                </button>
                {scenes.length > 1 && (
                  <button
                    onClick={onDeleteScene}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    Delete Scene
                  </button>
                )}
              </div>
              <div>
                <button
                  onClick={() => onAddClip('visual')}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm mr-2"
                >
                  Add Visual Clip
                </button>
                <button
                  onClick={() => onAddClip('audio')}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  Add Audio Clip
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
            <h2 className="text-xl font-bold text-white mb-4">Transitions</h2>
            <div className="grid grid-cols-2 gap-2">
              {['Cut', 'Fade', 'Wipe', 'Dissolve', 'Zoom', 'Slide'].map(transition => (
                <button
                  key={transition}
                  className={`px-3 py-2 ${scenes[currentScene]?.transition?.toLowerCase() === transition.toLowerCase() ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded text-sm`}
                  onClick={() => onSetTransition(transition.toLowerCase())}
                >
                  {transition}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineEditor; 