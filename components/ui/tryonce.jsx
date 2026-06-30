import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { router } from "expo-router";

const TryOnce = ({ size = 10, get = false, topSpace = false }) => {
  return (
    <TouchableOpacity
      style={[styles.container, { marginTop: topSpace ? 350 : 0 }]}
      onPress={() => {
        router.push("/client/foodscanner");
      }}
    >
      {/* Crown Icon */}
      <Image
        source={require("../../assets/images/payment/premium.png")}
        style={[styles.crownIcon, { width: size, height: size }]}
        tintColor={"#FF5757"}
      />

      {/* Masked Premium Text */}
      <MaskedView
        maskElement={
          <Text style={[styles.premiumText, { fontSize: size }]}>
            {"Try Once"}
          </Text>
        }
      >
        <LinearGradient
          colors={["#FF5757", "#FFA6A6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={[styles.premiumText, { fontSize: size, opacity: 0 }]}>
            {"Try Once"}
          </Text>
        </LinearGradient>
      </MaskedView>
    </TouchableOpacity>
  );
};

export default TryOnce;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  crownIcon: {
    resizeMode: "contain",
  },
  premiumText: {
    fontWeight: "bold",
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: undefined,
  },
});
