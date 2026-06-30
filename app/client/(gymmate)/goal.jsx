import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_GAP = 16;
const CARD_SIZE = (width - 48 - CARD_GAP) / 2;

const GOALS = [
  {
    label: "Weight Gain",
    value: "Weight Gain",
    image: require("../../../assets/images/gym_mate/weight_gain.png"),
  },
  {
    label: "Weight Loss",
    value: "Weight Loss",
    image: require("../../../assets/images/gym_mate/weight_loss.png"),
  },
  {
    label: "Build Muscle",
    value: "Muscle Building",
    image: require("../../../assets/images/gym_mate/muscle_building.png"),
  },
  {
    label: "Stay Fit",
    value: "Stay Fit",
    image: require("../../../assets/images/gym_mate/stay_fit.png"),
  },
];

const Goal = () => {
  const router = useRouter();

  const handleSelect = (goal) => {
    router.push({
      pathname: "/client/(gymmate)/activity",
      params: { goal: goal.value },
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>
      <Text style={styles.step}>Step 1 of 5</Text>
      <Text style={styles.title}>What's your main goal?</Text>

      <View style={styles.grid}>
        {GOALS.map((goal) => (
          <TouchableOpacity
            key={goal.value}
            style={styles.card}
            activeOpacity={0.6}
            onPress={() => handleSelect(goal)}
          >
            <Image
              source={goal.image}
              style={styles.cardImage}
              resizeMode="contain"
            />
            <Text style={styles.cardLabel}>{goal.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default Goal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  step: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 24,
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
    width: CARD_SIZE * 0.65,
    height: CARD_SIZE * 0.65,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
  },
});
