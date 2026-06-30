import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OPTIONS = [
  {
    key: "gymming",
    label: "Gymming",
    image: require("../../../assets/images/gym_mate/gymming.png"),
  },
  {
    key: "body_building",
    label: "Body Building",
    image: require("../../../assets/images/gym_mate/body_building.png"),
  },
  {
    key: "weight_lifting",
    label: "Weight Lifting",
    image: require("../../../assets/images/gym_mate/weight_lifting.png"),
  },
  {
    key: "cardio",
    label: "Cardio",
    image: require("../../../assets/images/gym_mate/cardio.png"),
  },
  {
    key: "yoga",
    label: "Yoga",
    image: require("../../../assets/images/gym_mate/yoga.png"),
  },
  {
    key: "crossfit",
    label: "CrossFit",
    image: require("../../../assets/images/gym_mate/crossfit.png"),
  },
  {
    key: "cycling",
    label: "Cycling",
    image: require("../../../assets/images/gym_mate/cycling.png"),
  },
  {
    key: "running",
    label: "Running",
    image: require("../../../assets/images/gym_mate/running.png"),
  },
  {
    key: "swimming",
    label: "Swimming",
    image: require("../../../assets/images/gym_mate/swimming.png"),
  },
  {
    key: "martial_arts",
    label: "Martial Arts",
    image: require("../../../assets/images/gym_mate/martial_arts.png"),
  },
  {
    key: "pilates",
    label: "Pilates",
    image: require("../../../assets/images/gym_mate/pilates.png"),
  },
  {
    key: "hiit",
    label: "HIIT",
    image: require("../../../assets/images/gym_mate/hiit.png"),
  },
  {
    key: "calisthenics",
    label: "Calisthenics",
    image: require("../../../assets/images/gym_mate/calisthenics.png"),
  },
  {
    key: "zumba",
    label: "Zumba",
    image: require("../../../assets/images/gym_mate/zumba.png"),
  },
];

const Activity = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goal } = useLocalSearchParams();
  const [selected, setSelected] = useState([]);

  const toggle = (label) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topSection}>
          <Text style={styles.stepLabel}>Step 2 of 5</Text>
          <Text style={styles.title}>What do you enjoy?</Text>
        </View>

        {/* 2-column grid */}
        <View style={styles.grid}>
          {OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.label);
            return (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => toggle(opt.label)}
                activeOpacity={0.6}
              >
                <Image source={opt.image} style={styles.optionImage} />
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={11} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Continue */}
      {selected.length > 0 && (
        <View
          style={[
            styles.continueWrapper,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <TouchableOpacity
            style={styles.continueBtn}
            activeOpacity={0.85}
            onPress={() => {
              router.push({
                pathname: "/client/(gymmate)/gymvibe",
                params: { goal, activities: JSON.stringify(selected) },
              });
            }}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Activity;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    marginTop: 8,
    marginLeft: 12,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
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
    gap: 8,
  },
  optionCard: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    position: "relative",
  },
  optionCardSelected: {
    borderColor: "#101828",
    backgroundColor: "#F8F9FA",
  },
  optionImage: {
    width: 28,
    height: 28,
    marginRight: 10,
    resizeMode: "contain",
  },
  optionLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flexShrink: 1,
  },
  optionLabelSelected: {
    color: "#101828",
    fontWeight: "700",
  },
  checkBadge: {
    position: "absolute",
    top: 3,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#101828",
    justifyContent: "center",
    alignItems: "center",
  },
  continueWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  continueBtn: {
    backgroundColor: "#101828",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
