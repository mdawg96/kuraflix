import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function CharactersScreen() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Placeholder data - replace with actual API call in production
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCharacters([
        { id: '1', name: 'Naruto', description: 'A young ninja with dreams of becoming Hokage', imageUrl: 'https://via.placeholder.com/100' },
        { id: '2', name: 'Sasuke', description: 'A skilled ninja seeking revenge', imageUrl: 'https://via.placeholder.com/100' },
        { id: '3', name: 'Sakura', description: 'A medical ninja with incredible strength', imageUrl: 'https://via.placeholder.com/100' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreateCharacter = () => {
    // Navigate to character creation screen 
    console.log('Create character pressed');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Characters</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading characters...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Characters</Text>
        <TouchableOpacity onPress={handleCreateCharacter} style={styles.createButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {characters.length > 0 ? (
          characters.map(character => (
            <TouchableOpacity key={character.id} style={styles.characterCard}>
              <Image 
                source={{ uri: character.imageUrl }} 
                style={styles.characterImage} 
              />
              <View style={styles.characterInfo}>
                <Text style={styles.characterName}>{character.name}</Text>
                <Text style={styles.characterDescription} numberOfLines={2}>
                  {character.description}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="person-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No characters yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by creating your first character
            </Text>
            <TouchableOpacity 
              onPress={handleCreateCharacter}
              style={styles.emptyStateButton}
            >
              <Text style={styles.emptyStateButtonText}>Create Character</Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  characterCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  characterImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  characterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  characterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  characterDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 16,
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