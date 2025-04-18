import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AnimationPhase from './ClipEditor/AnimationPhase';
import ImagePhase from './ClipEditor/ImagePhase';

// Helper function to handle various image path formats
const getImageUrl = (imagePath) => {
  // Return placeholder if no image path provided
  if (!imagePath) {
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2hhcjwvdGV4dD48L3N2Zz4=";
  }
  
  try {
    // If already a data URL, use it directly
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If already a full URL, use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Handle Firebase storage URLs
    if (imagePath.includes('firebasestorage.googleapis.com')) {
      return imagePath;
    }
    
    // Clean any leading slashes
    const cleanPath = imagePath.startsWith('./') 
      ? imagePath.slice(2) 
      : imagePath.startsWith('/') 
        ? imagePath.slice(1) 
        : imagePath;
    
    // For all other relative paths, try to resolve from current domain
    return `/${cleanPath}`;
  } catch (error) {
    console.error('Error processing image URL, using fallback:', error);
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RXJyb3I8L3RleHQ+PC9zdmc+";
  }
};

const ClipEditor = ({
  selectedClip,
  onUpdateClip,
  onGenerateImage,
  onUploadImage,
  isGenerating,
  generationProgress,
  allCharacters = [],
  projectCharacters = [],
  onAddToProject,
  onRemoveFromProject
}) => {
  const [editorPhase, setEditorPhase] = useState('setup');
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [characterTab, setCharacterTab] = useState('project');

  // Define updateClipProperty before it's used in any useEffect
  const updateClipProperty = (property, value) => {
    if (!selectedClip) return;
    
    const updatedClip = { ...selectedClip };
    updatedClip[property] = value;
    
    // Handle special properties
    if (property === 'trimStart' || property === 'trimEnd') {
      // Update animation duration based on trim values
      if (updatedClip.trimStart !== undefined && updatedClip.trimEnd !== undefined) {
        updatedClip.animationDuration = updatedClip.trimEnd - updatedClip.trimStart;
      }
    }
    
    onUpdateClip(updatedClip);
  };
  
  // Handle phase changes to make sure animation URL persists
  const handlePhaseChange = (newPhase) => {
    console.log(`Changing editor phase from ${editorPhase} to ${newPhase}`);
    
    // Special handling when going to animation phase
    if (newPhase === 'animation') {
      // Check if we have a URL in localStorage or window cache that should be forced
      const lastClipId = localStorage.getItem('lastClipId');
      const lastAnimationUrl = localStorage.getItem('lastAnimationUrl');
      const windowCacheUrl = window.clipAnimationUrls?.[selectedClip.id];
      
      // Create a backup of the animation URL if it exists but might get lost in phase change
      if (selectedClip.animationUrl) {
        console.log("Backing up existing animation URL before phase change:", selectedClip.animationUrl);
        // Save to window cache
        if (!window.clipAnimationUrls) {
          window.clipAnimationUrls = {};
        }
        window.clipAnimationUrls[selectedClip.id] = selectedClip.animationUrl;
        
        // Also save to localStorage
        try {
          localStorage.setItem('lastAnimationUrl', selectedClip.animationUrl);
          localStorage.setItem('lastClipId', selectedClip.id);
        } catch (err) {
          console.error("Failed to backup animation URL to localStorage:", err);
        }
      }
      
      // Check for missing URL and try to restore it
      if (!selectedClip.animationUrl) {
        let urlToUse = null;
        
        // First check window cache
        if (windowCacheUrl) {
          console.log("Restoring animation URL from window cache before phase change:", windowCacheUrl);
          urlToUse = windowCacheUrl;
        } 
        // Then check localStorage
        else if (selectedClip.id === lastClipId && lastAnimationUrl) {
          console.log("Restoring animation URL from localStorage before phase change:", lastAnimationUrl);
          urlToUse = lastAnimationUrl;
        }
        
        // Apply the URL restoration if we found one
        if (urlToUse) {
          // Apply animation URL directly 
          updateClipProperty('animationUrl', urlToUse);
          updateClipProperty('animated', true);
        }
      }
    }
    
    // Update the phase
    setEditorPhase(newPhase);
  };
  
  useEffect(() => {
    if (selectedClip && selectedClip.characters) {
      console.log("Setting selected characters from clip:", selectedClip.characters);
      setSelectedCharacters(selectedClip.characters);
    } else {
      console.log("No characters found in selected clip, using empty array");
      setSelectedCharacters([]);
    }
    
    // Debug logging
    console.log("ClipEditor received characters:", { 
      projectChars: projectCharacters?.length || 0,
      allChars: allCharacters?.length || 0,
      selectedClipChars: selectedClip?.characters?.length || 0
    });
    
    if (allCharacters?.length > 0) {
      console.log("All characters available:", allCharacters.map(c => ({id: c.id, name: c.name})));
    } else {
      console.warn("No characters available in allCharacters");
    }
    
    if (projectCharacters?.length > 0) {
      console.log("Project characters available:", projectCharacters.map(c => ({id: c.id, name: c.name})));
    } else {
      console.warn("No characters available in projectCharacters");
    }
  }, [selectedClip, projectCharacters, allCharacters]);

  // Record animation URLs to a global cache
  useEffect(() => {
    // If we have an animation URL, store it in a more permanent ref
    if (selectedClip?.id && selectedClip?.animationUrl) {
      console.log("Saving animation URL to global window cache:", selectedClip.animationUrl);
      // Use window as global storage for clips
      if (!window.clipAnimationUrls) {
        window.clipAnimationUrls = {};
      }
      window.clipAnimationUrls[selectedClip.id] = selectedClip.animationUrl;
    }
    
    // If we don't have a URL but one exists in the cache, restore it
    if (selectedClip?.id && !selectedClip.animationUrl && window.clipAnimationUrls?.[selectedClip.id]) {
      const cachedUrl = window.clipAnimationUrls[selectedClip.id];
      console.log("Restoring animation URL from global cache:", cachedUrl);
      // Call updateClipProperty safely
      if (selectedClip && onUpdateClip) {
        // Update using a direct object update to avoid circular reference
        const updatedClip = { 
          ...selectedClip, 
          animationUrl: cachedUrl, 
          animated: true 
        };
        onUpdateClip(updatedClip);
      }
    }
  }, [selectedClip, onUpdateClip]);

  // This is a special useEffect for handling animation phase-specific logic
  useEffect(() => {
    // Special handling for animation phase
    if (editorPhase === 'animation' && selectedClip) {
      console.log("Animation phase active, checking for URL...");
      
      // If we don't have an animation URL, try to find one
      if (!selectedClip.animationUrl) {
        console.log("No animation URL found for clip:", selectedClip.id);
        
        // Check window cache first
        const windowCacheUrl = window.clipAnimationUrls?.[selectedClip.id];
        if (windowCacheUrl) {
          console.log("Found URL in window cache:", windowCacheUrl);
          updateClipProperty('animationUrl', windowCacheUrl);
          updateClipProperty('animated', true);
          return;
        }
        
        // Then check localStorage
        try {
          const savedClipId = localStorage.getItem('lastClipId');
          const savedUrl = localStorage.getItem('lastAnimationUrl');
          
          if (savedClipId === selectedClip.id && savedUrl) {
            console.log("Found URL in localStorage:", savedUrl);
            updateClipProperty('animationUrl', savedUrl);
            updateClipProperty('animated', true);
            return;
          }
        } catch (err) {
          console.error("Error accessing localStorage:", err);
        }
        
        // If nothing is available, check if there's a URL in ImagePhase logs
        // We could even try a filename based on the timestamp in clip ID
        const timestampMatch = selectedClip.id.match(/clip-([0-9]+)/);
        if (timestampMatch && timestampMatch[1]) {
          const potentialUrl = `http://localhost:5001/outputs/animation_${timestampMatch[1]}.mp4`;
          console.log("Trying URL based on clip ID timestamp:", potentialUrl);
          
          // Set this URL and see if it loads
          updateClipProperty('animationUrl', potentialUrl);
          updateClipProperty('animated', true);
        }
      }
    }
  }, [editorPhase, selectedClip?.id]);

  if (!selectedClip) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg font-bold mb-2">No Clip Selected</p>
          <p className="text-sm mb-4">Double-click on a clip in the timeline to edit it</p>
          <div className="bg-gray-700 p-3 rounded-md inline-block">
            <div className="flex items-center text-sm">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Tip: You can also click "Add Video" in the timeline controls</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerateImage = () => {
    // Important: Make sure we update the clip with the selected characters first
    const updatedClip = {
      ...selectedClip,
      characters: selectedCharacters
    };
    
    console.log("Generating image with characters:", selectedCharacters);
    
    // Update the clip before generating image
    onUpdateClip(updatedClip);
    
    // Now generate the image with the updated characters
    onGenerateImage();
    
    setEditorPhase('image');
  };
  
  const startAnimation = async () => {
    if (!selectedClip.image) {
      alert("Please generate or upload an image first");
      return;
    }
    
    if (!selectedClip.animationDescription) {
      alert("Please provide an animation description");
      return;
    }
    
    console.log("Starting animation generation process");
    setIsAnimating(true);
    setAnimationProgress(5); // Start at 5% to show some initial progress
    
    try {
      const charactersText = selectedCharacters.map(c => c.name).join(', ');
      let prompt = `SCENE: ${selectedClip.environment} with ${charactersText}`;
      prompt += selectedClip.action ? ` - ${selectedClip.action}` : '';
      prompt += `\n\nMOTION: ${selectedClip.animationDescription}`;
      prompt += `\n\nSTYLE: High-quality ${selectedClip.style} style with smooth animation.`;
      prompt += `\n\nDURATION: ${selectedClip.animationDuration || 5} seconds`;
      
      setAnimationPrompt(prompt);
      console.log("Animation prompt set:", prompt);
      
      // Start animation generation and get job ID
      const apiUrl = 'http://localhost:5001'; // Hardcode the port to 5001
      console.log("Using API URL:", apiUrl);
      
      // First step - submit job
      toast("Starting animation process with Runway...");
      setAnimationProgress(10);
      
      console.log("Submitting animation request to API with params:", {
        imageLength: selectedClip.image?.length || 0,
        prompt: selectedClip.animationDescription,
        duration: selectedClip.animationDuration || 5,
        style: selectedClip.style
      });
      
      // The image could be any format - data URL, local file, or https URL
      // The backend will handle uploading to Cloudinary if needed
      const response = await fetch(`${apiUrl}/api/generate-animation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: selectedClip.image,
          prompt: selectedClip.animationDescription,
          duration: selectedClip.animationDuration || 5,
          style: selectedClip.style
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API returned error:", errorData);
        throw new Error(`Animation generation failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      
      if (data.success && data.animationUrl) {
        // Construct the full animation URL
        let fullAnimationUrl = data.animationUrl;
        
        // Make sure it always has the correct prefix
        if (!fullAnimationUrl.startsWith('http://')) {
          // If it's a relative path, add the full API URL
          if (fullAnimationUrl.startsWith('/')) {
            fullAnimationUrl = apiUrl + fullAnimationUrl;
          } else {
            fullAnimationUrl = `${apiUrl}/${fullAnimationUrl}`;
          }
        }
        
        console.log("Generated animation URL:", fullAnimationUrl);
        
        // Simulate progress while Runway does its work
        let currentProgress = 20;
        const progressInterval = setInterval(() => {
          currentProgress += 5;
          if (currentProgress >= 95) {
            clearInterval(progressInterval);
          } else {
            setAnimationProgress(currentProgress);
          }
        }, 1000);
        
        // Animation is ready
        setAnimationProgress(100);
        
        // Save animation URL to localStorage for debugging
        try {
          localStorage.setItem('lastAnimationUrl', fullAnimationUrl);
          localStorage.setItem('lastClipId', selectedClip.id);
          console.log("Saved animation URL to localStorage for debugging");
        } catch (err) {
          console.error("Failed to save to localStorage:", err);
        }
        
        // Update clip with animation data - important to create a new object
        console.log("Updating clip with animation data");
        
        // Create a complete new clip object with all properties
        const animatedClip = {
          ...selectedClip,
          animationUrl: fullAnimationUrl,
          animated: true
        };
        
        // Log the update details
        console.log("Animation update details:", {
          clipId: animatedClip.id,
          originalUrl: selectedClip.animationUrl,
          newUrl: fullAnimationUrl,
          animated: true
        });
        
        // Update the clip
        onUpdateClip(animatedClip);
        
        toast.success('Animation generated successfully!');
        clearInterval(progressInterval);
        
        // Short delay before switching to animation phase
        setTimeout(() => {
          console.log("Switching to animation phase with URL:", fullAnimationUrl);
          setEditorPhase('animation');
        }, 100);
      } else {
        console.error("Invalid API response - missing animation URL", data);
        throw new Error('No animation URL returned from API');
      }
    } catch (error) {
      console.error('Error generating animation:', error);
      toast.error(`Failed to generate animation: ${error.message}`);
    } finally {
      setIsAnimating(false);
    }
  };
  
  const handleCharacterToggle = (character) => {
    console.log("ClipEditor: Character toggle for", character.name);
    
    // Check if character is already selected
    const isSelected = selectedCharacters.some(c => c.id === character.id);
    
    // Create new array of characters based on selection state
    let updatedCharacters;
    if (isSelected) {
      console.log(`ClipEditor: Removing character ${character.name || character.id} from selection`);
      updatedCharacters = selectedCharacters.filter(c => c.id !== character.id);
    } else {
      console.log(`ClipEditor: Adding character ${character.name || character.id} to selection`);
      updatedCharacters = [...selectedCharacters, character];
    }
    
    // Update both local state and parent clip
    setSelectedCharacters(updatedCharacters);
    
    // Immediately update the parent component's state
    onUpdateClip({
      ...selectedClip,
      characters: updatedCharacters
    });
    
    console.log("ClipEditor: Updated character selection:", updatedCharacters);
  };

  const renderSetupPhase = () => (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Characters ({selectedCharacters.length} selected)
          </h3>
          
          <button 
            onClick={() => window.location.href = '/character-creator'} 
            className="text-xs text-blue-500 hover:text-blue-300 transition-colors duration-200 flex items-center"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Character
          </button>
        </div>
        
        <div className="flex border-b border-gray-700 mb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setCharacterTab('project')}
              className={`px-3 py-1 text-sm rounded-md ${
                characterTab === 'project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Project Characters
            </button>
            <button
              onClick={() => setCharacterTab('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                characterTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Characters
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
          {characterTab === 'project' ? (
            projectCharacters?.length > 0 ? (
              projectCharacters.map(character => (
                <div 
                  key={character.id}
                  onClick={() => handleCharacterToggle(character)}
                  className={`relative cursor-pointer ${
                    selectedCharacters.some(c => c.id === character.id) ? 'bg-gray-600' : ''
                  }`}
                >
                  <img
                    src={getImageUrl(character.thumbnail || character.imageUrl || character.imagePath)}
                    alt={character.name}
                    className="w-16 h-16 object-cover"
                    onError={(e) => {
                      console.log(`Image error for character ${character.name}:`, e);
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9IjAuMzVlbSI+P3wvdGV4dD48L3N2Zz4=";
                    }}
                  />
                  <span className="text-xs text-white py-1">{character.name}</span>
                  
                  {/* Remove from project button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (typeof onRemoveFromProject === 'function') {
                        onRemoveFromProject(character);
                      }
                    }}
                    title="Remove from project characters"
                    className="absolute top-0 right-0 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center my-4">
                <p className="text-gray-400">No project characters available</p>
                <p className="text-gray-400 text-xs mt-1">Try selecting from "All Characters" tab</p>
              </div>
            )
          ) : (
            allCharacters?.length > 0 ? (
              allCharacters.map(character => (
                <div 
                  key={character.id}
                  onClick={() => handleCharacterToggle(character)}
                  className={`relative cursor-pointer ${
                    selectedCharacters.some(c => c.id === character.id) ? 'bg-gray-600' : ''
                  }`}
                >
                  <img
                    src={getImageUrl(character.thumbnail || character.imageUrl || character.imagePath)}
                    alt={character.name}
                    className="w-16 h-16 object-cover"
                    onError={(e) => {
                      console.log(`Image error for character ${character.name}:`, e);
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9IjAuMzVlbSI+P3wvdGV4dD48L3N2Zz4=";
                    }}
                  />
                  <span className="text-xs text-white py-1">{character.name}</span>
                  
                  {/* Add to project button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!projectCharacters.some(c => c.id === character.id) && typeof onAddToProject === 'function') {
                        onAddToProject(character);
                      }
                    }}
                    title="Add to project characters"
                    className="absolute top-0 right-0 bg-green-600 hover:bg-green-700 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center my-4">
                <p className="text-gray-400">No characters available</p>
                <p className="text-gray-400 text-xs mt-1">Create characters in the Character Creator</p>
                <button 
                  onClick={() => window.location.href = '/character-creator'}
                  className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors duration-300"
                >
                  Create Character
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Scene Description</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Environment</label>
            <input
              type="text"
              value={selectedClip.environment}
              onChange={(e) => updateClipProperty('environment', e.target.value)}
              placeholder="e.g., School classroom, space station, forest"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Action</label>
            <input
              type="text"
              value={selectedClip.action}
              onChange={(e) => updateClipProperty('action', e.target.value)}
              placeholder="e.g., Fighting, talking, running"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Animation Style</h3>
        <div className="grid grid-cols-2 gap-2">
          {['anime', 'cartoon', 'realistic', 'comic'].map(style => (
            <button
              key={style}
              className={`px-3 py-2 ${selectedClip.style === style ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded transition-colors duration-300`}
              onClick={() => updateClipProperty('style', style)}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-8">
        <button
          onClick={handleGenerateImage}
          disabled={isGenerating || !selectedClip.environment || selectedCharacters.length === 0}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Image with AI
        </button>
        <div className="mt-2 text-center">
          <p className="text-gray-400 text-sm">
            Or
          </p>
          <div className="relative mt-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                // Pass the actual file rather than the event
                if (e.target.files && e.target.files[0]) {
                  onUploadImage(e.target.files[0]);
                }
              }}
              className="hidden"
              id="media-upload"
            />
            <label
              htmlFor="media-upload"
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-300 cursor-pointer text-center block"
            >
              Upload Your Own Image
            </label>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Modify the rendering to use this new handler
  const renderContent = () => {
    switch (editorPhase) {
      case 'setup':
        return renderSetupPhase();
      case 'image':
        return (
          <ImagePhase
            selectedClip={selectedClip}
            updateClipProperty={updateClipProperty}
            onGenerateImage={onGenerateImage}
            onUploadImage={onUploadImage}
            isGenerating={isGenerating}
            generationProgress={generationProgress}
            startAnimation={startAnimation}
            isAnimating={isAnimating}
            setEditorPhase={(phase) => handlePhaseChange(phase)}
            onUpdateClip={onUpdateClip}
          />
        );
      case 'animation':
        return (
          <AnimationPhase
            selectedClip={selectedClip}
            updateClipProperty={updateClipProperty}
            onUpdateClip={onUpdateClip}
            isAnimating={isAnimating}
            animationProgress={animationProgress}
            animationPrompt={animationPrompt}
            setEditorPhase={(phase) => handlePhaseChange(phase)}
          />
        );
      default:
        return renderSetupPhase();
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Clip Editor</h2>
      </div>

      <div className="flex items-center mb-6">
        <div 
          className={`flex items-center ${editorPhase === 'setup' ? 'text-blue-500' : 'text-gray-500'} ${isAnimating || isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => (!isAnimating && !isGenerating) ? setEditorPhase('setup') : null}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'setup' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Setup</span>
        </div>
        <div className="flex-grow mx-2 h-px bg-gray-700"></div>
        <div 
          className={`flex items-center ${editorPhase === 'image' ? 'text-blue-500' : 'text-gray-500'} ${isAnimating || isGenerating || !selectedClip.image ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => (!isAnimating && !isGenerating && selectedClip.image) ? setEditorPhase('image') : null}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Image</span>
        </div>
        <div className="flex-grow mx-2 h-px bg-gray-700"></div>
        <div 
          className={`flex items-center ${editorPhase === 'animation' ? 'text-blue-500' : 'text-gray-500'} ${isAnimating || isGenerating || !selectedClip.animated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => (!isAnimating && !isGenerating && selectedClip.animated) ? setEditorPhase('animation') : null}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'animation' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Animation</span>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default ClipEditor; 
