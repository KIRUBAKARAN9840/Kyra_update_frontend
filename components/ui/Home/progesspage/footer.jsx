import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const Footer = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../../assets/images/home/footer.webp")}
        style={styles.image}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: width * 0.8, // Adjust the height based on the aspect ratio of your image
  },
  gradient: {
    width: "100%",
    paddingVertical: 0,
    paddingBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4a4a4a",
    marginBottom: 10,
    textAlign: "center",
  },
  taglineContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    marginTop: 15,
  },
  taglineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  taglineText: {
    fontSize: 14,
    color: "#6b6b6b",
    fontWeight: "500",
    marginRight: 2,
  },
  heartIcon: {
    fontSize: 20,
  },
  flagIcon: {
    fontSize: 20,
  },
});

export default Footer;
