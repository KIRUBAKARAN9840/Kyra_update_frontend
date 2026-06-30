import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const TIMINGS = [
  {
    label: "Morning",
    value: "Morning",
    subtitle: "5 AM – 10 AM",
    icon: "sunny",
    iconColor: "#F59E0B",
    iconBg: "#F59E0B",
    cardBg: "#FEF6E9",
  },
  {
    label: "Evening",
    value: "Evening",
    subtitle: "5 PM – 9 PM",
    icon: "time",
    iconColor: "#7C3AED",
    iconBg: "#7C3AED",
    cardBg: "#F4F0FE",
  },
  {
    label: "Flexible",
    value: "Flexible",
    subtitle: "Any time",
    icon: "pulse",
    iconColor: "#EC4899",
    iconBg: "#EC4899",
    cardBg: "#FFECF3",
  },
];

const Timing = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goal, activities, vibe } = useLocalSearchParams();

  const handleSelect = (timing) => {
    router.push({
      pathname: "/client/(gymmate)/location",
      params: { goal, activities, vibe, preferredTiming: timing },
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
        <Text style={styles.stepLabel}>Step 4 of 5</Text>
        <Text style={styles.title}>When do you usually train?</Text>
      </View>

      <View style={styles.cardList}>
        {TIMINGS.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.card, { backgroundColor: t.cardBg }]}
            activeOpacity={0.6}
            onPress={() => handleSelect(t.value)}
          >
            <View style={[styles.iconBox, { backgroundColor: t.iconBg }]}>
              <Ionicons name={t.icon} size={22} color="#FFF" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{t.label}</Text>
              <Text style={styles.cardSub}>{t.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default Timing;

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
  cardList: {
    gap: 16,
    marginTop: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardText: {
    marginLeft: 16,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});
