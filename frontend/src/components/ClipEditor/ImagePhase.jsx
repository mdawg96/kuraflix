import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const ImagePhase = ({
  selectedClip,
  isGenerating,
  generationProgress,
  updateClipProperty,
  startAnimation,
  isAnimating,
  setEditorPhase,
  onUpdateClip
}) => {
  const [isSubmittingAnimation, setIsSubmittingAnimation] = useState(false);
  const [staticDuration, setStaticDuration] = useState(3); // Default duration for static image clips
  const [durationInput, setDurationInput] = useState("3"); // Text input state for duration
  
  // Helper function to ensure the image is in a valid format for Cloudinary
  const ensureValidImageFormat = async (imageUrl) => {
    try {
      // If it's already a properly formatted data URL, return it
      if (imageUrl.startsWith('data:image/jpeg') || 
          imageUrl.startsWith('data:image/jpg') || 
          imageUrl.startsWith('data:image/png')) {
        console.log("Image already in valid format:", imageUrl.substring(0, 30) + "...");
        return imageUrl;
      }
      
      console.log("Image needs conversion, source type:", 
                  imageUrl.startsWith('http') ? "URL" : 
                  imageUrl.startsWith('data:') ? "data URL" : "unknown");
      
      // For any image source, convert via canvas rendering to ensure compatibility
      const convertedImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            console.log("Image loaded successfully, dimensions:", img.width, "x", img.height);
            
            // Create a canvas with 9:16 aspect ratio
            const canvas = document.createElement('canvas');
            const maxHeight = 1024; // Max height for reasonable file size
            const targetWidth = maxHeight * (9/16); // 9:16 aspect ratio
            
            canvas.width = targetWidth;
            canvas.height = maxHeight;
            
            // Fill with black background
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate positioning to center and crop the image to 9:16
            let sx = 0;
            let sy = 0;
            let sWidth = img.width;
            let sHeight = img.height;
            
            const imgAspect = img.width / img.height;
            const targetAspect = 9/16;
            
            // If image is wider than 9:16, crop the sides
            if (imgAspect > targetAspect) {
              sWidth = img.height * targetAspect;
              sx = (img.width - sWidth) / 2;
            } 
            // If image is taller than 9:16, crop the top and bottom
            else if (imgAspect < targetAspect) {
              sHeight = img.width / targetAspect;
              sy = (img.height - sHeight) / 2;
            }
            
            // Draw image centered and cropped to 9:16
            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            
            // Convert to PNG
            const dataUrl = canvas.toDataURL('image/png', 0.85);
            console.log("Conversion successful, new data URL length:", dataUrl.length);
            console.log("Converted to 9:16 aspect ratio:", canvas.width, "x", canvas.height);
            
            resolve(dataUrl);
          } catch (canvasError) {
            console.error("Canvas error during conversion:", canvasError);
            reject(canvasError);
          }
        };
        
        img.onerror = (err) => {
          console.error("Failed to load image for conversion:", err);
          reject(new Error('Failed to load image'));
        };
        
        // Set source with cache-busting if it's an HTTP URL
        if (imageUrl.startsWith('http')) {
          img.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}cache=${Date.now()}`;
        } else {
          img.src = imageUrl;
        }
      });
      
      return convertedImage;
    } catch (error) {
      console.error("Image conversion failed:", error);
      toast.warning("Using fallback image due to conversion error");
      
      // Return a small, guaranteed-valid PNG as fallback
      // This is a 1x1 white pixel PNG
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    }
  };
  
  const handleAddToTimeline = () => {
    if (!selectedClip.image) {
      toast.error("Please generate or upload an image first");
      return;
    }

    // Get final duration value, ensuring it's between 1-30 seconds
    const finalDuration = Math.max(1, Math.min(30, Number(staticDuration) || 3));
    console.log(`Adding static image to timeline with duration: ${finalDuration}s`);

    // Create a unique ID for this static clip to prevent duplicates
    const uniqueId = `static-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Update the clip properties for a static image
    const updatedClip = {
      ...selectedClip,
      id: uniqueId, // Use a new unique ID to prevent duplicates
      type: 'static',
      duration: finalDuration,
      animated: false,
      aspectRatio: "9:16", // Explicitly set aspect ratio
      // Mark as confirmed (not a draft) so it gets added to the timeline
      draft: false,
      // Add timeline positioning properties needed by the timeline
      startTime: 0, // The parent component will position it appropriately
      endTime: finalDuration, // Just set initial duration - parent will reposition
    };

    console.log("Static clip properties:", updatedClip);

    // Update the clip in the parent component with these new properties
    onUpdateClip(updatedClip);
    toast.success(`Static image added to timeline (${finalDuration}s)`);
    
    // Since we're adding to timeline, close the editor completely by setting selectedClip to null
    // This triggers the parent component to close the editor modal
    try {
      // If this is available in the parent component structure, it will close the editor
      if (window.closeClipEditor) {
        window.closeClipEditor();
      }
      
      // Fallback - try to dispatch a close event that the parent might be listening for
      document.dispatchEvent(new CustomEvent('closeClipEditor', { detail: { clipId: uniqueId } }));
      
      // As a last resort, return to setup phase which is our only guaranteed option
      setEditorPhase('setup');
    } catch (error) {
      console.error("Error trying to close clip editor:", error);
      // Fallback to setup phase
      setEditorPhase('setup');
    }
  };

  // Handle duration input changes with better UX
  const handleDurationChange = (e) => {
    // Allow any input including empty string and partial numbers
    setDurationInput(e.target.value);
    
    // Try to parse as number, but don't enforce min/max yet to allow typing
    const parsedValue = parseFloat(e.target.value);
    if (!isNaN(parsedValue)) {
      setStaticDuration(parsedValue);
    }
  };

  // Handle input blur to enforce limits
  const handleDurationBlur = () => {
    // When leaving the field, enforce min/max constraints
    const finalValue = Math.max(1, Math.min(30, Number(durationInput) || 3));
    setStaticDuration(finalValue);
    setDurationInput(finalValue.toString());
  };

  const handleStartAnimation = async () => {
    if (!selectedClip.image) {
      toast.error("Please generate or upload an image first");
      return;
    }

    if (!selectedClip.animationDescription) {
      toast.error("Please provide an animation description");
      return;
    }

    try {
      // Disable the button immediately
      setIsSubmittingAnimation(true);
      
      // First step - submit job
      toast("Starting animation process with Runway...");
      
      // Ensure the image is in a valid format before sending to server
      console.log("Preparing image for animation API...");
      const validImageFormat = await ensureValidImageFormat(selectedClip.image);
      console.log("Image prepared for animation API, size:", validImageFormat.length);
      
      // Always use port 5001 for the backend
      const apiUrl = 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/generate-animation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: validImageFormat,
          prompt: selectedClip.animationDescription,
          duration: 5, // Fixed at 5 seconds
          style: selectedClip.style,
          aspectRatio: "9:16" // Explicitly request 9:16 aspect ratio
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Animation generation failed');
      }

      const data = await response.json();
      console.log("Animation API response:", data);

      if (data.success && data.animationUrl) {
        // Construct the full animation URL with explicit port 5001
        const fullAnimationUrl = `${apiUrl}${data.animationUrl}`;
        console.log("Setting animation URL:", fullAnimationUrl);
        
        // First set the animation URL
        updateClipProperty('animationUrl', fullAnimationUrl);
        
        // Then set the animated flag
        updateClipProperty('animated', true);
        
        // Set fixed duration of 5 seconds
        updateClipProperty('animationDuration', 5);
        
        // Set aspect ratio
        updateClipProperty('aspectRatio', "9:16");
        
        // Save to localStorage as a backup
        try {
          localStorage.setItem('lastAnimationUrl', fullAnimationUrl);
          localStorage.setItem('lastClipId', selectedClip.id);
        } catch (err) {
          console.error("Failed to save animation URL to localStorage:", err);
        }
        
        // Save to window cache
        if (!window.clipAnimationUrls) {
          window.clipAnimationUrls = {};
        }
        window.clipAnimationUrls[selectedClip.id] = fullAnimationUrl;
        
        toast.success('Animation generated successfully!');
        
        // Add a small delay before changing the phase to ensure state updates have propagated
        setTimeout(() => {
          setEditorPhase('animation');
        }, 100);
      } else {
        console.error("Invalid API response:", data);
        throw new Error('No animation URL returned from API');
      }
    } catch (error) {
      console.error('Error generating animation:', error);
      toast.error(`Error generating animation: ${error.message}`);
    } finally {
      // Re-enable the button in case of error
      // (In case of success, we'll navigate away)
      setIsSubmittingAnimation(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Generated Image</h3>
        {isGenerating ? (
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Generating image...</span>
              <span className="text-gray-400">{generationProgress}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 p-4 rounded-lg relative" style={{ aspectRatio: '9/16' }}>
            {selectedClip.image ? (
              <img
                src={selectedClip.image}
                alt="Generated scene"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.log("Image loading error for clip scene:", e);
                  e.target.onerror = null;
                  e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM0NDQiLz48dGV4dCB4PSIxNTAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvciA9Im1pZGRsZSIgZHk9IjAuMzVlbSI+SW1hZ2UgdW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">No image generated yet</p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1 text-center">Optimized for 9:16 portrait aspect ratio</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Animation Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Animation Description</label>
            <textarea
              value={selectedClip.animationDescription || ''}
              onChange={(e) => updateClipProperty('animationDescription', e.target.value)}
              placeholder="Describe how you want the scene to be animated (e.g., 'Camera slowly pans from left to right, characters move slightly')"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm h-24"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">All animations are generated with a fixed 5-second duration in 9:16 aspect ratio</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Static Image Options</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Static Image Duration (seconds)</label>
            <input
              type="text"
              inputMode="decimal"
              value={durationInput}
              onChange={handleDurationChange}
              onBlur={handleDurationBlur}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">How long the static image should appear (1-30 seconds)</p>
          </div>
          
          <button
            onClick={handleAddToTimeline}
            disabled={!selectedClip.image || isGenerating}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Static Image to Timeline ({staticDuration}s)
          </button>
          <p className="text-sm text-gray-400 text-center">
            Adds this image to the timeline without animation
          </p>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleStartAnimation}
          disabled={!selectedClip.image || isAnimating || isSubmittingAnimation}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmittingAnimation ? "Processing..." : "Animate with Runway"}
        </button>
        <p className="mt-2 text-gray-400 text-sm text-center">
          Creates a 5-second motion clip from your still image using your description
        </p>
      </div>
      
      <div className="mt-4 text-center">
        <button
          onClick={() => setEditorPhase('setup')}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to scene setup
        </button>
      </div>
    </div>
  );
};

export default ImagePhase; 