import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CreateScreen() {
  const createOptions = [
    { 
      id: 'character', 
      title: 'Character', 
      description: 'Create a new character with AI', 
      icon: <MaterialIcons name="person" size={32} color="#6366f1" />,
      onPress: () => console.log('Create character pressed') 
    },
    { 
      id: 'image', 
      title: 'Image Generation', 
      description: 'Generate images with AI', 
      icon: <MaterialIcons name="image" size={32} color="#10b981" />,
      onPress: () => console.log('Create image pressed') 
    },
    { 
      id: 'manga', 
      title: 'Manga', 
      description: 'Create a new manga with AI', 
      icon: <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#ec4899" />,
      onPress: () => console.log('Create manga pressed') 
    },
    { 
      id: 'narration', 
      title: 'Narration', 
      description: 'Generate voice narration', 
      icon: <MaterialIcons name="mic" size={32} color="#f59e0b" />,
      onPress: () => console.log('Create narration pressed') 
    },
    { 
      id: 'animation', 
      title: 'Animation', 
      description: 'Create animated scenes', 
      icon: <MaterialIcons name="movie" size={32} color="#8b5cf6" />,
      onPress: () => console.log('Create animation pressed') 
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>What would you like to create?</Text>
        
        <View style={styles.optionsGrid}>
          {createOptions.map(option => (
            <TouchableOpacity 
              key={option.id} 
              style={styles.optionCard}
              onPress={option.onPress}
            >
              <View style={styles.iconContainer}>
                {option.icon}
              </View>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Creations</Text>
          
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No recent creations</Text>
            <Text style={styles.emptyStateSubtext}>
              Your recently created items will appear here
            </Text>
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  recentSection: {
    marginTop: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    padding: 24,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
}); 