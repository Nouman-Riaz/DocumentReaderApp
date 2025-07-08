import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  Text,
  IconButton,
  Card,
  ProgressBar,
  Button,
  Snackbar,
} from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { Reader, ReaderProvider } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/file-system';
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
  const [epubReady, setEpubReady] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
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

  // const validateAndLoadBook = async () => {
  //   try {
  //     console.log('Validating book URL:', book.downloadURL);

  //     if (!book.downloadURL) {
  //       setError('No download URL found for this book');
  //       setLoading(false);
  //       setValidatingURL(false);
  //       return;
  //     }

  //     setValidatingURL(false);
  //     await loadReadingProgress();
  //   } catch (error) {
  //     console.error('URL validation error:', error);
  //     setError(`Cannot access file: ${error.message}`);
  //     setLoading(false);
  //     setValidatingURL(false);
  //   }
  // };

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

      // Check if book object already has progress data (from HomeScreen/LibraryScreen)
      if (book.currentPage && book.progress !== undefined) {
        console.log(
          'Using existing progress from book object:',
          book.progress,
          'page:',
          book.currentPage,
        );
        setProgress(book.progress);
        setCurrentPage(book.currentPage);
        setProgressLoaded(true);
      } else {
        // Load from Firestore if not available in book object
        console.log('Loading progress from Firestore...');
        await loadReadingProgress();
      }

      // For EPUB files, we need additional setup
      if (book.fileType?.includes('epub')) {
        setEpubReady(true);
      }

      setLoading(false);
    } catch (error) {
      console.error('URL validation error:', error);
      setError(`Cannot access file: ${error.message}`);
      setLoading(false);
      setValidatingURL(false);
    }
  };

  // const loadReadingProgress = async () => {
  //   if (user?.uid && book?.id) {
  //     try {
  //       console.log('Loading reading progress for book:', book.id);
  //       const result = await getReadingProgress(user.uid, book.id);
  //       if (result.success && result.data) {
  //         const savedProgress = result.data.progress || 0;
  //         const savedPage = result.data.currentPage || 1;
  //         console.log('Loaded progress:', savedProgress, 'page:', savedPage);
  //         setProgress(savedProgress);
  //         setCurrentPage(savedPage);
  //       }
  //     } catch (error) {
  //       console.error('Error loading reading progress:', error);
  //     }
  //   }
  // };

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
          console.log('SET CURRENT PAGE TO:', savedPage); // Debug log
        }
        setProgressLoaded(true); // Mark progress as loaded
      } catch (error) {
        console.error('Error loading reading progress:', error);
        setProgressLoaded(true); // Still mark as loaded even if failed
      }
    } else {
      setProgressLoaded(true);
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

  // const renderPdfReader = () => {
  //   console.log('Rendering PDF with URL:', book.downloadURL);
  //   console.log('Retry count:', retryCount);

  //   // Create a modified URL for retry attempts
  //   const modifiedUrl =
  //     retryCount > 0
  //       ? `${book.downloadURL}${
  //           book.downloadURL.includes('?') ? '&' : '?'
  //         }_retry=${retryCount}`
  //       : book.downloadURL;

  //   return (
  //     <Pdf
  //       key={`pdf-${retryCount}`} // Force re-render on retry
  //       source={{
  //         uri: modifiedUrl,
  //         cache: false,
  //         headers: {
  //           Accept: 'application/pdf',
  //           'User-Agent': 'ReactNative PDF Reader',
  //           'Cache-Control': 'no-cache',
  //         },
  //       }}
  //       onLoadComplete={handleLoadComplete}
  //       onPageChanged={handlePageChanged}
  //       onError={handlePdfError}
  //       onLoadProgress={handleLoadProgress}
  //       style={styles.pdf}
  //       trustAllCerts={false}
  //       page={currentPage}
  //       horizontal={false}
  //       spacing={0}
  //       // password=""
  //       scale={1.0}
  //       minScale={0.5}
  //       maxScale={3.0}
  //       fitPolicy={0}
  //       enablePaging={true}
  //       enableRTL={false}
  //       enableAnnotationRendering={false} // Disable to reduce complexity
  //       showsHorizontalScrollIndicator={false}
  //       showsVerticalScrollIndicator={false}
  //       // Additional props to handle SSL issues
  //       enableDoubleTapZoom={false}
  //       singlePage={false}
  //       // Network configuration
  //       activityIndicator={null}
  //       renderActivityIndicator={() => (
  //         <View style={styles.loadingContainer}>
  //           <LoadingSpinner message="Loading PDF content..." />
  //         </View>
  //       )}
  //     />
  //   );
  // };

  const renderPdfReader = () => {
    console.log('Rendering PDF with URL:', book.downloadURL);
    console.log('Current page for PDF:', currentPage);
    console.log('Progress loaded:', progressLoaded); // Debug log

    // Don't render PDF until progress is loaded
    if (!progressLoaded) {
      console.log('Waiting for progress to load...');
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Loading reading position..." />
        </View>
      );
    }

    // Create a modified URL for retry attempts
    const modifiedUrl =
      retryCount > 0
        ? `${book.downloadURL}${
            book.downloadURL.includes('?') ? '&' : '?'
          }_retry=${retryCount}`
        : book.downloadURL;

    return (
      <Pdf
        key={`pdf-${retryCount}-${currentPage}`} // Include currentPage in key to force refresh
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
        page={currentPage} // This should now work correctly
        horizontal={false}
        spacing={0}
        scale={1.0}
        minScale={0.5}
        maxScale={3.0}
        fitPolicy={0}
        enablePaging={true}
        enableRTL={false}
        enableAnnotationRendering={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        enableDoubleTapZoom={false}
        singlePage={false}
        activityIndicator={null}
        renderActivityIndicator={() => (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message="Loading PDF content..." />
          </View>
        )}
      />
    );
  };

  // const renderEpubReader = () => (
  //   <View style={styles.epubContainer}>
  //     <Card style={styles.mockReader}>
  //       <Card.Content>
  //         <Text style={styles.mockText}>EPUB Reader Component</Text>
  //         <Text style={styles.mockSubText}>
  //           This is a placeholder for the EPUB reader. EPUB files are not yet
  //           supported in this version.
  //         </Text>
  //         <View style={styles.mockControls}>
  //           <Button
  //             mode="outlined"
  //             onPress={() => {
  //               const newPage = Math.max(currentPage - 1, 1);
  //               setCurrentPage(newPage);
  //               if (!totalPages) setTotalPages(50);
  //             }}
  //             disabled={currentPage <= 1}
  //           >
  //             Previous
  //           </Button>
  //           <Text style={styles.mockPageText}>
  //             Page {currentPage} of {totalPages || 50}
  //           </Text>
  //           <Button
  //             mode="outlined"
  //             onPress={() => {
  //               const maxPages = totalPages || 50;
  //               const newPage = Math.min(currentPage + 1, maxPages);
  //               setCurrentPage(newPage);
  //               if (!totalPages) setTotalPages(50);
  //             }}
  //           >
  //             Next
  //           </Button>
  //         </View>
  //       </Card.Content>
  //     </Card>
  //   </View>
  // );

const renderEpubReader = () => {
  // Don't render EPUB until progress is loaded
  if (!progressLoaded || !epubReady) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Loading EPUB reader..." />
      </View>
    );
  }

  return (
    <View style={styles.epubReaderContainer}>
      <EpubReaderComponent />
    </View>
  );
};

// ADD this new component inside your ReadingScreen component (before the return statement):
const EpubReaderComponent = () => {
  const [isReady, setIsReady] = useState(false);
  const [epubError, setEpubError] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(0);

  return (
    // <ReaderProvider>
      <Reader
        src={book.downloadURL}
        // width={width}
        // height={height - 200}
        fileSystem={useFileSystem}
        // initialLocation={currentPage > 1 ? `epubcfi(/6/4[chapter-${currentPage}]!)` : undefined}
        // onReady={() => {
        //   console.log('EPUB Reader ready');
        //   setIsReady(true);
        //   setEpubError(null);
        // }}
        // onError={(error) => {
        //   console.error('EPUB Reader error:', error);
        //   setEpubError(error.message || 'Failed to load EPUB');
        // }}
        // onLocationChange={(location) => {
        //   console.log('Location changed:', location);
        //   if (location && location.start) {
        //     // Extract page info from location
        //     const newPage = location.start.displayed.page || currentPage;
        //     const totalPgs = location.start.displayed.total || totalPages;
            
        //     if (newPage !== currentPage || totalPgs !== totalPages) {
        //       setCurrentPage(newPage);
        //       setTotalPages(totalPgs);
              
        //       // Calculate progress
        //       const newProgress = Math.min(newPage / totalPgs, 1);
        //       setProgress(newProgress);
        //     }
        //   }
        // }}
        // onNavigationLoaded={(navigation) => {
        //   console.log('Navigation loaded:', navigation);
        //   if (navigation && navigation.toc) {
        //     setChapters(navigation.toc);
        //     setTotalPages(navigation.toc.length);
        //   }
        // }}
        // enableSwipe={true}
        // enableSelection={true}
        // theme={{
        //   'body': {
        //     'color': '#333',
        //     'background': '#fff',
        //     'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        //     'font-size': '16px',
        //     'line-height': '1.6',
        //     'padding': '20px'
        //   },
        //   'h1, h2, h3': {
        //     'color': '#6200EE',
        //     'margin-top': '30px',
        //     'margin-bottom': '15px'
        //   },
        //   'p': {
        //     'margin-bottom': '15px',
        //     'text-align': 'justify'
        //   }
        // }}
      />
      
      // {epubError && (
      //   <View style={styles.errorContainer}>
      //     <Card style={styles.errorCard}>
      //       <Card.Content style={styles.errorContent}>
      //         <Icon name="error" size={48} color="#d32f2f" />
      //         <Text style={styles.errorTitle}>EPUB Loading Error</Text>
      //         <Text style={styles.errorText}>{epubError}</Text>
              
      //         <View style={styles.bookInfoCard}>
      //           <Text style={styles.bookInfoTitle}>📖 Book Information</Text>
      //           <Text style={styles.bookInfoText}>Title: {book.title}</Text>
      //           <Text style={styles.bookInfoText}>File: {book.fileName}</Text>
      //           <Text style={styles.bookInfoText}>Size: {Math.round(book.fileSize / 1024)} KB</Text>
      //           <Text style={styles.bookInfoText}>Progress: {Math.round((book.progress || 0) * 100)}%</Text>
      //         </View>
              
      //         <View style={styles.alternativeOptions}>
      //           <Text style={styles.alternativeTitle}>📱 Recommended EPUB Readers:</Text>
      //           <Text style={styles.alternativeText}>• Apple Books (iOS/Mac)</Text>
      //           <Text style={styles.alternativeText}>• Google Play Books</Text>
      //           <Text style={styles.alternativeText}>• Adobe Digital Editions</Text>
      //           <Text style={styles.alternativeText}>• Kindle App</Text>
      //           <Text style={styles.alternativeText}>• Moon+ Reader (Android)</Text>
      //         </View>
              
      //         <Button
      //           mode="contained"
      //           onPress={() => {
      //             setEpubError(null);
      //             setIsReady(false);
      //           }}
      //           style={styles.retryButton}
      //           icon="refresh"
      //         >
      //           Try Again
      //         </Button>
      //       </Card.Content>
      //     </Card>
      //   </View>
      // )}
      
      // {!isReady && !epubError && (
      //   <View style={styles.loadingOverlay}>
      //     <LoadingSpinner message="Loading EPUB content..." />
      //   </View>
      // )}
    
  );
};

// ALSO ADD these navigation helper functions in your ReadingScreen component:
const navigateToChapter = (chapterIndex) => {
  // This would be implemented with the Reader's navigation methods
  console.log('Navigate to chapter:', chapterIndex);
};

const goToPreviousChapter = () => {
  if (currentPage > 1) {
    const newPage = currentPage - 1;
    setCurrentPage(newPage);
    // Reader component should handle the navigation automatically
  }
};

const goToNextChapter = () => {
  if (currentPage < totalPages) {
    const newPage = currentPage + 1;
    setCurrentPage(newPage);
    // Reader component should handle the navigation automatically
  }
};

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
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },


  epubReaderContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  errorContent: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  bookInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6200EE',
  },
  bookInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  bookInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  alternativeOptions: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
  },
  alternativeText: {
    fontSize: 13,
    color: '#1565c0',
    marginBottom: 3,
    paddingLeft: 10,
  },
  retryButton: {
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReadingScreen;
