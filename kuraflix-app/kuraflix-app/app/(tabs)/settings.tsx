import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [dataUsage, setDataUsage] = useState(false);
  
  // Placeholder user data - replace with authentication info in production
  const user = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    profilePicture: null,
    isPremium: false
  };

  const renderSettingItem = (
    icon, 
    title, 
    description = null, 
    rightElement = null,
    onPress = null
  ) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.settingAction}>
        {rightElement}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.userProfile}>
            <View style={styles.profilePicture}>
              <Text style={styles.profileInitial}>{user.name.charAt(0)}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            {!user.isPremium && (
              <TouchableOpacity style={styles.upgradeButton}>
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {renderSettingItem(
            <MaterialIcons name="account-circle" size={24} color="#6366f1" />,
            'Edit Profile',
            'Change your name, email and profile picture',
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('Edit profile pressed')
          )}
          
          {renderSettingItem(
            <MaterialIcons name="lock" size={24} color="#6366f1" />,
            'Change Password',
            'Update your password',
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('Change password pressed')
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          {renderSettingItem(
            <MaterialIcons name="brightness-6" size={24} color="#6366f1" />,
            'Dark Mode',
            'Enable dark theme across the app',
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#6b7280', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          )}
          
          {renderSettingItem(
            <MaterialIcons name="notifications" size={24} color="#6366f1" />,
            'Notifications',
            'Receive app notifications',
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#6b7280', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          )}
          
          {renderSettingItem(
            <MaterialIcons name="data-usage" size={24} color="#6366f1" />,
            'Data Saver',
            'Reduce image quality to save data',
            <Switch
              value={dataUsage}
              onValueChange={setDataUsage}
              trackColor={{ false: '#6b7280', true: '#6366f1' }}
              thumbColor="#ffffff"
            />
          )}
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          {renderSettingItem(
            <MaterialIcons name="info" size={24} color="#6366f1" />,
            'App Information',
            'Version 1.0.0',
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('App information pressed')
          )}
          
          {renderSettingItem(
            <MaterialIcons name="help" size={24} color="#6366f1" />,
            'Help & Support',
            'Contact us for assistance',
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('Help pressed')
          )}
          
          {renderSettingItem(
            <MaterialIcons name="privacy-tip" size={24} color="#6366f1" />,
            'Privacy Policy',
            null,
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('Privacy policy pressed')
          )}
          
          {renderSettingItem(
            <MaterialIcons name="description" size={24} color="#6366f1" />,
            'Terms of Service',
            null,
            <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />,
            () => console.log('Terms pressed')
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={() => console.log('Sign out pressed')}
        >
          <MaterialIcons name="logout" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2023 Kuraflix</Text>
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
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  profilePicture: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  settingAction: {
    marginLeft: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  signOutText: {
    marginLeft: 8,
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  copyright: {
    color: '#6b7280',
    fontSize: 12,
  }
}); 