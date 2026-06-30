import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  SectionList,
  Image,
  Animated,
  FlatList,
  Modal,
  BackHandler,
  TouchableWithoutFeedback,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Image as ExpoImage } from "expo-image";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

let Share;
if (Constants.executionEnvironment !== "storeClient") {
  Share = require("react-native-share").default;
} else {
  Share = null;
}

const { width, height } = Dimensions.get("window");
import { useFocusEffect } from "@react-navigation/native";
import { clientReportAPI, getClientDietAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import HardwareBackHandler from "../../../components/HardwareBackHandler";

import WorkoutCard from "../../../components/ui/Workout/WorkoutCard";
import { LinearGradient } from "expo-linear-gradient";
import DateNavigator from "../../../components/ui/DateNavigator";
import DietProgressTracker from "../../../components/ui/Home/progesspage/dietprogress";
import { useUser } from "../../../context/UserContext";
import { format } from "date-fns";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isPureFreemium } from "../../../config/access";
import PremiumBadge from "../../../components/ui/Payment/premiumbadge";
import FeedbackModal from "../../../components/ui/FeedbackModal";
import { MaskedText } from "../../../components/ui/MaskedText";

// Shareable Report Component
const ShareableReportView = React.forwardRef(
  (
    { report, selectedDate, dietTemplate, profilePic, userName, badge, xp },
    ref,
  ) => {
    const formatDate = (date) => {
      return format(new Date(date), "MMMM dd, yyyy");
    };

    const getChampionTitle = () => {
      // Use badge details if available
      const badgeDetails = report?.leaderboard?.badge;
      if (!badgeDetails) return "Champion";
      return (
        `${badgeDetails.badge_name || ""} ${badgeDetails.level || ""}`.trim() ||
        "Champion"
      );
    };

    const getTotalMacros = () => {
      let totalCalories = 0,
        totalProtein = 0,
        totalCarbs = 0,
        totalFat = 0,
        totalFiber = 0,
        totalSugar = 0;

      if (Array.isArray(dietTemplate)) {
        dietTemplate.forEach((category) => {
          if (Array.isArray(category?.foodList)) {
            category.foodList.forEach((food) => {
              totalCalories += food?.calories || 0;
              totalProtein += food?.protein || 0;
              totalCarbs += food?.carbs || 0;
              totalFat += food?.fat || 0;
              totalFiber += food?.fiber || 0;
              totalSugar += food?.sugar || 0;
            });
          }
        });
      }

      return {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        totalSugar,
      };
    };

    const macros = getTotalMacros();

    return (
      <View ref={ref} style={shareStyles.container}>
        {/* Header with Profile and Leaderboard */}
        <View style={shareStyles.header}>
          <View style={shareStyles.profileSection}>
            <ExpoImage
              source={profilePic}
              style={shareStyles.profilePic}
              contentFit="cover"
            />
            <Text style={shareStyles.userName}>{userName || "User"}</Text>
          </View>
          {report?.leaderboard?.xp || xp ? (
            <View style={shareStyles.leaderboardSection}>
              <View>
                <View style={shareStyles.xpContainer}>
                  <Text style={shareStyles.xpText}>
                    {report?.leaderboard?.xp || xp || "0"} XP
                  </Text>
                </View>
              </View>
              <View>
                <View style={shareStyles.badgeContainer}>
                  <ExpoImage
                    source={
                      report?.leaderboard?.badge?.image_url
                        ? { uri: report.leaderboard.badge.image_url }
                        : null
                    }
                    style={shareStyles.badgeImage}
                    contentFit="cover"
                  />
                </View>
                <Text style={shareStyles.championText}>
                  {getChampionTitle()}
                </Text>
              </View>
            </View>
          ) : (
            ""
          )}
        </View>

        {/* Diet Report Heading */}
        <Text style={shareStyles.dietReportTitle}>
          Diet Log for {formatDate(selectedDate)}
        </Text>

        

        {/* Calories Section */}
        <View style={shareStyles.caloriesBox}>
          <View style={shareStyles.caloriesContent}>
            <ExpoImage
              source={require("../../../assets/images/calories.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <Text style={shareStyles.caloriesValue}>
              {report?.client_actual?.calories?.actual ||
                Math.round(macros.totalCalories)}
            </Text>
            <Text style={shareStyles.caloriesTarget}>
              / {report?.client_actual?.calories?.target || "NA"} Kcal
            </Text>
          </View>
          <Text style={{ textAlign: "center" }}>Calories</Text>
        </View>

        {/* First Row - Protein, Carbs, Fat */}
        <View style={shareStyles.macrosRow}>
          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/protein.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={shareStyles.macroValue}>
                  {report?.client_actual?.protein?.actual ||
                    Math.round(macros.totalProtein)}
                </Text>
                <Text style={shareStyles.macroTarget}>
                  / {report?.client_actual?.protein?.target || "NA"}g
                </Text>
              </View>
              <Text style={shareStyles.macroLabel}>Protein</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/carb.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={shareStyles.macroValue}>
                  {report?.client_actual?.carbs?.actual ||
                    Math.round(macros.totalCarbs)}
                </Text>
                <Text style={shareStyles.macroTarget}>
                  / {report?.client_actual?.carbs?.target || "NA"}g
                </Text>
              </View>
              <Text style={shareStyles.macroLabel}>Carbs</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/fat.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={shareStyles.macroValue}>
                  {report?.client_actual?.fat?.actual ||
                    Math.round(macros.totalFat)}
                </Text>
                <Text style={shareStyles.macroTarget}>
                  / {report?.client_actual?.fat?.target || "NA"}g
                </Text>
              </View>
              <Text style={shareStyles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Second Row - Fiber, Sugar, Total Foods */}
        <View style={shareStyles.macrosRow}>
          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/fiber.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={shareStyles.macroValue}>
                  {report?.client_actual?.fiber?.actual ||
                    Math.round(macros.totalFiber)}
                </Text>
                <Text style={shareStyles.macroTarget}>
                  / {report?.client_actual?.fiber?.target || "NA"}g
                </Text>
              </View>
              <Text style={shareStyles.macroLabel}>Fiber</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/sugar.png")}
              style={[shareStyles.macroIcon, { width: 28 }]}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={shareStyles.macroValue}>
                  {report?.client_actual?.sugar?.actual ||
                    Math.round(macros.totalSugar)}
                </Text>
                <Text style={shareStyles.macroTarget}>
                  / {report?.client_actual?.sugar?.target || "NA"}g
                </Text>
              </View>
              <Text style={shareStyles.macroLabel}>Sugar</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/diet/streak.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <Text style={shareStyles.macroValue}>
                {report?.diet_streak?.current_streak ||
                  dietTemplate?.reduce(
                    (total, category) =>
                      total + (category.foodList?.length || 0),
                    0,
                  )}
              </Text>
              <Text style={shareStyles.macroLabel}>
                {report?.diet_streak?.current_streak
                  ? "Diet Streak"
                  : "Foods Logged"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={shareStyles.footer}>
          <View style={shareStyles.footerLeft}>
            <ExpoImage
              source={require("../../../assets/images/footer.png")}
              style={shareStyles.footerLogo}
              contentFit="contain"
            />
          </View>
        </View>
      </View>
    );
  },
);

const myListedFoodLogs = (props) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { gender } = params;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [report, setReport] = useState(null);
  const [consumedFoods, setConsumedFoods] = useState([]);
  const [dietTemplate, setDietTemplate] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [expandedFoodList, setExpandedFoodList] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false); // Set to true for testing
  const [targetCalories, setTargetCalories] = useState(0);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const shareViewRef = useRef();
  const insets = useSafeAreaInsets();

  const { scrollEventThrottle, onScroll, headerHeight } = props;

  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();

  const {
    xp,
    profile,
    plan,
    progress,
    badge,
    tag,
    gymDetails,
    sideBarData,
    fetchUserData,
    loading: userLoading,
    userType,
    registrationSteps,
  } = useUser();

  // Function to stop voice playback when modal closes
  const stopVoiceAndCloseModal = () => {
    Speech.stop(); // Stop any ongoing voice playback
    setShowTargetModal(false);
  };

  const nutritionColors = {
    calories: "#FF5757",
    protein: "#4CAF50",
    carbs: "#2196F3",
    fat: "#FFC107",
    fiber: "#8BC34A",
    sugar: "#FF9800",
  };

  const nutrients = [
    {
      label: "Calories",
      icon: require("../../../assets/images/diet/calorie.png"),
    },
    {
      label: "Proteins",
      icon: require("../../../assets/images/diet/protein.png"),
    },
    {
      label: "Carbs",
      icon: require("../../../assets/images/diet/carb.png"),
    },
    {
      label: "Fats",
      icon: require("../../../assets/images/diet/fat.png"),
    },
    {
      label: "Fiber",
      icon: require("../../../assets/images/diet/fiber.png"),
    },
    {
      label: "Sugar",
      icon: require("../../../assets/images/diet/sugar.png"),
    },
  ];

  const showDate = (event, selected) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selected) {
      setSelectedDate(selected);
      if (Platform.OS === "ios") {
        setShowDatePicker(false);
      }
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowDatePicker(false);
    }
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    if (newDate > today) return;

    setSelectedDate(newDate);
  };

  const selectDayFromStrip = (date) => {
    setSelectedDate(date);
  };

  const calculateWidth = (value, max) => {
    if (!value || !max) return 0;
    return Math.min((value / max) * 100, 100);
  };

  const renderProgressBar = (consumed, target, color) => {
    const percentage = calculateWidth(consumed, target);
    return (
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    );
  };

  const getReportDetails = async () => {
    const dateString = toIndianISOString(selectedDate);
    const clientId = await AsyncStorage.getItem("client_id");
    setIsLoading(true);
    try {
      const response = await clientReportAPI(
        clientId,
        dateString?.split("T")[0],
      );
      if (response?.status === 200) {
        setReport(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Could not fetch report data",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const fetchTodayDiet = async () => {
    const clientId = await AsyncStorage.getItem("client_id");
    try {
      const response = await getClientDietAPI(
        clientId,
        toIndianISOString(selectedDate).split("T")[0],
      );

      if (response?.status === 200) {
        setDietTemplate(response?.data || []);
        setProgressData(response?.progress || null);

        setConsumedFoods(response?.data || []);

        // Check if we need to trigger voice based on the response
        if (response?.play_voice_success) {
          // Play voice immediately when API response has play_voice_success flag
          try {
            setTimeout(() => {
              Speech.speak("Food logged successfully!", {
                voice:
                  Platform.OS === "ios"
                    ? "com.apple.ttsbundle.siri_female_en-US_compact"
                    : "en-us-x-tpc-network",
                language: "en-US",
                pitch: 1.0,
                rate: 1,
                volume: 1.0,
              });
            }, 1000); // 1 second delay to ensure voice plays after modal processing
          } catch (error) {
            console.error(
              "VOICE_DEBUG: Error playing voice from API response:",
              error,
            );
          }

          // Also store voice flag for modal trigger as backup
          try {
            AsyncStorage.setItem("play_voice_flag", "true");
          } catch (e) {}
        } else {
          try {
            AsyncStorage.removeItem("play_voice_flag");
          } catch (e) {}
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Could not fetch diet data",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openMealModal = (meal) => {
    // Check premium/guest access before opening add food modal
    if (isPureFreemium(plan)) {
      if (Platform.OS === "ios") {
        setPremiumModalVisible(true);
      } else {
        router.push("/client/subscription");
      }
      return;
    } else if (userType === "guest") {
      setGuestModalVisible(true);
      return;
    }

    setSelectedMeal(meal);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedMeal(null);
  };

  const handleScanFoodOption = () => {
    closeModal();
    router.push({
      pathname: "/client/(diet)/foodscanner",
      params: {
        selectedMeal: JSON.stringify(selectedMeal),
        template: JSON.stringify(dietTemplate),
      },
    });
  };

  const handleChatbotOption = () => {
    closeModal();
    router.push({
      pathname: "/client/(workout)/kyraAI",
      params: {
        profileImage: profile,
        selectedMeal: JSON.stringify(selectedMeal.title),
        userName: sideBarData?.userName,
        source: "foodlog",
      },
    });
  };

  const toggleMealExpansion = (mealId) => {
    setExpandedMeal(expandedMeal === mealId ? null : mealId);
  };

  // Share functionality functions
  const handlePreview = async () => {
    try {
      // Always fetch fresh report data for sharing to get latest leaderboard info
      const clientId = await AsyncStorage.getItem("client_id");
      const dateString = toIndianISOString(selectedDate);
      const reportResponse = await clientReportAPI(
        clientId,
        dateString?.split("T")[0],
      );

      if (reportResponse?.status === 200) {
        setReport(reportResponse?.data);
      }

      setShowPreviewModal(true);
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to prepare share preview",
      });
    }
  };

  const handleShare = async () => {
    try {
      setIsGeneratingShare(true);

      // Capture the view as image
      const uri = await captureRef(shareViewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const shareMessage = `Start your Fitness journey with Fymble Now!

📱 Download Fymble App: https://fymble.app/download`;

      setIsGeneratingShare(false);
      setShowPreviewModal(false);

      const shareOptions = {
        title: "My Diet Log - Fymble",
        message: shareMessage,
        url: `file://${uri}`,
        filename: "diet-log.png",
      };

      try {
        const result = await Share.open(shareOptions);

        if (result.success) {
          showToast({
            type: "success",
            title: "Shared Successfully",
            desc: "Your diet log has been shared!",
          });
        }
      } catch (shareError) {
        if (shareError.message === "User did not share") {
          return;
        }

        // Fallback to Expo sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your diet log",
          });

          showToast({
            type: "success",
            title: "Shared Successfully",
            desc: "Your diet log has been shared!",
          });
        } else {
          throw new Error("No sharing method available");
        }
      }
    } catch (error) {
      setIsGeneratingShare(false);
      setShowPreviewModal(false);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to share diet log",
      });
    }
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  const renderMealSection = useCallback(
    ({ item }) => {
      const isExpanded = expandedMeal === item.id;
      const hasFood = item.foodList.length > 0;

      return (
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <View style={styles.mealInfo}>
              <Text style={styles.mealTitle}>{item.title}</Text>
              <Text style={styles.mealTagline}>{item.tagline}</Text>
              <Text style={styles.mealTime}>{item.timeRange}</Text>
            </View>
            {/* Buttons Container */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                style={styles.addFoodButton}
                onPress={() => openMealModal(item)}
              >
                <LinearGradient
                  colors={["#28A745", "#007BFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Add Food</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Food Items Section */}
          {hasFood && (
            <View style={styles.foodSection}>
              {/* First food - always visible */}
              <View style={styles.foodItemCard}>
                <View style={styles.foodItemHeader}>
                  <View style={styles.foodItemLeft}>
                    <Text style={styles.foodItemName}>
                      {item.foodList[0].name}
                    </Text>
                    <Text style={styles.foodQuantity}>
                      Qty: {item.foodList[0].quantity}
                    </Text>
                  </View>
                  {item.foodList.length > 1 && (
                    <TouchableOpacity
                      style={styles.expandFoodButton}
                      onPress={() => toggleMealExpansion(item.id)}
                    >
                      <Text style={styles.moreItemsText}>
                        {isExpanded
                          ? `Hide ${item.foodList.length - 1} more`
                          : `+${item.foodList.length - 1} more`}
                      </Text>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#666"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* First food macros */}
                <View style={styles.foodMacroRow}>
                  {nutrients.map((nutrient, idx) => {
                    let value;
                    const food = item.foodList[0];
                    switch (nutrient.label) {
                      case "Calories":
                        value = Math.round(food.calories || 0);
                        break;
                      case "Proteins":
                        value = Math.round(food.protein || 0);
                        break;
                      case "Carbs":
                        value = Math.round(food.carbs || 0);
                        break;
                      case "Fats":
                        value = Math.round(food.fat || 0);
                        break;
                      case "Fiber":
                        value = Math.round(food.fiber || 0);
                        break;
                      case "Sugar":
                        value = Math.round(food.sugar || 0);
                        break;
                      case "Calcium":
                        value = Math.round(food.calcium || 0);
                        break;
                      case "Magnesium":
                        value = Math.round(food.magnesium || 0);
                        break;
                      case "Sodium":
                        value = Math.round(food.sodium || 0);
                        break;
                      case "Potassium":
                        value = Math.round(food.potassium || 0);
                        break;
                      case "Iron":
                        value = Math.round(food.iron || 0);
                        break;
                      default:
                        value = 0;
                    }

                    return (
                      <View key={idx} style={styles.foodMacroItem}>
                        <View style={styles.macroIconContainer}>
                          <Image
                            source={nutrient.icon}
                            style={[
                              styles.macroIcon,
                              {
                                width:
                                  nutrient.label === "Calories"
                                    ? 10
                                    : nutrient.label === "Fats"
                                      ? 14
                                      : nutrient.label === "Fiber"
                                        ? 22
                                        : nutrient.label === "Sugar"
                                          ? 18
                                          : 16,
                                height: nutrient.label === "Fats" ? 18 : 16,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.macroLabel}>{nutrient.label}</Text>
                        <Text style={styles.macroValue}>{value}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* Micronutrients Row */}
                <View style={styles.micronutrientsSection}>
                  <View style={styles.micronutrientsHeader}>
                    <Text style={styles.micronutrientsTitle}>
                      Micro Nutrients
                    </Text>
                    <View style={styles.micronutrientsDivider} />
                  </View>
                  <View style={styles.micronutrientsRow}>
                    <View style={styles.microItem}>
                      <Text style={styles.microValue}>
                        {Math.round(item.foodList[0].calcium || 0)}mg
                      </Text>
                      <Text style={styles.microLabel}>Calcium</Text>
                    </View>
                    <View style={styles.microItem}>
                      <Text style={styles.microValue}>
                        {Math.round(item.foodList[0].magnesium || 0)}mg
                      </Text>
                      <Text style={styles.microLabel}>Magnesium</Text>
                    </View>
                    <View style={styles.microItem}>
                      <Text style={styles.microValue}>
                        {Math.round(item.foodList[0].sodium || 0)}mg
                      </Text>
                      <Text style={styles.microLabel}>Sodium</Text>
                    </View>
                    <View style={styles.microItem}>
                      <Text style={styles.microValue}>
                        {Math.round(item.foodList[0].potassium || 0)}mg
                      </Text>
                      <Text style={styles.microLabel}>Potassium</Text>
                    </View>
                    <View style={styles.microItem}>
                      <Text style={styles.microValue}>
                        {Math.round(item.foodList[0].iron || 0)}mg
                      </Text>
                      <Text style={styles.microLabel}>Iron</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Additional foods - shown when expanded */}
              {isExpanded &&
                (item?.foodList || []).slice(1).map((food, index) => (
                  <View key={index + 1} style={styles.foodItemCard}>
                    <View style={styles.foodItemHeader}>
                      <View style={styles.foodItemLeft}>
                        <Text style={styles.foodItemName}>{food.name}</Text>
                        <Text style={styles.foodQuantity}>
                          Qty: {food.quantity}
                        </Text>
                      </View>
                    </View>

                    {/* Individual food macros */}
                    <View style={styles.foodMacroRow}>
                      {nutrients.map((nutrient, idx) => {
                        let value;
                        switch (nutrient.label) {
                          case "Calories":
                            value = Math.round(food.calories || 0);
                            break;
                          case "Proteins":
                            value = Math.round(food.protein || 0);
                            break;
                          case "Carbs":
                            value = Math.round(food.carbs || 0);
                            break;
                          case "Fats":
                            value = Math.round(food.fat || 0);
                            break;
                          case "Fiber":
                            value = Math.round(food.fiber || 0);
                            break;
                          case "Sugar":
                            value = Math.round(food.sugar || 0);
                            break;
                          case "Calcium":
                            value = Math.round(food.calcium || 0);
                            break;
                          case "Magnesium":
                            value = Math.round(food.magnesium || 0);
                            break;
                          case "Sodium":
                            value = Math.round(food.sodium || 0);
                            break;
                          case "Potassium":
                            value = Math.round(food.potassium || 0);
                            break;
                          case "Iron":
                            value = Math.round(food.iron || 0);
                            break;
                          default:
                            value = 0;
                        }

                        return (
                          <View key={idx} style={styles.foodMacroItem}>
                            <View style={styles.macroIconContainer}>
                              <Image
                                source={nutrient.icon}
                                style={[
                                  styles.macroIcon,
                                  {
                                    width:
                                      nutrient.label === "Calories"
                                        ? 10
                                        : nutrient.label === "Fats"
                                          ? 14
                                          : nutrient.label === "Fiber"
                                            ? 22
                                            : nutrient.label === "Sugar"
                                              ? 18
                                              : 16,
                                    height: nutrient.label === "Fats" ? 18 : 16,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={styles.macroLabel}>
                              {nutrient.label}
                            </Text>
                            <Text style={styles.macroValue}>{value}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Micronutrients Row */}
                    <View style={styles.micronutrientsSection}>
                      <View style={styles.micronutrientsHeader}>
                        <Text style={styles.micronutrientsTitle}>
                          Micro Nutrients
                        </Text>
                        <View style={styles.micronutrientsDivider} />
                      </View>
                      <View style={styles.micronutrientsRow}>
                        <View style={styles.microItem}>
                          <Text style={styles.microValue}>
                            {Math.round(food.calcium || 0)}mg
                          </Text>
                          <Text style={styles.microLabel}>Calcium</Text>
                        </View>
                        <View style={styles.microItem}>
                          <Text style={styles.microValue}>
                            {Math.round(food.magnesium || 0)}mg
                          </Text>
                          <Text style={styles.microLabel}>Magnesium</Text>
                        </View>
                        <View style={styles.microItem}>
                          <Text style={styles.microValue}>
                            {Math.round(food.sodium || 0)}mg
                          </Text>
                          <Text style={styles.microLabel}>Sodium</Text>
                        </View>
                        <View style={styles.microItem}>
                          <Text style={styles.microValue}>
                            {Math.round(food.potassium || 0)}mg
                          </Text>
                          <Text style={styles.microLabel}>Potassium</Text>
                        </View>
                        <View style={styles.microItem}>
                          <Text style={styles.microValue}>
                            {Math.round(food.iron || 0)}mg
                          </Text>
                          <Text style={styles.microLabel}>Iron</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
      );
    },
    [expandedMeal, nutrients, openMealModal, toggleMealExpansion],
  );

  // Handle target and feedback modals from params - Target has priority
  useEffect(() => {
    // Debug: Log params and modal trigger conditions

    // Check for voice flag from API response (backup trigger)
    const checkVoiceFlagAndShowModal = async () => {
      let shouldPlayVoice = false;
      try {
        const voiceFlag = await AsyncStorage.getItem("play_voice_flag");
        if (voiceFlag === "true") {
          shouldPlayVoice = true;
          await AsyncStorage.removeItem("play_voice_flag"); // Clear after reading
        }
      } catch (e) {}

      // Target modal has first priority
      if (params?.showTarget === "true" || shouldPlayVoice) {
        setTimeout(() => {
          setTargetCalories(
            params?.targetCalories || progressData?.calories?.target || 0,
          );
          setShowTargetModal(true);

          // Play voice when target modal is shown with comprehensive error handling and fallbacks
          try {
            const voiceMessage = "Food logged successfully!";
            const voiceConfigs = [
              // Default configuration
              {
                voice:
                  Platform.OS === "ios"
                    ? "com.apple.ttsbundle.siri_female_en-US_compact"
                    : "en-us-x-tpc-network",
                language: "en-US",
                pitch: 1.0,
                rate: 1,
                volume: 1.0,
              },
              // Fallback configuration
              {
                language: "en-US",
                pitch: 1.0,
                rate: 1,
                volume: 1.0,
              },
            ];

            // Try default config first
            const speakPromise = Speech.speak(voiceMessage, voiceConfigs[0]);

            if (speakPromise && typeof speakPromise.then === "function") {
              speakPromise
                .then(() => {})
                .catch((error) => {
                  console.error(
                    "VOICE_DEBUG: Modal - Voice speak failed, trying fallback:",
                    error,
                  );
                  // Try fallback configuration
                  setTimeout(() => {
                    Speech.speak(voiceMessage, voiceConfigs[1]);
                  }, 500);
                });
            } else {
            }
          } catch (error) {
            console.error(
              "VOICE_DEBUG: Modal - Error in voice speech execution:",
              error,
            );
            // Try fallback without any config
            try {
              setTimeout(() => {
                Speech.speak(voiceMessage, { language: "en-US", volume: 1.0 });
              }, 500);
            } catch (fallbackError) {
              console.error(
                "VOICE_DEBUG: Modal - Fallback voice also failed:",
                fallbackError,
              );
            }
          }
        }, 500);
      }
      // Only show feedback if target is not shown
      else if (params?.showFeedback === "true") {
        setTimeout(() => {
          setShowFeedbackModal(true);
        }, 500);
      } else {
      }
    };

    checkVoiceFlagAndShowModal();
  }, [params?.showFeedback, params?.showTarget, params?.targetCalories]);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        await fetchTodayDiet();
      };
      fetchData();
    }, [selectedDate]),
  );

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.push({
          pathname: "/client/diet",
          params: { selectedTab: "+Add" },
        });
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => {
        backHandler.remove();
      };
    }, []),
  );

  if (isLoading) {
    return (
      <View style={styles.sectionContainer}>
        {/* Back Button */}
        <View
          style={[
            styles.backButtonContainer,
            { paddingTop: insets.top + 10, paddingHorizontal: width * 0.04 },
          ]}
        >
          <View style={skeletonStyles.skeletonBackButton} />
        </View>

        {/* Date Navigator Skeleton */}
        <View style={styles.templateContainer}>
          <View style={[styles.dateDisplay]}>
            <View style={skeletonStyles.skeletonDateNavigator} />
          </View>

          {/* Diet Progress Tracker Skeleton */}
          <View style={skeletonStyles.skeletonProgressCard}>
            <View style={skeletonStyles.skeletonProgressHeader} />
            <View style={skeletonStyles.skeletonProgressRow}>
              <View style={skeletonStyles.skeletonProgressItem} />
              <View style={skeletonStyles.skeletonProgressItem} />
              <View style={skeletonStyles.skeletonProgressItem} />
            </View>
            <View style={skeletonStyles.skeletonProgressRow}>
              <View style={skeletonStyles.skeletonProgressItem} />
              <View style={skeletonStyles.skeletonProgressItem} />
              <View style={skeletonStyles.skeletonProgressItem} />
            </View>
          </View>

          {/* Meal Sections Skeleton */}
          {[1, 2].map((item) => (
            <View key={item} style={skeletonStyles.skeletonMealCard}>
              {/* Meal Header */}
              <View style={skeletonStyles.skeletonMealHeader}>
                <View style={{ flex: 1 }}>
                  <View style={skeletonStyles.skeletonMealTitle} />
                  <View style={skeletonStyles.skeletonMealSubtitle} />
                  <View style={skeletonStyles.skeletonMealTime} />
                </View>
                <View style={skeletonStyles.skeletonAddButton} />
              </View>

              {/* Food Item Skeleton */}
              <View style={skeletonStyles.skeletonFoodItem}>
                <View style={skeletonStyles.skeletonFoodName} />
                <View style={skeletonStyles.skeletonFoodQty} />

                {/* Macros Row */}
                <View style={skeletonStyles.skeletonMacrosRow}>
                  {[1, 2, 3, 4, 5, 6].map((macro) => (
                    <View key={macro} style={skeletonStyles.skeletonMacroItem}>
                      <View style={skeletonStyles.skeletonMacroIcon} />
                      <View style={skeletonStyles.skeletonMacroLabel} />
                      <View style={skeletonStyles.skeletonMacroValue} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Target Achievement Modal - At root level */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTargetModal}
        onRequestClose={stopVoiceAndCloseModal}
      >
        <View style={styles.achievementOverlay}>
          <View style={styles.achievementContent}>
            <TouchableOpacity
              style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}
              onPress={stopVoiceAndCloseModal}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Image
              source={require("../../../assets/images/modal/diet.webp")}
              style={styles.achievementImage}
              contentFit="contain"
            />

            <View style={styles.achievementTitleContainer}>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text="Great job!"
                textStyle={styles.achievementTitleText}
              >
                Great job!
              </MaskedText>
            </View>

            <View style={styles.achievementSubtitleContainer}>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text="You've hit your daily diet goal!"
                textStyle={styles.achievementSubtitleText}
              >
                You've hit your daily diet goal!
              </MaskedText>
            </View>

            <View style={styles.achievementTextContainer}>
              <Text style={styles.achievementText}>You've consumed </Text>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text={`${Math.round(progressData?.calories?.target)}`}
                textStyle={styles.achievementAmount}
              >
                {Math.round(progressData?.calories?.target)}
              </MaskedText>
              <Text style={styles.achievementText}>kcal today</Text>
            </View>

            <Text style={styles.achievementSubtext}>
              Stay consistent — your body's loving the progress
            </Text>
          </View>
        </View>
      </Modal>

      <View style={[styles.sectionContainer, { paddingBottom: insets.bottom }]}>
        {/* Date Picker Modal - Positioned at root level for proper z-index */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={showDate}
              themeVariant="light"
              textColor="#000000"
              maximumDate={today}
              style={Platform.OS === "ios" ? styles.iosDatePicker : {}}
            />
            {Platform.OS === "ios" && (
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.cancelButton]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.confirmButton]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.backButtonContainer,
            {
              paddingTop: insets.top + 10,
              paddingHorizontal: width * 0.04,
              paddingBottom: width * 0.02,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            },
          ]}
          onPress={() => {
            router.push("/client/diet");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backButtonText}>Diet</Text>
          <View style={styles.headerRight} />
        </TouchableOpacity>

        {/* Date Navigator */}

        {/* Diet Template Sections */}
        <FlatList
          data={dietTemplate}
          keyExtractor={(item) => item.id}
          renderItem={renderMealSection}
          ListHeaderComponent={
            <>
              <View style={styles.dateDisplay}>
                <DateNavigator
                  selectedDate={selectedDate}
                  today={new Date()}
                  navigateDate={navigateDate}
                  setShowDatePicker={setShowDatePicker}
                  selectDayFromStrip={selectDayFromStrip}
                />
              </View>

              {/* Diet Progress Tracker */}
              {progressData && (
                <DietProgressTracker
                  calories={{
                    actual: Math.round(progressData?.calories?.actual) || 0,
                    target: progressData?.calories?.target || 0,
                  }}
                  carbs={{
                    actual: Math.round(progressData?.carbs?.actual) || 0,
                    target: progressData?.carbs?.target || 0,
                  }}
                  protein={{
                    actual: Math.round(progressData?.protein?.actual) || 0,
                    target: progressData?.protein?.target || 0,
                  }}
                  fat={{
                    actual: Math.round(progressData?.fat?.actual) || 0,
                    target: progressData?.fat?.target || 0,
                  }}
                  fiber={{
                    actual: Math.round(progressData?.fiber?.actual) || 0,
                    target: progressData?.fiber?.target || 0,
                  }}
                  sugar={{
                    actual: Math.round(progressData?.sugar?.actual) || 0,
                    target: progressData?.sugar?.target || 0,
                  }}
                  calcium={Math.round(progressData?.calcium?.actual) || 0}
                  magnesium={Math.round(progressData?.magnesium?.actual) || 0}
                  sodium={Math.round(progressData?.sodium?.actual) || 0}
                  potassium={Math.round(progressData?.potassium?.actual) || 0}
                  iron={Math.round(progressData?.iron?.actual) || 0}
                />
              )}
            </>
          }
          style={styles.templateContainer}
          contentContainerStyle={styles.flatListContainer}
          initialNumToRender={5}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={true}
        />

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={[styles.modalOverlay]}>
            <View
              style={[styles.modalContent, { paddingBottom: insets.bottom }]}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                // style={styles.addButtonGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Add Food to {selectedMeal?.title}
                  </Text>
                  <TouchableOpacity
                    onPress={closeModal}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Share Preview Modal */}
        <Modal
          visible={showPreviewModal}
          transparent={true}
          animationType="slide"
        >
          <View style={shareStyles.modalContainer}>
            <View style={shareStyles.modalContent}>
              {/* Modal Header */}
              <View style={shareStyles.modalHeader}>
                <Text style={shareStyles.modalHeaderTitle}>Share Preview</Text>
                <TouchableOpacity
                  style={shareStyles.closeButton}
                  onPress={handleClosePreview}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Preview Content */}
              <ScrollView
                style={shareStyles.previewScrollView}
                showsVerticalScrollIndicator={false}
              >
                <ShareableReportView
                  key={toIndianISOString(selectedDate)}
                  ref={shareViewRef}
                  report={report}
                  selectedDate={selectedDate}
                  dietTemplate={dietTemplate}
                  profilePic={profile || sideBarData?.profilePic}
                  userName={sideBarData?.userName || sideBarData?.name}
                  badge={report?.leaderboard?.badge_details?.image_url || badge}
                  xp={report?.leaderboard?.xp || xp}
                />
              </ScrollView>

              {/* Modal Actions */}
              <View style={shareStyles.modalActions}>
                <TouchableOpacity
                  style={[shareStyles.actionButton, shareStyles.cancelButton]}
                  onPress={handleClosePreview}
                >
                  <Ionicons name="close" size={18} color="white" />
                  <Text style={shareStyles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[shareStyles.actionButton, shareStyles.shareButton]}
                  onPress={handleShare}
                  disabled={isGeneratingShare}
                >
                  <Ionicons name="share-social" size={18} color="white" />
                  <Text style={shareStyles.actionButtonText}>
                    {isGeneratingShare ? "Sharing..." : "Share"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Loading Overlay */}
              {isGeneratingShare && (
                <View style={shareStyles.loadingOverlay}>
                  <Ionicons name="hourglass" size={30} color="#007BFF" />
                  <Text style={shareStyles.loadingText}>
                    Generating image...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Floating Action Button for Share - Only for premium users */}
        {!isPureFreemium(plan) && userType !== "guest" && (
          <TouchableOpacity
            style={[
              styles.floatingActionButton,
              { bottom: 30 + insets.bottom },
            ]}
            onPress={handlePreview}
          >
            <LinearGradient
              colors={["#007BFF", "#28A745"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.floatingButtonGradient}
            >
              <Ionicons name="share-social" size={24} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Feedback Modal */}
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />

        {/* Premium Modal for iOS */}
        <Modal
          visible={premiumModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPremiumModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setPremiumModalVisible(false)}
          >
            <View style={styles.premiumModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.premiumModalContent}>
                  <PremiumBadge size={30} />
                  <Text style={styles.premiumModalText}>
                    This feature requires a Premium subscription
                  </Text>
                  <TouchableOpacity
                    style={styles.premiumModalButton}
                    onPress={() => setPremiumModalVisible(false)}
                  >
                    <Text style={styles.premiumModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Guest Modal */}
        <Modal
          visible={guestModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setGuestModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setGuestModalVisible(false)}>
            <View style={styles.premiumModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.premiumModalContent}>
                  <Text
                    style={[styles.premiumModalText, { fontWeight: "bold" }]}
                  >
                    Finish Setting Up Your Account to Access This Feature
                  </Text>
                  <TouchableOpacity
                    style={styles.premiumModalButton}
                    onPress={() => {
                      setGuestModalVisible(false);
                      let pathname = "/register/age-selector";

                      if (registrationSteps) {
                        if (!registrationSteps.dob) {
                          pathname = "/register/age-selector";
                        } else if (
                          registrationSteps.dob &&
                          !registrationSteps.goal
                        ) {
                          pathname = "/register/seventh-step";
                        } else if (
                          registrationSteps.dob &&
                          registrationSteps.goal &&
                          !registrationSteps.height
                        ) {
                          pathname = "/register/fourth-step";
                        } else if (
                          registrationSteps.dob &&
                          registrationSteps.goal &&
                          registrationSteps.height &&
                          !registrationSteps.weight
                        ) {
                          pathname = "/register/fifth-step";
                        } else if (
                          registrationSteps.dob &&
                          registrationSteps.goal &&
                          registrationSteps.height &&
                          registrationSteps.weight &&
                          !registrationSteps.body_shape
                        ) {
                          pathname = "/register/body-shape-current";
                        } else if (
                          registrationSteps.dob &&
                          registrationSteps.goal &&
                          registrationSteps.height &&
                          registrationSteps.weight &&
                          registrationSteps.body_shape &&
                          !registrationSteps.lifestyle
                        ) {
                          pathname = "/register/sixth-step";
                        }
                      }

                      router.push({
                        pathname,
                        params: {
                          tab: "My Progress",
                          gender: gender || "male",
                        },
                      });
                    }}
                  >
                    <Text style={styles.premiumModalButtonText}>
                      Complete Profile
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </>
  );
};

// Share styles
const shareStyles = StyleSheet.create({
  container: {
    width: 380,
    backgroundColor: "white",
    overflow: "hidden",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  leaderboardSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  rankLabel: {
    fontSize: 12,
    color: "#666",
  },
  leaderboardText: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(40,155,217,0.2)",
    borderRadius: 8,
    paddingVertical: 3,
    paddingTop: 6,
    marginLeft: 2,
  },
  badgeImage: {
    width: 40,
    height: 50,
    marginBottom: 4,
  },
  xpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginRight: 10,
  },
  championText: {
    fontSize: 8,
    color: "#666",
  },
  dietReportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 25,
    marginBottom: 5,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  dietReportImage: {
    width: 360,
    height: 160,
  },
  caloriesBox: {
    backgroundColor: "#F8F9FA",
    marginTop: -10,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    width: "50%",
    margin: "auto",
  },
  caloriesContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  caloriesValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginLeft: 8,
  },
  caloriesTarget: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  macroBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    paddingVertical: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    flexDirection: "row",
    alignItems: "center",
  },
  macroInside: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  macroIcon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 5,
  },
  macroTarget: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  macroLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    marginTop: 5,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  footerLogo: {
    width: 330,
    height: 50,
    marginRight: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 0,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "90%",
  },
  previewScrollView: {
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    marginHorizontal: 5,
  },
  shareButton: {
    backgroundColor: "#007BFF",
  },
  cancelButton: {
    backgroundColor: "#6C757D",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginTop: 10,
  },
});

export default myListedFoodLogs;

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 0,
  },
  backButtonText: {
    fontSize: 16,

    fontWeight: "500",
  },
  headerRight: {
    width: 30,
  },
  templateContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  flatListContainer: {
    paddingBottom: 20,
  },
  mealSection: {
    backgroundColor: "#f8f9fa",
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    elevation: 1,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#eee",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mealTagline: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: "#696161ff",
  },
  addFoodButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  foodListContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  foodName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  foodCalories: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,

    width: width,
    maxHeight: height * 0.8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  optionCards: {
    // gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dateDisplay: {
    marginTop: Platform.OS === "ios" ? 0 : 20,
    marginBottom: 15,
  },
  datePickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    margin: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "absolute",
    top: 300,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  iosDatePicker: {
    height: 200,
  },
  datePickerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 10,
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  confirmButton: {
    backgroundColor: "#FF5757",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  macroSummaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  macroRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroIconContainer: {
    marginBottom: 2,
  },
  macroIcon: {
    width: 16,
    height: 16,
  },
  macroLabel: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  macroValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  rightSection: {
    alignItems: "center",
    marginLeft: 8,
  },
  expandIcon: {
    padding: 4,
  },
  expandedFoodList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  foodItemLeft: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  foodItemRight: {
    alignItems: "flex-end",
  },
  foodQuantity: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  foodMacros: {
    fontSize: 10,
    color: "#999",
  },
  individualMacros: {
    marginTop: 8,
  },
  foodMacroItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 2,
  },
  moreItemsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    gap: 4,
  },
  moreItemsText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  foodSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  foodItemCard: {
    backgroundColor: "#fff",
    marginVertical: 4,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  expandFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  foodMacroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flex: 1,
  },
  // Micronutrients styles
  micronutrientsSection: {
    marginTop: 6,
    paddingTop: 2,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  micronutrientsTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginRight: 3,
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
  // Floating Action Button styles
  floatingActionButton: {
    position: "absolute",

    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  floatingButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  // Target Achievement Modal Styles
  achievementOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  achievementContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  achievementImage: {
    width: 180,
    height: 160,
    marginBottom: 20,
  },
  achievementTitleContainer: {
    marginBottom: 8,
  },
  achievementTitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementSubtitleContainer: {
    marginBottom: 8,
  },
  achievementSubtitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 3,
  },
  achievementText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  achievementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  achievementSubtext: {
    fontSize: 10,
    color: "#868686",
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.8,
    maxWidth: 400,
  },
  premiumModalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  premiumModalButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  premiumModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

// Skeleton loader styles
const skeletonStyles = StyleSheet.create({
  skeletonBackButton: {
    width: 100,
    height: 24,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonDateNavigator: {
    width: "100%",
    height: 80,
    backgroundColor: "#E0E0E0",
    borderRadius: 12,
    marginBottom: 10,
  },
  skeletonProgressCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  skeletonProgressHeader: {
    width: "60%",
    height: 24,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  skeletonProgressItem: {
    flex: 1,
    height: 80,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  skeletonMealCard: {
    backgroundColor: "#f8f9fa",
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: 240,
  },
  skeletonMealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  skeletonMealTitle: {
    width: "70%",
    height: 16,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonMealSubtitle: {
    width: "50%",
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonMealTime: {
    width: "40%",
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
  skeletonAddButton: {
    width: 90,
    height: 32,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
  },
  skeletonFoodItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginTop: 12,
    height: 120,
  },
  skeletonFoodName: {
    width: "60%",
    height: 14,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonFoodQty: {
    width: "30%",
    height: 12,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonMacrosRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flex: 1,
  },
  skeletonMacroItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 2,
  },
  skeletonMacroIcon: {
    width: 16,
    height: 16,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 4,
  },
  skeletonMacroLabel: {
    width: 35,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonMacroValue: {
    width: 25,
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
  },
});
