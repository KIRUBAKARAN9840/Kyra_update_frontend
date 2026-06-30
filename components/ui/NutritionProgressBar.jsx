import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

//usage

// for single color progress bar

{
  /* <NutritionProgressBar title="Calories" progress={80} color="#4c6ef5" /> */
}

// for gradient color progress bar

{
  /* <NutritionProgressBar
  title="Protein"
  progress={65}
  useGradient
  colorStart="#38b000"
  colorEnd="#70e000"
/> */
}

const NutritionProgressBar = ({
  title,
  progress,
  color,
  colorStart,
  colorEnd,
  useGradient = false,
  style={}
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.progressBackground}>
        {useGradient ? (
          <LinearGradient
            colors={[colorStart || '#4c6ef5', colorEnd || '#5c7cfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        ) : (
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: color || '#4c6ef5' },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: width * 0.85,
    alignSelf: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    color: '#0A0A0A',
  },
  progressBackground: {
    width: '100%',
    height: 10,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
});

export default NutritionProgressBar;
