import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { characterAPI } from '../services/api';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
// Import placeholder image
import characterPlaceholderImage from '../assets/images/placeholders/manga.png';

const CharacterCreatorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCharacterId, setEditCharacterId] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [characterDescription, setCharacterDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [imageConfirmed, setImageConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { isAuthenticated } = useAuth();

  // Character role and art style
  const [role, setRole] = useState('Protagonist');
  const [artStyle, setArtStyle] = useState('Anime (Modern)');

  // Check for edit mode from location state
  useEffect(() => {
    if (location.state && location.state.editCharacter) {
      const { editCharacter } = location.state;
      setIsEditMode(true);
      setEditCharacterId(editCharacter.id);
      setCharacterName(editCharacter.name);
      setCharacterDescription(editCharacter.description || '');
      setCharacterImage(editCharacter.thumbnail);
      setImageConfirmed(true); // Image is already confirmed in edit mode
      setRole(editCharacter.role);
      setArtStyle(editCharacter.artStyle || 'Anime (Modern)');
    }
  }, [location]);

  // Add an effect to check authentication status on component mount
  useEffect(() => {
    console.log("CharacterCreatorPage: Checking auth state");
    if (!auth.currentUser) {
      console.warn("CharacterCreatorPage: No authenticated user found, redirecting to login");
      navigate('/login');
    } else {
      console.log("CharacterCreatorPage: User authenticated:", {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email
      });
    }
  }, [navigate]);

  const generateCharacter = async () => {
    if (!characterName.trim()) {
      setErrorMessage('Please provide a character name');
      return;
    }

    if (!characterDescription.trim()) {
      setErrorMessage('Please provide a character description');
      return;
    }

    setErrorMessage('');
    setGenerating(true);
    setImageConfirmed(false); // Reset confirmation when generating a new image

    try {
      const response = await characterAPI.generateCharacter({
        name: characterName,
        description: characterDescription,
        role,
        artStyle,
        orientation: 'portrait' // Always generate in vertical/portrait orientation
      });

      // Set generating to false regardless of outcome
      setGenerating(false);

      if (response.success) {
        console.log('Character generated successfully:', response.character);
        // Set the image path from the response
        setCharacterImage(response.character.imagePath);
      } else {
        console.error('Error generating character:', response.message);
        setErrorMessage('Failed to generate character: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to generate character:', error);
      setErrorMessage('Failed to generate character: ' + (error.message || 'Network error'));
      setGenerating(false);
    }
  };

  const confirmImage = () => {
    setImageConfirmed(true);
  };

  const saveCharacter = async () => {
    if (!characterName.trim()) {
      setErrorMessage('Please provide a character name');
      return;
    }

    if (!characterImage) {
      setErrorMessage('Please generate a character image first');
      return;
    }

    // Prepare the character data (without project assignment)
    const characterData = {
      name: characterName,
      description: characterDescription,
      imagePath: characterImage,
      role,
      artStyle
    };

    try {
      // Set a loading state
      setGenerating(true);
      
      // Save the character to Firestore
      const response = await characterAPI.saveCharacter(characterData);
      
      setGenerating(false);
      
      // Check for success in the Firestore response format
      if (response.success) {
        console.log('Character saved successfully');
        // Navigate to character page or library
        navigate('/character-library');
      } else {
        console.error('Failed to save character');
        setErrorMessage('Failed to save character. Please try again.');
      }
    } catch (error) {
      console.error('Error saving character:', error);
      setErrorMessage('Error saving character: ' + (error.message || 'Unknown error'));
      setGenerating(false);
    }
  };

  const handleImageError = (e) => {
    console.error('Image failed to load, using fallback', e.target.src);
    e.target.src = characterPlaceholderImage;
  };

  // Function to build correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="flex justify-between items-center">
          <div className="flex-1"></div>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl flex-2">
            {isEditMode ? 'Edit Character' : 'Character Creator'}
          </h1>
          <div className="flex-1 text-right">
            <Link to="/character-library" className="inline-flex items-center px-4 py-2 border border-indigo-500 rounded-md shadow-sm text-sm font-medium text-indigo-500 bg-black hover:bg-gray-900">
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              View My Characters
            </Link>
          </div>
        </div>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          {isEditMode ? 'Update your character details' : 'Design a custom character for your anime and manga stories'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Character Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Character Name*</label>
              <input
                type="text"
                id="name"
                className="input w-full mt-1"
                placeholder="e.g. Sakura Miyamoto"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                disabled={imageConfirmed && !isEditMode}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300">Character Description*</label>
              <textarea
                id="description"
                rows={8}
                className="input w-full mt-1"
                placeholder="Describe your character's appearance, personality, clothing, etc. in detail."
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                disabled={imageConfirmed && !isEditMode}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-300">Character Role</label>
                <select
                  id="role" 
                  className="input w-full mt-1"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={imageConfirmed && !isEditMode}
                >
                  <option value="Protagonist">Protagonist</option>
                  <option value="Antagonist">Antagonist</option>
                  <option value="Support">Support</option>
                  <option value="Side Character">Side Character</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="style" className="block text-sm font-medium text-gray-300">Art Style</label>
                <select
                  id="style" 
                  className="input w-full mt-1"
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  disabled={imageConfirmed && !isEditMode}
                >
                  <option value="Anime (Modern)">Anime (Modern)</option>
                  <option value="Classic Anime">Classic Anime</option>
                  <option value="Chibi">Chibi</option>
                  <option value="Fantasy">Fantasy</option>
                </select>
              </div>
            </div>

            {!isEditMode && !imageConfirmed && (
              <>
                <button
                  className="btn-primary w-full"
                  onClick={generateCharacter}
                  disabled={generating || !characterName || !characterDescription}
                >
                  {generating ? 'Generating... (This may take a few minutes)' : 'Generate Character'}
                </button>
                
                {errorMessage && (
                  <div className="mt-2 text-red-500 text-sm">{errorMessage}</div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="card flex flex-col">
          <h2 className="text-xl font-bold text-white mb-4">Character Preview</h2>
          
          <div className="flex-grow flex items-center justify-center bg-gray-700 rounded-lg overflow-hidden">
            {characterImage ? (
              <img 
                src={getImageUrl(characterImage)} 
                alt={`Character ${characterName}`} 
                className="max-w-full max-h-full" 
                onError={handleImageError} 
              />
            ) : (
              <div className="text-gray-400 text-center px-4">
                <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="mt-2">Your character will appear here after generation</p>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {characterImage && !imageConfirmed && !isEditMode && (
              <>
                <button className="btn-primary w-full" onClick={confirmImage}>
                  Confirm Image
                </button>
                
                <button className="btn-secondary w-full" onClick={generateCharacter}>
                  Regenerate
                </button>
                
                <button 
                  className="btn-secondary w-full text-gray-300"
                  onClick={() => navigate('/character-library')}
                >
                  Cancel
                </button>
              </>
            )}
            
            {(imageConfirmed || isEditMode) && (
              <>
                <button className="btn-primary w-full" onClick={saveCharacter}>
                  {isEditMode ? 'Save Changes' : 'Save Character'}
                </button>
                
                {!isEditMode && (
                  <button 
                    className="btn-secondary w-full text-gray-300"
                    onClick={() => {
                      setImageConfirmed(false);
                      setCharacterImage(null);
                    }}
                  >
                    Start Over
                  </button>
                )}
                
                <button 
                  className="btn-secondary w-full text-gray-300"
                  onClick={() => navigate('/character-library')}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreatorPage; 