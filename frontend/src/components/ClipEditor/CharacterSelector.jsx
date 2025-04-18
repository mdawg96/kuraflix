import React from 'react';
import { getImageUrl } from './utils';

const CharacterSelector = ({
  selectedCharacters,
  projectCharacters,
  allCharacters,
  onToggleCharacter,
  onAddToProject,
  onRemoveFromProject
}) => {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Project Characters</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
          {projectCharacters.length === 0 ? (
            <div className="col-span-full text-xs text-gray-400 my-4">
              No characters in project. Add some from below.
            </div>
          ) : (
            projectCharacters.map((character) => (
              <div key={character.id} className="relative">
                <button
                  onClick={() => onToggleCharacter(character)}
                  className={selectedCharacters.includes(character.id) ? 'bg-gray-600' : ''}
                >
                  <img
                    src={getImageUrl(character.thumbnail || character.imageUrl || character.imagePath)}
                    alt={character.name}
                    className="w-20 h-20 object-cover"
                  />
                </button>
                <button
                  onClick={() => onRemoveFromProject(character)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
                <div className="text-xs text-center text-gray-300 mt-1">{character.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">All Characters</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
          {allCharacters.length === 0 ? (
            <div className="col-span-full text-xs text-gray-400 my-4">
              No characters available.
            </div>
          ) : (
            allCharacters.map((character) => (
              <div key={character.id} className="relative">
                <button
                  onClick={() => onToggleCharacter(character)}
                  disabled={!projectCharacters.find(c => c.id === character.id)}
                  className={selectedCharacters.includes(character.id) ? 'bg-gray-600' : ''}
                >
                  <img
                    src={getImageUrl(character.thumbnail || character.imageUrl || character.imagePath)}
                    alt={character.name}
                    className="w-20 h-20 object-cover"
                  />
                </button>
                {!projectCharacters.find(c => c.id === character.id) && (
                  <button
                    onClick={() => onAddToProject(character)}
                    className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 hover:bg-green-600"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
                <div className="text-xs text-center text-gray-300 mt-1">{character.name}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterSelector; 