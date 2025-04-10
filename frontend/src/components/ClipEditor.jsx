import React, { useState, useEffect } from 'react';

const ClipEditor = ({
  selectedClip,
  onUpdateClip,
  onAddTextElement,
  onUpdateTextElement,
  onDeleteTextElement,
  onGenerateImage,
  onUploadImage,
  isGenerating,
  generationProgress,
  allCharacters = [],
  projectCharacters = []
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [editorPhase, setEditorPhase] = useState('setup');
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [characterTab, setCharacterTab] = useState('project');
  
  useEffect(() => {
    if (selectedClip && selectedClip.characters) {
      setSelectedCharacters(selectedClip.characters);
    }
  }, [selectedClip]);

  if (!selectedClip) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">Select a clip to edit</p>
        </div>
      </div>
    );
  }

  const updateClipProperty = (property, value) => {
    onUpdateClip({
      ...selectedClip,
      [property]: value
    });
  };

  const updateClipTiming = (startTime, endTime) => {
    onUpdateClip({
      ...selectedClip,
      startTime: Math.max(0, startTime),
      endTime: Math.max(startTime + 0.5, endTime)
    });
  };
  
  const handleGenerateImage = () => {
    const updatedClip = {
      ...selectedClip,
      characters: selectedCharacters
    };
    onUpdateClip(updatedClip);
    
    onGenerateImage();
    
    setEditorPhase('image');
  };
  
  const startAnimation = () => {
    if (!selectedClip.image) {
      alert("Please generate or upload an image first");
      return;
    }
    
    setIsAnimating(true);
    
    const charactersText = selectedCharacters.map(c => c.name).join(', ');
    let prompt = `SCENE: ${selectedClip.environment} with ${charactersText}`;
    prompt += selectedClip.action ? ` - ${selectedClip.action}` : '';
    prompt += `\n\nMOTION: Camera slowly pans across the scene, showing the characters with subtle movement.`;
    prompt += `\n\nSTYLE: High-quality ${selectedClip.style} style with smooth animation.`;
    
    setAnimationPrompt(prompt);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setAnimationProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsAnimating(false);
        
        updateClipProperty('animated', true);
        updateClipProperty('animationUrl', selectedClip.image);
      }
    }, 300);
  };
  
  const handleCharacterToggle = (character) => {
    const isSelected = selectedCharacters.some(c => c.id === character.id);
    
    if (isSelected) {
      setSelectedCharacters(selectedCharacters.filter(c => c.id !== character.id));
    } else {
      setSelectedCharacters([...selectedCharacters, character]);
    }
  };

  const renderSetupPhase = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Characters</h3>
        
        <div className="flex border-b border-gray-700 mb-2">
          <button
            className={`py-1 px-3 text-sm font-medium ${characterTab === 'project' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setCharacterTab('project')}
          >
            Project Characters
          </button>
          <button
            className={`py-1 px-3 text-sm font-medium ${characterTab === 'all' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
            onClick={() => setCharacterTab('all')}
          >
            All Characters
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
          {characterTab === 'project' ? (
            projectCharacters.length > 0 ? (
              projectCharacters.map(character => (
                <div 
                  key={character.id}
                  onClick={() => handleCharacterToggle(character)}
                  className={`cursor-pointer bg-gray-700 p-2 rounded-lg flex flex-col items-center ${
                    selectedCharacters.some(c => c.id === character.id) ? 'ring-2 ring-blue-500' : 'hover:bg-gray-600'
                  }`}
                >
                  <img
                    src={character.thumbnail || character.imageUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23666%22%2F%3E%3Ctext%20x%3D%2225%22%20y%3D%2230%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EChar%3C%2Ftext%3E%3C%2Fsvg%3E"}
                    alt={character.name}
                    className="w-12 h-12 object-cover rounded-md mb-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23666%22%2F%3E%3Ctext%20x%3D%2225%22%20y%3D%2230%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EError%3C%2Ftext%3E%3C%2Fsvg%3E";
                    }}
                  />
                  <span className="text-sm text-white truncate w-full text-center">{character.name}</span>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center p-4">
                <p className="text-gray-400">No project characters available</p>
                <p className="text-gray-400 text-sm mt-1">Try selecting from "All Characters" tab</p>
              </div>
            )
          ) : (
            allCharacters.length > 0 ? (
              allCharacters.map(character => (
                <div 
                  key={character.id}
                  onClick={() => handleCharacterToggle(character)}
                  className={`cursor-pointer bg-gray-700 p-2 rounded-lg flex flex-col items-center ${
                    selectedCharacters.some(c => c.id === character.id) ? 'ring-2 ring-blue-500' : 'hover:bg-gray-600'
                  }`}
                >
                  <img
                    src={character.thumbnail || character.imageUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23666%22%2F%3E%3Ctext%20x%3D%2225%22%20y%3D%2230%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EChar%3C%2Ftext%3E%3C%2Fsvg%3E"}
                    alt={character.name}
                    className="w-12 h-12 object-cover rounded-md mb-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2250%22%20height%3D%2250%22%20viewBox%3D%220%200%2050%2050%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23666%22%2F%3E%3Ctext%20x%3D%2225%22%20y%3D%2230%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20fill%3D%22%23fff%22%20text-anchor%3D%22middle%22%3EError%3C%2Ftext%3E%3C%2Fsvg%3E";
                    }}
                  />
                  <span className="text-sm text-white truncate w-full text-center">{character.name}</span>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center p-4">
                <p className="text-gray-400">No characters available</p>
                <p className="text-gray-400 text-sm mt-1">Create characters in the Character Creator</p>
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
              onChange={onUploadImage}
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
  
  const renderImagePhase = () => (
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
          <div className="bg-gray-900 p-4 rounded-lg aspect-video relative">
            {selectedClip.image ? (
              <img
                src={selectedClip.image}
                alt="Generated scene"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">No image generated yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-white">Text Elements</h3>
          <button
            onClick={() => onAddTextElement(selectedClip.id)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Add Text
          </button>
        </div>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
          {selectedClip.textElements?.map((textElement, index) => (
            <div key={textElement.id} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm">Text {index + 1}</span>
                <button
                  onClick={() => onDeleteTextElement(selectedClip.id, textElement.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <textarea
                value={textElement.text}
                onChange={(e) => onUpdateTextElement(selectedClip.id, textElement.id, { text: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm h-20"
                placeholder="Enter text..."
              />
              <div className="flex items-center mt-2 space-x-2">
                <select
                  value={textElement.style}
                  onChange={(e) => onUpdateTextElement(selectedClip.id, textElement.id, { style: e.target.value })}
                  className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm"
                >
                  <option value="subtitle">Subtitle</option>
                  <option value="caption">Caption</option>
                  <option value="title">Title</option>
                </select>
                <input
                  type="color"
                  value={textElement.color || '#ffffff'}
                  onChange={(e) => onUpdateTextElement(selectedClip.id, textElement.id, { color: e.target.value })}
                  className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                />
              </div>
            </div>
          ))}
          {(!selectedClip.textElements || selectedClip.textElements.length === 0) && (
            <div className="text-center text-gray-400 py-4">
              <p>No text elements added yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={startAnimation}
          disabled={!selectedClip.image || isAnimating}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Animate with Runway
        </button>
        <p className="mt-2 text-gray-400 text-sm text-center">
          Creates a motion clip from your still image
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
  
  const renderAnimationPhase = () => (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Animation Preview</h3>
        {isAnimating ? (
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Generating animation with Runway...</span>
              <span className="text-gray-400">{animationProgress}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${animationProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 p-4 rounded-lg aspect-video relative">
            {selectedClip.animated ? (
              <video
                src={selectedClip.animationUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500">Animation not created yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-white">Runway Gen-2 Prompt</h3>
          <button 
            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            onClick={() => navigator.clipboard.writeText(animationPrompt)}
          >
            Copy
          </button>
        </div>
        <pre className="bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 text-gray-300 text-sm whitespace-pre-wrap">
          {animationPrompt}
        </pre>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={() => setEditorPhase('image')}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to image editing
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Clip Editor</h2>
        <div className="flex space-x-1">
          <span className="text-gray-400 text-sm">
            Duration: {(selectedClip.endTime - selectedClip.startTime).toFixed(1)}s
          </span>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <div 
          className={`flex items-center ${editorPhase === 'setup' ? 'text-blue-500' : 'text-gray-500'}`}
          onClick={() => setEditorPhase('setup')}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'setup' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Setup</span>
        </div>
        <div className="flex-grow mx-2 h-px bg-gray-700"></div>
        <div 
          className={`flex items-center ${editorPhase === 'image' ? 'text-blue-500' : 'text-gray-500'}`}
          onClick={() => selectedClip.image ? setEditorPhase('image') : null}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'image' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Image</span>
        </div>
        <div className="flex-grow mx-2 h-px bg-gray-700"></div>
        <div 
          className={`flex items-center ${editorPhase === 'animation' ? 'text-blue-500' : 'text-gray-500'}`}
          onClick={() => selectedClip.animated ? setEditorPhase('animation') : null}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${editorPhase === 'animation' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Animation</span>
        </div>
      </div>

      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'content' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'timing' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('timing')}
        >
          Timing
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'effects' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
          onClick={() => setActiveTab('effects')}
        >
          Effects
        </button>
      </div>

      {activeTab === 'content' && (
        <>
          {editorPhase === 'setup' && renderSetupPhase()}
          {editorPhase === 'image' && renderImagePhase()}
          {editorPhase === 'animation' && renderAnimationPhase()}
        </>
      )}

      {activeTab === 'timing' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Clip Timing</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Start Time (seconds)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={selectedClip.startTime}
                onChange={(e) => updateClipTiming(parseFloat(e.target.value), selectedClip.endTime)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">End Time (seconds)</label>
              <input
                type="number"
                min={selectedClip.startTime + 0.1}
                step="0.1"
                value={selectedClip.endTime}
                onChange={(e) => updateClipTiming(selectedClip.startTime, parseFloat(e.target.value))}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Duration: {(selectedClip.endTime - selectedClip.startTime).toFixed(1)} seconds</label>
              <div className="h-2 bg-gray-700 rounded-full mt-2">
                <div 
                  className="h-2 bg-blue-600 rounded-full"
                  style={{ width: `${Math.min(100, ((selectedClip.endTime - selectedClip.startTime) / 10) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'effects' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Clip Effects</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Fade In
            </button>
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Fade Out
            </button>
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Zoom In
            </button>
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Zoom Out
            </button>
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Pan Left
            </button>
            <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
              Pan Right
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Filters</h3>
            <div className="grid grid-cols-3 gap-2">
              {['None', 'Blur', 'Sepia', 'Grayscale', 'Bright', 'Dark'].map(filter => (
                <button 
                  key={filter} 
                  className={`px-2 py-1 ${selectedClip.filter === filter.toLowerCase() ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'} text-white rounded text-sm`}
                  onClick={() => updateClipProperty('filter', filter.toLowerCase())}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClipEditor; 