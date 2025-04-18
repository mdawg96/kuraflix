import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const VideoTestPage = () => {
  const [testUrl, setTestUrl] = useState('');
  const [videoUrls, setVideoUrls] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // Try to fetch a list of available videos from the server
    const fetchVideos = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/outputs`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.files)) {
            setVideoUrls(data.files.filter(file => file.endsWith('.mp4')));
          }
        }
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();
  }, [apiBaseUrl]);

  const testVideo = (url) => {
    const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}/outputs/${url}`;
    setTestUrl(fullUrl);
  };

  const checkServerConnection = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health-check`);
      const data = await response.json();
      toast.success(`Server connection: ${data.status || 'OK'}`);
    } catch (error) {
      toast.error(`Server connection failed: ${error.message}`);
    }
  };

  const checkVideoFile = async () => {
    if (!selectedVideo) {
      toast.error("Please select a video first");
      return;
    }
    
    try {
      const response = await fetch(`${apiBaseUrl}/check-video/${selectedVideo}`);
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Video exists: ${data.path}`);
      } else {
        toast.error(`Video not found: ${data.path}`);
      }
    } catch (error) {
      toast.error(`Error checking video: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg my-8">
      <h1 className="text-2xl font-bold text-white mb-6">Video Accessibility Test</h1>
      
      <div className="mb-6">
        <h2 className="text-xl text-white mb-3">Server Connection</h2>
        <button 
          onClick={checkServerConnection}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          Test Server Connection
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl text-white mb-3">Available Videos</h2>
        <div className="flex gap-2 mb-4">
          <select 
            className="flex-1 bg-gray-800 text-white p-2 rounded border border-gray-700"
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
          >
            <option value="">Select a video</option>
            {videoUrls.map(url => (
              <option key={url} value={url}>{url}</option>
            ))}
          </select>
          <button 
            onClick={checkVideoFile}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
            disabled={!selectedVideo}
          >
            Check File
          </button>
          <button 
            onClick={() => testVideo(selectedVideo)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
            disabled={!selectedVideo}
          >
            Test Video
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl text-white mb-3">Custom URL Test</h2>
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-gray-800 text-white p-2 rounded border border-gray-700"
            placeholder="Enter video URL to test"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
          />
          <button 
            onClick={() => testVideo(testUrl)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Test URL
          </button>
        </div>
      </div>
      
      {testUrl && (
        <div className="mb-6">
          <h2 className="text-xl text-white mb-3">Video Test</h2>
          <div className="bg-black p-4 rounded-lg">
            <div className="aspect-video relative rounded overflow-hidden">
              <video
                key={testUrl} // Force remount when URL changes
                src={testUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error("Video error:", e);
                  toast.error(`Error loading video: ${testUrl}`);
                }}
                onLoadedData={() => {
                  console.log("Video loaded successfully:", testUrl);
                  toast.success(`Video loaded successfully: ${testUrl}`);
                }}
              />
            </div>
            <div className="mt-2 text-gray-400 text-sm break-all">
              Testing URL: {testUrl}
            </div>
          </div>
        </div>
      )}
      
      <div className="text-white text-sm">
        <h3 className="font-bold mb-2">Troubleshooting Tips:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Check that your server is running and accessible</li>
          <li>Verify that CORS headers are properly set on the server</li>
          <li>Ensure video file exists in the outputs directory</li>
          <li>Try direct URL access to verify file permissions</li>
          <li>Check browser console for specific error messages</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoTestPage; 