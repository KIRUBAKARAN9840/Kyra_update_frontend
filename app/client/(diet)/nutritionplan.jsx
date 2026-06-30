import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addNutritionStepAPI,
  getNutritionDietAPI,
  addClientDietAPI,
  getNutritionPageAPI,
} from "../../../services/clientApi";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { showToast } from "../../../utils/Toaster";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";

// Format 24h time to 12h
const formatTime = (time24) => {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
};

// Resolve meal image based on the meal title
const MEAL_IMAGES = {
  breakfast: require("../../../assets/images/diet/breakfast.webp"),
  lunch: require("../../../assets/images/diet/lunch.webp"),
  dinner: require("../../../assets/images/diet/dinner.webp"),
  snack: require("../../../assets/images/diet/snacks.webp"),
  default: require("../../../assets/images/Tiramisu.png"),
};

const getMealImage = (title) => {
  const t = (title || "").toLowerCase().trim();
  if (t === "breakfast") return MEAL_IMAGES.breakfast;
  if (t === "lunch") return MEAL_IMAGES.lunch;
  if (t === "dinner") return MEAL_IMAGES.dinner;
  if (t.includes("snack")) return MEAL_IMAGES.snack;
  return MEAL_IMAGES.default;
};

// Aggregate nutrition across all foods in a meal
const aggregateNutrition = (foods) => {
  const keys = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "fiber",
    "sugar",
    "calcium",
    "magnesium",
    "sodium",
    "potassium",
    "iron",
  ];
  const totals = {};
  keys.forEach((k) => {
    totals[k] = foods.reduce((sum, f) => sum + (f.nutrition[k] || 0), 0);
  });
  return totals;
};

const NutritionPlanCard = ({ meal, onLogFood, isLogging }) => {
  const totals = useMemo(() => aggregateNutrition(meal.foods), [meal.foods]);
  const foodName = meal.foods
    .map((f) => (f.quantity ? `${f.name} (${f.quantity})` : f.name))
    .join(" + ");

  const nutrients = [
    {
      label: "Calories",
      value: Math.round(totals.calories),
      width: 13,
      icon: require("../../../assets/images/diet/calorie.png"),
    },
    {
      label: "Proteins",
      value: Math.round(totals.protein),
      width: 22,
      icon: require("../../../assets/images/diet/protein.png"),
    },
    {
      label: "Carbs",
      value: Math.round(totals.carbs),
      width: 22,
      icon: require("../../../assets/images/diet/carb.png"),
    },
    {
      label: "Fats",
      value: Math.round(totals.fat),
      width: 17,
      icon: require("../../../assets/images/diet/fat.png"),
    },
    {
      label: "Fiber",
      value: Math.round(totals.fiber),
      width: 26,
      icon: require("../../../assets/images/diet/fiber.png"),
    },
    {
      label: "Sugar",
      value: Math.round(totals.sugar),
      width: 22,
      icon: require("../../../assets/images/diet/sugar.png"),
    },
  ];

  return (
    <LinearGradient
      colors={["#F8FCFF", "#f4fbf7"]}
      start={[0, 0]}
      end={[1, 1]}
      style={styles.cardContainer}
    >
      {/* Top section: Image + Meal info + Log Food button */}
      <View style={styles.topSection}>
        <Image
          source={getMealImage(meal.title)}
          style={styles.foodImage}
          resizeMode="cover"
        />
        <View style={styles.mealInfo}>
          <Text style={styles.mealType}>{meal.title}</Text>
          <Text style={styles.mealTime}>{meal.time}</Text>
        </View>
        {meal.is_logged ? (
          <View style={styles.loggedBadge}>
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.loggedText}>Logged</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.logFoodButton, isLogging && { opacity: 0.6 }]}
            onPress={onLogFood}
            disabled={isLogging}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.logFoodText}>+Log Food</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Food name */}
      <View style={styles.foodNameContainer}>
        <Text style={styles.foodName}>{foodName}</Text>
      </View>

      {/* Macros row */}
      <View style={styles.nutrition_2}>
        {nutrients.map((item, index) => (
          <View style={styles.row} key={index}>
            <Image
              source={item.icon}
              style={[styles.icon, { width: item.width }]}
            />
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Micronutrients */}
      <View style={styles.micronutrientsSection}>
        <View style={styles.micronutrientsHeader}>
          <Text style={styles.micronutrientsTitle}>Micro Nutrients</Text>
          <View style={styles.micronutrientsDivider} />
        </View>
        <View style={styles.micronutrientsRow}>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(totals.calcium)} mg
            </Text>
            <Text style={styles.microLabel}>Calcium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(totals.magnesium)} mg
            </Text>
            <Text style={styles.microLabel}>Magnesium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(totals.sodium)} mg
            </Text>
            <Text style={styles.microLabel}>Sodium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(totals.potassium)} mg
            </Text>
            <Text style={styles.microLabel}>Potassium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>{Math.round(totals.iron)} mg</Text>
            <Text style={styles.microLabel}>Iron</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};

const NutritionPlan = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [nutritionistName, setNutritionistName] = useState("");
  const [dietData, setDietData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planId, setPlanId] = useState(null);
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [loggingMealIndex, setLoggingMealIndex] = useState(null);
  const [nutritionPackage, setNutritionPackage] = useState(null);
  const [consumedCalories, setConsumedCalories] = useState(0);
  const [instructions, setInstructions] = useState("");
  const [calExpanded, setCalExpanded] = useState(true);
  const fadeLeft = useRef(new Animated.Value(0)).current;
  const fadeEaten = useRef(new Animated.Value(1)).current;
  const isSavingRef = useRef(false);
  const dayScrollRef = useRef(null);

  const fetchNutritionDiet = useCallback(async ({ syncDay = false } = {}) => {
    try {
      const [dietRes, pageRes] = await Promise.all([
        getNutritionDietAPI(),
        getNutritionPageAPI(),
      ]);

      if (dietRes?.status === 200) {
        const data = dietRes.data;
        setNutritionistName(data?.nutritionist_name ?? "");
        setDietData(data?.diet_data ?? []);
        setPlanId(data?.id ?? null);
        if (syncDay && data?.step) {
          setSelectedDay(data.step);
        }
        setConsumedCalories(data?.consumed_calories ?? 0);

        setInstructions(data?.instructions ?? "");
      }

      if (pageRes?.status === 200) {
        setNutritionPackage(
          pageRes?.personal_status?.nutrition_package ?? null,
        );
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNutritionDiet({ syncDay: true });
  }, [fetchNutritionDiet]);

  const toggleCalCard = () => {
    const toLeft = calExpanded;
    Animated.parallel([
      Animated.timing(fadeLeft, {
        toValue: toLeft ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeEaten, {
        toValue: toLeft ? 0 : 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    setCalExpanded(!calExpanded);
  };

  const handleDaySelect = async (day) => {
    setSelectedDay(day);
    if (planId) {
      addNutritionStepAPI(planId, day);
    }
  };

  const logFood = async (meal, mealIndex) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setLoggingMealIndex(mealIndex);

    try {
      const foodList = meal.foods.map((f) => ({
        id: `${Date.now()}${Math.random()}`.replace(/\./g, ""),
        name: f.name || "Unknown Food",
        calories: Number(f.nutrition?.calories) || 0,
        protein: Number(f.nutrition?.protein) || 0,
        carbs: Number(f.nutrition?.carbs) || 0,
        fat: Number(f.nutrition?.fat) || 0,
        fiber: Number(f.nutrition?.fiber) || 0,
        sugar: Number(f.nutrition?.sugar) || 0,
        calcium: Number(f.nutrition?.calcium) || 0,
        magnesium: Number(f.nutrition?.magnesium) || 0,
        iron: Number(f.nutrition?.iron) || 0,
        sodium: Number(f.nutrition?.sodium) || 0,
        potassium: Number(f.nutrition?.potassium) || 0,
        quantity: f.quantity || "1 serving",
        image_url: f.pic || "",
      }));

      const dietData = [
        {
          title: meal.title,
          foodList,
          itemsCount: foodList.length,
        },
      ];

      const payload = {
        date: toIndianISOString(new Date()).split("T")[0],
        diet_data: dietData,
        client_template_id: planId,
        day_number: selectedDay,
      };

      const response = await addClientDietAPI(payload);

      if (response?.status === 200) {
        const earnedXp = response?.reward_point || 0;

        if (earnedXp) {
          setXpAmount(earnedXp);
          setXpRewardVisible(true);
          setTimeout(() => {
            setXpRewardVisible(false);
          }, 3000);
        }

        showToast({
          type: "success",
          title: "Success",
          desc: `${meal.title} logged successfully!`,
        });

        // Refetch to update today's consumed calories and logged status
        fetchNutritionDiet();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error logging food",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      isSavingRef.current = false;
      setLoggingMealIndex(null);
    }
  };

  const days = dietData.map((d) => d.day_number);
  const dayDateMap = useMemo(() => {
    const map = {};
    dietData.forEach((d) => {
      if (d.date) {
        const [y, m, day] = d.date.split("-");
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        map[d.day_number] = `${parseInt(day)} ${months[parseInt(m) - 1]}`;
      }
    });
    return map;
  }, [dietData]);

  const currentDayData = dietData.find((d) => d.day_number === selectedDay);
  const meals = currentDayData?.meals || [];

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/client/home");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, []),
  );

  return (
    <>
      {xpRewardVisible && (
        <GrainConfettiAnimation numberOfPieces={150} xpPoints={xpAmount} />
      )}
      <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("/client/home")}
            style={styles.headerButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personalised Nutrition Plan</Text>
          <View style={styles.headerButton} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#28A745" />
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={
              <>
                {/* Nutritionist info */}
                <View style={styles.nutritionistContainer}>
                  <View style={styles.nutritionistAvatarContainer}>
                    <MaterialIcons name="person" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nutritionistLabel}>
                      Your Nutritionist
                    </Text>
                    <Text style={styles.nutritionistName}>
                      {nutritionistName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() =>
                      Linking.openURL(
                        "https://wa.me/919743999102?text=Hi%2C%20I%20need%20help%20with%20my%20nutrition%20plan",
                      )
                    }
                  >
                    <MaterialIcons name="chat" size={18} color="#fff" />
                    <Text style={styles.whatsappText}>Chat</Text>
                  </TouchableOpacity>
                </View>

                {/* View Instructions */}
                {instructions ? (
                  <TouchableOpacity
                    style={styles.instructionsRow}
                    onPress={() =>
                      router.push({
                        pathname: "/client/(diet)/instructions",
                        params: { instructions },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="description"
                      size={18}
                      color="#007AFF"
                    />
                    <Text style={styles.instructionsRowText}>
                      View Instructions
                    </Text>
                    <Feather name="chevron-right" size={16} color="#007AFF" />
                  </TouchableOpacity>
                ) : null}

                {/* Calories Card */}
                {currentDayData?.target_calories > 0 &&
                  (() => {
                    const consumed = consumedCalories;
                    const target = currentDayData.target_calories;
                    const left = Math.max(0, target - consumed);
                    const pct =
                      target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.95}
                        onPress={toggleCalCard}
                        style={styles.caloriesCard}
                      >
                        <View style={styles.caloriesHeaderRow}>
                          <View style={styles.caloriesTitleWrap}>
                            <Animated.Text
                              style={[
                                styles.caloriesTitle,
                                { opacity: fadeLeft, position: "absolute" },
                              ]}
                            >
                              Today's Calories Left
                            </Animated.Text>
                            <Animated.Text
                              style={[
                                styles.caloriesTitle,
                                { opacity: fadeEaten },
                              ]}
                            >
                              Today's Calories Eaten
                            </Animated.Text>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: "/client/(diet)/report",
                                params: { from: "nutritionplan" },
                              })
                            }
                            hitSlop={{
                              top: 8,
                              bottom: 8,
                              left: 12,
                              right: 4,
                            }}
                          >
                            <View style={styles.viewReportRow}>
                              <Text style={styles.viewReportText}>
                                View Report
                              </Text>
                              <Feather
                                name="arrow-right"
                                size={13}
                                color="#007AFF"
                              />
                            </View>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.caloriesValueRow}>
                          <Image
                            source={require("../../../assets/images/diet/calorie.png")}
                            style={styles.caloriesFireIcon}
                          />
                          <View style={styles.caloriesNumWrap}>
                            <Animated.Text
                              style={[
                                styles.caloriesValue,
                                { opacity: fadeLeft, position: "absolute" },
                              ]}
                            >
                              {left}
                            </Animated.Text>
                            <Animated.Text
                              style={[
                                styles.caloriesValue,
                                { opacity: fadeEaten, position: "absolute" },
                              ]}
                            >
                              {consumed}
                            </Animated.Text>
                          </View>
                          <View style={styles.caloriesSubWrap}>
                            <Animated.Text
                              style={[
                                styles.caloriesLabel,
                                { opacity: fadeLeft, position: "absolute" },
                              ]}
                            >
                              Calories left
                            </Animated.Text>
                            <Animated.Text
                              style={[
                                styles.caloriesLabel,
                                { opacity: fadeEaten },
                              ]}
                            >
                              /{target} kcal eaten
                            </Animated.Text>
                          </View>
                        </View>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${pct}%` },
                            ]}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                <ScrollView
                  ref={dayScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsContainer}
                  onLayout={() => {
                    if (days.length > 0 && selectedDay > 1) {
                      const chipWidth = 72;
                      const index = days.indexOf(selectedDay);
                      if (index > 0) {
                        dayScrollRef.current?.scrollTo({
                          x: index * chipWidth,
                          animated: false,
                        });
                      }
                    }
                  }}
                >
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => handleDaySelect(day)}
                      style={[
                        styles.chip,
                        selectedDay === day && styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedDay === day && styles.chipTextSelected,
                        ]}
                      >
                        {dayDateMap[day] || `Day ${day}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            }
            data={meals}
            keyExtractor={(item, index) => `${selectedDay}-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <NutritionPlanCard
                meal={item}
                onLogFood={() => logFood(item, index)}
                isLogging={loggingMealIndex === index}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Book Next Session CTA — mirrors AI follow-up at bottom of saved plan */}
        {nutritionPackage?.has_active_package && (
          <View
            style={[
              styles.bookNextContainer,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            {nutritionPackage?.next_session_unlocked ? (
              <TouchableOpacity
                style={styles.bookNextEligibleBtn}
                activeOpacity={0.85}
                onPress={() => router.push("/client/nutritionBooking")}
              >
                <MaterialIcons name="event" size={18} color="#fff" />
                <Text style={styles.bookNextEligibleText}>
                  Book Session {nutritionPackage?.next_session_number ?? ""}
                  {nutritionPackage?.next_session_duration
                    ? ` (${nutritionPackage.next_session_duration} min)`
                    : ""}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.bookNextLockedBtn}>
                <MaterialIcons name="lock" size={18} color="#888" />
                <Text style={styles.bookNextLockedText}>
                  {nutritionPackage?.next_unlock_date
                    ? `Next session unlocks ${nutritionPackage.next_unlock_date}`
                    : "Next session locked"}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );
};

export default NutritionPlan;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
    padding: 4,
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  nutritionistContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginTop: 12,
    backgroundColor: "#f0faf3",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d4edda",
  },
  nutritionistAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#28A745",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nutritionistLabel: {
    fontSize: 11,
    color: "#888",
  },
  nutritionistName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 1,
  },
  instructionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginTop: 8,
    backgroundColor: "#EBF4FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D0E4FF",
  },
  instructionsRowText: {
    flex: 1,
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "600",
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 5,
  },
  whatsappText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  chipsContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipSelected: {
    backgroundColor: "#28A745",
    borderColor: "#28A745",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  // Book Next Session CTA (mirrors AI follow-up bottom button)
  bookNextContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  bookNextEligibleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00BC7D",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  bookNextEligibleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  bookNextLockedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  bookNextLockedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  // Calories card
  caloriesCard: {
    marginTop: 12,
    marginHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 10,
  },
  caloriesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    marginBottom: 10,
  },
  caloriesTitleWrap: {
    flex: 1,
    height: 20,
    justifyContent: "center",
  },
  caloriesTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  viewReportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewReportText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  caloriesValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    height: 40,
  },
  caloriesFireIcon: {
    width: 30,
    height: 30,
    resizeMode: "contain",
    marginRight: 4,
  },
  caloriesNumWrap: {
    width: 80,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    lineHeight: 30,
  },
  caloriesSubWrap: {
    flex: 1,
    height: 30,
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingLeft: 4,
    marginLeft: 4,
  },
  caloriesLabel: {
    fontSize: 14,
    color: "#888",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#EEEEEE",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 4,
  },
  cardContainer: {
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingBottom: 8,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealType: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  mealTime: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  logFoodButton: {
    backgroundColor: "#28A745",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logFoodText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  loggedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28A745",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  loggedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  foodNameContainer: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  foodName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  nutrition_2: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
  },
  row: {
    alignItems: "center",
  },
  icon: {
    height: 21,
  },
  label: {
    fontSize: 10,
    color: "#666",
  },
  value: {
    fontSize: 10,
  },
  micronutrientsSection: {
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  micronutrientsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 4,
  },
  micronutrientsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  micronutrientsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  microItem: {
    alignItems: "center",
    flex: 1,
  },
  microValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  microLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
});
