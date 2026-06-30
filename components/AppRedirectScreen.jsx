import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";

const { width, height } = Dimensions.get("window");

export const AppRedirectScreen = ({ message, redirectUrl }) => {
  const handleRedirect = async () => {
    if (redirectUrl) {
      try {
        const canOpen = await Linking.canOpenURL(redirectUrl);
        if (canOpen) {
          await Linking.openURL(redirectUrl);
        }
      } catch (error) {
        console.error("Error opening redirect URL:", error);
      }
    }
  };

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
            source={require("../assets/images/new_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animatable.View>

        {/* Icon */}
        <Animatable.View
          animation="bounceIn"
          duration={1000}
          delay={300}
          style={styles.iconContainer}
        >
          <Ionicons
            name="information-circle-outline"
            size={50}
            color="#FF5757"
          />
        </Animatable.View>

        {/* Text Content */}
        <Animatable.View
          animation="fadeInUp"
          duration={800}
          delay={500}
          style={styles.textContainer}
        >
          <Text style={styles.title}>Important Update</Text>
          <Text style={styles.message}>
            {message ||
              "Please update to the latest version for the best experience."}
          </Text>
        </Animatable.View>

        {/* Redirect Button */}
        {redirectUrl && (
          <Animatable.View
            animation="fadeInUp"
            duration={800}
            delay={700}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={styles.redirectButton}
              onPress={handleRedirect}
            >
              <Ionicons
                name={
                  Platform.OS === "ios" ? "logo-apple" : "logo-google-playstore"
                }
                size={24}
                color="#FFFFFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.redirectButtonText}>
                {Platform.OS === "ios" ? "Click" : "Click"} to Update
              </Text>
            </TouchableOpacity>
          </Animatable.View>
        )}

        {/* Footer */}
        <Animatable.View
          animation="fadeIn"
          duration={1000}
          delay={900}
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
    fontSize: 35,
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
    marginVertical: height * 0.02,
    backgroundColor: "#FFF0F0",
    borderRadius: 100,
    padding: 20,
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
  buttonContainer: {
    marginTop: height * 0.04,
  },
  redirectButton: {
    backgroundColor: "#FF5757",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonIcon: {
    marginRight: 10,
  },
  redirectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
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
