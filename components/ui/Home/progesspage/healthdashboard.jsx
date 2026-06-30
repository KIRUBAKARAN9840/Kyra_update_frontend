import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import {
  handleFreemiumAccess,
  isGymPremium,
  isPureFreemium,
  isPurePremium,
} from "../../../../config/access";
import PremiumBadge from "../../Payment/premiumbadge";

const HealthDashboard = ({
  title = "Weekly Trends",
  subtitle = "Consistency, Strength, and Growth",
  description = "View Your Weekly Fitness Progress of Current Month.",
  buttonLabel = "View All Charts",
  onButtonPress = () => {},
  onChangeTab,
  plan,
}) => {
  const goTo = () => {
    handleFreemiumAccess(plan, "/client/allcharts");
  };
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {!isPurePremium(plan) && (
          <TouchableOpacity
            onPress={goTo}
            style={{ flexDirection: "row", justifyContent: "flex-start" }}
          >
            <Image
              source={require("../../../../assets/images/lock.png")}
              style={{ width: 22, height: 22 }}
            />
          </TouchableOpacity>
        )}

        {isPurePremium(plan) && (
          <TouchableOpacity onPress={onButtonPress}>
            <LinearGradient
              colors={["#FFFFFF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <MaskedView
                maskElement={
                  <Text style={styles.buttonText}>{buttonLabel}</Text>
                }
              >
                <LinearGradient
                  colors={["#323232", "#323232"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  // style={{ height: 20 }}
                >
                  <Text style={[styles.buttonText, { opacity: 0 }]}>
                    {buttonLabel}
                  </Text>
                </LinearGradient>
              </MaskedView>
              {/* <Text style={styles.buttonText}>{buttonLabel}</Text> */}
              <Ionicons name="chevron-forward" size={18} color="#323232" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
    height: 120,
    paddingHorizontal: 10,
  },
  textContainer: {
    width: "50%",
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginVertical: 3,
  },
  subtitle: {
    fontSize: 12,
    color: "#555555",
  },
  description: {
    fontSize: 10,
    color: "#555555",
    marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "normal",
    marginRight: 5,
  },
  illustrationContainer: {
    position: "absolute",
    right: 0,
    bottom: -15,
    width: "50%",
    height: "100%",
    justifyContent: "flex-end",
  },
  illustration: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});

export default HealthDashboard;
