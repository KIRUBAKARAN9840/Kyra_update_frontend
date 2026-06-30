import { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OPTIONS = [
  {
    key: "male",
    label: "Male",
    icon: "male-outline",
  },
  {
    key: "female",
    label: "Female",
    icon: "female-outline",
  },
  {
    key: "unisex",
    label: "Unisex",
    icon: "people-outline",
  },
  {
    key: "any",
    label: "No Preference",
    icon: "apps-outline",
  },
];

const MatePrefer = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState(null);

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

      {/* Header */}
      <View style={styles.topSection}>
        <Text style={styles.stepLabel}>Step 2 of 5</Text>
        <Text style={styles.title}>Gym Mate Preference</Text>
        <Text style={styles.subtitle}>
          Choose your preferred workout partner
        </Text>
      </View>

      {/* Options */}
      <View style={styles.optionsSection}>
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => setSelected(opt.key)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.iconCircle,
                  isSelected && styles.iconCircleSelected,
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? "#FFFFFF" : "#555"}
                />
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color="#101828" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Continue */}
      {selected && (
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
              const label = OPTIONS.find((o) => o.key === selected)?.label;
              router.push({
                pathname: "/client/(gymmate)/level",
                params: { ...params, mate_preference: label },
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

export default MatePrefer;

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
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "400",
    textAlign: "center",
  },
  optionsSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionCardSelected: {
    borderColor: "#101828",
    backgroundColor: "#F8F9FA",
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAECF0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  iconCircleSelected: {
    backgroundColor: "#101828",
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: "#101828",
    fontWeight: "700",
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
