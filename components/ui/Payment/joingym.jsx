import { StyleSheet, Text, View, Image, TouchableOpacity } from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useRouter } from "expo-router";
const JoinGym = ({ size = 10, topSpace = false, tab = false, onChangeTab }) => {
  const router = useRouter();
  const goToGym = () => {
    if (tab) onChangeTab("Fitness Studios");
    else {
      router.push({
        pathname: "/client/home",
        params: {
          tab: "Fitness Studios",
        },
      });
    }
  };
  return (
    <TouchableOpacity
      style={[styles.container, { marginTop: topSpace ? 450 : 0 }]}
      onPress={goToGym}
    >
      {/* Crown Icon */}
      <Image
        source={require("../../../assets/images/payment/gym.png")}
        style={[styles.crownIcon, { width: size, height: size }]}
        tintColor={"#FF5757"}
      />

      {/* Masked Premium Text */}
      <MaskedView
        maskElement={
          <Text style={[styles.premiumText, { fontSize: size }]}>Join Gym</Text>
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
            Join Gym
          </Text>
        </LinearGradient>
      </MaskedView>
    </TouchableOpacity>
  );
};

export default JoinGym;

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
