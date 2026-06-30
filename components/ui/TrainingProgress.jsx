import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const generateRandomColor = () => {
  const minBrightness = 85;
  const r = Math.floor(Math.random() * (255 - minBrightness) + minBrightness);
  const g = Math.floor(Math.random() * (255 - minBrightness) + minBrightness);
  const b = Math.floor(Math.random() * (255 - minBrightness) + minBrightness);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const TrainingProgress = ({ trainingTypeSummary }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  // Convert data and calculate maxCount
  const data = useMemo(() => {
    const entries = Object.entries(trainingTypeSummary || {});
    const maxCount = Math.max(...entries.map(([_, count]) => count));
    return entries.map(([type, count]) => ({
      id: type,
      type,
      count,
      color: generateRandomColor(),
      percentage: (count / maxCount) * 100,
    }));
  }, [trainingTypeSummary]);

  const handleOpenModal = () => setModalVisible(true);
  const handleCloseModal = () => setModalVisible(false);

  const styles = StyleSheet.create({
    container: {
      maxHeight: height * 0.28,
      backgroundColor: 'rgba(255,255,255,0.8)',
      borderRadius: 15,
      overflow: 'hidden',
      paddingVertical: 25,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      // marginTop: 16,
    },
    headerText: {
      fontSize: width * 0.045,
      fontWeight: '600',
      color: '#333',
      textAlign: "center",

      // marginBottom: 15
    },
    viewAllButton: {
      fontSize: width * 0.035,
      fontWeight: '500',
      color: '#FF5757',
      textDecorationLine: "underline"
    },
    trainingProgressItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    trainingProgressLabel: {
      flex: 2,
      fontSize: width * 0.035,
      color: '#333',
    },
    trainingProgressBar: {
      flex: 3,
      height: height * 0.02,
      backgroundColor: '#E0E0E0',
      borderRadius: 10,
      marginHorizontal: width * 0.03,
    },
    trainingProgressBarFill: {
      height: '100%',
      borderRadius: 10,
    },
    trainingProgressCount: {
      fontSize: width * 0.035,
      fontWeight: '600',
      color: '#666',
      minWidth: width * 0.1,
      textAlign: 'right',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: width * 0.9,
      maxHeight: height * 0.7,
      backgroundColor: 'white',
      borderRadius: 15,
      padding: 20,
    },
    closeModalButton: {
      marginTop: 16,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: '#FF5757',
      borderRadius: 10,
    },
    closeModalText: {
      fontSize: width * 0.035,
      fontWeight: '500',
      color: 'white',
    },
  });

  const renderTrainingItem = (item) => (
    <View key={item.id} style={styles.trainingProgressItem}>
      <Text style={styles.trainingProgressLabel} numberOfLines={1}>
        {item.type}
      </Text>
      <View style={styles.trainingProgressBar}>
        <View
          style={[
            styles.trainingProgressBarFill,
            {
              width: `${item.percentage}%`,
              backgroundColor: item.color,
            },
          ]}
        />
      </View>
      <Text style={styles.trainingProgressCount}>{item.count}</Text>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <ScrollView>
          {data.slice(0, 4).map(renderTrainingItem)}
        </ScrollView>

        <View style={styles.header}>
          <TouchableOpacity onPress={handleOpenModal}>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for all items */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.headerText}>All Training Progress</Text>
            <ScrollView>
              {data.map(renderTrainingItem)}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default TrainingProgress;
