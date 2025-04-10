import React, { useState } from 'react';
import Bubble from './Bubble';

const BubbleDemo = () => {
  // State for draggable bubbles
  const [bubbles, setBubbles] = useState([
    { 
      id: 1, 
      type: 'speech', 
      text: 'I can be dragged around!', 
      position: { x: 50, y: 50 },
      tailPosition: 'bottom',
      selected: false
    },
    { 
      id: 2, 
      type: 'thought', 
      text: 'Hmm... this is a draggable thought bubble', 
      position: { x: 350, y: 80 },
      tailPosition: 'left',
      selected: false 
    },
    { 
      id: 3, 
      type: 'narration', 
      text: 'This narration box can be edited and moved around.', 
      position: { x: 100, y: 180 },
      selected: false 
    }
  ]);
  
  // Add a new bubble
  const addBubble = (type) => {
    const newBubble = {
      id: Date.now(),
      type: type,
      text: `New ${type} bubble`,
      position: { x: 150, y: 250 },
      tailPosition: 'bottom',
      selected: false
    };
    setBubbles([...bubbles, newBubble]);
  };
  
  // Update bubble position
  const updateBubblePosition = (id, newPosition) => {
    setBubbles(
      bubbles.map(bubble => 
        bubble.id === id ? { ...bubble, position: newPosition } : bubble
      )
    );
  };
  
  // Update bubble text
  const updateBubbleText = (id, newText) => {
    setBubbles(
      bubbles.map(bubble => 
        bubble.id === id ? { ...bubble, text: newText } : bubble
      )
    );
  };
  
  // Remove a bubble
  const removeBubble = (id) => {
    setBubbles(bubbles.filter(bubble => bubble.id !== id));
  };
  
  // Select a bubble
  const selectBubble = (id) => {
    setBubbles(
      bubbles.map(bubble => 
        bubble.id === id ? { ...bubble, selected: true } : { ...bubble, selected: false }
      )
    );
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold mb-6">Speech Bubble Examples</h2>
      
      <div className="space-y-16">
        {/* Basic Examples */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Basic Bubbles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h4 className="font-medium mb-2">Speech Bubble</h4>
              <Bubble type="speech" text="Hey there! This is a regular speech bubble." />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Thought Bubble</h4>
              <Bubble type="thought" text="Hmm... I wonder what I should say next?" />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Narration Box</h4>
              <Bubble type="narration" text="Later that day, our hero encountered a mysterious stranger..." />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Yell Bubble</h4>
              <Bubble type="yell" text="WAIT, STOP RIGHT THERE!" />
            </div>
          </div>
        </div>
        
        {/* Customizing Tail Position */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Tail Position Variations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h4 className="font-medium mb-2">Bottom Tail (Default)</h4>
              <Bubble type="speech" text="The tail is at the bottom" tailPosition="bottom" />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Top Tail</h4>
              <Bubble type="speech" text="The tail is at the top" tailPosition="top" />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Left Tail</h4>
              <Bubble type="speech" text="The tail is on the left" tailPosition="left" />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Right Tail</h4>
              <Bubble type="speech" text="The tail is on the right" tailPosition="right" />
            </div>
          </div>
        </div>
        
        {/* Color Customization */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Color Customization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h4 className="font-medium mb-2">Custom Colors (Tailwind)</h4>
              <Bubble 
                type="speech" 
                text="Using Tailwind color classes" 
                bgColor="blue-100"
                borderColor="blue-500"
                textColor="blue-800"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Custom Colors (Hex)</h4>
              <Bubble 
                type="speech" 
                text="Using hex color values" 
                bgColor="#f8e8ff"
                borderColor="#9c4dff"
                textColor="#5b068a"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Styled Thought Bubble</h4>
              <Bubble 
                type="thought" 
                text="Creative thoughts..." 
                bgColor="yellow-100"
                borderColor="orange-500"
                textColor="orange-800"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Styled Yell Bubble</h4>
              <Bubble 
                type="yell" 
                text="DANGER!" 
                bgColor="#ffdddd"
                borderColor="#ff0000"
                textColor="#aa0000"
              />
            </div>
          </div>
        </div>
        
        {/* Size Variations */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Size Variations</h3>
          <div className="space-y-8">
            <div>
              <h4 className="font-medium mb-2">Small (sm)</h4>
              <Bubble 
                type="speech" 
                text="This is a small bubble" 
                size="sm"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Medium (md - default)</h4>
              <Bubble 
                type="speech" 
                text="This is a medium bubble" 
                size="md"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Large (lg)</h4>
              <Bubble 
                type="speech" 
                text="This is a large bubble with more text that will wrap to multiple lines" 
                size="lg"
              />
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Extra Large (xl)</h4>
              <Bubble 
                type="speech" 
                text="This is an extra large bubble with even more text that will wrap to multiple lines to demonstrate the size difference" 
                size="xl"
              />
            </div>
          </div>
        </div>
        
        {/* Interactive Draggable and Editable Bubbles */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Interactive Bubbles</h3>
          <p className="mb-4 text-gray-600">
            Drag the bubbles around and click on them to edit the text. They can be selected and deleted too.
          </p>
          
          <div className="p-4 bg-gray-100 rounded-lg border border-gray-300 h-96 relative overflow-hidden">
            {/* Draggable Bubbles */}
            {bubbles.map(bubble => (
              <Bubble 
                key={bubble.id}
                type={bubble.type}
                text={bubble.text}
                tailPosition={bubble.tailPosition || "bottom"}
                draggable={true}
                editable={true}
                position={bubble.position}
                onPositionChange={(newPosition) => updateBubblePosition(bubble.id, newPosition)}
                onTextChange={(newText) => updateBubbleText(bubble.id, newText)}
                onRemove={() => removeBubble(bubble.id)}
                selected={bubble.selected}
                onSelect={() => selectBubble(bubble.id)}
              />
            ))}
            
            {/* Controls for adding bubbles */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <button 
                onClick={() => addBubble('speech')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-full shadow-md transition-colors"
                title="Add Speech Bubble"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => addBubble('thought')}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-full shadow-md transition-colors"
                title="Add Thought Bubble"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                </svg>
              </button>
              <button 
                onClick={() => addBubble('narration')}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-full shadow-md transition-colors"
                title="Add Narration Box"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={() => addBubble('yell')}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-full shadow-md transition-colors"
                title="Add Yell Bubble"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-12 p-6 border border-gray-300 rounded-lg bg-gray-50">
        <h3 className="font-medium mb-4">How to Use:</h3>
        <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
          {`import { Bubble } from './components';

// Basic usage:
<Bubble type="speech" text="Hey there!" />

// With custom options:
<Bubble 
  type="speech" 
  text="Custom bubble" 
  tailPosition="right" 
  bgColor="blue-100"
  borderColor="blue-500"
  textColor="blue-800"
  size="lg"
  className="shadow-lg"
/>

// Interactive draggable/editable bubble:
<Bubble 
  type="speech"
  text="Drag me around and edit me!"
  draggable={true}
  editable={true}
  position={{ x: 100, y: 100 }}
  onPositionChange={(newPosition) => handlePositionChange(newPosition)}
  onTextChange={(newText) => handleTextChange(newText)}
  onRemove={() => handleRemove()}
  selected={isSelected}
  onSelect={() => handleSelect()}
/>`}
        </pre>
      </div>
    </div>
  );
};

export default BubbleDemo; 