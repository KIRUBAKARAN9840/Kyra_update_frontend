import React from 'react';
import { View, Text } from 'react-native';

const TextDivider = ({
  color = '#E0E0E0',
  height = 1,
  text = 'OR',
  textStyle = {}
}) => {
  // If no text is provided, render a simple line
  if (!text) {
    return (
      <View
        style={{
          backgroundColor: color,
          height: height,
          marginVertical: 20,
          width: '100%'
        }}
      />
    );
  }

  // If text is provided, render a divider with text in the middle
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20
    }}>
      <View
        style={{
          backgroundColor: color,
          height: height,
          flex: 1,
          marginRight: 10
        }}
      />
      <Text
        style={{
          color: '#858585',
          fontSize: 16,
          textAlign: 'center',
          ...textStyle
        }}
      >
        {text}
      </Text>
      <View
        style={{
          backgroundColor: color,
          height: height,
          flex: 1,
          marginLeft: 10
        }}
      />
    </View>
  );
};

export default TextDivider;