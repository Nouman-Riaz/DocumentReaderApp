import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Paragraph, ProgressBar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BookCard = ({ book, onPress, showProgress = false }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return 'picture-as-pdf';
    if (fileType?.includes('epub')) return 'book';
    return 'description';
  };

  const getFileColor = (fileType) => {
    if (fileType?.includes('pdf')) return '#d32f2f';
    if (fileType?.includes('epub')) return '#388e3c';
    return '#666';
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.bookInfo}>
              <View style={styles.titleRow}>
                <Icon 
                  name={getFileIcon(book.fileType)} 
                  size={20} 
                  color={getFileColor(book.fileType)}
                  style={styles.fileIcon}
                />
                <Text style={styles.title} numberOfLines={2}>
                  {book.title}
                </Text>
              </View>
              <View style={styles.metadata}>
                <Chip 
                  icon="file"
                  compact
                  style={[styles.chip, { backgroundColor: getFileColor(book.fileType) + '20' }]}
                  textStyle={{ color: getFileColor(book.fileType), fontSize: 10 }}
                >
                  {book.fileType?.includes('pdf') ? 'PDF' : 'EPUB'}
                </Chip>
                {book.fileSize && (
                  <Text style={styles.fileSize}>
                    {formatFileSize(book.fileSize)}
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          {showProgress && (
            <View style={styles.progressContainer}>
              <ProgressBar 
                progress={0.3} // Mock progress - would come from Firestore
                color="#6200EE"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>30% Complete</Text>
            </View>
          )}
          
          <View style={styles.footer}>
            <Text style={styles.uploadDate}>
              Added {new Date(book.uploadedAt).toLocaleDateString()}
            </Text>
            <Icon name="chevron-right" size={20} color="#666" />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 6,
    elevation: 2,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chip: {
    height: 30,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  uploadDate: {
    fontSize: 12,
    color: '#888',
  },
});

export default BookCard;