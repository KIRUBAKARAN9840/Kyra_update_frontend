// screens/FoodSearchScreen.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Keyboard,
  Alert,
} from "react-native";
import FoodCard from "../../../components/ui/Diet/FoodCard";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import GradientButton from "../../../components/ui/GradientButton";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import {
  addClientDietAPI,
  addClientDietTemplateAPI,
  getCommonFooodAPI,
  searchClientFoodAPI,
  updateDietTemplateMeals,
} from "../../../services/clientApi";
import { safeParseJSON } from "../../../utils/safeHelpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "../../../utils/Toaster";
import { format } from "date-fns";
import GradientButton2 from "../../../components/ui/GradientButton2";
import MissedMealsModal from "../../../components/ui/Diet/MissedMealsModal";
import { useLocalSearchParams } from "expo-router";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";
import HardwareBackHandler from "../../../components/HardwareBackHandler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FoodSearchScreen = () => {
  const router = useRouter();
  const inputRef = useRef(null);
  const debounceTimeoutRef = useRef(null);

  // Params from the previous screen
  const {
    date,
    templateTitle,
    mealTitle,
    mealTimeRange,
    mealId,
    templateId,
    templateData,
    method,
  } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [allFoods, setAllFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateAdd, setDateAdd] = useState(new Date());
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [selectedFoodsSet, setSelectedFoodsSet] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [missedMealsModalVisible, setMissedMealsModalVisible] = useState(false);
  const [parsedTemplateData, setParsedTemplateData] = useState([]);
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  // Handle date selection
  const handleDateSelect = (date) => {
    setDateAdd(date);
    setSelectedDate(date);
  };

  // Parse template data when available
  useEffect(() => {
    if (templateData) {
      const parsed = safeParseJSON(templateData, []);
      setParsedTemplateData(parsed);
    }
  }, [templateData]);

  // Set initial date if provided
  useEffect(() => {
    if (date) {
      setSelectedDate(new Date(date));
      setMissedMealsModalVisible(true);
    }
  }, [date]);

  // Fetch common food items
  const fetchCommonDiet = async () => {
    setLoading(true);
    try {
      const response = await getCommonFooodAPI();

      if (response?.status === 200) {
        setAllFoods(response?.data || []);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search for foods
  const searchFoods = async (query) => {
    if (query.length > 1) {
      try {
        const response = await searchClientFoodAPI(query);

        if (response?.status === 200) {
          setAllFoods(response?.data);
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc:
              response?.detail ||
              "Something went wrong. Please try again later",
          });
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
    } else {
      await fetchCommonDiet();
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for 500ms
    debounceTimeoutRef.current = setTimeout(() => {
      searchFoods(query);
    }, 500);
  };

  const filteredData = allFoods?.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleClose = () => {
    setSearchQuery("");
    searchFoods("");
    Keyboard.dismiss();
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Initial data load
  useEffect(() => {
    fetchCommonDiet();

    // Cleanup debounce timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle food selection
  const toggleFoodSelection = useCallback(
    (food) => {
      setSelectedFoods((prevFoods) => {
        const isSelected = selectedFoodsSet.has(food.id);

        if (isSelected) {
          setSelectedFoodsSet((prev) => {
            const newSet = new Set(prev);
            newSet.delete(food.id);
            return newSet;
          });
          return prevFoods.filter((f) => f.id !== food.id);
        } else {
          setSelectedFoodsSet((prev) => new Set(prev).add(food.id));
          return [...prevFoods, { ...food, quantity: "1" }];
        }
      });
    },
    [selectedFoodsSet],
  );

  // Update food quantity
  const updateFoodQuantity = useCallback((foodId, quantity) => {
    setSelectedFoods((prevFoods) =>
      prevFoods.map((food) =>
        food.id === foodId ? { ...food, quantity } : food,
      ),
    );
  }, []);

  // Handle template update
  const handleDietAPI = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      // Process the selected foods with quantities
      const processedFoods = selectedFoods.map((food) => {
        const quantity = parseInt(food.quantity) || 1;
        return {
          ...food,
          id: `${food.id}-${Date.now()}-${Math.random()}`,
          quantity,
          calories: food.calories * quantity,
          protein: food.protein * quantity,
          carbs: food.carbs * quantity,
          fat: food.fat * quantity,
          fiber: food.fiber * quantity,
          sugar: food.sugar * quantity,
          calcium: food.calcium * quantity,
          magnesium: food.magnesium * quantity,
          iron: food.iron * quantity,
          sodium: food.sodium * quantity,
          potassium: food.potassium * quantity,
          date: format(dateAdd, "yyyy-MM-dd"),
          timeAdded: format(new Date(), "HH:mm"),
        };
      });

      // Update the template data with the selected foods for the specific meal
      const updatedTemplateData = parsedTemplateData.map((meal) => {
        if (meal.id === mealId) {
          // Add new foods to the existing foodList or create a new one
          const existingFoodList = meal.foodList || [];
          return {
            ...meal,
            foodList: [...existingFoodList, ...processedFoods],
            itemsCount: (existingFoodList.length || 0) + processedFoods.length,
          };
        }
        return meal;
      });

      const payload = templateId
        ? {
            id: templateId,
            diet_data: updatedTemplateData,
          }
        : {
            template_name: templateTitle,
            diet_data: updatedTemplateData,
            client_id: clientId,
          };

      const response = templateId
        ? await updateDietTemplateMeals(payload)
        : await addClientDietTemplateAPI(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: response.message || "Template saved successfully",
        });

        // Navigate back to the template category page with updated data
        router.replace({
          pathname: "/client/addTemplateCategoryPage",
          params: {
            templateTitle,
            templateId: response?.data?.id || templateId,
            mealId,
            mealTitle,
            mealTimeRange,
            // selectedFoods: JSON.stringify(processedFoods),
            date: toIndianISOString(dateAdd).split("T")[0],
            method: method,
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      console.error("Error saving template:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  // Save foods (either to template or as regular diet log)
  const saveFoods = async () => {
    if (!dateAdd) {
      return;
    }

    if (selectedFoods.length === 0) {
      showToast({
        type: "error",
        title: "No Food Selected",
      });
      return;
    }

    // If we're working with a template, handle appropriately
    if (templateTitle || templateId) {
      handleDietAPI();
      return;
    }

    // Handle regular diet log
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      const processedFoods = selectedFoods.map((food) => {
        const quantity = parseInt(food.quantity) || 1;
        return {
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
        };
      });

      // Define meal categories structure
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

      // Find the current meal category or default to Breakfast
      const currentMeal =
        mealCategories.find((meal) => meal.id === mealId) || mealCategories[4]; // Default to Breakfast

      // Create diet data structure
      const dietData = [
        {
          id: currentMeal.id,
          title: currentMeal.title,
          tagline: currentMeal.tagline,
          foodList: processedFoods,
          timeRange: currentMeal.timeRange,
          itemsCount: processedFoods.length,
        },
      ];

      const payload = {
        client_id: clientId,
        date: toIndianISOString(dateAdd).split("T")[0],
        diet_data: dietData,
        gym_id: gymId ? gymId : null,
      };

      const response = await addClientDietAPI(payload);

      if (response?.status === 200) {
        const earnedXp = response?.reward_point || 0;

        setSelectedFoods([]);
        setDateAdd(new Date());
        if (earnedXp) {
          setXpAmount(earnedXp);
          setXpRewardVisible(true);
        }

        if (!earnedXp) {
          showToast({
            type: "success",
            title: "Success",
            desc: "Diet Added Successfully.",
          });
          router.push({
            pathname: "/client/myListedFoodLogs",
          });

          setXpRewardVisible(false);
        } else {
          setTimeout(() => {
            router.push({
              pathname: "/client/myListedFoodLogs",
            });

            setXpRewardVisible(false);
          }, 3000);
        }

        // setTimeout(() => {
        //   router.push({
        //     pathname: "/client/myListedFoodLogs",
        //   });
        // }, 1000);

        return response;
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* templateId */}
      <HardwareBackHandler
        routePath={
          templateId
            ? "/client/(diet)/personalTemplate"
            : "/client/myListedFoodLogs"
        }
        enabled={true}
        params={{
          method: "personal",
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: templateId
                ? "/client/(diet)/personalTemplate"
                : "/client/myListedFoodLogs",
              params: {
                method: "personal",
              },
            })
          }
        >
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <View
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingRight: 30,
          }}
        >
          {date && <Text>Log Your Food</Text>}
          {templateTitle && mealTitle && (
            <Text numberOfLines={1} style={styles.headerText}>
              Add Food To {mealTitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.search_bar}>
        <TouchableOpacity onPress={focusInput}>
          <Ionicons name="search-outline" size={20} color="#888" />
        </TouchableOpacity>

        <TextInput
          onChangeText={handleSearch}
          value={searchQuery}
          placeholder="Type here..."
          style={styles.searchInput}
          ref={inputRef}
        />

        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {selectedDate && (
        <View
          style={{
            marginTop: 10,
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading foods...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FoodCard
              id={item.id}
              image={item.pic}
              title={item.name}
              calories={Math.round(item.calories) || 0}
              carbs={Math.round(item.carbs) || 0}
              fat={Math.round(item.fat) || 0}
              sugar={Math.round(item.sugar) || 0}
              fiber={Math.round(item.fiber) || 0}
              calcium={Math.round(item.calcium) || 0}
              magnesium={Math.round(item.magnesium) || 0}
              iron={Math.round(item.iron) || 0}
              sodium={Math.round(item.sodium) || 0}
              potassium={Math.round(item.potassium) || 0}
              protein={Math.round(item.protein) || 0}
              quantity={item?.quantity}
              isSelected={selectedFoodsSet.has(item.id)}
              onAdd={() => toggleFoodSelection(item)}
              updateFoodQuantity={updateFoodQuantity}
            />
          )}
          contentContainerStyle={styles.foodListContainer}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}

      <View style={styles.selectedCountContainer}>
        <Text style={styles.selectedCountText}>
          {selectedFoods.length} item{selectedFoods.length !== 1 ? "s" : ""}{" "}
          selected
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <GradientButton
          title={
            templateTitle || templateId ? "Add to Meal" : "Add Food to Logs"
          }
          fromColor="#28A745"
          toColor="#007BFF"
          containerStyle={{ marginTop: 0 }}
          textStyle={{ fontSize: 12 }}
          onPress={saveFoods}
          disabled={loading || selectedFoods.length === 0}
        />
      </View>

      {xpRewardVisible ? (
        <GrainConfettiAnimation numberOfPieces={150} xpPoints={xpAmount} />
      ) : (
        ""
      )}

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

export default FoodSearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  search_bar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginTop: 5,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  foodListContainer: {
    paddingBottom: 10,
    paddingTop: 0,
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
