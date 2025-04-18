import React from 'react';
import CharacterSelector from './CharacterSelector';

const ScenePhase = ({
  selectedCharacters,
  projectCharacters,
  allCharacters,
  onToggleCharacter,
  onAddToProject,
  onRemoveFromProject,
  selectedEnvironment,
  environments,
  onSelectEnvironment,
  selectedAction,
  actions,
  onSelectAction,
  selectedStyle,
  styles,
  onSelectStyle,
  setEditorPhase
}) => {
  return (
    <div>
      <div className="mb-6">
        <CharacterSelector
          selectedCharacters={selectedCharacters}
          projectCharacters={projectCharacters}
          allCharacters={allCharacters}
          onToggleCharacter={onToggleCharacter}
          onAddToProject={onAddToProject}
          onRemoveFromProject={onRemoveFromProject}
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Environment</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => onSelectEnvironment(env)}
              className={`p-2 rounded-lg text-sm ${
                selectedEnvironment?.id === env.id
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {env.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Action</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onSelectAction(action)}
              className={`p-2 rounded-lg text-sm ${
                selectedAction?.id === action.id
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {action.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Style</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelectStyle(style)}
              className={`p-2 rounded-lg text-sm ${
                selectedStyle?.id === style.id
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => setEditorPhase('image')}
          disabled={!selectedEnvironment || !selectedAction || !selectedStyle || selectedCharacters.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Scene →
        </button>
      </div>
    </div>
  );
};

export default ScenePhase; 