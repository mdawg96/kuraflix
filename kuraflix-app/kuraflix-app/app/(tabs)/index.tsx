import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  
  // Mock data - replace with API calls in production
  const featuredContent = [
    {
      id: '1',
      title: 'Create your first character',
      description: 'Design anime characters with AI',
      image: 'https://via.placeholder.com/800x400',
      type: 'character',
      action: () => router.push('/(tabs)/characters')
    },
    {
      id: '2',
      title: 'Generate manga pages',
      description: 'Turn your stories into manga',
      image: 'https://via.placeholder.com/800x400',
      type: 'manga',
      action: () => router.push('/(tabs)/create')
    }
  ];
  
  const recentCreations = [
    {
      id: '1',
      title: 'Sakura Character',
      type: 'character',
      thumbnailUrl: 'https://via.placeholder.com/160x160',
      createdAt: '2 days ago'
    },
    {
      id: '2',
      title: 'Hero Academy Ch.1',
      type: 'manga',
      thumbnailUrl: 'https://via.placeholder.com/160x240',
      createdAt: '1 week ago'
    }
  ];
  
  const quickActions = [
    {
      id: 'create-character',
      title: 'Create Character',
      icon: <MaterialIcons name="person-add" size={28} color="#6366f1" />,
      onPress: () => router.push('/(tabs)/create')
    },
    {
      id: 'generate-image',
      title: 'Generate Image',
      icon: <MaterialIcons name="image" size={28} color="#10b981" />,
      onPress: () => router.push('/(tabs)/create')
    },
    {
      id: 'view-stories',
      title: 'My Stories',
      icon: <MaterialCommunityIcons name="book-open-variant" size={28} color="#ec4899" />,
      onPress: () => router.push('/(tabs)/stories')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>Kuraflix</Text>
        <TouchableOpacity style={styles.profileButton}>
          <MaterialIcons name="account-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Hero Banner */}
        <View style={styles.greeting}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitle}>
            Create amazing anime and manga with AI
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {quickActions.map(action => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <View style={styles.actionIcon}>
                {action.icon}
              </View>
              <Text style={styles.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContent}
          >
            {featuredContent.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.featuredCard}
                onPress={item.action}
              >
                <ImageBackground
                  source={{ uri: item.image }}
                  style={styles.featuredImage}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View style={styles.featuredOverlay}>
                    <View style={styles.featuredTypeTag}>
                      <Text style={styles.featuredTypeText}>{item.type}</Text>
                    </View>
                    <Text style={styles.featuredTitle}>{item.title}</Text>
                    <Text style={styles.featuredDescription}>{item.description}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Creations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Creations</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentGrid}>
            {recentCreations.map(item => (
              <TouchableOpacity key={item.id} style={styles.recentCard}>
                <Image 
                  source={{ uri: item.thumbnailUrl }} 
                  style={styles.recentThumbnail} 
                />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.recentMeta}>
                    <Text style={styles.recentType}>{item.type}</Text>
                    <Text style={styles.recentDate}>{item.createdAt}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.spacer} />
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
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  greeting: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#e5e7eb',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
  },
  featuredContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  featuredCard: {
    width: 280,
    height: 160,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  featuredOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
  },
  featuredTypeTag: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  recentGrid: {
    paddingHorizontal: 16,
  },
  recentCard: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recentThumbnail: {
    width: 80,
    height: 80,
    backgroundColor: '#374151',
  },
  recentInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  recentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentType: {
    fontSize: 12,
    color: '#6366f1',
    textTransform: 'capitalize',
  },
  recentDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  spacer: {
    height: 40,
  },
});
