import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const NarrationEditor = ({ selectedClip, onUpdateClip, onClose }) => {
  const [narrationText, setNarrationText] = useState(selectedClip?.narrationText || '');
  const [speed, setSpeed] = useState(selectedClip?.narrationSpeed || 1);
  const [voice, setVoice] = useState(selectedClip?.narrationVoice || 'alloy');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(null);

  // Available voices from OpenAI TTS-1
  const availableVoices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Balanced)' },
    { id: 'fable', name: 'Fable (Expressive)' },
    { id: 'onyx', name: 'Onyx (Deep)' },
    { id: 'nova', name: 'Nova (Soft)' },
    { id: 'shimmer', name: 'Shimmer (Clear)' }
  ];

  const handleSpeedChange = (e) => {
    setSpeed(parseFloat(e.target.value));
  };

  const handleVoiceChange = (e) => {
    setVoice(e.target.value);
  };

  const generateNarration = async () => {
    if (!narrationText.trim()) {
      toast.error('Please enter some text for narration');
      return;
    }
    
    // Prevent multiple simultaneous generations
    if (isGenerating) {
      console.log("Generation already in progress, ignoring duplicate call");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // API call to backend to generate TTS (using real OpenAI endpoint)
      const response = await fetch('http://localhost:5001/api/generate-narration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: narrationText,
          voice: voice,
          speed: speed,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Unknown server error';
        throw new Error(errorMessage);
      }
      
      if (data.success && data.audioUrl) {
        // Calculate clip end time based on audio duration
        // Make sure we maintain the original startTime
        const startTime = selectedClip.startTime || 0;
        const newEndTime = startTime + (data.duration || 3);
        
        console.log(`Narration clip position: start=${startTime}, end=${newEndTime}, duration=${data.duration || 3}`);
        
        // Update the clip with narration data
        onUpdateClip({
          ...selectedClip,
          startTime: startTime, // Explicitly set startTime to maintain position
          narrationText: narrationText,
          narrationVoice: voice,
          narrationSpeed: speed,
          narrationUrl: data.audioUrl,
          narrationDuration: data.duration || 3,
          hasNarration: true,
          endTime: newEndTime // Update the clip end time to match audio duration
        });
        
        toast.success('Narration generated successfully!');
        onClose();
      } else {
        throw new Error(data.message || 'Failed to generate narration');
      }
    } catch (error) {
      console.error('Error generating narration:', error);
      toast.error(`Failed to generate narration: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const previewNarration = async () => {
    if (!narrationText.trim()) {
      toast.error('Please enter some text for narration');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate a preview using real OpenAI endpoint
      const response = await fetch('http://localhost:5001/api/preview-narration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: narrationText.substring(0, 100) + (narrationText.length > 100 ? '...' : ''), // Preview only first 100 chars
          voice: voice,
          speed: speed,
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Unknown server error';
        throw new Error(errorMessage);
      }
      
      if (data.success && data.audioUrl) {
        // Play the preview
        if (previewAudio) {
          previewAudio.pause();
          previewAudio.src = '';
        }
        
        const audio = new Audio(data.audioUrl);
        setPreviewAudio(audio);
        audio.play().catch(error => {
          console.error("Error playing audio:", error);
          toast.error("Could not play audio preview");
        });
        
        toast.success('Playing preview');
      } else {
        throw new Error(data.message || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error(`Failed to generate preview: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Narration Editor</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mb-6">
        <label className="block text-white font-medium mb-2">
          Narration Text
        </label>
        <textarea
          value={narrationText}
          onChange={(e) => setNarrationText(e.target.value)}
          placeholder="Enter the text you want to narrate..."
          className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 min-h-[150px]"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-white font-medium mb-2">
            Voice
          </label>
          <select
            value={voice}
            onChange={handleVoiceChange}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
          >
            {availableVoices.map(voiceOption => (
              <option key={voiceOption.id} value={voiceOption.id}>
                {voiceOption.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2">
            Speed: {speed}x
          </label>
          <input
            type="range"
            min="0.25"
            max="1"
            step="0.05"
            value={speed}
            onChange={handleSpeedChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Slower (0.25x)</span>
            <span>Normal (1x)</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
        <button
          onClick={previewNarration}
          disabled={isGenerating || !narrationText.trim()}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          {isGenerating ? 'Processing...' : 'Preview (first 100 chars)'}
        </button>
        
        <button
          onClick={generateNarration}
          disabled={isGenerating || !narrationText.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
        >
          {isGenerating ? 'Generating...' : 'Generate Narration'}
        </button>
      </div>
    </div>
  );
};

export default NarrationEditor; 