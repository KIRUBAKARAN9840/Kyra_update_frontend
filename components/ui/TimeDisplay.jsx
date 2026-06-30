import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function DurationDisplay({ hours = 0, minutes = 0 }) {
  return (
    <View style={styles.container}>
      <Text style={styles.timeValue}>{hours}</Text>
      <Text style={styles.label}>Hour</Text>
      <Text style={styles.timeValue}>{minutes}</Text>
      <Text style={styles.label}>Minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    // backgroundColor: '#dbe6ff',
    paddingVertical: 10,
    borderRadius: 10,
    // height: 'auto'
    paddingBottom: 30,
  },
  icon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  timeValue: {
    fontSize: 18,
    color: "#3C8DCF",
    fontWeight: "600",
    marginHorizontal: 4,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginRight: 2,
  },
});
