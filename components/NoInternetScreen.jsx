import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

export const NoInternetScreen = ({ onRetry, isRetrying }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
    >
      <View style={styles.content}>
        <Text style={[styles.icon, { color: isDark ? "#fff" : "#333" }]}>
          📡
        </Text>
        <Text style={[styles.title, { color: isDark ? "#fff" : "#333" }]}>
          No Internet Connection
        </Text>
        <Text style={[styles.message, { color: isDark ? "#ccc" : "#666" }]}>
          Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: isDark ? "#333" : "#007AFF" },
          ]}
          onPress={onRetry}
          disabled={isRetrying}
        >
          <Text style={styles.retryButtonText}>
            {isRetrying ? "Checking..." : "Try Again"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 300,
  },
  icon: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
