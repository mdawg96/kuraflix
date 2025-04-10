import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import StudioPage from './pages/StudioPage';
import CharacterCreatorPage from './pages/CharacterCreatorPage';
import CharacterLibraryPage from './pages/CharacterLibraryPage';
import SceneEditorPage from './pages/SceneEditorPage';
import MyStoriesPage from './pages/MyStoriesPage';
import LoginPage from './pages/LoginPage';
import AnimeCreatorPage from './pages/AnimeCreatorPage';
import MangaCreatorPage from './pages/MangaCreatorPage';
import AccountSettings from './pages/AccountSettings';
import { BubbleDemo } from './components';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
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
              <Route path="/character-library" element={<CharacterLibraryPage />} />
              <Route path="/scene-editor" element={<SceneEditorPage />} />
              <Route path="/my-stories" element={<MyStoriesPage />} />
              <Route path="/my-stories/:tab" element={<MyStoriesPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/manga-studio" element={<MangaCreatorPage />} />
              <Route path="/anime-studio" element={<AnimeCreatorPage />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="/bubble-demo" element={<BubbleDemo />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 