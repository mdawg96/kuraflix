import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import TimelineEditor from '../components/TimelineEditor';
import ClipEditor from '../components/ClipEditor';
import ImageGenerationProgress from '../components/ImageGenerationProgress';
import { characterAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import NarrationEditor from '../components/NarrationEditor';
import SoundSelector from '../components/SoundSelector';

const AnimeCreatorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProjectSelector, setShowProjectSelector] = useState(true);
  const [projectList, setProjectList] = useState(() => {
    // Try to load saved projects from localStorage on initial render
    try {
      const savedProjects = localStorage.getItem('animeStudioProjects');
      return savedProjects ? JSON.parse(savedProjects) : [];
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
      return [];
    }
  });
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Add an effect to save projects to localStorage whenever the list changes
  useEffect(() => {
    try {
      localStorage.setItem('animeStudioProjects', JSON.stringify(projectList));
      console.log('Saved projects to localStorage:', projectList);
    } catch (error) {
      console.error('Error saving projects to localStorage:', error);
    }
  }, [projectList]);
  
  // Editor state - only used after project selection
  const [scenes, setScenes] = useState([createDefaultScene()]);
  const [currentScene, setCurrentScene] = useState(0);
  const [storyTitle, setStoryTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedClip, setSelectedClip] = useState(null);
  const [showClipEditor, setShowClipEditor] = useState(false);
  const [showNarrationEditor, setShowNarrationEditor] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Character selection state
  const [characterTab, setCharacterTab] = useState('project');
  const [projectCharacters, setProjectCharacters] = useState([]);
  const [allCharacters, setAllCharacters] = useState([]);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  
  // Add character to project
  const assignCharacterToProject = (character) => {
    // Check if character is already in the project
    if (!projectCharacters.some(c => c.id === character.id)) {
      setProjectCharacters(prev => [...prev, character]);
      console.log(`Character "${character.name}" added to project`);
    } else {
      console.log(`Character "${character.name}" is already in the project`);
    }
  };
  
  // Remove character from project
  const removeCharacterFromProject = (character) => {
    setProjectCharacters(prev => prev.filter(c => c.id !== character.id));
    console.log(`Character "${character.name}" removed from project`);
  };
  
  // Check URL params on component mount and when popstate fires
  useEffect(() => {
    // Parse the URL to check for view parameter
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const projectId = params.get('projectId');
    
    // Load character data regardless of view - do this first
    loadCharacters();
    
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
  
  // Load character data
  const loadCharacters = async () => {
    try {
      console.log('Loading characters...');
      
      // Get characters from Firestore
      const result = await characterAPI.getUserCharacters();
      console.log('Characters API response:', result);
      
      // If characters were loaded successfully
      if (result?.data?.success && Array.isArray(result.data.characters)) {
        console.log(`Loaded ${result.data.characters.length} characters from API`);
        setAllCharacters(result.data.characters);
        
        // If there are no characters, load mock characters
        if (result.data.characters.length === 0) {
          console.log('No characters found, loading mock characters');
          loadMockCharacters();
        }
      } else {
        console.error('Failed to load characters:', result);
        // If API call failed, load mock characters
        loadMockCharacters();
      }
    } catch (error) {
      console.error('Error loading characters:', error);
      // If there was an error, load mock characters
      loadMockCharacters();
    }
  };
  
  // Load mock characters when Firestore fails
  const loadMockCharacters = () => {
    console.log('Loading mock characters');
    const mockCharacters = [
      {
        id: 'mock-char-1',
        name: 'Naruto',
        description: 'A young ninja with dreams of becoming Hokage',
        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmYWQwNzUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiPk5hcnV0bzwvdGV4dD48L3N2Zz4='
      },
      {
        id: 'mock-char-2',
        name: 'Sasuke',
        description: 'A skilled ninja seeking revenge',
        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiM4NmE0ZTYiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiPlNhc3VrZTwvdGV4dD48L3N2Zz4='
      },
      {
        id: 'mock-char-3',
        name: 'Sakura',
        description: 'A medical ninja with incredible strength',
        thumbnail: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlNjg2YjgiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzAwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiPlNha3VyYTwvdGV4dD48L3N2Zz4='
      }
    ];
    
    setAllCharacters(mockCharacters);
    setProjectCharacters(mockCharacters);
    console.log('Mock characters loaded:', mockCharacters);
  };
  
  // Create a default scene for timeline without the placeholder clip
  function createDefaultScene() {
    return {
      id: `scene-${Date.now()}`,
      clips: [], // Remove the default placeholder clip
      backgroundColor: '#232323',
      transition: 'cut'
    };
  }
  
  // Load an existing project and proceed to editor
  const loadProject = async (project) => {
    console.log("Loading project:", project);
    
    // Update state with the project data
    setScenes(project.scenes || []);
    setCurrentScene(0);
    setIsGenerating(false);
    setGenerationProgress(0);
    
    // Also load characters if available
    if (project.id) {
      try {
        const response = await firestoreService.getProjectCharacters(project.id);
        if (response.success) {
          setProjectCharacters(response.data);
          console.log("Loaded characters for project:", response.data);
        } else {
          console.error("Failed to load characters for project:", response.error);
        }
      } catch (error) {
        console.error("Error loading project characters:", error);
      }
    }
    
    setShowProjectSelector(false);
  };
  
  // Create a new project and proceed to editor
  const createNewProject = async () => {
    console.log("Creating new project");
    
    // Create default scene
    const defaultScene = createDefaultScene();
    
    // Create new project object
    const newProject = {
      title: "New Animation",
      description: "",
      scenes: [defaultScene],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      // Save the new project to Firestore
      const response = await firestoreService.saveAnimeProject(newProject);
      
      if (response.success) {
        console.log("Project created successfully:", response.data);
        // Update the project with the ID from Firestore
        const savedProject = response.data;
        
        // Update local state
        setScenes([defaultScene]);
        setCurrentScene(0);
        setShowProjectSelector(false);
        
        // Show success message
        toast.success("New project created successfully!");
      } else {
        console.error("Failed to create project:", response.error);
        toast.error("Failed to create new project. Please try again.");
        
        // Fallback to local state only if save fails
        setScenes([defaultScene]);
        setCurrentScene(0);
        setShowProjectSelector(false);
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      toast.error("An error occurred while creating the project.");
      
      // Fallback to local state only
      setScenes([defaultScene]);
      setCurrentScene(0);
      setShowProjectSelector(false);
    }
  };
  
  // Load projects from Firestore when component mounts
  useEffect(() => {
    // Only load projects if we're showing the project selector
    if (showProjectSelector) {
      loadProjects();
    }
  }, [showProjectSelector]);
  
  // Save project automatically when scenes change (with debounce)
  useEffect(() => {
    if (!currentProject || !currentProject.id) return;
    
    const debounceTimer = setTimeout(() => {
      saveProject();
    }, 2000);
    
    return () => clearTimeout(debounceTimer);
  }, [scenes, storyTitle, author]);
  
  // Function to autosave the current project
  const saveProject = async () => {
    if (!currentProject) return;
    
    const updatedProject = {
      ...currentProject,
      title: storyTitle,
      author,
      scenes,
      lastEdited: new Date().toISOString()
    };
    
    console.log("Auto-saving project:", updatedProject.id);
    
    try {
      const response = await firestoreService.updateAnimeProject(currentProject.id, updatedProject);
      
      if (response.success) {
        console.log("Project saved successfully");
        setCurrentProject(updatedProject);
        
        // Also update the project in projectList
        setProjectList(prev => 
          prev.map(p => p.id === currentProject.id ? updatedProject : p)
        );
      } else {
        console.error("Failed to save project:", response.error);
        // Fallback to localStorage
        saveToLocalStorage(updatedProject);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      // Fallback to localStorage
      saveToLocalStorage(updatedProject);
    }
  };
  
  // Fallback to localStorage
  const saveToLocalStorage = (project) => {
    try {
      // Update the project in the list
      const updatedList = projectList.map(p => 
        p.id === project.id ? project : p
      );
      
      // Save to localStorage
      localStorage.setItem('animeStudioProjects', JSON.stringify(updatedList));
      
      // Update state
      setProjectList(updatedList);
      console.log("Project saved to localStorage as fallback");
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };
  
  // Load projects from Firestore instead of localStorage
  const loadProjects = async () => {
    setIsLoadingProjects(true);
    
    try {
      const response = await firestoreService.getAnimeProjects();
      
      if (response.success) {
        setProjectList(response.data);
        console.log("Loaded projects from Firestore:", response.data);
      } else {
        console.error("Failed to load projects:", response.error);
        // Fallback to localStorage if Firestore fails
        loadProjectsFromLocalStorage();
      }
    } catch (error) {
      console.error("Error loading projects:", error);
      // Fallback to localStorage if Firestore fails
      loadProjectsFromLocalStorage();
    } finally {
      setIsLoadingProjects(false);
    }
  };
  
  // Fallback to load from localStorage
  const loadProjectsFromLocalStorage = () => {
    try {
      const storedProjects = localStorage.getItem('animeStudioProjects');
      if (storedProjects) {
        setProjectList(JSON.parse(storedProjects));
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      setProjectList([]);
    }
  };
  
  // Delete project from Firestore instead of localStorage
  const deleteProject = async (projectId, event) => {
    // Prevent event bubbling to parent elements
    if (event) {
      event.stopPropagation();
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete this project?`)) {
      return;
    }
    
    try {
      setIsLoadingProjects(true);
      const response = await firestoreService.deleteAnimeProject(projectId);
      
      if (response.success) {
        console.log("Project deleted successfully");
        toast.success("Project deleted successfully");
        
        // Update local state
        setProjectList(prev => prev.filter(project => project.id !== projectId));
        
        // If the current project was deleted, go back to project selector
        if (currentProject && currentProject.id === projectId) {
          setCurrentProject(null);
          setShowProjectSelector(true);
        }
      } else {
        console.error("Failed to delete project:", response.error);
        toast.error("Failed to delete project");
        
        // Try deleting from localStorage as fallback
        try {
          const updatedList = projectList.filter(project => project.id !== projectId);
          setProjectList(updatedList);
          localStorage.setItem('animeStudioProjects', JSON.stringify(updatedList));
          toast.success("Project deleted from local storage");
        } catch (storageError) {
          console.error("Error deleting from localStorage:", storageError);
        }
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("An error occurred while deleting the project");
    } finally {
      setIsLoadingProjects(false);
    }
  };
  
  // Handle going back to project selection
  const goBackToProjects = () => {
    // Save current project before going back
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('projectId');
    
    if (projectId && projectId !== 'new') {
      // Calculate duration based on scenes
      let maxDuration = 0;
      scenes.forEach(scene => {
        scene.clips.forEach(clip => {
          if (clip.endTime > maxDuration) {
            maxDuration = clip.endTime;
          }
        });
      });
      
      // Format duration
      const mins = Math.floor(maxDuration / 60);
      const secs = Math.floor(maxDuration % 60);
      const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      // Find and update the project
      setProjectList(prevList => {
        return prevList.map(project => {
          if (project.id.toString() === projectId) {
            return {
              ...project,
              title: storyTitle,
              author: author,
              lastEdited: 'Just now',
              duration: formattedDuration,
              // Use the first clip's image as thumbnail if available
              thumbnail: scenes[0]?.clips[0]?.image || project.thumbnail
            };
          }
          return project;
        });
      });
      
      console.log(`Updated project ${projectId} before returning to list`);
    }
    
    // Update the URL and go back to projects view
    window.history.pushState({}, '', '?view=projects');
    setShowProjectSelector(true);
  };
  
  // Handle adding a new scene
  const addNewScene = () => {
    setScenes([...scenes, createDefaultScene()]);
    setCurrentScene(scenes.length); // Move to the new scene
  };
  
  // Handle deleting the current scene
  const deleteScene = () => {
    if (scenes.length > 1) {
      const newScenes = [...scenes];
      newScenes.splice(currentScene, 1);
      setScenes(newScenes);
      setCurrentScene(Math.min(currentScene, newScenes.length - 1));
    }
  };
  
  // Handle clip click to open editor
  const handleClipClick = (clipIndex) => {
    console.log(`Clip clicked at index ${clipIndex}`);
    
    // Safety check
    if (currentScene < 0 || currentScene >= scenes.length) {
      console.error("Invalid scene index:", currentScene);
      return;
    }
    
    // Get the scene
    const scene = scenes[currentScene];
    if (!scene || !Array.isArray(scene.clips)) {
      console.error("Invalid scene or clips array:", scene);
      return;
    }
    
    // Get the clip
    const clip = scene.clips[clipIndex];
    if (!clip) {
      console.error("Clip not found at index:", clipIndex);
      return;
    }
    
    // Set as selected clip - this is used by the timeline to highlight the clip
    console.log("Setting selected clip:", clip);
    setSelectedClip(clip);
  };
  
  // Make closeClipEditor available to child components via window
  useEffect(() => {
    // Provide a global reference to close the clip editor
    window.closeClipEditor = () => {
      console.log("Global closeClipEditor function called");
      setShowClipEditor(false);
      setSelectedClip(null);
    };
    
    // Listen for close events from child components
    const handleCloseEvent = (event) => {
      console.log("Received closeClipEditor event", event.detail);
      setShowClipEditor(false);
      setSelectedClip(null);
    };
    
    document.addEventListener('closeClipEditor', handleCloseEvent);
    
    // Cleanup
    return () => {
      window.closeClipEditor = undefined;
      document.removeEventListener('closeClipEditor', handleCloseEvent);
    };
  }, []);
  
  // Update the updateClip function to properly handle static clips
  const updateClip = useCallback((updatedClip) => {
    console.log("Updating clip:", updatedClip);
    
    // Special handling for narration clips
    if (updatedClip.type === 'narration' && updatedClip.hasNarration) {
      console.log("Handling narration clip update:", updatedClip);
      
      setScenes(prevScenes => {
        const newScenes = [...prevScenes];
        const scene = newScenes[currentScene];
        
        if (!scene || !Array.isArray(scene.clips)) {
          console.error("Invalid scene structure:", scene);
          return prevScenes;
        }
        
        // Find the clip that needs updating
        const clipIndex = scene.clips.findIndex(clip => clip.id === updatedClip.id);
        
        // Check for duplicates with the same ID
        const duplicateIndex = clipIndex === -1 ? -1 : 
          scene.clips.findIndex((clip, idx) => 
            clip.id === updatedClip.id && idx !== clipIndex
          );
          
        if (duplicateIndex !== -1) {
          console.warn(`Found duplicate narration clip with ID ${updatedClip.id}, removing duplicate`);
          // Remove the duplicate
          scene.clips.splice(duplicateIndex, 1);
        }
        
        if (clipIndex === -1) {
          console.error(`Narration clip with ID ${updatedClip.id} not found in scene`);
          return prevScenes;
        }
        
        // Preserve the original startTime from the scene
        const originalStartTime = scene.clips[clipIndex].startTime;
        
        // Make sure duration is honored for narration
        const duration = updatedClip.narrationDuration || (updatedClip.endTime - updatedClip.startTime);
        
        // Update the clip with the correct positioning
        const positionedClip = {
          ...updatedClip,
          startTime: originalStartTime,
          endTime: originalStartTime + duration
        };
        
        console.log("Updated narration clip position:", {
          startTime: positionedClip.startTime,
          endTime: positionedClip.endTime,
          duration: duration
        });
        
        // Update the clip in the scene
        scene.clips[clipIndex] = positionedClip;
        
        return newScenes;
      });
      
      // Update the selected clip
      setSelectedClip(updatedClip);
      
      return; // Exit early as we've handled the update
    }
    
    // Special handling for static clips being added to the timeline
    if (updatedClip.type === 'static' && updatedClip.draft === false) {
      console.log("Adding static clip to timeline:", updatedClip);
      
      // Check if this is a new static clip based on ID pattern
      const isNewStaticClip = updatedClip.id.startsWith('static-');
      
      // Make sure we have a valid duration
      const duration = updatedClip.duration || 3; // Default to 3 seconds if missing
      console.log(`Static clip duration: ${duration}s`);
      
      // Check if we already have a clip with this ID to prevent duplicates
      setScenes(prevScenes => {
        const newScenes = [...prevScenes];
        const scene = { ...newScenes[currentScene] };
        
        // Check for an existing clip with the same ID (to prevent duplicates)
        const existingClipIndex = scene.clips.findIndex(clip => clip.id === updatedClip.id);
        if (existingClipIndex !== -1 && isNewStaticClip) {
          console.log(`Static clip with ID ${updatedClip.id} already exists - skipping addition`);
          return prevScenes; // Return without adding duplicate
        }
        
        // Find where to position this clip in the timeline
        let startTime = 0;
        
        // Find the end time of the last clip
        scene.clips.forEach(clip => {
          if (clip.endTime > startTime) {
            startTime = clip.endTime;
          }
        });
        
        // Position the new static clip at the end of the timeline
        const positionedClip = {
          ...updatedClip,
          startTime: startTime,
          endTime: startTime + duration
        };
        
        console.log("Final positioned static clip:", {
          id: positionedClip.id,
          startTime: positionedClip.startTime,
          endTime: positionedClip.endTime,
          duration: positionedClip.duration,
          type: positionedClip.type
        });
        
        // Add the clip to the scene
        scene.clips.push(positionedClip);
        newScenes[currentScene] = scene;
        
        return newScenes;
      });
      
      // Close the clip editor 
      setShowClipEditor(false);
      return;
    }
    
    // Special handling for newly confirmed animations
    if (updatedClip.confirmedAnimation) {
      console.log("Detected confirmedAnimation flag - handling animated clip");
      console.log("Detailed clip data:", updatedClip);
      
      // Validate URL format first
      if (updatedClip.animationUrl) {
        try {
          // If URL is valid, log it
          console.log("Animation URL validation:", new URL(updatedClip.animationUrl));
        } catch (e) {
          console.error("Invalid animation URL format:", updatedClip.animationUrl, e);
          // Don't try to fix URL here - it should be fixed in ClipEditor/AnimationPhase
        }
      }
      
      setScenes(prevScenes => {
        // Create a new copy of the scenes
        const newScenes = [...prevScenes];
        const scene = newScenes[currentScene];
        
        if (!scene || !Array.isArray(scene.clips)) {
          console.error("Invalid scene structure:", scene);
          return prevScenes;
        }
        
        // Find the clip that needs updating
        const clipIndex = scene.clips.findIndex(clip => clip.id === updatedClip.id);
        
        if (clipIndex === -1) {
          // This is a new clip that needs to be added to the scene
          console.log(`Clip with ID ${updatedClip.id} not found in scene - adding new clip`);
          
          // Find the last clip that ends before this one starts
          // to determine where to place this clip in the timeline
          let startTime = 0;
          
          // Find the end time of the last video clip
          scene.clips.forEach(clip => {
            if (clip.id !== updatedClip.id && clip.endTime > startTime) {
              startTime = clip.endTime;
            }
          });
          
          // Calculate the duration from the trim values
          const duration = updatedClip.trimEnd - updatedClip.trimStart;
          
          // Update the clip with position information
          const positionedClip = {
            ...updatedClip,
            startTime: startTime,
            endTime: startTime + duration,
            // These properties are essential for timeline display:
            type: 'video',  // Explicitly set as video type
            animated: true, // Mark as animated
            // Use the first frame of animation as the preview image if no image exists
            image: updatedClip.image || (updatedClip.animationUrl ? updatedClip.animationUrl + '#t=0.1' : null),
            // Remove the confirmation flag as it's been handled
            confirmedAnimation: undefined,
            // No longer a draft
            draft: false
          };
          
          // Add the clip to the scene
          scene.clips.push(positionedClip);
          
          console.log("Added new animation clip to timeline:", {
            clip: positionedClip,
            startTime,
            endTime: startTime + duration,
            duration
          });
          
          return newScenes;
        } else {
          // Existing clip - update its position and properties
          
          // Find the last clip that ends before this one starts
          // to determine where to place this clip in the timeline
          let startTime = 0;
          
          // Find the end time of the last video clip
          scene.clips.forEach(clip => {
            if (clip.id !== updatedClip.id && clip.endTime > startTime) {
              startTime = clip.endTime;
            }
          });
          
          // Calculate the duration from the trim values
          const duration = updatedClip.trimEnd - updatedClip.trimStart;
          
          // Update the clip with position information
          const positionedClip = {
            ...updatedClip,
            startTime: startTime,
            endTime: startTime + duration,
            // These properties are essential for timeline display:
            type: 'video',  // Explicitly set as video type
            animated: true, // Mark as animated
            // Use the first frame of animation as the preview image if no image exists
            image: updatedClip.image || (updatedClip.animationUrl ? updatedClip.animationUrl + '#t=0.1' : null),
            // Remove the confirmation flag as it's been handled
            confirmedAnimation: undefined,
            // No longer a draft
            draft: false
          };
          
          // Update the clip in the scene
          scene.clips[clipIndex] = positionedClip;
          
          console.log("Positioned animation clip in timeline:", {
            clip: positionedClip,
            startTime,
            endTime: startTime + duration,
            duration,
            type: positionedClip.type,
            hasImage: !!positionedClip.image,
            animationUrl: positionedClip.animationUrl
          });
          
          return newScenes;
        }
      });
      
      // Update selected clip
      setSelectedClip(updatedClip);
      
      // Close the editor after confirming the animation
      setTimeout(() => {
        console.log("Animation confirmed, closing editor");
        setShowClipEditor(false);
      }, 300); // Added longer delay to ensure state updates propagate
      
      return; // Exit early as we've handled the update
    }
    
    // For clips that are not yet confirmed/added to timeline (drafts or image-only updates)
    // Just update the selectedClip without touching the scenes array
    if (updatedClip.draft || (!updatedClip.animated && !updatedClip.confirmedAnimation)) {
      console.log("Updating draft clip or image-only update - not adding to timeline yet");
      setSelectedClip(updatedClip);
      return;
    }
    
    // For regular clip updates that are already in the timeline
    // This handles clips that are already in the timeline and need updates
    setScenes(prevScenes => {
      // Find the clip with this ID
      const clipIndex = prevScenes[currentScene].clips.findIndex(clip => clip.id === updatedClip.id);
      
      if (clipIndex === -1) {
        console.log("Clip not found in current scene - might be a draft clip");
        return prevScenes;
      }
      
      const oldClip = prevScenes[currentScene].clips[clipIndex];
      
      // Use a more efficient comparison for clips
      // Added animated properties to comparison
      const hasChanges = oldClip.id !== updatedClip.id ||
                        oldClip.image !== updatedClip.image ||
                        JSON.stringify(oldClip.characters) !== JSON.stringify(updatedClip.characters) ||
                        oldClip.environment !== updatedClip.environment ||
                        oldClip.action !== updatedClip.action ||
                        oldClip.style !== updatedClip.style ||
                        oldClip.startTime !== updatedClip.startTime ||
                        oldClip.endTime !== updatedClip.endTime ||
                        oldClip.animated !== updatedClip.animated ||
                        oldClip.trimStart !== updatedClip.trimStart ||
                        oldClip.trimEnd !== updatedClip.trimEnd ||
                        oldClip.animationUrl !== updatedClip.animationUrl ||
                        oldClip.animationDuration !== updatedClip.animationDuration;
      
      if (!hasChanges) {
        console.log("Clip data unchanged, skipping scenes update");
        return prevScenes; // Return existing reference if nothing changed
      }
      
      // Only create a new scenes array if we need to update
      const newScenes = [...prevScenes];
      
      // If the clip is animated but doesn't have a type set, make sure it's marked as 'video'
      if (updatedClip.animated && updatedClip.animationUrl && !updatedClip.type) {
        updatedClip.type = 'video';
      }
      
      // Apply the update
      newScenes[currentScene].clips[clipIndex] = updatedClip;
      
      // Log for debugging
      console.log("Updated clip in scene:", {
        clipId: updatedClip.id,
        isAnimated: updatedClip.animated,
        hasAnimationUrl: !!updatedClip.animationUrl,
        type: updatedClip.type
      });
      
      return newScenes;
    });
    
    // Always update the selected clip
    setSelectedClip(updatedClip);
  }, [currentScene, scenes]);
  
  // Set transition between scenes
  const setTransition = (transitionType) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      newScenes[currentScene].transition = transitionType;
      return newScenes;
    });
  };
  
  // Add a new clip to the timeline
  const addClip = (clipType) => {
    // Generate unique ID for new clip with timestamp and more randomness
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 12);
    const newClipId = `clip-${timestamp}-${randomId}`;
    
    console.log(`Generated new clip ID: ${newClipId}`);
    
    // Handle sound clips differently - open the sound selector
    if (clipType === 'sound') {
      setShowSoundSelector(true);
      return;
    }
    
    // Create a new clip object for other types
    const newClip = {
      id: newClipId,
      type: clipType,
      image: null,
      startTime: 0,
      endTime: 3, // Default duration of 3 seconds
      characters: [],
      environment: '',
      action: '',
      style: 'anime'
    };
    
    // Handle different clip types
    if (clipType === 'video') {
      // For video clips, mark as draft until animation is confirmed
      // This means they won't be added to the timeline yet
      newClip.draft = true;
      
      // Just set it as the selected clip for editing
      setSelectedClip(newClip);
      
      // Open the clip editor
      console.log("Opening clip editor for new draft video clip");
      setTimeout(() => {
        setShowClipEditor(true);
        setShowNarrationEditor(false);
      }, 50);
    } 
    else if (clipType === 'narration') {
      // For narration clips, set specific properties
      newClip.narrationText = ''; // Text of the narration
      newClip.narrationVoice = 'alloy'; // Voice for text-to-speech
      newClip.narrationSpeed = 1; // Default speed
      newClip.narrationUrl = null; // URL to generated audio
      newClip.hasNarration = false; // Flag to indicate if narration has been generated
      
      // Add the narration clip to the timeline right away
      setScenes(prevScenes => {
        const newScenes = [...prevScenes];
        const currentSceneObj = {...newScenes[currentScene]};
        
        // Check if a clip with this ID already exists to prevent duplicates
        const existingClipIndex = currentSceneObj.clips.findIndex(clip => clip.id === newClip.id);
        if (existingClipIndex !== -1) {
          console.warn(`Clip with ID ${newClip.id} already exists in the timeline, not adding duplicate`);
          return prevScenes;
        }
        
        // Find where to position this clip in the timeline
        let startTime = 0;
        
        // Only find the end time of the last clip if there are existing clips
        if (currentSceneObj.clips && currentSceneObj.clips.length > 0) {
          // Find the end time of the last clip
          currentSceneObj.clips.forEach(clip => {
            if (clip.endTime > startTime) {
              startTime = clip.endTime;
            }
          });
        } else {
          // If no clips exist, start at the beginning (0)
          startTime = 0;
        }
        
        console.log(`Positioning narration clip at startTime=${startTime}`);
        
        // Position this clip at the end of the timeline or at 0 if no clips
        newClip.startTime = startTime;
        newClip.endTime = startTime + 3; // Default 3 second duration
        
        // Add the clip to the scene
        currentSceneObj.clips.push(newClip);
        newScenes[currentScene] = currentSceneObj;
        
        return newScenes;
      });
      
      // Select the clip and open the narration editor
      setSelectedClip(newClip);
      setShowNarrationEditor(true);
      setShowClipEditor(false);
    }
  };
  
  // New function to open clip editor by ID rather than index
  const openClipEditorById = (clipId) => {
    console.log(`Opening clip editor for clip with ID: ${clipId}`);
    
    // Safety check for current scene
    if (currentScene < 0 || currentScene >= scenes.length) {
      console.error("Invalid current scene index:", currentScene);
      return;
    }
    
    // Get the current scene
    const scene = scenes[currentScene];
    if (!scene || !Array.isArray(scene.clips)) {
      console.error("Scene or scene.clips is not valid:", scene);
      return;
    }
    
    // Find clip by ID
    const clip = scene.clips.find(c => c.id === clipId);
    if (!clip) {
      console.error(`Clip with ID ${clipId} not found in scene`);
      return;
    }
    
    console.log("Setting selected clip:", clip);
    setSelectedClip(clip);
    
    // Open the clip editor modal
    console.log("Opening clip editor modal");
    setShowClipEditor(true);
  };
  
  // Update the openClipEditor function to ensure it properly opens the editor
  const openClipEditor = (clipIndex) => {
    console.log(`Finding clip at index ${clipIndex}`);
    
    // Safety check for current scene
    if (currentScene < 0 || currentScene >= scenes.length) {
      console.error("Invalid current scene index:", currentScene);
      return;
    }
    
    // Get the current scene
    const scene = scenes[currentScene];
    if (!scene || !Array.isArray(scene.clips)) {
      console.error("Scene or scene.clips is not valid:", scene);
      return;
    }
    
    // Check that clipIndex is valid
    if (clipIndex < 0 || clipIndex >= scene.clips.length) {
      console.error(`Invalid clip index: ${clipIndex}. Scene has ${scene.clips.length} clips.`);
      return;
    }
    
    // Get the clip
    const clip = scene.clips[clipIndex];
    if (!clip) {
      console.error("Clip not found at index:", clipIndex);
      return;
    }
    
    // Set selected clip and open appropriate editor
    console.log("Setting selected clip:", clip);
    setSelectedClip(clip);
    
    // Open narration editor for narration clips, regular clip editor for others
    if (clip.type === 'narration') {
      console.log("Opening narration editor modal");
      setShowNarrationEditor(true);
      setShowClipEditor(false);
    } else {
      console.log("Opening clip editor modal");
      setShowClipEditor(true);
      setShowNarrationEditor(false);
    }
  };
  
  // Handle image generation
  const generateImage = async () => {
    if (!selectedClip) {
      console.error("No clip selected for image generation");
      toast.error("No clip selected. Please select a clip first.");
      return;
    }
    
    console.log("Starting image generation with clip:", selectedClip);
    console.log("Characters in clip:", selectedClip.characters);
    
    // Start the generation process
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Ensure selectedClip characters is at least an empty array 
      const clipCharacters = selectedClip.characters || [];
      
      // Get character information for the prompt
      const characterInfo = clipCharacters.length > 0
        ? clipCharacters.map(character => {
            console.log("Processing character for prompt:", character);
            // Find the complete character data
            const fullCharacter = allCharacters.find(c => c.id === character.id) || 
                                 projectCharacters.find(c => c.id === character.id) || 
                                 character;
            
            return {
              name: fullCharacter.name || "Unnamed character",
              image: fullCharacter.thumbnail || fullCharacter.imageUrl || fullCharacter.imagePath,
              description: fullCharacter.description || ''
            };
          })
        : [{ name: "Default character", description: "Generic anime character" }];
      
      // Create a detailed cinematic prompt for the image generation
      const characterNames = characterInfo.map(c => c.name).join(', ');
      const characterDescriptions = characterInfo.map(c => `${c.name}: ${c.description}`).join('\n');
      
      // Create a more detailed, cinematic prompt template
      const detailedPrompt = `
Create a high-quality ${selectedClip.style || 'anime'} style scene with the following specifications:

CHARACTERS: ${characterNames}
ENVIRONMENT: ${selectedClip.environment || 'Generic background'}
ACTION: ${selectedClip.action || 'Standing naturally'}

VISUAL STYLE:
- Full-body composition showing all characters from head to toe
- Dynamic poses that convey emotion and personality
- Dramatic camera angle (${getRandomCameraAngle()})
- Cinematic lighting with proper shadows and highlights
- Detailed background with proper perspective and depth
- Realistic fabric movement in clothing and hair
- Detailed facial expressions that convey emotion

CHARACTER DETAILS:
${characterDescriptions}

The scene should have a strong sense of narrative and emotional impact. Characters should be interacting with the environment in a natural way. Include environmental elements that enhance the mood and story.
      `.trim();
      
      console.log("Image generation prompt:", detailedPrompt);
      
      // Track progress for UI feedback
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          const newProgress = Math.min(prev + 5, 95); // Cap at 95% until we get the result
          return newProgress;
        });
      }, 300);
      
      try {
        // Option 1: Use the backend as a proxy for DALL-E (recommended to avoid CORS issues)
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/api/generate-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: detailedPrompt,
            model: "dall-e-3",
            size: "1024x1024",
            quality: "hd",
            style: "vivid"
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Image generation API error: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        clearInterval(progressInterval);
        setGenerationProgress(100);
        
        // Update the clip with the generated image and prompt
        if (data.success && data.imagePath) {
          // Preserve the draft status when updating with the image
          // This ensures it won't get added to the timeline yet
          updateClip({
            ...selectedClip,
            image: `${apiUrl}/${data.imagePath}`,
            generationPrompt: detailedPrompt,
            // Keep draft status if it was already set
            draft: selectedClip.draft === true
          });
          setIsGenerating(false);
          toast.success("Image generated successfully!");
        } else {
          throw new Error("No image data returned from API");
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        
        // Fallback method: Try using OpenAI directly but handle the CORS issue
        try {
          console.log("Attempting direct OpenAI call as fallback...");
          
          const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "your-openai-api-key";
          const API_URL = "https://api.openai.com/v1/images/generations";
          
          const directResponse = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: detailedPrompt,
              n: 1,
              size: "1024x1024",
              quality: "hd",
              style: "vivid",
              response_format: "b64_json" // Request base64 data directly instead of URL
            })
          });
          
          if (!directResponse.ok) {
            const errorData = await directResponse.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || directResponse.statusText}`);
          }
          
          const directData = await directResponse.json();
          
          if (directData.data && directData.data.length > 0 && directData.data[0].b64_json) {
            // Create a data URL from the base64 data
            const imageDataUrl = `data:image/png;base64,${directData.data[0].b64_json}`;
            
            // Update the clip with the generated image and prompt
            // Preserve the draft status when updating with the image
            updateClip({
              ...selectedClip,
              image: imageDataUrl,
              generationPrompt: detailedPrompt,
              // Keep draft status if it was already set
              draft: selectedClip.draft === true
            });
            setIsGenerating(false);
            toast.success("Image generated successfully with fallback method!");
          } else {
            throw new Error("No base64 image data returned from OpenAI");
          }
        } catch (fallbackError) {
          console.error("Fallback method also failed:", fallbackError);
          clearInterval(progressInterval);
          handleGenerationError(fallbackError);
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      handleGenerationError(error);
    }
  };
  
  // Helper function to get a random cinematic camera angle
  const getRandomCameraAngle = () => {
    const angles = [
      "low angle looking up at the character",
      "high angle looking down on the scene",
      "eye-level with shallow depth of field",
      "over-the-shoulder perspective",
      "Dutch angle for dramatic tension",
      "wide angle to show the environment",
      "medium shot with rule-of-thirds composition"
    ];
    return angles[Math.floor(Math.random() * angles.length)];
  };
  
  // Helper for error handling in image generation
  const handleGenerationError = (error) => {
    setIsGenerating(false);
    setGenerationProgress(0);
    
    console.error("Detailed error information:", error);
    
    // Create a more visually appealing fallback image
    const errorMessage = error?.message || "Unknown error";
    const fallbackImageUrl = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#2d3748"/>
        <text x="400" y="250" font-family="Arial" font-size="24" fill="#fff" text-anchor="middle">Image Generation Failed</text>
        <text x="400" y="300" font-family="Arial" font-size="18" fill="#cbd5e0" text-anchor="middle">${errorMessage}</text>
        <text x="400" y="340" font-family="Arial" font-size="14" fill="#a0aec0" text-anchor="middle">Check OPENAI_API_KEY in backend/.env</text>
      </svg>
    `)}`;
    
    updateClip({
      ...selectedClip,
      image: fallbackImageUrl
    });
    
    toast.error("Error generating image: " + errorMessage);
  };
  
  // Handle image upload from ClipEditor component
  const handleImageUpload = (file) => {
    console.log("Handling image upload...", file);
    
    if (!selectedClip) {
      console.error("No clip selected for image upload");
      toast.error("No clip selected. Please select a clip first.");
      return;
    }
    
    if (!file || !(file instanceof File)) {
      console.error("Invalid file provided for upload:", file);
      toast.error("Invalid file. Please select a valid image file.");
      return;
    }
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // e.target.result contains the data URL
          const dataUrl = e.target.result;
          
          // Verify the data URL is valid by preloading the image
          const img = new Image();
          
          img.onload = () => {
            // Update the clip with the uploaded image
            updateClip({
              ...selectedClip,
              image: dataUrl
            });
            toast.success("Image uploaded successfully!");
          };
          
          img.onerror = () => {
            console.error("Error loading uploaded image");
            // Provide a fallback image
            const fallbackImageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI2MDAiIGZpbGw9IiM1NTUiLz48dGV4dCB4PSI0MDAiIHk9IjMwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5VcGxvYWRlZCBJbWFnZSBFcnJvcjwvdGV4dD48L3N2Zz4=";
            updateClip({
              ...selectedClip,
              image: fallbackImageUrl
            });
            toast.error("Error loading uploaded image");
          };
          
          img.src = dataUrl;
        } catch (innerError) {
          console.error("Error processing uploaded image:", innerError);
          toast.error("Error processing uploaded image");
        }
      };
      
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast.error("Error reading uploaded file");
      };
      
      // Read the file as a data URL
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error in handleImageUpload:", error);
      toast.error("Error uploading image: " + (error.message || "Unknown error"));
    }
  };
  
  // Export animation
  const exportAnimation = () => {
    console.log("Exporting animation:", storyTitle);
    // In a real app, you would call an API to export the animation
    setShowPublishModal(false);
  };
  
  // Project selector component
  const ProjectSelector = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Anime Studio</h1>
            <p className="text-gray-400 mt-1">Create your anime with a timeline-based editor</p>
            </div>
        </div>
        
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Projects</h2>
            <button
              onClick={createNewProject}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-300"
            >
              Create New
            </button>
        </div>
        
          {projectList.length === 0 ? (
            <div className="text-center py-8 bg-gray-700 rounded-lg">
              <p className="text-gray-400 mb-4">You don't have any projects yet</p>
              <button
                onClick={createNewProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectList.map(project => (
                <div
                  key={project.id}
                  className="bg-gray-700 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer relative group"
                >
                  <div 
                    className="aspect-video bg-gray-900 relative"
                    onClick={() => loadProject(project)}
                  >
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiB2aWV3Qm94PSIwIDAgODAwIDQ1MCI+PHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI0NTAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI0MDAiIHk9IjIyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjMwIiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gUHJldmlldzwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 text-sm rounded">
                      {project.duration}
                    </div>
                  </div>
                  <div 
                    className="p-4"
                    onClick={() => loadProject(project)}
                  >
                    <h3 className="text-white font-semibold mb-1">{project.title}</h3>
                    <div className="flex justify-between text-gray-400 text-sm">
                      <span>{project.author}</span>
                      <span>Edited {project.lastEdited}</span>
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProject(project.id, e);
                    }}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Delete Project"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Add state for sound selector visibility
  const [showSoundSelector, setShowSoundSelector] = useState(false);

  // Add this function to handle adding sound from the selector
  const handleAddSound = (soundData) => {
    console.log("Adding sound to timeline:", soundData);
    
    // Generate unique ID for new sound clip
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 12);
    const newClipId = `sound-${timestamp}-${randomId}`;
    
    // Create a new sound clip with the selected track data
    const newClip = {
      id: newClipId,
      type: 'sound',
      title: soundData.title,
      soundUrl: soundData.url,
      startTime: 0, // Will be positioned at the end of the timeline
      duration: soundData.duration,
      source: soundData.source
    };
    
    // Add the sound clip to the timeline
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      const currentSceneObj = {...newScenes[currentScene]};
      
      // Find where to position this clip in the timeline
      let startTime = 0;
      
      // Only find the end time of the last clip if there are existing clips
      if (currentSceneObj.clips && currentSceneObj.clips.length > 0) {
        // Find the end time of the last clip
        currentSceneObj.clips.forEach(clip => {
          if (clip.endTime > startTime) {
            startTime = clip.endTime;
          }
        });
      }
      
      console.log(`Positioning sound clip "${soundData.title}" at startTime=${startTime}`);
      
      // Position this clip at the end of the timeline
      newClip.startTime = startTime;
      newClip.endTime = startTime + soundData.duration;
      
      // Add the clip to the scene
      currentSceneObj.clips.push(newClip);
      newScenes[currentScene] = currentSceneObj;
      
      return newScenes;
    });
  };
  
  // Render the main component
  return (
    <div className="anime-creator-page">
      {showProjectSelector ? (
        <ProjectSelector />
      ) : (
        <>
          <TimelineEditor
            scenes={scenes}
            currentScene={currentScene}
            setCurrentScene={setCurrentScene}
            selectedClip={selectedClip}
            onClipClick={handleClipClick}
            onAddScene={addNewScene}
            onDeleteScene={deleteScene}
            onUpdateClip={updateClip}
            onAddClip={addClip}
            onOpenClipEditor={openClipEditor}
            onSetTransition={setTransition}
            storyTitle={storyTitle}
            setStoryTitle={setStoryTitle}
            author={author}
            setAuthor={setAuthor}
            description={description}
            setDescription={setDescription}
            onBackToProjects={goBackToProjects}
            onShowPublishModal={() => setShowPublishModal(true)}
          />
          
          {showClipEditor && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-gray-800 rounded-lg shadow-xl">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Edit Clip</h2>
                  <button
                    onClick={() => setShowClipEditor(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <ClipEditor
                    selectedClip={selectedClip}
                    onUpdateClip={updateClip}
                    onGenerateImage={generateImage}
                    onUploadImage={handleImageUpload}
                    isGenerating={isGenerating}
                    generationProgress={generationProgress}
                    allCharacters={allCharacters}
                    projectCharacters={projectCharacters}
                    onAddToProject={assignCharacterToProject}
                    onRemoveFromProject={removeCharacterFromProject}
                  />
                </div>
              </div>
            </div>
          )}
        
          {showPublishModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
              <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Export Animation</h2>
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                      <div>
                      <label className="block text-gray-400 text-sm mb-1">Title</label>
                      <input
                        type="text"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                      />
                              </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Genre</label>
                          <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="">Select Genre</option>
                        <option value="action">Action</option>
                        <option value="comedy">Comedy</option>
                        <option value="drama">Drama</option>
                        <option value="fantasy">Fantasy</option>
                        <option value="scifi">Sci-Fi</option>
                          </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 h-24"
                          />
                        </div>
                      <div>
                      <label className="block text-gray-400 text-sm mb-1">Export Format</label>
                            <select
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="mp4">MP4 Video</option>
                        <option value="gif">Animated GIF</option>
                        <option value="webm">WebM</option>
                            </select>
                          </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Resolution</label>
                      <select
                        className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
                      >
                        <option value="720p">720p (HD)</option>
                        <option value="1080p">1080p (Full HD)</option>
                        <option value="2160p">2160p (4K)</option>
                      </select>
                    </div>
                  <button
                      onClick={exportAnimation}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300"
                  >
                      Export Animation
                  </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        
          {showNarrationEditor && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-gray-800 rounded-lg shadow-xl">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">Narration Editor</h2>
                  <button
                    onClick={() => setShowNarrationEditor(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6">
                  <NarrationEditor
                    selectedClip={selectedClip}
                    onUpdateClip={updateClip}
                    onClose={() => setShowNarrationEditor(false)}
                  />
                </div>
              </div>
            </div>
          )}
        
          {showSoundSelector && (
            <SoundSelector
              onAddSound={handleAddSound}
              onClose={() => setShowSoundSelector(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AnimeCreatorPage; 
