/**
 * Utilities for working with speech bubbles in the manga creator
 */

/**
 * Convert a textBox object from the MangaCreatorPage to Bubble component props
 * @param {Object} textBox The textBox object from MangaCreatorPage
 * @param {Object} options Additional options for the conversion
 * @returns {Object} Props object for the Bubble component
 */
export const textBoxToBubbleProps = (textBox, options = {}) => {
  if (!textBox) return null;
  
  const {
    onTextChange,
    onPositionChange,
    onRemove,
    onSelect,
    selected = false,
  } = options;
  
  // Map the textBox type to Bubble type
  const type = textBox.type === 'speech' || textBox.type === 'thought' || textBox.type === 'narration' || textBox.type === 'yell'
    ? textBox.type 
    : 'speech';
  
  // Extract style properties
  const style = textBox.style || {};
  
  // Determine approximate size based on fontSize and width (can be kept for default)
  let sizeProp = 'md';
  if (style.fontSize && style.width) {
    if (style.fontSize <= 12 && style.width <= 120) {
      sizeProp = 'sm';
    } else if (style.fontSize >= 18 && style.width >= 200) {
      sizeProp = 'lg';
    } else if (style.fontSize >= 22 && style.width >= 250) {
      sizeProp = 'xl';
    }
  }
  
  // Determine tail position - default to bottom if not specified
  const tailPosition = textBox.tailPosition || 'bottom';
  
  // Map colors - use defaults if not present in style
  const bgColor = style.backgroundColor || 'white';
  const textColor = style.color || 'black';
  const borderColor = style.borderColor || 'black'; // Use style.borderColor if available
  
  // Get other style properties directly
  const fontSize = style.fontSize;
  const bold = style.bold;
  const italic = style.italic;
  
  // We need to ensure the position is properly set
  const position = textBox.position || { x: 100, y: 100 };
  
  // Build className dynamically
  let classNames = [];
  if (italic) classNames.push('italic');
  if (bold) classNames.push('font-bold'); // Add font-bold for boldness
  
  return {
    type,
    text: textBox.text || '',
    position,
    bgColor,
    textColor,
    borderColor, // Pass potentially updated border color
    size: sizeProp, // Continue using derived size for layout
    tailPosition,
    // Pass style props directly if Bubble component supports them
    // OR construct style object/className as needed by Bubble
    fontSize, // Pass fontSize
    // opacity,  // Pass opacity // Removed
    // Bold is handled via className now
    className: classNames.join(' '), // Combine class names
    draggable: true,
    editable: true,
    selected,
    onTextChange,
    onPositionChange,
    onRemove,
    onSelect,
  };
};

/**
 * Convert Bubble component props to a textBox object for MangaCreatorPage
 * @param {Object} bubbleProps The Bubble component props
 * @param {string} id The ID to assign to the textBox (or generate one if not provided)
 * @returns {Object} TextBox object compatible with MangaCreatorPage
 */
export const bubblePropsToTextBox = (bubbleProps, id = null) => {
  const {
    type = 'speech',
    text = '',
    position = { x: 100, y: 100 },
    bgColor = 'white',
    textColor = 'black',
    tailPosition = 'bottom',
    size = 'md',
    className = '',
  } = bubbleProps;
  
  // Determine font size based on size prop
  let fontSize = 14; // Default (md)
  if (size === 'sm') fontSize = 12;
  if (size === 'lg') fontSize = 18;
  if (size === 'xl') fontSize = 22;
  
  // Determine width based on size prop
  let width = 150; // Default (md)
  if (size === 'sm') width = 120;
  if (size === 'lg') width = 200;
  if (size === 'xl') width = 250;
  
  // Determine if italic based on className
  const italic = className && className.includes('italic');
  
  return {
    id: id || Date.now().toString(),
    type,
    text,
    position,
    tailPosition,
    style: {
      fontSize,
      bold: false,
      italic,
      color: textColor,
      backgroundColor: bgColor,
      borderRadius: type === 'speech' ? '50%' : type === 'thought' ? '50%' : '5px',
      padding: 10,
      width,
      height: 'auto'
    }
  };
};

/**
 * Create a new text box configuration with default values
 * @param {'speech'|'thought'|'narration'|'yell'} type The type of text box
 * @param {Object} options Additional options for the text box
 * @returns {Object} A new text box configuration object
 */
export const createTextBox = (type = 'speech', options = {}) => {
  const {
    text = '',
    position = { x: 100, y: 100 },
    tailPosition = 'bottom',
  } = options;
  
  return bubblePropsToTextBox({
    type,
    text,
    position,
    tailPosition,
    bgColor: type === 'yell' ? '#FFFF00' : 'white',
    textColor: type === 'yell' ? '#000000' : 'black',
    size: 'md',
  });
};

/**
 * Add a yell (explosion) bubble type to the text box types
 * This helps bridge the gap between our new Bubble component (which has 'yell' type)
 * and the existing MangaCreatorPage which only has speech, thought, and narration
 * @param {Object} textBox The text box to convert to a yell bubble
 * @returns {Object} A text box configured as a yell bubble
 */
export const convertToYellBubble = (textBox) => {
  return {
    ...textBox,
    type: 'yell',
    style: {
      ...textBox.style,
      backgroundColor: '#ffdddd',
      color: '#aa0000',
      borderRadius: '0px', // No border radius for explosion bubbles
      padding: 15,
      width: 200,
    }
  };
}; 