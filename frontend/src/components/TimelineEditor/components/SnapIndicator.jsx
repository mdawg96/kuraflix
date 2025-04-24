import React from 'react';

/**
 * Visual indicator for snap points when dragging clips
 */
const SnapIndicator = ({ position, type }) => {
  // Different styling based on snap type
  const getBackgroundColor = () => {
    if (type === 'start') return 'bg-green-400';
    if (type === 'end') return 'bg-blue-400';
    if (type === 'time') return 'bg-purple-400';
    return 'bg-yellow-400';
  };
  
  const getLabel = () => {
    if (type === 'start') return 'Start';
    if (type === 'end') return 'End';
    if (type === 'time') return '';
    return 'Snap';
  };
  
  return (
    <div
      className={`absolute h-full w-0.5 ${getBackgroundColor()} z-10`}
      style={{
        left: `${position}px`,
        pointerEvents: 'none',
      }}
    >
      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 px-1 py-0.5 rounded text-xs text-white bg-gray-800">
        {getLabel()}
      </div>
    </div>
  );
};

export default SnapIndicator; 