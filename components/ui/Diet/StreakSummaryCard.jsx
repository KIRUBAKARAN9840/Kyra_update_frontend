import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StreakSummaryCard = ({
  streak = 'NA',
  calories_met,
  surplus_met,
  deficit_days,
}) => {
  const bottomCards = [
    {
      label: 'Calories Met',
      value: calories_met,
      icon: require('../../../assets/images/diet/zipzag_up_arrow.png'),
      iconColor: 'green',
    },
    {
      label: 'Surplus Days',
      value: surplus_met,
      icon: require('../../../assets/images/diet/zipzag_up_arrow.png'),
      iconColor: 'green',
    },
    {
      label: 'Deficit Days',
      value: deficit_days,
      icon: require('../../../assets/images/diet/zipzag_down_arrow.png'),
      iconColor: 'red',
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#28A745', '#007BFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.streakCard}
      >
        <View style={styles.streakContent}>
          <Image
            source={require('../../../assets/images/diet/calorie.png')}
            style={styles.fireIcon}
            resizeMode="contain"
          />
          <Text style={styles.streakNumber}>{streak}</Text>
        </View>
        <Text style={styles.streakLabel}>Days Streak</Text>
      </LinearGradient>

      <View style={styles.bottomCardRow}>
        {bottomCards.map((item, index) => (
          <View key={index} style={styles.bottomCard}>
            <Image
              source={item.icon}
              style={[styles.bottomIcon, { tintColor: item.iconColor }]}
              resizeMode="contain"
            />
            <Text style={styles.bottomLabel}>{item.label}</Text>
            <Text style={styles.bottomValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width * 0.92,
    alignSelf: 'center',
    marginVertical: 20,
  },
  streakCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fireIcon: {
    width: 30,
    height: 30,
    marginRight: 8,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
  },
  bottomCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: width * 0.28,
    alignItems: 'center',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomIcon: {
    width: 20,
    height: 20,
    marginBottom: 8,
  },
  bottomLabel: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  bottomValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A0A0A',
  },
});

export default StreakSummaryCard;
