// components/TopPageBar.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaskedText } from './MaskedText';

const TopPageBar = ({
  title = "Today's Food Log",
  addText = '+Add Food',
  addColorLeft = '#28A745',
  addColorRight = '#007BFF',
  textStyle = {},
  containerStyle = {},
  navigateTo, // optional
  onAddPress,
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (navigateTo) {
      router.push(navigateTo);
    } else if (onAddPress) {
      onAddPress();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.title, textStyle]}>{title}</Text>

      <TouchableOpacity onPress={handlePress}>
        {/* <View style={[styles.addText]}>
          <Text>+Add Food</Text>
        </View> */}
        <MaskedText bg1={'#28A745'} bg2={'#007BFF'} text={'+Add Food'} />
      </TouchableOpacity>
    </View>
  );
};

export default TopPageBar;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,

    // Android bottom shadow
    elevation: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  addText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
