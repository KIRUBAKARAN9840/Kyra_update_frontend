import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const FloatingActionButton = ({
  icon = "people",
  label = "",
  colors = ["#FF5757", "#ff7e7e"],
  onPress = () => {},
  position = { bottom: Platform.OS === "ios" ? 80 : 20, right: 20 },
  showLabel = false,
  size = 56,
}) => {
  return (
    <TouchableOpacity
      style={[styles.floatingButton, position, showLabel && { width: "auto" }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View
        style={[
          styles.gradientContainer,
          { width: showLabel ? "auto" : size, height: size },
        ]}
      >
        <LinearGradient
          colors={colors}
          style={[
            styles.gradient,
            { height: size, paddingHorizontal: showLabel ? 16 : 0 },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={24} color="white" />
          </View>

          {showLabel && (
            <View style={styles.textContainer}>
              <Text style={styles.buttonText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    zIndex: 999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  gradientContainer: {
    borderRadius: 30,
    overflow: "hidden",
    aspectRatio: 1,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    width: "100%",
    height: "100%",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    marginLeft: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default FloatingActionButton;
