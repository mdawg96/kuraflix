import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { characterAPI } from '../services/api';
// Import placeholder images
import characterPlaceholder from '../assets/images/placeholders/image.png';
import fallbackImage from '../assets/images/placeholders/image.png'; // Using the same image as fallback

const CharacterCreatorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editCharacterId, setEditCharacterId] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [creationMode, setCreationMode] = useState('dropdown'); // 'dropdown' or 'description'
  const [characterDescription, setCharacterDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [characterImage, setCharacterImage] = useState(null);
  const [activeTab, setActiveTab] = useState('physical');
  const [errorMessage, setErrorMessage] = useState('');

  // For dropdown selections
  const [physicalTraits, setPhysicalTraits] = useState({
    race: '',
    gender: 'Female',
    age: '',
    height: '',
    weight: 'Medium',
    bodyType: 'Rectangle'
  });

  const [facialFeatures, setFacialFeatures] = useState({
    faceShape: 'Oval',
    skinTone: 'Fair',
    eyeColor: 'Brown',
    eyeShape: 'Almond',
    nose: 'Straight',
    lips: 'Full',
    eyebrows: 'Arched'
  });

  const [hairFeatures, setHairFeatures] = useState({
    hairType: 'Straight',
    hairColor: 'Black',
    hairLength: 'Medium',
    hairStyle: 'Straight'
  });

  const [extras, setExtras] = useState({
    facialHair: 'Clean-shaven',
    tattoos: 'No',
    piercings: 'None',
    scars: 'None',
    glasses: 'No',
    jewelry: 'None',
    clothingStyle: 'Modern',
    outfitColors: 'Neutrals'
  });

  const [personality, setPersonality] = useState({
    alignment: 'Neutral',
    socialType: 'Ambivert',
    keyTraits: [],
    motivation: 'Justice'
  });

  // Character role
  const [role, setRole] = useState('Protagonist');
  const [artStyle, setArtStyle] = useState('Anime (Modern)');

  // Story assignment
  const [assignToStory, setAssignToStory] = useState(false);
  const [storyType, setStoryType] = useState('anime');
  const [selectedStory, setSelectedStory] = useState('');
  const [newStoryName, setNewStoryName] = useState('');
  const [createNewStory, setCreateNewStory] = useState(false);

  // Placeholder for user's existing stories
  const [userStories, setUserStories] = useState([
    { id: 1, name: 'Hero Academy', type: 'anime' },
    { id: 2, name: 'Mystic Legends', type: 'manga' },
    { id: 3, name: 'Shadow Realm', type: 'anime' }
  ]);
  
  // Mock database of characters
  const characterDatabase = [
    {
      id: 1,
      name: 'Hiro',
      thumbnail: characterPlaceholder,
      role: 'Protagonist',
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
        eyeShape: 'Almond',
        nose: 'Straight',
        lips: 'Full',
        eyebrows: 'Thick'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Black',
        hairLength: 'Medium',
        hairStyle: 'Messy'
      },
      extras: {
        facialHair: 'Clean-shaven',
        tattoos: 'No',
        piercings: 'None',
        scars: 'Small Scar',
        glasses: 'No',
        jewelry: 'None',
        clothingStyle: 'Modern',
        outfitColors: 'Darks'
      },
      personality: {
        alignment: 'Lawful Good',
        socialType: 'Extrovert',
        keyTraits: ['Brave', 'Loyal', 'Impulsive'],
        motivation: 'Justice'
      },
      story: { id: 1, name: 'Hero Academy', type: 'anime' }
    },
    {
      id: 2,
      name: 'Yuki',
      thumbnail: characterPlaceholder,
      role: 'Support',
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
        eyeShape: 'Round',
        nose: 'Button',
        lips: 'Full',
        eyebrows: 'Thin'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'White',
        hairLength: 'Long',
        hairStyle: 'Ponytail'
      },
      extras: {
        facialHair: 'Clean-shaven',
        tattoos: 'No',
        piercings: 'Ears Only',
        scars: 'None',
        glasses: 'No',
        jewelry: 'Minimal',
        clothingStyle: 'Modern',
        outfitColors: 'Pastels'
      },
      personality: {
        alignment: 'Neutral Good',
        socialType: 'Introvert',
        keyTraits: ['Shy', 'Kind', 'Clever'],
        motivation: 'Love'
      },
      story: { id: 1, name: 'Hero Academy', type: 'anime' }
    },
    {
      id: 3,
      name: 'Kenta',
      thumbnail: characterPlaceholder,
      role: 'Antagonist',
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
        eyeShape: 'Hooded',
        nose: 'Straight',
        lips: 'Thin',
        eyebrows: 'Thick'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Red',
        hairLength: 'Short',
        hairStyle: 'Spiky'
      },
      extras: {
        facialHair: 'Stubble',
        tattoos: 'Yes - Minimal',
        piercings: 'None',
        scars: 'Facial Scar',
        glasses: 'No',
        jewelry: 'None',
        clothingStyle: 'Modern',
        outfitColors: 'Darks'
      },
      personality: {
        alignment: 'Lawful Evil',
        socialType: 'Ambivert',
        keyTraits: ['Arrogant', 'Clever', 'Patient'],
        motivation: 'Power'
      },
      story: { id: 3, name: 'Shadow Realm', type: 'anime' }
    },
    {
      id: 4,
      name: 'Sakura',
      thumbnail: characterPlaceholder,
      role: 'Support',
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
        eyeShape: 'Almond',
        nose: 'Button',
        lips: 'Full',
        eyebrows: 'Arched'
      },
      hairFeatures: {
        hairType: 'Straight',
        hairColor: 'Pink',
        hairLength: 'Medium',
        hairStyle: 'Bob'
      },
      extras: {
        facialHair: 'Clean-shaven',
        tattoos: 'No',
        piercings: 'Ears Only',
        scars: 'None',
        glasses: 'No',
        jewelry: 'Minimal',
        clothingStyle: 'Fantasy',
        outfitColors: 'Pastels'
      },
      personality: {
        alignment: 'Neutral Good',
        socialType: 'Extrovert',
        keyTraits: ['Kind', 'Brave', 'Loyal'],
        motivation: 'Knowledge'
      },
      story: { id: 2, name: 'Mystic Legends', type: 'manga' }
    }
  ];

  // Check for edit mode on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    
    if (editId) {
      setIsEditMode(true);
      setEditCharacterId(parseInt(editId));
      
      // Find character in database
      const character = characterDatabase.find(char => char.id === parseInt(editId));
      
      if (character) {
        // Load character data
        setCharacterName(character.name);
        setRole(character.role);
        setPhysicalTraits(character.physicalTraits);
        setFacialFeatures(character.facialFeatures);
        setHairFeatures(character.hairFeatures);
        setExtras(character.extras);
        setPersonality(character.personality);
        setCharacterImage(character.thumbnail);
        
        // If character has a story, set story assignment
        if (character.story) {
          setAssignToStory(true);
          setCreateNewStory(false);
          setSelectedStory(character.story.id.toString());
          setStoryType(character.story.type);
        }
      }
    }
  }, [location.search]);
  
  // Update the generateCharacter function
  const generateCharacter = async () => {
    if (creationMode === 'description' && (!characterName || !characterDescription)) {
      setErrorMessage('Please provide a character name and description');
      return;
    }
    
    if (creationMode === 'dropdown' && !characterName) {
      setErrorMessage('Please provide a character name');
      return;
    }
    
    setErrorMessage('');
    setGenerating(true);
    setCharacterImage(null); // Clear any existing image
    
    try {
      // Gather all character data
      let characterData = {
        name: characterName,
        role,
        artStyle
      };
      
      if (creationMode === 'dropdown') {
        // Include all dropdown selections
        characterData = {
          ...characterData,
          physicalTraits,
          facialFeatures,
          hairFeatures, 
          extras,
          personality
        };
      } else {
        // Include description
        characterData.description = characterDescription;
      }
      
      console.log('Sending character data:', characterData);
      
      // Call the API - with a shorter timeout now
      const response = await characterAPI.generateCharacter(characterData);
      
      if (response.data.success && response.data.character && response.data.character.imageUrl) {
        // Set character image from API response
        console.log('Character image URL:', response.data.character.imageUrl);
        setCharacterImage(response.data.character.imageUrl);
      } else {
        console.error('Failed to generate character:', response.data.message);
        setErrorMessage(response.data.message || 'Generation failed. Try a simpler description or try again later.');
      }
    } catch (error) {
      console.error('Failed to generate character:', error);
      setErrorMessage(error.message === 'timeout of 60000ms exceeded' 
        ? 'Image generation is taking longer than expected. The server might be busy. Please try again.' 
        : 'Server error. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };
  
  const saveCharacter = () => {
    // In a real app, this would save to backend/database
    if (createNewStory && newStoryName) {
      // Logic to create new story and assign character
      alert(`Character ${isEditMode ? 'updated' : 'saved'} and assigned to new ${storyType}: ${newStoryName}!`);
      // Navigate to the appropriate creator page
      if (storyType === 'anime') {
        navigate('/anime-creator');
      } else {
        navigate('/manga-creator');
      }
    } else if (assignToStory && selectedStory) {
      // Logic to assign to existing story
      alert(`Character ${isEditMode ? 'updated' : 'saved'} and assigned to existing story!`);
      navigate('/my-stories/characters?from=character-creator');
    } else {
      // Just save the character
      alert(`Character ${isEditMode ? 'updated' : 'saved'}!`);
      navigate('/my-stories/characters?from=character-creator');
    }
  };

  // Handle changes for nested objects
  const handlePhysicalChange = (e) => {
    setPhysicalTraits({
      ...physicalTraits,
      [e.target.name]: e.target.value
    });
  };

  const handleFacialChange = (e) => {
    setFacialFeatures({
      ...facialFeatures,
      [e.target.name]: e.target.value
    });
  };

  const handleHairChange = (e) => {
    setHairFeatures({
      ...hairFeatures,
      [e.target.name]: e.target.value
    });
  };

  const handleExtrasChange = (e) => {
    setExtras({
      ...extras,
      [e.target.name]: e.target.value
    });
  };

  const handlePersonalityChange = (e) => {
    setPersonality({
      ...personality,
      [e.target.name]: e.target.value
    });
  };

  const handleKeyTraitChange = (trait) => {
    if (personality.keyTraits.includes(trait)) {
      setPersonality({
        ...personality,
        keyTraits: personality.keyTraits.filter(t => t !== trait)
      });
    } else {
      setPersonality({
        ...personality,
        keyTraits: [...personality.keyTraits, trait]
      });
    }
  };
  
  // Toggle between dropdown and description mode
  const toggleCreationMode = (mode) => {
    setCreationMode(mode);
  };

  // Function to handle image load errors
  const handleImageError = (e) => {
    console.error('Image failed to load:', e.target.src);
    console.warn('Using fallback image instead.');
    // Try to load a test path if this is a generated image path
    if (e.target.src.includes('/outputs/')) {
      console.log('Trying alternative path by adding API_URL...');
      const newSrc = 'http://localhost:5001' + e.target.src.substring(e.target.src.indexOf('/outputs/'));
      console.log('New path:', newSrc);
      e.target.src = newSrc;
      e.target.onerror = (e2) => {
        console.error('Alternative path also failed, using fallback');
        e2.target.src = fallbackImage;
        e2.target.onerror = null;
      };
    } else {
      e.target.src = fallbackImage;
      e.target.onerror = null; // Prevent infinite loop
    }
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
            <Link to="/my-stories/characters?from=character-creator" className="inline-flex items-center px-4 py-2 border border-indigo-500 rounded-md shadow-sm text-sm font-medium text-indigo-500 bg-black hover:bg-gray-900">
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
      
      {/* Creation Mode Toggle - Only show in create mode */}
      {!isEditMode && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                creationMode === 'dropdown' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => toggleCreationMode('dropdown')}
            >
              Use Drop-down Options
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                creationMode === 'description' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => toggleCreationMode('description')}
            >
              Describe Character
            </button>
          </div>
        </div>
      )}
      
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
              />
            </div>
            
            {creationMode === 'description' && !isEditMode ? (
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">Character Description*</label>
                <textarea
                  id="description"
                  rows={8}
                  className="input w-full mt-1"
                  placeholder="Describe your character's appearance, personality, clothing, etc. in detail."
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Tabs for different attribute categories */}
                <div className="flex border-b border-gray-700">
                  <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'physical' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('physical')}
                  >
                    Physical
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'facial' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('facial')}
                  >
                    Facial
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'hair' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('hair')}
                  >
                    Hair
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'extras' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('extras')}
                  >
                    Extras
                  </button>
                  <button
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'personality' ? 'border-b-2 border-indigo-500 text-indigo-400' : 'text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('personality')}
                  >
                    Personality
                  </button>
                </div>

                {/* Content for the different tabs */}
                {activeTab === 'physical' && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="race" className="block text-sm font-medium text-gray-300">Race/Ethnicity</label>
                      <select 
                        id="race" 
                        name="race" 
                        className="input w-full mt-1"
                        value={physicalTraits.race}
                        onChange={handlePhysicalChange}
                      >
                        <option value="">Select...</option>
                        <option value="Asian">Asian</option>
                        <option value="Black/African">Black/African</option>
                        <option value="Caucasian">Caucasian</option>
                        <option value="Hispanic/Latino">Hispanic/Latino</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Mixed">Mixed</option>
                        <option value="Fantasy Race">Fantasy Race</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-300">Gender</label>
                        <select 
                          id="gender" 
                          name="gender" 
                          className="input w-full mt-1"
                          value={physicalTraits.gender}
                          onChange={handlePhysicalChange}
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-300">Age</label>
                        <select 
                          id="age" 
                          name="age" 
                          className="input w-full mt-1"
                          value={physicalTraits.age}
                          onChange={handlePhysicalChange}
                        >
                          <option value="">Select...</option>
                          <option value="Child">Child (0-12)</option>
                          <option value="Teen">Teen (13-19)</option>
                          <option value="Young Adult">Young Adult (20-29)</option>
                          <option value="Adult">Adult (30-49)</option>
                          <option value="Middle-aged">Middle-aged (50-69)</option>
                          <option value="Elderly">Elderly (70+)</option>
                          <option value="Ageless">Ageless/Immortal</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="height" className="block text-sm font-medium text-gray-300">Height</label>
                      <select 
                        id="height" 
                        name="height" 
                        className="input w-full mt-1"
                        value={physicalTraits.height}
                        onChange={handlePhysicalChange}
                      >
                        <option value="">Select...</option>
                        <option value="Very Short">Very Short</option>
                        <option value="Short">Short</option>
                        <option value="Average">Average</option>
                        <option value="Tall">Tall</option>
                        <option value="Very Tall">Very Tall</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-300">Weight/Build</label>
                        <select 
                          id="weight" 
                          name="weight" 
                          className="input w-full mt-1"
                          value={physicalTraits.weight}
                          onChange={handlePhysicalChange}
                        >
                          <option value="Skinny">Skinny</option>
                          <option value="Slender">Slender</option>
                          <option value="Medium">Medium</option>
                          <option value="Athletic">Athletic</option>
                          <option value="Muscular">Muscular</option>
                          <option value="Curvy">Curvy</option>
                          <option value="Heavy">Heavy</option>
                          <option value="Petite">Petite</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="bodyType" className="block text-sm font-medium text-gray-300">Body Type</label>
                        <select 
                          id="bodyType" 
                          name="bodyType" 
                          className="input w-full mt-1"
                          value={physicalTraits.bodyType}
                          onChange={handlePhysicalChange}
                        >
                          <option value="Apple">Apple</option>
                          <option value="Pear">Pear</option>
                          <option value="Hourglass">Hourglass</option>
                          <option value="Rectangle">Rectangle</option>
                          <option value="Triangle">Triangle</option>
                          <option value="Inverted Triangle">Inverted Triangle</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'facial' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="faceShape" className="block text-sm font-medium text-gray-300">Face Shape</label>
                        <select 
                          id="faceShape" 
                          name="faceShape" 
                          className="input w-full mt-1"
                          value={facialFeatures.faceShape}
                          onChange={handleFacialChange}
                        >
                          <option value="Oval">Oval</option>
                          <option value="Round">Round</option>
                          <option value="Square">Square</option>
                          <option value="Heart">Heart</option>
                          <option value="Diamond">Diamond</option>
                          <option value="Long">Long</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="skinTone" className="block text-sm font-medium text-gray-300">Skin Tone</label>
                        <select 
                          id="skinTone" 
                          name="skinTone" 
                          className="input w-full mt-1"
                          value={facialFeatures.skinTone}
                          onChange={handleFacialChange}
                        >
                          <option value="Fair">Fair</option>
                          <option value="Light">Light</option>
                          <option value="Olive">Olive</option>
                          <option value="Tan">Tan</option>
                          <option value="Brown">Brown</option>
                          <option value="Dark">Dark</option>
                          <option value="Albino">Albino</option>
                          <option value="Fantasy">Fantasy (Non-human)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="eyeColor" className="block text-sm font-medium text-gray-300">Eye Color</label>
                        <select 
                          id="eyeColor" 
                          name="eyeColor" 
                          className="input w-full mt-1"
                          value={facialFeatures.eyeColor}
                          onChange={handleFacialChange}
                        >
                          <option value="Brown">Brown</option>
                          <option value="Blue">Blue</option>
                          <option value="Green">Green</option>
                          <option value="Hazel">Hazel</option>
                          <option value="Gray">Gray</option>
                          <option value="Amber">Amber</option>
                          <option value="Heterochromia">Heterochromia (Different Colors)</option>
                          <option value="Fantasy">Fantasy (Purple, Red, etc.)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="eyeShape" className="block text-sm font-medium text-gray-300">Eye Shape</label>
                        <select 
                          id="eyeShape" 
                          name="eyeShape" 
                          className="input w-full mt-1"
                          value={facialFeatures.eyeShape}
                          onChange={handleFacialChange}
                        >
                          <option value="Almond">Almond</option>
                          <option value="Round">Round</option>
                          <option value="Hooded">Hooded</option>
                          <option value="Monolid">Monolid</option>
                          <option value="Downturned">Downturned</option>
                          <option value="Upturned">Upturned</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="nose" className="block text-sm font-medium text-gray-300">Nose</label>
                        <select 
                          id="nose" 
                          name="nose" 
                          className="input w-full mt-1"
                          value={facialFeatures.nose}
                          onChange={handleFacialChange}
                        >
                          <option value="Straight">Straight</option>
                          <option value="Snub">Snub</option>
                          <option value="Aquiline">Aquiline</option>
                          <option value="Hooked">Hooked</option>
                          <option value="Button">Button</option>
                          <option value="Broad">Broad</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="lips" className="block text-sm font-medium text-gray-300">Lips</label>
                        <select 
                          id="lips" 
                          name="lips" 
                          className="input w-full mt-1"
                          value={facialFeatures.lips}
                          onChange={handleFacialChange}
                        >
                          <option value="Full">Full</option>
                          <option value="Thin">Thin</option>
                          <option value="Cupid's Bow">Cupid's Bow</option>
                          <option value="Downturned">Downturned</option>
                          <option value="Wide">Wide</option>
                          <option value="Small">Small</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="eyebrows" className="block text-sm font-medium text-gray-300">Eyebrows</label>
                      <select 
                        id="eyebrows" 
                        name="eyebrows" 
                        className="input w-full mt-1"
                        value={facialFeatures.eyebrows}
                        onChange={handleFacialChange}
                      >
                        <option value="Arched">Arched</option>
                        <option value="Straight">Straight</option>
                        <option value="Thick">Thick</option>
                        <option value="Thin">Thin</option>
                        <option value="Bushy">Bushy</option>
                        <option value="Sculpted">Sculpted</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {activeTab === 'hair' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="hairType" className="block text-sm font-medium text-gray-300">Hair Type</label>
                        <select 
                          id="hairType" 
                          name="hairType" 
                          className="input w-full mt-1"
                          value={hairFeatures.hairType}
                          onChange={handleHairChange}
                        >
                          <option value="Straight">Straight</option>
                          <option value="Wavy">Wavy</option>
                          <option value="Curly">Curly</option>
                          <option value="Coily">Coily</option>
                          <option value="Kinky">Kinky</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="hairColor" className="block text-sm font-medium text-gray-300">Hair Color</label>
                        <select 
                          id="hairColor" 
                          name="hairColor" 
                          className="input w-full mt-1"
                          value={hairFeatures.hairColor}
                          onChange={handleHairChange}
                        >
                          <option value="Black">Black</option>
                          <option value="Dark Brown">Dark Brown</option>
                          <option value="Brown">Brown</option>
                          <option value="Light Brown">Light Brown</option>
                          <option value="Blonde">Blonde</option>
                          <option value="Red">Red</option>
                          <option value="White/Gray">White/Gray</option>
                          <option value="Blue">Blue (Dyed)</option>
                          <option value="Pink">Pink (Dyed)</option>
                          <option value="Purple">Purple (Dyed)</option>
                          <option value="Green">Green (Dyed)</option>
                          <option value="Multi-colored">Multi-colored</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="hairLength" className="block text-sm font-medium text-gray-300">Hair Length</label>
                        <select 
                          id="hairLength" 
                          name="hairLength" 
                          className="input w-full mt-1"
                          value={hairFeatures.hairLength}
                          onChange={handleHairChange}
                        >
                          <option value="Bald">Bald</option>
                          <option value="Buzzed">Buzzed</option>
                          <option value="Short">Short</option>
                          <option value="Medium">Medium</option>
                          <option value="Long">Long</option>
                          <option value="Very Long">Very Long</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="hairStyle" className="block text-sm font-medium text-gray-300">Hair Style</label>
                        <select 
                          id="hairStyle" 
                          name="hairStyle" 
                          className="input w-full mt-1"
                          value={hairFeatures.hairStyle}
                          onChange={handleHairChange}
                        >
                          <option value="Straight">Straight</option>
                          <option value="Braided">Braided</option>
                          <option value="Ponytail">Ponytail</option>
                          <option value="Afro">Afro</option>
                          <option value="Bun">Bun</option>
                          <option value="Mohawk">Mohawk</option>
                          <option value="Dreadlocks">Dreadlocks</option>
                          <option value="Undercut">Undercut</option>
                          <option value="Messy">Messy</option>
                          <option value="Slicked Back">Slicked Back</option>
                          <option value="Side Part">Side Part</option>
                          <option value="Spiky">Spiky</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'extras' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="facialHair" className="block text-sm font-medium text-gray-300">Facial Hair</label>
                        <select 
                          id="facialHair" 
                          name="facialHair" 
                          className="input w-full mt-1"
                          value={extras.facialHair}
                          onChange={handleExtrasChange}
                        >
                          <option value="Clean-shaven">Clean-shaven</option>
                          <option value="Stubble">Stubble</option>
                          <option value="Mustache">Mustache</option>
                          <option value="Beard">Beard</option>
                          <option value="Goatee">Goatee</option>
                          <option value="Full Beard">Full Beard</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="tattoos" className="block text-sm font-medium text-gray-300">Tattoos</label>
                        <select 
                          id="tattoos" 
                          name="tattoos" 
                          className="input w-full mt-1"
                          value={extras.tattoos}
                          onChange={handleExtrasChange}
                        >
                          <option value="No">No</option>
                          <option value="Yes - Minimal">Yes - Minimal</option>
                          <option value="Yes - Moderate">Yes - Moderate</option>
                          <option value="Yes - Extensive">Yes - Extensive</option>
                          <option value="Yes - Full Body">Yes - Full Body</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="piercings" className="block text-sm font-medium text-gray-300">Piercings</label>
                        <select 
                          id="piercings" 
                          name="piercings" 
                          className="input w-full mt-1"
                          value={extras.piercings}
                          onChange={handleExtrasChange}
                        >
                          <option value="None">None</option>
                          <option value="Ears Only">Ears Only</option>
                          <option value="Nose">Nose</option>
                          <option value="Eyebrow">Eyebrow</option>
                          <option value="Lip">Lip</option>
                          <option value="Multiple">Multiple</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="scars" className="block text-sm font-medium text-gray-300">Scars/Birthmarks</label>
                        <select 
                          id="scars" 
                          name="scars" 
                          className="input w-full mt-1"
                          value={extras.scars}
                          onChange={handleExtrasChange}
                        >
                          <option value="None">None</option>
                          <option value="Small Scar">Small Scar</option>
                          <option value="Facial Scar">Facial Scar</option>
                          <option value="Body Scar">Body Scar</option>
                          <option value="Multiple Scars">Multiple Scars</option>
                          <option value="Birthmark">Birthmark</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="glasses" className="block text-sm font-medium text-gray-300">Glasses</label>
                        <select 
                          id="glasses" 
                          name="glasses" 
                          className="input w-full mt-1"
                          value={extras.glasses}
                          onChange={handleExtrasChange}
                        >
                          <option value="No">No</option>
                          <option value="Reading Glasses">Reading Glasses</option>
                          <option value="Full Glasses">Full Glasses</option>
                          <option value="Sunglasses">Sunglasses</option>
                          <option value="Monocle">Monocle</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="jewelry" className="block text-sm font-medium text-gray-300">Jewelry</label>
                        <select 
                          id="jewelry" 
                          name="jewelry" 
                          className="input w-full mt-1"
                          value={extras.jewelry}
                          onChange={handleExtrasChange}
                        >
                          <option value="None">None</option>
                          <option value="Minimal">Minimal</option>
                          <option value="Necklace">Necklace</option>
                          <option value="Rings">Rings</option>
                          <option value="Bracelets">Bracelets</option>
                          <option value="Full Set">Full Set</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="clothingStyle" className="block text-sm font-medium text-gray-300">Clothing Style</label>
                        <select 
                          id="clothingStyle" 
                          name="clothingStyle" 
                          className="input w-full mt-1"
                          value={extras.clothingStyle}
                          onChange={handleExtrasChange}
                        >
                          <option value="Modern">Modern</option>
                          <option value="Fantasy">Fantasy</option>
                          <option value="Sci-fi">Sci-fi</option>
                          <option value="Grunge">Grunge</option>
                          <option value="Preppy">Preppy</option>
                          <option value="Punk">Punk</option>
                          <option value="Formal">Formal</option>
                          <option value="Casual">Casual</option>
                          <option value="Uniform">Uniform</option>
                          <option value="Traditional">Traditional</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="outfitColors" className="block text-sm font-medium text-gray-300">Outfit Colors</label>
                        <select 
                          id="outfitColors" 
                          name="outfitColors" 
                          className="input w-full mt-1"
                          value={extras.outfitColors}
                          onChange={handleExtrasChange}
                        >
                          <option value="Neutrals">Neutrals</option>
                          <option value="Brights">Brights</option>
                          <option value="Darks">Darks</option>
                          <option value="Earth Tones">Earth Tones</option>
                          <option value="Pastels">Pastels</option>
                          <option value="Monochrome">Monochrome</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'personality' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="alignment" className="block text-sm font-medium text-gray-300">Alignment</label>
                        <select 
                          id="alignment" 
                          name="alignment" 
                          className="input w-full mt-1"
                          value={personality.alignment}
                          onChange={handlePersonalityChange}
                        >
                          <option value="Lawful Good">Lawful Good</option>
                          <option value="Neutral Good">Neutral Good</option>
                          <option value="Chaotic Good">Chaotic Good</option>
                          <option value="Lawful Neutral">Lawful Neutral</option>
                          <option value="Neutral">Neutral</option>
                          <option value="Chaotic Neutral">Chaotic Neutral</option>
                          <option value="Lawful Evil">Lawful Evil</option>
                          <option value="Neutral Evil">Neutral Evil</option>
                          <option value="Chaotic Evil">Chaotic Evil</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="socialType" className="block text-sm font-medium text-gray-300">Social Type</label>
                        <select 
                          id="socialType" 
                          name="socialType" 
                          className="input w-full mt-1"
                          value={personality.socialType}
                          onChange={handlePersonalityChange}
                        >
                          <option value="Introvert">Introvert</option>
                          <option value="Extrovert">Extrovert</option>
                          <option value="Ambivert">Ambivert</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Key Traits (select multiple)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Brave', 'Shy', 'Clever', 'Arrogant', 'Loyal', 'Deceptive', 'Curious', 'Kind', 'Cruel', 'Patient', 'Impulsive', 'Wise', 'Naive'].map(trait => (
                          <div key={trait} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`trait-${trait}`}
                              checked={personality.keyTraits.includes(trait)}
                              onChange={() => handleKeyTraitChange(trait)}
                              className="h-4 w-4 text-indigo-600 rounded border-gray-700 bg-gray-800 focus:ring-indigo-500"
                            />
                            <label htmlFor={`trait-${trait}`} className="ml-2 text-sm text-gray-300">
                              {trait}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="motivation" className="block text-sm font-medium text-gray-300">Motivation</label>
                      <select 
                        id="motivation" 
                        name="motivation" 
                        className="input w-full mt-1"
                        value={personality.motivation}
                        onChange={handlePersonalityChange}
                      >
                        <option value="Justice">Justice</option>
                        <option value="Revenge">Revenge</option>
                        <option value="Love">Love</option>
                        <option value="Knowledge">Knowledge</option>
                        <option value="Freedom">Freedom</option>
                        <option value="Power">Power</option>
                        <option value="Wealth">Wealth</option>
                        <option value="Fame">Fame</option>
                        <option value="Survival">Survival</option>
                        <option value="Duty">Duty</option>
                        <option value="Family">Family</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-300">Character Role</label>
                <select 
                  id="role" 
                  className="input w-full mt-1"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
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
                >
                  <option value="Anime (Modern)">Anime (Modern)</option>
                  <option value="Classic Anime">Classic Anime</option>
                  <option value="Chibi">Chibi</option>
                  <option value="Fantasy">Fantasy</option>
                </select>
              </div>
            </div>
            
            {!isEditMode && (
              <>
                <button 
                  className="btn-primary w-full"
                  onClick={generateCharacter}
                  disabled={generating || !characterName || (creationMode === 'description' && !characterDescription)}
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
              <img src={characterImage} alt={`Character ${characterName}`} className="max-w-full max-h-full" onError={handleImageError} />
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
            {(characterImage || isEditMode) && (
              <>
                <button className="btn-primary w-full" onClick={saveCharacter}>
                  {isEditMode ? 'Save Changes' : 'Save Character'}
                </button>
                
                {!isEditMode && (
                  <button className="btn-secondary w-full">
                    Regenerate
                  </button>
                )}
                
                <button 
                  className="btn-secondary w-full text-gray-300"
                  onClick={() => navigate('/my-stories/characters?from=character-creator')}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Story Assignment Section */}
      {(characterImage || isEditMode) && (
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="assignToStory"
              checked={assignToStory}
              onChange={(e) => setAssignToStory(e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded border-gray-700 bg-gray-900 focus:ring-indigo-500"
            />
            <label htmlFor="assignToStory" className="ml-2 text-sm font-medium text-white">
              {isEditMode ? 
                (selectedStory ? 'Change story assignment?' : 'Assign character to a story?') : 
                'Assign character to a story?'
              }
            </label>
          </div>
          
          {assignToStory && (
            <div className="space-y-4 mt-3">
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="existingStory"
                    name="storyOption"
                    checked={!createNewStory}
                    onChange={() => setCreateNewStory(false)}
                    className="h-4 w-4 text-indigo-600 border-gray-700 bg-gray-900 focus:ring-indigo-500"
                  />
                  <label htmlFor="existingStory" className="ml-2 text-sm font-medium text-white">
                    Existing Story
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="newStory"
                    name="storyOption"
                    checked={createNewStory}
                    onChange={() => setCreateNewStory(true)}
                    className="h-4 w-4 text-indigo-600 border-gray-700 bg-gray-900 focus:ring-indigo-500"
                  />
                  <label htmlFor="newStory" className="ml-2 text-sm font-medium text-white">
                    Create New Story
                  </label>
                </div>
              </div>
              
              {createNewStory ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="storyType" className="block text-sm font-medium text-gray-300">Story Type</label>
                    <div className="flex space-x-4 mt-1">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="animeType"
                          name="storyType"
                          checked={storyType === 'anime'}
                          onChange={() => setStoryType('anime')}
                          className="h-4 w-4 text-indigo-600 border-gray-700 bg-gray-900 focus:ring-indigo-500"
                        />
                        <label htmlFor="animeType" className="ml-2 text-sm font-medium text-white">
                          Anime
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="mangaType"
                          name="storyType"
                          checked={storyType === 'manga'}
                          onChange={() => setStoryType('manga')}
                          className="h-4 w-4 text-indigo-600 border-gray-700 bg-gray-900 focus:ring-indigo-500"
                        />
                        <label htmlFor="mangaType" className="ml-2 text-sm font-medium text-white">
                          Manga
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="newStoryName" className="block text-sm font-medium text-gray-300">Story Name</label>
                    <input
                      type="text"
                      id="newStoryName"
                      className="input w-full mt-1"
                      placeholder="Enter new story name"
                      value={newStoryName}
                      onChange={(e) => setNewStoryName(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="selectedStory" className="block text-sm font-medium text-gray-300">Select Story</label>
                  <select
                    id="selectedStory"
                    className="input w-full mt-1"
                    value={selectedStory}
                    onChange={(e) => setSelectedStory(e.target.value)}
                  >
                    <option value="">Select a story...</option>
                    {userStories.filter(story => !storyType || story.type === storyType).map(story => (
                      <option key={story.id} value={story.id}>
                        {story.name} ({story.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharacterCreatorPage; 