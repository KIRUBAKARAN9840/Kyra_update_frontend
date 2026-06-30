import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NutritionProgressBar from '../NutritionProgressBar';

const TemplateNutritionProgressSection = ({ progressData }) => {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Overall Nutrition</Text>
      {progressData?.map((item, index) => (
        <NutritionProgressBar
          key={index}
          title={item.title}
          progress={item.progress}
          color={item.color}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
    marginLeft: 30,
    color: '#0A0A0A',
  },
});

export default TemplateNutritionProgressSection;
