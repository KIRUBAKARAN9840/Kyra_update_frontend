import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getNewDefaultDietTemplate,
  getClientDietAPI,
} from "../../../services/clientApi";
import { ScrollView, TouchableOpacity, Text, Dimensions } from "react-native";
import { MaskedText } from "../../../components/ui/MaskedText";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import MealsCategoryCard from "../../../components/ui/Diet/MealsCategoryCard";
import MissedMealsModal from "../../../components/ui/Diet/MissedMealsModal";
import GradientButton from "../../../components/ui/GradientButton";
import GradientButton2 from "../../../components/ui/GradientButton2";
import EmptyStateCard from "../../../components/ui/Workout/EmptyDataComponent";
import { addClientDietAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import HardwareBackHandler from "../../../components/HardwareBackHandler";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";
import SkeletonWorkout from "../../../components/ui/Workout/skeletonWorkout";
import DefaultTemplateMealsCard from "../../../components/ui/Diet/DefaultTemplateMealsCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height, width } = Dimensions.get("window");

export const useDietTemplate = () => {
  const [templateData, setTemplateData] = useState({});
  const [selectedDayData, setSelectedDayData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tip, setTip] = useState("");
  const [title, setTitle] = useState("");
  const [cousine, setCousine] = useState("");
  const [expertiseLevel, setExpertiseLevel] = useState("");

  const { goal_type, food_category, intensity } = useLocalSearchParams();

  const fetchTemplate = async (initialDay = null) => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error fetching template",
          desc: "Something went wrong.Please try again later",
        });
        return;
      }
      const payload = {
        client_id,
        goal_type,
        cousine: food_category,
        expertise_level: intensity ? intensity : "maintain",
      };

      const response = await getNewDefaultDietTemplate(payload);

      if (response.status === 200) {
        const formattedTemplateData = {};

        Object.keys(response?.data?.template_json).forEach((day) => {
          formattedTemplateData[day] = response.data.template_json[day].map(
            (category) => ({
              ...category,
              selected: false,
              foodList:
                category.foodList?.map((meal) => ({
                  ...meal,
                  selected: false,
                })) || [],
            })
          );
        });

        setTitle(response.data?.template_name);
        setCousine(response.data?.cousine);
        setExpertiseLevel(response.data.expertise_level);
        setTip(response?.data?.tip);
        setTemplateData(formattedTemplateData);

        return formattedTemplateData;
      } else {
        showToast({
          type: "error",
          title: "Error fetching template",
          desc: response?.detail || "Data Unavailable.Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Not Found",
        desc: "No Diet Data Found",
      });
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  const updateDayData = (day, dayData) => {
    setSelectedDayData(dayData);
    setTemplateData((prev) => ({
      ...prev,
      [day]: dayData,
    }));
  };

  return {
    templateData,
    selectedDayData,
    setSelectedDayData,
    isLoading,
    tip,
    fetchTemplate,
    updateDayData,
    title,
    cousine,
    expertiseLevel,
  };
};

// hooks/useMealSelection.js
export const useMealSelection = () => {
  const [selectedMeals, setSelectedMeals] = useState([]);

  const handleMealSelection = useCallback(
    ({ mealId, catId, dayData, updateDayData }) => {
      let updatedDayData = [...dayData];

      // Use functional state update to avoid stale closure issues
      setSelectedMeals((currentSelectedMeals) => {
        let newSelectedMeals = [...currentSelectedMeals];

        // Case 1: Category selection (toggle all meals in a category)
        if (catId && !mealId) {
          const categoryIndex = updatedDayData.findIndex(
            (cat) => cat.id === catId
          );

          if (categoryIndex !== -1) {
            const category = updatedDayData[categoryIndex];
            const isCategorySelected = !category.selected;
            const categoryMeals = category.foodList || [];

            // Update the category and its meals in dayData
            updatedDayData[categoryIndex] = {
              ...category,
              selected: isCategorySelected,
              foodList: categoryMeals.map((meal) => ({
                ...meal,
                selected: isCategorySelected,
              })),
            };

            if (isCategorySelected) {
              // Remove existing meals from this category first
              newSelectedMeals = newSelectedMeals.filter(
                (m) => m.categoryId !== catId
              );

              // Add all meals from this category
              const mealsToAdd = categoryMeals.map((meal) => ({
                id: meal.id,
                title: meal.title || meal.name,
                calories: meal.calories || 0,
                protein: meal.protein || 0,
                carbs: meal.carbs || 0,
                fat: meal.fat || 0,
                sugar: meal.sugar || 0,
                fiber: meal.fiber || 0,
                calcium: meal.calcium || 0,
                magnesium: meal.magnesium || 0,
                iron: meal.iron || 0,
                sodium: meal.sodium || 0,
                potassium: meal.potassium || 0,
                quantity: meal.quantity || 1,
                selected: true,
                categoryId: catId,
                categoryTitle: category.title,
                ...meal,
              }));
              newSelectedMeals = [...newSelectedMeals, ...mealsToAdd];
            } else {
              // Remove all meals from this category
              newSelectedMeals = newSelectedMeals.filter(
                (m) => m.categoryId !== catId
              );
            }
          }
        }
        // Case 2: Individual meal selection
        else if (mealId && catId) {
          const categoryIndex = updatedDayData.findIndex(
            (cat) => cat.id === catId
          );

          if (categoryIndex !== -1) {
            const category = updatedDayData[categoryIndex];
            const mealIndex = category.foodList.findIndex(
              (m) => m.id === mealId
            );

            if (mealIndex !== -1) {
              const meal = category.foodList[mealIndex];
              const isMealSelected = !meal.selected;

              // Update the meal's selected status in dayData
              updatedDayData[categoryIndex].foodList[mealIndex] = {
                ...meal,
                selected: isMealSelected,
              };

              // Check if all meals in category are selected
              const areAllMealsSelected = updatedDayData[
                categoryIndex
              ].foodList.every((m) => m.selected);
              updatedDayData[categoryIndex].selected = areAllMealsSelected;

              if (isMealSelected) {
                // Add the meal if it's not already selected
                const mealExists = newSelectedMeals.some(
                  (m) => m.id === mealId
                );
                if (!mealExists) {
                  const newMeal = {
                    id: meal.id,
                    title: meal.title || meal.name,
                    calories: meal.calories || 0,
                    protein: meal.protein || 0,
                    carbs: meal.carbs || 0,
                    fat: meal.fat || 0,
                    sugar: meal.sugar || 0,
                    fiber: meal.fiber || 0,
                    calcium: meal.calcium || 0,
                    magnesium: meal.magnesium || 0,
                    iron: meal.iron || 0,
                    sodium: meal.sodium || 0,
                    potassium: meal.potassium || 0,
                    quantity: meal.quantity || 1,
                    selected: true,
                    categoryId: catId,
                    categoryTitle: category.title,
                    ...meal,
                  };
                  newSelectedMeals = [...newSelectedMeals, newMeal];
                }
              } else {
                // Remove the meal
                newSelectedMeals = newSelectedMeals.filter(
                  (m) => m.id !== mealId
                );
              }
            }
          }
        }

        return newSelectedMeals;
      });

      // Update day data after state update
      updateDayData(updatedDayData);
    },
    [] // Remove selectedMeals dependency to prevent recreation
  );

  const resetSelectedMeals = useCallback(() => {
    setSelectedMeals([]);
  }, []);

  return {
    selectedMeals,
    handleMealSelection,
    resetSelectedMeals,
    setSelectedMeals,
  };
};

// components/DayTabs.js

const DayTabs = ({
  selectedDay,
  onDayChange,
  tabScrollViewRef,
  scrollToSelectedTab,
}) => {
  const days = [
    { name: "Monday", value: "monday" },
    { name: "Tuesday", value: "tuesday" },
    { name: "Wednesday", value: "wednesday" },
    { name: "Thursday", value: "thursday" },
    { name: "Friday", value: "friday" },
    { name: "Saturday", value: "saturday" },
    { name: "Sunday", value: "sunday" },
  ];

  const handleTabPress = (tabValue) => {
    onDayChange(tabValue);
    scrollToSelectedTab(tabValue);
  };

  return (
    <ScrollView
      ref={tabScrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.dayTabsContainer}
      contentContainerStyle={styles.dayTabsContent}
    >
      {days.map((day) => (
        <TouchableOpacity
          key={day.value}
          style={[
            styles.dayTab,
            selectedDay === day.value && styles.selectedDayTab,
          ]}
          onPress={() => handleTabPress(day.value)}
        >
          {selectedDay === day.value ? (
            <MaskedText bg1="#28A745" bg2="#007BFF" text={day.name}>
              {day.name}
            </MaskedText>
          ) : (
            <Text style={styles.dayTabText}>{day.name}</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Main Component

const NewDefaultTemplateLogFoodPage = () => {
  const router = useRouter();
  const tabScrollViewRef = useRef(null);

  // Custom hooks
  const {
    templateData,
    selectedDayData,
    setSelectedDayData,
    isLoading,
    tip,
    fetchTemplate,
    updateDayData,
    title,
    cousine,
    expertiseLevel,
  } = useDietTemplate();

  const { selectedMeals, handleMealSelection, resetSelectedMeals } =
    useMealSelection();

  // Local state
  const [dateAdd, setDateAdd] = useState(new Date());
  const [missedMealsModalVisible, setMissedMealsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[today.getDay()];
  });
  const insets = useSafeAreaInsets();
  const {
    templateTitle,
    templateId,
    defaultTemplateId,
    defaultTemplateTitle,
    method,
    expertise_level,
    food_category,
  } = useLocalSearchParams();

  const scrollToSelectedTab = useCallback(
    (tabName) => {
      const days = [
        { name: "Monday", value: "monday" },
        { name: "Tuesday", value: "tuesday" },
        { name: "Wednesday", value: "wednesday" },
        { name: "Thursday", value: "thursday" },
        { name: "Friday", value: "friday" },
        { name: "Saturday", value: "saturday" },
        { name: "Sunday", value: "sunday" },
      ];

      const index = days.findIndex((day) => day.value === tabName);
      if (index !== -1 && tabScrollViewRef.current) {
        const approximateTabWidth = 100;
        const scrollToX = Math.max(
          0,
          index * approximateTabWidth - width / 2 + approximateTabWidth / 2
        );
        tabScrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
      }
    },
    [width]
  );

  // Fix 3: Separate useEffect for initial data fetching
  useEffect(() => {
    const initializeTemplate = async () => {
      const data = await fetchTemplate();

      if (data && data[selectedDay]) {
        setSelectedDayData(data[selectedDay]);
      }
    };

    initializeTemplate();
  }, []); // Only run once on mount

  // Fix 4: Separate useEffect for scrolling after UI is ready
  useEffect(() => {
    if (!isLoading && Object.keys(templateData).length > 0) {
      // Delay scrolling to ensure UI is fully rendered
      const timeoutId = setTimeout(() => {
        scrollToSelectedTab(selectedDay);
      }, 500); // Increased timeout for more reliable scrolling

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, templateData, selectedDay, scrollToSelectedTab]);

  // Fix 5: Handle day changes properly
  useEffect(() => {
    if (selectedDay && templateData[selectedDay]) {
      setSelectedDayData(templateData[selectedDay]);
    }
  }, [selectedDay, templateData]);

  const handleDateSelect = (date) => {
    setDateAdd(date);
    setSelectedDate(date);
    setMissedMealsModalVisible(true);
  };

  const handleDayChange = (day) => {
    setSelectedDay(day);
  };

  const getMealCategoryTagline = (title) => {
    const taglineMap = {
      "Pre workout": "Energy boost",
      "Post workout": "Recovery fuel",
      "Early Morning Detox": "Early morning nutrition",
      "Early morning": "Early morning nutrition",
      "Pre-Breakfast / Pre-Meal Starter": "Pre-breakfast fuel",
      "Pre-Breakfast /starter": "Pre-breakfast fuel",
      "Pre Breakfast /starter": "Pre-breakfast fuel",
      Breakfast: "Start your day right",
      "Mid-Morning Snack": "Healthy meal",
      "Mid Morning snack": "Healthy meal",
      Lunch: "Nutritious midday meal",
      "Evening Snack": "Healthy meal",
      "Evening snack": "Healthy meal",
      Dinner: "End your day well",
      "Bed time": "Rest well",
    };

    return taglineMap[title] || "Fuel workout + Boost Energy";
  };

  const handleSelection = ({ mealId, catId }) => {
    handleMealSelection({
      mealId,
      catId,
      dayData: selectedDayData,
      updateDayData: (updatedData) => {
        updateDayData(selectedDay, updatedData);
      },
    });
  };

  // Rest of your component code remains the same...
  const saveFoods = async () => {
    if (!dateAdd) {
      showToast({
        type: "error",
        title: "Please select a date",
      });
      return;
    }

    if (selectedMeals.length === 0) {
      showToast({
        type: "error",
        title: "No Food Selected",
      });
      return;
    }

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error adding diet",
        });
        return;
      }
      // Fetch existing diet data for the selected date
      const existingDietResponse = await getClientDietAPI(
        clientId,
        toIndianISOString(dateAdd).split("T")[0]
      );

      // Define the exact meal categories structure
      const mealCategories = [
        {
          id: "1",
          title: "Pre workout",
          tagline: "Energy boost",
          timeRange: "6:30-7:00 AM",
        },
        {
          id: "2",
          title: "Post workout",
          tagline: "Recovery fuel",
          timeRange: "7:30-8:00 AM",
        },
        {
          id: "3",
          title: "Early morning Detox",
          tagline: "Early morning nutrition",
          timeRange: "5:30-6:00 AM",
        },
        {
          id: "4",
          title: "Pre-Breakfast / Pre-Meal Starter",
          tagline: "Pre-breakfast fuel",
          timeRange: "7:00-7:30 AM",
        },
        {
          id: "5",
          title: "Breakfast",
          tagline: "Start your day right",
          timeRange: "8:30-9:30 AM",
        },
        {
          id: "6",
          title: "Mid-Morning snack",
          tagline: "Healthy meal",
          timeRange: "10:00-11:00 AM",
        },
        {
          id: "7",
          title: "Lunch",
          tagline: "Nutritious midday meal",
          timeRange: "1:00-2:00 PM",
        },
        {
          id: "8",
          title: "Evening snack",
          tagline: "Healthy meal",
          timeRange: "4:00-5:00 PM",
        },
        {
          id: "9",
          title: "Dinner",
          tagline: "End your day well",
          timeRange: "7:30-8:30 PM",
        },
        {
          id: "10",
          title: "Bed time",
          tagline: "Rest well",
          timeRange: "9:30-10:00 PM",
        },
      ];

      // Group NEW selected meals by category
      const newMealsByCategory = selectedMeals.reduce((acc, food) => {
        // Handle backward compatibility - map old category names to new IDs
        let categoryId = food.categoryId || "5"; // Default to Breakfast

        // Map old category titles to new IDs if needed
        const categoryMapping = {
          "Pre Workout": "1",
          "Post Workout": "2",
          "Early Morning Detox": "3",
          "Pre-Breakfast": "4",
          Breakfast: "5",
          "Mid-Morning Snack": "6",
          Lunch: "7",
          "Evening Snack": "8",
          Dinner: "9",
          Bedtime: "10",
          "Bed time": "10",
        };

        // If categoryId is actually a title, map it to ID
        if (food.categoryTitle && categoryMapping[food.categoryTitle]) {
          categoryId = categoryMapping[food.categoryTitle];
        }

        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }

        const quantity = parseInt(food.quantity) || 1;
        acc[categoryId].push({
          id: `${Date.now()}${Math.random()}`.replace(/\./g, ""),
          fat: Number(food.fat) || 0,
          name: food.title || food.name || "Unknown Food",
          carbs: Number(food.carbs) || 0,
          fiber: Number(food.fiber) || 0,
          sugar: Number(food.sugar) || 0,
          protein: Number(food.protein) || 0,
          calories: Number(food.calories) || 0,
          calcium: Number(food.calcium) || 0,
          magnesium: Number(food.magnesium) || 0,
          iron: Number(food.iron) || 0,
          sodium: Number(food.sodium) || 0,
          potassium: Number(food.potassium) || 0,
          quantity: `${quantity} serving`,
          image_url: food.pic || food.image_url || "",
        });
        return acc;
      }, {});

      // Only send NEW foods - backend will handle merging with existing data
      const dietData = mealCategories
        .map((category) => {
          const newFoodsForThisCategory = newMealsByCategory[category.id] || [];
          return {
            id: category.id,
            title: category.title,
            tagline: category.tagline,
            foodList: newFoodsForThisCategory,
            timeRange: category.timeRange,
            itemsCount: newFoodsForThisCategory.length,
          };
        })
        .filter((category) => category.foodList.length > 0); // Only send categories with NEW food

      const payload = {
        client_id: clientId,
        date: toIndianISOString(dateAdd).split("T")[0],
        diet_data: dietData,
        gym_id: gymId ? gymId : null,
      };

      const response = await addClientDietAPI(payload);

      if (response?.status === 200) {
        setDateAdd(new Date());
        resetSelectedMeals();
        const earnedXp = response?.reward_point || 0;
        const showFeedbackModal = response?.feedback || false;
        const showTargetModal = response?.target || false;

        if (earnedXp) {
          setXpAmount(earnedXp);
          setXpRewardVisible(true);
        } else {
          setXpRewardVisible(false);
        }

        if (!earnedXp) {
          showToast({
            type: "success",
            title: "Success",
            desc: "Diet Added Successfully.",
          });
          router.push({
            pathname: "/client/(diet)/myListedFoodLogs",
            params: {
              showTarget: showTargetModal ? "true" : "false",
              showFeedback:
                !showTargetModal && showFeedbackModal ? "true" : "false",
            },
          });

          setXpRewardVisible(false);
        } else {
          setTimeout(() => {
            router.push({
              pathname: "/client/(diet)/myListedFoodLogs",
              params: {
                showTarget: showTargetModal ? "true" : "false",
                showFeedback:
                  !showTargetModal && showFeedbackModal ? "true" : "false",
              },
            });

            setXpRewardVisible(false);
          }, 3000);
        }
      } else {
        showToast({
          type: "error",
          title: "Error adding diet",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Something went wrong. Please try again later",
      });
    }
  };

  if (isLoading) {
    return <SkeletonWorkout header={false} priority="high" />;
  }

  return (
    <View style={[styles.sectionContainer, { paddingBottom: insets.bottom }]}>
      <HardwareBackHandler routePath="/client/diet" enabled={true} />
      {xpRewardVisible ? (
        <GrainConfettiAnimation numberOfPieces={150} xpPoints={xpAmount} />
      ) : (
        ""
      )}

      <TouchableOpacity
        style={[
          styles.backButtonContainer,
          { padding: width * 0.04, paddingTop: insets.top + 10 },
        ]}
        onPress={() => {
          router.push({
            pathname: "/client/diet",
          });
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={styles.backButtonText}>
          {expertiseLevel?.toLocaleUpperCase()}
        </Text>
      </TouchableOpacity>

      <View style={{ marginTop: 0 }}>
        <DayTabs
          selectedDay={selectedDay}
          onDayChange={handleDayChange}
          tabScrollViewRef={tabScrollViewRef}
          scrollToSelectedTab={scrollToSelectedTab}
        />
      </View>

      {selectedDate && (
        <View
          style={{
            marginTop: 5,
            marginBottom: 5,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <GradientButton2
            title={
              selectedDate
                ? format(selectedDate, "MMMM dd, yyyy")
                : "yyyy-MM-dd"
            }
            fromColor="#28A745"
            toColor="#007BFF"
            containerStyle={{ marginTop: 0 }}
            textStyle={{ fontSize: 12 }}
            onPress={() => setMissedMealsModalVisible(!missedMealsModalVisible)}
          />
        </View>
      )}

      {selectedDayData?.length > 0 && (
        <FlatList
          data={selectedDayData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.foodList && item.foodList.length > 0) {
              return (
                <DefaultTemplateMealsCard
                  title={item.title}
                  timeRange={item.timeRange}
                  itemsCount={item.foodList?.length || 0}
                  foodList={item.foodList}
                  catSelected={item.selected}
                  categoryId={item.id}
                  tagLine={item.tag_line || getMealCategoryTagline(item.title)}
                  templateTitle={templateTitle}
                  templateId={templateId}
                  updateDietTemplate={() => {}}
                  logFood={true}
                  handleSelection={(params) =>
                    handleSelection({
                      ...params,
                      catId: item.id,
                    })
                  }
                  defaultTemplateId={true}
                  newDefaultTemplateLogFoodPage={true}
                />
              );
            }
          }}
          contentContainerStyle={{ paddingBottom: 10, paddingTop: 0 }}
        />
      )}

      {selectedDayData?.length === 0 && (
        <EmptyStateCard
          imageSource={require("../../../assets/images/workout/FOOD_NOT_AVAILABLE_CAT_V001 2.webp")}
          message={
            "Looks like you have not added anything today!\nTap below to add your favorite meals and track your intakes."
          }
        />
      )}

      <View style={styles.selectedCountContainer}>
        <Text style={styles.selectedCountText}>
          {`Log ${selectedMeals.length} selected meal${
            selectedMeals.length !== 1 ? "s" : ""
          }`}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <GradientButton
          title={"Add to Food logs"}
          fromColor="#28A745"
          toColor="#007BFF"
          containerStyle={{ marginTop: 0 }}
          textStyle={{ fontSize: 12 }}
          onPress={saveFoods}
          disabled={isLoading || selectedMeals.length === 0}
          // belowButtonText={
          //   tip || "Tips: Protein: Chicken, fish, eggs, whey (if needed)"
          // }
          belowButtonStyle={{ marginBottom: 15 }}
        />
      </View>

      <View style={styles.disclaimerContainer}>
        <Ionicons name="information-circle-outline" size={14} color="#888" />
        <Text style={styles.disclaimerText}>
          This Diet Plan is for General Fitness guidance only. Consult a
          healthcare professional for medical advice, diagnosis, or treatment.
        </Text>
      </View>

      <MissedMealsModal
        onClose={() => setMissedMealsModalVisible(!missedMealsModalVisible)}
        visible={missedMealsModalVisible}
        date={selectedDate}
        onChangeDate={(date) => setSelectedDate(date)}
        onSubmit={handleDateSelect}
      />
    </View>
  );
};

export default NewDefaultTemplateLogFoodPage;

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    marginBottom: height * 0.02,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: width * 0.02,
    fontWeight: "500",
  },
  logButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: width * 0.05,
    marginVertical: 10,
    alignItems: "center",
  },
  logButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonContainer: {
    marginBottom: 0,
  },
  selectedCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: "400",
  },
  buttonContainer: {
    marginBottom: 0,
  },
  dayTabsContainer: {
    marginBottom: 10,
  },
  dayTabsContent: {
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dayTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginHorizontal: 4,
    // backgroundColor: '#f0f0f0',
  },
  selectedDayTab: {
    // backgroundColor: '#297DB3',
    borderBottomColor: "green",
    borderBottomWidth: 1.2,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7b7b7b",
    lineHeight: 20,
  },
  selectedDayTabText: {
    color: "#000000",
    borderBottomColor: "#000000",
    borderBottomWidth: 1,
  },
  durationContainer: {
    marginTop: 10,
  },

  durationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  durationLabel: {
    fontSize: 16,
    color: "#333",
    // marginLeft: 8,
    fontWeight: "500",
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
    backgroundColor: "transparent",
  },
  disclaimerText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 6,
    lineHeight: 14,
    flex: 1,
  },
});
