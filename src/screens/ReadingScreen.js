import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  IconButton, 
  Card,
  ProgressBar,
  Button
} from 'react-native-paper';
import Pdf from 'react-native-pdf';
// import EpubReader from 'react-native-epub-reader'; // Uncomment when available

import { useAuthState } from '../services/authService';
import { saveReadingProgress, getReadingProgress } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';

const { width, height } = Dimensions.get('window');

const ReadingScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const { user } = useAuthState();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadReadingProgress();
  }, []);

  useEffect(() => {
    if (totalPages > 0) {
      const newProgress = currentPage / totalPages;
      setProgress(newProgress);
      saveProgress(newProgress);
    }
  }, [currentPage, totalPages]);

  const loadReadingProgress = async () => {
    if (user?.uid && book?.id) {
      const result = await getReadingProgress(user.uid, book.id);
      if (result.success && result.data) {
        const savedProgress = result.data.progress || 0;
        setProgress(savedProgress);
      }
    }
  };

  const saveProgress = async (progressValue) => {
    if (user?.uid && book?.id) {
      await saveReadingProgress(user.uid, book.id, progressValue);
    }
  };

  const handlePageChanged = (page, numberOfPages) => {
    setCurrentPage(page);
    setTotalPages(numberOfPages);
    setLoading(false);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPdfReader = () => (
    <Pdf
      source={{ uri: book.downloadURL }}
      onLoadComplete={handlePageChanged}
      onPageChanged={handlePageChanged}
      onError={(error) => {
        console.log(error);
        Alert.alert('Error', 'Failed to load PDF');
      }}
      style={styles.pdf}
      trustAllCerts={false}
      page={currentPage}
    />
  );

  const renderEpubReader = () => (
    <View style={styles.epubContainer}>
      <Card style={styles.mockReader}>
        <Card.Content>
          <Text style={styles.mockText}>
            EPUB Reader Component
          </Text>
          <Text style={styles.mockSubText}>
            This is a placeholder for the EPUB reader.
            The actual implementation would use react-native-epub-reader
            or a similar library.
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              const newPage = Math.min(currentPage + 1, totalPages || 50);
              setCurrentPage(newPage);
              setTotalPages(50); // Mock total pages
            }}
            style={styles.mockButton}
          >
            Next Page (Mock)
          </Button>
        </Card.Content>
      </Card>
    </View>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerContent}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {book.title}
          </Text>
          <Text style={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </Text>
        </View>
        <IconButton
          icon="bookmark"
          onPress={() => Alert.alert('Bookmark', 'Page bookmarked!')}
        />
      </View>

      <ProgressBar 
        progress={progress} 
        color="#6200EE" 
        style={styles.progressBar}
      />

      <View style={styles.readerContainer}>
        {book.fileType?.includes('pdf') ? renderPdfReader() : renderEpubReader()}
      </View>

      <View style={styles.controls}>
        <IconButton
          icon="chevron-left"
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          style={styles.navButton}
        />
        <View style={styles.pageControls}>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% Complete
          </Text>
        </View>
        <IconButton
          icon="chevron-right"
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={styles.navButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    margin: 0,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pageInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressBar: {
    height: 3,
  },
  readerContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: width,
    height: height,
  },
  epubContainer: {
    flex: 1,
    padding: 20,
  },
  mockReader: {
    flex: 1,
    justifyContent: 'center',
  },
  mockText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  mockSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  mockButton: {
    marginTop: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  navButton: {
    margin: 0,
  },
  pageControls: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default ReadingScreen;