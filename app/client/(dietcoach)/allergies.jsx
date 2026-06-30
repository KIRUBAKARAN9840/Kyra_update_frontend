import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  BackHandler,
  Dimensions,
  Modal,
  Keyboard,
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
const GRID_GAP = 12;
const CARD_SIZE = (width - 40 - GRID_GAP) / 2;

const ALLERGY_OPTIONS = [
  {
    id: "dairy",
    label: "Dairy",
    image: require("../../../assets/images/diet_coach/diary.webp"),
  },
  {
    id: "gluten",
    label: "Gluten",
    image: require("../../../assets/images/diet_coach/gluten.webp"),
  },
  {
    id: "nuts",
    label: "Nuts",
    image: require("../../../assets/images/diet_coach/nuts.webp"),
  },
  {
    id: "soya",
    label: "Soya",
    image: require("../../../assets/images/diet_coach/soya.webp"),
  },
  {
    id: "eggs",
    label: "Eggs",
    image: require("../../../assets/images/diet_coach/eggs.webp"),
  },
  {
    id: "fish",
    label: "Fish",
    image: require("../../../assets/images/diet_coach/fish.webp"),
  },
  {
    id: "shellfish",
    label: "Shellfish",
    image: require("../../../assets/images/diet_coach/shellfish.webp"),
  },
];

const Allergies = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState("");
  const [otherAllergies, setOtherAllergies] = useState([]);

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

  const toggleAllergy = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const openOtherModal = () => {
    setOtherText("");
    setShowOtherInput(true);
  };

  const closeOtherModal = () => {
    setOtherText("");
    setShowOtherInput(false);
  };

  const addOtherAllergy = () => {
    const trimmed = otherText.trim();
    if (trimmed && !otherAllergies.includes(trimmed)) {
      setOtherAllergies((prev) => [...prev, trimmed]);
      setSelected((prev) => [...prev, `other_${trimmed}`]);
      setOtherText("");
      setShowOtherInput(false);
    }
  };

  const removeChip = (id) => {
    if (id.startsWith("other_")) {
      const item = id.replace("other_", "");
      setOtherAllergies((prev) => prev.filter((a) => a !== item));
    }
    setSelected((prev) => prev.filter((a) => a !== id));
  };

  const allSelected = [
    ...selected.filter((s) => !s.startsWith("other_")),
    ...otherAllergies.map((a) => `other_${a}`),
  ];
  const uniqueSelected = [...new Set([...selected])];

  const getChipLabel = (id) => {
    if (id.startsWith("other_")) return id.replace("other_", "");
    const option = ALLERGY_OPTIONS.find((o) => o.id === id);
    return option ? option.label : id;
  };

  const handleContinue = () => {
    const allergyLabels = uniqueSelected.map((id) => getChipLabel(id));
    router.push({
      pathname: "/client/(dietcoach)/preference",
      params: {
        ...params,
        allergies: allergyLabels.join(","),
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
          <Text style={styles.stepText}>Step 5 of 8</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Any </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="Allergies"
          textStyle={styles.titleTextBold}
        />
        <Text style={styles.titleText}>?</Text>
      </View>
      <Text style={styles.subtitleText}>
        We'll exclude these from your meal plan
      </Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Grid */}
        <View style={styles.grid}>
          {ALLERGY_OPTIONS.map((item) => {
            const isActive = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => toggleAllergy(item.id)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <View style={styles.cardCheck}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={ACCENT}
                    />
                  </View>
                )}
                <Image
                  source={item.image}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                <Text
                  style={[styles.cardLabel, isActive && styles.cardLabelActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Other card */}
          <TouchableOpacity
            style={[
              styles.card,
              otherAllergies.length > 0 && styles.cardActive,
            ]}
            onPress={openOtherModal}
            activeOpacity={0.7}
          >
            <View style={styles.otherIconWrapper}>
              <Feather
                name="plus"
                size={28}
                color={otherAllergies.length > 0 ? ACCENT : "#999"}
              />
            </View>
            <Text
              style={[
                styles.cardLabel,
                otherAllergies.length > 0 && styles.cardLabelActive,
              ]}
            >
              Other
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected chips */}
        {uniqueSelected.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Selected:</Text>
            <View style={styles.chipsRow}>
              {uniqueSelected.map((id) => (
                <View key={id} style={styles.chipWrapper}>
                  <LinearGradient
                    colors={[GRADIENT_1, GRADIENT_2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.chip}
                  >
                    <View style={styles.chipDot} />
                    <Text style={styles.chipText}>{getChipLabel(id)}</Text>
                    <TouchableOpacity
                      onPress={() => removeChip(id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity
          style={styles.continueButtonWrapper}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[GRADIENT_1, GRADIENT_2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Other allergy modal */}
      <Modal
        visible={showOtherInput}
        transparent
        animationType="fade"
        onRequestClose={closeOtherModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => Keyboard.dismiss()}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Add Allergy</Text>
            <Text style={styles.modalSubtitle}>
              Type the name of your allergy
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Sesame, Corn..."
              placeholderTextColor="#999"
              value={otherText}
              onChangeText={setOtherText}
              onSubmitEditing={addOtherAllergy}
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeOtherModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalAddButtonWrapper}
                onPress={addOtherAllergy}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[GRADIENT_1, GRADIENT_2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalAddButton}
                >
                  <Text style={styles.modalAddText}>Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

export default Allergies;

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
    marginBottom: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "flex-start",
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE - 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#eee",
    position: "relative",
  },
  cardActive: {
    borderColor: ACCENT,
    backgroundColor: "#FFFFFF",
  },
  cardImage: {
    width: CARD_SIZE * 0.9,
    height: CARD_SIZE * 0.5,
    marginBottom: 0,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  cardLabelActive: {
    color: "#333",
  },
  cardCheck: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  // Other
  otherIconWrapper: {
    width: CARD_SIZE * 0.4,
    height: CARD_SIZE * 0.4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: width - 60,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 20,
  },
  modalInput: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  modalAddButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalAddButton: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAddText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
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
});
