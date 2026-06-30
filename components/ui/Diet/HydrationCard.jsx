import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const HydrationCard = ({ currentIntake = 2.3, goal = 3 }) => {
  const progressPercent = Math.min((currentIntake / goal) * 100, 100);

  return (
    <LinearGradient
      colors={['#007bff18', '#28a74616']}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.cardContainer}
    >
      {/* <View style={styles.cardContainer}> */}
      <Text style={styles.title}>Hydration</Text>
      <View style={styles.amountContainer}>
        <Text style={styles.amountText}>{currentIntake}L</Text>
        <Text style={styles.goalText}>of {goal}L goal</Text>
      </View>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      {/* </View> */}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#F8FCFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    width: width * 0.92,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontSize: 16,
    // fontWeight: '700',
    color: '#0A0A0A',
    // marginBottom: 8,
    textAlign: 'left',
  },
  amountContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'left',
    marginBottom: 16,
    marginTop: 16,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0A0A0A',
    marginRight: 8,
    textAlign: 'left',
    width: '100%',
  },
  goalText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'left',
    width: '100%',
  },
  progressBackground: {
    width: '100%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#28A745',
  },
});

export default HydrationCard;
