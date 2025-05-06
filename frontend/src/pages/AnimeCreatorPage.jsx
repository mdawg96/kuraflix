import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TimelineEditor from '../components/TimelineEditor';
import ClipEditor from '../components/ClipEditor';
import ImageGenerationProgress from '../components/ImageGenerationProgress';
import { characterAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { firestoreService } from '../services/firestoreService';
import NarrationEditor from '../components/NarrationEditor';
import SoundSelector from '../components/SoundSelector';
import { v4 as uuidv4 } from 'uuid';
import { getClipsForSaving, finalizeClipForTimeline } from '../components/TimelineEditor/utils/ClipUtils';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser } from '../firebase/auth';

const AnimeCreatorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProjectSelector, setShowProjectSelector] = useState(true);
  const [projectList, setProjectList] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user: authUser } = useAuth();
  
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
  
  // Add state for project creation
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  
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
  
  // Load a project from Firebase
  const loadProject = async (projectId) => {
    if (!projectId) {
      console.error("No project ID provided");
      toast.error("No project ID provided");
      return;
    }

    setLoading(true);
    try {
      console.log("Loading project:", projectId);
      
      // Handle both project ID object and direct ID string
      const id = typeof projectId === 'object' ? projectId.id : projectId;
      
      const response = await firestoreService.getProject(id);
      if (!response.success) {
        console.error("Error loading project:", response.error);
        toast.error("Error loading project: " + response.error);
        setLoading(false);
        return;
      }
      
      const project = response.data;
      console.log("Project data loaded:", project);

      // Initialize scenes
      let projectScenes = [];
      
      // Parse scenes from JSON string or use array directly
      if (typeof project.scenes === 'string') {
        try {
          console.log("Parsing scenes from JSON string...");
          projectScenes = JSON.parse(project.scenes);
          console.log("Parsed scenes:", projectScenes);
        } catch (err) {
          console.error("Error parsing scenes JSON:", err);
          toast.error("Error parsing project data");
          projectScenes = [createDefaultScene()];
        }
      } else if (Array.isArray(project.scenes)) {
        projectScenes = project.scenes;
      } else {
        console.warn("No valid scenes found, creating default scene");
        projectScenes = [createDefaultScene()];
      }

      // Validate and process each scene
      projectScenes.forEach((scene, sceneIndex) => {
        // Ensure scene has required fields
        if (!scene.id) {
          scene.id = `scene-${Date.now()}-${sceneIndex}`;
        }
        
        if (!scene.title) {
          scene.title = `Scene ${sceneIndex + 1}`;
        }
        
        // Ensure clips array exists
        if (!Array.isArray(scene.clips)) {
          console.warn(`Scene ${sceneIndex} has invalid clips array, fixing...`);
          scene.clips = [];
        } else {
          // Process all clips to ensure they're properly finalized
          scene.clips = scene.clips.map(clip => finalizeClipForTimeline(clip));
          
          // Log sound clips for debugging
          const soundClips = scene.clips.filter(clip => clip.type === 'sound');
          if (soundClips.length > 0) {
            console.log(`Found ${soundClips.length} sound clips in scene ${sceneIndex}:`, 
              soundClips.map(clip => ({
                id: clip.id, 
                type: clip.type,
                title: clip.title,
                soundUrl: clip.soundUrl || clip.url,
                startTime: clip.startTime,
                endTime: clip.endTime,
                duration: clip.endTime - clip.startTime,
                finalized: clip.finalized
              }))
            );
          }
        }
      });

      // Set project properties
      setStoryTitle(project.title || 'Untitled Project');
      setAuthor(project.author || 'Anonymous');
      setDescription(project.description || '');
      setGenre(project.genre || '');
      setScenes(projectScenes);
      setCurrentScene(projectScenes[0] || createDefaultScene());
      
      // Set current project
      setCurrentProject({
        id: id,
        title: project.title,
        thumbnailUrl: project.thumbnailUrl,
        created: project.created,
        lastModified: project.lastModified,
        author: project.author,
        description: project.description,
        genre: project.genre
      });

      // Load characters associated with this project
      try {
        const charactersResponse = await firestoreService.getProjectCharacters(id);
        if (charactersResponse.success) {
          setProjectCharacters(charactersResponse.data || []);
        } else {
          console.warn("Could not load project characters:", charactersResponse.error);
        }
      } catch (error) {
        console.error("Error loading project characters:", error);
      }

      toast.success("Project loaded successfully!");
      return true;
    } catch (error) {
      console.error("Error loading project:", error);
      toast.error("Failed to load project: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new project and proceed to editor
  const createNewProject = async (title = 'New Project', author = 'Anonymous') => {
    try {
      // Prevent duplicate project creation
      if (isCreatingProject) return;
      
      console.log("Starting new project creation...");
      setIsCreatingProject(true);
      
      // Create a new project ID
      const projectId = 'project-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      
      // Create default project data WITHOUT saving to Firestore initially
      const projectData = {
        id: projectId,
        title,
        author,
        description: '',
        scenes: [createDefaultScene()],
        thumbnail: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastEdited: new Date().toLocaleString(),
        isNew: true // Flag to indicate this is a new unsaved project
      };
      
      console.log('Project data created locally:', projectData);
      
      // Set all state in a synchronous block to prevent race conditions
      setCurrentProject(projectData);
      setScenes([createDefaultScene()]);
      setCurrentScene(0);
      setStoryTitle(title);
      setAuthor(author);
      setDescription('');
      
      // IMPORTANT: Set showProjectSelector to false LAST after all other state is set
      console.log("Switching to editor view...");
      setShowProjectSelector(false);
      
      // Update URL for bookmarking, but don't rely on this for the view change
      navigate(`/anime-studio?view=editor&projectId=${projectId}`, { replace: true });
      
      toast.success('New project created. Remember to save your work!');
      
      // Small delay before resetting the creating state to ensure everything is rendered
      setTimeout(() => {
        setIsCreatingProject(false);
        console.log("Project creation complete.");
      }, 500);
    } catch (error) {
      console.error('Error creating new project:', error);
      toast.error('Failed to create new project');
      setIsCreatingProject(false);
      setShowProjectSelector(true); // Ensure we show the selector on error
    }
  };
  
  // Load projects from Firestore when component mounts
  useEffect(() => {
    // Only load projects if we're showing the project selector
    if (showProjectSelector) {
      loadProjects();
    }
  }, [showProjectSelector, authUser]);
  
  // Save project to database
  const saveProject = async () => {
    try {
      // Validate basic requirements
      if (!storyTitle) {
        toast.error("Please enter a title for your project");
        return;
      }

      // Get user ID from auth
      const user = authUser || getCurrentUser();
      if (!user || !user.uid) {
        console.error("No authenticated user found");
        toast.error("You must be logged in to save a project");
        return;
      }

      setLoading(true);
      console.log("Saving project...");

      // Create a deep copy of scenes to avoid modifying state directly
      const scenesToSave = JSON.parse(JSON.stringify(scenes));
      
      // Process each scene to finalize its clips for saving
      scenesToSave.forEach((scene, index) => {
        if (!Array.isArray(scene.clips)) {
          console.warn(`Scene ${index} has invalid clips array, fixing...`);
          scene.clips = [];
        } else {
          // Process clips using the getClipsForSaving utility
          scene.clips = getClipsForSaving(scene.clips);
          
          // Log sound clips for debugging
          const soundClips = scene.clips.filter(clip => clip.type === 'sound');
          if (soundClips.length > 0) {
            console.log(`Saving ${soundClips.length} sound clips in scene ${index}:`, 
              soundClips.map(clip => ({
                id: clip.id, 
                type: clip.type,
                title: clip.title,
                soundUrl: clip.soundUrl || clip.url,
                startTime: clip.startTime,
                endTime: clip.endTime,
                duration: clip.duration
              }))
            );
          }
        }
      });

      // Create a timestamp for "last saved"
      const saveTime = new Date();
      const saveTimeISO = saveTime.toISOString();

      // Prepare project data
      const projectData = {
        title: storyTitle,
        author: author || user.displayName || 'Anonymous',
        description: description || '',
        genre: genre || '',
        scenes: JSON.stringify(scenesToSave),
        thumbnailUrl: currentProject?.thumbnailUrl || '',
        userId: user.uid,
        lastModified: saveTimeISO,
        lastSaved: saveTimeISO // Add human-readable timestamp for UI feedback
      };

      console.log("Saving project data:", projectData);

      // If we already have a project ID, update that project
      if (currentProject?.id) {
        console.log("Updating existing project:", currentProject.id);
        const updateResult = await firestoreService.updateProject(
          currentProject.id, 
          projectData
        );
        
        if (updateResult.success) {
          console.log("Project updated successfully:", updateResult.data);
          toast.success("Project updated successfully!");
          
          // Update current project with latest data
          setCurrentProject({
            ...currentProject,
            ...projectData,
            lastModified: saveTimeISO,
            lastSaved: saveTimeISO
          });
          
          return updateResult.data;
        } else {
          console.error("Error updating project:", updateResult.error);
          toast.error("Failed to update project: " + updateResult.error);
          return null;
        }
      } 
      // Otherwise create a new project
      else {
        console.log("Creating new project");
        // Add created timestamp for new projects
        projectData.created = saveTimeISO;
        
        const createResult = await firestoreService.createProject(projectData);
        
        if (createResult.success) {
          console.log("Project created successfully:", createResult.data);
          toast.success("Project created successfully!");
          
          // Set current project with the new project data including ID
          setCurrentProject({
            ...projectData,
            id: createResult.data,
            created: saveTimeISO,
            lastSaved: saveTimeISO
          });
          
          // Update URL to include the new project ID
          navigate(`/anime-studio?view=editor&projectId=${createResult.data}`, { replace: true });
          
          return createResult.data;
        } else {
          console.error("Error creating project:", createResult.error);
          toast.error("Failed to create project: " + createResult.error);
          return null;
        }
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project: " + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Load projects from Firestore instead of localStorage
  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // Get current user from context or auth service
      const currentUser = authUser || getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        console.error("No authenticated user found");
        toast.error("You must be logged in to load projects");
        setLoading(false);
        return [];
      }
      
      // Create a query reference
      const projectsRef = collection(db, "projects");
      const projectsQuery = query(
        projectsRef,
        where("userId", "==", currentUser.uid),
        orderBy("lastModified", "desc")
      );
      
      // Execute the query
      const projectsSnapshot = await getDocs(projectsQuery);

      let loadedProjects = [];
      
      projectsSnapshot.forEach((doc) => {
        try {
          const project = { id: doc.id, ...doc.data() };
          
          // Parse scenes if they are stored as a string
          let projectScenes = [];
          if (typeof project.scenes === 'string') {
            try {
              console.log("Parsing scenes from JSON string...");
              projectScenes = JSON.parse(project.scenes);
              // Ensure each scene has required fields
              projectScenes = projectScenes.map(scene => ({
                ...scene,
                id: scene.id || `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: scene.title || 'Untitled Scene',
              }));
            } catch (err) {
              console.error("Error parsing scenes JSON:", err);
              projectScenes = [createDefaultScene()];
            }
          } else if (Array.isArray(project.scenes)) {
            projectScenes = project.scenes;
          } else {
            projectScenes = [createDefaultScene()];
          }
          
          // Validate clips in each scene
          projectScenes.forEach((scene, sceneIndex) => {
            if (!Array.isArray(scene.clips)) {
              console.warn(`Scene ${sceneIndex} has invalid clips array, fixing...`);
              scene.clips = [];
            } else {
              // Process all clips to ensure they are properly finalized
              scene.clips = scene.clips.map(clip => {
                // Apply finalizeClipForTimeline to ensure all required properties exist
                return finalizeClipForTimeline(clip);
              });
              
              // Log sound clips for debugging
              const soundClips = scene.clips.filter(clip => clip.type === 'sound');
              if (soundClips.length > 0) {
                console.log(`Found ${soundClips.length} sound clips in scene ${sceneIndex}:`, 
                  soundClips.map(clip => ({
                    id: clip.id, 
                    type: clip.type,
                    title: clip.title,
                    soundUrl: clip.soundUrl,
                    url: clip.url,
                    startTime: clip.startTime,
                    endTime: clip.endTime,
                    duration: clip.duration,
                    finalized: clip.finalized
                  }))
                );
              }
            }
          });
          
          // Update project with processed scenes
          project.scenes = projectScenes;
          
          // Add project to list if it has required fields
          if (project.title && project.author) {
            loadedProjects.push(project);
          } else {
            console.warn("Skipping project with missing required fields:", project.id);
          }
        } catch (err) {
          console.error("Error processing project:", err);
        }
      });
      
      console.log("Loaded projects:", loadedProjects);
      setProjectList(loadedProjects);
    } catch (err) {
      console.error("Error loading projects:", err);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };
  
  // Delete project from Firestore instead of localStorage
  const deleteProject = async (project, event) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      // Show confirmation dialog
      if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        return;
      }

      // Ensure we have a valid project id
      const projectId = project?.id;
      if (!projectId) {
        console.error("Cannot delete project: Invalid project ID", project);
        toast.error("Cannot delete: Invalid project ID");
        return;
      }
      
      console.log(`Deleting project with ID: ${projectId}`, project);
      
      // Show deletion in progress
      const toastId = toast.loading(`Deleting project...`);
      
      // Try to delete from Firestore
      const response = await firestoreService.deleteAnimeProject(projectId);
      
      if (response.success) {
        console.log("Project deleted from Firestore successfully");
        
        // Update the project list after deletion - filter out the deleted project
        setProjectList(prevProjects => prevProjects.filter(p => p.id !== projectId));
        
        // Use higher timeout to ensure Firestore has time to process the deletion
        setTimeout(async () => {
          try {
            // Do a complete refresh to ensure the UI is in sync with Firestore
            const refreshedProjects = await loadProjects();
            console.log("Projects refreshed after deletion:", refreshedProjects);
          } catch (refreshError) {
            console.error("Error refreshing projects after deletion:", refreshError);
          }
        }, 1000);
        
        // Show success message
        toast.success('Project deleted successfully', { id: toastId });
        
        // If we're viewing the project we just deleted, go back to the selector
        if (currentProject && currentProject.id === projectId) {
          setShowProjectSelector(true);
          navigate('/anime-studio', { replace: true });
        }
      } else {
        console.error("Error deleting project from Firestore:", response.error);
        
        // If the error is "Project not found in database", the project exists in our UI but not in Firestore
        // In this case, we should just remove it from the UI
        if (response.error === 'Project not found in database' || response.error === 'Project not found') {
          console.log("Project not found in Firestore but exists in UI. Removing from UI only.");
          
          // Update the project list to remove the phantom project
          setProjectList(prevProjects => prevProjects.filter(p => p.id !== projectId));
          
          toast.success('Project removed from view', { id: toastId });
          
          // If we're viewing the project we just removed, go back to the selector
          if (currentProject && currentProject.id === projectId) {
            setShowProjectSelector(true);
            navigate('/anime-studio', { replace: true });
          }
        } else {
          // For other errors, show the error message
          toast.error(`Failed to delete project: ${response.error}`, { id: toastId });
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(`Failed to delete project: ${error.message}`);
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
    navigate(`/anime-studio`, { replace: true });
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
  
  // Add a new function to delete a clip by ID
  const deleteClip = (clipId) => {
    if (!clipId) {
      console.error("Cannot delete clip: No clip ID provided");
      return;
    }

    console.log(`Deleting clip with ID: ${clipId}`);
    
    // Update the scenes state
    setScenes(prevScenes => {
      // Create a deep copy of the scenes array
      const newScenes = [...prevScenes];
      
      // Get the current scene
      const scene = { ...newScenes[currentScene] };
      
      // Filter out the clip with the given ID
      scene.clips = scene.clips.filter(clip => clip.id !== clipId);
      
      // Update the scene in the new scenes array
      newScenes[currentScene] = scene;
      
      return newScenes;
    });
    
    // If the deleted clip was selected, clear the selection
    if (selectedClip && selectedClip.id === clipId) {
      setSelectedClip(null);
    }
    
    toast.success("Clip deleted successfully");
  };
  
  // Enhance the handleClipClick function
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
  
  // Function to update a clip (whether in timeline or draft)
  const updateClip = (updatedClip) => {
    console.log("Updating clip:", updatedClip);
    
    // Check if this is a draft clip being added to the timeline
    const isAddingToTimeline = !updatedClip.draft && !updatedClip.finalized;
    
    // If adding to timeline, finalize the clip to ensure it gets saved
    if (isAddingToTimeline) {
      updatedClip = finalizeClipForTimeline(updatedClip);
      console.log("Finalizing clip for timeline:", updatedClip);
    }
    
    // Update the scene state with the new/updated clip
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      const currentSceneObj = {...newScenes[currentScene]};
      
      // Ensure clips array exists
      if (!currentSceneObj.clips) {
        currentSceneObj.clips = [];
      }
      
      // If the clip is already in the timeline, update it
      const clipIndex = currentSceneObj.clips.findIndex(clip => clip.id === updatedClip.id);
      
      if (clipIndex !== -1) {
        // Update existing clip
        console.log(`Updating existing clip at index ${clipIndex}:`, updatedClip);
        currentSceneObj.clips[clipIndex] = updatedClip;
      } else if (!updatedClip.draft) {
        // Find where to position this clip in the timeline
        let startTime = 0;
        
        // Only find the end time of the last clip if there are existing clips
        if (currentSceneObj.clips && currentSceneObj.clips.length > 0) {
          // Find the end time of the last clip OF THE SAME TYPE
          const clipsOfSameType = currentSceneObj.clips.filter(clip => 
            clip.type === updatedClip.type
          );
          
          if (clipsOfSameType.length > 0) {
            // Find the maximum end time among clips of the same type
            clipsOfSameType.forEach(clip => {
              if (clip.endTime > startTime) {
                startTime = clip.endTime;
              }
            });
            console.log(`Found ${clipsOfSameType.length} existing clips of type ${updatedClip.type}, positioning after endTime=${startTime}`);
          } else {
            console.log(`No existing clips of type ${updatedClip.type}, positioning at startTime=0`);
          }
        }
        
        // For static images, check if we need to position at a specific time
        const isStaticImage = updatedClip.type === 'static' || updatedClip.type === 'static_image';
        
        if (isStaticImage) {
          console.log(`Positioning static image clip at startTime=${startTime}`);
        } else {
          console.log(`Positioning ${updatedClip.type} clip at startTime=${startTime}`);
        }
        
        // Position this clip at the end of the timeline if it doesn't have startTime/endTime
        if (updatedClip.startTime === undefined || updatedClip.endTime === undefined) {
          const finalClip = {
            ...updatedClip,
            startTime: startTime,
            endTime: startTime + (updatedClip.duration || 3), // Use specified duration or default
            finalized: true // Ensure it's marked as finalized to be included in saves
          };
          
          // For static images, log the final positioning
          if (isStaticImage) {
            console.log("Final static image position:", {
              id: finalClip.id,
              startTime: finalClip.startTime,
              endTime: finalClip.endTime,
              duration: finalClip.endTime - finalClip.startTime
            });
          }
          
          // Add the clip to the scene
          currentSceneObj.clips.push(finalClip);
        } else {
          // The clip already has positioning - just add it to the timeline
          currentSceneObj.clips.push({
            ...updatedClip,
            finalized: true // Ensure it's marked as finalized to be included in saves
          });
        }
      }
      
      newScenes[currentScene] = currentSceneObj;
      return newScenes;
    });
    
    // Close the editors after adding to timeline
    if (!updatedClip.draft) {
      setShowClipEditor(false);
      setShowNarrationEditor(false);
    } else {
      // Just update the selected clip without adding to timeline
      setSelectedClip(updatedClip);
    }
  };
  
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
    
    // Ensure characters are loaded before opening clip editor
    if (allCharacters.length === 0) {
      console.log("No characters loaded, loading characters first");
      loadCharacters();
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
      style: 'anime',
      draft: true, // Mark as draft so it doesn't get added to timeline until explicitly requested
      finalized: false // Explicitly mark as not finalized
    };
    
    // Add type-specific properties
    if (clipType === 'narration') {
      // For narration clips, set specific properties
      newClip.narrationText = ''; // Text of the narration
      newClip.narrationVoice = 'alloy'; // Voice for text-to-speech
      newClip.narrationSpeed = 1; // Default speed
      newClip.narrationUrl = null; // URL to generated audio
      newClip.hasNarration = false; // Flag to indicate if narration has been generated
    }
    
    // Set the clip as selected without adding to timeline yet
    setSelectedClip(newClip);
    
    // Handle different clip types for editor display
    if (clipType === 'video') {
      console.log("Opening clip editor for new video clip");
      setShowClipEditor(true);
      setShowNarrationEditor(false);
    } 
    else if (clipType === 'narration') {
      console.log("Opening narration editor for new narration clip");
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
              onClick={() => {
                if (!isCreatingProject) {
                  createNewProject('New Project', 'Anonymous');
                }
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
              disabled={isCreatingProject}
            >
              {isCreatingProject ? 'Creating...' : 'Create New'}
            </button>
        </div>
        
          {projectList.length === 0 ? (
            <div className="text-center py-8 bg-gray-700 rounded-lg">
              <p className="text-gray-400 mb-4">You don't have any projects yet</p>
              <button
                onClick={() => {
                  if (!isCreatingProject) {
                    createNewProject('New Project', 'Anonymous');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300"
                disabled={isCreatingProject}
              >
                {isCreatingProject ? 'Creating...' : 'Create Your First Project'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectList.map((project) => (
                <div
                  key={project.id || `temp-${Date.now()}-${Math.random()}`}
                  className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer relative group"
                >
                  <div 
                    className="h-48 bg-gray-900 relative" 
                    onClick={() => project && project.id && loadProject(project.id)}
                  >
                    {/* Project thumbnail - use first scene image if available */}
                    {project.scenes && project.scenes[0] && project.scenes[0].clips && 
                     project.scenes[0].clips.length > 0 && project.scenes[0].clips[0].image ? (
                      <img
                        src={project.scenes[0].clips[0].image}
                        alt={project.title || "Project Thumbnail"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMjgwIiB2aWV3Qm94PSIwIDAgNTAwIDI4MCI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSIyODAiIGZpbGw9IiMxZTI5M2IiLz48dGV4dCB4PSIyNTAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjM2IiBmaWxsPSIjZDFkNWRiIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+TmV3IEFuaW1hdGlvbjwvdGV4dD48L3N2Zz4=";
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => project && project.id && deleteProject(project, e)}
                      className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4" onClick={() => project && project.id && loadProject(project)}>
                    <h3 className="text-white font-medium truncate">
                      {project.title || "Untitled Project"}
                    </h3>
                    <p className="text-gray-400 text-sm truncate mt-1">
                      {project.author ? `By ${project.author}` : "Anonymous"}
                    </p>
                    {project.description && (
                      <p className="text-gray-500 text-xs mt-2 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-500">
                        {project.lastModified ? new Date(project.lastModified).toLocaleDateString() : "Edited"}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-700 rounded-md text-gray-300">
                        {project.scenes ? `${project.scenes.length} scene${project.scenes.length !== 1 ? 's' : ''}` : "0 scenes"}
                      </span>
                    </div>
                  </div>
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
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectAuthor, setNewProjectAuthor] = useState('');

  // Update the handleAddSound function to finalize sound clips
  const handleAddSound = (soundData) => {
    console.log("Adding sound to timeline:", soundData);
    
    // Ensure we have a unique ID
    const soundId = soundData.id || `sound-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Enforce 2-minute (120 second) limit for sound clips
    const MAX_DURATION = 120; // 2 minutes in seconds
    const clippedDuration = Math.min(soundData.duration || 30, MAX_DURATION);
    
    if (soundData.duration > MAX_DURATION) {
      console.log(`Sound clip duration (${soundData.duration}s) exceeds 2-minute limit. Truncating to ${MAX_DURATION}s.`);
      toast.success(`Sound clip truncated to 2-minute maximum`, {
        duration: 3000,
        position: "bottom-center"
      });
    }
    
    // Create a properly formed sound clip with all required properties
    const soundClip = {
      id: soundId,
      type: 'sound',
      title: soundData.title || 'Sound Clip',
      soundUrl: soundData.soundUrl || soundData.url || '', // Ensure we have the soundUrl
      url: soundData.url || soundData.soundUrl || '',      // Backup field for compatibility
      startTime: 0,                // Will be positioned later in the timeline
      endTime: clippedDuration,    // Initial end time
      duration: clippedDuration,   // Store the duration explicitly
      source: soundData.source || 'custom',
      artist: soundData.artist || '',
      finalized: true              // Mark as finalized for immediate use
    };
    
    console.log("Finalized sound clip for timeline:", soundClip);
    
    // Close the sound selector modal BEFORE updating state
    setShowSoundSelector(false);
    
    // Add the sound clip to the timeline using the scene update logic
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      const currentSceneObj = {...newScenes[currentScene]};
      
      // Ensure clips array exists
      if (!currentSceneObj.clips) {
        currentSceneObj.clips = [];
      }
      
      // Check if this exact clip already exists to prevent duplication
      const clipExists = currentSceneObj.clips.some(clip => 
        clip.id === soundClip.id || 
        (clip.soundUrl === soundClip.soundUrl && clip.title === soundClip.title)
      );
      
      if (clipExists) {
        console.warn("Duplicate clip detected - not adding again");
        return prevScenes; // Return unchanged scenes
      }
      
      // Find where to position this clip in the timeline
      let startTime = 0;
      
      // Only find the end time of the last clip if there are existing clips
      if (currentSceneObj.clips && currentSceneObj.clips.length > 0) {
        // Find the end time of the last clip OF THE SAME TYPE
        const clipsOfSameType = currentSceneObj.clips.filter(clip => 
          clip.type === soundClip.type
        );
        
        if (clipsOfSameType.length > 0) {
          // Find the maximum end time among clips of the same type
          clipsOfSameType.forEach(clip => {
            if (clip.endTime > startTime) {
              startTime = clip.endTime;
            }
          });
          console.log(`Found ${clipsOfSameType.length} existing clips of type ${soundClip.type}, positioning after endTime=${startTime}`);
        } else {
          console.log(`No existing clips of type ${soundClip.type}, positioning at startTime=0`);
        }
      }
      
      console.log(`Positioning sound clip "${soundClip.title}" at startTime=${startTime}`);
      
      // Position this clip at the end of the timeline
      soundClip.startTime = startTime;
      soundClip.endTime = startTime + clippedDuration;
      
      // Add the finalized clip to the scene
      currentSceneObj.clips.push(soundClip);
      
      newScenes[currentScene] = currentSceneObj;
      
      console.log(`Added sound clip "${soundClip.title}" to scene ${currentSceneObj.id}:`, soundClip);
      
      return newScenes;
    });
    
    toast.success(`Added "${soundClip.title}" to timeline`);
  };
  
  // Project details modal component
  const ProjectDetailsModal = () => {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-white" id="modal-title">
                    Create New Project
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="project-title" className="block text-sm font-medium text-gray-400">
                        Project Title
                      </label>
                      <input
                        type="text"
                        name="project-title"
                        id="project-title"
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full bg-gray-700 border-gray-600 rounded-md text-white"
                        placeholder="My Awesome Animation"
                      />
                    </div>
                    <div>
                      <label htmlFor="project-author" className="block text-sm font-medium text-gray-400">
                        Author
                      </label>
                      <input
                        type="text"
                        name="project-author"
                        id="project-author"
                        value={newProjectAuthor}
                        onChange={(e) => setNewProjectAuthor(e.target.value)}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full bg-gray-700 border-gray-600 rounded-md text-white"
                        placeholder="Your Name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => {
                  // Call createNewProject with the new title and author
                  createNewProject(newProjectTitle, newProjectAuthor);
                  setShowNewProjectModal(false);
                }}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Create Project
              </button>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Load characters when component mounts, regardless of showProjectSelector state
  useEffect(() => {
    loadCharacters();
  }, []);
  
  // Simple URL-based navigation effect for direct access (not for project creation)
  // This will only handle existing projects, not "new" projects
  useEffect(() => {
    // Skip if we're showing the editor already or creating a project
    if (!showProjectSelector || isCreatingProject) {
      return;
    }
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const view = urlParams.get('view');
    const projectId = urlParams.get('projectId');
    
    // Only handle loading existing projects from URL
    if (view === 'editor' && projectId && projectId !== 'new') {
      console.log(`URL indicates existing project: ${projectId}`);
      
      // Find the project in the list
      const projectToLoad = projectList.find(p => p.id === projectId);
      if (projectToLoad) {
        console.log(`Found project in list, loading: ${projectId}`);
        loadProject(projectToLoad);
      } else {
        console.log(`Project ${projectId} not found in list`);
        toast.error("Project not found");
      }
    }
  }, [location.search, projectList, showProjectSelector, isCreatingProject]);
  
  // Add publish functionality with timestamp tracking
  const publishAnime = async () => {
    try {
      setLoading(true);
      
      // Ensure project is saved first
      if (!currentProject?.id) {
        const projectId = await saveProject();
        if (!projectId) {
          throw new Error("Failed to save project before publishing");
        }
      }
      
      // Create publish timestamp
      const publishTime = new Date();
      const publishTimeISO = publishTime.toISOString();
      
      // Mark the project as published in Firestore
      const updateResult = await firestoreService.updateProject(
        currentProject.id, 
        {
          published: true,
          publishedAt: publishTimeISO,
          lastPublished: publishTimeISO
        }
      );
      
      if (updateResult.success) {
        // Update local state
        setCurrentProject({
          ...currentProject,
          published: true,
          publishedAt: publishTimeISO,
          lastPublished: publishTimeISO
        });
        
        toast.success(`Anime "${storyTitle}" published successfully!`);
        
        // Navigate to my stories page
        navigate('/my-stories');
      } else {
        throw new Error(updateResult.error || "Failed to publish anime");
      }
    } catch (error) {
      console.error("Error publishing anime:", error);
      toast.error(`Failed to publish anime: ${error.message}`);
    } finally {
      setLoading(false);
    }
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
            onDeleteClip={deleteClip}
            onSaveProject={saveProject}
            currentProject={currentProject} // Add currentProject for save/publish status
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
        
          {/* Publish Modal */}
          {showPublishModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
              <div className="bg-gray-800 rounded-lg w-full max-w-lg overflow-hidden shadow-xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white text-xl font-bold">Publish Animation</h3>
                    <button 
                      onClick={() => setShowPublishModal(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-gray-300 mb-4">
                    Publishing your anime will make it visible to others on the home page. Are you sure you're ready to publish?
                  </p>
                  
                  <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="mb-2">
                      <span className="text-gray-400 text-sm">Title:</span>
                      <span className="text-white ml-2">{storyTitle || "Untitled Anime"}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-gray-400 text-sm">Author:</span>
                      <span className="text-white ml-2">{author || "Anonymous"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Total Duration:</span>
                      <span className="text-white ml-2">{scenes.reduce((total, scene) => {
                        const sceneClips = scene.clips || [];
                        const sceneDuration = sceneClips.length > 0
                          ? Math.max(...sceneClips.map(clip => clip.endTime))
                          : 0;
                        return total + sceneDuration;
                      }, 0).toFixed(1)} seconds</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPublishModal(false)}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={publishAnime}
                      className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? (
                        <><span className="animate-spin mr-2">⟳</span> Publishing...</>
                      ) : (
                        <>Publish Anime</>
                      )}
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
        
          {showNewProjectModal && (
            <ProjectDetailsModal />
          )}
        </>
      )}
    </div>
  );
};

export default AnimeCreatorPage; 
