import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const StepperButton = ({
  initial = 1,
  min = 1,
  max = 99,
  onChange,
  foodCount,
}) => {
  const [count, setCount] = useState(initial);

  const decrease = () => {
    if (count > min) {
      const newCount = count - 1;
      setCount(newCount);
      onChange && onChange(newCount);
    }
  };

  const increase = () => {
    if (count < max) {
      const newCount = count + 1;
      setCount(newCount);
      onChange && onChange(newCount);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button_cont} onPress={decrease}>
        <Text style={styles.button}>−</Text>
      </TouchableOpacity>
      <Text style={styles.count}>{count}</Text>
      <TouchableOpacity style={styles.button_cont} onPress={increase}>
        <Text style={styles.button}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default StepperButton;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "space-between",
    width: "70%",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  button_cont: {
    // backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  button: {
    fontSize: 14,
    color: "teal",
    fontWeight: "bold",
    paddingHorizontal: 10,
  },
  count: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#000",
  },
});
