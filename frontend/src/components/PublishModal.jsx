import React from 'react';

const PublishModal = ({ 
  storyTitle, 
  setStoryTitle, 
  author, 
  setAuthor, 
  genre, 
  setGenre, 
  description, 
  setDescription, 
  onPublish, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-11/12 max-w-lg border-2 border-anime-indigo/30 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-manga-dots bg-[size:10px_10px]"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-manga text-white tracking-wide">
              <span className="text-anime-pink">Publish</span> <span className="text-anime-indigo">Manga</span>
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
              <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-anime-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Story Title
              </label>
              <input
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                placeholder="Enter your manga title..."
              />
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
              <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-anime-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
                placeholder="Your name or pen name..."
              />
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
              <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-manga-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Genre
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic"
              >
                <option value="">Select Genre</option>
                <option value="Action">Action</option>
                <option value="Adventure">Adventure</option>
                <option value="Comedy">Comedy</option>
                <option value="Drama">Drama</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Horror">Horror</option>
                <option value="Romance">Romance</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Slice of Life">Slice of Life</option>
                <option value="Sports">Sports</option>
                <option value="Supernatural">Supernatural</option>
              </select>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 shadow-inner">
              <label className="block text-gray-300 text-sm font-comic mb-2 flex items-center">
                <svg className="w-5 h-5 mr-2 text-manga-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-700 border border-anime-indigo/30 rounded-lg px-3 py-2 text-white focus:border-anime-pink focus:ring-1 focus:ring-anime-pink font-comic h-24 resize-none"
                placeholder="Write a brief description of your manga story..."
              ></textarea>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              onClick={onClose}
              className="manga-btn bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg"
            >
              Cancel
            </button>
            <button 
              onClick={onPublish}
              className="manga-btn bg-gradient-to-r from-anime-indigo to-anime-pink text-white rounded-lg shadow-manga hover:shadow-manga-lg transform hover:scale-105 transition-all duration-200"
              disabled={!storyTitle || !author || !genre || !description}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishModal; 