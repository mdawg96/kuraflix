// Helper function to handle various image path formats
export const getImageUrl = (imagePath) => {
  // Return placeholder if no image path provided
  if (!imagePath) {
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2hhcjwvdGV4dD48L3N2Zz4=";
  }
  
  try {
    // If already a data URL, use it directly
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    // If already a full URL, use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Handle Firebase storage URLs
    if (imagePath.includes('firebasestorage.googleapis.com')) {
      return imagePath;
    }
    
    // Clean any leading slashes
    const cleanPath = imagePath.startsWith('./') 
      ? imagePath.slice(2) 
      : imagePath.startsWith('/') 
        ? imagePath.slice(1) 
        : imagePath;
    
    // For all other relative paths, try to resolve from current domain
    return `/${cleanPath}`;
  } catch (error) {
    console.error('Error processing image URL, using fallback:', error);
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj48cmVjdCB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIGZpbGw9IiM2NjYiLz48dGV4dCB4PSIyNSIgeT0iMzAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RXJyb3I8L3RleHQ+PC9zdmc+";
  }
}; 