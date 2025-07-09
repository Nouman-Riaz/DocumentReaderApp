import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Title, 
  IconButton,
  Button,
  List,
  Divider,
  Menu,
  ProgressBar,
  Chip,
  FAB
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuthState } from '../services/authService';
import { getReadingHistory, clearReadingHistory } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';

const HistoryScreen = ({ navigation }) => {
  const { user } = useAuthState();
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all', 'completed', 'in-progress'
  const queryClient = useQueryClient();

  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['readingHistory', user?.uid],
    queryFn: () => getReadingHistory(user?.uid),
    enabled: !!user?.uid,
  });

  const historyItems = historyData?.data || [];

  // Filter history items based on filter type
  const filteredHistory = historyItems.filter(item => {
    switch (filterType) {
      case 'completed':
        return item.isCompleted;
      case 'in-progress':
        return item.progress > 0 && !item.isCompleted;
      case 'all':
      default:
        return true;
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Reading History',
      'Are you sure you want to clear your entire reading history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: confirmClearHistory
        }
      ]
    );
  };

  const confirmClearHistory = async () => {
    try {
      const result = await clearReadingHistory(user.uid);
      if (result.success) {
        queryClient.invalidateQueries(['readingHistory', user?.uid]);
        Alert.alert('Success', 'Reading history cleared successfully');
      } else {
        Alert.alert('Error', 'Failed to clear reading history');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while clearing history');
    }
  };

  // const handleBookPress = (historyItem) => {
  //   if (historyItem.bookData) {
  //     navigation.navigate('Reading', { book: historyItem.bookData });
  //   }
  // };

  const handleBookPress = (historyItem) => {
    if (historyItem.bookData) {
      const bookWithProgress = {
        ...historyItem.bookData,
        progress: historyItem.progress || 0,
        currentPage: historyItem.currentPage || 1,
        totalPages: historyItem.totalPages || 1,
        lastRead: historyItem.lastRead,
        isCompleted: historyItem.isCompleted || false
      };
      
      navigation.navigate('Reading', { book: bookWithProgress });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatProgress = (progress) => {
    return Math.round((progress || 0) * 100);
  };

  const getProgressColor = (progress) => {
    if (progress >= 0.9) return '#4CAF50';
    if (progress >= 0.5) return '#FF9800';
    return '#2196F3';
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'completed': return 'Completed Books';
      case 'in-progress': return 'In Progress';
      case 'all': return 'All History';
      default: return 'All History';
    }
  };

  const renderHistoryItem = (item, index) => {
    const { bookData, progress, lastRead, isCompleted, currentPage, totalPages } = item;
    
    if (!bookData) return null;

    return (
      <Card key={`${item.id}-${index}`} style={styles.historyCard}>
        <Card.Content>
          <View style={styles.historyHeader}>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {bookData.title}
              </Text>
              <Text style={styles.bookMeta}>
                {bookData.fileType?.includes('pdf') ? 'PDF' : 'EPUB'}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              {isCompleted ? (
                <Chip icon="check-circle" mode="flat" textStyle={styles.completedChip}>
                  Completed
                </Chip>
              ) : (
                <Chip icon="book-open" mode="flat" textStyle={styles.progressChip}>
                  Reading
                </Chip>
              )}
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {formatProgress(progress)}% complete
              </Text>
              {currentPage && totalPages && (
                <Text style={styles.pageText}>
                  Page {currentPage} of {totalPages}
                </Text>
              )}
            </View>
            <ProgressBar 
              progress={progress} 
              color={getProgressColor(progress)}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.historyActions}>
            <Button
              mode="outlined"
              onPress={() => handleBookPress(item)}
              style={styles.actionButton}
              compact
            >
              {isCompleted ? 'Read Again' : 'Continue Reading'}
            </Button>
            <IconButton
              icon="information-outline"
              size={20}
              onPress={() => showBookDetails(bookData, item)}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const showBookDetails = (bookData, historyItem) => {
    const formatFileSize = (bytes) => {
      if (!bytes) return 'Unknown';
      const mb = bytes / (1024 * 1024);
      return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
    };

    Alert.alert(
      'Book Details',
      `Title: ${bookData.title}\n` +
      `Type: ${bookData.fileType?.includes('pdf') ? 'PDF' : 'EPUB'}\n` +
      `Size: ${formatFileSize(bookData.fileSize)}\n` +
      `Progress: ${formatProgress(historyItem.progress)}%\n` +
      `Status: ${historyItem.isCompleted ? 'Completed' : 'In Progress'}`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading reading history..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Title style={styles.title}>Reading History</Title>
          <Text style={styles.subtitle}>
            {historyItems.length} {historyItems.length === 1 ? 'book' : 'books'} in history
            {filteredHistory.length !== historyItems.length && 
              ` • ${filteredHistory.length} shown`
            }
          </Text>
        </View>
        <View style={styles.headerRight}>
          
          
          {historyItems.length > 0 && (
            <IconButton
              icon="delete-sweep"
              onPress={handleClearHistory}
            />
          )}
        </View>
      </View>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredHistory.length > 0 ? (
          <>
            {filteredHistory.map((item, index) => renderHistoryItem(item, index))}
            
            <Card style={styles.statsCard}>
              <Card.Content>
                <Text style={styles.statsTitle}>Reading Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {historyItems.filter(item => item.isCompleted).length}
                    </Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {historyItems.filter(item => item.progress > 0 && !item.isCompleted).length}
                    </Text>
                    <Text style={styles.statLabel}>In Progress</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {Math.round(historyItems.reduce((acc, item) => acc + (item.progress || 0), 0) / historyItems.length * 100) || 0}%
                    </Text>
                    <Text style={styles.statLabel}>Avg Progress</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{historyItems.length}</Text>
                    <Text style={styles.statLabel}>Total Books</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon 
                name={historyItems.length === 0 ? 'history' : 'filter-list-off'} 
                size={64} 
                color="#ccc" 
              />
              <Text style={styles.emptyText}>
                {historyItems.length === 0 
                  ? 'No reading history yet'
                  : 'No books match your filter'
                }
              </Text>
              <Text style={styles.emptySubText}>
                {historyItems.length === 0 
                  ? 'Start reading some books to see your history here'
                  : 'Try changing your filter settings'
                }
              </Text>
              {historyItems.length === 0 && (
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('Library')}
                  style={styles.addButton}
                  icon="book"
                >
                  Browse Library
                </Button>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {historyItems.length > 0 && (
        <FAB
          icon="delete-sweep"
          style={styles.fab}
          onPress={handleClearHistory}
          label="Clear History"
          extended={filteredHistory.length > 0}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  clearFilterButton: {
    margin: 0,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  historyCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookInfo: {
    flex: 1,
    paddingRight: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bookMeta: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  completedChip: {
    fontSize: 11,
    color: '#4CAF50',
  },
  progressChip: {
    fontSize: 11,
    color: '#FF9800',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  historyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  statsCard: {
    margin: 20,
    marginTop: 12,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  emptyCard: {
    margin: 20,
    padding: 20,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#f44336',
  },
});

export default HistoryScreen;