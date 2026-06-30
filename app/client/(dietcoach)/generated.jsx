import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { swapMealAPI } from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const { width } = Dimensions.get("window");

const MEAL_IMAGES = {
  breakfast: require("../../../assets/images/diet/breakfast.webp"),
  lunch: require("../../../assets/images/diet/lunch.webp"),
  snacks: require("../../../assets/images/diet/snacks.webp"),
  dinner: require("../../../assets/images/diet/dinner.webp"),
};

const CATEGORY_MAP = {
  breakfast: { label: "Breakfast", time: "8:00 am - 9:30 am", image: "breakfast" },
  lunch: { label: "Lunch", time: "12:30 pm - 2:00 pm", image: "lunch" },
  snacks: { label: "Evening Snack", time: "4:00 pm - 5:30 pm", image: "snacks" },
  dinner: { label: "Dinner", time: "7:00 pm - 8:30 pm", image: "dinner" },
};

const transformPlanToMeals = (plan) => {
  const result = {};
  if (!Array.isArray(plan)) return result;

  plan.forEach((dayData) => {
    const dayNum = dayData.day;
    const meals = [];

    ["breakfast", "lunch", "snacks", "dinner"].forEach((key) => {
      const items = dayData[key];
      if (!Array.isArray(items) || items.length === 0) return;
      const meta = CATEGORY_MAP[key];
      // Combine all items in the category into one meal name
      const mealName = items.map((i) => i.name).join(", ");
      meals.push({
        id: `${key}_${dayNum}`,
        category: meta.label,
        time: meta.time,
        meal: mealName,
        image: meta.image,
        items,
      });
    });

    result[dayNum] = meals;
  });

  return result;
};

const Generated = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const dayScrollRef = useRef(null);

  // Mutable plan data for swaps
  const [planData, setPlanData] = useState(() => {
    try {
      return JSON.parse(params.plan || "[]");
    } catch {
      return [];
    }
  });

  // Swap state
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null); // { mealType, day, itemIndex }
  const [swapReason, setSwapReason] = useState("");
  const [swappingMealId, setSwappingMealId] = useState(null); // meal.id currently swapping

  const planId = params.plan_id || "";

  const mealsMap = useMemo(() => transformPlanToMeals(planData), [planData]);
  const dayCount = planData.length || 7;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/client/(tabs)/diet");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  const meals = mealsMap[selectedDay] || [];

  const handleSaveMeal = () => {
    router.replace({
      pathname: "/client/(dietcoach)/savedmeal",
      params: {
        plan: JSON.stringify(planData),
        plan_id: planId,
      },
    });
  };

  // Open swap modal
  const openSwapModal = (meal) => {
    const mealType = meal.id.split("_")[0]; // "breakfast", "lunch", "snacks", "dinner"
    setSwapTarget({ mealType, day: selectedDay, itemIndex: 0, mealId: meal.id });
    setSwapReason("");
    setSwapModalVisible(true);
  };

  // Execute swap
  const handleSwap = async () => {
    if (!swapTarget || !planId) return;
    setSwapModalVisible(false);
    setSwappingMealId(swapTarget.mealId);

    const payload = {
      day: swapTarget.day,
      meal_type: swapTarget.mealType,
      item_index: swapTarget.itemIndex,
    };
    if (swapReason.trim()) {
      payload.reason = swapReason.trim();
    }

    try {
      const res = await swapMealAPI(planId, payload);

      if (res?.httpStatus === 200 && res?.new_item) {
        // Patch local plan state
        setPlanData((prev) => {
          const updated = JSON.parse(JSON.stringify(prev));
          const dayObj = updated.find((d) => d.day === swapTarget.day);
          if (dayObj && Array.isArray(dayObj[swapTarget.mealType])) {
            dayObj[swapTarget.mealType][swapTarget.itemIndex] = res.new_item;
          }
          return updated;
        });
      } else if (res?.httpStatus === 401) {
        Alert.alert("Session Expired", "Please log in again.");
      } else if (res?.httpStatus === 404) {
        Alert.alert("Not Found", "Diet plan not found.");
      } else if (res?.httpStatus === 422) {
        Alert.alert("Invalid Request", res?.detail || "Invalid swap parameters.");
      } else if (res?.httpStatus === 429) {
        Alert.alert("Limit Reached", res?.detail || "You've reached the daily swap limit.");
      } else if (res?.httpStatus === 503) {
        Alert.alert("AI Busy", "The AI is currently busy. Please try again shortly.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setSwappingMealId(null);
      setSwapTarget(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/client/(tabs)/diet")}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalized AI Diet Plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Day chips */}
      <ScrollView
        ref={dayScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayChipsContainer}
      >
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
          const isActive = selectedDay === day;
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.8}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
            >
              <Text
                style={[
                  styles.dayChipText,
                  isActive && styles.dayChipTextActive,
                ]}
              >
                Day {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Meal cards */}
      <ScrollView
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {meals.map((meal) => {
          const isSwapping = swappingMealId === meal.id;
          return (
            <View
              key={meal.id}
              style={[styles.mealCard, isSwapping && styles.mealCardSwapping]}
            >
              {isSwapping && (
                <View style={styles.swapOverlay}>
                  <ActivityIndicator size="small" color={ACCENT} />
                  <Text style={styles.swapOverlayText}>Swapping meal...</Text>
                </View>
              )}
              <View style={styles.mealCardInner}>
                <Image
                  source={MEAL_IMAGES[meal.image]}
                  style={styles.mealImage}
                  resizeMode="cover"
                />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealCategory}>{meal.category}</Text>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                </View>
                <TouchableOpacity
                  style={styles.swapButton}
                  activeOpacity={0.8}
                  onPress={() => openSwapModal(meal)}
                  disabled={!!swappingMealId}
                >
                  <LinearGradient
                    colors={[GRADIENT_1, GRADIENT_2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.swapGradient,
                      !!swappingMealId && { opacity: 0.5 },
                    ]}
                  >
                    <Ionicons name="swap-horizontal" size={14} color="#fff" />
                    <Text style={styles.swapText}>Swap Meal</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <View style={styles.mealNameRow}>
                <Text style={styles.mealName}>{meal.meal}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Save button */}
      <View
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity
          style={styles.saveButtonWrapper}
          onPress={handleSaveMeal}
          activeOpacity={0.85}
          disabled={!!swappingMealId}
        >
          <LinearGradient
            colors={[GRADIENT_1, GRADIENT_2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.saveButton,
              !!swappingMealId && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.saveButtonText}>Save Meal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Swap Modal */}
      <Modal
        visible={swapModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSwapModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Swap Meal</Text>
            <Text style={styles.modalSubtitle}>
              Want a different option? We'll find a new meal for you.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for swap (optional)"
              placeholderTextColor="#aaa"
              value={swapReason}
              onChangeText={setSwapReason}
              multiline
              maxLength={200}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSwapModalVisible(false);
                  setSwapTarget(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSwapButton}
                onPress={handleSwap}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[GRADIENT_1, GRADIENT_2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmSwapGradient}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#fff" />
                  <Text style={styles.confirmSwapText}>Swap</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Generated;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 34,
  },
  dayChipsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  dayChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  dayChipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  mealsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  mealCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mealCardSwapping: {
    opacity: 0.6,
  },
  mealCardInner: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  mealImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealCategory: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 12,
    color: "#999",
  },
  swapButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  swapGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  swapText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  mealNameRow: {
    backgroundColor: "#EDEDED",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mealName: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
  },
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Swap overlay on card
  swapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  swapOverlayText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 16,
    lineHeight: 18,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  confirmSwapButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  confirmSwapGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  confirmSwapText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
