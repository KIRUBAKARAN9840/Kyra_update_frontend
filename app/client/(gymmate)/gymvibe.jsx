import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_GAP = 16;
const CARD_SIZE = (width - 40 - CARD_GAP) / 2;

const VIBES = [
  {
    label: "Friendly & Social",
    image: require("../../../assets/images/gym_mate/friendly.png"),
  },
  {
    label: "Beginner-friendly",
    image: require("../../../assets/images/gym_mate/beginner.png"),
  },
  {
    label: "Chill & Relaxed",
    image: require("../../../assets/images/gym_mate/chill.png"),
  },
  {
    label: "Motivator",
    image: require("../../../assets/images/gym_mate/motivator.png"),
  },
  {
    label: "Competitive",
    image: require("../../../assets/images/gym_mate/competitive.png"),
  },
  {
    label: "Serious & Focused",
    image: require("../../../assets/images/gym_mate/serious.png"),
  },
];

const GymVibe = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goal, activities } = useLocalSearchParams();

  const handleSelect = (vibe) => {
    router.push({
      pathname: "/client/(gymmate)/timing",
      params: { goal, activities, vibe },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      <View style={styles.topSection}>
        <Text style={styles.stepLabel}>Step 3 of 5</Text>
        <Text style={styles.title}>What's your gym vibe?</Text>
      </View>

      <View style={styles.grid}>
        {VIBES.map((vibe) => (
          <TouchableOpacity
            key={vibe.label}
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => handleSelect(vibe.label)}
          >
            <Image
              source={vibe.image}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <Text style={styles.cardLabel}>{vibe.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default GymVibe;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  topSection: {
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 24,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 36,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    justifyContent: "center",
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardImage: {
    width: CARD_SIZE * 0.45,
    height: CARD_SIZE * 0.45,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
});
