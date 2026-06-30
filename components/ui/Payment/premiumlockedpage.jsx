import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const PremiumLockedPage = ({
  title = "Premium Feature",
  description = "Unlock access to exclusive features and take your fitness journey to the next level.",
  buttonText = "Subscribe Now",
}) => {
  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <LinearGradient
        colors={["rgb(255, 255, 255)", "rgb(255, 255, 255)"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Content Container */}
      <View style={styles.contentContainer}>
        {/* Large Crown Icon */}

        {/* Locked Badge */}
        <View style={styles.lockedBadge}>
          <View style={styles.lockedBadgeContent}>
            <Image
              source={require("../../../assets/images/payment/premium.png")}
              style={styles.badgeIcon}
              tintColor={"#FF5757"}
              resizeMode="contain"
            />
            <MaskedView
              maskElement={<Text style={styles.badgeText}>PREMIUM</Text>}
            >
              <LinearGradient
                colors={["#FF5757", "#FFA6A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.badgeText, { opacity: 0 }]}>PREMIUM</Text>
              </LinearGradient>
            </MaskedView>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Unlock access to exclusive features and take your fitness journey to
            the next level{" "}
            <MaterialCommunityIcons name="arm-flex" size={20} color="#FF5757" />
          </Text>
        </View>

        {/* Subscribe Button */}
        {Platform.OS === "android" ? (
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => {
              if (Platform.OS === "android") {
                router.push("/client/subscription");
              }
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF5757", "#FF8585"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>{buttonText}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          ""
        )}
      </View>
    </View>
  );
};

export default PremiumLockedPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundGradient: {
    position: "absolute",
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  contentContainer: {
    width: width * 0.9,
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  crownIcon: {
    width: 50,
    height: 50,
  },
  lockedBadge: {
    marginBottom: 20,
  },
  lockedBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 87, 87, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 87, 87, 0.3)",
  },
  badgeIcon: {
    width: 18,
    height: 18,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#FF5757",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#FF5757",
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    alignItems: "center",
  },
  description: {
    fontSize: 15,
    color: "#000000",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.8,
  },
  featuresContainer: {
    width: "100%",
    marginBottom: 32,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 12,
  },
  featureIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 87, 87, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF5757",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  subscribeButton: {
    width: "70%",
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  restoreButton: {
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    color: "#FF5757",
    opacity: 0.8,
  },
  termsText: {
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 16,
    opacity: 0.5,
    lineHeight: 18,
  },
});
