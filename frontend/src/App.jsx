import React, { createContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import StudioPage from './pages/StudioPage';
import CharacterCreatorPage from './pages/CharacterCreatorPage';
import SceneEditorPage from './pages/SceneEditorPage';
import MyStoriesPage from './pages/MyStoriesPage';
import LoginPage from './pages/LoginPage';
import AnimeCreatorPage from './pages/AnimeCreatorPage';
import MangaCreatorPage from './pages/MangaCreatorPage';
import AppleAuthCallback from './pages/AppleAuthCallback';
import AccountSettings from './pages/AccountSettings';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

// Create a context for authentication state for KuraFlix
export const AuthContext = createContext();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoggedIn(!!user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser }}>
      <Router future={{ 
        v7_relativeSplatPath: true,
        v7_startTransition: true 
      }}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/character-creator" element={<CharacterCreatorPage />} />
              <Route path="/scene-editor" element={<SceneEditorPage />} />
              <Route path="/my-stories" element={<MyStoriesPage />} />
              <Route path="/my-stories/:tab" element={<MyStoriesPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/manga-studio" element={<MangaCreatorPage />} />
              <Route path="/anime-studio" element={<AnimeCreatorPage />} />
              <Route path="/apple-auth-callback" element={<AppleAuthCallback />} />
              <Route path="/account-settings" element={<AccountSettings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App; 