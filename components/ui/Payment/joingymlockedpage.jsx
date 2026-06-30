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

const JoinGymLockedPage = ({ buttonText = "Browse Nearby Gyms" }) => {
  const goToGymPage = () => {
    router.push({
      pathname: "/client/home",
      params: {
        tab: "Fitness Studios",
      },
    });
  };

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
        {/* Gym Badge */}
        <View style={styles.lockedBadge}>
          <View style={styles.lockedBadgeContent}>
            <Image
              source={require("../../../assets/images/payment/gym.png")}
              style={styles.badgeIcon}
              tintColor={"#FF5757"}
              resizeMode="contain"
            />
            <MaskedView
              maskElement={<Text style={styles.badgeText}>JOIN GYM</Text>}
            >
              <LinearGradient
                colors={["#FF5757", "#FFA6A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.badgeText, { opacity: 0 }]}>JOIN GYM</Text>
              </LinearGradient>
            </MaskedView>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            This feature will be unlocked once you join a gym{" "}
            <MaterialCommunityIcons name="dumbbell" size={20} color="#FF5757" />
          </Text>
        </View>

        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={goToGymPage}
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
      </View>
    </View>
  );
};

export default JoinGymLockedPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  subscribeButton: {
    width: "75%",
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
});
