import { storageService } from './firebaseConfig';

export const uploadFile = async (filePath, fileName, userId) => {
  try {
    const reference = storageService.ref(`users/${userId}/books/${fileName}`);
    const result = await reference.putFile(filePath);
    const downloadURL = await reference.getDownloadURL();
    
    return { success: true, downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteFile = async (filePath) => {
  try {
    const reference = storageService.ref(filePath);
    await reference.delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};