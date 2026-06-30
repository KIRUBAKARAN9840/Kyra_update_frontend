import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  Dimensions,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const { width } = Dimensions.get("window");
const GRID_GAP = 16;
const CARD_OUTER_PADDING = 20;
const CARD_INNER_PADDING = 18;
const ITEM_SIZE =
  (width - CARD_OUTER_PADDING * 2 - CARD_INNER_PADDING * 2 - GRID_GAP) / 2;
const IMAGE_SIZE = Math.min(ITEM_SIZE - 30, 100);

const PREFERENCE_OPTIONS = [
  {
    id: "vegan",
    label: "Vegan",
    image: require("../../../assets/images/diet_coach/vegan.webp"),
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    image: require("../../../assets/images/diet_coach/veg.webp"),
  },
  {
    id: "eggetarian",
    label: "Eggetarian",
    image: require("../../../assets/images/diet_coach/eggterian.webp"),
  },
  {
    id: "non_vegetarian",
    label: "Non-vegetarian",
    image: require("../../../assets/images/diet_coach/nonveg.webp"),
  },
  {
    id: "keto",
    label: "Keto",
    image: require("../../../assets/images/diet_coach/keto.webp"),
  },
  {
    id: "paleo",
    label: "Paleo",
    image: require("../../../assets/images/diet_coach/paloe.webp"),
  },
];

const Preference = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState("");

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  const handleContinue = () => {
    const option = PREFERENCE_OPTIONS.find((o) => o.id === selected);
    const label = option ? option.label : selected;
    router.push({
      pathname: "/client/(dietcoach)/choices",
      params: {
        ...params,
        preference: label,
      },
    });
  };

  return (
    <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={ACCENT} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 6 of 8</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Dietary </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="Preference"
          textStyle={styles.titleTextBold}
        />
      </View>
      <Text style={styles.subtitleText}>
        Select your preferred diet style
      </Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridCard}>
          <View style={styles.grid}>
            {PREFERENCE_OPTIONS.map((item) => {
              const isActive = selected === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.item}
                  onPress={() => setSelected(item.id)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <View style={styles.itemCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={ACCENT}
                      />
                    </View>
                  )}
                  <View
                    style={[
                      styles.imageWrapper,
                      isActive && styles.imageWrapperActive,
                    ]}
                  >
                    <Image
                      source={item.image}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    style={[
                      styles.itemLabel,
                      isActive && styles.itemLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected chip */}
        {selected !== "" && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Selected:</Text>
            <View style={styles.chipsRow}>
              <View style={styles.chipWrapper}>
                <LinearGradient
                  colors={[GRADIENT_1, GRADIENT_2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.chip}
                >
                  <View style={styles.chipDot} />
                  <Text style={styles.chipText}>
                    {PREFERENCE_OPTIONS.find((o) => o.id === selected)?.label}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity
          style={[
            styles.continueButtonWrapper,
            !selected && styles.disabledWrapper,
          ]}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!selected}
        >
          <LinearGradient
            colors={selected ? [GRADIENT_1, GRADIENT_2] : ["#EEEEEE", "#EEEEEE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text
              style={[
                styles.continueButtonText,
                !selected && styles.disabledButtonText,
              ]}
            >
              Continue
            </Text>
            <Feather
              name="arrow-right"
              size={16}
              color={selected ? "white" : "#454545"}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Preference;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  stepIndicator: {
    flex: 1,
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#6A7282",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 34,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 0,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  titleTextBold: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  scrollContent: {
    paddingHorizontal: CARD_OUTER_PADDING,
    paddingBottom: 20,
  },
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: CARD_INNER_PADDING,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "space-between",
  },
  item: {
    width: ITEM_SIZE,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  imageWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 10,
  },
  imageWrapperActive: {
    borderColor: ACCENT,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  itemLabelActive: {
    color: "#1A1A1A",
  },
  itemCheck: {
    position: "absolute",
    top: 6,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    zIndex: 1,
  },
  // Chips
  chipsSection: {
    marginTop: 20,
  },
  chipsLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  // Bottom
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
  },
  disabledWrapper: {},
  continueButton: {
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButtonText: {
    color: "#454545",
  },
});
