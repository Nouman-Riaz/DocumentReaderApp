import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Title, 
  Searchbar,
  Menu,
  Button,
  IconButton,
  Chip,
  FAB,
  Portal,
  Modal,
  List,
  Divider
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { pick, types } from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuthState } from '../services/authService';
import { getUserLibrary, saveBookToLibrary } from '../services/firestoreService';
import { uploadFile } from '../services/storageService';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';

const LibraryScreen = ({ navigation }) => {
  const { user } = useAuthState();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterType, setFilterType] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: library, isLoading, refetch } = useQuery({
    queryKey: ['library', user?.uid],
    queryFn: () => getUserLibrary(user?.uid),
    enabled: !!user?.uid,
  });

  const books = library?.data || [];

  // Filter and sort books
  const filteredBooks = books
    .filter(book => {
      const matchesSearch = book.title?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'pdf' && book.fileType?.includes('pdf')) ||
        (filterType === 'epub' && book.fileType?.includes('epub')) ||
        (filterType === 'recent' && isRecentlyAdded(book)) ||
        (filterType === 'unread' && !book.progress) ||
        (filterType === 'reading' && book.progress > 0 && book.progress < 1) ||
        (filterType === 'completed' && book.progress >= 1);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.uploadedAt || b.addedAt) - new Date(a.uploadedAt || a.addedAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'progress':
          return (b.progress || 0) - (a.progress || 0);
        default:
          return 0;
      }
    });

  const isRecentlyAdded = (book) => {
    const bookDate = new Date(book.uploadedAt || book.addedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return bookDate > weekAgo;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'recent': return 'Recently Added';
      case 'title': return 'Title (A-Z)';
      case 'size': return 'File Size';
      case 'progress': return 'Reading Progress';
      default: return 'Recently Added';
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'all': return 'All Books';
      case 'pdf': return 'PDF Files';
      case 'epub': return 'EPUB Files';
      case 'recent': return 'Recently Added';
      case 'unread': return 'Unread';
      case 'reading': return 'Currently Reading';
      case 'completed': return 'Completed';
      default: return 'All Books';
    }
  };

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'This app needs access to your storage to upload files.',
        }
      );
      console.log("Granted===>",granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const handleFileUpload = async () => {
    // console.log("<=====In function=====>");
    // const hasPermission = await requestStoragePermission();
    // console.log("Has Permission====>",hasPermission);
  // if (hasPermission) {
    try {
      const result = await pick({
        allowMultiSelection: false,
        type: [types.pdf, 'application/epub+zip'],
        copyTo: 'cachesDirectory',
      });

      if (!result || result.length === 0) {
        return; // User cancelled
      }

      const file = result[0];
      console.log("File====>",file);
      setUploading(true);
      // const documentUri = await getPathForFirebaseStorage(file.uri);
      const filePath = file.fileCopyUri || file.uri;
      const fileName = `${Date.now()}_${file.name}`;
      const uploadResult = await uploadFile(filePath, fileName, user.uid);

      if (uploadResult.success) {
        const bookData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          downloadURL: uploadResult.downloadURL,
          storagePath: uploadResult.storagePath,
          uploadedAt: new Date().toISOString(),
        };

        const saveResult = await saveBookToLibrary(user.uid, bookData);
        
        if (saveResult.success) {
          refetch();
          Alert.alert('Success', 'Book uploaded successfully!');
        } else {
          Alert.alert('Error', 'Failed to save book data');
        }
      } else {
        Alert.alert('Error', 'Failed to upload book');
      }
    } catch (error) {
      console.log("File Selection Error==>", error);
      if (!error.message?.includes('User canceled')) {
        Alert.alert('Error', 'Failed to select file');
      }
    } finally {
      setUploading(false);
    }
  // }
    // else{
    //   Alert.alert("Permission Denied', 'Cannot access storage without permission");
    // }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBookPress = (book) => {
    navigation.navigate('Reading', { book });
  };

  const handleBookLongPress = (book) => {
    Alert.alert(
      book.title,
      'Choose an action',
      [
        { text: 'Open', onPress: () => handleBookPress(book) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteBook(book) },
        { text: 'Details', onPress: () => handleBookDetails(book) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeleteBook = (book) => {
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete functionality
            Alert.alert('Info', 'Delete functionality will be implemented with Firebase');
          }
        }
      ]
    );
  };

  const handleBookDetails = (book) => {
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString();
    };

    const formatFileSize = (bytes) => {
      if (!bytes) return 'Unknown';
      const mb = bytes / (1024 * 1024);
      return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    Alert.alert(
      'Book Details',
      `Title: ${book.title}\n` +
      `Type: ${book.fileType?.includes('pdf') ? 'PDF' : 'EPUB'}\n` +
      `Size: ${formatFileSize(book.fileSize)}\n` +
      `Added: ${formatDate(book.addedAt || book.uploadedAt)}\n` +
      `Progress: ${Math.round((book.progress || 0) * 100)}%`,
      [{ text: 'OK' }]
    );
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const resetFilters = () => {
    setFilterType('all');
    setSortBy('recent');
    setSearchQuery('');
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your library..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Title style={styles.title}>My Library</Title>
          <Text style={styles.subtitle}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
            {filteredBooks.length !== books.length && 
              ` • ${filteredBooks.length} shown`
            }
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="upload"
            onPress={handleFileUpload}
            disabled={uploading}
          />
        </View>
      </View>

      {/* Search Bar */}
      <Searchbar
        placeholder="Search your library..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon="magnify"
        clearIcon="close"
        onClearIconPress={clearSearch}
      />

      {/* Controls */}
      <View style={styles.controls}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          <View style={styles.filters}>
            <Chip
              selected={filterType === 'all'}
              onPress={() => setFilterType('all')}
              style={styles.chip}
              icon="book-multiple"
            >
              All
            </Chip>
            <Chip
              selected={filterType === 'pdf'}
              onPress={() => setFilterType('pdf')}
              style={styles.chip}
              icon="file-pdf-box"
            >
              PDF
            </Chip>
            <Chip
              selected={filterType === 'epub'}
              onPress={() => setFilterType('epub')}
              style={styles.chip}
              icon="book-open-page-variant"
            >
              EPUB
            </Chip>
          </View>
        </ScrollView>
      </View>

      {/* Active Filters Info */}
      {(searchQuery || filterType !== 'all' || sortBy !== 'recent') && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>
            {getFilterLabel()} • {getSortLabel()}
            {searchQuery && ` • "${searchQuery}"`}
          </Text>
          <Button
            mode="text"
            compact
            onPress={resetFilters}
            style={styles.clearButton}
          >
            Clear
          </Button>
        </View>
      )}

      {/* Books List/Grid */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredBooks.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredBooks.map(book => (
              <BookCard 
                key={book.id} 
                book={book} 
                onPress={() => handleBookPress(book)}
                onLongPress={() => handleBookLongPress(book)}
                showProgress={true}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon 
                name={searchQuery ? 'search-off' : books.length === 0 ? 'book' : 'filter-list-off'} 
                size={64} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'No books found' 
                  : books.length === 0 
                    ? 'Your library is empty'
                    : 'No books match your filters'
                }
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery 
                  ? 'Try adjusting your search or filters' 
                  : books.length === 0
                    ? 'Add some books to get started'
                    : 'Try changing your filter settings'
                }
              </Text>
              {books.length === 0 && (
                <Button
                  mode="contained"
                  onPress={handleFileUpload}
                  style={styles.addButton}
                  icon="plus"
                  loading={uploading}
                >
                  Add Your First Book
                </Button>
              )}
              {books.length > 0 && filteredBooks.length === 0 && (
                <Button
                  mode="outlined"
                  onPress={resetFilters}
                  style={styles.addButton}
                  icon="filter-remove"
                >
                  Clear Filters
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Quick Stats */}
        {books.length > 0 && (
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text style={styles.statsTitle}>Library Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{books.length}</Text>
                  <Text style={styles.statLabel}>Total Books</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {books.filter(b => b.fileType?.includes('pdf')).length}
                  </Text>
                  <Text style={styles.statLabel}>PDF Files</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {books.filter(b => b.fileType?.includes('epub')).length}
                  </Text>
                  <Text style={styles.statLabel}>EPUB Files</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {books.filter(b => (b.progress || 0) >= 1).length}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleFileUpload}
        loading={uploading}
        label={books.length === 0 ? "Add Book" : undefined}
        extended={books.length === 0}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  title: {
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
    marginBottom: 16,
    elevation: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersScrollView: {
    flexGrow: 0,
  },
  filters: {
    flexDirection: 'row',
    paddingLeft: 20,
  },
  chip: {
    marginRight: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  activeFiltersText: {
    fontSize: 12,
    color: '#1976d2',
    flex: 1,
  },
  clearButton: {
    margin: 0,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  listContainer: {
    paddingHorizontal: 0,
  },
  gridItem: {
    width: '48%',
    margin: '1%',
  },
  listItem: {
    width: '100%',
  },
  emptyCard: {
    margin: 20,
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
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 16,
  },
  statsCard: {
    margin: 20,
    marginTop: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200EE',
  },
});

export default LibraryScreen;