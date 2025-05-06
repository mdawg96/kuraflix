import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import fallbackImage from '../assets/images/placeholders/image.png';
import mangaPlaceholderImage from '../assets/images/placeholders/manga.png';
import animePlaceholderImage from '../assets/images/placeholders/anime.png';
import { collection, query, where, orderBy, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const HomePage = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mangaProjects, setMangaProjects] = useState([]);
  const [animeProjects, setAnimeProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedManga, setSelectedManga] = useState(null);
  const [showMangaModal, setShowMangaModal] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [showAnimeModal, setShowAnimeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // For compatibility with existing code
  const isLoggedIn = isAuthenticated;

  // Fetch published manga projects
  useEffect(() => {
    const fetchPublishedProjects = async () => {
      try {
        setLoading(true);
        
        // Fetch published manga projects
        const mangaQuery = query(
          collection(db, 'mangaProjects'),
          where('published', '==', true),
          orderBy('publishedAt', 'desc'),
          limit(50) // Increased limit to show more projects
        );
        
        const mangaSnapshot = await getDocs(mangaQuery);
        
        // Map the manga projects to the required format
        const mangaData = mangaSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Manga',
            image: data.thumbnail || mangaPlaceholderImage,
            genre: data.genre || 'Unknown',
            author: data.author || 'Anonymous',
            description: data.description || '',
            pageCount: data.pageCount || 0
          };
        });
        
        setMangaProjects(mangaData);
        
        // Try to fetch anime projects if they exist in a similar collection
        try {
          const animeQuery = query(
            collection(db, 'animeProjects'),
            where('published', '==', true),
            orderBy('publishedAt', 'desc'),
            limit(50) // Increased limit to show more projects
          );
          
          const animeSnapshot = await getDocs(animeQuery);
          
          const animeData = animeSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || 'Untitled Anime',
              image: data.thumbnail || animePlaceholderImage,
              episodes: data.clipCount || 1,
              author: data.author || 'Anonymous',
              description: data.description || ''
            };
          });
          
          setAnimeProjects(animeData);
        } catch (error) {
          console.error("Error fetching anime projects:", error);
          // Use empty array for anime if fetching fails
          setAnimeProjects([]);
        }
      } catch (error) {
        console.error("Error fetching published projects:", error);
        // Use empty arrays if fetching fails
        setMangaProjects([]);
        setAnimeProjects([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublishedProjects();
  }, []);

  // Filter manga and anime based on search term
  const filteredManga = searchTerm.trim() === '' 
    ? mangaProjects 
    : mangaProjects.filter(manga => 
        manga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manga.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (manga.genre && manga.genre.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  const filteredAnime = searchTerm.trim() === '' 
    ? animeProjects 
    : animeProjects.filter(anime => 
        anime.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        anime.author.toLowerCase().includes(searchTerm.toLowerCase())
      );

  // We won't use placeholders anymore - only display actual published projects
  const displayedManga = filteredManga;
  const displayedAnime = filteredAnime;

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Load manga details when a manga is clicked
  const handleMangaClick = async (manga) => {
    try {
      setSelectedManga(manga);
      setShowMangaModal(true);
      
      // If this is a real manga with an ID from Firestore, fetch more details
      if (manga.id && !manga.id.toString().startsWith('placeholder-')) {
        const mangaDoc = await getDoc(doc(db, 'mangaProjects', manga.id));
        if (mangaDoc.exists()) {
          const data = mangaDoc.data();
          setSelectedManga(prevManga => ({
            ...prevManga,
            description: data.description || prevManga.description || 'No description available',
            pageCount: data.pageCount || prevManga.pageCount || 0,
            publishedAt: data.publishedAt ? new Date(data.publishedAt.toDate()).toLocaleDateString() : 'Unknown date'
          }));
        }
      }
    } catch (error) {
      console.error('Error loading manga details:', error);
    }
  };
  
  // Load anime details when an anime is clicked
  const handleAnimeClick = async (anime) => {
    try {
      setSelectedAnime(anime);
      setShowAnimeModal(true);
      
      // If this is a real anime with an ID from Firestore, fetch more details
      if (anime.id && !anime.id.toString().startsWith('placeholder-')) {
        const animeDoc = await getDoc(doc(db, 'animeProjects', anime.id));
        if (animeDoc.exists()) {
          const data = animeDoc.data();
          setSelectedAnime(prevAnime => ({
            ...prevAnime,
            description: data.description || prevAnime.description || 'No description available',
            episodes: data.clipCount || prevAnime.episodes || 1,
            publishedAt: data.publishedAt ? new Date(data.publishedAt.toDate()).toLocaleDateString() : 'Unknown date'
          }));
        }
      }
    } catch (error) {
      console.error('Error loading anime details:', error);
    }
  };

  // Manga Details Modal Component
  const MangaDetailsModal = ({ manga, onClose }) => {
    if (!manga) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <div className="relative">
            <img 
              src={manga.image} 
              alt={manga.title}
              className="w-full h-48 sm:h-64 object-cover rounded-t-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = mangaPlaceholderImage;
              }}
            />
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
            <h2 className="text-xl font-bold text-white mb-1">{manga.title}</h2>
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <span className="mr-4">{manga.genre}</span>
              <span>{manga.pageCount} pages</span>
              {manga.publishedAt && <span className="ml-4">Published: {manga.publishedAt}</span>}
            </div>
            
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">Author</h3>
              <p className="text-gray-300">{manga.author}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">Description</h3>
              <p className="text-gray-300">{manga.description || 'No description available.'}</p>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Anime Details Modal Component
  const AnimeDetailsModal = ({ anime, onClose }) => {
    if (!anime) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
          <div className="relative">
            <img 
              src={anime.image} 
              alt={anime.title}
              className="w-full h-48 sm:h-64 object-cover rounded-t-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = animePlaceholderImage;
              }}
            />
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4">
            <h2 className="text-xl font-bold text-white mb-1">{anime.title}</h2>
            <div className="flex items-center text-sm text-gray-400 mb-4">
              <span>{anime.episodes} episodes</span>
              {anime.publishedAt && <span className="ml-4">Published: {anime.publishedAt}</span>}
            </div>
            
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">Creator</h3>
              <p className="text-gray-300">{anime.author}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">Description</h3>
              <p className="text-gray-300">{anime.description || 'No description available.'}</p>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black text-white">
      {/* Simplified Hero Section with Search */}
      <div className="relative overflow-hidden py-6 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className="text-2xl leading-8 font-extrabold tracking-tight text-white sm:text-3xl">
              Explore Published Manga & Anime
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-lg mx-auto">
            <div className="relative">
              <input
                type="text"
                className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-anime-indigo"
                placeholder="Search titles, authors, or genres..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <svg 
                className="absolute top-3 left-3 w-5 h-5 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute top-3 right-3 text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manga Section with Horizontal Scroll - Full Width */}
      <div className="py-6 bg-gray-900">
        <div className="w-full px-4 sm:px-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">Latest Manga</h2>
            {loading && <div className="mt-2 text-sm text-gray-400">Loading published manga...</div>}
            {!loading && searchTerm && <div className="mt-2 text-sm text-gray-400">
              {filteredManga.length} {filteredManga.length === 1 ? 'result' : 'results'} found for "{searchTerm}"
            </div>}
          </div>
          
          <div className="relative w-full">
            {!loading && displayedManga.length === 0 ? (
              <div className="text-center py-10 bg-gray-800 rounded-lg">
                <p className="text-gray-400">
                  {searchTerm ? `No manga found matching "${searchTerm}"` : 'No published manga available yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4 hide-scrollbar">
                <div className="flex space-x-6 w-max px-8">
                  {displayedManga.map((manga) => (
                    <div 
                      key={manga.id} 
                      className="bg-gray-800 rounded-lg overflow-hidden flex-none w-40 md:w-56 transition-transform hover:scale-105 cursor-pointer"
                      onClick={() => handleMangaClick(manga)}
                    >
                      <div className="h-48 md:h-72 bg-gray-700">
                        <img 
                          src={manga.image} 
                          alt={manga.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            console.error('Failed to load manga image:', manga.image);
                            e.target.onerror = null;
                            e.target.src = mangaPlaceholderImage;
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-white text-sm">{manga.title}</h3>
                        <p className="text-gray-400 text-xs">{manga.genre}</p>
                        {manga.author && <p className="text-gray-500 text-xs mt-1">by {manga.author}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* Anime Section with Horizontal Scroll - Full Width */}
      <div className="py-6 bg-gray-900">
        <div className="w-full px-4 sm:px-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">Latest Anime</h2>
            {loading && <div className="mt-2 text-sm text-gray-400">Loading published anime...</div>}
            {!loading && searchTerm && <div className="mt-2 text-sm text-gray-400">
              {filteredAnime.length} {filteredAnime.length === 1 ? 'result' : 'results'} found for "{searchTerm}"
            </div>}
          </div>
          
          <div className="relative w-full">
            {!loading && displayedAnime.length === 0 ? (
              <div className="text-center py-10 bg-gray-800 rounded-lg">
                <p className="text-gray-400">
                  {searchTerm ? `No anime found matching "${searchTerm}"` : 'No published anime available yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-4 hide-scrollbar">
                <div className="flex space-x-6 w-max px-8">
                  {displayedAnime.map((anime) => (
                    <div 
                      key={anime.id} 
                      className="bg-gray-800 rounded-lg overflow-hidden flex-none w-40 md:w-56 transition-transform hover:scale-105 cursor-pointer"
                      onClick={() => handleAnimeClick(anime)}
                    >
                      <div className="h-48 md:h-72 bg-gray-700">
                        <img 
                          src={anime.image} 
                          alt={anime.title} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = animePlaceholderImage;
                          }}
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-white text-sm">{anime.title}</h3>
                        <p className="text-gray-400 text-xs">{anime.episodes} Episode{anime.episodes !== 1 ? 's' : ''}</p>
                        {anime.author && <p className="text-gray-500 text-xs mt-1">by {anime.author}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>
      
      {/* Manga Details Modal */}
      {showMangaModal && (
        <MangaDetailsModal 
          manga={selectedManga} 
          onClose={() => setShowMangaModal(false)} 
        />
      )}
      
      {/* Anime Details Modal */}
      {showAnimeModal && (
        <AnimeDetailsModal 
          anime={selectedAnime} 
          onClose={() => setShowAnimeModal(false)} 
        />
      )}
      
      <style jsx="true">{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HomePage; 