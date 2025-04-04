import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AnimeCreatorPage = () => {
  const [currentPanel, setCurrentPanel] = useState(0);
  const [panelLayout, setPanelLayout] = useState('classic'); // classic, widescreen, vertical, asymmetric
  const [panels, setPanels] = useState([
    { id: 1, content: null, style: 'rectangular', characters: [], environment: 'School', action: '', textBoxes: [] },
    { id: 2, content: null, style: 'rectangular', characters: [], environment: 'School', action: '', textBoxes: [] },
    { id: 3, content: null, style: 'rectangular', characters: [], environment: 'School', action: '', textBoxes: [] },
    { id: 4, content: null, style: 'rectangular', characters: [], environment: 'School', action: '', textBoxes: [] }
  ]);
  
  // Panel edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [environment, setEnvironment] = useState('School');
  const [action, setAction] = useState('');
  const [panelType, setPanelType] = useState('rectangular');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [editPhase, setEditPhase] = useState('content'); // 'content' or 'styling'

  // Mock character data
  const availableCharacters = [
    { id: 1, name: 'Hiro', thumbnail: 'https://via.placeholder.com/40?text=Hiro' },
    { id: 2, name: 'Yuki', thumbnail: 'https://via.placeholder.com/40?text=Yuki' },
    { id: 3, name: 'Kenta', thumbnail: 'https://via.placeholder.com/40?text=Kenta' },
    { id: 4, name: 'Sakura', thumbnail: 'https://via.placeholder.com/40?text=Sakura' }
  ];
  
  // Environment options
  const environments = [
    'School', 'City', 'Forest', 'Beach', 'Mountain', 'Space', 'Castle'
  ];

  // Panel layout presets based on manga conventions
  const panelLayouts = {
    classic: {
      name: 'Classic 2×2',
      description: 'Traditional manga layout with 4 evenly-sized panels'
    },
    widescreen: {
      name: 'Widescreen',
      description: 'Horizontal panels for cinematic scenes'
    },
    vertical: {
      name: 'Vertical Scroll',
      description: 'Tall panels ideal for digital reading'
    },
    asymmetric: {
      name: 'Dynamic',
      description: 'Varied panel sizes for dramatic storytelling'
    }
  };

  // Function to add new panel
  const addNewPanel = (style = 'rectangular') => {
    setPanels([...panels, { 
      id: panels.length + 1,
      content: null,
      style,
      characters: [],
      environment: 'School',
      action: '',
      textBoxes: []
    }]);
  };
  
  // Function to start editing a panel
  const startEditingPanel = (index) => {
    const panel = panels[index];
    setCurrentPanel(index);
    setEditingPanel(panel);
    setSelectedCharacters(panel.characters);
    setEnvironment(panel.environment);
    setAction(panel.action);
    setPanelType(panel.style);
    setGeneratedImage(panel.content);
    
    // Set the proper edit phase based on whether we have content
    setEditPhase(panel.content ? 'styling' : 'content');
    setShowEditModal(true);
  };
  
  // Function to generate image based on panel data
  const generateImage = () => {
    // This would connect to an AI service in a real implementation
    console.log('Generating image with:', {
      characters: selectedCharacters,
      environment,
      action
    });
    
    // Simulate image generation with a placeholder
    const characterNames = selectedCharacters.map(c => c.name).join(', ');
    const placeholderUrl = `https://via.placeholder.com/800x600?text=${environment}+with+${characterNames || 'no characters'}`;
    
    setGeneratedImage(placeholderUrl);
    
    // Move to styling phase
    setEditPhase('styling');
  };
  
  // Save panel changes
  const savePanel = () => {
    const updatedPanel = {
      ...editingPanel,
      style: panelType,
      characters: selectedCharacters,
      environment,
      action,
      content: generatedImage
    };
    
    const newPanels = [...panels];
    newPanels[currentPanel] = updatedPanel;
    setPanels(newPanels);
    setShowEditModal(false);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setShowEditModal(false);
    setEditingPanel(null);
  };

  // Get panel classes based on layout and panel style
  const getPanelClasses = (index, style) => {
    let baseClasses = "bg-gray-900 border-2 border-gray-700 overflow-hidden transition-transform hover:scale-105";
    
    // Add specific styling based on panel type
    if (style === 'rectangular') {
      baseClasses += " rounded-sm";
    } else if (style === 'diagonal') {
      baseClasses += " skew-x-3";
    } else if (style === 'full-bleed') {
      baseClasses += " border-0";
    } else if (style === 'circular') {
      baseClasses += " rounded-full";
    }
    
    // Add layout-specific styling
    if (panelLayout === 'classic') {
      // Classic manga layout (2x2 grid)
      return baseClasses;
    } else if (panelLayout === 'widescreen') {
      // Widescreen layout with wide panels
      return baseClasses + " col-span-2";
    } else if (panelLayout === 'vertical') {
      // Vertical layout for webtoon style
      return baseClasses + " row-span-2";
    } else if (panelLayout === 'asymmetric') {
      // Dynamic layout with varied panel sizes
      return index % 3 === 0 ? baseClasses + " col-span-2 row-span-2" : baseClasses;
    }
    
    return baseClasses;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Anime Studio</h1>
            <p className="text-gray-400 mt-1">Create your anime with manga-style panels</p>
          </div>
          
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
              Export Project
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Comic Page Display */}
          <div className="lg:col-span-2 bg-black p-6 rounded-lg border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Comic Book Preview</h2>
              <div className="flex space-x-2">
                <select 
                  value={panelLayout}
                  onChange={(e) => setPanelLayout(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                >
                  {Object.entries(panelLayouts).map(([key, layout]) => (
                    <option key={key} value={key}>{layout.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Comic/Manga Page Layout */}
            <div className="bg-white p-4 rounded comic-page">
              <div className={`grid gap-3 h-[60vh] w-full ${
                panelLayout === 'classic' ? 'grid-cols-2 grid-rows-2' :
                panelLayout === 'widescreen' ? 'grid-cols-2 grid-rows-2' :
                panelLayout === 'vertical' ? 'grid-cols-1 grid-rows-4' :
                'grid-cols-3 grid-rows-3'
              }`}>
                {panels.map((panel, index) => (
                  <div 
                    key={panel.id}
                    className={getPanelClasses(index, panel.style)}
                    onClick={() => startEditingPanel(index)}
                  >
                    {panel.content ? (
                      <div className="relative w-full h-full">
                        <img 
                          src={panel.content} 
                          alt={`Panel ${index + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        {/* Show character and environment info as a small overlay */}
                        {(panel.characters.length > 0 || panel.environment) && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-xs text-white">
                            {panel.environment && <span className="mr-1">{panel.environment}</span>}
                            {panel.characters.length > 0 && (
                              <span>• {panel.characters.map(c => c.name).join(', ')}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-500 text-center">
                          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2">Click to edit</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Page Navigation and Controls */}
            <div className="flex justify-between mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => addNewPanel('rectangular')}
                  className="flex items-center px-3 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Panel
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-white text-sm">Page 1 of 1</span>
                <button className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50" disabled>
                  &larr;
                </button>
                <button className="px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50" disabled>
                  &rarr;
                </button>
                <button className="flex items-center px-3 py-1 ml-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Page
                </button>
              </div>
            </div>
          </div>
          
          {/* Panel Editor */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Panel Editor</h2>
            
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-lg">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <p className="mt-2 text-gray-500">Click on a panel to edit it</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Panel Style Hints */}
        <div className="bg-gray-800 p-6 rounded-lg mt-6 border border-gray-700">
          <h2 className="text-lg font-medium text-white mb-4">Manga Panel Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Layout & Flow</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc pl-4">
                <li>Guide readers with a clear reading path (typically right-to-left in manga)</li>
                <li>Vary panel sizes to create rhythm and emphasize important moments</li>
                <li>Use gutters (space between panels) to control pacing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Panel Types</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc pl-4">
                <li>Full-bleed panels extend to page edges for impact</li>
                <li>Diagonal panels create dynamic action or tension</li>
                <li>Smaller panels for rapid sequence or detailed moments</li>
                <li>Borderless panels for flashbacks or dreamlike sequences</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-blue-400">Composition</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc pl-4">
                <li>Each panel should have a clear focal point</li>
                <li>Balance text placement with visual elements</li>
                <li>Use speech bubbles to guide the reader's eye</li>
                <li>Consider "camera angle" - close-ups for emotion, wide shots for setting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Panel Modal - with distinct phases */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Edit Panel</h2>
              <button 
                onClick={cancelEditing}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Phase 1: Content Creation - Characters, Environment, Action */}
            {editPhase === 'content' && (
              <div className="space-y-6">
                {/* Characters */}
                <div>
                  <h3 className="text-white font-medium mb-2">Characters</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableCharacters.map(character => (
                      <div 
                        key={character.id}
                        onClick={() => {
                          const isSelected = selectedCharacters.some(c => c.id === character.id);
                          let newCharacters;
                          
                          if (isSelected) {
                            newCharacters = selectedCharacters.filter(c => c.id !== character.id);
                          } else {
                            newCharacters = [...selectedCharacters, character];
                          }
                          
                          setSelectedCharacters(newCharacters);
                        }}
                        className={`flex items-center p-2 border rounded cursor-pointer ${
                          selectedCharacters.some(c => c.id === character.id) 
                            ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                            : 'border-gray-700 bg-gray-800'
                        }`}
                      >
                        <img src={character.thumbnail} alt={character.name} className="w-8 h-8 rounded-full" />
                        <span className="ml-2 text-white">{character.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Environment */}
                <div>
                  <h3 className="text-white font-medium mb-2">Environment</h3>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    {environments.map(env => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </div>
                
                {/* Action */}
                <div>
                  <h3 className="text-white font-medium mb-2">Action</h3>
                  <textarea
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="Describe what's happening in this panel..."
                    className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                
                {/* Generate Image Button */}
                <div>
                  <button
                    onClick={generateImage}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md font-medium flex items-center justify-center"
                    disabled={!environment || selectedCharacters.length === 0 || !action}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Generate Image
                  </button>
                </div>
                
                <div className="flex justify-end mt-6 space-x-3">
                  <button 
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-800 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Phase 2: Styling - Panel Type, Text Boxes */}
            {editPhase === 'styling' && (
              <div className="space-y-6">
                {/* Image Preview */}
                <div className="mb-4">
                  {generatedImage && (
                    <img 
                      src={generatedImage} 
                      alt="Generated panel" 
                      className="w-full rounded border border-gray-700" 
                    />
                  )}
                </div>
                
                {/* Panel Type */}
                <div>
                  <h3 className="text-white font-medium mb-2">Panel Type</h3>
                  <div className="flex space-x-4">
                    <button 
                      onClick={() => setPanelType('rectangular')}
                      className={`px-3 py-2 rounded ${panelType === 'rectangular' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                    >
                      Rectangular
                    </button>
                    <button 
                      onClick={() => setPanelType('diagonal')}
                      className={`px-3 py-2 rounded ${panelType === 'diagonal' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                    >
                      Diagonal
                    </button>
                  </div>
                </div>
                
                {/* Text Boxes */}
                <div>
                  <h3 className="text-white font-medium mb-2">Text Boxes</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="px-3 py-2 bg-gray-800 text-white text-sm rounded">
                      Speech Bubble
                    </button>
                    <button className="px-3 py-2 bg-gray-800 text-white text-sm rounded">
                      Thought Bubble
                    </button>
                    <button className="px-3 py-2 bg-gray-800 text-white text-sm rounded">
                      Narration
                    </button>
                  </div>
                  <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 text-center text-gray-500 text-sm">
                    No text boxes added yet. Add one using the buttons above.
                  </div>
                </div>
                
                <div className="flex justify-end mt-6 space-x-3">
                  <button 
                    onClick={cancelEditing}
                    className="px-4 py-2 bg-gray-800 text-white rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={savePanel}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Save Panel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Custom styles for Comic Book aesthetics */}
      <style jsx="true">{`
        .comic-page {
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
};

export default AnimeCreatorPage; 