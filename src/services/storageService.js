// import { storageService } from './firebaseConfig';

// export const uploadFile = async (filePath, fileName, userId) => {
//   try {
//     const reference = storageService.ref(`users/${userId}/books/${fileName}`);
//     const result = await reference.putFile(filePath);
//     const downloadURL = await reference.getDownloadURL();
    
//     return { success: true, downloadURL };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// };

// export const deleteFile = async (filePath) => {
//   try {
//     const reference = storageService.ref(filePath);
//     await reference.delete();
//     return { success: true };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// };

import { storageService } from './firebaseConfig';
import RNFS from 'react-native-fs';

export const uploadFile = async (filePath, fileName, userId) => {
  try {
    let actualFilePath = filePath;

    // Handle Android content URI
    if (filePath.startsWith('content://')) {
      // Copy the file to a temporary location that Firebase can access
      const tempPath = `${RNFS.TemporaryDirectoryPath}/${fileName}`;
      
      try {
        // Copy file from content URI to temp directory
        await RNFS.copyFile(filePath, tempPath);
        actualFilePath = tempPath;
        console.log('File copied to temp path:', tempPath);
      } catch (copyError) {
        console.error('Error copying file:', copyError);
        
        // Alternative: Try using file:// prefix
        if (filePath.includes('/')) {
          const pathWithoutPrefix = filePath.replace('content://', '');
          actualFilePath = `file://${pathWithoutPrefix}`;
        }
      }
    }

    // Ensure the path has file:// prefix for Firebase Storage
    if (!actualFilePath.startsWith('file://') && !actualFilePath.startsWith('content://')) {
      actualFilePath = `file://${actualFilePath}`;
    }

    console.log('Uploading file from path:', actualFilePath);

    // Store in the "Nouman" root folder as requested
    const reference = storageService.ref(`Nouman/users/${userId}/books/${fileName}`);
    const result = await reference.putFile(actualFilePath);
    const downloadURL = await reference.getDownloadURL();
    
    // Clean up temporary file if we created one
    if (filePath.startsWith('content://') && actualFilePath.includes(RNFS.TemporaryDirectoryPath)) {
      try {
        await RNFS.unlink(actualFilePath);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('Could not clean up temporary file:', cleanupError);
      }
    }
    
    return { 
      success: true, 
      downloadURL,
      storagePath: `Nouman/users/${userId}/books/${fileName}`
    };
  } catch (error) {
    console.error('Upload file error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteFile = async (storagePath) => {
  try {
    const reference = storageService.ref(storagePath);
    await reference.delete();
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return { success: false, error: error.message };
  }
};

export const getFileMetadata = async (storagePath) => {
  try {
    const reference = storageService.ref(storagePath);
    const metadata = await reference.getMetadata();
    return { success: true, metadata };
  } catch (error) {
    console.error('Get file metadata error:', error);
    return { success: false, error: error.message };
  }
};

export const checkFileExists = async (storagePath) => {
  try {
    const reference = storageService.ref(storagePath);
    await reference.getDownloadURL();
    return { success: true, exists: true };
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      return { success: true, exists: false };
    }
    return { success: false, error: error.message };
  }
};