import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { logOut } from '../firebase/auth';

const Navbar = () => {
  const { isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser } = useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the create menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setIsCreateMenuOpen(false);
      }
      
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [createMenuRef, userMenuRef]);

  const handleLogout = async () => {
    try {
      await logOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setIsUserMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  // Helper function to check if a path is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Helper function to check if Characters path is active
  const isCharactersActive = () => {
    return location.pathname === '/character-creator' || 
      location.pathname.includes('/my-stories/characters') ||
      (location.pathname === '/login' && ['/character-creator'].includes(sessionStorage.getItem('intendedPath')));
  };

  // Helper function to check if My Stories path is active
  const isStoriesActive = () => {
    return location.pathname === '/my-stories' || 
      (location.pathname === '/login' && ['/my-stories'].includes(sessionStorage.getItem('intendedPath')));
  };

  // Helper function to check if a create submenu item is active
  const isCreateActive = () => {
    return ['/anime-studio', '/manga-studio'].includes(location.pathname);
  };

  // Helper function to check if Studio path is active
  const isStudioActive = () => {
    return location.pathname === '/studio';
  };

  // Handle Characters link click
  const handleCharactersClick = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('intendedPath', '/character-creator');
    }
    setIsMenuOpen(false);
  };

  // Handle My Stories link click
  const handleStoriesClick = () => {
    if (!isLoggedIn) {
      sessionStorage.setItem('intendedPath', '/my-stories');
    }
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-blue-500">KuraFlix</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <Link 
                to="/" 
                className={`${isActive('/') ? 'text-blue-400' : 'text-white hover:text-blue-400'} px-3 py-2 text-sm font-medium`}
              >
                Home
              </Link>
              
              {/* Create dropdown */}
              <div className="relative" ref={createMenuRef}>
                <button 
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className={`${isCreateActive() ? 'text-blue-400' : 'text-white hover:text-blue-400'} px-3 py-2 text-sm font-medium flex items-center`}
                >
                  Studio
                  <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                {isCreateMenuOpen && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                      <Link 
                        to="/manga-studio" 
                        className={`block px-4 py-2 text-sm ${isActive('/manga-studio') ? 'text-blue-400' : 'text-gray-200 hover:bg-gray-800 hover:text-blue-400'}`}
                        onClick={() => setIsCreateMenuOpen(false)}
                      >
                        Manga
                      </Link>
                      <Link 
                        to="/anime-studio" 
                        className={`block px-4 py-2 text-sm ${isActive('/anime-studio') ? 'text-blue-400' : 'text-gray-200 hover:bg-gray-800 hover:text-blue-400'}`}
                        onClick={() => setIsCreateMenuOpen(false)}
                      >
                        Anime
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              <Link 
                to={isLoggedIn ? "/character-creator" : "/login"} 
                className={`${isCharactersActive() ? 'text-blue-400' : 'text-white hover:text-blue-400'} px-3 py-2 text-sm font-medium`}
                onClick={handleCharactersClick}
              >
                Characters
              </Link>
              
              <Link 
                to={isLoggedIn ? "/my-stories" : "/login"} 
                className={`${isStoriesActive() ? 'text-blue-400' : 'text-white hover:text-blue-400'} px-3 py-2 text-sm font-medium`}
                onClick={handleStoriesClick}
              >
                My Stories
              </Link>
            </div>
          </div>
          
          {/* Auth Buttons */}
          <div className="hidden md:flex items-center ml-4">
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button 
                  className="flex items-center text-gray-300 hover:text-white focus:outline-none"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <span className="mr-2">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}</span>
                  <svg className={`h-5 w-5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg z-10">
                    <Link 
                      to="/account-settings"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Account Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="px-4 py-2 border border-blue-500 rounded-md text-sm font-medium text-blue-500 hover:bg-blue-500 hover:text-white transition duration-150 ease-in-out"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none"
            >
              <svg
                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden bg-black border-b border-gray-800`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/"
            className={`block px-3 py-2 rounded-md ${isActive('/') ? 'text-blue-400' : 'text-white hover:bg-blue-900 hover:text-white'}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          
          {/* Create options */}
          <div className="px-3 py-2">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Studio</p>
            <Link
              to="/anime-studio"
              className={`block px-3 py-2 rounded-md ${isActive('/anime-studio') ? 'text-blue-400' : 'text-white hover:bg-blue-900 hover:text-white'} ml-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Anime
            </Link>
            <Link
              to="/manga-studio"
              className={`block px-3 py-2 rounded-md ${isActive('/manga-studio') ? 'text-blue-400' : 'text-white hover:bg-blue-900 hover:text-white'} ml-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Manga
            </Link>
          </div>
          
          <Link
            to={isLoggedIn ? "/character-creator" : "/login"}
            className={`block px-3 py-2 rounded-md ${isCharactersActive() ? 'text-blue-400' : 'text-white hover:bg-blue-900 hover:text-white'}`}
            onClick={handleCharactersClick}
          >
            Characters
          </Link>
          
          <Link
            to={isLoggedIn ? "/my-stories" : "/login"}
            className={`block px-3 py-2 rounded-md ${isStoriesActive() ? 'text-blue-400' : 'text-white hover:bg-blue-900 hover:text-white'}`}
            onClick={handleStoriesClick}
          >
            My Stories
          </Link>
        </div>
        
        {/* User section for Mobile */}
        {isLoggedIn ? (
          <div className="px-3 py-2 border-t border-gray-700">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Account</p>
            <div className="flex flex-col space-y-2">
              <span className="text-gray-300 text-sm py-2">
                Hello, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
              </span>
              <Link
                to="/account-settings"
                className="block px-3 py-2 rounded-md text-white hover:bg-blue-900 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                Account Settings
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-blue-900 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 flex flex-col space-y-3">
            <Link
              to="/login"
              className="px-4 py-2 border border-blue-500 rounded-md text-sm font-medium text-blue-500 hover:bg-blue-500 hover:text-white transition duration-150 ease-in-out"
              onClick={() => setIsMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 