import DocumentPicker from 'react-native-document-picker';

export const pickDocument = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.pdf, 'application/epub+zip'],
      allowMultiSelection: false,
    });
    return { success: true, file: result[0] };
  } catch (error) {
    if (DocumentPicker.isCancel(error)) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: error.message };
  }
};

export const validateFileType = (fileType) => {
  const supportedTypes = ['application/pdf', 'application/epub+zip'];
  return supportedTypes.includes(fileType);
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename) => {
  return filename.split('.').pop()?.toLowerCase();
};

export const isEpubFile = (fileType) => {
  return fileType?.includes('epub');
};

export const isPdfFile = (fileType) => {
  return fileType?.includes('pdf');
};