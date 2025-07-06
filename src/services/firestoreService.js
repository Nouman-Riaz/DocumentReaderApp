import { firestoreService } from './firebaseConfig';

export const saveReadingProgress = async (userId, bookId, progress) => {
  try {
    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('reading_progress')
      .doc(bookId)
      .set({
        progress,
        lastRead: new Date(),
        updatedAt: new Date()
      });
    return { success: true };
  } catch (error) {
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
    return { success: false, error: error.message };
  }
};

export const saveBookToLibrary = async (userId, bookData) => {
  try {
    await firestoreService
      .collection('users')
      .doc(userId)
      .collection('library')
      .doc(bookData.id)
      .set({
        ...bookData,
        addedAt: new Date()
      });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserLibrary = async (userId) => {
  try {
    const snapshot = await firestoreService
      .collection('users')
      .doc(userId)
      .collection('library')
      .get();
    
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, data: books };
  } catch (error) {
    return { success: false, error: error.message };
  }
};