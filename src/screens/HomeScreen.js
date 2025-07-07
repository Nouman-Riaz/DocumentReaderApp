// import React, { useState } from 'react';
// import { View, StyleSheet, ScrollView, Alert } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { 
//   Text, 
//   Card, 
//   Title, 
//   Paragraph, 
//   FAB,
//   Searchbar,
//   List,
//   Avatar
// } from 'react-native-paper';
// import { useQuery } from '@tanstack/react-query';
// import {pick, types} from '@react-native-documents/picker';
// import Icon from 'react-native-vector-icons/MaterialIcons';

// import { useAuthState } from '../services/authService';
// import { getUserLibrary } from '../services/firestoreService';
// import { uploadFile } from '../services/storageService';
// import BookCard from '../components/BookCard';
// import LoadingSpinner from '../components/LoadingSpinner';

// const HomeScreen = ({ navigation }) => {
//   const { user } = useAuthState();
//   const [searchQuery, setSearchQuery] = useState('');
//   const [uploading, setUploading] = useState(false);

//   const { data: library, isLoading, refetch } = useQuery({
//     queryKey: ['library', user?.uid],
//     queryFn: () => getUserLibrary(user?.uid),
//     enabled: !!user?.uid,
//   });

//   const recentBooks = library?.data?.slice(0, 3) || [];
//   const filteredBooks = library?.data?.filter(book => 
//     book.title?.toLowerCase().includes(searchQuery.toLowerCase())
//   ) || [];

//   const handleFileUpload = async () => {
//     try {
//       const result = await pick({
//         allowMultiSelection: false,
//         type: [types.pdf, 'application/epub+zip'],
//       })

//       const file = result[0];
//       setUploading(true);

//       const fileName = `${Date.now()}_${file.name}`;
//       const uploadResult = await uploadFile(file.uri, fileName, user.uid);

//       if (uploadResult.success) {
//         // Save book metadata to Firestore
//         const bookData = {
//           id: Date.now().toString(),
//           title: file.name.replace(/\.[^/.]+$/, ''),
//           fileName: file.name,
//           fileSize: file.size,
//           fileType: file.type,
//           downloadURL: uploadResult.downloadURL,
//           uploadedAt: new Date(),
//         };

//         await saveBookToLibrary(user.uid, bookData);
//         refetch();
//         Alert.alert('Success', 'Book uploaded successfully!');
//       } else {
//         Alert.alert('Error', 'Failed to upload book');
//       }
//     } catch (error) {
//       console.log("File Selection Error==>",error);
//         Alert.alert('Error', 'Failed to select file');
//     } finally {
//       setUploading(false);
//     }
//   };

//   if (isLoading) {
//     return <LoadingSpinner />;
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContent}>
//         <View style={styles.header}>
//           <Title style={styles.welcomeText}>Welcome back!</Title>
//           <Paragraph style={styles.subtitle}>
//             Continue your reading journey
//           </Paragraph>
//         </View>

//         <Searchbar
//           placeholder="Search your library..."
//           onChangeText={setSearchQuery}
//           value={searchQuery}
//           style={styles.searchBar}
//         />

//         {searchQuery ? (
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Search Results</Text>
//             {filteredBooks.length > 0 ? (
//               filteredBooks.map(book => (
//                 <BookCard 
//                   key={book.id} 
//                   book={book} 
//                   onPress={() => navigation.navigate('Reading', { book })}
//                 />
//               ))
//             ) : (
//               <Card style={styles.emptyCard}>
//                 <Card.Content>
//                   <Text>No books found matching your search.</Text>
//                 </Card.Content>
//               </Card>
//             )}
//           </View>
//         ) : (
//           <>
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Continue Reading</Text>
//               {recentBooks.length > 0 ? (
//                 recentBooks.map(book => (
//                   <BookCard 
//                     key={book.id} 
//                     book={book} 
//                     onPress={() => navigation.navigate('Reading', { book })}
//                   />
//                 ))
//               ) : (
//                 <Card style={styles.emptyCard}>
//                   <Card.Content style={styles.emptyContent}>
//                     <Icon name="book" size={64} color="#ccc" />
//                     <Text style={styles.emptyText}>No books in your library yet</Text>
//                     <Text style={styles.emptySubText}>
//                       Tap the + button to add your first book
//                     </Text>
//                   </Card.Content>
//                 </Card>
//               )}
//             </View>

//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Quick Actions</Text>
//               <List.Item
//                 title="Upload New Book"
//                 description="Add EPUB or PDF files to your library"
//                 left={() => <List.Icon icon="upload" />}
//                 onPress={handleFileUpload}
//                 style={styles.actionItem}
//               />
//               <List.Item
//                 title="View All Books"
//                 description="Browse your complete library"
//                 left={() => <List.Icon icon="library-books" />}
//                 onPress={() => navigation.navigate('Library')}
//                 style={styles.actionItem}
//               />
//             </View>
//           </>
//         )}
//       </ScrollView>

//       <FAB
//         icon="plus"
//         style={styles.fab}
//         onPress={handleFileUpload}
//         loading={uploading}
//       />
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//   },
//   scrollContent: {
//     paddingBottom: 80,
//   },
//   header: {
//     padding: 20,
//     paddingBottom: 10,
//   },
//   welcomeText: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666',
//   },
//   searchBar: {
//     marginHorizontal: 20,
//     marginBottom: 20,
//     elevation: 2,
//   },
//   section: {
//     marginHorizontal: 20,
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 12,
//     color: '#333',
//   },
//   emptyCard: {
//     padding: 20,
//     elevation: 2,
//   },
//   emptyContent: {
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   emptyText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginTop: 12,
//     color: '#666',
//   },
//   emptySubText: {
//     fontSize: 14,
//     color: '#888',
//     textAlign: 'center',
//     marginTop: 4,
//   },
//   addButton: {
//     marginTop: 16,
//   },
// });

// export default HomeScreen;


import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  FAB,
  Searchbar,
  List,
  ProgressBar,
  Chip,
  Button,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { pick, types } from '@react-native-documents/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuthState } from '../services/authService';
import { getUserLibrary, saveBookToLibrary, getUserStats } from '../services/firestoreService';
import { uploadFile } from '../services/storageService';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPathForFirebaseStorage } from '../utils/storagePath';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuthState();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: library, isLoading, refetch } = useQuery({
    queryKey: ['library', user?.uid],
    queryFn: () => getUserLibrary(user?.uid),
    enabled: !!user?.uid,
  });

  const { data: userStats } = useQuery({
    queryKey: ['userStats', user?.uid],
    queryFn: () => getUserStats(user?.uid),
    enabled: !!user?.uid,
  });

  const books = library?.data || [];
  const stats = userStats?.data || {};

  // Filter books based on search
  const filteredBooks = books.filter(book => 
    book.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get different categories of books
  const recentBooks = books.slice(0, 3);
  const inProgressBooks = books.filter(book => book.progress > 0 && book.progress < 1).slice(0, 3);
  const completedBooks = books.filter(book => book.isCompleted).slice(0, 3);

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

  const formatProgress = (progress) => {
    return Math.round((progress || 0) * 100);
  };

  const getProgressColor = (progress) => {
    if (progress >= 0.9) return '#4CAF50'; // Green for completed
    if (progress >= 0.5) return '#FF9800'; // Orange for halfway
    return '#2196F3'; // Blue for started
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading your library..." />;
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

        {/* User Statistics Cards */}
        {books.length > 0 && (
          <View style={styles.statsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Icon name="library-books" size={24} color="#6200EE" />
                  <Text style={styles.statNumber}>{stats.totalBooks || 0}</Text>
                  <Text style={styles.statLabel}>Total Books</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Icon name="book" size={24} color="#FF9800" />
                  <Text style={styles.statNumber}>{stats.inProgressBooks || 0}</Text>
                  <Text style={styles.statLabel}>Reading</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                  <Text style={styles.statNumber}>{stats.completedBooks || 0}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </Card.Content>
              </Card>

              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Icon name="book-outline" size={24} color="#757575" />
                  <Text style={styles.statNumber}>{stats.unreadBooks || 0}</Text>
                  <Text style={styles.statLabel}>Unread</Text>
                </Card.Content>
              </Card>
            </ScrollView>
          </View>
        )}

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
                <View key={book.id} style={styles.bookItem}>
                  <BookCard 
                    book={book} 
                    onPress={() => navigation.navigate('Reading', { book })}
                  />
                  {book.progress > 0 && (
                    <View style={styles.progressContainer}>
                      <Text style={styles.progressText}>
                        {formatProgress(book.progress)}% complete
                      </Text>
                      <ProgressBar 
                        progress={book.progress} 
                        color={getProgressColor(book.progress)}
                        style={styles.progressBar}
                      />
                    </View>
                  )}
                </View>
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
            {/* Continue Reading Section */}
            {inProgressBooks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Continue Reading</Text>
                  <Chip icon="book-open" textStyle={styles.chipText}>
                    {stats.inProgressBooks} books
                  </Chip>
                </View>
                {inProgressBooks.map(book => (
                  <View key={book.id} style={styles.bookItem}>
                    <BookCard 
                      book={book} 
                      onPress={() => navigation.navigate('Reading', { book })}
                    />
                    <View style={styles.progressContainer}>
                      <Text style={styles.progressText}>
                        {formatProgress(book.progress)}% complete • Page {book.currentPage || 1}
                      </Text>
                      <ProgressBar 
                        progress={book.progress} 
                        color={getProgressColor(book.progress)}
                        style={styles.progressBar}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recently Added Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Added</Text>
                {books.length > 3 && (
                  <Text 
                    style={styles.viewAllText}
                    onPress={() => navigation.navigate('Library')}
                  >
                    View All
                  </Text>
                )}
              </View>
              {recentBooks.length > 0 ? (
                recentBooks.map(book => (
                  <View key={book.id} style={styles.bookItem}>
                    <BookCard 
                      book={book} 
                      onPress={() => navigation.navigate('Reading', { book })}
                    />
                    {book.progress > 0 && (
                      <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>
                          {formatProgress(book.progress)}% complete
                        </Text>
                        <ProgressBar 
                          progress={book.progress} 
                          color={getProgressColor(book.progress)}
                          style={styles.progressBar}
                        />
                      </View>
                    )}
                  </View>
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

            {/* Completed Books Section */}
            {completedBooks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  <Chip icon="check-circle" textStyle={styles.chipText}>
                    {stats.completedBooks} books
                  </Chip>
                </View>
                {completedBooks.slice(0, 2).map(book => (
                  <View key={book.id} style={styles.bookItem}>
                    <BookCard 
                      book={book} 
                      onPress={() => navigation.navigate('Reading', { book })}
                    />
                    <View style={styles.progressContainer}>
                      <Text style={styles.progressText}>Completed ✓</Text>
                      <ProgressBar 
                        progress={1} 
                        color="#4CAF50"
                        style={styles.progressBar}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Quick Actions */}
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
                left={() => <List.Icon icon="book" />}
                onPress={() => navigation.navigate('Library')}
                style={styles.actionItem}
              />
              <List.Item
                title="Reading History"
                description="See your reading history"
                left={() => <List.Icon icon="history" />}
                onPress={() => navigation.navigate('History')}
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
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    marginRight: 12,
    minWidth: 100,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  chipText: {
    fontSize: 12,
  },
  viewAllText: {
    color: '#6200EE',
    fontSize: 14,
    fontWeight: '500',
  },
  bookItem: {
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
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
  actionItem: {
    marginVertical: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200EE',
  },
});

export default HomeScreen;