import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCurrentDietPlanAPI,
  addClientDietAPI,
} from "../../../services/clientApi";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { showToast } from "../../../utils/Toaster";

const ACCENT = "#00BC7D";

const MEAL_IMAGES = {
  breakfast: require("../../../assets/images/diet/breakfast.webp"),
  lunch: require("../../../assets/images/diet/lunch.webp"),
  snacks: require("../../../assets/images/diet/snacks.webp"),
  dinner: require("../../../assets/images/diet/dinner.webp"),
};

const CATEGORY_MAP = {
  breakfast: {
    label: "Breakfast",
    time: "8:00 am - 9:30 am",
    image: "breakfast",
  },
  lunch: { label: "Lunch", time: "12:30 pm - 2:00 pm", image: "lunch" },
  snacks: {
    label: "Evening Snack",
    time: "4:00 pm - 5:30 pm",
    image: "snacks",
  },
  dinner: { label: "Dinner", time: "7:00 pm - 8:30 pm", image: "dinner" },
};

const MACRO_ICONS = [
  {
    key: "calories",
    label: "Calories",
    width: 13,
    icon: require("../../../assets/images/diet/calorie.png"),
  },
  {
    key: "protein",
    label: "Proteins",
    width: 22,
    icon: require("../../../assets/images/diet/protein.png"),
  },
  {
    key: "carbs",
    label: "Carbs",
    width: 22,
    icon: require("../../../assets/images/diet/carb.png"),
  },
  {
    key: "fat",
    label: "Fats",
    width: 17,
    icon: require("../../../assets/images/diet/fat.png"),
  },
];

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
      const mealName = items.map((i) => i.name).join(", ");

      // Aggregate nutrition from all items in this meal category
      const nutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        calcium: 0,
        sodium: 0,
        iron: 0,
        magnesium: 0,
        potassium: 0,
      };
      items.forEach((item) => {
        Object.keys(nutrition).forEach((k) => {
          nutrition[k] += Number(item[k]) || 0;
        });
      });

      meals.push({
        id: `${key}_${dayNum}`,
        category: meta.label,
        time: meta.time,
        meal: mealName,
        image: meta.image,
        nutrition,
        items,
      });
    });

    result[dayNum] = {
      meals,
      target_calories: dayData.target_calories || 0,
    };
  });

  return result;
};

const MealCard = ({ meal, onViewRecipe, onLogFood, isLogging, isLogged }) => {
  const [showMicros, setShowMicros] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;
  const n = meal.nutrition;

  const toggleMicros = () => {
    if (showMicros) {
      Animated.timing(animHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setShowMicros(false));
    } else {
      setShowMicros(true);
      Animated.timing(animHeight, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const microHeight = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  return (
    <View style={styles.cardContainer}>
      {/* Top: image + info + Log Food */}
      <View style={styles.topSection}>
        <Image
          source={MEAL_IMAGES[meal.image]}
          style={styles.foodImage}
          resizeMode="cover"
        />
        <View style={styles.mealInfo}>
          <Text style={styles.mealType}>{meal.category}</Text>
          <Text style={styles.mealTime}>{meal.time}</Text>
          <TouchableOpacity onPress={onViewRecipe}>
            <Text style={styles.viewRecipes}>View Recipes</Text>
          </TouchableOpacity>
        </View>
        {isLogged ? (
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
        <Text style={styles.foodName}>{meal.meal}</Text>
      </View>

      {/* Macros row */}
      <View style={styles.macrosRow}>
        {MACRO_ICONS.map((item) => (
          <View style={styles.macroItem} key={item.key}>
            <Image
              source={item.icon}
              style={[styles.macroIcon, { width: item.width }]}
            />
            <Text style={styles.macroValue}>{Math.round(n[item.key])}</Text>
            <Text style={styles.macroLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Collapsible Micros */}
      <TouchableOpacity
        style={styles.microsToggle}
        onPress={toggleMicros}
        activeOpacity={0.7}
      >
        <Text style={styles.microsToggleText}>View Macros & Micros</Text>
        <Ionicons
          name={showMicros ? "chevron-up" : "chevron-down"}
          size={16}
          color="#888"
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.microsContainer,
          { height: microHeight, overflow: "hidden" },
        ]}
      >
        {showMicros && (
          <View style={styles.microsRow}>
            {[
              { key: "fiber", label: "Fiber" },
              { key: "sugar", label: "Sugar" },
              { key: "calcium", label: "Calcium" },
              { key: "sodium", label: "Sodium" },
            ].map((micro) => (
              <View style={styles.microItem} key={micro.key}>
                <Text style={styles.microValue}>
                  {Math.round(n[micro.key])}{" "}
                  {micro.key === "fiber" || micro.key === "sugar" ? "g" : "mg"}
                </Text>
                <Text style={styles.microLabel}>{micro.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const SavedMeal = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);
  const [apiPlan, setApiPlan] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [followup, setFollowup] = useState(null);
  const [consumedCalories, setConsumedCalories] = useState(0);
  const [loggedMeals, setLoggedMeals] = useState({});
  const [loggingMealId, setLoggingMealId] = useState(null);
  const [calExpanded, setCalExpanded] = useState(true);
  const fadeLeft = useRef(new Animated.Value(0)).current;
  const fadeEaten = useRef(new Animated.Value(1)).current;
  const isSavingRef = useRef(false);
  const dayScrollRef = useRef(null);

  const hasParamPlan = !!params.plan;

  const paramPlanData = useMemo(() => {
    try {
      return JSON.parse(params.plan || "[]");
    } catch {
      return [];
    }
  }, [params.plan]);

  // Fetch from /current API. `silent` skips the loading/error UI for in-place refreshes.
  const fetchCurrent = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setApiLoading(true);
      setApiError(null);
    }
    try {
      const res = await getCurrentDietPlanAPI();

      if (res?.status === 200 && res?.has_plan && res?.latest_plan?.plan) {
        setApiPlan(res.latest_plan.plan);
        if (res?.followup) setFollowup(res.followup);
        setConsumedCalories(res?.latest_plan?.consumed_calories ?? 0);
      } else if (!silent && res?.status === 200 && !res?.has_plan) {
        setApiError("No diet plan found. Generate one first.");
      } else if (!silent) {
        setApiError("Failed to load your diet plan.");
      }
    } catch {
      if (!silent) setApiError("Something went wrong. Please try again.");
    } finally {
      if (!silent) setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasParamPlan) return;
    fetchCurrent();
  }, [hasParamPlan, fetchCurrent]);

  const planData = hasParamPlan ? paramPlanData : apiPlan || [];
  const mealsMap = useMemo(() => transformPlanToMeals(planData), [planData]);
  const dayCount = planData.length || 7;

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.replace("/client/home");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  const currentDayData = mealsMap[selectedDay];
  const meals = currentDayData?.meals || [];

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

  const logFood = async (meal) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setLoggingMealId(meal.id);

    try {
      const foodList = meal.items.map((f) => ({
        id: `${Date.now()}${Math.random()}`.replace(/\./g, ""),
        name: f.name || "Unknown Food",
        calories: Number(f.calories) || 0,
        protein: Number(f.protein) || 0,
        carbs: Number(f.carbs) || 0,
        fat: Number(f.fat) || 0,
        fiber: Number(f.fiber) || 0,
        sugar: Number(f.sugar) || 0,
        calcium: Number(f.calcium) || 0,
        magnesium: Number(f.magnesium) || 0,
        iron: Number(f.iron) || 0,
        sodium: Number(f.sodium) || 0,
        potassium: Number(f.potassium) || 0,
        quantity: "1 serving",
        image_url: "",
      }));

      const payload = {
        date: toIndianISOString(new Date()).split("T")[0],
        diet_data: [
          {
            title: meal.category,
            foodList,
            itemsCount: foodList.length,
          },
        ],
      };

      const response = await addClientDietAPI(payload);

      if (response?.status === 200) {
        setLoggedMeals((prev) => ({ ...prev, [meal.id]: true }));
        showToast({
          type: "success",
          title: "Success",
          desc: `${meal.category} logged successfully!`,
        });
        // Refetch current diet plan so today's consumed calories reflect the server's truth
        fetchCurrent({ silent: true });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error logging food",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      isSavingRef.current = false;
      setLoggingMealId(null);
    }
  };

  // Loading state when fetching from API
  if (apiLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/client/home")}
          >
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personalized AI Diet Plan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading your diet plan...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (apiError) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/client/home")}
          >
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personalized AI Diet Plan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={40} color="#ccc" />
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => router.replace("/client/home")}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/client/home")}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalized AI Diet Plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main scrollable content */}
      <ScrollView
        contentContainerStyle={styles.mealsContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Calories card */}
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
                      style={[styles.caloriesTitle, { opacity: fadeEaten }]}
                    >
                      Today's Calories Eaten
                    </Animated.Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/client/(diet)/report",
                        params: { from: "savedmeal" },
                      })
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
                  >
                    <View style={styles.viewReportRow}>
                      <Text style={styles.viewReportText}>View Report</Text>
                      <Feather name="arrow-right" size={13} color="#007AFF" />
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
                      style={[styles.caloriesLabel, { opacity: fadeEaten }]}
                    >
                      /{target} kcal eaten
                    </Animated.Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${pct}%` }]}
                  />
                </View>
              </TouchableOpacity>
            );
          })()}

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
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onViewRecipe={() =>
              router.push({
                pathname: "/client/(dietcoach)/recipe",
                params: {
                  mealName: meal.meal,
                  mealCategory: meal.category,
                  recipe: meal.items?.[0]?.recipe || "",
                  ingredients: meal.items?.[0]?.ingredients || "",
                },
              })
            }
            onLogFood={() => logFood(meal)}
            isLogging={loggingMealId === meal.id}
            isLogged={!!loggedMeals[meal.id]}
          />
        ))}
      </ScrollView>

      {/* Follow-up button */}
      {followup && !followup.series_complete && (
        <View
          style={[
            styles.followupContainer,
            { paddingBottom: insets.bottom + 20 },
          ]}
        >
          {followup.eligible ? (
            <TouchableOpacity
              style={styles.followupEligibleButton}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/client/(dietcoach)/followup",
                  params: {
                    next_step: String(followup.next_step),
                    next_step_label: followup.next_step_label,
                  },
                })
              }
            >
              <Ionicons name="refresh-outline" size={18} color="#fff" />
              <Text style={styles.followupEligibleText}>
                Start Your Follow-up
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.followupButton}>
              <Ionicons name="calendar-outline" size={18} color="#888" />
              <Text style={styles.followupText}>
                Your next follow-up is after {followup.days_until_eligible} day
                {followup.days_until_eligible !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default SavedMeal;

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
    paddingBottom: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 4,
  },
  dayChip: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    height: 30,
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
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 80,
  },
  // Card
  cardContainer: {
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
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
  viewRecipes: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "600",
    marginTop: 2,
  },
  logFoodButton: {
    backgroundColor: ACCENT,
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
    backgroundColor: ACCENT,
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
    marginBottom: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  foodName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  // Macros
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  macroItem: {
    alignItems: "center",
  },
  macroIcon: {
    height: 21,
  },
  macroValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  macroLabel: {
    fontSize: 10,
    color: "#666",
  },
  // Collapsible micros toggle
  microsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 4,
  },
  microsToggleText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  // Micros
  microsContainer: {},
  microsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingBottom: 12,
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
  // Loading & Error states
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 30,
  },
  goBackButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 8,
  },
  goBackText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Follow-up
  followupContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
  },
  followupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  followupText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  followupEligibleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  followupEligibleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  // Calories card
  caloriesCard: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
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
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
});
