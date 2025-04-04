import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { mangaAPI } from '../services/api';
import ImageGenerationProgress from '../components/ImageGenerationProgress';

const MangaCreatorPage = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState([createDefaultPage()]);
  const [currentPage, setCurrentPage] = useState(0);
  const [storyTitle, setStoryTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [showPanelEditor, setShowPanelEditor] = useState(false);
  const [jobId, setJobId] = useState(null);
  
  // Create a default page with 5x3 grid of panels
  function createDefaultPage() {
    const rows = 5; // 5 vertical panels maximum
    const cols = 3; // 3 horizontal panels default
    
    const panels = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        row.push({
          id: `${i}-${j}`,
          type: 'rectangular', // default panel type
          characters: [],
          environment: '',
          action: '',
          image: null,
          textBoxes: [],
          position: { row: i, col: j }
        });
      }
      panels.push(row);
    }
    
    return {
      id: Date.now(),
      panels,
      layout: {
        rows,
        cols
      }
    };
  }
  
  // Handle adding a new page
  const addNewPage = () => {
    setPages([...pages, createDefaultPage()]);
    setCurrentPage(pages.length); // Move to the new page
  };
  
  // Handle deleting the current page
  const deletePage = () => {
    if (pages.length > 1) {
      const newPages = [...pages];
      newPages.splice(currentPage, 1);
      setPages(newPages);
      setCurrentPage(Math.min(currentPage, newPages.length - 1));
    }
  };
  
  // Handle panel click to open editor
  const handlePanelClick = (rowIndex, colIndex) => {
    const panel = pages[currentPage].panels[rowIndex][colIndex];
    setSelectedPanel(panel);
    setShowPanelEditor(true);
  };
  
  // Update panel configuration
  const updatePanel = (updatedPanel) => {
    const newPages = [...pages];
    const { row, col } = updatedPanel.position;
    newPages[currentPage].panels[row][col] = updatedPanel;
    setPages(newPages);
    setShowPanelEditor(false);
    setSelectedPanel(null);
  };
  
  // Adjust page layout - rows & columns
  const adjustLayout = (rows, cols) => {
    const newPages = [...pages];
    const currentPageData = newPages[currentPage];
    
    // Create a new panels array with the adjusted dimensions
    const newPanels = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        // Keep existing panel data if it exists
        if (i < currentPageData.panels.length && j < currentPageData.panels[i].length) {
          const existingPanel = currentPageData.panels[i][j];
          row.push({
            ...existingPanel,
            position: { row: i, col: j }
          });
        } else {
          // Create new panel
          row.push({
            id: `${i}-${j}`,
            type: 'rectangular',
            characters: [],
            environment: '',
            action: '',
            image: null,
            textBoxes: [],
            position: { row: i, col: j }
          });
        }
      }
      newPanels.push(row);
    }
    
    currentPageData.panels = newPanels;
    currentPageData.layout = { rows, cols };
    
    setPages(newPages);
  };
  
  // Handle publishing the manga
  const publishManga = () => {
    // In a real app, this would send the data to a backend
    alert(`Manga "${storyTitle}" published successfully!`);
    navigate('/my-stories');
  };
  
  // Panel Editor Component
  const PanelEditor = ({ panel, onUpdate, onClose }) => {
    const [editPhase, setEditPhase] = useState('content'); // 'content' or 'styling'
    const [editedPanel, setEditedPanel] = useState({ ...panel });
    const [panelType, setPanelType] = useState(panel.type);
    const [selectedCharacters, setSelectedCharacters] = useState(panel.characters);
    const [environment, setEnvironment] = useState(panel.environment);
    const [action, setAction] = useState(panel.action);
    const [textBoxes, setTextBoxes] = useState(panel.textBoxes || []);
    const [generatedImage, setGeneratedImage] = useState(panel.image);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    
    // Advanced generation settings
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [modelType, setModelType] = useState('anything-v5');
    const [styleType, setStyleType] = useState('manga');
    const [negativePrompt, setNegativePrompt] = useState('low quality, bad anatomy, worst quality, blurry');
    
    // Model options for manga generation
    const modelOptions = [
      { id: 'anything-v5', name: 'Anything V5 (Best overall for anime)' },
      { id: 'counterfeit', name: 'Counterfeit (Good for detailed anime)' },
      { id: 'meinamix', name: 'MeinaMix (Balanced style)' }, 
      { id: 'toonyou', name: 'ToonYou (Stylized cartoonish)' }
    ];
    
    // Style options
    const styleOptions = [
      { id: 'manga', name: 'Black & White Manga (Traditional)' },
      { id: 'anime', name: 'Anime Style (Colored)' },
      { id: 'realistic-manga', name: 'Realistic Manga (Detailed)' },
      { id: 'chibi', name: 'Chibi Style (Cute)' },
      { id: 'sketch', name: 'Sketch Style (Rough lines)' }
    ];
    
    // Set initial edit phase based on whether image exists
    React.useEffect(() => {
      setEditPhase(panel.image ? 'styling' : 'content');
    }, [panel.image]);
    
    // Mock character data
    const availableCharacters = [
      { id: 1, name: 'Hiro', thumbnail: 'https://via.placeholder.com/50' },
      { id: 2, name: 'Yuki', thumbnail: 'https://via.placeholder.com/50' },
      { id: 3, name: 'Kenta', thumbnail: 'https://via.placeholder.com/50' },
      { id: 4, name: 'Sakura', thumbnail: 'https://via.placeholder.com/50' }
    ];
    
    // Mock environments
    const environments = [
      'School', 'City', 'Forest', 'Beach', 'Mountain', 'Space', 'Castle'
    ];
    
    // Generate image based on panel data
    const generateImage = async () => {
      try {
        setIsGenerating(true);
        setGenerationError(null);
        
        console.log('Generating image with:', {
          characters: selectedCharacters,
          environment,
          action,
          style: styleType,
          model: modelType,
          negativePrompt
        });
        
        // Call our API
        const response = await mangaAPI.generatePanel({
          characters: selectedCharacters,
          environment,
          action,
          style: styleType,
          model: modelType,
          negativePrompt
        });
        
        if (response.data.success) {
          // Store the job ID for progress tracking
          setJobId(response.data.jobId);
        } else {
          setGenerationError('Failed to generate image. Please try again.');
        }
      } catch (error) {
        console.error('Error generating manga panel:', error);
        setGenerationError(`Error: ${error.message || 'Failed to connect to image generation service'}`);
      } finally {
        setIsGenerating(false);
      }
    };
    
    // Add new text box
    const addTextBox = (type) => {
      const newTextBox = {
        id: Date.now(),
        type: type, // 'speech', 'thought', 'narration', etc.
        text: '',
        position: { x: 50, y: 50 },
        style: { bold: false, italic: false, fontSize: 14 }
      };
      setTextBoxes([...textBoxes, newTextBox]);
    };
    
    // Update text box
    const updateTextBox = (id, updates) => {
      setTextBoxes(textBoxes.map(box => 
        box.id === id ? { ...box, ...updates } : box
      ));
    };
    
    // Remove text box
    const removeTextBox = (id) => {
      setTextBoxes(textBoxes.filter(box => box.id !== id));
    };
    
    // Handle save
    const handleSave = () => {
      const updatedPanel = {
        ...editedPanel,
        type: panelType,
        characters: selectedCharacters,
        environment,
        action,
        image: generatedImage,
        textBoxes
      };
      onUpdate(updatedPanel);
    };

    // Add handler for when generation is complete
    const handleGenerationComplete = (result) => {
      if (result && result.panel && result.panel.imageUrl) {
        setGeneratedImage(result.panel.imageUrl);
        setEditPhase('styling');
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-xl max-h-[90vh] overflow-y-auto border-2 border-anime-indigo/30 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-manga-dots bg-[size:10px_10px]"></div>
          
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h2 className="text-2xl font-manga text-white tracking-wide">
              <span className="text-anime-pink">Edit</span> <span className="text-anime-indigo">Panel</span>
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content Creation Tab Selector */}
          <div className="flex border-b border-gray-700 mb-6 relative z-10">
            <button
              onClick={() => setEditPhase('content')}
              className={`px-4 py-2 font-comic ${editPhase === 'content' 
                ? 'text-anime-pink border-b-2 border-anime-pink' 
                : 'text-gray-400 hover:text-gray-200'}`}
            >
              Content
            </button>
            <button
              onClick={() => setEditPhase('styling')}
              disabled={!generatedImage}
              className={`px-4 py-2 font-comic ${!generatedImage ? 'text-gray-600 cursor-not-allowed' : editPhase === 'styling' 
                ? 'text-anime-indigo border-b-2 border-anime-indigo' 
                : 'text-gray-400 hover:text-gray-200'}`}
            >
              Styling
            </button>
          </div>
          
          {/* Phase 1: Content Creation - Characters, Environment, Action */}
          {editPhase === 'content' && (
            <div className="space-y-6 relative z-10">
              {/* Characters */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Characters
                </h3>
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
                      className={`flex items-center p-2 border rounded cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                        selectedCharacters.some(c => c.id === character.id) 
                          ? 'border-anime-pink bg-anime-pink/20' 
                          : 'border-gray-700 bg-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <img src={character.thumbnail} alt={character.name} className="w-10 h-10 rounded-full border-2 border-white" />
                      <span className="ml-2 text-white font-comic">{character.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Environment */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Environment
                </h3>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                >
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
              
              {/* Action */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-manga-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Action
                </h3>
                <textarea
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="Describe what's happening in this panel..."
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-anime-indigo/30 focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                  rows={3}
                />
              </div>
              
              {/* Advanced Settings Section */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-white font-comic font-medium flex items-center">
                    <svg className="w-5 h-5 mr-2 text-manga-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Advanced Settings
                  </span>
                  <svg className={`w-5 h-5 transform transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAdvancedSettings && (
                  <div className="mt-4 space-y-4">
                    {/* Style Selection */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Art Style</label>
                      <select
                        value={styleType}
                        onChange={(e) => setStyleType(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                      >
                        {styleOptions.map(style => (
                          <option key={style.id} value={style.id}>{style.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Model Selection */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">AI Model</label>
                      <select
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                      >
                        {modelOptions.map(model => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Negative Prompt */}
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Negative Prompt (things to avoid)</label>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="low quality, bad anatomy, worst quality, blurry..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Show progress component when generating */}
              {jobId && (
                <div className="mt-4">
                  <ImageGenerationProgress 
                    jobId={jobId} 
                    onComplete={handleGenerationComplete}
                  />
                </div>
              )}
              
              {/* Generate Image Button */}
              <div className="pt-2">
                {generationError && (
                  <div className="mb-4 bg-red-900/40 text-red-200 p-3 rounded-lg border border-red-700 text-sm">
                    {generationError}
                  </div>
                )}
                
                <button
                  onClick={generateImage}
                  disabled={isGenerating || !environment || selectedCharacters.length === 0 || !action}
                  className={`w-full px-4 py-3 font-comic rounded-lg shadow-lg transform transition-all duration-200 flex items-center justify-center
                    ${isGenerating 
                      ? 'bg-gray-700 text-gray-300 cursor-wait' 
                      : (!environment || selectedCharacters.length === 0 || !action)
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-anime-indigo to-anime-pink text-white hover:scale-105'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Generate Image
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button 
                  onClick={onClose}
                  className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Phase 2: Styling - Panel Type, Text Boxes */}
          {editPhase === 'styling' && (
            <div className="space-y-6 relative z-10">
              {/* Image Preview */}
              <div className="mb-4">
                {generatedImage && (
                  <div className="relative border-[3px] border-ink-black rounded-lg overflow-hidden shadow-manga-lg">
                    <img 
                      src={generatedImage} 
                      alt="Generated panel" 
                      className="w-full" 
                    />
                    <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                  </div>
                )}
              </div>
              
              {/* Panel Type */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-manga-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Panel Type
                </h3>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setPanelType('rectangular')}
                    className={`flex-1 px-3 py-2 rounded-lg font-comic ${panelType === 'rectangular' ? 'bg-gradient-to-r from-anime-indigo to-anime-pink text-white shadow-lg' : 'bg-gray-700 text-gray-300 border border-gray-600'}`}
                  >
                    Rectangular
                  </button>
                  <button 
                    onClick={() => setPanelType('diagonal')}
                    className={`flex-1 px-3 py-2 rounded-lg font-comic ${panelType === 'diagonal' ? 'bg-gradient-to-r from-anime-indigo to-anime-pink text-white shadow-lg' : 'bg-gray-700 text-gray-300 border border-gray-600'}`}
                  >
                    Diagonal
                  </button>
                </div>
              </div>
              
              {/* Text Boxes */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Text Bubbles
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => addTextBox('speech')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-comic border border-gray-600 transition-colors duration-200 flex flex-col items-center"
                  >
                    <div className="speech-bubble-icon w-8 h-8 mb-1 bg-white rounded-full border border-gray-700 flex items-center justify-center text-black">
                      <span className="text-xs">"..."</span>
                    </div>
                    Speech
                  </button>
                  <button 
                    onClick={() => addTextBox('thought')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-comic border border-gray-600 transition-colors duration-200 flex flex-col items-center"
                  >
                    <div className="thought-bubble-icon w-8 h-8 mb-1 bg-white rounded-full border border-gray-700 flex items-center justify-center text-black">
                      <span className="text-xs">...</span>
                    </div>
                    Thought
                  </button>
                  <button 
                    onClick={() => addTextBox('narration')}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-comic border border-gray-600 transition-colors duration-200 flex flex-col items-center"
                  >
                    <div className="narration-box-icon w-8 h-8 mb-1 bg-white border border-gray-700 flex items-center justify-center text-black">
                      <span className="text-xs">Narr</span>
                    </div>
                    Narration
                  </button>
                </div>
                
                {textBoxes.length === 0 ? (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600 text-center text-gray-400 text-sm font-comic">
                    No text bubbles added yet. Add one using the buttons above.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {textBoxes.map(box => (
                      <div key={box.id} className="flex items-center bg-gray-700 p-3 rounded-lg border border-gray-600">
                        <div className={`w-8 h-8 flex-shrink-0 rounded-full ${box.type === 'narration' ? 'bg-paper-white rounded-sm' : 'bg-white'} border border-gray-700 flex items-center justify-center text-xs`}>
                          {box.type === 'speech' && '"..."'}
                          {box.type === 'thought' && '...'}
                          {box.type === 'narration' && 'Narr'}
                        </div>
                        <input
                          type="text"
                          value={box.text}
                          onChange={(e) => updateTextBox(box.id, { text: e.target.value })}
                          placeholder={`Enter ${box.type} text...`}
                          className="ml-3 flex-grow bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white text-sm font-comic focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                        />
                        <button 
                          onClick={() => removeTextBox(box.id)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-400 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button 
                  onClick={onClose}
                  className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="manga-btn bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg shadow-manga hover:shadow-manga-lg transform hover:scale-105 transition-all duration-200"
                >
                  Save Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Publish Modal Component
  const PublishModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-lg border-2 border-anime-indigo/30 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-manga-dots bg-[size:10px_10px]"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-manga text-white tracking-wide">
                <span className="text-anime-pink">Publish</span> <span className="text-anime-indigo">Manga</span>
              </h2>
              <button 
                onClick={() => setShowPublishModal(false)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Story Title
                </label>
                <input
                  type="text"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                  placeholder="Enter your manga title..."
                />
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                  placeholder="Your name or pen name..."
                />
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-manga-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                >
                  <option value="">Select Genre</option>
                  <option value="Action">Action</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Drama">Drama</option>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Horror">Horror</option>
                  <option value="Romance">Romance</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Slice of Life">Slice of Life</option>
                  <option value="Sports">Sports</option>
                  <option value="Supernatural">Supernatural</option>
                </select>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic h-24 resize-none"
                  placeholder="Write a brief description of your manga story..."
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button 
                onClick={() => setShowPublishModal(false)}
                className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={publishManga}
                className="manga-btn bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg shadow-manga hover:shadow-manga-lg transform hover:scale-105 transition-all duration-200"
                disabled={!storyTitle || !author || !genre || !description}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 bg-manga-dots bg-[size:20px_20px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white font-manga tracking-wide">
              <span className="text-anime-pink">Manga</span> 
              <span className="text-anime-indigo">Studio</span>
            </h1>
            <p className="text-gray-400 mt-1 italic">Create your own manga masterpiece</p>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowPublishModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Publish
            </button>
          </div>
        </div>
        
        <div className="bg-gray-900 p-6 rounded-lg mb-6 border-2 border-anime-indigo/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-manga-dots bg-[size:10px_10px]"></div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center space-x-4">
              <span className="text-white font-comic text-xl">Page {currentPage + 1} of {pages.length}</span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className={`w-10 h-10 flex items-center justify-center rounded-full ${currentPage === 0 ? 'bg-gray-800 text-gray-500' : 'bg-anime-indigo text-white hover:bg-anime-indigo/80'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                  disabled={currentPage === pages.length - 1}
                  className={`w-10 h-10 flex items-center justify-center rounded-full ${currentPage === pages.length - 1 ? 'bg-gray-800 text-gray-500' : 'bg-anime-indigo text-white hover:bg-anime-indigo/80'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button 
                onClick={addNewPage}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-comic"
              >
                <svg className="w-5 h-5 mr-2 animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Page
              </button>
              <button 
                onClick={deletePage}
                disabled={pages.length <= 1}
                className={`flex items-center px-4 py-2 rounded-lg font-comic ${pages.length <= 1 ? 'bg-gray-800 text-gray-500' : 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg transition-all duration-200'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Page
              </button>
            </div>
          </div>
          
          <div className="flex space-x-4 mb-6 relative z-10">
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <label className="block text-gray-300 text-sm mb-2 font-comic">Layout Template</label>
              <select 
                value={pages[currentPage].layoutTemplate || 'custom'}
                onChange={(e) => {
                  const template = e.target.value;
                  if (template === 'custom') return;
                  
                  // Apply predefined layout templates
                  if (template === 'classic') {
                    adjustLayout(3, 3); // 3x3 grid, classic comic layout
                  } else if (template === 'widescreen') {
                    adjustLayout(2, 3); // 2x3 grid, more cinematic
                  } else if (template === 'vertical') {
                    adjustLayout(4, 2); // 4x2 grid, vertical reading
                  } else if (template === 'dynamic') {
                    // Example of a more dynamic layout with varied panel sizes
                    // This would require more complex implementation
                    adjustLayout(3, 3, 'dynamic');
                  }
                }}
                className="w-full bg-gray-900 border border-anime-indigo/50 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
              >
                <option value="custom">Custom</option>
                <option value="classic">Classic Manga (3×3)</option>
                <option value="widescreen">Action Scene (2×3)</option>
                <option value="vertical">Vertical Webtoon (4×2)</option>
                <option value="dynamic">Dynamic Panels</option>
              </select>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <label className="block text-gray-300 text-sm mb-2 font-comic">Vertical Panels</label>
              <select 
                value={pages[currentPage].layout.rows}
                onChange={(e) => adjustLayout(parseInt(e.target.value), pages[currentPage].layout.cols)}
                className="w-full bg-gray-900 border border-anime-indigo/50 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <label className="block text-gray-300 text-sm mb-2 font-comic">Horizontal Panels</label>
              <select 
                value={pages[currentPage].layout.cols}
                onChange={(e) => adjustLayout(pages[currentPage].layout.rows, parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-anime-indigo/50 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
              >
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
              <label className="block text-gray-300 text-sm mb-2 font-comic">Panel Gutter</label>
              <select 
                value={pages[currentPage].gutterSize || 'medium'}
                onChange={(e) => {
                  const newPages = [...pages];
                  newPages[currentPage].gutterSize = e.target.value;
                  setPages(newPages);
                }}
                className="w-full bg-gray-900 border border-anime-indigo/50 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
          
          <div className="p-6 rounded-lg manga-page-container relative z-10 overflow-hidden border-[12px] border-double border-gray-800 shadow-[0_0_15px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(0,0,0,0.3)] bg-paper-white">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-manga-grid bg-[size:30px_30px] opacity-10"></div>
            
            {/* Manga Page Grid */}
            <div 
              className="grid h-[70vh] relative manga-grid" 
              style={{
                gridTemplateRows: `repeat(${pages[currentPage].layout.rows}, minmax(0, 1fr))`,
                gap: pages[currentPage].gutterSize === 'small' ? '6px' : 
                     pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
                padding: pages[currentPage].gutterSize === 'small' ? '6px' : 
                          pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
              }}
            >
              {pages[currentPage].panels.map((row, rowIndex) => (
                rowIndex < pages[currentPage].layout.rows && (
                  <div 
                    key={rowIndex} 
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: `repeat(${pages[currentPage].layout.cols}, minmax(0, 1fr))`,
                      gap: pages[currentPage].gutterSize === 'small' ? '6px' : 
                           pages[currentPage].gutterSize === 'large' ? '18px' : '10px',
                    }}
                  >
                    {row.map((panel, colIndex) => (
                      colIndex < pages[currentPage].layout.cols && (
                        <div 
                          key={panel.id}
                          onClick={() => handlePanelClick(rowIndex, colIndex)}
                          className={`manga-panel panel-zoom border-[3px] border-ink-black relative overflow-hidden cursor-pointer
                            hover:border-anime-indigo transition-all duration-200 
                            ${panel.type === 'diagonal' ? 'diagonal-panel' : ''}
                            ${Math.random() > 0.7 ? 'rotate-[0.4deg]' : Math.random() > 0.5 ? 'rotate-[-0.4deg]' : ''}`}
                          style={{
                            // Handle dynamic panel spanning if implemented
                            gridColumn: panel.colspan ? `span ${panel.colspan}` : 'auto',
                            gridRow: panel.rowspan ? `span ${panel.rowspan}` : 'auto',
                            '--rotation': `${(Math.random() * 0.8 - 0.4).toFixed(2)}deg`,
                          }}
                        >
                          {panel.image ? (
                            <div className="w-full h-full relative">
                              <img 
                                src={panel.image} 
                                alt={`Panel ${rowIndex}-${colIndex}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                              {Math.random() > 0.7 && (
                                <div className="absolute inset-0 pointer-events-none bg-speed-lines opacity-20"></div>
                              )}
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
                            <div 
                              key={textBox.id}
                              className={`absolute ${textBox.type}-bubble z-20`}
                              style={{
                                top: `${textBox.position.y}%`,
                                left: `${textBox.position.x}%`,
                                maxWidth: '80%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: '#fff',
                                padding: '8px 12px',
                                borderRadius: textBox.type === 'thought' ? '50%' : '8px',
                                border: textBox.type === 'narration' ? '2px solid #000' : 
                                        textBox.type === 'speech' ? '2px solid #000' : 'none',
                                boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
                              }}
                            >
                              <p className="font-comic" style={{
                                fontWeight: textBox.style.bold ? 'bold' : 'normal',
                                fontStyle: textBox.style.italic ? 'italic' : 'normal',
                                fontSize: `${textBox.style.fontSize}px`,
                                color: '#000',
                                margin: 0,
                                lineHeight: 1.2,
                              }}>
                                {textBox.text}
                              </p>
                            </div>
                          ))}
                          
                          {/* Sound effects - randomly generated for demo purposes */}
                          {panel.image && Math.random() > 0.85 && (
                            <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                              <p className={`font-manga text-4xl ${Math.random() > 0.5 ? 'sound-boom' : Math.random() > 0.5 ? 'sound-slash' : 'sound-pow'}`}>
                                {Math.random() > 0.7 ? 'BOOM!' : Math.random() > 0.5 ? 'SLASH!' : 'POW!'}
                              </p>
                            </div>
                          )}
                          
                          {/* Display thumbnail of characters if any */}
                          {panel.characters && panel.characters.length > 0 && (
                            <div className="absolute bottom-2 right-2 flex -space-x-2 z-20">
                              {panel.characters.slice(0, 3).map((char, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-800 overflow-hidden shadow-md">
                                  <img 
                                    src={char.thumbnail} 
                                    alt={char.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                              {panel.characters.length > 3 && (
                                <div className="w-8 h-8 rounded-full bg-anime-pink flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md">
                                  +{panel.characters.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                )
              ))}
            </div>
          </div>
          
          <div className="flex justify-center mt-6 relative z-10">
            <div className="flex flex-wrap justify-center gap-4">
              <button className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 shadow-manga hover:shadow-manga-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Add Reference
              </button>
              <button className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-600 hover:to-gray-800 shadow-manga hover:shadow-manga-lg flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export Page
              </button>
              <button className="manga-btn bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg shadow-manga hover:shadow-manga-lg transform hover:scale-105 transition-all duration-200 flex items-center">
                <svg className="w-5 h-5 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Generate Panels
              </button>
              <button className="manga-btn bg-gradient-to-r from-manga-yellow to-manga-red text-white rounded-lg shadow-manga hover:shadow-manga-lg transform hover:scale-105 transition-all duration-200 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add SFX
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Editor Modal */}
      {showPanelEditor && selectedPanel && (
        <PanelEditor 
          panel={selectedPanel} 
          onUpdate={updatePanel} 
          onClose={() => {
            setShowPanelEditor(false);
            setSelectedPanel(null);
          }} 
        />
      )}
      
      {/* Publish Modal */}
      {showPublishModal && <PublishModal />}
      
      {/* CSS for comic styling */}
      <style jsx>{`
        .manga-page-container {
          background-color: #f8f5f0;
          position: relative;
        }
        
        .manga-panel {
          background-color: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          position: relative;
        }
        
        .manga-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0) 50%);
          z-index: 1;
          pointer-events: none;
        }
        
        .manga-panel-overlay {
          background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 20%);
          box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
        }
        
        .diagonal-panel::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to bottom right, transparent 49.5%, black 49.5%, black 50.5%, transparent 50.5%);
          pointer-events: none;
          z-index: 2;
        }
        
        .speech-bubble {
          background-color: white;
          border: 2px solid black;
          border-radius: 12px;
        }
        
        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -15px;
          left: 20px;
          border-width: 15px 10px 0;
          border-style: solid;
          border-color: black transparent transparent;
          filter: drop-shadow(0 2px 0 rgba(0,0,0,0.1));
        }
        
        .speech-bubble::before {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 22px;
          border-width: 12px 8px 0;
          border-style: solid;
          border-color: white transparent transparent;
          z-index: 1;
        }
        
        .thought-bubble {
          border-radius: 50%;
          border: 2px solid black;
          padding: 15px;
        }
        
        .thought-bubble::before,
        .thought-bubble::after {
          content: '';
          position: absolute;
          border-radius: 50%;
          background-color: white;
          border: 2px solid black;
        }
        
        .thought-bubble::before {
          width: 15px;
          height: 15px;
          bottom: -20px;
          right: 25px;
        }
        
        .thought-bubble::after {
          width: 10px;
          height: 10px;
          bottom: -30px;
          right: 35px;
        }
        
        .narration-box {
          background-color: rgba(255, 255, 240, 0.9);
          border: 2px solid black;
          border-radius: 0;
          padding: 6px 10px;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }
        
        .sound-boom {
          color: #ff3d00;
          text-shadow: 2px 2px 0 #000;
          transform: rotate(-3deg) scale(1.2);
        }
        
        .sound-slash {
          color: #2979ff;
          text-shadow: 1px 1px 0 #000;
          transform: skewX(-15deg);
        }
        
        .sound-pow {
          color: #ffab00;
          text-shadow: 1px 1px 0 #000;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};

export default MangaCreatorPage; 