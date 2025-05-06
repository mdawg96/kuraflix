import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { characterAPI } from '../services/api';
import { auth } from '../firebase/config';
import characterPlaceholderImage from '../assets/images/placeholders/manga.png';

const CharacterLibraryPage = () => {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Updated to remove redundant auth check and directly fetch characters
  useEffect(() => {
    console.log("CharacterLibraryPage: Fetching characters");
    if (auth.currentUser) {
      fetchCharacters(auth.currentUser.uid);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch characters function
  const fetchCharacters = async (userId) => {
    try {
      console.log('Fetching user characters...');
      setLoading(true);
      
      const response = await characterAPI.getUserCharacters();
      console.log('Character response:', response);
      
      if (response && response.success) {
        // Handle correct response format: {success: true, data: {success: true, characters: []}}
        if (response.data && response.data.success) {
          console.log('Setting characters:', response.data.characters);
          setCharacters(response.data.characters || []);
          setError(null);
        } else {
          console.error('Invalid response data structure:', response);
          setError('Invalid response format');
          setCharacters([]);
        }
      } else {
        const errorMessage = response?.data?.error || response?.error || 'Failed to fetch characters';
        console.error('Error fetching characters:', errorMessage);
        setError(errorMessage);
        setCharacters([]);
      }
    } catch (error) {
      console.error('Exception in fetchCharacters:', error);
      setError(error.message || 'An unexpected error occurred');
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteCharacter = async (id) => {
    try {
      if (window.confirm('Are you sure you want to delete this character?')) {
        setIsDeleting(true);
        const response = await characterAPI.deleteCharacter(id);
        console.log('Delete response:', response);
        
        if (response && response.success) {
          // Remove the deleted character from the state
          setCharacters(characters.filter(char => char.id !== id));
        } else {
          console.error('Failed to delete character:', response);
          setError('Failed to delete character: ' + (response?.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error deleting character:', error);
      setError('Error deleting character. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageError = (e) => {
    console.error('Image failed to load, using fallback', e.target.src);
    e.target.src = characterPlaceholderImage;
  };

  // Function to build correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return characterPlaceholderImage;
    
    // If already a full URL, use it directly
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a path starting with '/outputs/', prepend API URL
    if (imagePath.startsWith('/outputs/')) {
      return `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}${imagePath}`;
    }
    
    // Default fallback
    return imagePath;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-900 text-white p-4 rounded-md mb-6">
          <p className="font-medium">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded"
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
          {characters.length > 0 ? "My Characters" : "Character Creator"}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          {characters.length > 0 
            ? "Manage your characters or create new ones" 
            : "Create your first character to bring your stories to life"}
        </p>
      </div>

      {/* Create character button - only show when there are characters */}
      {characters.length > 0 && (
        <div className="flex justify-center mb-8">
          <Link
            to="/character-creator"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Character
          </Link>
        </div>
      )}

      {/* Characters grid or empty state */}
      {characters.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {characters.map((character) => (
            <div key={character.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:bg-gray-750">
              <div className="aspect-w-3 aspect-h-4 overflow-hidden">
                <img 
                  src={getImageUrl(character.imagePath)} 
                  alt={character.name} 
                  className="object-cover w-full h-full"
                  onError={handleImageError}
                />
              </div>
              
              <div className="p-4">
                <h3 className="text-xl font-medium text-white">{character.name}</h3>
                
                <div className="flex flex-wrap mt-2">
                  {character.role && (
                    <span className="px-2 py-1 text-xs bg-indigo-900 text-indigo-300 rounded-full mr-2 mb-2">
                      {character.role}
                    </span>
                  )}
                  {character.artStyle && (
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full mr-2 mb-2">
                      {character.artStyle}
                    </span>
                  )}
                </div>
                
                {character.description && (
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {character.description}
                  </p>
                )}
                
                {character.story && (
                  <p className="text-sm text-gray-400 mt-2">
                    Project: <span className="text-indigo-400">{character.story.name}</span> 
                    {character.story.type && <span> ({character.story.type})</span>}
                  </p>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => deleteCharacter(character.id)}
                    disabled={isDeleting}
                    className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state when no characters exist
        <div className="text-center py-12 px-4 bg-gray-800 rounded-lg">
          <svg 
            className="mx-auto h-24 w-24 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="1.5" 
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            ></path>
          </svg>
          <h3 className="mt-6 text-xl font-medium text-white">No Characters Yet</h3>
          <p className="mt-3 text-md text-gray-400 max-w-lg mx-auto">
            You haven't created any characters yet. Start by creating your first character to bring your stories to life!
          </p>
          <div className="mt-8">
            <Link
              to="/character-creator"
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg 
                className="mr-2 -ml-1 h-5 w-5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" 
                  clipRule="evenodd" 
                />
              </svg>
              Create Character
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterLibraryPage; 