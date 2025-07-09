// import { firestoreService } from './firebaseConfig';

// // Reading Progress Functions
// export const saveReadingProgress = async (userId, bookId, progress, currentPage = 1, totalPages = 1) => {
//   try {
//     const progressData = {
//       progress: Math.min(Math.max(progress, 0), 1), // Ensure between 0 and 1
//       currentPage,
//       totalPages,
//       lastRead: new Date(),
//       updatedAt: new Date(),
//       isCompleted: progress >= 0.95 // Consider 95% as completed
//     };

//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_progress')
//       .doc(bookId)
//       .set(progressData, { merge: true });

//     // Add to reading history if progress > 0
//     if (progress > 0) {
//       await addToReadingHistory(userId, bookId, progressData);
//     }

//     return { success: true };
//   } catch (error) {
//     console.error('Save reading progress error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const getReadingProgress = async (userId, bookId) => {
//   try {
//     const doc = await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_progress')
//       .doc(bookId)
//       .get();
    
//     if (doc.exists) {
//       return { success: true, data: doc.data() };
//     }
//     return { success: true, data: null };
//   } catch (error) {
//     console.error('Get reading progress error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Library Functions
// export const saveBookToLibrary = async (userId, bookData) => {
//   try {
//     const bookWithMeta = {
//       ...bookData,
//       addedAt: new Date(),
//       progress: 0,
//       currentPage: 1,
//       totalPages: bookData.totalPages || 1,
//       lastRead: null,
//       isCompleted: false
//     };

//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('library')
//       .doc(bookData.id)
//       .set(bookWithMeta);

//     return { success: true };
//   } catch (error) {
//     console.error('Save book to library error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const getUserLibrary = async (userId) => {
//   try {
//     const snapshot = await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('library')
//       .orderBy('addedAt', 'desc')
//       .get();
    
//     const books = [];
    
//     for (const doc of snapshot.docs) {
//       const bookData = { id: doc.id, ...doc.data() };
      
//       // Get latest reading progress for each book
//       const progressResult = await getReadingProgress(userId, doc.id);
//       if (progressResult.success && progressResult.data) {
//         bookData.progress = progressResult.data.progress || 0;
//         bookData.currentPage = progressResult.data.currentPage || 1;
//         bookData.lastRead = progressResult.data.lastRead;
//         bookData.isCompleted = progressResult.data.isCompleted || false;
//       }
      
//       books.push(bookData);
//     }
    
//     return { success: true, data: books };
//   } catch (error) {
//     console.error('Get user library error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const deleteBookFromLibrary = async (userId, bookId) => {
//   try {
//     // Delete from library
//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('library')
//       .doc(bookId)
//       .delete();

//     // Delete reading progress
//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_progress')
//       .doc(bookId)
//       .delete();

//     // Remove from reading history
//     await removeFromReadingHistory(userId, bookId);

//     return { success: true };
//   } catch (error) {
//     console.error('Delete book error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // Reading History Functions
// export const addToReadingHistory = async (userId, bookId, progressData) => {
//   try {
//     const historyData = {
//       bookId,
//       lastRead: progressData.lastRead,
//       progress: progressData.progress,
//       currentPage: progressData.currentPage,
//       totalPages: progressData.totalPages,
//       isCompleted: progressData.isCompleted,
//       updatedAt: new Date()
//     };

//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_history')
//       .doc(bookId)
//       .set(historyData, { merge: true });

//     return { success: true };
//   } catch (error) {
//     console.error('Add to reading history error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const getReadingHistory = async (userId, limit = 50) => {
//   try {
//     const snapshot = await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_history')
//       .orderBy('lastRead', 'desc')
//       .limit(limit)
//       .get();
    
//     const historyItems = [];
    
//     for (const doc of snapshot.docs) {
//       const historyData = doc.data();
      
//       // Get book details from library
//       const bookDoc = await firestoreService
//         .collection('users')
//         .doc(userId)
//         .collection('library')
//         .doc(historyData.bookId)
//         .get();
      
//       if (bookDoc.exists) {
//         const bookData = bookDoc.data();
//         historyItems.push({
//           id: doc.id,
//           ...historyData,
//           bookData: {
//             id: bookDoc.id,
//             ...bookData
//           }
//         });
//       }
//     }
    
//     return { success: true, data: historyItems };
//   } catch (error) {
//     console.error('Get reading history error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const clearReadingHistory = async (userId) => {
//   try {
//     const snapshot = await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_history')
//       .get();

//     const batch = firestoreService.batch();
    
//     snapshot.docs.forEach(doc => {
//       batch.delete(doc.ref);
//     });

//     await batch.commit();
//     return { success: true };
//   } catch (error) {
//     console.error('Clear reading history error:', error);
//     return { success: false, error: error.message };
//   }
// };

// export const removeFromReadingHistory = async (userId, bookId) => {
//   try {
//     await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_history')
//       .doc(bookId)
//       .delete();

//     return { success: true };
//   } catch (error) {
//     console.error('Remove from reading history error:', error);
//     return { success: false, error: error.message };
//   }
// };

// // User Statistics
// export const getUserStats = async (userId) => {
//   try {
//     const [libraryResult, historyResult] = await Promise.all([
//       getUserLibrary(userId),
//       getReadingHistory(userId)
//     ]);

//     if (!libraryResult.success) {
//       throw new Error('Failed to get library data');
//     }

//     const books = libraryResult.data || [];
//     const history = historyResult.success ? historyResult.data || [] : [];

//     const stats = {
//       totalBooks: books.length,
//       completedBooks: books.filter(book => book.isCompleted).length,
//       inProgressBooks: books.filter(book => book.progress > 0 && !book.isCompleted).length,
//       unreadBooks: books.filter(book => book.progress === 0).length,
//       pdfBooks: books.filter(book => book.fileType?.includes('pdf')).length,
//       epubBooks: books.filter(book => book.fileType?.includes('epub')).length,
//       totalReadingTime: history.length, // You can enhance this with actual time tracking
//       lastReadBook: history.length > 0 ? history[0] : null
//     };

//     return { success: true, data: stats };
//   } catch (error) {
//     console.error('Get user stats error:', error);
//     return { success: false, error: error.message };
//   }
// };

import { firestoreService } from './firebaseConfig';

// Reading Progress Functions (No changes - still user-specific)
export const saveReadingProgress = async (userId, bookId, progress, currentPage = 1, totalPages = 1) => {
  try {
    const progressData = {
      progress: Math.min(Math.max(progress, 0), 1),
      currentPage,
      totalPages,
      lastRead: new Date(),
      updatedAt: new Date(),
      isCompleted: progress >= 0.95
    };

    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_progress')
      .doc(bookId)
      .set(progressData, { merge: true });

    if (progress > 0) {
      await addToReadingHistory(userId, bookId, progressData);
    }

    return { success: true };
  } catch (error) {
    console.error('Save reading progress error:', error);
    return { success: false, error: error.message };
  }
};

export const getReadingProgress = async (userId, bookId) => {
  try {
    const doc = await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_progress')
      .doc(bookId)
      .get();
    
    if (doc.exists) {
      return { success: true, data: doc.data() };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Get reading progress error:', error);
    return { success: false, error: error.message };
  }
};

// MODIFIED: Library Functions - Now uses shared books collection
export const saveBookToLibrary = async (userId, bookData) => {
  try {
    const bookWithMeta = {
      ...bookData,
      uploadedBy: userId, // Track who uploaded the book
      uploadedByEmail: bookData.uploaderEmail || '', // Optional: store uploader email
      uploadedAt: new Date(),
      isPublic: true, // All books are public in shared library
      downloadCount: 0, // Track how many times downloaded
      viewCount: 0 // Track how many times viewed
    };

    // Save to shared books collection
    await firestoreService
      .collection('books')
      .doc(bookData.id)
      .set(bookWithMeta);

    return { success: true };
  } catch (error) {
    console.error('Save book to library error:', error);
    return { success: false, error: error.message };
  }
};

// MODIFIED: Get all books from shared collection with user's progress
export const getUserLibrary = async (userId) => {
  try {
    // Get all books from shared collection
    const snapshot = await firestoreService
      .collection('books')
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const books = [];
    
    for (const doc of snapshot.docs) {
      const bookData = { id: doc.id, ...doc.data() };
      
      // Get user's reading progress for each book
      const progressResult = await getReadingProgress(userId, doc.id);
      if (progressResult.success && progressResult.data) {
        bookData.progress = progressResult.data.progress || 0;
        bookData.currentPage = progressResult.data.currentPage || 1;
        bookData.lastRead = progressResult.data.lastRead;
        bookData.isCompleted = progressResult.data.isCompleted || false;
      } else {
        // Default values if user hasn't read this book
        bookData.progress = 0;
        bookData.currentPage = 1;
        bookData.lastRead = null;
        bookData.isCompleted = false;
      }
      
      books.push(bookData);
    }
    
    return { success: true, data: books };
  } catch (error) {
    console.error('Get user library error:', error);
    return { success: false, error: error.message };
  }
};

// MODIFIED: Delete book from shared collection (only uploader can delete)
export const deleteBookFromLibrary = async (userId, bookId) => {
  try {
    // First check if user is the uploader
    const bookDoc = await firestoreService
      .collection('books')
      .doc(bookId)
      .get();

    if (!bookDoc.exists) {
      return { success: false, error: 'Book not found' };
    }

    const bookData = bookDoc.data();
    if (bookData.uploadedBy !== userId) {
      return { success: false, error: 'Only the uploader can delete this book' };
    }

    // Delete from shared books collection
    await firestoreService
      .collection('books')
      .doc(bookId)
      .delete();

    // Delete user's reading progress (optional - you might want to keep it)
    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_progress')
      .doc(bookId)
      .delete();

    // Remove from user's reading history (optional)
    await removeFromReadingHistory(userId, bookId);

    return { success: true };
  } catch (error) {
    console.error('Delete book error:', error);
    return { success: false, error: error.message };
  }
};

// NEW: Get books uploaded by specific user
export const getUserUploadedBooks = async (userId) => {
  try {
    const snapshot = await firestoreService
      .collection('books')
      .where('uploadedBy', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .get();
    
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: books };
  } catch (error) {
    console.error('Get user uploaded books error:', error);
    return { success: false, error: error.message };
  }
};

// NEW: Increment view count when user opens a book
export const incrementBookViewCount = async (bookId) => {
  try {
    await firestoreService
      .collection('books')
      .doc(bookId)
      .update({
        viewCount: firestoreService.FieldValue.increment(1)
      });
    return { success: true };
  } catch (error) {
    console.error('Increment view count error:', error);
    return { success: false, error: error.message };
  }
};

// Reading History Functions (No changes - still user-specific)
export const addToReadingHistory = async (userId, bookId, progressData) => {
  try {
    const historyData = {
      bookId,
      lastRead: progressData.lastRead,
      progress: progressData.progress,
      currentPage: progressData.currentPage,
      totalPages: progressData.totalPages,
      isCompleted: progressData.isCompleted,
      updatedAt: new Date()
    };

    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_history')
      .doc(bookId)
      .set(historyData, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Add to reading history error:', error);
    return { success: false, error: error.message };
  }
};

// export const getReadingHistory = async (userId, limit = 50) => {
//   try {
//     const snapshot = await firestoreService
//       .collection('users')
//       .doc(userId)
//       .collection('reading_history')
//       .orderBy('lastRead', 'desc')
//       .limit(limit)
//       .get();
    
//     const historyItems = [];
    
//     for (const doc of snapshot.docs) {
//       const historyData = doc.data();
      
//       // Get book details from shared books collection
//       const bookDoc = await firestoreService
//         .collection('books')
//         .doc(historyData.bookId)
//         .get();
      
//       if (bookDoc.exists) {
//         const bookData = bookDoc.data();
//         historyItems.push({
//           id: doc.id,
//           ...historyData,
//           bookData: {
//             id: bookDoc.id,
//             ...bookData
//           }
//         });
//       }
//     }
    
//     return { success: true, data: historyItems };
//   } catch (error) {
//     console.error('Get reading history error:', error);
//     return { success: false, error: error.message };
//   }
// };

// Replace the getReadingHistory function in firestoreService with this:

export const getReadingHistory = async (userId, limit = 50) => {
  try {
    const snapshot = await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_history')
      .orderBy('lastRead', 'desc')
      .limit(limit)
      .get();
    
    const historyItems = [];
    
    for (const doc of snapshot.docs) {
      const historyData = doc.data();
      
      // Get book details from shared books collection
      const bookDoc = await firestoreService
        .collection('books')
        .doc(historyData.bookId)
        .get();
      
      if (bookDoc.exists) {
        const bookData = bookDoc.data();
        historyItems.push({
          id: doc.id,
          ...historyData,
          bookData: {
            id: bookDoc.id,
            ...bookData,
            uploadedAt: bookData.uploadedAt || bookData.addedAt,
            addedAt: bookData.addedAt || bookData.uploadedAt
          }
        });
      }
    }
    
    return { success: true, data: historyItems };
  } catch (error) {
    console.error('Get reading history error:', error);
    return { success: false, error: error.message };
  }
};

export const clearReadingHistory = async (userId) => {
  try {
    const snapshot = await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_history')
      .get();

    const batch = firestoreService.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Clear reading history error:', error);
    return { success: false, error: error.message };
  }
};

export const removeFromReadingHistory = async (userId, bookId) => {
  try {
    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_history')
      .doc(bookId)
      .delete();

    return { success: true };
  } catch (error) {
    console.error('Remove from reading history error:', error);
    return { success: false, error: error.message };
  }
};

// MODIFIED: User Statistics - now based on user's reading progress/history
export const getUserStats = async (userId) => {
  try {
    const [allBooksResult, historyResult, progressSnapshot] = await Promise.all([
      getUserLibrary(userId), // Gets all shared books with user's progress
      getReadingHistory(userId),
      firestoreService
        .collection('users')
        .doc(userId)
        .collection('reading_progress')
        .get()
    ]);

    if (!allBooksResult.success) {
      throw new Error('Failed to get library data');
    }

    const allBooks = allBooksResult.data || [];
    const history = historyResult.success ? historyResult.data || [] : [];
    
    // Calculate stats based on user's interaction with books
    const booksWithProgress = allBooks.filter(book => book.progress > 0);
    const completedBooks = booksWithProgress.filter(book => book.isCompleted);
    const inProgressBooks = booksWithProgress.filter(book => book.progress > 0 && !book.isCompleted);
    
    const stats = {
      totalBooks: allBooks.length, // All shared books available
      booksInteracted: booksWithProgress.length, // Books user has started reading
      completedBooks: completedBooks.length,
      inProgressBooks: inProgressBooks.length,
      unreadBooks: allBooks.length - booksWithProgress.length,
      pdfBooks: allBooks.filter(book => book.fileType?.includes('pdf')).length,
      epubBooks: allBooks.filter(book => book.fileType?.includes('epub')).length,
      totalReadingTime: history.length,
      lastReadBook: history.length > 0 ? history[0] : null,
      // New stats for shared library
      averageProgress: booksWithProgress.length > 0 
        ? booksWithProgress.reduce((sum, book) => sum + book.progress, 0) / booksWithProgress.length 
        : 0
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Get user stats error:', error);
    return { success: false, error: error.message };
  }
};