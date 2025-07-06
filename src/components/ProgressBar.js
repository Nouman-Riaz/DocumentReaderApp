import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar as PaperProgressBar, Text } from 'react-native-paper';

const ProgressBar = ({ progress, showPercentage = true, color = '#6200EE', style }) => {
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, style]}>
      <PaperProgressBar
        progress={progress}
        color={color}
        style={styles.progressBar}
      />
      {showPercentage && (
        <Text style={styles.percentage}>{percentage}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ProgressBar;