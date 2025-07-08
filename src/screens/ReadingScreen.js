import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  IconButton,
  Card,
  ProgressBar,
  Button,
  Snackbar,
} from 'react-native-paper';
import Pdf from 'react-native-pdf';

import { useAuthState } from '../services/authService';
import {
  saveReadingProgress,
  getReadingProgress,
} from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useQueryClient } from '@tanstack/react-query';
import { incrementBookViewCount } from '../services/firestoreService';

const { width, height } = Dimensions.get('window');

const ReadingScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const { user } = useAuthState();
  const clientQuery = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [error, setError] = useState(null);
  const [validatingURL, setValidatingURL] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const saveTimeoutRef = useRef(null);
  const pageChangeTimeoutRef = useRef(null);
  const lastPageChangeRef = useRef(0);

  useEffect(() => {
    console.log('ReadingScreen mounted with book:', book);
    validateAndLoadBook();
  }, []);

  // useEffect(() => {
  //   if (book?.id && !validatingURL && !error) {
  //     incrementBookViewCount(book.id);
  //   }
  // }, [book?.id, validatingURL, error]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > 0) {
      const newProgress = Math.min(currentPage / totalPages, 1);
      setProgress(newProgress);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(newProgress, currentPage);
      }, 3000);
    }
  }, [currentPage, totalPages]);

  // useEffect(() => {
  //   return () => {
  //     // Cleanup timeouts on unmount
  //     if (saveTimeoutRef.current) {
  //       clearTimeout(saveTimeoutRef.current);
  //     }
  //     if (pageChangeTimeoutRef.current) {
  //       clearTimeout(pageChangeTimeoutRef.current);
  //     }
  //   };
  // }, []);

  const validateAndLoadBook = async () => {
    try {
      console.log('Validating book URL:', book.downloadURL);

      if (!book.downloadURL) {
        setError('No download URL found for this book');
        setLoading(false);
        setValidatingURL(false);
        return;
      }

      setValidatingURL(false);
      await loadReadingProgress();
    } catch (error) {
      console.error('URL validation error:', error);
      setError(`Cannot access file: ${error.message}`);
      setLoading(false);
      setValidatingURL(false);
    }
  };

  const loadReadingProgress = async () => {
    if (user?.uid && book?.id) {
      try {
        console.log('Loading reading progress for book:', book.id);
        const result = await getReadingProgress(user.uid, book.id);
        if (result.success && result.data) {
          const savedProgress = result.data.progress || 0;
          const savedPage = result.data.currentPage || 1;
          console.log('Loaded progress:', savedProgress, 'page:', savedPage);
          setProgress(savedProgress);
          setCurrentPage(savedPage);
        }
      } catch (error) {
        console.error('Error loading reading progress:', error);
      }
    }
  };

  const saveProgress = async (progressValue, page) => {
    if (user?.uid && book?.id && !saving && progressValue >= 0) {
      setSaving(true);

      try {
        console.log('Saving progress:', progressValue, 'page:', page);
        const result = await saveReadingProgress(
          user.uid,
          book.id,
          progressValue,
          page,
          totalPages,
        );

        if (result.success) {
          setSnackbarMessage('Progress saved');
          setSnackbarVisible(true);
          clientQuery.invalidateQueries(['library', 'userStats']);
        } else {
          console.error('Failed to save progress:', result.error);
        }
      } catch (error) {
        console.error('Error saving progress:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleLoadComplete = (numberOfPages, filePath) => {
    console.log(
      'PDF loaded successfully. Pages:',
      numberOfPages,
      'Path:',
      filePath,
    );
    setTotalPages(numberOfPages);
    setLoading(false);
    setError(null);
    setRetryCount(0);
  };

  // const handlePageChanged = (page, numberOfPages) => {
  //   // Debounce page changes to prevent too frequent updates
  //   if (pageChangeTimeoutRef.current) {
  //     clearTimeout(pageChangeTimeoutRef.current);
  //   }

  //   // Only update if page actually changed and enough time has passed
  //   const now = Date.now();
  //   if (page !== currentPage && now - lastPageChangeRef.current > 100) {
  //     pageChangeTimeoutRef.current = setTimeout(() => {
  //       console.log('Page changed to:', page, 'of', numberOfPages);
  //       setCurrentPage(page);
  //       if (numberOfPages && numberOfPages !== totalPages) {
  //         setTotalPages(numberOfPages);
  //       }
  //       lastPageChangeRef.current = now;
  //     }, 150); // Debounce by 150ms
  //   }
  // };

  const handlePageChanged = (page, numberOfPages) => {
    console.log('Page changed to:', page, 'of', numberOfPages);
    setCurrentPage(page);
    if (numberOfPages && numberOfPages !== totalPages) {
      setTotalPages(numberOfPages);
    }
  };

  const handlePdfError = error => {
    console.error('PDF Error:', error);
    setLoading(false);

    // Handle specific SSL certificate error
    if (error.message && error.message.includes('trust manager')) {
      setError(
        'SSL Certificate Error: Unable to verify the secure connection. This is a known issue with some Android devices.',
      );
    } else if (
      error.message &&
      error.message.includes('Network request failed')
    ) {
      setError(
        'Network Error: Please check your internet connection and try again.',
      );
    } else {
      setError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLoadProgress = percent => {
    console.log('PDF Loading progress:', Math.round(percent * 100) + '%');
  };

  const goToPage = page => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
    setValidatingURL(true);

    // Add a small delay before retrying
    setTimeout(() => {
      validateAndLoadBook();
    }, 1000);
  };

  const handleOpenInBrowser = () => {
    Alert.alert(
      'Download URL',
      'This will show the download URL for debugging purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Show URL',
          onPress: () => {
            Alert.alert('Download URL', book.downloadURL);
          },
        },
      ],
    );
  };

  const renderPdfReader = () => {
    console.log('Rendering PDF with URL:', book.downloadURL);
    console.log('Retry count:', retryCount);

    // Create a modified URL for retry attempts
    const modifiedUrl =
      retryCount > 0
        ? `${book.downloadURL}${
            book.downloadURL.includes('?') ? '&' : '?'
          }_retry=${retryCount}`
        : book.downloadURL;

    return (
      <Pdf
        key={`pdf-${retryCount}`} // Force re-render on retry
        source={{
          uri: modifiedUrl,
          cache: false,
          headers: {
            Accept: 'application/pdf',
            'User-Agent': 'ReactNative PDF Reader',
            'Cache-Control': 'no-cache',
          },
        }}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handlePdfError}
        onLoadProgress={handleLoadProgress}
        style={styles.pdf}
        trustAllCerts={false}
        page={currentPage}
        horizontal={false}
        spacing={0}
        // password=""
        scale={1.0}
        minScale={0.5}
        maxScale={3.0}
        fitPolicy={0}
        enablePaging={true}
        enableRTL={false}
        enableAnnotationRendering={false} // Disable to reduce complexity
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // Additional props to handle SSL issues
        enableDoubleTapZoom={false}
        singlePage={false}
        // Network configuration
        activityIndicator={null}
        renderActivityIndicator={() => (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message="Loading PDF content..." />
          </View>
        )}
      />
    );
  };

  // const renderPdfReader = () => {
  //   console.log('Rendering PDF with URL:', book.downloadURL);
  //   console.log('Retry count:', retryCount);

  //   // Create a modified URL for retry attempts
  //   const modifiedUrl = retryCount > 0
  //     ? `${book.downloadURL}${book.downloadURL.includes('?') ? '&' : '?'}_retry=${retryCount}`
  //     : book.downloadURL;

  //   return (
  //     <Pdf
  //       key={`pdf-${retryCount}`}
  //       source={{
  //         uri: modifiedUrl,
  //         cache: true, // CHANGED: Enable caching to reduce memory pressure
  //         headers: {
  //           'Accept': 'application/pdf',
  //           'User-Agent': 'ReactNative PDF Reader'
  //           // REMOVED: Cache-Control no-cache to allow caching
  //         }
  //       }}
  //       onLoadComplete={handleLoadComplete}
  //       onPageChanged={handlePageChanged}
  //       onError={handlePdfError}
  //       onLoadProgress={handleLoadProgress}
  //       style={styles.pdf}
  //       trustAllCerts={false}
  //       page={currentPage}
  //       horizontal={false}
  //       spacing={2} // CHANGED: Add small spacing to reduce rendering conflicts
  //       scale={1.0}
  //       minScale={0.75} // CHANGED: Slightly higher min scale
  //       maxScale={2.5} // CHANGED: Lower max scale to reduce memory usage
  //       fitPolicy={0}
  //       enablePaging={true}
  //       enableRTL={false}
  //       enableAnnotationRendering={false}
  //       scrollEnabled={false}
  //       showsHorizontalScrollIndicator={false}
  //       showsVerticalScrollIndicator={true} // CHANGED: Enable vertical scroll indicator
  //       enableDoubleTapZoom={true} // CHANGED: Enable zoom but with limited range
  //       singlePage={true}
  //       // REMOVED: Many props that could cause conflicts
  //       renderActivityIndicator={() => (
  //         <View style={styles.loadingContainer}>
  //           <LoadingSpinner message="Loading PDF content..." />
  //         </View>
  //       )}
  //     />
  //   );
  // };

  const renderEpubReader = () => (
    <View style={styles.epubContainer}>
      <Card style={styles.mockReader}>
        <Card.Content>
          <Text style={styles.mockText}>EPUB Reader Component</Text>
          <Text style={styles.mockSubText}>
            This is a placeholder for the EPUB reader. EPUB files are not yet
            supported in this version.
          </Text>
          <View style={styles.mockControls}>
            <Button
              mode="outlined"
              onPress={() => {
                const newPage = Math.max(currentPage - 1, 1);
                setCurrentPage(newPage);
                if (!totalPages) setTotalPages(50);
              }}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Text style={styles.mockPageText}>
              Page {currentPage} of {totalPages || 50}
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                const maxPages = totalPages || 50;
                const newPage = Math.min(currentPage + 1, maxPages);
                setCurrentPage(newPage);
                if (!totalPages) setTotalPages(50);
              }}
            >
              Next
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  const formatProgress = () => {
    return Math.round(progress * 100);
  };

  const getProgressColor = () => {
    if (progress >= 0.9) return '#4CAF50';
    if (progress >= 0.5) return '#FF9800';
    return '#2196F3';
  };

  // Show URL validation loading
  if (validatingURL) {
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
            <Text style={styles.pageInfo}>Preparing document...</Text>
          </View>
        </View>
        <LoadingSpinner message="Initializing reader..." />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
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
            <Text style={styles.pageInfo}>Error loading document</Text>
          </View>
        </View>

        <View style={styles.errorContainer}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.errorContent}>
              <Text style={styles.errorText}>{error}</Text>

              {error.includes('SSL Certificate') && (
                <View style={styles.sslWarning}>
                  <Text style={styles.sslWarningText}>
                    This is a common Android SSL issue. Try the following:
                  </Text>
                  <Text style={styles.sslWarningItem}>
                    • Check your internet connection
                  </Text>
                  <Text style={styles.sslWarningItem}>
                    • Try again in a few moments
                  </Text>
                  <Text style={styles.sslWarningItem}>
                    • Restart the app if the issue persists
                  </Text>
                </View>
              )}

              <View style={styles.errorButtons}>
                <Button
                  mode="contained"
                  onPress={handleRetry}
                  style={styles.retryButton}
                  icon="refresh"
                >
                  Retry {retryCount > 0 ? `(${retryCount + 1})` : ''}
                </Button>

                {__DEV__ && (
                  <Button
                    mode="outlined"
                    onPress={handleOpenInBrowser}
                    style={styles.debugButton}
                    icon="bug"
                  >
                    Debug Info
                  </Button>
                )}

                <Button
                  mode="text"
                  onPress={() => navigation.goBack()}
                  style={styles.backButtonError}
                >
                  Go Back
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  // Show PDF loading
  // if (loading) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <View style={styles.header}>
  //         <IconButton
  //           icon="arrow-left"
  //           onPress={() => navigation.goBack()}
  //           style={styles.backButton}
  //         />
  //         <View style={styles.headerContent}>
  //           <Text style={styles.bookTitle} numberOfLines={1}>
  //             {book.title}
  //           </Text>
  //           <Text style={styles.pageInfo}>Loading PDF...</Text>
  //         </View>
  //         <IconButton
  //           icon="refresh"
  //           onPress={handleRetry}
  //           style={styles.actionButton}
  //         />
  //       </View>

  //       <View style={styles.loadingContainer}>
  //         <LoadingSpinner message="Loading your book..." />
  //         <Text style={styles.loadingSubText}>
  //           This may take a moment for large files
  //         </Text>
  //       </View>

  //       {/* Start loading the PDF in background */}
  //       <View style={styles.hiddenPdf}>
  //         {book.fileType?.includes('pdf') ? renderPdfReader() : renderEpubReader()}
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

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
            Page {currentPage} of {totalPages} • {formatProgress()}% complete
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon={saving ? 'loading' : 'cloud-upload'}
            onPress={() => saveProgress(progress, currentPage)}
            disabled={saving}
            style={styles.actionButton}
          />
        </View>
      </View>

      <ProgressBar
        progress={progress}
        color={getProgressColor()}
        style={styles.progressBar}
      />

      <View style={styles.readerContainer}>
        {book.fileType?.includes('pdf')
          ? renderPdfReader()
          : renderEpubReader()}
      </View>

      <View style={styles.controls}>
        <IconButton
          icon="chevron-left"
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          style={styles.navButton}
          mode="contained-tonal"
        />

        <View style={styles.pageControls}>
          <Text style={styles.progressText}>{formatProgress()}% Complete</Text>
          <Text style={styles.pageText}>
            {currentPage} / {totalPages}
          </Text>
        </View>

        <IconButton
          icon="chevron-right"
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={styles.navButton}
          mode="contained-tonal"
        />
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
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
    backgroundColor: '#fff',
    elevation: 2,
  },
  backButton: {
    margin: 0,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    margin: 0,
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
    height: 4,
  },
  readerContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: width,
    height: height - 200,
  },
  hiddenPdf: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // paddingHorizontal:10,
  },
  loadingSubText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  mockControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  mockPageText: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
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
  pageText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  snackbar: {
    marginBottom: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorCard: {
    elevation: 4,
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  sslWarning: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  sslWarningText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sslWarningItem: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 8,
    marginBottom: 4,
  },
  errorButtons: {
    width: '100%',
  },
  retryButton: {
    marginBottom: 10,
    width: '100%',
  },
  debugButton: {
    marginBottom: 10,
    width: '100%',
  },
  backButtonError: {
    width: '100%',
  },
});

export default ReadingScreen;
