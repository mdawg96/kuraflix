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

// Jamendo API client ID - Replace with your own from https://devportal.jamendo.com/
const JAMENDO_CLIENT_ID = "2c455128";

// Replace NASA tracks with Jamendo fallback tracks
const FALLBACK_TRACKS = {
  cinematic: [
    { id: "fallback-cin-1", title: "Epic Cinematic", url: "https://mp3d.jamendo.com/download/track/1884527/mp32", duration: 163, artist: "Alexander Nakarada" },
    { id: "fallback-cin-2", title: "Dreaming of Venus", url: "https://mp3d.jamendo.com/download/track/1219760/mp32", duration: 177, artist: "Borrtex" },
    { id: "fallback-cin-3", title: "Abandoned Castle", url: "https://mp3d.jamendo.com/download/track/1315710/mp32", duration: 165, artist: "Borrtex" }
  ],
  electronic: [
    { id: "fallback-elec-1", title: "Electronic Future", url: "https://mp3d.jamendo.com/download/track/1349290/mp32", duration: 182, artist: "Alex Nekita" },
    { id: "fallback-elec-2", title: "Digital Matrix", url: "https://mp3d.jamendo.com/download/track/1407964/mp32", duration: 183, artist: "Smartsound" },
    { id: "fallback-elec-3", title: "Future Tech", url: "https://mp3d.jamendo.com/download/track/1396960/mp32", duration: 146, artist: "Jamendo Music" }
  ],
  jazz: [
    { id: "fallback-jazz-1", title: "Jazz Cafe", url: "https://mp3d.jamendo.com/download/track/1101146/mp32", duration: 160, artist: "Bluemillenium" },
    { id: "fallback-jazz-2", title: "Smooth Jazz", url: "https://mp3d.jamendo.com/download/track/1359401/mp32", duration: 195, artist: "Jamendo Music" },
    { id: "fallback-jazz-3", title: "Jazz Piano", url: "https://mp3d.jamendo.com/download/track/1225340/mp32", duration: 141, artist: "Jamendo Music" }
  ],
  ambient: [
    { id: "fallback-amb-1", title: "Distant Lands", url: "https://mp3d.jamendo.com/download/track/1219978/mp32", duration: 194, artist: "Borrtex" },
    { id: "fallback-amb-2", title: "Dawn", url: "https://mp3d.jamendo.com/download/track/1219500/mp32", duration: 127, artist: "Borrtex" },
    { id: "fallback-amb-3", title: "Ambient World", url: "https://mp3d.jamendo.com/download/track/1285062/mp32", duration: 150, artist: "Jamendo Music" }
  ],
  upbeat: [
    { id: "fallback-upb-1", title: "Happy Day", url: "https://mp3d.jamendo.com/download/track/1238201/mp32", duration: 138, artist: "Jamendo Music" },
    { id: "fallback-upb-2", title: "Uplifting", url: "https://mp3d.jamendo.com/download/track/1397960/mp32", duration: 142, artist: "Beat Mekanik" },
    { id: "fallback-upb-3", title: "Positive Energy", url: "https://mp3d.jamendo.com/download/track/1326347/mp32", duration: 125, artist: "Jamendo Music" }
  ],
  all: [
    { id: "fallback-all-1", title: "Epic Cinematic", url: "https://mp3d.jamendo.com/download/track/1884527/mp32", duration: 163, artist: "Alexander Nakarada" },
    { id: "fallback-all-2", title: "Electronic Future", url: "https://mp3d.jamendo.com/download/track/1349290/mp32", duration: 182, artist: "Alex Nekita" },
    { id: "fallback-all-3", title: "Jazz Cafe", url: "https://mp3d.jamendo.com/download/track/1101146/mp32", duration: 160, artist: "Bluemillenium" },
    { id: "fallback-all-4", title: "Distant Lands", url: "https://mp3d.jamendo.com/download/track/1219978/mp32", duration: 194, artist: "Borrtex" },
    { id: "fallback-all-5", title: "Happy Day", url: "https://mp3d.jamendo.com/download/track/1238201/mp32", duration: 138, artist: "Jamendo Music" }
  ]
};

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
      // Force using fallbacks for now since Jamendo API has issues
      throw new Error('Using fallbacks temporarily');
      
      const genreInfo = JAMENDO_GENRES.find(g => g.id === genre);
      const tags = genreInfo ? genreInfo.tags : '';
      
      const apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=10&include=musicinfo&tags=${tags}`;
      console.log("Fetching genre tracks from:", apiUrl);
      
      const response = await fetch(apiUrl);
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API returned data:", data);
      
      if (data.results && data.results.length > 0) {
        // Format tracks to match our component's expected structure
        const formattedTracks = data.results.map(track => ({
          id: `jamendo-${track.id}`,
          title: track.name,
          artist: track.artist_name,
          url: track.audio,
          duration: Math.round(track.duration),
          image: track.image,
          license: track.license_ccurl
        }));
        
        console.log(`Found ${formattedTracks.length} tracks for genre "${genre}"`);
        
        // Update the tracks for this genre
        setGenreTracks(prev => ({
          ...prev,
          [genre]: formattedTracks
        }));
      } else {
        console.warn(`No tracks returned from API for genre "${genre}"`);
        throw new Error('No tracks found');
      }
    } catch (error) {
      console.error("Using fallback tracks instead of Jamendo API:", error);
      
      // Use fallback tracks instead
      console.log(`Using ${FALLBACK_TRACKS[genre]?.length || 0} fallback tracks for "${genre}"`);
      setGenreTracks(prev => ({
        ...prev,
        [genre]: FALLBACK_TRACKS[genre] || []
      }));
      
      if (FALLBACK_TRACKS[genre]?.length > 0) {
        // Don't show toast every time to avoid spam
        if (!window.shownFallbackToast) {
          toast.info("Using Jamendo fallback tracks - API connection issue");
          window.shownFallbackToast = true;
        }
      } else {
        toast.error("Could not load tracks");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch all tracks for the initial "all" view
  const fetchAllTracks = async () => {
    setIsLoading(true);
    
    try {
      // Force using fallbacks for now since Jamendo API has issues
      throw new Error('Using fallbacks temporarily');
      
      // Fetch popular tracks for the initial view
      const apiUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=30&include=musicinfo&boost=popularity`;
      console.log("Fetching all tracks from:", apiUrl);
      
      const response = await fetch(apiUrl);
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API returned data:", data);
      
      if (data.results && data.results.length > 0) {
        // Format tracks to match our component's expected structure
        const formattedTracks = data.results.map(track => ({
          id: `jamendo-${track.id}`,
          title: track.name,
          artist: track.artist_name,
          url: track.audio,
          duration: Math.round(track.duration),
          image: track.image,
          license: track.license_ccurl
        }));
        
        console.log(`Found ${formattedTracks.length} tracks for "all" category`);
        
        // Update the tracks for the "all" category
        setGenreTracks(prev => ({
          ...prev,
          all: formattedTracks
        }));
      } else {
        console.warn("No tracks returned from API for 'all' category");
        throw new Error('No tracks found');
      }
    } catch (error) {
      console.error("Using fallback tracks instead of Jamendo API:", error);
      
      // Use fallback tracks instead
      console.log(`Using ${FALLBACK_TRACKS.all?.length || 0} fallback tracks for "all"`);
      setGenreTracks(prev => ({
        ...prev,
        all: FALLBACK_TRACKS.all || []
      }));
      
      if (FALLBACK_TRACKS.all?.length > 0) {
        // Don't show toast every time to avoid spam
        if (!window.shownFallbackToast) {
          toast.info("Using Jamendo fallback tracks - API connection issue");
          window.shownFallbackToast = true;
        }
      } else {
        toast.error("Could not load tracks");
      }
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
  const togglePreview = (track) => {
    if (isPlaying && previewAudio && selectedTrack?.id === track.id) {
      previewAudio.pause();
      setIsPlaying(false);
      return;
    }

    // Stop any currently playing audio first
    if (previewAudio) {
      previewAudio.pause();
    }

    // Create new audio for preview
    const audio = new Audio(track.url);
    audio.volume = 0.5;
    setPreviewAudio(audio);
    
    audio.play().then(() => {
      setIsPlaying(true);
      setSelectedTrack(track);
    }).catch(error => {
      console.error("Error playing audio:", error);
      toast.error("Could not play preview");
    });
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

    const finalDuration = showCustomDuration ? customDuration : selectedTrack.duration;
    
    // Call the parent component's onAddSound function
    onAddSound({
      title: selectedTrack.title,
      url: selectedTrack.url,
      duration: finalDuration,
      source: selectedTrack.id.includes('custom-') ? 'custom' : 'jamendo',
      artist: selectedTrack.artist,
      license: selectedTrack.license
    });
    
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl my-4 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add Background Music</h2>
          <button 
            onClick={onClose}
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
          <p>Currently using NASA Audio Library (Public Domain) as fallback. 
             All tracks are royalty-free and CORS-friendly. Custom uploaded tracks must comply with applicable copyright laws.</p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
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