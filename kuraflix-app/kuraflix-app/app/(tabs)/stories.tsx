import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function StoriesScreen() {
  const [activeTab, setActiveTab] = useState('manga');
  
  // Mock data - replace with API calls in production
  const mangaStories = [
    {
      id: '1',
      title: 'Hero Academy',
      pages: 12,
      thumbnailUrl: 'https://via.placeholder.com/160x240',
      lastEdited: '2 days ago'
    },
    {
      id: '2',
      title: 'Mystic Legends',
      pages: 24,
      thumbnailUrl: 'https://via.placeholder.com/160x240',
      lastEdited: '1 week ago'
    }
  ];
  
  const animeStories = [
    {
      id: '1',
      title: 'Shadow Realm',
      duration: '3:45',
      thumbnailUrl: 'https://via.placeholder.com/160x240',
      lastEdited: 'Yesterday'
    }
  ];

  const renderMangaStories = () => {
    if (mangaStories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="book-open-variant" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No manga stories yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start by creating your first manga story
          </Text>
          <TouchableOpacity style={styles.emptyStateButton}>
            <Text style={styles.emptyStateButtonText}>Create Manga</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.storiesGrid}>
        {mangaStories.map(story => (
          <TouchableOpacity key={story.id} style={styles.storyCard}>
            <Image 
              source={{ uri: story.thumbnailUrl }} 
              style={styles.storyThumbnail} 
            />
            <View style={styles.storyInfo}>
              <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
              <Text style={styles.storyMeta}>{story.pages} pages</Text>
              <Text style={styles.storyLastEdited}>Edited {story.lastEdited}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.createCard}>
          <View style={styles.createCardContent}>
            <MaterialIcons name="add" size={40} color="#6366f1" />
            <Text style={styles.createCardText}>Create New Manga</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAnimeStories = () => {
    if (animeStories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="movie" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No anime stories yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start by creating your first anime story
          </Text>
          <TouchableOpacity style={styles.emptyStateButton}>
            <Text style={styles.emptyStateButtonText}>Create Anime</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.storiesGrid}>
        {animeStories.map(story => (
          <TouchableOpacity key={story.id} style={styles.storyCard}>
            <Image 
              source={{ uri: story.thumbnailUrl }} 
              style={styles.storyThumbnail} 
            />
            <View style={styles.storyInfo}>
              <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
              <Text style={styles.storyMeta}>{story.duration}</Text>
              <Text style={styles.storyLastEdited}>Edited {story.lastEdited}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity style={styles.createCard}>
          <View style={styles.createCardContent}>
            <MaterialIcons name="add" size={40} color="#6366f1" />
            <Text style={styles.createCardText}>Create New Anime</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Stories</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'manga' && styles.activeTab]}
          onPress={() => setActiveTab('manga')}
        >
          <MaterialCommunityIcons 
            name="book-open-variant" 
            size={24} 
            color={activeTab === 'manga' ? '#6366f1' : '#9ca3af'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'manga' && styles.activeTabText
          ]}>Manga</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'anime' && styles.activeTab]}
          onPress={() => setActiveTab('anime')}
        >
          <MaterialIcons 
            name="movie" 
            size={24} 
            color={activeTab === 'anime' ? '#6366f1' : '#9ca3af'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'anime' && styles.activeTabText
          ]}>Anime</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {activeTab === 'manga' ? renderMangaStories() : renderAnimeStories()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  activeTab: {
    backgroundColor: '#374151',
  },
  tabText: {
    color: '#9ca3af',
    fontWeight: '600',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#6366f1',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  storiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storyCard: {
    width: '48%',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  storyThumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#374151',
  },
  storyInfo: {
    padding: 12,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  storyMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  storyLastEdited: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  createCard: {
    width: '48%',
    height: 240,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    borderStyle: 'dashed',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCardText: {
    marginTop: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 48,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
}); 