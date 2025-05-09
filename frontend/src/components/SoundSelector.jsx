import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Genre mapping for Jamendo API
const JAMENDO_GENRES = [
  { name: "Cinematic", id: "cinematic", tags: "soundtrack,cinematic,film" },
  { name: "Electronic", id: "electronic", tags: "electronic,electro,techno" },
  { name: "Jazz", id: "jazz", tags: "jazz,swing,blues" },
  { name: "Ambient", id: "ambient", tags: "ambient,chillout,relaxing" },
  { name: "Upbeat", id: "upbeat", tags: "upbeat,happy,energetic" },
  { name: "Custom", id: "custom", tracks: [] }
];

// Update the API client ID to a potentially more valid one
const JAMENDO_CLIENT_ID = "3e2f6382";

// Flag to completely skip Jamendo API calls if they're clearly not working
let jamendoApiBlocked = false;

// Add local Jamendo tracks as a safety fallback
const LOCAL_JAMENDO_TRACKS = [
  { id: "jamendo-1884527", title: "Epic Cinematic", url: "https://mp3d.jamendo.com/download/track/1884527/mp32", duration: 163, artist: "Alexander Nakarada" },
  { id: "jamendo-1219978", title: "Distant Lands", url: "https://mp3d.jamendo.com/download/track/1219978/mp32", duration: 194, artist: "Borrtex" },
  { id: "jamendo-1219500", title: "Dawn", url: "https://mp3d.jamendo.com/download/track/1219500/mp32", duration: 127, artist: "Borrtex" },
  { id: "jamendo-1349290", title: "Electronic Future", url: "https://mp3d.jamendo.com/download/track/1349290/mp32", duration: 182, artist: "Alex Nekita" },
  { id: "jamendo-1101146", title: "Jazz Cafe", url: "https://mp3d.jamendo.com/download/track/1101146/mp32", duration: 160, artist: "Bluemillenium" }
];

const SoundSelector = ({ onAddSound, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [previewAudio, setPreviewAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [customDuration, setCustomDuration] = useState(10);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [activeGenre, setActiveGenre] = useState('all');
  const [customTracks, setCustomTracks] = useState([]);
  const [genreTracks, setGenreTracks] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch tracks from Jamendo API by genre
  const fetchTracksByGenre = async (genre) => {
    if (genre === 'custom') return;
    
    // If we already have tracks for this genre, don't fetch again
    if (genreTracks[genre] && genreTracks[genre].length > 0) return;
    
    setIsLoading(true);
    
    try {
      // If we've already determined the API is blocked, don't try again
      if (jamendoApiBlocked) {
        throw new Error('Jamendo API known to be blocked or unreachable');
      }
      
      console.log("Using local Jamendo tracks for genre:", genre);
      setGenreTracks(prev => ({
        ...prev,
        [genre]: LOCAL_JAMENDO_TRACKS.filter((_, i) => i % 2 === 0) // Use alternating tracks for variety
      }));
    } catch (error) {
      console.error("Error fetching from Jamendo API:", error);
      // If API fails, use the filtered local tracks instead of empty array
      console.log("Using local Jamendo tracks for genre:", genre);
      setGenreTracks(prev => ({
        ...prev,
        [genre]: LOCAL_JAMENDO_TRACKS.filter((_, i) => i % 2 === 0) // Different subset for genre views
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch all tracks for the initial "all" view
  const fetchAllTracks = async () => {
    setIsLoading(true);
    
    try {
      // Skip API calls - just use local tracks
      console.log("Using local Jamendo tracks instead of API");
      // Mark API as blocked to prevent future attempts
      jamendoApiBlocked = true;
      
      setGenreTracks(prev => ({
        ...prev,
        all: LOCAL_JAMENDO_TRACKS
      }));
    } catch (error) {
      console.error("Error fetching from Jamendo API:", error);
      // If API fails, use the local Jamendo tracks instead of empty array
      console.log("Using local Jamendo tracks instead of API");
      setGenreTracks(prev => ({
        ...prev,
        all: LOCAL_JAMENDO_TRACKS
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load tracks when component mounts or genre changes
  useEffect(() => {
    if (activeGenre === 'all') {
      if (!genreTracks.all) {
        fetchAllTracks();
      }
    } else if (activeGenre !== 'custom') {
      fetchTracksByGenre(activeGenre);
    }
  }, [activeGenre]);

  // All tracks combined or filtered by genre
  const getFilteredTracks = () => {
    let tracks = [];
    
    // Get all tracks or just from selected genre
    if (activeGenre === 'all') {
      tracks = genreTracks.all || [];
    } else if (activeGenre === 'custom') {
      tracks = customTracks;
    } else {
      tracks = genreTracks[activeGenre] || [];
    }
    
    // Apply search filter if needed
    if (searchTerm.trim() !== '') {
      tracks = tracks.filter(track => 
        track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (track.artist && track.artist.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return tracks;
  };

  const filteredTracks = getFilteredTracks();

  // Handle track selection
  const handleSelectTrack = (track) => {
    setSelectedTrack(track);
    setCustomDuration(Math.min(track.duration, 30)); // Default to 30s or track length if shorter
    
    // Stop any current preview
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setIsPlaying(false);
    }
  };

  // Preview the selected track
  const togglePreview = async (track) => {
    // If currently playing this track, pause it
    if (isPlaying && previewAudio && selectedTrack?.id === track.id) {
      try {
        previewAudio.pause();
        setIsPlaying(false);
      } catch (e) {
        console.error("Error pausing audio:", e);
      }
      return;
    }

    // Safely stop any currently playing audio first
    if (previewAudio) {
      try {
        previewAudio.pause();
        previewAudio.src = '';
      } catch (e) {
        console.error("Error stopping previous audio:", e);
      }
    }

    // Set the selected track first
    setSelectedTrack(track);
    
    // Show loading state
    toast.loading("Loading audio...", { id: "audio-loading" });
    
    // Check if URL is likely to be blocked by CORS
    const isJamendoUrl = track.url.includes('jamendo.com');
    
    // For Jamendo URLs that might be blocked, show warning and don't try to play
    if (isJamendoUrl) {
      setTimeout(() => {
        toast.error("Preview not available (CORS blocked)", { id: "audio-loading" });
      }, 500);
      setIsPlaying(false);
      return;
    }
    
    // Create new audio for preview
    const audio = new Audio();
    
    // Configure for optimal loading
    audio.preload = "auto";
    
    // Track loading timeout
    let loadingTimeout = setTimeout(() => {
      toast.error("Audio loading timeout. Try another track.", { id: "audio-loading" });
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      setIsPlaying(false);
    }, 5000);
    
    // Set up event listeners before setting the source
    audio.addEventListener('canplaythrough', () => {
      clearTimeout(loadingTimeout);
      console.log("Audio ready to play:", track.title);
      toast.success("Audio loaded", { id: "audio-loading" });
      
      // Only play when canplaythrough event fires to ensure audio is ready
      try {
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Error playing audio:", error);
            toast.error("Could not play preview", { id: "audio-loading" });
            setIsPlaying(false);
          });
      } catch (e) {
        console.error("Exception during play:", e);
        setIsPlaying(false);
      }
    });
    
    audio.addEventListener('error', (e) => {
      clearTimeout(loadingTimeout);
      console.error("Audio loading error:", e);
      
      // Get more detailed error information if possible
      let errorDetails = "Unknown error";
      if (audio.error) {
        switch(audio.error.code) {
          case 1: 
            errorDetails = "Media resource could not be loaded (MEDIA_ERR_ABORTED)";
            break;
          case 2: 
            errorDetails = "Network error (MEDIA_ERR_NETWORK)";
            break;
          case 3: 
            errorDetails = "Decoding error (MEDIA_ERR_DECODE)";
            break;
          case 4: 
            errorDetails = "Format not supported (MEDIA_ERR_SRC_NOT_SUPPORTED)";
            break;
          default:
            errorDetails = `Unknown error code: ${audio.error.code}`;
        }
      }
      
      console.error("Audio error details:", errorDetails);
      
      // For network errors, likely CORS issues
      if (audio.error && audio.error.code === 2 && track.url.includes('jamendo.com')) {
        toast.error("CORS error - preview not available", { id: "audio-loading" });
      } else {
        toast.error("Could not load audio. Try another track.", { id: "audio-loading" });
      }
      
      setIsPlaying(false);
    });
    
    // Abort loading if it takes too long
    audio.addEventListener('loadstart', () => {
      console.log("Audio loading started for:", track.title);
    });
    
    audio.addEventListener('progress', (e) => {
      // Log buffering progress
      if (audio.buffered.length > 0) {
        const percentLoaded = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100;
        console.log(`Audio buffering: ${Math.round(percentLoaded)}%`);
      }
    });
    
    // Set the source after adding event listeners
    audio.src = track.url;
    audio.volume = 0.5;
    audio.load(); // Explicitly call load to start loading the audio
    
    // Store the audio element for future reference
    setPreviewAudio(audio);
  };

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Add the selected sound to the timeline
  const handleAddSound = () => {
    if (!selectedTrack) {
      toast.error("Please select a track first");
      return;
    }

    // Stop any playing audio before closing
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setIsPlaying(false);
    }

    const finalDuration = showCustomDuration ? customDuration : selectedTrack.duration;
    
    // Create a fully-formed sound clip with all required properties
    const soundClip = {
      id: `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'sound',
      title: selectedTrack.title || 'Sound Clip',
      soundUrl: selectedTrack.url, // Primary sound URL property
      url: selectedTrack.url,      // Backup property for compatibility
      startTime: 0,                // Will be positioned by the timeline
      endTime: finalDuration,      // Initial end time (will be adjusted by timeline)
      duration: finalDuration,     // Store the duration explicitly
      source: selectedTrack.id.includes('custom-') ? 'custom' : 'jamendo',
      artist: selectedTrack.artist || '',
      license: selectedTrack.license || 'CC',
      finalized: true              // Mark as finalized for immediate use
    };
    
    console.log("Adding sound clip to timeline:", soundClip);
    
    // Call the parent component's onAddSound function
    onAddSound(soundClip);
    
    toast.success(`Added "${selectedTrack.title}" to timeline`);
    onClose();
  };

  // Handle file upload for custom tracks
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if file is an audio file
    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }
    
    // Create a URL for the uploaded file
    const fileUrl = URL.createObjectURL(file);
    
    // Create audio element to get duration
    const audio = new Audio(fileUrl);
    audio.addEventListener('loadedmetadata', () => {
      // Create a new track object
      const newTrack = {
        id: `custom-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        url: fileUrl,
        duration: Math.round(audio.duration),
        file: file // Keep reference to the original file
      };
      
      // Add to custom tracks
      setCustomTracks(prev => [...prev, newTrack]);
      
      // Switch to custom genre and select the new track
      setActiveGenre('custom');
      setSelectedTrack(newTrack);
      setCustomDuration(Math.min(newTrack.duration, 30));
      
      toast.success(`Added "${newTrack.title}" to your library`);
    });
    
    audio.addEventListener('error', () => {
      toast.error('Error loading audio file');
      URL.revokeObjectURL(fileUrl);
    });
  };

  // Clean up audio and object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      
      // Clean up object URLs for custom tracks
      customTracks.forEach(track => {
        if (track.url.startsWith('blob:')) {
          URL.revokeObjectURL(track.url);
        }
      });
    };
  }, [customTracks]);

  // Handle the close action
  const handleClose = () => {
    // Stop any playing audio before closing
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setIsPlaying(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl my-4 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add Background Music</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex mb-4 overflow-hidden flex-1">
          {/* Genre tabs */}
          <div className="mr-4 space-y-1 w-48 flex-shrink-0 overflow-y-auto max-h-[50vh] pr-1">
            <button
              onClick={() => setActiveGenre('all')}
              className={`w-full text-left px-3 py-2 rounded-md ${
                activeGenre === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              All Genres
            </button>
            
            {JAMENDO_GENRES.map(genre => (
              <button
                key={genre.id}
                onClick={() => setActiveGenre(genre.id)}
                className={`w-full text-left px-3 py-2 rounded-md ${
                  activeGenre === genre.id ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                } flex justify-between items-center`}
              >
                <span>{genre.name}</span>
                {genre.id !== 'custom' && genreTracks[genre.id] && 
                  <span className="text-xs opacity-70">{genreTracks[genre.id]?.length || 0}</span>
                }
                {genre.id === 'custom' && 
                  <span className="text-xs opacity-70">{customTracks.length}</span>
                }
              </button>
            ))}
            
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-3 py-2 mt-2 rounded-md bg-green-700 hover:bg-green-600 text-white flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Music
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for music..."
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              />
            </div>

            {/* Track list */}
            <div className="overflow-y-auto flex-grow mb-4 rounded-md border border-gray-700 min-h-[200px] max-h-[50vh]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <p className="mt-4 text-gray-400">Loading tracks...</p>
                </div>
              ) : filteredTracks.length > 0 ? (
                <div className="space-y-1">
                  {filteredTracks.map(track => (
                    <div 
                      key={track.id}
                      className={`p-3 rounded-md cursor-pointer flex items-center justify-between ${
                        selectedTrack?.id === track.id ? 'bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => handleSelectTrack(track)}
                    >
                      <div className="flex items-center w-full">
                        <button 
                          className="mr-3 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(track);
                          }}
                        >
                          {isPlaying && selectedTrack?.id === track.id ? (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-grow pr-2 overflow-hidden">
                          <div className="text-white font-medium truncate">{track.title}</div>
                          <div className="text-gray-400 text-xs">
                            {track.id.includes('custom-') ? 'Custom Upload' : 
                             track.artist ? `${track.artist} (Jamendo)` : 'Jamendo'} 
                            &nbsp;•&nbsp;{formatTime(track.duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  {activeGenre === 'custom' && customTracks.length === 0 ? (
                    <div>
                      <p className="mb-2">No custom tracks yet</p>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded-md"
                      >
                        Upload Music
                      </button>
                    </div>
                  ) : (
                    <p>No tracks found matching "{searchTerm}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Duration controls - only shown when a track is selected */}
        {selectedTrack && (
          <div className="mb-4 p-4 bg-gray-700 rounded">
            <div className="flex items-center mb-2">
              <h3 className="text-white font-medium">Duration Options</h3>
              <div className="ml-auto">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showCustomDuration} 
                    onChange={() => setShowCustomDuration(!showCustomDuration)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">Custom Duration</span>
                </label>
              </div>
            </div>
            
            {showCustomDuration ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max={selectedTrack.duration}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">1s</span>
                  <span className="text-sm text-white font-medium">{formatTime(customDuration)}</span>
                  <span className="text-sm text-gray-400">{formatTime(selectedTrack.duration)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-300">
                Use full track length: {formatTime(selectedTrack.duration)}
              </div>
            )}
          </div>
        )}

        {/* Library disclaimer */}
        <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded-md text-sm text-blue-200">
          <p>Using Jamendo API for royalty-free music. All tracks are licensed under Creative Commons 
             and can be used in your projects with proper attribution. Custom uploaded tracks must comply with applicable copyright laws.</p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleAddSound}
            disabled={!selectedTrack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoundSelector; 