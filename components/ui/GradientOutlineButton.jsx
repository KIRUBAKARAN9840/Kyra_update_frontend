import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaskedText } from './MaskedText';
import MaskedView from '@react-native-masked-view/masked-view';

// GradientOutlineButton component for React Native
const GradientOutlineButton = ({
  title = 'Button',
  onPress = () => {},
  colors = ['#28A745', '#007BFF'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  borderWidth = 2,
  style = {},
  textStyle = {},
  disabled = false,
  buttonText = { fontSize: 16, fontWeight: '500' },
  icon,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.buttonContainer, style]}
    >
      {/* Gradient border */}
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={styles.gradientBorder}
      />

      {/* Inner container */}
      <View
        style={[
          styles.innerContainer,
          {
            // padding: borderWidth + 6,
            // paddingHorizontal: borderWidth + 12,
          },
        ]}
      >
        <MaskedView
          maskElement={
            <>
              {icon}
              <Text
                style={[
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                {title}
              </Text>
            </>
          }
        >
          <LinearGradient
            colors={colors}
            start={start}
            end={end}
            style={{
              width: '100%',
              backgroundColor: 'blue',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 'auto',
            }}
          >
            <Text style={[{ opacity: 0 }, textStyle]}>{title}</Text>
          </LinearGradient>
        </MaskedView>
      </View>
    </TouchableOpacity>
  );
};

export default GradientOutlineButton;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // padding: 20,
  },
  buttonContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
    height: 50,
  },
  gradientBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  innerContainer: {
    backgroundColor: '#ffffff',
    margin: 2,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
    paddingLeft: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
