import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
// Import placeholder images
import mangaPlaceholderImage from '../assets/images/placeholders/manga.png';
import animePlaceholderImage from '../assets/images/placeholders/anime.png';
import MangaViewer from '../components/MangaViewer';

const MyStoriesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [mangaStories, setMangaStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingManga, setViewingManga] = useState(null);
  
  // Fetch published videos with enhanced logging
  useEffect(() => {
    const fetchPublishedVideos = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      console.log("Fetching published videos for user:", currentUser.uid);
      
      try {
        // Query published videos
        const exportsRef = collection(db, 'publishedVideos');
        const exportsQuery = query(
          exportsRef,
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        
        console.log("Executing query on publishedVideos collection...");
        const exportsSnapshot = await getDocs(exportsQuery);
        console.log(`Found ${exportsSnapshot.docs.length} published videos`);

        // Map the data with better handling of potential missing fields
        const exportedVideos = exportsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Video data:", { id: doc.id, ...data });
          
          return {
            id: doc.id,
            ...data,
            title: data.title || "Untitled Video",
            description: data.description || "",
            thumbnailUrl: data.thumbnailUrl || null,
            videoUrl: data.videoUrl || null,
            createdAt: data.createdAt || new Date(),
            duration: data.duration || 0,
            source: 'publishedVideos' // Mark the source collection
          };
        });
  
        // Also try to fetch from animeProjects collection - using a simpler query
        try {
          console.log("Also checking animeProjects collection for published videos...");
          const animeProjectsRef = collection(db, 'animeProjects');
          
          // Use a simpler query that doesn't require a composite index
          const simpleQuery = query(
            animeProjectsRef,
            where("userId", "==", currentUser.uid)
          );
          
          const projectsSnapshot = await getDocs(simpleQuery);
          console.log(`Found ${projectsSnapshot.docs.length} total projects, filtering for published ones...`);
          
          // More flexible filtering to handle various "true" formats
          const publishedProjects = projectsSnapshot.docs
            .map(doc => {
              const data = doc.data();
              console.log(`Project ${doc.id} isPublished:`, data.isPublished, typeof data.isPublished);
              return {
                id: doc.id,
                ...data
              };
            })
            .filter(project => {
              // Check for any representation of "true" (boolean true, string "true", or 1)
              const isPublished = 
                project.isPublished === true || 
                project.isPublished === "true" || 
                project.isPublished === 1;
              
              // Also consider it published if it has a publishedAt timestamp or videoUrl
              const hasPublishedAttributes = 
                project.publishedAt || 
                project.videoUrl;
                
              const shouldInclude = isPublished || hasPublishedAttributes;
              console.log(`Project ${project.id} publish status check: ${shouldInclude} (isPublished=${project.isPublished}, hasAttributes=${!!hasPublishedAttributes})`);
              return shouldInclude;
            })
            // Sort manually since we can't use orderBy in the query
            .sort((a, b) => {
              const dateA = a.updatedAt?.toDate?.() || new Date(a.updatedAt || a.publishedAt || 0);
              const dateB = b.updatedAt?.toDate?.() || new Date(b.updatedAt || b.publishedAt || 0);
              return dateB - dateA; // descending order
            })
            .map(data => {
              return {
                id: data.id,
                ...data,
                title: data.title || "Untitled Project",
                description: data.description || "",
                thumbnailUrl: data.thumbnailUrl || null,
                videoUrl: data.videoUrl || null,
                createdAt: data.publishedAt || data.createdAt || data.updatedAt || new Date(),
                duration: data.duration || 0,
                source: 'animeProject' // Mark the source collection
              };
            });
          
          console.log(`Found ${publishedProjects.length} published projects after filtering`);
          
          // Combine both sources
          const allPublished = [...exportedVideos, ...publishedProjects];
          console.log("Combined published videos:", allPublished.length);
          setStories(allPublished);
        } catch (projectError) {
          console.error("Error fetching published projects:", projectError);
          // Still set the exported videos we found
          setStories(exportedVideos);
        }
      } catch (err) {
        console.error("Error fetching published videos:", err);
        console.error("Error details:", err.code, err.message);
        setError("Failed to load your published videos. Please try again later.");
        toast.error("Failed to load published videos");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublishedVideos();
  }, [currentUser]);

  // Update useEffect to fetch manga projects too
  useEffect(() => {
    const fetchPublishedContent = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      console.log("Fetching published content for user:", currentUser.uid);
      
      try {
        // ... existing code for fetching publishedVideos and animeProjects ...
        
        // Fetch manga projects
        try {
          console.log("Fetching manga projects...");
          const mangaProjectsRef = collection(db, 'mangaProjects');
          
          const mangaQuery = query(
            mangaProjectsRef,
            where("userId", "==", currentUser.uid)
          );
          
          const mangaSnapshot = await getDocs(mangaQuery);
          console.log(`Found ${mangaSnapshot.docs.length} manga projects`);
          
          // Map manga projects - all manga projects are considered "published" for now
          const publishedManga = mangaSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                title: data.title || "Untitled Manga",
                description: data.description || "",
                pages: Array.isArray(data.pages) ? data.pages : 
                       (typeof data.pages === 'string' ? JSON.parse(data.pages) : []),
                author: data.author || "Anonymous",
                genre: data.genre || "",
                thumbnail: data.thumbnail || null,
                contentType: 'manga'
              };
            })
            .sort((a, b) => {
              const dateA = a.lastEdited?.toDate?.() || new Date(a.lastEdited || 0);
              const dateB = b.lastEdited?.toDate?.() || new Date(b.lastEdited || 0);
              return dateB - dateA; // descending order
            });
          
          console.log(`Processed ${publishedManga.length} manga projects`);
          setMangaStories(publishedManga);
        } catch (mangaError) {
          console.error("Error fetching manga projects:", mangaError);
        }
      } catch (err) {
        console.error("Error fetching published content:", err);
        setError("Failed to load your published content. Please try again later.");
        toast.error("Failed to load published content");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublishedContent();
  }, [currentUser]);

  // Function to handle image load errors
  const handleImageError = (e, contentType) => {
    console.warn('Image failed to load, using fallback image instead.');
    // Use the appropriate placeholder based on content type
    if (contentType === 'manga') {
      e.target.src = mangaPlaceholderImage;
    } else {
      e.target.src = animePlaceholderImage;
    }
    e.target.onerror = null; // Prevent infinite loop
  };
  
  // Function to play a published video
  const playVideo = (story) => {
    if (story.videoUrl) {
      // Open the video in a new tab
      window.open(story.videoUrl, '_blank');
      console.log("Opening video URL:", story.videoUrl);
    } else {
      console.warn("No video URL found for this story:", story);
      toast.error("Video URL not found");
    }
  };
  
  // Function to delete a published video
  const deleteVideo = async (story) => {
    if (!window.confirm(`Are you sure you want to delete "${story.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log("Deleting video:", story.id);
      // Check which collection the video is in
      const collectionName = story.source === 'animeProject' ? 'animeProjects' : 'publishedVideos';
      await deleteDoc(doc(db, collectionName, story.id));
      
      // Update UI
      setStories(prevStories => prevStories.filter(s => s.id !== story.id));
      toast.success("Video deleted successfully");
    } catch (err) {
      console.error("Error deleting video:", err);
      toast.error("Failed to delete video");
    }
  };
  
  // Helper function to format dates
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch (err) {
      console.error("Error formatting date:", err);
      return 'Unknown date';
    }
  };
  
  // Helper function to format duration
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add function to view a manga
  const viewManga = (manga) => {
    console.log("Viewing manga:", manga);
    setViewingManga(manga);
  };

  // Add function to go back from manga view
  const exitMangaView = () => {
    setViewingManga(null);
  };

  // Add function to delete manga
  const deleteManga = async (manga) => {
    if (!window.confirm(`Are you sure you want to delete "${manga.title}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log("Deleting manga:", manga.id);
      await deleteDoc(doc(db, 'mangaProjects', manga.id));
      
      // Update UI
      setMangaStories(prevManga => prevManga.filter(m => m.id !== manga.id));
      toast.success("Manga deleted successfully");
    } catch (err) {
      console.error("Error deleting manga:", err);
      toast.error("Failed to delete manga");
    }
  };

  // If viewing manga, show the manga viewer
  if (viewingManga) {
    return (
      <>
        <button 
          onClick={exitMangaView}
          className="fixed top-4 left-4 z-50 bg-gray-800 p-2 rounded-full shadow-lg text-white"
          title="Back to My Stories"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <MangaViewer manga={viewingManga} onExit={exitMangaView} />
      </>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-700 rounded mb-8"></div>
          <div className="grid grid-cols-3 gap-6 w-full">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            My Published Videos
          </h1>
        </div>
        <div className="bg-red-900 bg-opacity-50 text-white p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          My Published Content
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          View your published anime videos and manga stories
        </p>
      </div>
      
      {/* Manga Stories Section */}
      {mangaStories.length > 0 && (
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Manga Stories</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mangaStories.map(manga => (
              <div key={manga.id} className="card overflow-hidden">
                <div 
                  className="w-full h-48 bg-gray-800 cursor-pointer flex items-center justify-center overflow-hidden"
                  onClick={() => viewManga(manga)}
                >
                  {manga.thumbnail ? (
                    <img 
                      src={manga.thumbnail} 
                      alt={manga.title} 
                      className="w-full h-full object-cover" 
                      onError={(e) => handleImageError(e, manga.contentType)}
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-gray-400 mt-2">{manga.title}</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-white">{manga.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{manga.description || 'No description'}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    By {manga.author} • {manga.genre ? `${manga.genre} • ` : ''}
                    {manga.pages?.length || 0} pages
                  </p>
                  
                  <div className="mt-4 flex justify-between">
                    <button 
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                      onClick={() => viewManga(manga)}
                    >
                      Read Manga
                    </button>
                    <button 
                      className="text-red-400 hover:text-red-300 text-sm"
                      onClick={() => deleteManga(manga)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Videos Section - existing code */}
      {stories.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Videos</h2>
          </div>
          
          {stories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map(story => (
                <div key={story.id} className="card overflow-hidden">
                <img 
                  src={story.thumbnailUrl || animePlaceholderImage} 
                  alt={story.title || 'Untitled'} 
                  className="w-full h-48 object-cover cursor-pointer" 
                  onError={(e) => handleImageError(e, story.source === 'animeProject' ? 'anime' : 'publishedVideos')}
                  onClick={() => playVideo(story)}
                />
                  <div className="p-4">
                    <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-white">{story.title || 'Untitled'}</h3>
                    {story.duration && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {formatDuration(story.duration)}
                      </span>
                    )}
                    </div>
                  <p className="text-sm text-gray-400 mt-1">{story.description || 'No description'}</p>
                    <p className="text-xs text-gray-500 mt-2">
                    <span>Published: {formatDate(story.createdAt)}</span>
                    </p>
                    
                    <div className="mt-4 flex justify-between">
                      <button 
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      onClick={() => playVideo(story)}
                      disabled={!story.videoUrl}
                      >
                      Play Video
                      </button>
                      <button 
                      className="text-red-400 hover:text-red-300 text-sm"
                      onClick={() => deleteVideo(story)}
                      >
                      Delete
                        </button>
                      </div>
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            <h3 className="mt-2 text-sm font-medium text-white">No published videos yet</h3>
            <p className="mt-1 text-sm text-gray-400">Create a video in the Anime Studio and publish it</p>
            <div className="mt-4">
              <pre className="bg-gray-700 p-4 rounded-lg text-xs text-left overflow-auto max-w-md mx-auto">
                Debug info: {JSON.stringify({uid: currentUser?.uid}, null, 2)}
              </pre>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Empty state if no content */}
      {stories.length === 0 && mangaStories.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-white">No published content yet</h3>
          <p className="mt-1 text-sm text-gray-400">Create content in the Anime Studio or Manga Studio and publish it</p>
        </div>
      )}
    </div>
  );
};

export default MyStoriesPage; 