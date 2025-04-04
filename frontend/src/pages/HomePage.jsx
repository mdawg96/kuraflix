import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import fallbackImage from '../assets/images/placeholders/image.png';

const HomePage = () => {
  const { isLoggedIn, currentUser } = useContext(AuthContext);

  // Placeholder data for manga tiles - Added more for scrolling
  const mangaPlaceholders = [
    { id: 1, title: 'Battle Adventure', image: fallbackImage, genre: 'Action' },
    { id: 2, title: 'Love Chronicles', image: fallbackImage, genre: 'Romance' },
    { id: 3, title: 'Mystic Powers', image: fallbackImage, genre: 'Fantasy' },
    { id: 4, title: 'Urban Tales', image: fallbackImage, genre: 'Slice of Life' },
    { id: 5, title: 'Space Odyssey', image: fallbackImage, genre: 'Sci-Fi' },
    { id: 6, title: 'Monster Hunters', image: fallbackImage, genre: 'Adventure' },
    { id: 7, title: 'Spirit Walker', image: fallbackImage, genre: 'Supernatural' },
    { id: 8, title: 'Night Warriors', image: fallbackImage, genre: 'Action' },
    { id: 9, title: 'High School Days', image: fallbackImage, genre: 'Comedy' },
    { id: 10, title: 'Cyber Future', image: fallbackImage, genre: 'Sci-Fi' }
  ];

  // Placeholder data for anime tiles - Added more for scrolling
  const animePlaceholders = [
    { id: 1, title: 'Ninja Legacy', image: fallbackImage, episodes: 12 },
    { id: 2, title: 'Magical Academy', image: fallbackImage, episodes: 24 },
    { id: 3, title: 'Robot Wars', image: fallbackImage, episodes: 36 },
    { id: 4, title: 'Samurai Chronicles', image: fallbackImage, episodes: 24 },
    { id: 5, title: 'Space Explorers', image: fallbackImage, episodes: 12 },
    { id: 6, title: 'Dragon Knights', image: fallbackImage, episodes: 24 },
    { id: 7, title: 'Spirit World', image: fallbackImage, episodes: 26 },
    { id: 8, title: 'Hero Academy', image: fallbackImage, episodes: 12 },
    { id: 9, title: 'Demon Hunters', image: fallbackImage, episodes: 24 },
    { id: 10, title: 'Time Travelers', image: fallbackImage, episodes: 13 }
  ];

  return (
    <div className="bg-black text-white">
      {/* Simplified Hero Section */}
      <div className="relative overflow-hidden py-6 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-2xl leading-8 font-extrabold tracking-tight text-white sm:text-3xl">
              Bring your anime and manga stories to life
            </p>
          </div>

          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Anime Creation Option - Made Smaller */}
              <div className="relative bg-gray-800 overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gradient-to-r from-blue-900 to-black flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
                <div className="px-4 py-3">
                  <h3 className="text-lg font-bold text-white mb-1">Create Anime</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Design animated stories with AI-generated scenes and characters.
                  </p>
                  <div className="mt-2">
                    <Link
                      to="/anime-creator"
                      className="inline-flex items-center px-3 py-1 border border-blue-500 text-sm font-medium rounded-md text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-200"
                    >
                      Get Started
                      <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="absolute top-0 right-0 mt-2 mr-2">
                  <span className="bg-blue-500 text-xs text-white px-2 py-1 rounded-full">Coming Soon</span>
                </div>
              </div>

              {/* Manga Creation Option - Made Smaller */}
              <div className="relative bg-gray-800 overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
                <div className="h-48 bg-gradient-to-r from-blue-800 to-blue-950 flex items-center justify-center">
                  <span className="text-4xl">📚</span>
                </div>
                <div className="px-4 py-3">
                  <h3 className="text-lg font-bold text-white mb-1">Create Manga</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Craft visual stories with AI-generated panels and characters.
                  </p>
                  <div className="mt-2">
                    <Link
                      to="/manga-creator"
                      className="inline-flex items-center px-3 py-1 border border-blue-500 text-sm font-medium rounded-md text-blue-500 hover:bg-blue-500 hover:text-white transition-all duration-200"
                    >
                      Get Started
                      <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="absolute top-0 right-0 mt-2 mr-2">
                  <span className="bg-blue-500 text-xs text-white px-2 py-1 rounded-full">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manga Section with Horizontal Scroll - Full Width */}
      <div className="py-6 bg-gray-900">
        <div className="w-full px-4 sm:px-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">Latest Manga</h2>
          </div>
          
          <div className="relative w-full">
            <div className="overflow-x-auto pb-4 hide-scrollbar">
              <div className="flex space-x-6 w-max px-8">
                {mangaPlaceholders.map((manga) => (
                  <div key={manga.id} className="bg-gray-800 rounded-lg overflow-hidden flex-none w-40 md:w-56 transition-transform hover:scale-105">
                    <div className="h-48 md:h-72 bg-gray-700">
                      <img src={manga.image} alt={manga.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-white text-sm">{manga.title}</h3>
                      <p className="text-gray-400 text-xs">{manga.genre}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          </div>
          
          <div className="relative w-full">
            <div className="overflow-x-auto pb-4 hide-scrollbar">
              <div className="flex space-x-6 w-max px-8">
                {animePlaceholders.map((anime) => (
                  <div key={anime.id} className="bg-gray-800 rounded-lg overflow-hidden flex-none w-40 md:w-56 transition-transform hover:scale-105">
                    <div className="h-48 md:h-72 bg-gray-700">
                      <img src={anime.image} alt={anime.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-white text-sm">{anime.title}</h3>
                      <p className="text-gray-400 text-xs">{anime.episodes} Episodes</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
            <div className="absolute top-0 bottom-0 right-0 bg-gradient-to-l from-gray-900 to-transparent w-12 z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>
      
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