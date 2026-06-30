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
  Image,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { clientReportAPI, getClientDietAPI } from "../../../services/clientApi";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { showToast } from "../../../utils/Toaster";
import SkeletonDiet from "./skeletonDiet";
import DietProgressTracker from "../Home/progesspage/dietprogress";
import EmptyStateCard from "../Workout/EmptyDataComponent";

const { width, height } = Dimensions.get("window");

// Removed ShareableReportView component and shareStyles as they're no longer needed

const DietReport = (props) => {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [isToDateEnabled, setIsToDateEnabled] = useState(false);
  const [dietLogs, setDietLogs] = useState([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState([]);
  const [showMealFilter, setShowMealFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [averageProgress, setAverageProgress] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const { scrollEventThrottle, onScroll, headerHeight } = props;

  const today = new Date();

  // Meal types from diet template structure
  const mealTypes = [
    { id: "pre workout", name: "Pre Workout", icon: "fitness-outline" },
    { id: "post workout", name: "Post Workout", icon: "barbell-outline" },
    {
      id: "early morning detox",
      name: "Early Morning Detox",
      icon: "leaf-outline",
    },
    {
      id: "pre-breakfast / pre-meal starter",
      name: "Pre-Breakfast Starter",
      icon: "time-outline",
    },
    { id: "breakfast", name: "Breakfast", icon: "sunny-outline" },
    {
      id: "mid-morning snack",
      name: "Mid-Morning Snack",
      icon: "nutrition-outline",
    },
    { id: "lunch", name: "Lunch", icon: "restaurant-outline" },
    { id: "evening snack", name: "Evening Snack", icon: "cafe-outline" },
    { id: "dinner", name: "Dinner", icon: "moon-outline" },
    { id: "bed time", name: "Bed Time", icon: "bed-outline" },
  ];

  const nutrients = [
    {
      label: "Calories",
      icon: require("../../../assets/images/diet/calorie.png"),
    },
    {
      label: "Proteins",
      icon: require("../../../assets/images/diet/protein.png"),
    },
    { label: "Carbs", icon: require("../../../assets/images/diet/carb.png") },
    { label: "Fats", icon: require("../../../assets/images/diet/fat.png") },
    { label: "Fiber", icon: require("../../../assets/images/diet/fiber.png") },
    { label: "Sugar", icon: require("../../../assets/images/diet/sugar.png") },
  ];

  const showFromDate = (event, selected) => {
    if (Platform.OS === "android") {
      setShowFromDatePicker(false);
    }

    if (selected) {
      setFromDate(selected);
      setToDate(null);
      setIsToDateEnabled(true);
      if (Platform.OS === "ios") {
        setShowFromDatePicker(false);
      }
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowFromDatePicker(false);
    }
  };

  const showToDate = (event, selected) => {
    if (Platform.OS === "android") {
      setShowToDatePicker(false);
    }

    if (selected) {
      // Validate date restrictions
      const daysDiff = Math.ceil((selected - fromDate) / (1000 * 60 * 60 * 24));

      // Check if the selected date is within current week and not future
      if (selected > today) {
        showToast({
          type: "error",
          title: "Invalid Date",
          desc: "Cannot select future dates",
        });
        return;
      }

      // Check if the selected date is before from date
      if (selected < fromDate) {
        showToast({
          type: "error",
          title: "Invalid Date",
          desc: "End date cannot be before start date",
        });
        return;
      }

      // // Check if the selected date is more than 7 days from start date
      // if (daysDiff > 6) {
      //   // 6 because day 0 is the from date itself
      //   showToast({
      //     type: "error",
      //     title: "Invalid Date Range",
      //     desc: "End date can be maximum 7 days from start date",
      //   });
      //   return;
      // }

      setToDate(selected);
      if (Platform.OS === "ios") {
        setShowToDatePicker(false);
      }
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowToDatePicker(false);
    }
  };

  const fetchDietLogs = async () => {
    if (!fromDate || !toDate) return;

    const clientId = await AsyncStorage.getItem("client_id");
    setIsLoading(true);

    // Convert dates to string format for API
    const startDateString = toIndianISOString(fromDate).split("T")[0];
    const endDateString = toIndianISOString(toDate).split("T")[0];

    try {
      // Use the new date range API calls - much more efficient!
      const [dietResponse, reportResponse] = await Promise.all([
        getClientDietAPI(
          clientId,
          null,
          startDateString,
          endDateString,
          selectedMealTypes,
        ), // Pass selected meal types for filtering
        clientReportAPI(clientId, null, startDateString, endDateString),
      ]);

      // Handle diet data
      if (dietResponse?.status === 200 && dietResponse?.data) {
        // The data already comes with date fields added by the backend
        setDietLogs(dietResponse.data);
      } else {
        setDietLogs([]);
      }

      // Handle progress data - prioritize diet API response since it's working correctly
      if (
        dietResponse?.progress &&
        dietResponse.date_range?.days_with_data > 0
      ) {
        // Use diet API progress data (primary - more reliable)

        setAverageProgress(dietResponse.progress);
      } else if (
        reportResponse?.status === 200 &&
        reportResponse?.data?.client_actual &&
        reportResponse?.data?.date_range?.days_with_data > 0
      ) {
        // Fallback to report API if available

        setAverageProgress(reportResponse.data.client_actual);
      } else {
        setAverageProgress(null);
      }
    } catch (error) {
      console.error("Error fetching diet logs:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMealType = (mealTypeId) => {
    let newSelection = [...selectedMealTypes];

    if (newSelection.includes(mealTypeId)) {
      newSelection = newSelection.filter((id) => id !== mealTypeId);
    } else {
      newSelection.push(mealTypeId);
    }

    setSelectedMealTypes(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedMealTypes.length === mealTypes.length) {
      // If all are selected, deselect all
      setSelectedMealTypes([]);
    } else {
      // Otherwise, select all
      const allMealIds = mealTypes.map((type) => type.id);
      setSelectedMealTypes(allMealIds);
    }
  };

  const applyFilters = async () => {
    setShowFilters(false);
    await fetchDietLogs();
  };

  const editFilters = () => {
    setShowFilters(true);
  };

  const toggleMealExpansion = (mealId) => {
    setExpandedMeal(expandedMeal === mealId ? null : mealId);
  };

  const filterMealsByType = (meals) => {
    // If no meal types are selected, show all meals
    if (selectedMealTypes.length === 0) {
      return meals;
    }

    return meals.filter((meal) =>
      selectedMealTypes.some((type) =>
        meal.title.toLowerCase().includes(type.toLowerCase()),
      ),
    );
  };

  const groupMealsByDate = (meals) => {
    if (!meals || meals.length === 0) {
      return [];
    }

    const filteredMeals = filterMealsByType(meals);
    const groupedMeals = filteredMeals.reduce((groups, meal) => {
      // Only include meals that have food data
      if (meal.foodList && meal.foodList.length > 0) {
        const dateKey = meal.date;
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(meal);
      }
      return groups;
    }, {});

    return Object.entries(groupedMeals)
      .map(([date, items]) => {
        // Sort meals: breakfast first, then others
        const sortedItems = items.sort((a, b) => {
          if (a.title.toLowerCase().includes("breakfast")) return -1;
          if (b.title.toLowerCase().includes("breakfast")) return 1;
          return 0;
        });

        return {
          title: format(new Date(date), "MMMM dd, yyyy"),
          date: date,
          data: sortedItems,
        };
      })
      .filter((dateGroup) => dateGroup.data.length > 0) // Only include dates that have meals with data
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  if (isLoading) {
    return <SkeletonDiet priority="high" type="reports" header={false} />;
  }

  // Calculate grouped meals for rendering
  const groupedMeals = groupMealsByDate(dietLogs);
  const allMealsSelected =
    mealTypes.length > 0 && selectedMealTypes.length === mealTypes.length;

  const renderMealItem = (meal, mealId, date) => {
    const isExpanded = expandedMeal === mealId;
    const hasFood = meal.foodList && meal.foodList.length > 0;

    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={styles.mealInfo}>
            <Text style={styles.mealTitle}>{meal.title}</Text>
            <Text style={styles.mealTagline}>{meal.tagline}</Text>
            <Text style={styles.mealTime}>
              {format(new Date(date), "MMMM dd, yyyy")} - {meal.timeRange}
            </Text>
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
                    {meal.foodList[0].name}
                  </Text>
                  <Text style={styles.foodQuantity}>
                    Qty: {meal.foodList[0].quantity}
                  </Text>
                </View>
                {meal.foodList.length > 1 && (
                  <TouchableOpacity
                    style={styles.expandFoodButton}
                    onPress={() => toggleMealExpansion(mealId)}
                  >
                    <Text style={styles.moreItemsText}>
                      {isExpanded
                        ? `Hide ${meal.foodList.length - 1} more`
                        : `+${meal.foodList.length - 1} more`}
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
                  const food = meal.foodList[0];
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
                          style={styles.macroIcon}
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
                      {Math.round(meal.foodList[0].calcium || 0)}mg
                    </Text>
                    <Text style={styles.microLabel}>Calcium</Text>
                  </View>
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>
                      {Math.round(meal.foodList[0].magnesium || 0)}mg
                    </Text>
                    <Text style={styles.microLabel}>Magnesium</Text>
                  </View>
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>
                      {Math.round(meal.foodList[0].sodium || 0)}mg
                    </Text>
                    <Text style={styles.microLabel}>Sodium</Text>
                  </View>
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>
                      {Math.round(meal.foodList[0].potassium || 0)}mg
                    </Text>
                    <Text style={styles.microLabel}>Potassium</Text>
                  </View>
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>
                      {Math.round(meal.foodList[0].iron || 0)}mg
                    </Text>
                    <Text style={styles.microLabel}>Iron</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Additional foods - shown when expanded */}
            {isExpanded &&
              meal.foodList.slice(1).map((food, index) => (
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
                              style={styles.macroIcon}
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
  };

  return (
    <View style={styles.container}>
      {/* From Date Picker */}
      {showFromDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={fromDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={showFromDate}
            themeVariant="light"
            textColor="#000000"
            maximumDate={new Date()}
            style={Platform.OS === "ios" ? styles.iosDatePicker : {}}
          />
          {Platform.OS === "ios" && (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.cancelButton]}
                onPress={() => setShowFromDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.confirmButton]}
                onPress={() => setShowFromDatePicker(false)}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* To Date Picker */}
      {showToDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={toDate || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={showToDate}
            themeVariant="light"
            textColor="#000000"
            minimumDate={fromDate}
            maximumDate={new Date()}
            style={Platform.OS === "ios" ? styles.iosDatePicker : {}}
          />
          {Platform.OS === "ios" && (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.cancelButton]}
                onPress={() => setShowToDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.confirmButton]}
                onPress={() => setShowToDatePicker(false)}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 20 },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {/* Show filters section */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Date Range Selector Card */}
            <View style={styles.dateRangeCard}>
              <Text style={styles.cardTitle}>Select Date Range</Text>
              <View style={styles.dateRangeContainer}>
                <View style={styles.dateInputContainer}>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowFromDatePicker(true)}
                  >
                    <Text style={styles.dateInputLabel}>From Date</Text>
                    <Text style={styles.dateInputValue}>
                      {/* {format(fromDate, "dd/MM/yyyy")} */}

                      {fromDate
                        ? format(fromDate, "dd/MM/yyyy")
                        : "Select from date"}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.dateInputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateInput,
                      !isToDateEnabled && styles.dateInputDisabled,
                    ]}
                    onPress={() => isToDateEnabled && setShowToDatePicker(true)}
                    disabled={!isToDateEnabled}
                  >
                    <Text style={styles.dateInputLabel}>To Date</Text>
                    <Text
                      style={[
                        styles.dateInputValue,
                        !isToDateEnabled && styles.dateInputValueDisabled,
                      ]}
                    >
                      {toDate ? format(toDate, "dd/MM/yyyy") : "Select to date"}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={!isToDateEnabled ? "#ccc" : "#666"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Show empty state when dates are not selected */}
            {(!fromDate || !toDate) && (
              <EmptyStateCard
                imageSource={require("../../../assets/images/workout/FOOD_NOT_AVAILABLE_CAT_V001 2.webp")}
                onButtonPress={() => setShowFromDatePicker(true)}
                buttonText="Select Date Range"
                message={"Please select the date range to view the reports!"}
                belowButtonText={""}
                onButtonPress2={() => {}}
              />
            )}

            {/* Meal Type Filter - Show only when both dates have values */}
            {fromDate && toDate && (
              <View style={styles.mealTypeSection}>
                <View style={styles.mealTypeSectionHeader}>
                  <Text style={styles.cardTitle}>Select Meal Types</Text>
                </View>
                <View style={styles.selectAllRow}>
                  <TouchableOpacity
                    style={styles.selectAllToggle}
                    onPress={toggleSelectAll}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        allMealsSelected && styles.checkboxSelected,
                      ]}
                    >
                      {allMealsSelected && (
                        <Ionicons name="checkmark" size={12} color="white" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.selectAllText,
                        allMealsSelected && styles.selectAllTextSelected,
                      ]}
                    >
                      {allMealsSelected ? "Deselect All" : "Select All"}
                    </Text>
                  </TouchableOpacity>
                  {selectedMealTypes.length ? (
                    <TouchableOpacity
                      style={styles.applyFilterButton}
                      onPress={applyFilters}
                    >
                      <Text style={styles.applyFilterText}>Apply</Text>
                    </TouchableOpacity>
                  ) : (
                    ""
                  )}
                </View>

                <ScrollView
                  style={styles.scrollableFilters}
                  contentContainerStyle={styles.scrollableContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.mealOptionsContainer}>
                    {mealTypes.map((mealType, index) => {
                      const isSelected = selectedMealTypes.includes(
                        mealType.id,
                      );
                      return (
                        <TouchableOpacity
                          key={mealType.id}
                          style={[
                            styles.mealOptionCard,
                            isSelected && styles.mealOptionCardSelected,
                          ]}
                          onPress={() => toggleMealType(mealType.id)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons
                                name="checkmark"
                                size={12}
                                color="white"
                              />
                            )}
                          </View>
                          <View style={styles.mealOptionContent}>
                            <Ionicons
                              name={mealType.icon}
                              size={12}
                              color={"#000"}
                              style={styles.mealIcon}
                            />
                            <Text
                              style={[
                                styles.mealOptionLabel,
                                isSelected && styles.mealOptionLabelSelected,
                              ]}
                            >
                              {mealType.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Results Section */}
        {!showFilters && (
          <View>
            {/* Applied Filters Info and Edit Button */}
            <View style={styles.filterSummaryCard}>
              <View style={styles.filterSummaryHeader}>
                <Ionicons name="filter" size={18} color="#007BFF" />
                <Text style={styles.filterSummaryTitle}>Applied Filters</Text>
              </View>
              <View style={styles.editFiltersContainer}>
                <View style={styles.filterInfoContainer}>
                  <View style={styles.filterInfoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#666" />
                    <Text style={styles.dateRangeText}>
                      {format(fromDate, "MMM dd")} -{" "}
                      {format(toDate, "MMM dd, yyyy")}
                    </Text>
                  </View>
                  <View style={styles.filterInfoRow}>
                    <Ionicons
                      name="restaurant-outline"
                      size={14}
                      color="#666"
                    />
                    <Text style={styles.appliedFiltersText} numberOfLines={1}>
                      {selectedMealTypes.length === 0
                        ? "All meals"
                        : selectedMealTypes.length === 1
                          ? mealTypes.find((m) => m.id === selectedMealTypes[0])
                              ?.name
                          : `${selectedMealTypes.length} meal types`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.editFiltersButton}
                  onPress={editFilters}
                >
                  <Ionicons name="pencil" size={16} color="#007BFF" />
                  <Text style={styles.editFiltersText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Diet Progress Tracker */}
            {averageProgress && (
              <DietProgressTracker
                calories={averageProgress.calories}
                carbs={averageProgress.carbs}
                protein={averageProgress.protein}
                fat={averageProgress.fat}
                fiber={averageProgress.fiber}
                sugar={averageProgress.sugar}
                calcium={Math.round(averageProgress?.calcium?.actual) || 0}
                magnesium={Math.round(averageProgress?.magnesium?.actual) || 0}
                sodium={Math.round(averageProgress?.sodium?.actual) || 0}
                potassium={Math.round(averageProgress?.potassium?.actual) || 0}
                iron={Math.round(averageProgress?.iron?.actual) || 0}
              />
            )}

            {/* Meal List */}
            {groupedMeals.length > 0 ? (
              groupedMeals.map((dateGroup, dateIndex) => (
                <View key={dateIndex} style={styles.dateGroup}>
                  <Text style={styles.dateGroupTitle}>{dateGroup.title}</Text>
                  {dateGroup.data.map((meal, mealIndex) => {
                    const mealId = `${dateGroup.date}-${mealIndex}`;
                    return (
                      <View key={mealId}>
                        {renderMealItem(meal, mealId, dateGroup.date)}
                      </View>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No diet logs found for the selected criteria.
                </Text>
              </View>
            )}
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  dateDisplay: {
    marginTop: Platform.OS === "ios" ? 0 : 20,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
    color: "#FF5757",
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
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardContent: {
    padding: 10,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  nutritionItem2: {
    flex: 1,
    marginHorizontal: 5,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  nutritionLabel2: {
    fontSize: 12,
    fontWeight: "500",
  },
  nutritionValue2: {
    fontSize: 12,
    color: "#666",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
  foodList: {
    paddingVertical: 5,
  },
  foodCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    margin: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  foodTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  foodCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  nutritionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  nutritionDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E0E0E0",
  },
  quantityText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  timeHeader: {
    paddingHorizontal: 5,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 5,
    width: "38%",
    display: "flex",
    alignItems: "left",
    justifyContent: "left",
  },
  timeHeaderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  // New styles for the redesigned component
  filtersContainer: {
    flex: 1,
  },
  dateRangeCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealTypeSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  mealTypeSectionHeader: {
    marginBottom: 10,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    minHeight: 35,
  },
  selectAllToggle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
    marginLeft: 15,
  },
  scrollableFilters: {
    maxHeight: width >= 786 ? "auto" : 400,
  },
  scrollableContent: {
    paddingBottom: 10,
    flexGrow: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },

  dateRangeContainer: {
    flexDirection: "row",
    gap: 10,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  dateInputLabel: {
    fontSize: 12,
    color: "#666",
    position: "absolute",
    top: 5,
    left: 10,
  },
  dateInputValue: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
    marginTop: 15,
  },
  dateInputValueDisabled: {
    color: "#999",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  mealOptionsContainer: {
    gap: 12,
  },
  mealOptionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mealOptionCardSelected: {},
  mealOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
    marginLeft: 10,
  },
  mealIcon: {
    backgroundColor: "#cfcfcf",
    padding: 10,
    borderRadius: 50,
  },
  mealOptionLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  mealOptionLabelSelected: {},
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  checkboxSelected: {
    backgroundColor: "#28A745",
    borderColor: "#28A745",
  },
  applyFilterButton: {
    backgroundColor: "#28A745",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyFilterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  filterSummaryCard: {
    backgroundColor: "#f8f9fa",
    // marginHorizontal: 15,
    marginTop: 25,
    marginBottom: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  editFiltersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterInfoContainer: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  filterInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
  appliedFiltersText: {
    fontSize: 13,
    color: "#666",
  },
  editFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007BFF",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  editFiltersText: {
    color: "#007BFF",
    fontSize: 13,
    fontWeight: "500",
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  mealSection: {
    backgroundColor: "#f8f9fa",
    marginVertical: 5,
    // marginHorizontal: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
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
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 10,
    color: "#999",
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
  foodItemLeft: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  foodQuantity: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  expandFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  moreItemsText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  foodMacroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flex: 1,
  },
  foodMacroItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 2,
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
  // Micronutrients styles
  micronutrientsSection: {
    marginTop: 4,
    paddingTop: 4,
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

export default DietReport;
