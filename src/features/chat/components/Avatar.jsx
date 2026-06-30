import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function Avatar({
  uri,
  size = 54,
  fallback = "?",
  isGroup = false,
}) {
  const radius = isGroup ? 12 : size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#E5E7EB",
        }}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize: size / 2.2 }]}>
        {String(fallback).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: { color: "#555", fontWeight: "700" },
});
