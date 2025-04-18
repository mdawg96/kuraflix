import React, { useState } from 'react';

const SceneEditorPage = () => {
  const [sceneDescription, setSceneDescription] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [characters, setCharacters] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [scenePreview, setScenePreview] = useState(null);

  // Placeholder character data (in real app, this would be loaded from API)
  const availableCharacters = [
    { id: 1, name: 'Hiro', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
    { id: 2, name: 'Yuki', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
    { id: 3, name: 'Kenta', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
  ];

  // Placeholder backgrounds
  const availableBackgrounds = [
    { id: 1, name: 'School', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
    { id: 2, name: 'City Street', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
    { id: 3, name: 'Beach', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
    { id: 4, name: 'Forest', imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' },
  ];

  const toggleCharacter = (character) => {
    if (characters.find(c => c.id === character.id)) {
      setCharacters(characters.filter(c => c.id !== character.id));
    } else {
      setCharacters([...characters, character]);
    }
  };

  const generateScene = () => {
    if (!sceneDescription || !dialogue || characters.length === 0 || !selectedBackground) return;
    
    setGenerating(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setScenePreview('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
      setGenerating(false);
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          Scene Editor
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          Craft scenes for your anime story
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scene Settings */}
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Scene Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="sceneDescription" className="block text-sm font-medium text-gray-300">Scene Description</label>
                <textarea
                  id="sceneDescription"
                  rows={4}
                  className="input w-full mt-1"
                  placeholder="Describe what happens in this scene..."
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Characters in Scene</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableCharacters.map(character => (
                    <div 
                      key={character.id}
                      onClick={() => toggleCharacter(character)}
                      className={`cursor-pointer p-2 rounded-lg border-2 ${characters.find(c => c.id === character.id) ? 'border-indigo-500' : 'border-gray-700'}`}
                    >
                      <img src={character.imageUrl} alt={character.name} className="w-full h-auto rounded-md" />
                      <p className="text-sm text-center mt-1">{character.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Background</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableBackgrounds.map(background => (
                    <div 
                      key={background.id}
                      onClick={() => setSelectedBackground(background)}
                      className={`cursor-pointer p-2 rounded-lg border-2 ${selectedBackground?.id === background.id ? 'border-indigo-500' : 'border-gray-700'}`}
                    >
                      <img src={background.imageUrl} alt={background.name} className="w-full h-auto rounded-md" />
                      <p className="text-sm text-center mt-1">{background.name}</p>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Camera & Effects</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="camera" className="block text-sm font-medium text-gray-300">Camera Angle</label>
                <select id="camera" className="input w-full mt-1">
                  <option>Wide Shot</option>
                  <option>Medium Shot</option>
                  <option>Close-Up</option>
                  <option>Low Angle</option>
                  <option>High Angle</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="effect" className="block text-sm font-medium text-gray-300">Visual Effect</label>
                <select id="effect" className="input w-full mt-1">
                  <option>None</option>
                  <option>Rain</option>
                  <option>Snow</option>
                  <option>Cherry Blossoms</option>
                  <option>Sunset Glow</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-300">Time of Day</label>
                <select id="time" className="input w-full mt-1">
                  <option>Day</option>
                  <option>Night</option>
                  <option>Sunset</option>
                  <option>Sunrise</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dialogue and Preview */}
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Dialogue</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="dialogue" className="block text-sm font-medium text-gray-300">Scene Dialogue</label>
                <textarea
                  id="dialogue"
                  rows={8}
                  className="input w-full mt-1"
                  placeholder="Enter the dialogue for this scene. Format as:\nCHARACTER NAME: What they say...\nANOTHER CHARACTER: Their response..."
                  value={dialogue}
                  onChange={(e) => setDialogue(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="btn-primary px-8"
                  onClick={generateScene}
                  disabled={generating || !sceneDescription || !dialogue || characters.length === 0 || !selectedBackground}
                >
                  {generating ? 'Generating...' : 'Generate Scene'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Scene Preview</h2>
            
            <div className="bg-gray-700 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
              {scenePreview ? (
                <img src={scenePreview} alt="Generated scene" className="w-full h-auto" />
              ) : (
                <div className="text-gray-400 text-center px-4">
                  <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">Your scene will appear here after generation</p>
                </div>
              )}
            </div>
            
            {scenePreview && (
              <div className="mt-4 flex space-x-4">
                <button className="btn-primary flex-1">Save Scene</button>
                <button className="btn-secondary flex-1">Regenerate</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneEditorPage; 


  