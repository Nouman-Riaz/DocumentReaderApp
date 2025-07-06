import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button,
  List,
  Avatar,
  Divider,
  Switch
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuthState, signOut } from '../services/authService';
import { getUserLibrary } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfileScreen = ({ navigation }) => {
  const { user } = useAuthState();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const { data: library, isLoading } = useQuery({
    queryKey: ['library', user?.uid],
    queryFn: () => getUserLibrary(user?.uid),
    enabled: !!user?.uid,
  });

  const books = library?.data || [];
  const totalBooks = books.length;
  const pdfBooks = books.filter(book => book.fileType?.includes('pdf')).length;
  const epubBooks = books.filter(book => book.fileType?.includes('epub')).length;

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Avatar.Icon 
            size={80} 
            icon="account" 
            style={styles.avatar}
          />
          <Title style={styles.userName}>
            {user?.email?.split('@')[0] || 'User'}
          </Title>
          <Paragraph style={styles.userEmail}>
            {user?.email}
          </Paragraph>
        </View>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Library Statistics</Title>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalBooks}</Text>
                <Text style={styles.statLabel}>Total Books</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{pdfBooks}</Text>
                <Text style={styles.statLabel}>PDF Files</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{epubBooks}</Text>
                <Text style={styles.statLabel}>EPUB Files</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.settingsCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Settings</Title>
            
            <List.Item
              title="Dark Mode"
              description="Enable dark theme"
              left={() => <List.Icon icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                />
              )}
            />
            
            <List.Item
              title="Notifications"
              description="Receive reading reminders"
              left={() => <List.Icon icon="bell" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                />
              )}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Storage Usage"
              description="Manage your uploaded files"
              left={() => <List.Icon icon="storage" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('Storage', 'Storage management coming soon!')}
            />

            <List.Item
              title="Reading History"
              description="View your reading activity"
              left={() => <List.Icon icon="history" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('History', 'Reading history coming soon!')}
            />

            <List.Item
              title="Export Data"
              description="Download your reading data"
              left={() => <List.Icon icon="download" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('Export', 'Data export coming soon!')}
            />

            <Divider style={styles.divider} />

            <List.Item
              title="Help & Support"
              description="Get help with the app"
              left={() => <List.Icon icon="help" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('Support', 'Contact support at support@ebookreader.com')}
            />

            <List.Item
              title="About"
              description="App version and information"
              left={() => <List.Icon icon="information" />}
              right={() => <List.Icon icon="chevron-right" />}
              onPress={() => Alert.alert('About', 'E-Book Reader v1.0.0\nBuilt with React Native')}
            />
          </Card.Content>
        </Card>

        <Card style={styles.accountCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Account</Title>
            
            <Button
              mode="outlined"
              onPress={() => Alert.alert('Change Password', 'Password change coming soon!')}
              style={styles.accountButton}
              icon="lock"
            >
              Change Password
            </Button>

            <Button
              mode="outlined"
              onPress={() => Alert.alert('Delete Account', 'Account deletion coming soon!')}
              style={styles.accountButton}
              icon="delete"
              textColor="#d32f2f"
            >
              Delete Account
            </Button>

            <Button
              mode="contained"
              onPress={handleSignOut}
              style={styles.signOutButton}
              icon="logout"
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  avatar: {
    marginBottom: 16,
    backgroundColor: '#6200EE',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    margin: 20,
    marginBottom: 16,
    elevation: 2,
  },
  settingsCard: {
    margin: 20,
    marginVertical: 8,
    elevation: 2,
  },
  accountCard: {
    margin: 20,
    marginTop: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  accountButton: {
    marginBottom: 12,
  },
  signOutButton: {
    marginTop: 8,
    backgroundColor: '#d32f2f',
  },
});

export default ProfileScreen;