import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Paragraph, ProgressBar, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

const BookCard = ({ book, onPress, onLongPress, showProgress = false}) => {
  const formatFileSize = bytes => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDate = dateValue => {
    if (!dateValue) {
      console.log('formatDate: No date value provided');
      return 'Unknown date';
    }

    try {
      let date;

      // Log the raw date value for debugging
      console.log(
        'formatDate: Raw date value:',
        dateValue,
        'Type:',
        typeof dateValue,
      );

      // Handle Firestore Timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
        console.log('formatDate: Converted from Firestore Timestamp');
      }
      // Handle Firestore Timestamp with seconds/nanoseconds
      else if (
        dateValue &&
        typeof dateValue === 'object' &&
        dateValue.seconds
      ) {
        date = new Date(dateValue.seconds * 1000);
        console.log('formatDate: Converted from Firestore seconds');
      }
      // Handle ISO string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
        console.log('formatDate: Converted from ISO string');
      }
      // Handle regular Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
        console.log('formatDate: Already a Date object');
      }
      // Handle number (timestamp)
      else if (typeof dateValue === 'number') {
        date = new Date(dateValue);
        console.log('formatDate: Converted from timestamp number');
      } else {
        console.log('formatDate: Unknown date format:', dateValue);
        return 'Unknown date';
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('formatDate: Invalid date after conversion:', date);
        return 'Invalid date';
      }

      const result = date.toLocaleDateString();
      console.log('formatDate: Final result:', result);
      return result;
    } catch (error) {
      console.error(
        'formatDate: Error formatting date:',
        error,
        'Raw value:',
        dateValue,
      );
      return 'Date error';
    }
  };

  const formatProgress = progress => {
    return Math.round((progress || 0) * 100);
  };

  const getProgressColor = progress => {
    if (progress >= 0.9) return '#4CAF50'; // Green for completed
    if (progress >= 0.5) return '#FF9800'; // Orange for halfway
    return '#2196F3'; // Blue for started
  };

  const getFileIcon = fileType => {
    if (fileType?.includes('pdf')) return 'picture-as-pdf';
    if (fileType?.includes('epub')) return 'book';
    return 'description';
  };

  const getFileColor = fileType => {
    if (fileType?.includes('pdf')) return '#d32f2f';
    if (fileType?.includes('epub')) return '#388e3c';
    return '#666';
  };

  const getStatusChip = () => {
    const progress = book.progress || 0;
    if (book.isCompleted || progress >= 0.95) {
      return {
        icon: 'check-circle',
        label: 'Completed',
        color: '#4CAF50',
      };
    } else if (progress > 0) {
      return {
        icon: 'book-open',
        label: 'Reading',
        color: '#FF9800',
      };
    } else {
      return {
        icon: 'book-outline',
        label: 'Unread',
        color: '#757575',
      };
    }
  };

  const status = getStatusChip();

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
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
                  style={[
                    styles.chip,
                    { backgroundColor: getFileColor(book.fileType) + '20' },
                  ]}
                  textStyle={{
                    color: getFileColor(book.fileType),
                    fontSize: 10,
                  }}
                >
                  {book.fileType?.includes('pdf') ? 'PDF' : 'EPUB'}
                </Chip>
                {book.fileSize && (
                  <Text style={styles.fileSize}>
                    {formatFileSize(book.fileSize)}
                  </Text>
                )}
                <Chip
                  icon={status.icon}
                  compact
                  style={[
                    styles.statusChip,
                    { backgroundColor: status.color + '20' },
                  ]}
                  textStyle={{ color: status.color, fontSize: 10 }}
                >
                  {status.label}
                </Chip>
              </View>
            </View>
          </View>

          {showProgress && book.progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {formatProgress(book.progress)}% complete
                </Text>
                {book.currentPage && book.totalPages && (
                  <Text style={styles.pageText}>
                    Page {book.currentPage} of {book.totalPages}
                  </Text>
                )}
              </View>
              <ProgressBar
                progress={book.progress || 0}
                color={getProgressColor(book.progress)}
                style={styles.progressBar}
              />
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.uploadDate}>
              Added {formatDate(book.uploadedAt || book.addedAt)}
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
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 28,
  },
  statusChip: {
    height: 28,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  pageText: {
    fontSize: 11,
    color: '#888',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  uploadDate: {
    fontSize: 12,
    color: '#888',
  },
  lastRead: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default BookCard;
