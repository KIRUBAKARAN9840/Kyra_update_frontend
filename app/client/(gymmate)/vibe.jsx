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

const MUSCLE_IMAGES = {
  abs: require("../../../assets/images/muscle/abs.png"),
  chest: require("../../../assets/images/muscle/chest.png"),
  back: require("../../../assets/images/muscle/back.png"),
  shoulders: require("../../../assets/images/muscle/shoulder.png"),
  biceps: require("../../../assets/images/muscle/biceps.png"),
  triceps: require("../../../assets/images/muscle/triceps.png"),
  legs: require("../../../assets/images/muscle/legs.png"),
  glutes: require("../../../assets/images/muscle/glutes.png"),
  forearms: require("../../../assets/images/muscle/forearms.png"),
  calves: require("../../../assets/images/muscle/calves.png"),
  traps: require("../../../assets/images/muscle/traps.png"),
  full_body: require("../../../assets/images/muscle/full_body.png"),
  push: require("../../../assets/images/muscle/push_day.png"),
  pull: require("../../../assets/images/muscle/pull_day.png"),
  cardio: require("../../../assets/images/muscle/cardio.png"),
  hiit: require("../../../assets/images/muscle/hiit.png"),
};

const OPTIONS = [
  { key: "abs", label: "Abs" },
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "shoulders", label: "Shoulders" },
  { key: "biceps", label: "Biceps" },
  { key: "triceps", label: "Triceps" },
  { key: "legs", label: "Legs" },
  { key: "glutes", label: "Glutes" },
  { key: "forearms", label: "Forearms" },
  { key: "calves", label: "Calves" },
  { key: "traps", label: "Traps" },
  { key: "full_body", label: "Full Body" },
  { key: "push", label: "Push Day" },
  { key: "pull", label: "Pull Day" },
  { key: "cardio", label: "Cardio" },
  { key: "hiit", label: "HIIT" },
];

const Vibe = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState([]);

  const toggle = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
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
        <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
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
          <Text style={styles.stepLabel}>Step 4 of 5</Text>
          <Text style={styles.title}>What do you train?</Text>
          <Text style={styles.subtitle}>
            Select the muscle groups you focus on
          </Text>
        </View>

        {/* 2-column grid */}
        <View style={styles.grid}>
          {OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                onPress={() => toggle(opt.key)}
                activeOpacity={0.85}
              >
                <Image
                  source={MUSCLE_IMAGES[opt.key]}
                  style={styles.muscleImage}
                />
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
              const labels = selected.map(
                (k) => OPTIONS.find((o) => o.key === k)?.label,
              );
              router.push({
                pathname: "/client/(gymmate)/choosegym",
                params: {
                  ...params,
                  muscle_groups: JSON.stringify(labels),
                },
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

export default Vibe;

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
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionCard: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    position: "relative",
  },
  optionCardSelected: {
    borderColor: "#101828",
    backgroundColor: "#F8F9FA",
  },
  muscleImage: {
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
    top: 8,
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
