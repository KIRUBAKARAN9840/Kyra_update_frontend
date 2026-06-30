import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const Checkbox = ({
  label = "",
  checked = false,
  onChange = () => {},
  containerStyle = {},
  checkboxStyle = {},
  labelStyle = {},
  checkmarkStyle = {},
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, containerStyle]}
      onPress={onChange}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, checkboxStyle]}>
        {checked && <View style={[styles.checkedBox, checkmarkStyle]} />}
      </View>
      {label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
    </TouchableOpacity>
  );
};

export default Checkbox;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#007bffcc",
    // paddingRight: 5,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkedBox: {
    width: 12,
    height: 12,
    backgroundColor: "#007bffb7",
    borderRadius: 2,
  },
  label: {
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
});
