import React, { useState, useEffect } from 'react';

const ImageGenerationProgress = ({ jobId, onComplete }) => {
  const [status, setStatus] = useState('queued');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [placeholderShown, setPlaceholderShown] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    // Immediately show progress to the user
    const quickProgressUpdates = [
      { progress: 10, delay: 500 },
      { progress: 25, delay: 1500 },
      { progress: 40, delay: 3000 }
    ];
    
    // Set up timers for quick visual progress
    const progressTimers = quickProgressUpdates.map(update => {
      return setTimeout(() => {
        if (status !== 'completed' && status !== 'failed') {
          setProgress(prev => Math.max(prev, update.progress));
        }
      }, update.delay);
    });

    // Show placeholder immediately to give user immediate feedback
    setPlaceholderShown(true);
    
    const checkStatus = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiBaseUrl}/api/generate-manga-panel/status/${jobId}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.message);
          return;
        }

        // Only update status if the API reports a higher progress
        setStatus(data.state);
        if (data.progress > progress) {
          setProgress(data.progress || 0);
        }

        if (data.state === 'completed' && data.result) {
          // Clear all timers when complete
          progressTimers.forEach(clearTimeout);
          setProgress(100);
          onComplete?.(data.result);
        } else if (data.state === 'completed' && !data.result) {
          // Handle case where completion happened but no result data is available
          progressTimers.forEach(clearTimeout);
          setStatus('completed');
          setProgress(100);
          onComplete?.({});
        } else if (data.state === 'failed') {
          progressTimers.forEach(clearTimeout);
          setError('Image generation failed. Please try again.');
        } else if (data.state !== 'completed' && data.state !== 'failed') {
          // Continue polling if not completed or failed
          setTimeout(checkStatus, 2000);
        }
      } catch (err) {
        setError('Failed to check generation status');
        console.error('Status check error:', err);
      }
    };

    checkStatus();

    return () => {
      progressTimers.forEach(clearTimeout);
    };
  }, [jobId, onComplete, status, progress]);

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Generation Complete!';
      case 'failed':
        return 'Generation Failed';
      case 'active':
        return 'Generating Image...';
      case 'queued':
        return 'Queued';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Image Generation</h3>
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
      </div>

      {error ? (
        <div className="text-red-500 text-sm mb-4">{error}</div>
      ) : (
        <>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="flex justify-between text-sm text-gray-300">
            <span>{getStatusText()}</span>
            <span>{progress}%</span>
          </div>
        </>
      )}

      {status === 'completed' && (
        <div className="mt-4 text-green-400 text-sm">
          Your image is ready! You can find it in your gallery.
        </div>
      )}
    </div>
  );
};

export default ImageGenerationProgress; 