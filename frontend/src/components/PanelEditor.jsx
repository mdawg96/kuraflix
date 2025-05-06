import React from 'react';
import { Bubble } from './';
import { textBoxToBubbleProps } from '../utils/bubbleUtils';

const PanelEditor = ({
  selectedPanel,
  onUpdatePanel,
  onAddTextBox,
  onUpdateTextBox,
  onDeleteTextBox,
  onGenerateImage,
  onUploadImage,
  isGenerating,
  generationProgress
}) => {
  if (!selectedPanel) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">Select a panel to edit</p>
        </div>
      </div>
    );
  }

  // Function to handle text box position change
  const handlePositionChange = (textBoxId, newPosition) => {
    onUpdateTextBox(selectedPanel.id, textBoxId, { position: newPosition });
  };

  // Function to handle text box text change
  const handleTextChange = (textBoxId, newText) => {
    onUpdateTextBox(selectedPanel.id, textBoxId, { text: newText });
  };

  // Function to handle text box selection
  const handleSelectTextBox = (textBoxId) => {
    // This function would be used to select the text box in the parent
    // For now, we're just highlighting it in the bubble component
    console.log(`Selected text box: ${textBoxId}`);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Panel Editor</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => onUpdatePanel({ ...selectedPanel, colSpan: Math.min(5, (selectedPanel.colSpan || 1) + 1) })}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            title="Increase column span"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => onUpdatePanel({ ...selectedPanel, colSpan: Math.max(1, (selectedPanel.colSpan || 1) - 1) })}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            title="Decrease column span"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image Generation/Upload Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3">Panel Image</h3>
        {isGenerating ? (
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white">Generating image...</span>
              <span className="text-gray-400">{generationProgress}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={onGenerateImage}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-300"
            >
              Generate Image
            </button>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={onUploadImage}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-300 cursor-pointer text-center block"
              >
                Upload Image
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Text Bubbles Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-white">Text Bubbles</h3>
          <button
            onClick={() => onAddTextBox(selectedPanel.id)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Add Bubble
          </button>
        </div>
        <div className="space-y-3">
          {selectedPanel.textBoxes?.map((textBox, index) => (
            <div key={textBox.id} className="bg-gray-700 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm">Bubble {index + 1}</span>
                <button
                  onClick={() => onDeleteTextBox(selectedPanel.id, textBox.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <select
                value={textBox.type}
                onChange={(e) => onUpdateTextBox(selectedPanel.id, textBox.id, { type: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm mb-2"
              >
                <option value="speech">Speech</option>
                <option value="thought">Thought</option>
                <option value="whisper">Whisper</option>
                <option value="shout">Shout</option>
              </select>
              <textarea
                value={textBox.text}
                onChange={(e) => onUpdateTextBox(selectedPanel.id, textBox.id, { text: e.target.value })}
                className="w-full bg-gray-800 text-white border border-gray-600 rounded px-2 py-1 text-sm h-20"
                placeholder="Enter text..."
              />
            </div>
          ))}
          {(!selectedPanel.textBoxes || selectedPanel.textBoxes.length === 0) && (
            <div className="text-center text-gray-400 py-4">
              <p>No text bubbles added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Preview</h3>
        <div className="bg-gray-900 p-4 rounded-lg aspect-video relative">
          {selectedPanel.image ? (
            <img
              src={selectedPanel.image}
              alt="Panel preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">No image selected</p>
            </div>
          )}
          {/* Render bubble components with proper props for interaction */}
          {selectedPanel.textBoxes?.map((textBox) => (
            <Bubble
              key={textBox.id}
              {...textBoxToBubbleProps(textBox, {
                onTextChange: (newText) => handleTextChange(textBox.id, newText),
                onPositionChange: (newPosition) => handlePositionChange(textBox.id, newPosition),
                onRemove: () => onDeleteTextBox(selectedPanel.id, textBox.id),
                onSelect: () => handleSelectTextBox(textBox.id),
                selected: false,
                draggable: true,
                editable: true
              })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PanelEditor; 