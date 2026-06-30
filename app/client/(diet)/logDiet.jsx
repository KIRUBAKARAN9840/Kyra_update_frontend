import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MealsCategoryCard from "../../../components/ui/Diet/MealsCategoryCard";
import MissedLogCard from "../../../components/ui/Diet/MissedLogCard";
import MissedMealsModal from "../../../components/ui/Diet/MissedMealsModal";
import GradientButton from "../../../components/ui/GradientButton";
import GradientButton2 from "../../../components/ui/GradientButton2";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import EmptyStateCard from "../../../components/ui/Workout/EmptyDataComponent";
import {
  getDefaultSingleDietTemplate,
  getSingleDietTemplateAPI,
} from "../../../services/clientApi";
import { addClientDietAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";
import HardwareBackHandler from "../../../components/HardwareBackHandler";
import SkeletonWorkout from "../../../components/ui/Workout/skeletonWorkout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const mockData = [
  {
    id: "5",
    title: "Breakfast",
    tagline: "Start your day right",
    foodList: [],
    timeRange: "8:30-9:30 AM",
    itemsCount: 1,
  },

  {
    id: "7",
    title: "Lunch",
    tagline: "Nutritious midday meal",
    foodList: [],
    timeRange: "1:00-2:00 PM",
    itemsCount: 0,
  },
  {
    id: "8",
    title: "Snacks",
    tagline: "Healthy meal",
    foodList: [],
    timeRange: "4:00-5:00 PM",
    itemsCount: 0,
  },
  {
    id: "9",
    title: "Dinner",
    tagline: "End your day well",
    foodList: [],
    timeRange: "7:30-8:30 PM",
    itemsCount: 2,
  },
];

const logDiet = (props) => {
  const router = useRouter();
  const [templateData, setTemplateData] = useState(mockData);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [dateAdd, setDateAdd] = useState(new Date());
  const [missedMealsModalVisible, setMissedMealsModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const {
    templateTitle,
    templateId,
    defaultTemplateId,
    defaultTemplateTitle,
    method,
  } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  // Handle date selection
  const handleDateSelect = (date) => {
    setDateAdd(date);
    setSelectedDate(date);
    setMissedMealsModalVisible(true);
  };

  // useEffect(() => {
  //   if (date) {
  //     setSelectedDate(new Date(date));
  //     setMissedMealsModalVisible(true);
  //   }
  // }, [date]);

  useEffect(() => {
    const fetchParticularTemplateData = async (id) => {
      setIsLoading(true);
      try {
        const response = await getSingleDietTemplateAPI(id);

        if (response?.status === 200) {
          if (
            response?.data?.diet_data &&
            Array.isArray(response.data.diet_data)
          ) {
            // Make sure each category and meal has a selected property
            const formattedData = (response?.data?.diet_data || []).map(
              (category) => ({
                ...category,
                selected: false,
                foodList: (category?.foodList || []).map((meal) => ({
                  ...meal,
                  selected: false,
                })),
              }),
            );
            setTemplateData(formattedData);
          } else {
          }
        }
      } catch (error) {
        const errorMessage = "Something went wrong, please try again.";
        Alert.alert(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (templateId) {
      fetchParticularTemplateData(templateId);
    } else {
      setIsLoading(false);
    }
  }, [templateId]);

  const handleSelection = ({ mealId, catId }) => {
    let updatedTemplateData = [...templateData];

    // Case 1: Category selection (toggle all meals in a category)
    if (catId && !mealId) {
      const categoryIndex = updatedTemplateData.findIndex(
        (cat) => cat.id === catId,
      );

      if (categoryIndex !== -1) {
        // Toggle the category's selection state
        const isCategorySelected = !updatedTemplateData[categoryIndex].selected;

        // Update category and all its meals
        updatedTemplateData[categoryIndex] = {
          ...updatedTemplateData[categoryIndex],
          selected: isCategorySelected,
          foodList: updatedTemplateData[categoryIndex].foodList.map((meal) => ({
            ...meal,
            selected: isCategorySelected,
          })),
        };
      }
    }
    // Case 2: Individual meal selection
    else if (catId && mealId) {
      const categoryIndex = updatedTemplateData.findIndex(
        (cat) => cat.id === catId,
      );

      if (categoryIndex !== -1) {
        const mealIndex = updatedTemplateData[categoryIndex].foodList.findIndex(
          (meal) => meal.id === mealId,
        );

        if (mealIndex !== -1) {
          // Toggle the meal's selection state
          const isMealSelected =
            !updatedTemplateData[categoryIndex].foodList[mealIndex].selected;

          // Update the meal
          updatedTemplateData[categoryIndex].foodList[mealIndex] = {
            ...updatedTemplateData[categoryIndex].foodList[mealIndex],
            selected: isMealSelected,
          };

          // Check if all meals in the category are now selected
          const areAllMealsSelected = updatedTemplateData[
            categoryIndex
          ].foodList.every((meal) => meal.selected);

          // Update the category selection state
          updatedTemplateData[categoryIndex] = {
            ...updatedTemplateData[categoryIndex],
            selected: areAllMealsSelected,
          };
        }
      }
    }

    setTemplateData(updatedTemplateData);
    updateSelectedMealsList(updatedTemplateData);
  };

  // Memoize renderItem function
  const renderMealItem = useCallback(
    ({ item }) => {
      if (!item.foodList?.length) return null;

      return (
        <MealsCategoryCard
          title={item.title}
          timeRange={item.timeRange}
          itemsCount={item.foodList.length}
          foodList={item.foodList}
          onPress={() =>
            router.push({
              pathname: "/client/addFoodListPage",
              params: {
                templateTitle: templateTitle,
                mealTitle: item.title,
                mealTimeRange: item.timeRange,
                mealId: item.id,
                templateId: templateId,
                templateData: JSON.stringify(templateData),
              },
            })
          }
          catSelected={item.selected}
          categoryId={item.id}
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
          defaultTemplateId={defaultTemplateId}
        />
      );
    },
    [
      router,
      templateTitle,
      templateId,
      templateData,
      handleSelection,
      defaultTemplateId,
    ],
  );

  // Helper function to update the list of selected meals
  const updateSelectedMealsList = (updatedTemplateData) => {
    const allSelectedMeals = [];

    updatedTemplateData.forEach((category) => {
      category.foodList.forEach((meal) => {
        if (meal.selected) {
          allSelectedMeals.push({
            ...meal,
            categoryId: category.id,
            categoryTitle: category.title,
          });
        }
      });
    });

    setSelectedMeals(allSelectedMeals);
  };

  const saveFoods = async () => {
    if (!dateAdd) {
      return;
    }

    if (selectedMeals.length === 0) {
      showToast({
        type: "error",
        title: "No Food Selected",
      });
      return;
    }

    if (isSavingRef.current) return;
    isSavingRef.current = true;
    // Handle regular diet log
    setIsSaving(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");

      if (!clientId) {
        return;
      }

      const mealsByCategory = selectedMeals.reduce((acc, food) => {
        const categoryId = food.categoryId || "5"; // Default to Breakfast
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
          image_url: food.pic || "",
        });
        return acc;
      }, {});

      // Define meal categories structure
      const mealCategories = [
        {
          id: "5",
          title: "Breakfast",
          tagline: "Start your day right",
          timeRange: "8:30-9:30 AM",
        },
        {
          id: "7",
          title: "Lunch",
          tagline: "Nutritious midday meal",
          timeRange: "1:00-2:00 PM",
        },
        {
          id: "8",
          title: "Snacks",
          tagline: "Healthy meal",
          timeRange: "4:00-5:00 PM",
        },
        {
          id: "9",
          title: "Dinner",
          tagline: "End your day well",
          timeRange: "7:30-8:30 PM",
        },
      ];

      // Create diet data with only categories that have food items
      const dietData = mealCategories
        .map((category) => {
          const categoryMeals = mealsByCategory[category.id] || [];
          return {
            id: category.id,
            title: category.title,
            tagline: category.tagline,
            foodList: categoryMeals,
            timeRange: category.timeRange,
            itemsCount: categoryMeals.length,
          };
        })
        .filter((category) => category.foodList.length > 0);

      const payload = {
        client_id: clientId,
        date: toIndianISOString(dateAdd).split("T")[0],
        diet_data: dietData,
        gym_id: gymId ? gymId : null,
      };

      const response = await addClientDietAPI(payload);

      if (response?.status === 200) {
        setDateAdd(new Date());
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
          router.replace({
            pathname: "/client/diettracker",
            params: {
              showTarget: showTargetModal ? "true" : "false",
              showFeedback:
                !showTargetModal && showFeedbackModal ? "true" : "false",
            },
          });
          setXpRewardVisible(false);
        } else {
          setTimeout(() => {
            router.replace({
              pathname: "/client/diettracker",
              params: {
                showTarget: showTargetModal ? "true" : "false",
                showFeedback:
                  !showTargetModal && showFeedbackModal ? "true" : "false",
              },
            });
            setXpRewardVisible(false);
          }, 3000);
        }

        return response;
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error adding diet",
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
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.macrosLoader}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <>
      {xpRewardVisible ? (
        <GrainConfettiAnimation numberOfPieces={150} xpPoints={xpAmount} />
      ) : null}
      <View style={[styles.sectionContainer, { paddingBottom: insets.bottom }]}>
        <HardwareBackHandler
          routePath="/client/personalTemplate"
          params={{ method }}
        />

        <TouchableOpacity
          style={[
            styles.backButtonContainer,
            { padding: width * 0.04, paddingTop: insets.top + 10 },
          ]}
          onPress={() => {
            router.replace({
              pathname: "/client/personalTemplate",
              params: { method },
            });
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backButtonText}>
            {templateTitle || defaultTemplateTitle}
          </Text>
        </TouchableOpacity>

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
              onPress={() =>
                setMissedMealsModalVisible(!missedMealsModalVisible)
              }
            />
          </View>
        )}

        {templateData?.length > 0 && (
          <FlatList
            data={templateData}
            keyExtractor={(item) => item.id}
            renderItem={renderMealItem}
            contentContainerStyle={{ paddingBottom: 10, paddingTop: 0 }}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
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
            disabled={isLoading || isSaving || selectedMeals.length === 0}
          />
        </View>

        {templateData?.length === 0 && (
          <EmptyStateCard
            imageSource={require("../../../assets/images/workout/FOOD_NOT_AVAILABLE_CAT_V001 2.webp")}
            onButtonPress={() => router.push("/client/addFoodListPage")}
            buttonText={"Add Food"}
            message={
              "Looks like you have not added anything today!\nTap below to add your favorite meals and track your intakes."
            }
            belowButtonText={"Forgot to Log? Tap Here "}
            onButtonPress2={() => {}}
          />
        )}

        <MissedMealsModal
          onClose={() => setMissedMealsModalVisible(!missedMealsModalVisible)}
          visible={missedMealsModalVisible}
          date={selectedDate}
          onChangeDate={(date) => setSelectedDate(date)}
          onSubmit={handleDateSelect}
        />
      </View>
    </>
  );
};

export default logDiet;

const styles = StyleSheet.create({
  macrosLoader: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
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
    fontSize: width * 0.04,
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
});
