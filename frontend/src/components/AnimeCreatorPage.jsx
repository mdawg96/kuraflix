const handleImageUpload = (file) => {
  console.log('Handling image upload in AnimeCreatorPage:', file);
  
  if (!selectedClip || !file) {
    console.error('Cannot upload image: No clip selected or no file provided');
    return;
  }
  
  try {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('File read successfully:', file.name);
        const imageData = e.target.result;
        
        // Create an Image object to verify the image loads correctly
        const img = new Image();
        
        img.onload = () => {
          console.log('Image loaded successfully:', file.name);
          
          const updatedClip = {
            ...selectedClip,
            backgroundImage: imageData
          };
          
          setProjects(prevProjects => {
            return prevProjects.map(project => {
              if (project.id === selectedProject.id) {
                const updatedClips = project.clips.map(clip => 
                  clip.id === selectedClip.id ? updatedClip : clip
                );
                return { ...project, clips: updatedClips };
              }
              return project;
            });
          });
          
          setSelectedClip(updatedClip);
          toast.success('Background image updated successfully!');
        };
        
        img.onerror = () => {
          console.error('Failed to load the uploaded image:', file.name);
          // Provide a fallback data URL - a gray placeholder with text
          const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNTAwIDMwMCI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiM1NTU1NTUiLz48dGV4dCB4PSIyNTAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSI+QmFja2dyb3VuZCBJbWFnZTwvdGV4dD48L3N2Zz4=';
          
          const updatedClip = {
            ...selectedClip,
            backgroundImage: fallbackImage
          };
          
          setProjects(prevProjects => {
            return prevProjects.map(project => {
              if (project.id === selectedProject.id) {
                const updatedClips = project.clips.map(clip => 
                  clip.id === selectedClip.id ? updatedClip : clip
                );
                return { ...project, clips: updatedClips };
              }
              return project;
            });
          });
          
          setSelectedClip(updatedClip);
          toast.warning('Could not load the image. Using a placeholder instead.');
        };
        
        img.src = imageData;
      } catch (error) {
        console.error('Error processing image data:', error);
        toast.error('Failed to process the image. Please try again.');
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast.error('Failed to read the file. Please try again.');
    };
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Error in handleImageUpload:', error);
    toast.error('An unexpected error occurred. Please try again.');
  }
}; 