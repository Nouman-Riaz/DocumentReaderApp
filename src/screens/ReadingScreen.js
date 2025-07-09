import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
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
import { useAuthState } from '../services/authService';
import {
  saveReadingProgress,
  getReadingProgress,
} from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useQueryClient } from '@tanstack/react-query';
import { unzip } from 'react-native-zip-archive';
import RNFS from 'react-native-fs';
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
  const [epubContent, setEpubContent] = useState('');
  const [chapters, setChapters] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [epubHtml, setEpubHtml] = useState('');
  const [epubData, setEpubData] = useState(null);
  const [downloadingEpub, setDownloadingEpub] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    console.log('ReadingScreen mounted with book:', book);
    validateAndLoadBook();
  }, []);

  useEffect(() => {
    if (book.fileType?.includes('epub')) {
      generateEpubHtml();
    }
  }, [book]);

  useEffect(() => {
    if (epubData && webviewRef.current) {
      console.log('Sending EPUB data to WebView...');
      setTimeout(() => {
        sendMessageToWebView({
          type: 'loadEpubData',
          epubData: epubData,
        });
      }, 1000);
    }
  }, [epubData]);

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
      // if (book.fileType?.includes('epub')) {
      //   setEpubReady(true);
      // }
      if (book.fileType?.includes('epub')) {
        // Download EPUB file first
        downloadEpubFile();
      } else {
        setLoading(false);
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

  // const goToPage = page => {
  //   if (page >= 1 && page <= totalPages) {
  //     setCurrentPage(page);
  //   }
  // };

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

  const downloadEpubFile = async () => {
    if (!book.downloadURL) return;

    setDownloadingEpub(true);
    setLoading(true);

    try {
      console.log('Downloading EPUB file...');

      const response = await fetch(book.downloadURL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(
        'EPUB downloaded successfully:',
        arrayBuffer.byteLength,
        'bytes',
      );

      // Convert ArrayBuffer to base64 string for WebView using chunked approach
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log('Converting to base64 in chunks...');

      // Convert to base64 in chunks to avoid call stack overflow
      const base64String = arrayBufferToBase64(uint8Array);

      setEpubData({
        base64: base64String,
        size: arrayBuffer.byteLength,
        url: book.downloadURL,
      });

      console.log(
        'EPUB converted to base64 successfully, length:',
        base64String.length,
      );
    } catch (error) {
      console.error('EPUB download failed:', error);
      setError(`Failed to download EPUB: ${error.message}`);
      setLoading(false);
    } finally {
      setDownloadingEpub(false);
    }
  };

  // Add this new helper function for chunked base64 conversion:
  const arrayBufferToBase64 = uint8Array => {
    try {
      const chunkSize = 8192; // Process 8KB at a time
      let result = '';

      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        const chunkString = String.fromCharCode.apply(null, chunk);
        result += chunkString;
      }

      return btoa(result);
    } catch (error) {
      console.error('Base64 conversion error:', error);
      throw new Error('Failed to convert file to base64: ' + error.message);
    }
  };

  const generateEpubHtml = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>EPUB Reader</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background-color: #fff;
                  overflow-x: hidden;
              }
              .loading-container {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  flex-direction: column;
              }
              .status {
                  font-size: 16px;
                  color: #666;
                  margin-bottom: 20px;
                  text-align: center;
                  padding: 0 20px;
              }
              .error {
                  color: #d32f2f;
                  background: #ffebee;
                  padding: 15px;
                  border-radius: 8px;
                  margin: 10px 20px;
                  text-align: center;
              }
              .epub-reader {
                  display: none;
                  height: 100vh;
                  flex-direction: column;
              }
              .epub-content {
                  flex: 1;
                  padding: 20px;
                  overflow-y: auto;
                  line-height: 1.6;
                  font-size: 16px;
                  color: #333;
                  background: #fff;
              }
              .epub-content h1, .epub-content h2, .epub-content h3 {
                  color: #2c3e50;
                  margin-top: 30px;
                  margin-bottom: 15px;
              }
              .epub-content p {
                  margin-bottom: 15px;
                  text-align: justify;
              }
              .epub-content img {
                  max-width: 100%;
                  height: auto;
                  display: block;
                  margin: 20px auto;
              }
              .nav-controls {
                  background: #f8f9fa;
                  padding: 15px;
                  border-top: 1px solid #dee2e6;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  flex-shrink: 0;
              }
              .nav-button {
                  background: #6200EE;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  min-width: 80px;
              }
              .nav-button:hover {
                  background: #5500DD;
              }
              .nav-button:disabled {
                  background: #ccc;
                  cursor: not-allowed;
              }
              .page-info {
                  font-size: 14px;
                  color: #666;
                  font-weight: 500;
              }
              .chapter-title {
                  background: #e3f2fd;
                  padding: 10px 15px;
                  margin: -20px -20px 20px -20px;
                  border-bottom: 2px solid #2196F3;
                  font-weight: bold;
                  color: #1976d2;
                  font-size: 18px;
              }
              .loading-spinner {
                  width: 40px;
                  height: 40px;
                  border: 4px solid #f3f3f3;
                  border-top: 4px solid #6200EE;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin-bottom: 20px;
              }
              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }
          </style>
      </head>
      <body>
          <div id="loading-container" class="loading-container">
              <div class="loading-spinner"></div>
              <div id="status" class="status">Ready to load EPUB...</div>
          </div>
          
          <div id="epub-reader" class="epub-reader">
              <div id="epub-content" class="epub-content">
                  <!-- EPUB content will be displayed here -->
              </div>
              <div class="nav-controls">
                  <button id="prev-btn" class="nav-button" onclick="previousChapter()">Previous</button>
                  <div id="page-info" class="page-info">Chapter 1 of 1</div>
                  <button id="next-btn" class="nav-button" onclick="nextChapter()">Next</button>
              </div>
          </div>
  
          <script>
              let epubData = null;
              let chapters = [];
              let currentChapterIndex = 0;
              let bookTitle = '';
              let zip = null;
              
              function log(message) {
                  console.log(message);
                  sendMessage('log', message);
              }
              
              function sendMessage(type, data) {
                  try {
                      window.ReactNativeWebView?.postMessage(JSON.stringify({
                          type: type,
                          data: data,
                          timestamp: Date.now()
                      }));
                  } catch (e) {
                      console.error('Failed to send message:', e);
                  }
              }
              
              function updateStatus(message, isError = false) {
                  const statusEl = document.getElementById('status');
                  if (statusEl) {
                      statusEl.textContent = message;
                      statusEl.className = isError ? 'status error' : 'status';
                  }
                  log(message);
              }
              
              function showError(message) {
                  const container = document.getElementById('loading-container');
                  container.innerHTML = '<div class="error">' + message + '</div>';
                  sendMessage('error', message);
              }
              
              function base64ToArrayBuffer(base64) {
                  try {
                      const binaryString = atob(base64);
                      const bytes = new Uint8Array(binaryString.length);
                      for (let i = 0; i < binaryString.length; i++) {
                          bytes[i] = binaryString.charCodeAt(i);
                      }
                      return bytes.buffer;
                  } catch (error) {
                      console.error('Error converting base64 to ArrayBuffer:', error);
                      throw error;
                  }
              }
              
              async function processEpubData(data) {
                  try {
                      updateStatus('Processing EPUB data...');
                      
                      // Convert base64 back to ArrayBuffer
                      const arrayBuffer = base64ToArrayBuffer(data.base64);
                      log('Converted base64 to ArrayBuffer: ' + arrayBuffer.byteLength + ' bytes');
                      
                      // Load the EPUB with JSZip
                      updateStatus('Extracting EPUB archive...');
                      zip = await JSZip.loadAsync(arrayBuffer);
                      log('EPUB archive loaded successfully');
                      
                      // Parse EPUB structure
                      await parseEpubStructure();
                      
                      // Display first chapter
                      await displayChapter(0);
                      
                      // Show the reader interface
                      document.getElementById('loading-container').style.display = 'none';
                      document.getElementById('epub-reader').style.display = 'flex';
                      
                      // Send success message
                      sendMessage('epub_loaded', {
                          size: data.size,
                          pages: chapters.length,
                          currentPage: 1,
                          title: bookTitle
                      });
                      
                      log('EPUB processing completed successfully');
                      
                  } catch (error) {
                      log('Error processing EPUB: ' + error.message);
                      showError('Failed to process EPUB: ' + error.message);
                  }
              }
              
              async function parseEpubStructure() {
    try {
        updateStatus('Parsing EPUB structure...');
        
        // Find and parse the container.xml
        const containerFile = zip.file('META-INF/container.xml');
        if (!containerFile) {
            throw new Error('Invalid EPUB: No container.xml found');
        }
        
        const containerXml = await containerFile.async('text');
        const containerDoc = new DOMParser().parseFromString(containerXml, 'text/xml');
        
        // Get the OPF file path
        const rootfileElement = containerDoc.querySelector('rootfile');
        if (!rootfileElement) {
            throw new Error('No rootfile found in container.xml');
        }
        
        const opfPath = rootfileElement.getAttribute('full-path');
        log('Found OPF file: ' + opfPath);
        
        // Parse the OPF file
        const opfFile = zip.file(opfPath);
        if (!opfFile) {
            throw new Error('OPF file not found: ' + opfPath);
        }
        
        const opfXml = await opfFile.async('text');
        const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');
        
        // Get book title - use getElementsByTagName for XML namespaced elements
        let titleElement = null;
        
        // Try different ways to get the title
        try {
            // Method 1: Try getElementsByTagName for namespaced elements
            const dcTitles = opfDoc.getElementsByTagName('dc:title');
            if (dcTitles.length > 0) {
                titleElement = dcTitles[0];
            }
        } catch (e) {
            log('Method 1 failed: ' + e.message);
        }
        
        if (!titleElement) {
            try {
                // Method 2: Try without namespace
                const titles = opfDoc.getElementsByTagName('title');
                if (titles.length > 0) {
                    titleElement = titles[0];
                }
            } catch (e) {
                log('Method 2 failed: ' + e.message);
            }
        }
        
        if (!titleElement) {
            try {
                // Method 3: Try querySelector with different selectors
                titleElement = opfDoc.querySelector('title') || 
                              opfDoc.querySelector('[name="title"]');
            } catch (e) {
                log('Method 3 failed: ' + e.message);
            }
        }
        
        bookTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
        log('Book title: ' + bookTitle);
        
        // Get the base path for content files
        const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
        
        // Parse the spine (reading order) - use getElementsByTagName
        const spineElement = opfDoc.getElementsByTagName('spine')[0];
        const spineItems = spineElement ? spineElement.getElementsByTagName('itemref') : [];
        
        const manifestElement = opfDoc.getElementsByTagName('manifest')[0];
        const manifestItems = manifestElement ? manifestElement.getElementsByTagName('item') : [];
        
        // Create a map of manifest items
        const manifestMap = {};
        for (let i = 0; i < manifestItems.length; i++) {
            const item = manifestItems[i];
            const id = item.getAttribute('id');
            const href = item.getAttribute('href');
            const mediaType = item.getAttribute('media-type');
            
            if (id && href) {
                manifestMap[id] = {
                    href: href,
                    mediaType: mediaType
                };
            }
        }
        
        log('Found ' + Object.keys(manifestMap).length + ' manifest items');
        
        // Build chapters array from spine
        chapters = [];
        
        if (spineItems.length > 0) {
            // Use spine items (proper EPUB structure)
            for (let i = 0; i < spineItems.length; i++) {
                const itemref = spineItems[i];
                const idref = itemref.getAttribute('idref');
                const manifestItem = manifestMap[idref];
                
                if (manifestItem) {
                    const isHtml = manifestItem.mediaType === 'application/xhtml+xml' || 
                                  manifestItem.href.endsWith('.html') || 
                                  manifestItem.href.endsWith('.xhtml') ||
                                  manifestItem.href.endsWith('.htm');
                    
                    if (isHtml) {
                        const chapterPath = basePath + manifestItem.href;
                        log('Found spine chapter: ' + chapterPath);
                        chapters.push({
                            path: chapterPath,
                            title: 'Chapter ' + (chapters.length + 1),
                            index: chapters.length
                        });
                    }
                }
            }
        }
        
        // If no spine items or no valid chapters found, look for HTML files directly
        if (chapters.length === 0) {
            log('No spine chapters found, searching for HTML files...');
            
            // Look for HTML files in manifest
            for (let i = 0; i < manifestItems.length; i++) {
                const item = manifestItems[i];
                const href = item.getAttribute('href');
                const mediaType = item.getAttribute('media-type');
                
                if (href && (
                    mediaType === 'application/xhtml+xml' ||
                    href.endsWith('.html') || 
                    href.endsWith('.xhtml') ||
                    href.endsWith('.htm')
                )) {
                    // Skip navigation files
                    const fileName = href.toLowerCase();
                    if (!fileName.includes('nav') && 
                        !fileName.includes('toc') && 
                        !fileName.includes('cover')) {
                        
                        const chapterPath = basePath + href;
                        log('Found manifest chapter: ' + chapterPath);
                        chapters.push({
                            path: chapterPath,
                            title: 'Chapter ' + (chapters.length + 1),
                            index: chapters.length
                        });
                    }
                }
            }
        }
        
        // If still no chapters, search the entire ZIP for HTML files
        if (chapters.length === 0) {
            log('No manifest chapters found, searching entire archive...');
            
            zip.forEach((relativePath, file) => {
                const fileName = relativePath.toLowerCase();
                if ((fileName.endsWith('.html') || 
                     fileName.endsWith('.xhtml') ||
                     fileName.endsWith('.htm')) &&
                    !fileName.includes('nav') &&
                    !fileName.includes('toc') &&
                    !fileName.includes('cover')) {
                    
                    log('Found archive chapter: ' + relativePath);
                    chapters.push({
                        path: relativePath,
                        title: 'Chapter ' + (chapters.length + 1),
                        index: chapters.length
                    });
                }
            });
        }
        
        // Sort chapters by filename if they contain numbers
        chapters.sort((a, b) => {
            const aMatch = a.path.match(/(\d+)/);
            const bMatch = b.path.match(/(\d+)/);
            
            if (aMatch && bMatch) {
                return parseInt(aMatch[1]) - parseInt(bMatch[1]);
            }
            
            return a.path.localeCompare(b.path);
        });
        
        // Update chapter titles with proper numbering
        chapters.forEach((chapter, index) => {
            chapter.title = 'Chapter ' + (index + 1);
            chapter.index = index;
        });
        
        log('Found ' + chapters.length + ' total chapters');
        
        if (chapters.length === 0) {
            throw new Error('No readable chapters found in EPUB');
        }
        
        // Debug: log all chapter paths
        chapters.forEach((chapter, index) => {
            log('Chapter ' + (index + 1) + ': ' + chapter.path);
        });
        
    } catch (error) {
        log('Error parsing EPUB structure: ' + error.message);
        throw error;
    }
}
              
              async function displayChapter(chapterIndex) {
    try {
        if (chapterIndex < 0 || chapterIndex >= chapters.length) {
            return;
        }
        
        currentChapterIndex = chapterIndex;
        const chapter = chapters[chapterIndex];
        
        updateStatus('Loading chapter: ' + chapter.title);
        log('Displaying chapter: ' + chapter.path);
        
        // Get the chapter file
        const chapterFile = zip.file(chapter.path);
        if (!chapterFile) {
            throw new Error('Chapter file not found: ' + chapter.path);
        }
        
        // Read the chapter content
        const chapterHtml = await chapterFile.async('text');
        
        // Parse and clean the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(chapterHtml, 'text/html');
        
        // Try to get body, or fallback to documentElement
        let contentElement = doc.body;
        if (!contentElement || !contentElement.textContent.trim()) {
            contentElement = doc.documentElement;
        }
        
        // Extract text content and basic formatting
        let cleanContent = '';
        let chapterTitle = chapter.title;
        
        if (contentElement) {
            // Try to get a better chapter title
            const headings = contentElement.querySelectorAll('h1, h2, h3, title');
            if (headings.length > 0) {
                const firstHeading = headings[0];
                const headingText = firstHeading.textContent.trim();
                if (headingText && headingText.length > 0 && headingText.length < 100) {
                    chapterTitle = headingText;
                }
            }
            
            // Add chapter title
            cleanContent += '<div class="chapter-title">' + escapeHtml(chapterTitle) + '</div>';
            
            // Process content elements
            const contentElements = contentElement.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, span, section, article');
            
            if (contentElements.length > 0) {
                contentElements.forEach(el => {
                    const text = el.textContent.trim();
                    if (text.length > 0) {
                        const tagName = el.tagName.toLowerCase();
                        if (tagName.startsWith('h')) {
                            cleanContent += '<' + tagName + '>' + escapeHtml(text) + '</' + tagName + '>';
                        } else {
                            cleanContent += '<p>' + escapeHtml(text) + '</p>';
                        }
                    }
                });
            } else {
                // Fallback: get all text content and split into paragraphs
                const allText = contentElement.textContent.trim();
                if (allText.length > 0) {
                    // Split by multiple newlines or periods followed by whitespace
                    const sentences = allText.split(/[.!?]+\\s+|\\n\\s*\\n+/);
                    
                    sentences.forEach(sentence => {
                        const trimmed = sentence.trim();
                        if (trimmed.length > 20) { // Only include substantial sentences
                            cleanContent += '<p>' + escapeHtml(trimmed + '.') + '</p>';
                        }
                    });
                }
            }
        }
        
        // If still no content, show an error message
        if (cleanContent === '<div class="chapter-title">' + escapeHtml(chapterTitle) + '</div>') {
            cleanContent += '<p><em>No readable content found in this chapter.</em></p>';
            cleanContent += '<p><small>Chapter file: ' + escapeHtml(chapter.path) + '</small></p>';
        }
        
        // Display the content
        document.getElementById('epub-content').innerHTML = cleanContent;
        
        // Update navigation
        updateNavigation();
        
        // Scroll to top
        document.getElementById('epub-content').scrollTop = 0;
        
        // Send chapter change notification
        sendMessage('chapter_changed', {
            chapter: chapterIndex + 1,
            total: chapters.length,
            title: chapterTitle
        });
        
        log('Chapter displayed successfully');
        
    } catch (error) {
        log('Error displaying chapter: ' + error.message);
        showError('Error loading chapter: ' + error.message);
    }
}
              
              function escapeHtml(unsafe) {
                  return unsafe
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/"/g, "&quot;")
                      .replace(/'/g, "&#039;");
              }
              
              function updateNavigation() {
                  const pageInfo = document.getElementById('page-info');
                  const prevBtn = document.getElementById('prev-btn');
                  const nextBtn = document.getElementById('next-btn');
                  
                  pageInfo.textContent = 'Chapter ' + (currentChapterIndex + 1) + ' of ' + chapters.length;
                  
                  prevBtn.disabled = currentChapterIndex <= 0;
                  nextBtn.disabled = currentChapterIndex >= chapters.length - 1;
              }
              
              function previousChapter() {
                  if (currentChapterIndex > 0) {
                      displayChapter(currentChapterIndex - 1);
                  }
              }
              
              function nextChapter() {
                  if (currentChapterIndex < chapters.length - 1) {
                      displayChapter(currentChapterIndex + 1);
                  }
              }
              
              function goToChapter(chapterIndex) {
                  if (chapterIndex >= 0 && chapterIndex < chapters.length) {
                      displayChapter(chapterIndex);
                  }
              }
              
              function handleMessage(data) {
                  log('Received message: ' + JSON.stringify(data));
                  
                  switch(data.type) {
                      case 'loadEpubData':
                          epubData = data.epubData;
                          processEpubData(epubData);
                          break;
                      case 'goToPage':
                          goToChapter(data.page - 1);
                          break;
                      case 'goNext':
                          nextChapter();
                          break;
                      case 'goPrev':
                          previousChapter();
                          break;
                      case 'test':
                          log('Test message received');
                          break;
                  }
              }
              
              // Listen for messages
              document.addEventListener('message', function(event) {
                  try {
                      const data = JSON.parse(event.data);
                      handleMessage(data);
                  } catch (e) {
                      log('Message parse error: ' + e.message);
                  }
              });
              
              window.addEventListener('message', function(event) {
                  try {
                      const data = JSON.parse(event.data);
                      handleMessage(data);
                  } catch (e) {
                      log('Message parse error: ' + e.message);
                  }
              });
              
              // Initialize
              setTimeout(() => {
                  log('EPUB Reader initialized and ready');
                  updateStatus('Ready to receive EPUB data from React Native');
              }, 500);
              
          </script>
      </body>
      </html>
    `;

    setEpubHtml(html);
  };

  // Update your handleWebViewMessage function to handle the new messages:
  const handleWebViewMessage = event => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message received:', data);

      switch (data.type) {
        case 'log':
          console.log('[WebView]', data.data);
          break;

        case 'epub_loaded':
          console.log('EPUB loaded successfully:', data.data);
          setLoading(false);
          setEpubReady(true);
          setTotalPages(data.data.pages || 1);
          setCurrentPage(data.data.currentPage || 1);
          // Update book title if available
          if (data.data.title) {
            console.log('Book title from EPUB:', data.data.title);
          }
          break;

        case 'chapter_changed':
          console.log('Chapter changed:', data.data);
          setCurrentPage(data.data.chapter);
          setTotalPages(data.data.total);
          break;

        case 'error':
          console.error('WebView error:', data.data);
          setError(`EPUB Error: ${data.data}`);
          setLoading(false);
          break;

        default:
          console.log('Unknown WebView message:', data);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const sendMessageToWebView = message => {
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify(message));
    }
  };

  const goToPageEpub = page => {
    sendMessageToWebView({
      type: 'goToPage',
      page: page,
    });
  };

  const goNextEpub = () => {
    sendMessageToWebView({
      type: 'goNext',
    });
  };

  const goPrevEpub = () => {
    sendMessageToWebView({
      type: 'goPrev',
    });
  };

  const renderEpubReader = () => {
    if (!epubHtml) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message="Preparing EPUB reader..." />
        </View>
      );
    }

    const htmlWithUrl = epubHtml.replace(
      'if (window.epubUrl) {',
      `window.epubUrl = "${book.downloadURL}";
       if (window.epubUrl) {`,
    );

    return (
      <View style={styles.epubReaderContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: htmlWithUrl }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          mixedContentMode="compatibility"
          onError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error: ', nativeEvent);
            setError(`WebView error: ${nativeEvent.description}`);
            setLoading(false);
          }}
          onHttpError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error: ', nativeEvent);
            setError(`HTTP error: ${nativeEvent.statusCode}`);
            setLoading(false);
          }}
          onLoadStart={() => {
            console.log('WebView load started');
          }}
          onLoadEnd={() => {
            console.log('WebView load ended');
            if (epubData) {
              setTimeout(() => {
                sendMessageToWebView({
                  type: 'loadEpubData',
                  epubData: epubData,
                });
              }, 1000);
            }
          }}
        />

        {loading && (
          <View style={styles.loadingOverlay}>
            <LoadingSpinner message="Loading EPUB content..." />
          </View>
        )}
      </View>
    );
  };

  // 6. Update the goToPage function to handle both PDF and EPUB:
  const goToPage = page => {
    if (page >= 1 && page <= totalPages) {
      if (book.fileType?.includes('epub')) {
        goToPageEpub(page);
      } else {
        setCurrentPage(page);
      }
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
  epubTextContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentScrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  chapterTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#6200EE',
    paddingBottom: 10,
  },
  chapterContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'justify',
  },
  chapterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  chapterButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  chapterInfo: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
  },
});

export default ReadingScreen;
