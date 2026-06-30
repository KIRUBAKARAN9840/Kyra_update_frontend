import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GradientButton2 from "../GradientButton2";

const { width } = Dimensions.get("window");

const MissedLogCard = ({ onPress }) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.rowContainer}>
        <View style={styles.iconWrapper}>
          <Image
            source={require("../../../assets/images/diet/fork_knife.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Oops, missed a log? Let’s fix that.</Text>
          <Text style={styles.subtitle}>
            Tap below to log your missed meal.
          </Text>
          <TouchableOpacity onPress={onPress} style={styles.buttonWrapper}>
            <LinearGradient
              colors={["#28A745", "#007BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Log Now</Text>
            </LinearGradient>
          </TouchableOpacity>
          {/* <GradientButton2 /> */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#F8FCFF",
    borderRadius: 20,
    padding: 16,
    width: width * 0.92,
    alignSelf: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginRight: 12,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    width: 40,
    height: 40,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#777",
    marginBottom: 12,
  },
  buttonWrapper: {
    // width: 120,
    width: "60%",
  },
  button: {
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default MissedLogCard;
