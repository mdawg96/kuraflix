import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { mangaAPI, characterAPI } from '../services/api';
import ImageGenerationProgress from '../components/ImageGenerationProgress';
import { Bubble } from '../components';
import { textBoxToBubbleProps, bubblePropsToTextBox, createTextBox, convertToYellBubble } from '../utils/bubbleUtils';
import PageEditor from '../components/PageEditor';

const MangaCreatorPageComponent = () => {
  console.log("PARENT: MangaCreatorPage render");
  
  const navigate = useNavigate();
  const location = useLocation();
  const [showProjectSelector, setShowProjectSelector] = useState(true);
  const [projectList, setProjectList] = useState([
    // Mock data - in a real app this would come from an API
    { id: 1, title: 'Hero Academy', author: 'You', lastEdited: '2 days ago', pages: 5, thumbnail: '/assets/images/placeholders/image.png' },
    { id: 2, title: 'Mystic Legends', author: 'You', lastEdited: '1 week ago', pages: 12, thumbnail: '/assets/images/placeholders/image.png' },
    { id: 3, title: 'Shadow Realm', author: 'You', lastEdited: '3 weeks ago', pages: 8, thumbnail: '/assets/images/placeholders/image.png' },
  ]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  
  // Editor state - only used after project selection
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
  
  // Style selection state
  const [styleType, setStyleType] = useState('manga');
  
  // Character selection state
  const [characterTab, setCharacterTab] = useState('project');
  const [projectCharacters, setProjectCharacters] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  
  // Load user projects on component mount
  useEffect(() => {
    // In a real app, you would fetch the user's projects from an API
    // For example: 
    // async function fetchProjects() {
    //   const response = await mangaAPI.getUserProjects();
    //   setProjectList(response.data.projects);
    // }
    // fetchProjects();
  }, []);
  
  // Check URL params on component mount and when popstate fires
  useEffect(() => {
    // Parse the URL to check for view parameter
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const projectId = params.get('projectId');
    
    if (view === 'editor') {
      setShowProjectSelector(false);
      
      // If we have a project ID and it's not 'new', try to find and load the project
      if (projectId && projectId !== 'new') {
        const project = projectList.find(p => p.id.toString() === projectId);
        if (project) {
          setStoryTitle(project.title);
          setAuthor(project.author);
        }
      }
    } else {
      setShowProjectSelector(true);
    }
    
    // Add popstate event listener to handle browser back/forward buttons
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      
      if (view === 'editor') {
        setShowProjectSelector(false);
      } else {
        setShowProjectSelector(true);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Clean up
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [projectList]);
  
  // Load an existing project and proceed to editor
  const loadProject = (project) => {
    // For this mock implementation, we'll just set the title and author
    setStoryTitle(project.title);
    setAuthor(project.author);
    setShowProjectSelector(false);
    
    // Update URL without leaving the page
    // This creates a URL parameter instead of a new path
    window.history.pushState(
      { project },
      '',
      `?view=editor&projectId=${project.id}`
    );
  };
  
  // Create a new project and proceed to editor
  const createNewProject = () => {
    setStoryTitle('Untitled Manga');
    setAuthor('Your Name');
    setShowProjectSelector(false);
    
    // Update URL without leaving the page
    window.history.pushState(
      {},
      '',
      '?view=editor&projectId=new'
    );
  };
  
  // Handle going back to project selection
  const goBackToProjects = () => {
    // Update the URL and go back to projects view
    window.history.pushState({}, '', '?view=projects');
    setShowProjectSelector(true);
  };
  
  // Create a default page with 4 rows and 3 columns per row
  function createDefaultPage() {
    const rows = 4;  // Changed from 3 to 4
    const cols = 3;  // Changed from 4 to 3
    const panels = Array(rows).fill().map(() => 
      Array(cols).fill().map(() => ({
        id: `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        colSpan: 1,
        rowSpan: 1,
        textBoxes: []
      }))
    );

    return {
      id: `page-${Date.now()}`,
      layout: {
        rows,
        cols
      },
      panels,
      gutterSize: 'medium',
      backgroundColor: '#232323'
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
    setSelectedPanel(prevPanel => {
      const newPanel = pages[currentPage].panels[rowIndex][colIndex];
      // If we're clicking the same panel, keep the existing reference
      if (prevPanel?.id === newPanel.id) {
        return prevPanel;
      }
      return newPanel;
    });
    setShowPanelEditor(true);
  };
  
  // Update panel configuration - memoized to prevent reference changes
  const updatePanel = useCallback((updatedPanel) => {
    console.log("updatePanel called with:", updatedPanel.id);
    
    setPages(prevPages => {
      // Create a new reference only if something is actually changing
      const { row, col } = updatedPanel.position;
      const oldPanel = prevPages[currentPage].panels[row][col];
      
      // Use a more efficient comparison for panels
      const hasChanges = oldPanel.id !== updatedPanel.id ||
                         oldPanel.image !== updatedPanel.image ||
                         JSON.stringify(oldPanel.characters) !== JSON.stringify(updatedPanel.characters) ||
                         oldPanel.environment !== updatedPanel.environment ||
                         oldPanel.action !== updatedPanel.action ||
                         oldPanel.style !== updatedPanel.style;
      
      if (!hasChanges) {
        console.log("Panel data unchanged, skipping pages update");
        return prevPages; // Return existing reference if nothing changed
      }
      
      // Only create a new pages array if we need to update
      const newPages = [...prevPages];
      newPages[currentPage].panels[row][col] = updatedPanel;
      return newPages;
    });
    
    // Only update selectedPanel if there's a meaningful change
    // Use a functional update to access current state
    setSelectedPanel(prevPanel => {
      // Quick reference check - if they're already the same object, no need to update
      if (prevPanel === updatedPanel) {
        console.log("Panel update: same reference, skipping selectedPanel update");
        return prevPanel;
      }
      
      // Compare essential properties to see if anything important changed
      const hasChanges = prevPanel && (
        prevPanel.id !== updatedPanel.id ||
        prevPanel.image !== updatedPanel.image ||
        JSON.stringify(prevPanel.characters) !== JSON.stringify(updatedPanel.characters) ||
        prevPanel.environment !== updatedPanel.environment ||
        prevPanel.action !== updatedPanel.action ||
        prevPanel.style !== updatedPanel.style
      );
      
      console.log(`Panel update comparison - has changes: ${hasChanges}`);
      
      // If there are changes or no previous panel, return the updated panel
      if (hasChanges || !prevPanel) {
        return updatedPanel;
      }
      
      // Otherwise return the existing panel to prevent unnecessary rerenders
      return prevPanel;
    });
  }, [currentPage]); // Only depends on currentPage
  
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
            position: { row: i, col: j },
            shape: {
              type: 'rectangular',
              points: [],
              angle: 0,
              clipPath: ''
            },
            colSpan: 1,
            rowSpan: 1
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
  const PanelEditorComponent = ({ panel, onUpdate, onClose }) => {
    console.log(`[PanelEditor] Rendering editor for panel ${panel.id}`);
    
    // Main panel state - holds all panel properties
    const [panelState, setPanelState] = useState(() => ({
      ...panel,
      // Ensure basic properties exist with defaults
      characters: panel.characters || [],
      environment: panel.environment || '',
      action: panel.action || '',
      style: panel.style || styleType || 'manga',
      type: panel.type || 'rectangular',
      textBoxes: panel.textBoxes || [],
      shape: {
        type: panel.shape?.type || 'rectangular',
        angle: panel.shape?.angle || 0,
        clipPath: panel.shape?.clipPath || '',
        points: panel.shape?.points || []
      },
      colSpan: panel.colSpan || 1,
      rowSpan: panel.rowSpan || 1,
      image: panel.image || null
    }));
    
    // Component UI state
    const [editPhase, setEditPhase] = useState(panel.image ? 'styling' : 'content');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [generatedImage, setGeneratedImage] = useState(panel.image || null);
    const [generatedPrompt, setGeneratedPrompt] = useState('');  // For displaying the GPT-4o generated prompt
    const [textBoxes, setTextBoxes] = useState(panel.textBoxes || []);
    const [selectedTextBoxId, setSelectedTextBoxId] = useState(null);
    const [draggedTextBoxId, setDraggedTextBoxId] = useState(null);
    const [characterTab, setCharacterTab] = useState('project');
    const [actionInputValue, setActionInputValue] = useState(panelState.action || '');
    const [projectCharacters, setProjectCharacters] = useState([]);
    const [allCharacters, setAllCharacters] = useState([]);
    const [loadingCharacters, setLoadingCharacters] = useState(true);
    
    // Refs
    const textBoxRefs = useRef({});
    const panelRef = useRef(null);
    const shouldReloadCharactersRef = useRef({ storyTitle });
    const prevStyleRef = useRef(styleType);
    
    // Get the currently selected text box
    const selectedTextBox = textBoxes.find(box => box.id === selectedTextBoxId);
    
    // Handle panel prop changes
    useEffect(() => {
      console.log('Panel prop changed:', panel.id);
      setPanelState(prev => {
        // If nothing meaningful has changed, keep the previous state
        if (prev.id === panel.id &&
            prev.image === panel.image &&
            JSON.stringify(prev.characters) === JSON.stringify(panel.characters) &&
            prev.environment === panel.environment &&
            prev.action === panel.action &&
            prev.style === panel.style) {
          return prev;
        }
        
        // Otherwise update with new values while preserving local state
        return {
          ...prev,
          ...panel,
          // Preserve any local state that shouldn't be overwritten
          style: prev.style || panel.style || styleType,
          characters: panel.characters || prev.characters || [],
          environment: panel.environment || prev.environment || '',
          action: panel.action || prev.action || ''
        };
      });
    }, [panel, styleType]);
    
    // SINGLE lifecycle effect - removing duplicated one
    useEffect(() => {
      console.log(`PanelEditor MOUNTED with ID: ${panel.id}`);
      
      return () => {
        console.log(`PanelEditor UNMOUNTED with ID: ${panel.id}`);
      };
    }, [panel.id]);
    
    // Track panel prop changes
    useEffect(() => {
      console.log(`Panel prop CHANGED to: ${panel.id}`, panel);
    }, [panel]);
    
    // Use action input value debounced to minimize re-renders
    useEffect(() => {
      const timer = setTimeout(() => {
        updatePanelProperty('action', actionInputValue);
      }, 300);
      return () => clearTimeout(timer);
    }, [actionInputValue]);
    
    // Load characters when the panel editor opens
    useEffect(() => {
      const loadCharacters = async () => {
        try {
          setLoadingCharacters(true);
          console.log('Loading characters for panel editor...');
          
          // Project ID based on story title or a default
          const projectId = storyTitle ? storyTitle.replace(/\s+/g, '-').toLowerCase() : 'current-project';
          
          // Get project characters
          console.log(`Loading project characters for project: ${projectId}`);
          const projectResponse = await characterAPI.getProjectCharacters(projectId);
          console.log('Project characters response:', projectResponse);
          
          // Handle different response structures we've observed
          let projectChars = [];
          if (projectResponse?.data?.success && Array.isArray(projectResponse.data.characters)) {
            projectChars = projectResponse.data.characters;
          } else if (projectResponse?.success && Array.isArray(projectResponse.characters)) {
            projectChars = projectResponse.characters;
          } else if (Array.isArray(projectResponse?.data)) {
            projectChars = projectResponse.data;
          }
          
          console.log('Loaded project characters:', projectChars);
          setProjectCharacters(projectChars);
          
          // Get all user characters
          console.log('Loading all user characters');
          const response = await characterAPI.getUserCharacters();
          console.log('All characters response:', response);
          
          // Handle different response structures for all characters
          let allChars = [];
          if (response?.data?.success && Array.isArray(response.data.characters)) {
            allChars = response.data.characters;
          } else if (response?.success && Array.isArray(response.characters)) {
            allChars = response.characters;
          } else if (Array.isArray(response?.data)) {
            allChars = response.data;
          }
          
          console.log('Loaded all characters:', allChars);
          setAllCharacters(allChars);
        } catch (error) {
          console.error('Error loading characters:', error);
          setProjectCharacters([]);
          setAllCharacters([]);
        } finally {
          setLoadingCharacters(false);
        }
      };
      
      loadCharacters();
    }, [storyTitle]);
    
    // Function to manually reload characters
    const reloadCharacters = useCallback(async () => {
      try {
        setLoadingCharacters(true);
        console.log('Manually reloading characters...');
        
        // Project ID based on story title or a default
        const projectId = storyTitle ? storyTitle.replace(/\s+/g, '-').toLowerCase() : 'current-project';
        
        // Get project characters
        console.log(`Loading project characters for project: ${projectId}`);
        const projectResponse = await characterAPI.getProjectCharacters(projectId);
        console.log('Project characters response:', projectResponse);
        
        // Handle different response structures we've observed
        let projectChars = [];
        if (projectResponse?.data?.success && Array.isArray(projectResponse.data.characters)) {
          projectChars = projectResponse.data.characters;
        } else if (projectResponse?.success && Array.isArray(projectResponse.characters)) {
          projectChars = projectResponse.characters;
        } else if (Array.isArray(projectResponse?.data)) {
          projectChars = projectResponse.data;
        }
        
        console.log('Loaded project characters:', projectChars);
        setProjectCharacters(projectChars);
        
        // Get all user characters
        console.log('Loading all user characters');
        const response = await characterAPI.getUserCharacters();
        console.log('All characters response:', response);
        
        // Handle different response structures for all characters
        let allChars = [];
        if (response?.data?.success && Array.isArray(response.data.characters)) {
          allChars = response.data.characters;
        } else if (response?.success && Array.isArray(response.characters)) {
          allChars = response.characters;
        } else if (Array.isArray(response?.data)) {
          allChars = response.data;
        }
        
        console.log('Loaded all characters:', allChars);
        setAllCharacters(allChars);
        
        // Alert success
        alert('Characters reloaded successfully!');
      } catch (error) {
        console.error('Error reloading characters:', error);
        setProjectCharacters([]);
        setAllCharacters([]);
        alert('Failed to reload characters. See console for details.');
      } finally {
        setLoadingCharacters(false);
      }
    }, [storyTitle]);
    
    // Create shorthand references for better readability
    const selectedCharacters = panelState.characters;
    const environment = panelState.environment;
    const action = panelState.action;
    const localStyleType = panelState.style;
    const panelType = panelState.type;
    const shapeType = panelState.shape.type;
    const angle = panelState.shape.angle;
    const customClipPath = panelState.shape.clipPath;
    const colSpan = panelState.colSpan;
    const rowSpan = panelState.rowSpan;
    
    // Update a specific property in the panel state
    const updatePanelProperty = (property, value) => {
      console.log(`Updating ${property} to:`, value);
      setPanelState(prev => ({
        ...prev,
        [property]: value
      }));
    };
    
    // Specific update functions for each property
    const setSelectedCharacters = (characters) => updatePanelProperty('characters', characters);
    const setEnvironment = (env) => updatePanelProperty('environment', env);
    const setAction = (act) => updatePanelProperty('action', act);
    const setLocalStyleType = (style) => updatePanelProperty('style', style);
    const setPanelType = (type) => updatePanelProperty('type', type);
    const setShapeType = (type) => updatePanelProperty('shape', {...panelState.shape, type});
    const setAngle = (angle) => updatePanelProperty('shape', {...panelState.shape, angle});
    const setCustomClipPath = (path) => updatePanelProperty('shape', {...panelState.shape, clipPath: path});
    const setColSpan = (span) => updatePanelProperty('colSpan', span);
    const setRowSpan = (span) => updatePanelProperty('rowSpan', span);
    const updatePanelImage = (img) => {
      console.log(`Updating panel image to: ${img}`);
      updatePanelProperty('image', img);
      setGeneratedImage(img);
    };
    
    // Style options
    const styleOptions = [
      { id: 'manga', name: 'Black & White Manga (Traditional)' },
      { id: 'anime', name: 'Anime Style (Colored)' },
      { id: 'realistic-manga', name: 'Realistic Manga (Detailed)' },
      // { id: 'chibi', name: 'Chibi Style (Cute)' }, // Removed
      // { id: 'sketch', name: 'Sketch Style (Rough lines)' } // Removed
    ];
    
    // Set initial edit phase based on whether image exists
    React.useEffect(() => {
      setEditPhase(panel.image ? 'styling' : 'content');
    }, [panel.image]);
    
    // Sync generatedImage with panelState.image
    React.useEffect(() => {
      if (panelState.image && panelState.image !== generatedImage) {
        console.log('Syncing generatedImage with panelState.image:', panelState.image);
        setGeneratedImage(panelState.image);
      }
    }, [panelState.image, generatedImage]);
    
    // Get current list of characters based on active tab
    // Get current list of characters based on active tab
    const availableCharacters = characterTab === 'project' ? projectCharacters : allCharacters;
    
    // Generate image based on panel data
    const generateImage = async () => {
      try {
        setIsGenerating(true);
        setGenerationError(null);

        // Debug state before generation
        console.log("Generating image with panel state:", panelState);

        // Format character data properly for the API, including image URLs
        const characterData = panelState.characters.map(character => {
          // Get the correct image URL, trying multiple possible properties
          const imageUrl = character.thumbnail || character.imageUrl || character.imagePath || null;
          
          console.log(`Character ${character.name} image URL:`, imageUrl);
          
          return {
            id: character.id,
            name: character.name,
            description: character.description || '',
            role: character.role || '',
            gender: character.gender || '',
            // Include all possible image URLs to ensure the backend can find at least one
            imageUrl: imageUrl,
            thumbnail: character.thumbnail || null,
            imagePath: character.imagePath || null
          };
        });

        console.log('Generating image with GPT-4o:', {
          characters: characterData,
          environment: panelState.environment,
          action: panelState.action,
          style: panelState.style
        });

        // Log the API endpoint that will be used
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        console.log('API endpoint:', `${apiBaseUrl}/api/generate-manga-panel`);

        // Call our API, specifying gpt-4o and sending character images
        const response = await mangaAPI.generatePanel({
          characters: characterData, // Now includes imageUrl and backup image fields
          environment: panelState.environment,
          action: panelState.action,
          style: panelState.style,
          model: 'gpt-4o' // Switch model to gpt-4o
        });
        
        console.log('Generate panel API response:', response);

        // Handle API success response
        if (response.data && response.data.success) {
          // Check if we have an image path
          if (response.data.imagePath) {
            console.log('Panel generated successfully with imagePath:', response.data.imagePath);
            
            // Set the image and job ID for status checking
            updatePanelImage(response.data.imagePath);
            
            // If we have a direct result (no job), handle it now
            if (!response.data.jobId) {
              handleGenerationComplete({
                panel: {
                  imageUrl: response.data.imagePath
                }
              });
            } else {
              // Otherwise set job ID for status polling
              console.log('Setting job ID for status polling:', response.data.jobId);
              setJobId(response.data.jobId);
            }
            
            // If we have a prompt, save it
            if (response.data.prompt) {
              updatePanelProperty('prompt', response.data.prompt);
            }
          } else if (response.data.jobId) {
            // We have a job ID but no image path yet - this is normal for async generation
            console.log('Setting job ID for status polling:', response.data.jobId);
            setJobId(response.data.jobId);
          } else {
            // Unexpected success response format
            console.error('Successful API response missing imagePath and jobId:', response.data);
            setGenerationError('Generation succeeded but response format was unexpected.');
          }
        } else {
          // Handle API failure
          console.error('API reported failure:', response.data);
          setGenerationError(response.data?.message || 'Failed to generate image. Please try again.');
        }
      } catch (error) {
        console.error('Error generating manga panel:', error);
        // More detailed error logging
        if (error.code === 'ERR_NETWORK') {
          console.error('Network error - API server may be down or URL may be incorrect');
          console.error('API URL being used:', import.meta.env.VITE_API_URL || 'http://localhost:5001');
          setGenerationError(`Network error: Can't connect to the API server. Please check if the server is running.`);
        } else if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('Server error response:', error.response.data);
          console.error('Status code:', error.response.status);
          setGenerationError(`Server error (${error.response.status}): ${error.response.data?.message || 'Unknown server error'}`);
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from server:', error.request);
          setGenerationError(`No response from server. Check if the API server is running.`);
        } else {
          // Something happened in setting up the request that triggered an Error
          setGenerationError(`Error: ${error.message || 'Failed to connect to image generation service'}`);
        }
      } finally {
        setIsGenerating(false);
      }
    };
    
    // Add new text box
    const addTextBox = (type) => {
      const newTextBox = createTextBox(type, {
        text: '',
        position: { x: 150, y: 150 }, // More centered initial position
        tailPosition: 'bottom'
      });
      console.log(`Adding new ${type} text box:`, newTextBox);
      
      setTextBoxes(current => {
        const updated = [...current, newTextBox];
        console.log(`Updated text boxes after adding (new count: ${updated.length}):`, updated);
        return updated;
      });
      
      // Select the newly created text box
      setSelectedTextBoxId(newTextBox.id);
    };
    
    // Update text box
    const updateTextBox = (id, updates) => {
      console.log(`Updating text box ${id} with:`, updates);
      
      // Find the existing text box
      const existingBox = textBoxes.find(box => box.id === id);
      
      if (!existingBox) {
        console.warn(`Text box with ID ${id} not found!`);
        return;
      }
      
      // Create the updated box by deeply merging properties
      const updatedBox = {
        ...existingBox,
        ...updates,
      };
      
      // Handle style updates separately to properly merge nested objects
      if (updates.style) {
        updatedBox.style = {
          ...existingBox.style,
          ...updates.style
        };
      }
      
      // Update the text boxes array
      setTextBoxes(currentBoxes => 
        currentBoxes.map(box => box.id === id ? updatedBox : box)
      );
      
      // If this update is for the currently selected text box, make sure we update the selection
      if (selectedTextBoxId === id && updates.id && updates.id !== id) {
        setSelectedTextBoxId(updates.id);
      }
      
      console.log(`Updated text box:`, updatedBox);
    };
    
    // Remove text box
    const removeTextBox = (id) => {
      console.log(`Removing text box with ID: ${id}`);
      
      setTextBoxes(current => {
        const updated = current.filter(box => box.id !== id);
        console.log(`Updated text boxes after removing (new count: ${updated.length}):`, updated);
        
        // If we removed the selected text box, clear the selection
        if (selectedTextBoxId === id) {
          setSelectedTextBoxId(null);
        }
        
        return updated;
      });
    };
    
    // Handle save button click
    const handleSave = () => {
      // Debug state before saving
      console.log(`[Editor ${panel.id}] Saving panel with state:`, panelState);
      console.log(`[Editor ${panel.id}] Characters being saved:`, panelState.characters);
      
      // Create a fresh copy to avoid reference issues
      const charactersCopy = JSON.parse(JSON.stringify(panelState.characters || []));
      
      // The entire state is already in the panelState object
      // Just need to make sure the position is preserved from the original panel
      const updatedPanel = {
        ...panelState,
        characters: charactersCopy,
        textBoxes: textBoxes, // Include the textBoxes from local state
        position: panel.position // Keep the original position
      };
      
      console.log(`[Editor ${panel.id}] Final panel data being saved:`, updatedPanel);
      onUpdate(updatedPanel);
    };

    // Add handler for when generation is complete
    const handleGenerationComplete = (result) => {
      if (result && result.panel && result.panel.imageUrl) {
        console.log('Generation complete with image URL:', result.panel.imageUrl);
        
        // Update both the generated image for display and the panel state
        const imageUrl = result.panel.imageUrl;
        setGeneratedImage(imageUrl);
        
        // Update the panel state
        setPanelState(prev => ({
          ...prev,
          image: imageUrl
        }));
        
        // Move to styling phase
        setEditPhase('styling');
      }
    };
    
    // Debug utility to verify character images
    const verifyCharacterImages = () => {
      console.log('Verifying character images in panel state...');
      
      // Log API configuration
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      console.log('Current API configuration:', {
        baseUrl: apiBaseUrl,
        testEndpoint: `${apiBaseUrl}/api/test-gpt4o`,
        generateEndpoint: `${apiBaseUrl}/api/generate-manga-panel`
      });
      
      const charactersWithImages = panelState.characters.map(character => {
        const imageUrl = character.thumbnail || character.imageUrl || character.imagePath || null;
        console.log(`Character ${character.name} image URL:`, imageUrl);
        // Test if this URL is loadable (for debugging purposes)
        if (imageUrl) {
          const img = new Image();
          img.onload = () => console.log(`✅ Image for ${character.name} loaded successfully`);
          img.onerror = () => console.error(`❌ Failed to load image for ${character.name}: ${imageUrl}`);
          img.src = getImageUrl(imageUrl);
        }
        return {
          ...character,
          hasImage: !!imageUrl,
          resolvedUrl: imageUrl ? getImageUrl(imageUrl) : null
        };
      });
      console.log('Characters with image verification:', charactersWithImages);

      // Check for GPT-4o connection
      mangaAPI.testGPT4o()
        .then(response => {
          console.log('GPT-4o API test result:', response.data);
          if (response.data.success) {
            console.log('✅ GPT-4o is correctly configured.');
          } else {
            console.error('❌ GPT-4o test failed:', response.data.message);
          }
        })
        .catch(error => {
          console.error('❌ GPT-4o test API call failed:', error);
        });
    };
    
    // Add function to assign character to project
    const assignCharacterToProject = async (e, character) => {
      e.stopPropagation(); // Prevent character selection
      try {
        // In a real app, get the project ID from props or context
        const projectId = storyTitle ? storyTitle.replace(/\s+/g, '-').toLowerCase() : 'current-project';
        
        // Call API to assign character to project
        const response = await characterAPI.assignCharacterToProject(character.id, projectId);
        
        if (response.data && response.data.success) {
          // Response is successful - update local state to reflect the change
          console.log(`Successfully assigned character "${character.name}" to project`);
          
          // Update local state to reflect the change
          setProjectCharacters(prev => {
            // Check if character is already in the list to avoid duplicates
            if (!prev.some(c => c.id === character.id)) {
              return [...prev, character];
            }
            return prev;
          });
          
          // Show success message
          alert(`Character "${character.name}" assigned to project`);
        } else {
          console.error('Failed to assign character to project:', response);
          alert('Failed to assign character to project. Please try again.');
        }
      } catch (error) {
        console.error('Error assigning character to project:', error);
        alert('Failed to assign character to project. Please try again.');
      }
    };
    
    // Add function to remove character from project
    const removeCharacterFromProject = async (e, character) => {
      e.stopPropagation(); // Prevent character selection
      try {
        // In a real app, get the project ID from props or context
        const projectId = storyTitle ? storyTitle.replace(/\s+/g, '-').toLowerCase() : 'current-project';
        
        // Call API to remove character from project
        const response = await characterAPI.removeCharacterFromProject(character.id, projectId);
        
        if (response.data && response.data.success) {
          // Update local state to reflect the change
          setProjectCharacters(projectCharacters.filter(c => c.id !== character.id));
          
          // Also remove from selected characters if it was selected
          setSelectedCharacters(selectedCharacters.filter(c => c.id !== character.id));
          
          // Show success message
          alert(`Character "${character.name}" removed from project`);
        } else {
          console.error('Failed to remove character from project:', response);
          alert('Failed to remove character from project. Please try again.');
        }
      } catch (error) {
        console.error('Error removing character from project:', error);
        alert('Failed to remove character from project. Please try again.');
      }
    };
    
    // Function to handle image loading errors
    const handleImageError = (e) => {
      console.error('Image failed to load, using fallback', e.target.src);
      e.target.src = '/assets/images/placeholders/image.png'; // Use local fallback
    };
    
    // Function to build correct image URL
    const getImageUrl = (imagePath) => {
      // Return placeholder if no image path provided
      if (!imagePath) {
        console.log('No image path provided, using placeholder');
        return '/assets/images/placeholders/image.png';
      }
      
      // Debugging
      console.log(`Processing image path: "${imagePath}"`);
      
      try {
        // If already a full URL, use it directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          console.log(`Using direct URL: ${imagePath}`);
          return imagePath;
        }
        
        // Handle Firebase storage URLs
        if (imagePath.includes('firebasestorage.googleapis.com')) {
          console.log(`Using Firebase storage URL: ${imagePath}`);
          return imagePath;
        }
        
        // Clean any leading slashes
        const cleanPath = imagePath.startsWith('./') 
          ? imagePath.slice(2) 
          : imagePath.startsWith('/') 
            ? imagePath.slice(1) 
            : imagePath;
        
        // If it's a path with 'outputs' in it, prepend API URL
        if (cleanPath.includes('outputs')) {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
          // Remove any potential double slashes
          const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
          const fullUrl = `${cleanApiUrl}/${cleanPath}`;
          console.log(`Constructed API URL: ${fullUrl}`);
          return fullUrl;
        }
        
        // For all other relative paths, try to resolve from current domain
        console.log(`Using relative path: /${cleanPath}`);
        return `/${cleanPath}`;
      } catch (error) {
        console.error('Error processing image URL, using fallback:', error);
        return '/assets/images/placeholders/image.png';
      }
    };
    
    // 6. useCallback for character selection
    const handleCharacterSelect = useCallback((character) => {
      console.log("handleCharacterSelect called for:", character.name);
      const isSelected = panelState.characters.some(c => c.id === character.id);
      let newCharacters;
      
      if (isSelected) {
        console.log(`Removing character ${character.name} from selection`);
        newCharacters = panelState.characters.filter(c => c.id !== character.id);
      } else {
        console.log(`Adding character ${character.name} to selection`);
        newCharacters = [...panelState.characters, character];
      }
      
      console.log("Old selection:", panelState.characters);
      console.log("New selection:", newCharacters);
      
      // Update the panel state directly
      setPanelState(prev => ({
        ...prev,
        characters: newCharacters
      }));
    }, [panelState.characters]);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-gray-900 rounded-lg w-11/12 max-w-5xl max-h-[90vh] overflow-y-auto border-2 border-anime-indigo/30 shadow-2xl relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-manga-dots bg-[size:10px_10px]"></div>
          
          <div className="relative z-10 p-6">
            <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-manga text-white tracking-wide">
                <span className="text-anime-pink">Panel</span> <span className="text-anime-indigo">Editor</span>
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
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-comic font-medium flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Characters
                </h3>
                    
                    {/* Link to Character Creator */}
                    <Link 
                      to="/character-creator" 
                      target="_blank"
                      className="text-xs text-anime-pink hover:text-anime-indigo transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Character
                    </Link>
                  </div>
                  
                  {/* Character Selection Tabs */}
                  <div className="flex border-b border-gray-700 mb-4">
                    <button
                      onClick={() => setCharacterTab('project')}
                      className={`px-4 py-2 text-sm font-comic ${characterTab === 'project' 
                        ? 'text-anime-pink border-b-2 border-anime-pink' 
                        : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      Project Characters
                    </button>
                    <button
                      onClick={() => setCharacterTab('all')}
                      className={`px-4 py-2 text-sm font-comic ${characterTab === 'all' 
                        ? 'text-anime-indigo border-b-2 border-anime-indigo' 
                        : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      All Characters
                    </button>
                    {/* Removed Debug button */}
                    {/* 
                    <button
                      onClick={verifyCharacterImages}
                      className="ml-auto px-2 py-1 text-xs font-comic bg-gray-700 text-gray-300 hover:bg-gray-600 rounded"
                      title="Debug character loading"
                    >
                      Debug
                    </button>
                    */}
                    {/* Removed Reload button - Correctly commented out */}
                    {/* 
                    <button
                      onClick={reloadCharacters}
                      className="ml-2 px-2 py-1 text-xs font-comic bg-gray-700 text-gray-300 hover:bg-gray-600 rounded flex items-center"
                      title="Reload characters"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reload
                    </button>
                    */}
                  </div>
                  
                  {/* Loading State */}
                  {loadingCharacters && (
                    <div className="flex justify-center items-center p-8">
                      <svg className="animate-spin h-8 w-8 text-anime-pink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  
                  {/* Empty State for Project Characters */}
                  {!loadingCharacters && characterTab === 'project' && projectCharacters.length === 0 && (
                    <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <p className="text-gray-400 text-sm mb-2">No characters assigned to this project</p>
                      <div className="flex space-x-2 justify-center">
                        <button 
                          onClick={() => setCharacterTab('all')}
                          className="text-anime-pink text-sm hover:underline"
                        >
                          Browse all characters
                        </button>
                        <span className="text-gray-500">or</span>
                        <Link 
                          to="/character-creator" 
                          target="_blank"
                          className="text-anime-indigo text-sm hover:underline"
                        >
                          Create new
                        </Link>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State for All Characters */}
                  {!loadingCharacters && characterTab === 'all' && allCharacters.length === 0 && (
                    <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <p className="text-gray-400 text-sm mb-2">You haven't created any characters yet</p>
                      <Link 
                        to="/character-creator" 
                        target="_blank"
                        className="text-anime-pink text-sm hover:underline"
                      >
                        Create your first character
                      </Link>
                    </div>
                  )}
                  
                  {/* Character Grid */}
                  {!loadingCharacters && ((characterTab === 'all' && allCharacters.length > 0) || (characterTab === 'project' && projectCharacters.length > 0)) && (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {availableCharacters.map(character => (
                    <div 
                      key={character.id}
                      onClick={() => handleCharacterSelect(character)}
                      className={`flex items-center p-2 border rounded cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                        panelState.characters.some(c => c.id === character.id) 
                          ? 'border-anime-pink bg-anime-pink/20' 
                          : 'border-gray-700 bg-gray-700 hover:border-gray-600'
                      }`}
                    >
                          <img 
                            src={getImageUrl(character.imagePath || character.image || character.thumbnail || character.imageUrl)} 
                            alt={character.name}
                            className="w-10 h-10 rounded-full border-2 border-white object-cover" 
                            onError={handleImageError}
                          />
                          <div className="ml-2 flex-1">
                            <span className="text-white font-comic">{character.name}</span>
                            
                            {/* Project assignment actions */}
                            {characterTab === 'all' && !projectCharacters.some(c => c.id === character.id) && (
                              <button 
                                onClick={(e) => assignCharacterToProject(e, character)}
                                className="ml-2 text-xs text-green-400 hover:text-green-300 focus:outline-none"
                                title="Assign to project"
                              >
                                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button> 
                            )}
                            
                            {characterTab === 'project' && (
                              <button 
                                onClick={(e) => removeCharacterFromProject(e, character)}
                                className="ml-2 text-xs text-red-400 hover:text-red-300 focus:outline-none"
                                title="Remove from project"
                              >
                                <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            
                            {/* If character is already assigned to project, show in "All" tab */}
                            {characterTab === 'all' && projectCharacters.some(c => c.id === character.id) && (
                              <span className="ml-2 text-xs text-blue-400 italic">
                                In project
                              </span>
                            )}
                          </div>
                    </div>
                  ))}
                </div>
                  )}
              </div>
              
              {/* Environment */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-anime-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Environment
                </h3>
                  <input
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                    placeholder="Enter environment..."
                  />
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
              
                {/* Style Selection */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                  <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Art Style
                  </h3>
                  {/* Adjusted grid for better spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"> {/* Changed grid columns */}
                    {styleOptions.map(style => (
                      <button
                        key={style.id}
                        onClick={() => {
                          console.log(`STYLES: Clicked style ${style.id}, current: ${panelState.style}`);
                          // Only update if style is actually changing
                          if (panelState.style !== style.id) {
                            console.log(`STYLES: Will update from ${panelState.style} to ${style.id}`);
                            setPanelState(prev => ({
                              ...prev,
                              style: style.id
                            }));
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-center transition-all duration-200 text-sm ${
                          panelState.style === style.id 
                            ? 'bg-gradient-to-r from-anime-indigo to-anime-pink text-white font-bold shadow-lg' 
                            : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                        }`}
                      >
                        {style.name}
                      </button>
                    ))}
                    </div>
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
          
          {/* Phase 2: Styling - Text Boxes & Appearance */}
          {editPhase === 'styling' && (
            <div className="flex flex-col lg:flex-row gap-6 relative z-10">
              {/* Left Column: Image Preview */}
              <div className="lg:w-1/2 xl:w-3/5 flex-shrink-0">
                {generatedImage && (
                  <div 
                    className="relative border-[3px] border-ink-black rounded-lg overflow-hidden shadow-manga-lg mb-4" 
                    style={{ minHeight: '300px' }}
                    ref={panelRef}
                    onClick={(e) => {
                      // When clicking on the panel background, deselect any text box
                      // but only if the click was directly on the panel, not on a bubble
                      if (e.currentTarget === e.target) {
                        console.log('Panel background clicked, deselecting text box');
                        setSelectedTextBoxId(null);
                      }
                    }}
                  >
                    <img 
                      src={generatedImage} 
                      alt="Generated panel" 
                      className="w-full" 
                      onError={(e) => {
                        console.error('Error loading generated image:', e);
                        console.log('Image URL was:', generatedImage);
                        // Fallback to a placeholder if image fails to load
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = '/assets/images/placeholders/image.png';
                      }}
                      onClick={(e) => {
                        // Only deselect if clicking directly on the image (not on bubbles)
                        if (e.currentTarget === e.target) {
                          console.log('Panel image clicked, deselecting text box');
                          setSelectedTextBoxId(null);
                        }
                      }}
                    />
                    <div className="absolute inset-0 pointer-events-none manga-panel-overlay"></div>
                    
                    {/* Draggable Text Bubbles */}
                    <div className="absolute inset-0 overflow-hidden">
                      {textBoxes.map(box => {
                        // Convert the textBox object to Bubble props
                        const bubbleProps = textBoxToBubbleProps(box, {
                          onTextChange: (newText) => updateTextBox(box.id, { text: newText }),
                          onPositionChange: (newPosition) => updateTextBox(box.id, { position: newPosition }),
                          onRemove: () => removeTextBox(box.id),
                          onSelect: () => {
                            console.log(`Selecting text box with ID: ${box.id}`, box);
                            setSelectedTextBoxId(box.id);
                          },
                          selected: selectedTextBoxId === box.id
                        });
                        
                        console.log(`Rendering bubble for box ${box.id}, selected: ${selectedTextBoxId === box.id}`);
                        
                        // Return the Bubble component with props
                        return (
                          <Bubble
                            key={box.id}
                            {...bubbleProps}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Text Bubble Controls */}
              <div className="lg:w-1/2 xl:w-2/5 space-y-4 flex-grow">
                {/* Text Boxes Section */}
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
                  <h3 className="text-white font-comic font-medium mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Text Bubbles
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
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
                    <button 
                      onClick={() => addTextBox('yell')}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-comic border border-gray-600 transition-colors duration-200 flex flex-col items-center"
                    >
                      <div className="yell-bubble-icon w-8 h-8 mb-1 bg-white border border-gray-700 flex items-center justify-center text-black font-bold text-lg">
                        ! {/* Simplified icon */}
                      </div>
                      Yell
                    </button>
                  </div>
                  
                  {textBoxes.length === 0 ? (
                    <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-gray-600 text-center text-gray-400 text-sm font-comic">
                      No text bubbles added yet. Add one using the buttons above.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {textBoxes.map(box => (
                        <div 
                          key={box.id} 
                          className={`flex items-center p-3 rounded-lg border border-gray-600 transition-colors duration-150 ${
                            selectedTextBoxId === box.id ? 'bg-gray-600 ring-2 ring-anime-pink' : 'bg-gray-700'
                          }`}
                          // Optional: Click to select from the list too
                          onClick={() => setSelectedTextBoxId(box.id)} 
                        >
                          <div className={`w-8 h-8 flex-shrink-0 rounded-full ${box.type === 'narration' ? 'bg-paper-white rounded-sm' : box.type === 'yell' ? 'bg-yellow-100' : 'bg-white'} border border-gray-700 flex items-center justify-center text-xs`}>
                            {box.type === 'speech' && '"..."'}
                            {box.type === 'thought' && '...'}
                            {box.type === 'narration' && 'Narr'}
                            {box.type === 'yell' && '!'}
                          </div>
                          <input
                            type="text"
                            value={box.text}
                            onChange={(e) => updateTextBox(box.id, { text: e.target.value })}
                            placeholder={`Enter ${box.type} text...`}
                            className="ml-3 flex-grow bg-gray-800 border border-gray-600 px-3 py-2 rounded-lg text-white text-sm font-comic focus:border-anime-pink focus:ring-1 focus:ring-anime-pink"
                          />
                          <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTextBox(box.id);
                              }}
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
                  
                  {/* Bubble Style Editor (Now part of the right column) */}
                  {textBoxes.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
                      <h4 className="text-white text-sm font-bold mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-1 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {selectedTextBox ? `Edit "${selectedTextBox.type}" Bubble` : 'Bubble Style Options'}
                      </h4>
                      
                      {!selectedTextBox ? (
                        <div className="text-center text-gray-300 text-sm p-2">
                          Click on a text bubble to edit its style
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-300 text-xs mb-1">
                              Text Color
                            </label>
                            <div className="flex items-center">
                              <input 
                                type="color" 
                                value={selectedTextBox.style.color || '#000000'}
                                onChange={(e) => {
                                  updateTextBox(selectedTextBox.id, { 
                                    style: { 
                                      ...selectedTextBox.style, 
                                      color: e.target.value 
                                    } 
                                  });
                                }}
                                className="w-8 h-8 cursor-pointer rounded border border-gray-600"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-gray-300 text-xs mb-1">
                              Background
                            </label>
                            <div className="flex items-center">
                              <input 
                                type="color" 
                                value={selectedTextBox.style.backgroundColor || '#FFFFFF'}
                                onChange={(e) => {
                                  updateTextBox(selectedTextBox.id, { 
                                    style: { 
                                      ...selectedTextBox.style, 
                                      backgroundColor: e.target.value 
                                    } 
                                  });
                                }}
                                className="w-8 h-8 cursor-pointer rounded border border-gray-600"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-gray-300 text-xs mb-1">
                              Font Size
                            </label>
                            <div className="flex items-center">
                              <input 
                                type="range" 
                                min="8" 
                                max="48" // Increased max font size
                                value={selectedTextBox.style.fontSize || 14}
                                onChange={(e) => {
                                  updateTextBox(selectedTextBox.id, { 
                                    style: { 
                                      ...selectedTextBox.style, 
                                      fontSize: parseInt(e.target.value) 
                                    } 
                                  });
                                }}
                                className="w-full cursor-pointer accent-anime-pink"
                              />
                              <span className="ml-2 text-xs text-gray-300">
                                {selectedTextBox.style.fontSize || 14}px
                              </span>
                            </div>
                          </div>
                          
                          {/* Conditionally render Tail Position options */}
                          {(selectedTextBox.type === 'speech' || selectedTextBox.type === 'thought') ? (
                            <div>
                              <label className="block text-gray-300 text-xs mb-1">
                                Tail Position
                              </label>
                              <div className="grid grid-cols-2 gap-1">
                                <button
                                  onClick={() => {
                                    updateTextBox(selectedTextBox.id, { 
                                      tailPosition: 'top'
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs rounded font-comic ${
                                    (selectedTextBox.tailPosition || 'bottom') === 'top'
                                      ? 'bg-anime-pink text-white' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  Top
                                </button>
                                <button
                                  onClick={() => {
                                    updateTextBox(selectedTextBox.id, { 
                                      tailPosition: 'right'
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs rounded font-comic ${
                                    (selectedTextBox.tailPosition || 'bottom') === 'right'
                                      ? 'bg-anime-pink text-white' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  Right
                                </button>
                                <button
                                  onClick={() => {
                                    updateTextBox(selectedTextBox.id, { 
                                      tailPosition: 'bottom'
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs rounded font-comic ${
                                    (selectedTextBox.tailPosition || 'bottom') === 'bottom'
                                      ? 'bg-anime-pink text-white' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  Bottom
                                </button>
                                <button
                                  onClick={() => {
                                    updateTextBox(selectedTextBox.id, { 
                                      tailPosition: 'left'
                                    });
                                  }}
                                  className={`px-2 py-1 text-xs rounded font-comic ${
                                    (selectedTextBox.tailPosition || 'bottom') === 'left'
                                      ? 'bg-anime-pink text-white' 
                                      : 'bg-gray-600 text-gray-300'
                                  }`}
                                >
                                  Left
                                </button>
                              </div>
                            </div>
                          ) : null}
                          
                          <div className="col-span-2 flex space-x-3 mt-2">
                            <button
                              onClick={() => {
                                updateTextBox(selectedTextBox.id, { 
                                  style: { 
                                    ...selectedTextBox.style, 
                                    bold: !selectedTextBox.style.bold 
                                  } 
                                });
                              }}
                              className={`flex-1 px-2 py-1 text-xs rounded font-comic ${
                                selectedTextBox.style.bold 
                                  ? 'bg-anime-pink text-white' 
                                  : 'bg-gray-600 text-gray-300'
                              }`}
                            >
                              <strong>B</strong>
                            </button>
                            
                            <button
                              onClick={() => {
                                updateTextBox(selectedTextBox.id, { 
                                  style: { 
                                    ...selectedTextBox.style, 
                                    italic: !selectedTextBox.style.italic 
                                  } 
                                });
                              }}
                              className={`flex-1 px-2 py-1 text-xs rounded font-comic ${
                                selectedTextBox.style.italic 
                                  ? 'bg-anime-pink text-white' 
                                  : 'bg-gray-600 text-gray-300'
                              }`}
                            >
                              <em>I</em>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Navigation and Confirm Buttons */}
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => {
                      handleSave();
                      onClose();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg font-comic transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Panel
                  </button>
                </div>
              </div> 
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  // Wrap PanelEditor with React.memo to prevent unnecessary rerenders
  const PanelEditor = React.memo(PanelEditorComponent, (prevProps, nextProps) => {
    // First check if the references are the same
    if (prevProps.panel === nextProps.panel) {
      return true; // Same reference, definitely equal
    }
    
    // Then check if IDs are different
    if (prevProps.panel.id !== nextProps.panel.id) {
      return false; // Different panels
    }
    
    // Check essential properties that would require a rerender
    const essentialPropsEqual = 
      prevProps.panel.image === nextProps.panel.image &&
      prevProps.panel.environment === nextProps.panel.environment &&
      prevProps.panel.action === nextProps.panel.action &&
      prevProps.panel.style === nextProps.panel.style &&
      JSON.stringify(prevProps.panel.characters) === JSON.stringify(nextProps.panel.characters);
    
    console.log(`PanelEditor memo comparison: ${prevProps.panel.id}, essential props equal: ${essentialPropsEqual}`);
    
    return essentialPropsEqual;
  });

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

  // Add this function to handle deleting a project
  const deleteProject = (projectId) => {
    // In a real app, you would make an API call to delete from backend
    // For example: await mangaAPI.deleteProject(projectId);
    
    // For our mock implementation, just filter it out of the state
    setProjectList(projectList.filter(project => project.id !== projectId));
    setShowDeleteConfirmation(false);
    setProjectToDelete(null);
  };

  // Add this function to confirm deletion
  const confirmDelete = (e, project) => {
    e.stopPropagation(); // Prevent project from being loaded
    setProjectToDelete(project);
    setShowDeleteConfirmation(true);
  };

  // Add this function to cancel deletion
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setProjectToDelete(null);
  };

  // Create stable callback for PanelEditor close function
  const handlePanelEditorClose = useCallback(() => {
    console.log("Panel editor close handler called");
    setShowPanelEditor(false);
    // Don't set selectedPanel to null so it stays selected after closing
  }, []);

  return (
    <div className="min-h-screen bg-gray-900">
      {showProjectSelector ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Manga Studio</h1>
              <p className="text-gray-400 mt-1">Create or select a manga project to get started</p>
            </div>
          </div>
          
          {/* Create New Project Card */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mb-8 hover:border-anime-indigo transition-all duration-200 cursor-pointer" onClick={createNewProject}>
            <div className="flex items-center justify-center h-40 bg-gradient-to-r from-anime-indigo to-anime-pink rounded-lg mb-4">
              <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Create New Project</h2>
            <p className="text-gray-400">Start a fresh manga with a blank canvas</p>
          </div>
          
          {/* Recent Projects Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Recent Projects</h2>
            {projectList.length === 0 ? (
              <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-gray-400">You don't have any projects yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectList.map(project => (
                  <div 
                    key={project.id} 
                    className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden hover:border-anime-indigo transition-all duration-200 cursor-pointer"
                    onClick={() => loadProject(project)}
                  >
                    <div className="relative h-40 bg-gray-700">
                      <img 
                        src={project.thumbnail} 
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent py-2 px-3">
                        <span className="text-white font-bold">{project.title}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>{project.author}</span>
                        <span>{project.pages} pages</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-3">Last edited: {project.lastEdited}</div>
                      <button 
                        onClick={(e) => confirmDelete(e, project)}
                        className="w-full mt-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors duration-200"
                        title="Delete project"
                      >
                        Delete Project
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-[95vw] mx-auto">
          {/* Page Editor Component with enhanced row controls */}
          <PageEditor
            pages={pages}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            selectedPanel={selectedPanel}
            onPanelClick={handlePanelClick}
            onAddPage={addNewPage}
            onDeletePage={deletePage}
            onAdjustLayout={adjustLayout}
            onUpdatePanel={(updatedPage) => {
                  const newPages = [...pages];
              newPages[currentPage] = updatedPage;
                  setPages(newPages);
                }}
            storyTitle={storyTitle}
            setStoryTitle={setStoryTitle}
            author={author}
            setAuthor={setAuthor}
            description={description}
            setDescription={setDescription}
            onBackToProjects={goBackToProjects}
            onShowPublishModal={() => setShowPublishModal(true)}
          />
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-md border-2 border-red-500/30 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Delete Project</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "<span className="text-white font-semibold">{projectToDelete.title}</span>"? 
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-300"
              >
                Cancel
              </button>
              <button 
                onClick={() => deleteProject(projectToDelete.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-300"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel Editor Modal */}
      {showPanelEditor && selectedPanel && (
        <PanelEditor
          panel={selectedPanel} 
          onUpdate={updatePanel} 
          onClose={handlePanelEditorClose} 
          styleType={styleType}
          projectId={storyTitle ? storyTitle.replace(/\s+/g, '-').toLowerCase() : 'current-project'}
        />
      )}
      
      {/* Publish Modal */}
      {showPublishModal && (
        <PublishModal />
      )}
      
      {/* Image Generation Progress Modal */}
      {jobId && (
        <ImageGenerationProgress 
          jobId={jobId} 
          onComplete={handleGenerationComplete} 
          onClose={() => setJobId(null)} 
        />
      )}
    </div>
  );
};

// Apply React.memo to the entire component to prevent unnecessary rerenders
const MangaCreatorPage = React.memo(MangaCreatorPageComponent);

export default MangaCreatorPage; 