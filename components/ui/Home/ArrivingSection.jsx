import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import LottieView from "lottie-react-native";
import { requestGymsAPI } from "../../../services/clientApi";
import styles from "./homeStyles";

const ArrivingSection = ({
  noGyms,
  locationCoords,
  gymRequested,
  setGymRequested,
  gymRequestMsg,
  setGymRequestMsg,
}) => {
  if (!noGyms) return null;

  return (
    <View style={styles.arrivingSection}>
      <View style={styles.arrivingContent}>
        <View style={styles.arrivingTextCol}>
          <Text style={styles.arrivingTitle}>
            We'll Be Arriving{"\n"}Soon!
          </Text>
          <Text style={styles.arrivingSub}>
            Partner gyms are coming to your area.Get ready to train anytime,
            anywhere
          </Text>
        </View>
        <View style={styles.arrivingLottieCol}>
          <LottieView
            source={require("../../../assets/gif/arriving.json")}
            autoPlay
            loop
            style={styles.arrivingLottie}
          />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.arrivingBtn, gymRequested && { opacity: 0.5 }]}
        activeOpacity={0.85}
        disabled={gymRequested}
        onPress={async () => {
          if (!locationCoords) return;
          const res = await requestGymsAPI({
            lat: locationCoords.lat,
            lng: locationCoords.lng,
          });
          if (res?.status === 200) {
            setGymRequested(true);
            setGymRequestMsg(
              res.already_requested
                ? "We've already noted your request!"
                : "Thanks! We'll notify you when gyms are available",
            );
          }
        }}
      >
        <Text style={styles.arrivingBtnText}>
          Request Fymble Gyms in Your Area
        </Text>
      </TouchableOpacity>
      {gymRequestMsg ? (
        <View style={styles.gymRequestTooltip}>
          <Text style={styles.gymRequestTooltipText}>{gymRequestMsg}</Text>
        </View>
      ) : null}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => Linking.openURL("https://wa.me/9743971315")}
        style={{ alignSelf: "center", marginTop: 10 }}
      >
        <Text style={styles.arrivingHelpText}>Need help?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ArrivingSection;
