import React from 'react';
import { Link } from 'react-router-dom';

const StudioPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
          Creative Studio
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-400 sm:mt-4">
          Choose your preferred creation tool
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manga Studio Card - Positioned first */}
        <div className="card hover:border-blue-500 transition-all duration-200">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 h-48 flex items-center justify-center rounded-t-xl">
            <svg className="w-24 h-24 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-3">Manga Studio</h2>
            <p className="text-gray-400 mb-6">
              Design manga panels, create multi-page stories, add speech bubbles and thought bubbles, and position your characters in dynamic scenes. Perfect for manga creators of all levels.
            </p>
            <div className="mt-4 flex justify-end">
              <Link 
                to="/manga-studio" 
                className="btn-primary"
              >
                Enter Manga Studio
              </Link>
            </div>
          </div>
        </div>

        {/* Anime Studio Card - Positioned second */}
        <div className="card hover:border-blue-500 transition-all duration-200">
          <div className="bg-gradient-to-r from-blue-900 to-teal-900 h-48 flex items-center justify-center rounded-t-xl">
            <svg className="w-24 h-24 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-3">Anime Studio</h2>
            <p className="text-gray-400 mb-6">
              Create animated scenes with your custom characters, design fluid transitions, and build complete episodes. Our tools make anime production accessible to everyone.
            </p>
            <div className="mt-4 flex justify-end">
              <Link 
                to="/anime-studio" 
                className="btn-primary"
              >
                Enter Anime Studio
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Need to create characters first?</h2>
        <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
          Before diving into your manga or anime creation, you might want to design some characters.
        </p>
        <Link 
          to="/character-creator" 
          className="btn-secondary inline-block"
        >
          Go to Character Creator
        </Link>
      </div>
    </div>
  );
};

export default StudioPage; 