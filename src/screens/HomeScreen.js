import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  FAB,
  Searchbar,
  List,
  Avatar
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import DocumentPicker from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuthState } from '../services/authService';
import { getUserLibrary } from '../services/firestoreService';
import { uploadFile } from '../services/storageService';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthState();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: library, isLoading, refetch } = useQuery({
    queryKey: ['library', user?.uid],
    queryFn: () => getUserLibrary(user?.uid),
    enabled: !!user?.uid,
  });

  const recentBooks = library?.data?.slice(0, 3) || [];
  const filteredBooks = library?.data?.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, 'application/epub+zip'],
      });

      const file = result[0];
      setUploading(true);

      const fileName = `${Date.now()}_${file.name}`;
      const uploadResult = await uploadFile(file.uri, fileName, user.uid);

      if (uploadResult.success) {
        // Save book metadata to Firestore
        const bookData = {
          id: Date.now().toString(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          downloadURL: uploadResult.downloadURL,
          uploadedAt: new Date(),
        };

        await saveBookToLibrary(user.uid, bookData);
        refetch();
        Alert.alert('Success', 'Book uploaded successfully!');
      } else {
        Alert.alert('Error', 'Failed to upload book');
      }
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select file');
      }
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Title style={styles.welcomeText}>Welcome back!</Title>
          <Paragraph style={styles.subtitle}>
            Continue your reading journey
          </Paragraph>
        </View>

        <Searchbar
          placeholder="Search your library..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {searchQuery ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {filteredBooks.length > 0 ? (
              filteredBooks.map(book => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onPress={() => navigation.navigate('Reading', { book })}
                />
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text>No books found matching your search.</Text>
                </Card.Content>
              </Card>
            )}
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continue Reading</Text>
              {recentBooks.length > 0 ? (
                recentBooks.map(book => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onPress={() => navigation.navigate('Reading', { book })}
                  />
                ))
              ) : (
                <Card style={styles.emptyCard}>
                  <Card.Content style={styles.emptyContent}>
                    <Icon name="book" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No books in your library yet</Text>
                    <Text style={styles.emptySubText}>
                      Tap the + button to add your first book
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <List.Item
                title="Upload New Book"
                description="Add EPUB or PDF files to your library"
                left={() => <List.Icon icon="upload" />}
                onPress={handleFileUpload}
                style={styles.actionItem}
              />
              <List.Item
                title="View All Books"
                description="Browse your complete library"
                left={() => <List.Icon icon="library-books" />}
                onPress={() => navigation.navigate('Library')}
                style={styles.actionItem}
              />
            </View>
          </>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleFileUpload}
        loading={uploading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  emptyCard: {
    padding: 20,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  addButton: {
    marginTop: 16,
  },
});

export default HomeScreen;