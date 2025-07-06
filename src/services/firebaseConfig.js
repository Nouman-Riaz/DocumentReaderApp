// import firestore from '@react-native-firebase/firestore';
// import auth from '@react-native-firebase/auth';
// import storage from '@react-native-firebase/storage';

// TODO: Uncomment and configure when Firebase credentials are available
/*
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
*/

// Mock services for development
const mockAuth = {
    currentUser: null,
    signInWithEmailAndPassword: (email, password) => 
      Promise.resolve({ user: { uid: 'mock-uid', email } }),
    createUserWithEmailAndPassword: (email, password) => 
      Promise.resolve({ user: { uid: 'mock-uid', email } }),
    signOut: () => Promise.resolve(),
    onAuthStateChanged: (callback) => {
      // Mock user state
      setTimeout(() => callback(null), 100);
      return () => {};
    }
  };
  
  const mockFirestore = {
    collection: (path) => ({
      doc: (id) => ({
        set: (data) => Promise.resolve(),
        get: () => Promise.resolve({ exists: true, data: () => ({}) }),
        update: (data) => Promise.resolve(),
        onSnapshot: (callback) => {
          callback({ exists: true, data: () => ({}) });
          return () => {};
        }
      }),
      where: () => ({
        get: () => Promise.resolve({ docs: [] })
      })
    })
  };
  
  const mockStorage = {
    ref: (path) => ({
      putFile: (filePath) => Promise.resolve({ downloadURL: 'mock-url' }),
      getDownloadURL: () => Promise.resolve('mock-url')
    })
  };
  
  // Export services (uncomment Firebase when ready)
  // export const authService = auth();
  // export const firestoreService = firestore();
  // export const storageService = storage();
  
  export const authService = mockAuth;
  export const firestoreService = mockFirestore;
  export const storageService = mockStorage;