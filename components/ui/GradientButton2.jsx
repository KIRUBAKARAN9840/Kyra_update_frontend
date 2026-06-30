import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

const GradientButton2 = ({
  title = 'Full Report View',
  onPress,
  fromColor = '#28A745',
  toColor = '#007BFF',
  textStyle = {},
  containerStyle = {},
  navigateTo, // optional route name
  belowButtonText,
  mainContainerStyle = {},
  disable,
}) => {
  const router = useRouter();

  return (
    <View
      style={[
        {
          display: 'flex',
          alignItems: 'center',
          // justifyContent: 'flex-start',
          // marginBottom: 30,
          // paddingBottom: 30,
          // backgroundColor: 'pink',
          // height: '100%'
          // flex: 1,
        },
        mainContainerStyle,
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          if (!disable) {
            let response = onPress();
            if (response?.status === 200) {
              // navigateTo();
            }
            if (navigateTo) {
              router.push(navigateTo);
            }
          }
        }}
        activeOpacity={0.8}
      >
        <View>
          <LinearGradient
            colors={[fromColor, toColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.button, containerStyle]}
          >
            <Text style={[styles.text, textStyle]}>
              {title}
              {/* <Feather name="arrow-right" size={12} color="#FFF" /> */}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>

      {belowButtonText && (
        <TouchableOpacity
          onPress={() => router.push(navigateTo)}
          activeOpacity={0.8}
        >
          <Text style={[styles.link]}>{belowButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default GradientButton2;

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 20,
    borderWidth: 0.5,
    borderColor: '#28A745',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  text: {
    color: '#FFF',
    fontFamily: 'Roboto',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
    // lineHeight: 9.68,
    flexDirection: 'row',
  },
  link: {
    color: '#007BFF',
    fontFamily: 'Roboto',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
    // lineHeight: 9.68,
    flexDirection: 'row',
    marginTop: 10,
    textAlign: 'center',
  },
});
