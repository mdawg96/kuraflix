import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Speech bubble component with different visual styles
 * @param {Object} props Component props
 * @param {'speech'|'thought'|'narration'|'yell'} props.type The type of bubble to display
 * @param {string} props.text The text content inside the bubble
 * @param {'left'|'right'|'top'|'bottom'} props.tailPosition Position of the tail/pointer (for speech and thought)
 * @param {string} props.bgColor Background color (tailwind class or hex)
 * @param {string} props.borderColor Border color (tailwind class or hex)
 * @param {string} props.textColor Text color (tailwind class or hex)
 * @param {'sm'|'md'|'lg'|'xl'} props.size Size of the bubble
 * @param {string} props.className Additional classes to add to the bubble
 * @param {boolean} props.draggable Whether the bubble can be dragged
 * @param {boolean} props.editable Whether the text is editable
 * @param {function} props.onRemove Callback when remove button is clicked
 * @param {function} props.onTextChange Callback when text is changed (if editable)
 * @param {function} props.onPositionChange Callback when position is changed (if draggable)
 * @param {Object} props.position Current position {x, y} for draggable bubbles
 * @param {boolean} props.selected Whether the bubble is currently selected
 * @param {function} props.onSelect Callback when the bubble is selected
 * @param {number} props.fontSize Font size for the text
 * @param {number} props.opacity Opacity for the bubble
 * @returns {JSX.Element} The rendered speech bubble
 */
const Bubble = ({ 
  type, 
  text, 
  tailPosition = 'bottom',
  bgColor = 'yellow',
  borderColor = 'black',
  textColor = 'black',
  size = 'md',
  fontSize,
  className = '',
  draggable = false,
  editable = false,
  onRemove,
  onTextChange,
  onPositionChange,
  position = { x: 0, y: 0 },
  selected = false,
  onSelect,
  opacity = 1
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localText, setLocalText] = useState(text);
  const bubbleRef = useRef(null);
  const textRef = useRef(null);
  
  // Update localText when text prop changes
  useEffect(() => {
    setLocalText(text);
  }, [text]);

  // Handle bgColor, borderColor and textColor
  const isBgHex = bgColor.startsWith('#');
  const isBorderHex = borderColor.startsWith('#');
  const isTextHex = textColor.startsWith('#');
  
  const bgColorClass = isBgHex ? '' : (bgColor.includes('bg-') ? bgColor : `bg-${bgColor}`);
  const borderColorClass = isBorderHex ? '' : (borderColor.includes('border-') ? borderColor : `border-${borderColor}`);
  const textColorClass = isTextHex ? '' : (textColor.includes('text-') ? textColor : `text-${textColor}`);
  
  // Base inline styles (excluding background for now)
  const baseInlineStyles = {
    fontSize: fontSize ? `${fontSize}px` : undefined,
    ...(isBorderHex && { borderColor: borderColor }),
    ...(isTextHex && { color: textColor }),
  };
  
  // Style for the tail (needs direct color value)
  const tailBgColor = isBgHex ? bgColor : 'white'; // Default to white if class is used

  // Size mapping
  const sizeClasses = {
    sm: 'max-w-[12rem] text-sm',
    md: 'max-w-xs',
    lg: 'max-w-sm text-lg',
    xl: 'max-w-md text-xl'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    if (!draggable) return;
    
    // Stop propagation to prevent issues with parent elements
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    
    const handleMouseMove = (moveEvent) => {
      moveEvent.stopPropagation();
      const newX = startPosX + (moveEvent.clientX - startX);
      const newY = startPosY + (moveEvent.clientY - startY);
      
      if (onPositionChange) {
        onPositionChange({ 
          x: Math.max(0, newX), 
          y: Math.max(0, newY) 
        });
      }
    };
    
    const handleMouseUp = (upEvent) => {
      upEvent.stopPropagation();
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // When drag ends, also call the select handler to make sure this bubble is selected
      if (onSelect) {
        onSelect();
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  // Handle text change
  const handleTextChange = (e) => {
    e.stopPropagation();
    const newText = e.target.innerText;
    setLocalText(newText);
    if (onTextChange) {
      onTextChange(newText);
    }
  };
  
  // Handle bubble click - for selection
  const handleBubbleClick = (e) => {
    // Stop propagation to prevent the click from reaching parent elements
    e.stopPropagation();
    
    // When clicked, make sure this bubble is selected
    if (onSelect) {
      console.log('Bubble clicked, calling onSelect');
      onSelect();
    }
  };
  
  // Wrapper style for draggable bubbles
  const wrapperStyle = draggable ? {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 50,
    cursor: isDragging ? 'grabbing' : 'grab',
  } : {};
  
  // Base container that wraps the bubble (for dragging)
  const BubbleContainer = ({ children }) => {
    if (draggable) {
      return (
        <div
          ref={bubbleRef}
          className={`${selected ? 'ring-2 ring-anime-pink ring-offset-2' : ''}`}
          style={{
            ...wrapperStyle,
            pointerEvents: 'auto', // Ensure it can receive mouse events
          }}
          onMouseDown={(e) => {
            handleMouseDown(e);
            // Don't propagate to prevent parent handlers from firing
            e.stopPropagation();
          }}
          onClick={(e) => {
            handleBubbleClick(e);
            // Don't propagate to prevent parent handlers from firing
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      );
    }
    
    return <>{children}</>;
  };
  
  // Render different bubble types
  switch (type) {
    case 'speech': {
      // Tail position classes and styles removed as they are handled inline now
      
      // Add background color only for speech bubble type
      const speechInlineStyles = {
        ...baseInlineStyles,
        ...(isBgHex && { backgroundColor: bgColor }),
        '--fallback-bg': 'white' // Add fallback for tail color if needed
      };
      
      // Helper to get tail position class
      const getTailPositionClass = () => {
        switch (tailPosition) {
          case 'bottom': return 'left-6 -bottom-3';
          case 'top': return 'left-6 -top-3';
          case 'left': return 'top-6 -left-3';
          case 'right': return 'top-6 -right-3';
          default: return 'left-6 -bottom-3';
        }
      };

      // Helper to get tail inline styles
      const getTailStyles = () => {
        const borderSize = '12px solid';
        const transparent = 'transparent';
        switch (tailPosition) {
          case 'bottom': 
            return { borderLeft: `${borderSize} ${transparent}`, borderRight: `${borderSize} ${transparent}`, borderTop: `${borderSize} ${tailBgColor}` };
          case 'top': 
            return { borderLeft: `${borderSize} ${transparent}`, borderRight: `${borderSize} ${transparent}`, borderBottom: `${borderSize} ${tailBgColor}` };
          case 'left': 
            return { borderTop: `${borderSize} ${transparent}`, borderBottom: `${borderSize} ${transparent}`, borderRight: `${borderSize} ${tailBgColor}` };
          case 'right': 
            return { borderTop: `${borderSize} ${transparent}`, borderBottom: `${borderSize} ${transparent}`, borderLeft: `${borderSize} ${tailBgColor}` };
          default:
             return { borderLeft: `${borderSize} ${transparent}`, borderRight: `${borderSize} ${transparent}`, borderTop: `${borderSize} ${tailBgColor}` };
        }
      };
      
      return (
        <BubbleContainer>
          <div 
            className={`relative border-2 ${borderColorClass} rounded-xl px-4 py-3 ${sizeClass} ${textColorClass} ${className} ${bgColorClass}`}
            style={speechInlineStyles} 
          >
            {editable ? (
              <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none w-full"
                onBlur={handleTextChange}
                dangerouslySetInnerHTML={{ __html: localText || 'Type here...' }}
              />
            ) : (
              localText || 'Type here...'
            )}
            {/* New tail implementation using inline styles */}
            <div 
              className={`absolute w-0 h-0 ${getTailPositionClass()}`}
              style={getTailStyles()}
            />
          </div>
        </BubbleContainer>
      );
    }

    case 'thought': {
      // Adjust bubble positions based on tail position
      const bubblePositions = {
        bottom: {
          bubble1: "absolute -bottom-2 left-10 h-4 w-4",
          bubble2: "absolute -bottom-5 left-6 h-3 w-3" 
        },
        top: {
          bubble1: "absolute -top-2 left-10 h-4 w-4",
          bubble2: "absolute -top-5 left-6 h-3 w-3"
        },
        left: {
          bubble1: "absolute -left-2 top-10 h-4 w-4",
          bubble2: "absolute -left-5 top-6 h-3 w-3"
        },
        right: {
          bubble1: "absolute -right-2 top-10 h-4 w-4",
          bubble2: "absolute -right-5 top-6 h-3 w-3"
        }
      };
      
      // Thought bubble uses base styles (no inline background on main div)
      const thoughtInlineStyles = baseInlineStyles;
      
      return (
        <BubbleContainer>
          <div 
            className={`relative border-2 ${borderColorClass} rounded-full px-6 py-4 ${sizeClass} ${textColorClass} ${className}`}
            style={{ ...thoughtInlineStyles, backgroundColor: 'transparent' }} 
          >
            {/* Inner div for background color */}
            <div 
              className={`absolute inset-0 rounded-full -z-10 ${bgColorClass}`}
              style={isBgHex ? { backgroundColor: bgColor } : {}}
            ></div>
            
            {/* Editable Text */}
            {editable ? (
              <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none w-full"
                onBlur={handleTextChange}
                dangerouslySetInnerHTML={{ __html: localText || 'Type here...' }}
              />
            ) : (
              localText || 'Type here...'
            )}
            <div className={`absolute border-2 ${borderColorClass} rounded-full ${bubblePositions[tailPosition].bubble1} ${bgColorClass}`} style={isBgHex ? { backgroundColor: bgColor } : {}} />
            <div className={`absolute border-2 ${borderColorClass} rounded-full ${bubblePositions[tailPosition].bubble2} ${bgColorClass}`} style={isBgHex ? { backgroundColor: bgColor } : {}} />
          </div>
        </BubbleContainer>
      );
    }

    case 'narration': {
      // Add background color for narration bubble type
      const narrationInlineStyles = {
        ...baseInlineStyles,
        ...(isBgHex && { backgroundColor: bgColor }),
      };
      
      return (
        <BubbleContainer>
          <div 
            className={`${bgColorClass} border-2 ${borderColorClass} px-4 py-2 ${sizeClass} font-serif italic ${textColorClass} ${className}`}
            style={narrationInlineStyles}
          >
            {editable ? (
              <div
                ref={textRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none w-full"
                onBlur={handleTextChange}
                dangerouslySetInnerHTML={{ __html: localText || 'Type here...' }}
              />
            ) : (
              localText || 'Type here...'
            )}
          </div>
        </BubbleContainer>
      );
    }

    case 'yell': {
      // SVG size based on the size prop
      const svgSizes = {
        sm: "w-[200px] h-[140px]",
        md: "w-[300px] h-[200px]",
        lg: "w-[400px] h-[260px]",
        xl: "w-[500px] h-[320px]"
      };
      
      const svgSizeClass = svgSizes[size] || svgSizes.md;
      
      // Convert color classes/hex to actual colors for SVG
      // Default yell background to white unless a specific HEX color is provided
      let fillColor = 'white';
      if (isBgHex) {
        fillColor = bgColor; // Use hex color if provided via bgColor prop
      }
      // Note: Tailwind classes passed via bgColor will be ignored for the yell fill, keeping it white.
      
      const strokeColor = isBorderHex ? borderColor : 'black'; // Default border to black
      const fillTextColor = isTextHex ? textColor : 'black'; // Default text to black
      
      // Define the jagged points for the polygon
      const points = "10,50 40,20 80,40 120,10 160,40 200,20 240,50 280,90 240,150 200,180 160,160 120,190 80,160 40,180 10,140 0,100";
      
      return (
        <BubbleContainer>
          <svg viewBox="0 0 290 200" className={`${svgSizeClass} ${className}`}>
            <polygon
              points={points}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="4" // Adjust border thickness if needed
            />
            {/* foreignObject allows rendering HTML inside SVG */}
            <foreignObject x="40" y="50" width="210" height="100">
              <div xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: fillTextColor,
                  fontSize: fontSize ? `${fontSize}px` : (size === 'xl' ? "24px" : size === 'lg' ? "22px" : size === 'sm' ? "16px" : "20px"),
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {editable ? (
                  <div
                    ref={textRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="outline-none w-full"
                    onBlur={handleTextChange}
                    dangerouslySetInnerHTML={{ __html: localText || 'Type here...' }}
                  />
                ) : (
                  localText || 'Type here...'
                )}
              </div>
            </foreignObject>
          </svg>
        </BubbleContainer>
      );
    }

    default:
      return null;
  }
};

Bubble.propTypes = {
  type: PropTypes.oneOf(['speech', 'thought', 'narration', 'yell']).isRequired,
  text: PropTypes.string.isRequired,
  tailPosition: PropTypes.oneOf(['left', 'right', 'top', 'bottom']),
  bgColor: PropTypes.string,
  borderColor: PropTypes.string,
  textColor: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  fontSize: PropTypes.number,
  className: PropTypes.string,
  draggable: PropTypes.bool,
  editable: PropTypes.bool,
  onRemove: PropTypes.func,
  onTextChange: PropTypes.func,
  onPositionChange: PropTypes.func,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  }),
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  opacity: PropTypes.number
};

export default Bubble; 