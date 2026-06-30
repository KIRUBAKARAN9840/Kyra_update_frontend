import React from "react";
import { Platform, StyleSheet } from "react-native";
import { Text, View } from "react-native";
import * as Animatable from "react-native-animatable";

const CardTitle = ({ title }) => {
  return (
    <Animatable.View
      animation="fadeInDown"
      duration={800}
      delay={400}
      style={styles.welcomeHeaderContainer}
    >
      {/* <Text style={styles.welcomeTitle}>Welcome to Fittbot!!</Text> */}
      <View style={styles.welcomeBrandContainer}>
        <Text style={styles.gymAdminText}>{title}</Text>
      </View>
      <View style={styles.headerDivider} />
    </Animatable.View>
  );
};

export default CardTitle;

const styles = StyleSheet.create({
  welcomeHeaderContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    marginBottom: 5,
  },
  welcomeBrandContainer: {
    alignItems: "center",
  },
  welcomeBrand: {
    fontSize: 32,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontWeight: "bold",
  },
  brandFirstPart: {
    color: "#FF5757",
  },
  brandSecondPart: {
    color: "#333333",
  },
  gymAdminText: {
    fontSize: 16,
    color: "#686868",
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    marginTop: 2,
    // fontWeight: 'bold',
  },
  headerDivider: {
    width: 60,
    height: 3,
    backgroundColor: "#FF5757",
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 8,
  },
});
