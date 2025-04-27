declare module 'react';
declare module 'react-native';
declare module 'react-native-safe-area-context';
declare module '@expo/vector-icons';
declare module 'expo-router';

interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  thumbnail?: string;
  imagePath?: string;
}

interface Story {
  id: string;
  title: string;
  pages?: number;
  duration?: string;
  thumbnailUrl: string;
  lastEdited: string;
  type: 'manga' | 'anime';
}

interface FeaturedContent {
  id: string;
  title: string;
  description: string;
  image: string;
  type: string;
  action: () => void;
}

interface RecentCreation {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string;
  createdAt: string;
}

interface QuickAction {
  id: string;
  title: string;
  icon: JSX.Element;
  onPress: () => void;
}

interface CreateOption {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  onPress: () => void;
}

interface UserProfile {
  name: string;
  email: string;
  profilePicture: string | null;
  isPremium: boolean;
}

interface SettingItem {
  icon: JSX.Element;
  title: string;
  description?: string | null;
  rightElement?: JSX.Element | null;
  onPress?: (() => void) | null;
} 