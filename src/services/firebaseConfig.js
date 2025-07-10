import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

  export const authService = auth();
  export const firestoreService = firestore();
  export const storageService = storage();
  