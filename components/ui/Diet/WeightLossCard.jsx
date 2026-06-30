import { Image } from 'expo-image';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import { ArrowUpRight } from 'lucide-react'; // Removed the icon import

const WeightLossCard = () => {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.weightText}>70 kg</Text>
        <Text style={styles.lossText}>-2 kg this week</Text>
      </View>
      <View style={styles.row}>
        {/* Replaced the icon with an Image component */}
        <Image
          source={require('../../../assets/images/diet/zipzag_down_arrow.png')} // Using the same source as the icon
          style={{ width: 30, height: 16.15 }} // Set the size of the image
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    backgroundColor: '#F5FCF9',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  weightText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A0A0A',
    marginBottom: 8,
  },
  lossText: {
    fontSize: 16,
    color: '#21A065',
    marginRight: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default WeightLossCard;
