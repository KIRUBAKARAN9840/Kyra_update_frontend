import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const cameraIcon = require("../../../assets/images/diet/camera.png");

const { width } = Dimensions.get("window");

const WorkoutCard = ({
  title,
  subtitle,
  imagePath,
  onPress,
  buttonText = "",
  variant = "workout",
  textColor = "#297DB3",
  paraTextColor = "#00000075",
  buttonTextColor = "#000",
  bg1 = "#28A745",
  bg2 = "#297DB3",
  border1,
  border2,
  charWidth = 140,
  charHeight = 140,
  childComponent = null,
  extra,
  small = false,
  pt = false,
  smallTitle = false,
  scanButton = false,
}) => {
  const isMealCard = variant === "meal";

  return (
    <TouchableOpacity
      style={[styles.card, extra && { marginBottom: 25 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[{ width: "100%", padding: 1, position: "relative" }]}>
        <LinearGradient
          colors={[bg1, bg2]}
          start={{ x: 0.2, y: 0.3 }}
          end={{ x: 0.25, y: 1.3 }}
          style={styles.contentContainer}
        >
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                isMealCard && styles.mealTitle,
                smallTitle && styles.smallTitle,
                { color: textColor },
                pt && { marginBottom: 8 },
              ]}
            >
              {title}
            </Text>

            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  isMealCard && styles.mealSubtitle,
                  { color: paraTextColor },
                  small && { width: "95%" },
                ]}
              >
                {subtitle}
              </Text>
            )}

            {childComponent && childComponent}

            {buttonText && !scanButton && (
              <View style={styles.button}>
                <Text style={[styles.buttonText, { color: buttonTextColor }]}>
                  {buttonText}
                </Text>
                <Ionicons
                  name={"arrow-forward"}
                  size={12}
                  color={buttonTextColor}
                  style={styles.icon}
                />
              </View>
            )}

            {buttonText && scanButton && (
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanButton}
              >
                <Image
                  source={cameraIcon}
                  style={styles.scanButtonIcon}
                  resizeMode="contain"
                />
                <Text style={styles.scanButtonText}>{buttonText}</Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Image positioned outside to ensure visibility */}
      {imagePath && (
        <View style={styles.imageContainer}>
          <Image
            source={imagePath}
            style={[
              styles.workoutImage,
              { width: charWidth, height: charHeight },
            ]}
            resizeMode="contain"
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width >= 768 ? width - 60 : width - 32,
    height: 140,
    borderRadius: 16,
    overflow: "visible",
    paddingTop: 16,
    position: "relative",
    marginBottom: 5,
    margin: "auto",
  },
  mealCard: {
    height: 100,
  },
  gradientBackground: {
    flex: 1,
    borderRadius: 16,
    justifyContent: "center",
    overflow: "visible",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    height: "100%",
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#00000020",
  },
  textContainer: {
    height: "100%",
    maxWidth: "70%",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: "#000",
    marginTop: 4,
    width: "100%",
    lineHeight: 16,
  },
  mealTitle: {
    fontSize: 16,
    color: "",
  },
  mealSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  smallTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  imageContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  workoutImage: {
    // Image styling
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  icon: {
    marginLeft: 4,
  },
  scanButton: {
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanButtonIcon: {
    width: 16,
    height: 16,
    tintColor: "#fff",
  },
  scanButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
});

export default WorkoutCard;
