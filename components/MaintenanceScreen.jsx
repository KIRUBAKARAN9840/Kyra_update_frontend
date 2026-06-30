import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

const { width, height } = Dimensions.get("window");

export const MaintenanceScreen = ({ message }) => {
  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Animatable.View
          animation="fadeInDown"
          duration={800}
          style={styles.logoContainer}
        >
          <Image
            source={require("../assets/images/logo_pay.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* <View style={styles.logoUnderline} />
          <Text style={styles.tagline}>Your Personal Fitness Companion</Text> */}
        </Animatable.View>

        {/* Maintenance Icon */}
        <Animatable.View
          animation="bounceIn"
          duration={1000}
          delay={300}
          style={styles.iconContainer}
        >
          <Ionicons name="construct-outline" size={40} color="#FF5757" />
        </Animatable.View>

        {/* Text Content */}
        <Animatable.View
          animation="fadeInUp"
          duration={800}
          delay={500}
          style={styles.textContainer}
        >
          <Text style={styles.title}>Under Maintenance</Text>
          <Text style={styles.message}>
            {message ||
              "We're currently performing scheduled maintenance to improve your experience. We'll be back up and running shortly. Thank you for your patience!"}
          </Text>
        </Animatable.View>

        {/* Footer */}
        <Animatable.View
          animation="fadeIn"
          duration={1000}
          delay={700}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            © 2025 NFCTech Fitness Private Limited
          </Text>
        </Animatable.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: width * 0.08,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: height * 0.04,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 45,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontWeight: "500",
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#263148",
  },
  logoUnderline: {
    width: 80,
    height: 4,
    backgroundColor: "#FF5757",
    borderRadius: 2,
    marginTop: 5,
  },
  tagline: {
    color: "#263148",
    fontSize: 12,
    marginTop: 10,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  iconContainer: {
    marginVertical: height * 0.03,
    backgroundColor: "#FFF0F0",
    borderRadius: 100,
    padding: 30,
  },
  textContainer: {
    alignItems: "center",
    marginVertical: height * 0.03,
    maxWidth: 350,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#263148",
    marginBottom: 15,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  message: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    alignItems: "center",
  },
  footerText: {
    color: "#767676",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
});
