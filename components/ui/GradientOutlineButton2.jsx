import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";

const GradientOutlineButton2 = ({
  title = "100 ml",
  onPress = () => {},
  colors = ["#23C6D3", "#006FAD"],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style = {},
  textStyle = {},
  disabled = false,
  icon = "add",
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

      {/* Inner container with white background */}
      <View style={styles.innerContainer}>
        <View style={styles.contentContainer}>
          {/* Plus icon with gradient background */}
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={colors}
              start={start}
              end={end}
              style={styles.iconBackground}
            >
              <Ionicons name={icon} size={14} color="white" />
            </LinearGradient>
          </View>

          {/* Text with gradient */}
          <MaskedView
            style={styles.textContainer}
            maskElement={
              <Text style={[styles.buttonText, textStyle]}>{title}</Text>
            }
          >
            <LinearGradient
              colors={["#000000", "#000000"]}
              start={start}
              end={end}
              style={styles.gradientFill}
            />
          </MaskedView>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default GradientOutlineButton2;

const styles = StyleSheet.create({
  buttonContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    width: 80,
    height: 35,
  },
  gradientBorder: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  innerContainer: {
    backgroundColor: "#ffffff",
    margin: 1.3,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    width: "100%",
  },
  iconWrapper: {
    marginRight: 10,
    alignItems: "center",
  },
  iconBackground: {
    // width: 18,
    // height: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  gradientFill: {
    flex: 1,
  },
  buttonText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
