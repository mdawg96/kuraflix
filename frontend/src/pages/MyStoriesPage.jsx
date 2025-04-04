import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
// Import placeholder images
import characterPlaceholder from '../assets/images/placeholders/image.png';
import scenePlaceholder from '../assets/images/placeholders/image.png';
import episodePlaceholder from '../assets/images/placeholders/image.png';
import fallbackImage from '../assets/images/placeholders/image.png'; // Using the same image as fallback

const MyStoriesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [activeTab, setActiveTab] = useState('characters');
  const [expandedCharacter, setExpandedCharacter] = useState(null);
  const [showOnlyCharacters, setShowOnlyCharacters] = useState(false);
  
  // Use URL parameters to set the active tab on mount
  useEffect(() => {
    // Check if we're at /characters and redirect to /my-stories
    if (location.pathname === '/characters') {
      navigate('/my-stories/characters', { replace: true });
      return;
    }
    
    // Check if we're coming from character creator
    const fromCharacterCreator = new URLSearchParams(location.search).get('from') === 'character-creator';
    setShowOnlyCharacters(fromCharacterCreator);
    
    // Direct path to characters tab
    if (location.pathname === '/my-stories/characters') {
      setActiveTab('characters');
      return;
    }
    
    // Get tab from URL params if available
    const tabParam = params.tab;
    if (tabParam && ['episodes', 'scenes', 'characters'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.pathname, location.search, params.tab, navigate]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/my-stories/${tab}`, { replace: true });
  };

  // Placeholder data for episodes and characters
  const episodes = [
    { 
      id: 1, 
      title: 'The Awakening', 
      thumbnail: episodePlaceholder, 
      duration: '5:30',
      status: 'completed',
      dateCreated: '2023-10-15'
    },
    { 
      id: 2, 
      title: 'New Horizons', 
      thumbnail: episodePlaceholder, 
      duration: '4:45',
      status: 'completed',
      dateCreated: '2023-10-20'
    },
    { 
      id: 3, 
      title: 'The Challenge', 
      thumbnail: episodePlaceholder, 
      duration: '6:15',
      status: 'rendering',
      dateCreated: '2023-10-28'
    },
  ];
  
  // Enhanced character data with all the traits we now support
  const characters = [
    {
      id: 1,
      name: 'Hiro',
      thumbnail: characterPlaceholder,
      role: 'Protagonist',
      episodes: 3,
      physicalTraits: {
        race: 'Asian',
        gender: 'Male',
        age: 'Teen',
        height: 'Average',
        weight: 'Athletic',
        bodyType: 'Triangle'
      },
      facialFeatures: {
        faceShape: 'Square',
        skinTone: 'Tan',
        eyeColor: 'Brown',
        eyeShape: 'Almond'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Black',
        hairLength: 'Medium',
        hairStyle: 'Messy'
      },
      story: { id: 1, name: 'Hero Academy', type: 'anime' }
    },
    {
      id: 2,
      name: 'Yuki',
      thumbnail: characterPlaceholder,
      role: 'Support',
      episodes: 2,
      physicalTraits: {
        race: 'Asian',
        gender: 'Female',
        age: 'Teen',
        height: 'Short',
        weight: 'Slender',
        bodyType: 'Hourglass'
      },
      facialFeatures: {
        faceShape: 'Heart',
        skinTone: 'Fair',
        eyeColor: 'Blue',
        eyeShape: 'Round'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'White',
        hairLength: 'Long',
        hairStyle: 'Ponytail'
      },
      story: { id: 1, name: 'Hero Academy', type: 'anime' }
    },
    {
      id: 3,
      name: 'Kenta',
      thumbnail: characterPlaceholder,
      role: 'Antagonist',
      episodes: 3,
      physicalTraits: {
        race: 'Asian',
        gender: 'Male',
        age: 'Young Adult',
        height: 'Tall',
        weight: 'Muscular',
        bodyType: 'Inverted Triangle'
      },
      facialFeatures: {
        faceShape: 'Square',
        skinTone: 'Tan',
        eyeColor: 'Amber',
        eyeShape: 'Hooded'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Red',
        hairLength: 'Short',
        hairStyle: 'Spiky'
      },
      story: { id: 3, name: 'Shadow Realm', type: 'anime' }
    },
    {
      id: 4,
      name: 'Sakura',
      thumbnail: characterPlaceholder,
      role: 'Support',
      episodes: 1,
      physicalTraits: {
        race: 'Asian',
        gender: 'Female',
        age: 'Teen',
        height: 'Average',
        weight: 'Petite',
        bodyType: 'Hourglass'
      },
      facialFeatures: {
        faceShape: 'Oval',
        skinTone: 'Fair',
        eyeColor: 'Green',
        eyeShape: 'Almond'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Pink',
        hairLength: 'Medium',
        hairStyle: 'Bob'
      },
      story: { id: 2, name: 'Mystic Legends', type: 'manga' }
    },
  ];
  
  const scenes = [
    {
      id: 1,
      title: 'School Entrance',
      thumbnail: scenePlaceholder,
      duration: '0:45',
      dateCreated: '2023-10-14'
    },
    {
      id: 2,
      title: 'First Encounter',
      thumbnail: scenePlaceholder,
      duration: '1:20',
      dateCreated: '2023-10-16'
    },
    {
      id: 3,
      title: 'Training Montage',
      thumbnail: scenePlaceholder,
      duration: '2:10',
      dateCreated: '2023-10-18'
    },
    {
      id: 4,
      title: 'Final Battle',
      thumbnail: scenePlaceholder,
      duration: '3:05',
      dateCreated: '2023-10-25'
    },
  ];

  // Mock data for stories
  const stories = [
    { 
      id: 1, 
      title: 'Hero Academy', 
      thumbnail: episodePlaceholder, 
      type: 'anime',
      episodes: 3,
      dateCreated: '2023-10-15',
      description: 'A story about young heroes learning to harness their powers'
    },
    { 
      id: 2, 
      title: 'Mystic Legends', 
      thumbnail: episodePlaceholder, 
      type: 'manga',
      episodes: 2,
      dateCreated: '2023-10-20',
      description: 'A fantasy manga about ancient powers and modern conflicts'
    },
    { 
      id: 3, 
      title: 'Shadow Realm', 
      thumbnail: episodePlaceholder, 
      type: 'anime',
      episodes: 1,
      dateCreated: '2023-10-28',
      description: 'A dark tale of revenge and redemption'
    },
  ];

  // Function to edit a character
  const editCharacter = (characterId) => {
    navigate(`/character-creator?edit=${characterId}`);
  };

  // Function to toggle character details view
  const toggleCharacterDetails = (characterId) => {
    if (expandedCharacter === characterId) {
      setExpandedCharacter(null);
    } else {
      setExpandedCharacter(characterId);
    }
  };

  // Function to handle image load errors
  const handleImageError = (e) => {
    console.warn('Image failed to load, using fallback image instead.');
    e.target.src = fallbackImage;
    e.target.onerror = null; // Prevent infinite loop
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
          {showOnlyCharacters ? 'My Characters' : 'My Anime Stories'}
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          {showOnlyCharacters ? 'Manage your custom characters' : 'Manage your anime and manga stories'}
        </p>
      </div>
      
      {/* Show normal tabs only when accessing from character creator */}
      {showOnlyCharacters ? (
        // Only show a header for characters-only mode
        <div className="border-b border-gray-700 mb-8 pb-2">
          <h2 className="text-xl font-bold text-white">My Characters</h2>
        </div>
      ) : (
        // For regular My Stories view, show stories list
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Your Stories</h2>
            <div>
              <Link to="/manga-studio" className="btn-primary text-sm mr-2">
                Manga Studio
              </Link>
              <Link to="/anime-studio" className="btn-secondary text-sm">
                Anime Studio
              </Link>
            </div>
          </div>
          
          {stories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map(story => (
                <div key={story.id} className="card overflow-hidden">
                  <img src={story.thumbnail} alt={story.title} className="w-full h-48 object-cover" onError={handleImageError} />
                  <div className="p-4">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium text-white">{story.title}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {story.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{story.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      <span>{story.episodes} episode{story.episodes !== 1 ? 's' : ''}</span>
                      <span className="mx-2">•</span>
                      <span>Created: {story.dateCreated}</span>
                    </p>
                    
                    <div className="mt-4 flex justify-between">
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm">View</button>
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-white">No stories yet</h3>
              <p className="mt-1 text-sm text-gray-400">Get started by creating a new anime or manga story</p>
              <div className="mt-6">
                <Link to="/manga-studio" className="btn-primary mr-4">
                  Manga Studio
                </Link>
                <Link to="/anime-studio" className="btn-secondary">
                  Anime Studio
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Characters Tab - Only show when in characters-only mode */}
      {showOnlyCharacters && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">My Characters</h2>
            <Link to="/character-creator" className="btn-primary px-5 py-3 text-md font-medium">
              Create New Character
            </Link>
          </div>
          
          {characters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map(character => (
                <div key={character.id} className={`card text-center overflow-hidden transition-all duration-300 ${expandedCharacter === character.id ? 'col-span-full' : ''}`}>
                  <div className="flex flex-col md:flex-row items-center p-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                      <img src={character.thumbnail} alt={character.name} className="w-full h-full object-cover" onError={handleImageError} />
                    </div>
                    
                    <div className="md:ml-6 mt-4 md:mt-0 flex-grow text-left">
                      <h3 className="text-xl font-medium text-white">{character.name}</h3>
                      <div className="flex flex-wrap mt-2">
                        <span className="px-2 py-1 text-xs bg-indigo-900 text-indigo-300 rounded-full mr-2 mb-2">
                          {character.role}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full mr-2 mb-2">
                          {character.physicalTraits.gender}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full mr-2 mb-2">
                          {character.physicalTraits.age}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded-full mr-2 mb-2">
                          {character.hairFeatures.hairColor} Hair
                        </span>
                      </div>
                      {character.story && (
                        <p className="text-sm text-gray-400 mt-1">
                          Belongs to: <span className="text-indigo-400">{character.story.name}</span> ({character.story.type})
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Used in {character.episodes} episodes</p>
                    </div>
                    
                    <div className="flex md:flex-col space-x-4 md:space-x-0 md:space-y-2 mt-4 md:mt-0">
                      <button 
                        onClick={() => editCharacter(character.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => toggleCharacterDetails(character.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        {expandedCharacter === character.id ? 'Hide Details' : 'View Details'}
                      </button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </div>
                  </div>
                  
                  {/* Expanded character details */}
                  {expandedCharacter === character.id && (
                    <div className="px-4 pb-4 mt-2 border-t border-gray-700 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        <div>
                          <h4 className="font-medium text-indigo-400 mb-2">Physical Traits</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li><span className="text-gray-500">Race:</span> {character.physicalTraits.race}</li>
                            <li><span className="text-gray-500">Gender:</span> {character.physicalTraits.gender}</li>
                            <li><span className="text-gray-500">Age:</span> {character.physicalTraits.age}</li>
                            <li><span className="text-gray-500">Height:</span> {character.physicalTraits.height}</li>
                            <li><span className="text-gray-500">Weight/Build:</span> {character.physicalTraits.weight}</li>
                            <li><span className="text-gray-500">Body Type:</span> {character.physicalTraits.bodyType}</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-indigo-400 mb-2">Facial Features</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li><span className="text-gray-500">Face Shape:</span> {character.facialFeatures.faceShape}</li>
                            <li><span className="text-gray-500">Skin Tone:</span> {character.facialFeatures.skinTone}</li>
                            <li><span className="text-gray-500">Eye Color:</span> {character.facialFeatures.eyeColor}</li>
                            <li><span className="text-gray-500">Eye Shape:</span> {character.facialFeatures.eyeShape}</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-indigo-400 mb-2">Hair</h4>
                          <ul className="text-sm text-gray-300 space-y-1">
                            <li><span className="text-gray-500">Hair Type:</span> {character.hairFeatures.hairType}</li>
                            <li><span className="text-gray-500">Hair Color:</span> {character.hairFeatures.hairColor}</li>
                            <li><span className="text-gray-500">Hair Length:</span> {character.hairFeatures.hairLength}</li>
                            <li><span className="text-gray-500">Hair Style:</span> {character.hairFeatures.hairStyle}</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button 
                          className="btn-secondary text-xs"
                          onClick={() => navigate(`/character-creator?edit=${character.id}`)}
                        >
                          Edit Character Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-white">No characters yet</h3>
              <p className="mt-1 text-sm text-gray-400">Get started by creating a new character</p>
              <div className="mt-6">
                <Link to="/character-creator" className="btn-primary">
                  Create New Character
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyStoriesPage; 