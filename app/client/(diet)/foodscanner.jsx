import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  ScrollView,
  Alert,
  Platform,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  addClientDietAIAPI,
  scanFoodAPI,
  modifyFoodItemsAPI,
} from "../../../services/clientApi";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { MaskedText } from "../../../components/ui/MaskedText";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handleNutritionPay } from "../../../components/ui/Payment/nutritionpayfn";
import { showToast } from "../../../utils/Toaster";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "../../../context/UserContext";
import PremiumBadge from "../../../components/ui/Payment/premiumbadge";
import CustomPicker from "../../../components/ui/CustomPicker";
import * as Speech from "expo-speech";
import Svg, { Path, Circle } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const ps = (n) => Math.round((width / 375) * n);

const SESSION_IMAGES = {
  Aerobic: require("../../../assets/images/home_content/aerobics.webp"),
  Boxing: require("../../../assets/images/home_content/boxing.webp"),
  Dance: require("../../../assets/images/home_content/dance.webp"),
  Gymnastics: require("../../../assets/images/home_content/gymnastics.webp"),
  "Martial Arts": require("../../../assets/images/home_content/martial_arts.webp"),
  "Personal Trainer": require("../../../assets/images/home_content/personal_trainer.webp"),
  Pilates: require("../../../assets/images/home_content/pilates.webp"),
  Swimming: require("../../../assets/images/home_content/swimming.webp"),
  Yoga: require("../../../assets/images/home_content/yoga.webp"),
  Zumba: require("../../../assets/images/home_content/zumba.webp"),
};
const DEFAULT_SESSION_IMAGE = require("../../../assets/images/home_content/aerobics.webp");

// Helper function to clean food names - AI returns clean names now, just do basic cleanup
const cleanFoodName = (name) => {
  if (!name) return "";
  // AI already provides clean names, just trim whitespace
  return name.trim();
};

const SimpleFoodScanner = () => {
  const router = useRouter();
  const {
    template,
    food_scan,
    lat,
    lng,
    nearby_sessions,
    nutrition_purchased,
  } = useLocalSearchParams();

  const locationCoords =
    lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
  const nearbySessions = nearby_sessions
    ? (() => {
        try {
          return JSON.parse(nearby_sessions);
        } catch {
          return [];
        }
      })()
    : [];
  const [hasPermission, setHasPermission] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [dietTemplate, setDietTemplate] = useState([]);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  // Payment flow states
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);

  // Food items management
  const [detectedFoods, setDetectedFoods] = useState([]);
  const [originalDetectedFoods, setOriginalDetectedFoods] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [addFoodModal, setAddFoodModal] = useState(false);
  const [newFoodItems, setNewFoodItems] = useState([
    { name: "", quantity: "", unit: "g" },
  ]);
  const [isRecalculating, setIsRecalculating] = useState(false);
  // Single item inline edit modal
  const [editItemModal, setEditItemModal] = useState({
    visible: false,
    itemId: null,
    name: "",
    quantity: "1",
    unit: "serving",
  });
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [addFoodError, setAddFoodError] = useState("");
  const [editItemError, setEditItemError] = useState("");
  const [showMealDropdown, setShowMealDropdown] = useState(false);
  const [macrosExpanded, setMacrosExpanded] = useState(false);

  // Viewfinder overlay visibility
  const [showViewfinder, setShowViewfinder] = useState(true);
  const viewfinderOpacity = useRef(new Animated.Value(1)).current;

  // Hide viewfinder overlay after 1 second when camera is active
  useEffect(() => {
    if (!capturedImage && showViewfinder) {
      const timer = setTimeout(() => {
        Animated.timing(viewfinderOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowViewfinder(false));
      }, 1000);
      return () => clearTimeout(timer);
    }
    // Reset when going back to camera
    if (capturedImage) {
      setShowViewfinder(true);
      viewfinderOpacity.setValue(1);
    }
  }, [capturedImage]);

  // Voice state
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Check voice preference
  useEffect(() => {
    const checkVoicePreference = async () => {
      try {
        const voicePref = await AsyncStorage.getItem("voice_preference");
        setVoiceEnabled(voicePref !== "0");
      } catch (error) {
        console.error(
          "FOOD_SCANNER_VOICE: Error checking voice preference:",
          error,
        );
        setVoiceEnabled(true);
      }
    };
    checkVoicePreference();
  }, []);

  // Read AI insights aloud after scan
  const handleFoodScanVoice = useCallback(
    (scanResults) => {
      if (!voiceEnabled) return;
      if (!scanResults?.insights || scanResults.insights.length === 0) return;
      speakVoice(scanResults.insights.join(" "));
    },
    [voiceEnabled],
  );

  // Helper function to speak voice message
  const speakVoice = (message) => {
    Speech.stop();
    Speech.speak(message, {
      voice:
        Platform.OS === "ios"
          ? "com.apple.ttsbundle.siri_female_en-US_compact"
          : "en-us-x-tpc-network",
      language: "en-US",
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
    });
  };

  // Animation values
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnim1 = useRef(new Animated.Value(0)).current;
  const rotateAnim2 = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);

  // Animation references for cleanup
  const animationRefs = useRef([]);
  const insets = useSafeAreaInsets();
  const { plan } = useUser();

  // Results view scroll animation
  const resultsScrollY = useRef(new Animated.Value(0)).current;
  const resultsImageHeight = height * 0.37;
  const resultsHeaderOpacity = resultsScrollY.interpolate({
    inputRange: [0, resultsImageHeight * 0.5, resultsImageHeight],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });
  const resultsBackArrowOpacity = resultsScrollY.interpolate({
    inputRange: [0, resultsImageHeight * 0.5, resultsImageHeight],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  const handleNutritionPurchase = async (sku) => {
    if (nutriPayInProgress.current) return;
    nutriPayInProgress.current = true;
    setNutriPayProcessing(true);
    setNutriPayStep("Initializing...");

    const response = await handleNutritionPay({
      onStep: setNutriPayStep,
      productSku: sku,
    });

    nutriPayInProgress.current = false;

    if (response?.success) {
      setNutriPayProcessing(false);
      setNutriPaySuccess(true);
    } else if (response?.pendingPolling) {
      setNutriPayProcessing(false);
      setNutriPaySuccess(true);
    } else if (response?.userCancelled) {
      setNutriPayProcessing(false);
    } else {
      setNutriPayProcessing(false);
      setNutriPayFailed(true);
    }
  };

  const handleDeleteFoodItem = async (item) => {
    if (!scanResults?.items) return;
    try {
      const payload = {
        action: "delete",
        item_id: item.id,
        items: scanResults.items,
      };
      const response = await modifyFoodItemsAPI(payload);
      if (response?.status === 201) {
        showToast({
          type: "error",
          title: "Invalid Item",
          desc: "Please enter a valid food item.",
        });
      } else if (response?.status === 200) {
        setScanResults((prev) => ({ ...prev, ...response.data }));
        setDetectedFoods(response.data.items || []);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Failed to delete item.",
        });
      }
    } catch (e) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to delete item.",
      });
    }
  };

  const handleOpenEditItemModal = (item) => {
    setEditItemError("");
    setEditItemModal({
      visible: true,
      itemId: item.id,
      name: cleanFoodName(item?.name || item),
      quantity: "1",
      unit: "serving",
    });
  };

  const handleSaveEditItem = async () => {
    const { itemId, name, quantity, unit } = editItemModal;
    if (!name.trim()) return;
    setEditItemError("");
    try {
      setIsEditingItem(true);
      const payload = {
        action: "edit",
        item_id: itemId,
        items: scanResults.items,
        edited_food: {
          name: name.trim(),
          quantity: parseFloat(quantity) || 1,
          unit: unit || "serving",
        },
      };
      const response = await modifyFoodItemsAPI(payload);
      if (response?.status === 201) {
        setEditItemError("Please enter a valid food item.");
      } else if (response?.status === 200) {
        setEditItemError("");
        setScanResults((prev) => ({ ...prev, ...response.data }));
        setDetectedFoods(response.data.items || []);
        setEditItemModal({
          visible: false,
          itemId: null,
          name: "",
          quantity: "1",
          unit: "serving",
        });
      } else {
        setEditItemError("Failed to update item. Please try again.");
      }
    } catch (e) {
      setEditItemError("Failed to update item. Please try again.");
    } finally {
      setIsEditingItem(false);
    }
  };

  // Camera ref for in-app capture
  const cameraRef = useRef(null);
  const isCapturingRef = useRef(false);

  // Active meal tab (default Breakfast, switchable from camera UI)
  const MEAL_TABS = ["Breakfast", "Lunch", "Snacks", "Dinner"];
  const [activeMealTab, setActiveMealTab] = useState("Breakfast");

  // Info tutorial modal
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalPage, setInfoModalPage] = useState(0);

  // Initialize template data from params
  useEffect(() => {
    if (template) {
      try {
        const templateData = JSON.parse(template);
        setDietTemplate(templateData);
      } catch (error) {}
    }
  }, [template]);

  // Request camera permission on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  // Start animations when scanning begins
  useEffect(() => {
    if (isScanning) {
      startScanAnimation();
    } else {
      // Stop all animations when not scanning
      stopAllAnimations();
    }

    // Cleanup on unmount
    return () => {
      stopAllAnimations();
    };
  }, [isScanning]);

  // Fade in animation for UI elements
  useEffect(() => {
    const fadeAnim = Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });
    fadeAnim.start();

    return () => {
      fadeAnim.stop();
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    } catch (error) {
      Alert.alert("Error", "Failed to request camera permission");
    }
  };

  const stopAllAnimations = () => {
    animationRefs.current.forEach((anim) => {
      if (anim && anim.stop) anim.stop();
    });
    animationRefs.current = [];
    scanLineAnimation.setValue(0);
    rotateAnim1.setValue(0);
    rotateAnim2.setValue(0);
    iconPulse.setValue(1);
    shimmerAnim.setValue(0);
  };

  const startScanAnimation = () => {
    stopAllAnimations();

    const spin1 = Animated.loop(
      Animated.timing(rotateAnim1, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const spin2 = Animated.loop(
      Animated.timing(rotateAnim2, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animationRefs.current = [spin1, spin2, pulse, shimmer];
    spin1.start();
    spin2.start();
    pulse.start();
    shimmer.start();
  };

  const takePicture = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      if (!cameraRef.current) {
        isCapturingRef.current = false;
        return;
      }
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      if (photo?.uri) {
        const imageData = { uri: photo.uri };
        setCapturedImage(imageData);
        setIsScanning(true);
        setTimeout(() => {
          analyzeFood(imageData);
        }, 3000);
      }
    } catch (error) {
      isCapturingRef.current = false;
      Alert.alert("Error", "Failed to take picture. Please try again.");
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to pick an image.",
          [{ text: "OK" }],
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (imageUri) {
          const imageData = { uri: imageUri };
          setCapturedImage(imageData);
          setIsScanning(true);
          setTimeout(() => {
            analyzeFood(imageData);
          }, 3000);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const analyzeFood = async (imageData = capturedImage) => {
    try {
      if (!imageData?.uri) {
        setIsScanning(false);
        return;
      }
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        Alert.alert("Error", "Failed to analyze food. Please try again.");
        return;
      }
      const formData = new FormData();

      const imageFile = {
        uri: imageData.uri,
        type: "image/jpeg",
        name: "food_image.jpg",
      };

      formData.append("files", imageFile);
      formData.append("client_id", clientId);
      if (food_scan === "true") {
        formData.append("food_scan", "true");
      }

      const response = await scanFoodAPI(formData);

      if (response?.status === 200) {
        // Rate limit hit — backend returns message with empty data
        if (response.data?.message) {
          Alert.alert("Limit Reached", response.data.message);
          return;
        }

        setScanResults(response.data);

        // Initialize detected foods array from new backend format
        if (response.data?.items && Array.isArray(response.data.items)) {
          setDetectedFoods(response.data.items);
          setOriginalDetectedFoods(response.data.items);

          // Trigger voice feedback after successful scan
          if (response.data.items.length > 0) {
            handleFoodScanVoice(response.data);
          }
        }
      } else {
        Alert.alert("Error", "Failed to analyze food. Please try again.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to analyze food. Please try again.");
    } finally {
      // Stop animations properly

      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    // Stop all animations first
    stopAllAnimations();

    isCapturingRef.current = false;
    setCapturedImage(null);
    setScanResults(null);
    setIsScanning(false);
    setDetectedFoods([]);
    setOriginalDetectedFoods([]);
    setEditMode(false);
  };

  const handleEditItems = () => {
    // Open modal directly for editing
    setEditMode(true);
    setAddFoodModal(true);
    // Initialize modal with empty items for user input
    setNewFoodItems([{ name: "", quantity: "1", unit: "serving" }]);
  };

  const handleCancelEdit = () => {
    // Revert to original detected items
    setDetectedFoods(originalDetectedFoods);
    setAddFoodModal(false);
    setEditMode(false);
    setAddFoodError("");
    setNewFoodItems([{ name: "", quantity: "1", unit: "serving" }]);
  };

  const handleAddFoodRow = () => {
    setNewFoodItems([
      ...newFoodItems,
      { name: "", quantity: "1", unit: "serving" },
    ]);
  };

  const handleRemoveFoodRow = (index) => {
    if (newFoodItems.length > 1) {
      const updatedItems = newFoodItems.filter((_, i) => i !== index);
      setNewFoodItems(updatedItems);
    }
  };

  const handleUpdateFoodItem = (index, field, value) => {
    const updatedItems = [...newFoodItems];
    updatedItems[index][field] = value;
    setNewFoodItems(updatedItems);
  };

  const handleSubmitEditedItems = async () => {
    const validItems = newFoodItems.filter(
      (item) => item.name.trim() && item.quantity.toString().trim(),
    );

    if (validItems.length === 0) {
      showToast({
        type: "error",
        title: "Invalid Input",
        desc: "Please enter at least one food item with name and quantity.",
      });
      return;
    }

    try {
      setIsRecalculating(true);

      // Call add API once per item sequentially, using updated items list each time
      let currentItems = scanResults?.items || [];
      let lastResponse = null;

      for (const item of validItems) {
        const payload = {
          action: "add",
          items: currentItems,
          edited_food: {
            name: item.name.trim(),
            quantity: parseFloat(item.quantity) || 1.0,
            unit: item.unit || "serving",
          },
        };
        const response = await modifyFoodItemsAPI(payload);
        if (response?.status === 201) {
          setAddFoodError("Please enter a valid food item.");
          return;
        } else if (response?.status === 200) {
          currentItems = response.data.items || currentItems;
          lastResponse = response;
        } else {
          setAddFoodError("Failed to add item. Please try again.");
          return;
        }
      }

      if (lastResponse?.status === 200) {
        setScanResults((prev) => ({ ...prev, ...lastResponse.data }));
        setDetectedFoods(lastResponse.data.items || []);
        setOriginalDetectedFoods(lastResponse.data.items || []);
        setAddFoodModal(false);
        setEditMode(false);
        setAddFoodError("");
        setNewFoodItems([{ name: "", quantity: "1", unit: "serving" }]);
        showToast({
          type: "success",
          title: "Success",
          desc: "Food items added successfully!",
        });
      }
    } catch (error) {
      setAddFoodError("Failed to update food items. Please try again.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const logFood = async () => {
    try {
      // Allow logging even if calories is 0 (unknown food case), as long as we have scan results
      if (!scanResults || !scanResults.totals) {
        showToast({
          type: "error",
          title: "No Food Detected",
          desc: "Please capture food images to log.",
        });
        return;
      }

      const gymId = await AsyncStorage.getItem("gym_id");

      const today = new Date();
      const todaySQL = toIndianISOString(today).split("T")[0]; // YYYY-MM-DD format
      const currentTime = today.toTimeString().slice(0, 5); // HH:MM format

      // Create food item from scan results
      const newFood = {
        id: `${Date.now()}`,
        fat: scanResults.totals.fat_g || 0,
        name: scanResults.primary_food || "Scanned Food",
        carbs: scanResults.totals.carbs_g || 0,
        fiber: scanResults.totals.fibre_g || 0,
        sugar: scanResults.totals.sugar_g || 0,
        protein: scanResults.totals.protein_g || 0,
        calories: scanResults.totals.calories || 0,
        quantity: "1 serving",
        image_url: "",
        calcium: scanResults.micro_nutrients?.calcium_mg || 0,
        magnesium: scanResults.micro_nutrients?.magnesium_mg || 0,
        sodium: scanResults.micro_nutrients?.sodium_mg || 0,
        potassium: scanResults.micro_nutrients?.potassium_mg || 0,
        iron: scanResults.micro_nutrients?.iron_mg || 0,
      };

      // Update the template with the new food
      const updatedTemplate = dietTemplate.map((meal) => {
        if (meal.title === activeMealTab) {
          return {
            ...meal,
            foodList: [...meal.foodList, newFood],
            itemsCount: meal.itemsCount + 1,
          };
        }
        return meal;
      });

      const payload = {
        date: todaySQL,
        scanner_data: scanResults,
        meal_category: activeMealTab,
        gym_id: gymId ? gymId : null,
      };

      const response = await addClientDietAIAPI(payload);

      if (response?.status === 200) {
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
            desc: `Food added to ${activeMealTab} successfully.`,
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
    } catch (error) {}
  };

  // Permission loading state
  if (hasPermission === null) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
        ]}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.gradientContainer}
        >
          <Animated.View
            style={[styles.centerContainer, { opacity: fadeAnimation }]}
          >
            <View style={styles.loadingIcon}>
              <Ionicons name="camera" size={64} color="#fff" />
            </View>
            <Text style={styles.permissionText}>
              Requesting camera permission...
            </Text>
            <View style={styles.loadingDots}>
              {[...Array(3)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.loadingDot,
                    {
                      opacity: fadeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // Permission denied state
  if (hasPermission === false) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
        ]}
      >
        <LinearGradient
          colors={["#ff6b6b", "#ee5a24"]}
          style={styles.gradientContainer}
        >
          <Animated.View
            style={[styles.centerContainer, { opacity: fadeAnimation }]}
          >
            <View style={styles.errorIcon}>
              <Ionicons name="camera" size={64} color="#fff" />
            </View>
            <Text style={styles.permissionText}>Camera access denied</Text>
            <Text style={styles.permissionSubText}>
              Please enable camera permissions in your device settings to scan
              food
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={requestCameraPermission}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  const mealTitle = activeMealTab;

  // In-app camera view (no image captured yet)
  if (!capturedImage) {
    return (
      <View style={styles.cameraScreen}>
        {/* Live camera preview */}
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
        />

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.cameraBackBtn, { top: insets.top + 12 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color="#1A1A1A" />
        </TouchableOpacity>

        {/* Dark overlay on top and bottom, clear in middle - fades out after 1s */}
        {showViewfinder && (
          <Animated.View
            style={[styles.cameraOverlay, { opacity: viewfinderOpacity }]}
            pointerEvents="none"
          >
            <View style={styles.cameraOverlayTop} />
            <View style={styles.cameraOverlayMiddle}>
              <View style={styles.cameraOverlaySide} />
              <View style={styles.cameraViewfinder}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <View style={styles.cameraOverlaySide} />
            </View>
            <View style={styles.cameraOverlayBottom} />
          </Animated.View>
        )}

        {/* Meal tabs */}
        <View style={styles.cameraMealTabs}>
          {MEAL_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.cameraMealTab,
                activeMealTab === tab && styles.cameraMealTabActive,
              ]}
              onPress={() => setActiveMealTab(tab)}
            >
              {activeMealTab === tab ? (
                <LinearGradient
                  colors={["#007BFF", "#28A745"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cameraMealTabGradient}
                >
                  <Text
                    style={[
                      styles.cameraMealTabText,
                      styles.cameraMealTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.cameraMealTabText}>{tab}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom action bar */}
        <View
          style={[
            styles.cameraBottomBar,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {/* Gallery */}
          <TouchableOpacity
            style={styles.cameraActionBtn}
            onPress={pickFromGallery}
          >
            <Ionicons name="image-outline" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Capture */}
          <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
            <LinearGradient
              colors={["#FFFFFF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.captureBtnInner}
            >
              <Image
                source={require("../../../assets/images/diet/aicamera.png")}
                style={{ width: 36, height: 50 }}
                contentFit="contain"
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Info */}
          <TouchableOpacity
            style={styles.cameraActionBtn}
            onPress={() => {
              setInfoModalPage(0);
              setInfoModalVisible(true);
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={26}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Food will be added to label - bottom right above bar */}
        <View style={styles.cameraLabelContainer} pointerEvents="none">
          <Text style={styles.cameraLabelText}>
            Food will be added to {mealTitle}
          </Text>
        </View>

        {/* Info / tutorial modal */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalCard}>
              {/* Title */}
              <Text style={styles.infoModalTitle}>Help Us Analyze Better</Text>
              <Text style={styles.infoModalSubtitle}>
                Capture your meal with proper angle
              </Text>

              {/* Images row */}
              <View style={styles.infoImgRow}>
                {/* Correct */}
                <View style={styles.infoImgCol}>
                  <View style={styles.infoImgWrap}>
                    <Image
                      source={
                        infoModalPage === 0
                          ? require("../../../assets/images/diet/top_one.webp")
                          : require("../../../assets/images/diet/top_two.webp")
                      }
                      style={styles.infoImg}
                      contentFit="cover"
                    />
                    <View style={[styles.infoIconBadge, styles.infoTickBadge]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.infoImgCaption}>Correct</Text>
                </View>

                {/* Incorrect */}
                <View style={styles.infoImgCol}>
                  <View style={styles.infoImgWrap}>
                    <Image
                      source={
                        infoModalPage === 0
                          ? require("../../../assets/images/diet/bottom_one.webp")
                          : require("../../../assets/images/diet/bottom_two.webp")
                      }
                      style={styles.infoImg}
                      contentFit="cover"
                    />
                    <View style={[styles.infoIconBadge, styles.infoCrossBadge]}>
                      <Ionicons name="close" size={14} color="#fff" />
                    </View>
                  </View>
                  <Text style={styles.infoImgCaption}>Incorrect</Text>
                </View>
              </View>

              {/* Pagination dots */}
              <View style={styles.infoDotRow}>
                <View
                  style={[
                    styles.infoDot,
                    infoModalPage === 0 && styles.infoDotActive,
                  ]}
                />
                <View
                  style={[
                    styles.infoDot,
                    infoModalPage === 1 && styles.infoDotActive,
                  ]}
                />
              </View>

              {/* Next button */}
              <TouchableOpacity
                style={styles.infoNextBtn}
                onPress={() => {
                  if (infoModalPage === 0) {
                    setInfoModalPage(1);
                  } else {
                    setInfoModalVisible(false);
                  }
                }}
              >
                <LinearGradient
                  colors={["#007BFF", "#28A745"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.infoNextBtnGradient}
                >
                  <Text style={styles.infoNextBtnText}>
                    {infoModalPage === 0 ? "Next" : "Got it!"}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Scanning view - Same for both iOS and Android
  if (isScanning) {
    const ACCENT_SCAN = "#00BC7D";
    const OUTER_SIZE = 110;
    const INNER_SIZE = 90;
    const STROKE_W = 3.5;
    const OUTER_R = (OUTER_SIZE - STROKE_W) / 2;
    const INNER_R = (INNER_SIZE - STROKE_W) / 2;
    const OUTER_C = 2 * Math.PI * OUTER_R;
    const INNER_C = 2 * Math.PI * INNER_R;
    const OUTER_ARC = OUTER_C * 0.28;
    const INNER_ARC = INNER_C * 0.25;

    const spin1 = rotateAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });
    const spin2 = rotateAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: ["360deg", "0deg"],
    });

    const shimmerOpacity = shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    });

    return (
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Top 40% — food image with overlay + AI spinner */}
        <View style={styles.scanTopSection}>
          <Image
            source={{ uri: capturedImage.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.scanTopOverlay}>
            {/* Rotating arcs + AI icon */}
            <View style={styles.scanAiContainer}>
              <Animated.View
                style={[styles.scanArcLayer, { transform: [{ rotate: spin1 }] }]}
              >
                <Svg width={OUTER_SIZE} height={OUTER_SIZE}>
                  <Circle
                    cx={OUTER_SIZE / 2}
                    cy={OUTER_SIZE / 2}
                    r={OUTER_R}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={STROKE_W}
                    fill="transparent"
                  />
                  <Circle
                    cx={OUTER_SIZE / 2}
                    cy={OUTER_SIZE / 2}
                    r={OUTER_R}
                    stroke={ACCENT_SCAN}
                    strokeWidth={STROKE_W}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${OUTER_ARC} ${OUTER_C - OUTER_ARC}`}
                  />
                </Svg>
              </Animated.View>
              <Animated.View
                style={[styles.scanArcLayer, { transform: [{ rotate: spin2 }] }]}
              >
                <Svg width={INNER_SIZE} height={INNER_SIZE}>
                  <Circle
                    cx={INNER_SIZE / 2}
                    cy={INNER_SIZE / 2}
                    r={INNER_R}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth={STROKE_W}
                    fill="transparent"
                  />
                  <Circle
                    cx={INNER_SIZE / 2}
                    cy={INNER_SIZE / 2}
                    r={INNER_R}
                    stroke={ACCENT_SCAN}
                    strokeWidth={STROKE_W}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={`${INNER_ARC} ${INNER_C - INNER_ARC}`}
                  />
                </Svg>
              </Animated.View>
              <Animated.View
                style={[
                  styles.scanAiIcon,
                  { transform: [{ scale: iconPulse }] },
                ]}
              >
                <Ionicons name="sparkles" size={28} color="#fff" />
              </Animated.View>
            </View>

            <Text style={styles.scanTopTitle}>Analyzing your food</Text>
            <Text style={styles.scanTopSub}>KyraAI is working its magic...</Text>
          </View>
        </View>

        {/* Bottom 60% — skeleton loader */}
        <View style={styles.scanBottomSection}>
          {/* Skeleton: dish title */}
          <Animated.View
            style={[styles.skelBar, { width: "55%", height: 20, opacity: shimmerOpacity }]}
          />
          {/* Skeleton: calories row */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
            <Animated.View
              style={[styles.skelBar, { width: 32, height: 32, borderRadius: 16, opacity: shimmerOpacity }]}
            />
            <Animated.View
              style={[styles.skelBar, { width: 80, height: 28, opacity: shimmerOpacity }]}
            />
            <Animated.View
              style={[styles.skelBar, { width: 40, height: 16, opacity: shimmerOpacity }]}
            />
            <View style={{ flex: 1 }} />
            <Animated.View
              style={[styles.skelBar, { width: 70, height: 26, borderRadius: 13, opacity: shimmerOpacity }]}
            />
          </View>

          {/* Skeleton: macro circles */}
          <View style={styles.skelMacroRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skelMacroItem}>
                <Animated.View
                  style={[styles.skelCircle, { opacity: shimmerOpacity }]}
                />
                <Animated.View
                  style={[styles.skelBar, { width: 40, height: 10, marginTop: 8, opacity: shimmerOpacity }]}
                />
              </View>
            ))}
          </View>

          {/* Skeleton: food items card */}
          <Animated.View
            style={[styles.skelCard, { opacity: shimmerOpacity }]}
          >
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skelFoodRow}>
                <Animated.View
                  style={[styles.skelBar, { width: 40, height: 40, borderRadius: 8 }]}
                />
                <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
                  <View style={[styles.skelBar, { width: "70%", height: 12 }]} />
                  <View style={[styles.skelBar, { width: "45%", height: 10 }]} />
                </View>
                <View style={[styles.skelBar, { width: 50, height: 14 }]} />
              </View>
            ))}
          </Animated.View>

          {/* Skeleton: log button */}
          <Animated.View
            style={[styles.skelBar, { width: "100%", height: 48, borderRadius: 24, marginTop: 16, opacity: shimmerOpacity }]}
          />
        </View>
      </View>
    );
  }

  // Results view - Add comprehensive null checks
  if (!scanResults) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
        ]}
      >
        <LinearGradient
          colors={["#ff7675", "#fd79a8"]}
          style={styles.gradientContainer}
        >
          <View style={styles.centerContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={64} color="#fff" />
            </View>
            <Text style={styles.permissionText}>No scan results available</Text>
            <Text style={styles.permissionSubText}>
              Something went wrong during the analysis
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
              <LinearGradient
                colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
                style={styles.buttonGradient}
              >
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const isLogDisabled = (() => {
    const items = scanResults?.items;
    if (!items || items.length === 0) return true;
    return items.every(
      (item) => !item.name || item.name.trim().toLowerCase() === "unknown",
    );
  })();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {xpRewardVisible ? (
        <GrainConfettiAnimation numberOfPieces={150} xpPoints={xpAmount} />
      ) : null}

      {/* Floating back arrow (visible before scroll) */}
      <Animated.View
        style={[
          styles.resultsBackArrow,
          { top: insets.top + 10, opacity: resultsBackArrowOpacity },
        ]}
      >
        <TouchableOpacity onPress={() => router.push("/client/home")}>
          <View style={styles.resultsBackArrowBg}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Animated header (visible after scroll) */}
      <Animated.View
        style={[
          styles.resultsAnimatedHeader,
          { paddingTop: insets.top, opacity: resultsHeaderOpacity },
        ]}
      >
        <TouchableOpacity
          style={styles.resultsAnimatedHeaderBack}
          onPress={() => router.push("/client/home")}
        >
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.resultsAnimatedHeaderTitle}>Snap Results</Text>
        <View style={{ width: 32 }} />
      </Animated.View>

      <Animated.ScrollView
        style={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: resultsScrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* Full-screen food image */}
        <View style={[styles.resultsHeroImage, { height: resultsImageHeight }]}>
          <Image
            source={{ uri: capturedImage?.uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>

        {/* White content card below image */}
        <View style={styles.resultsContentCard}>
          {/* Dish heading - use primary_food from backend */}
          <Text style={styles.resultsDishTitle}>
            {cleanFoodName(scanResults?.primary_food) || "Scanned Food"}
          </Text>

          {/* Calories inline row with meal badge */}
          {scanResults?.totals && (
            <View style={styles.newCaloriesRow}>
              <Text style={styles.newCaloriesFire}>🔥</Text>
              <Text style={styles.newCaloriesNumber}>
                {scanResults.totals.calories || 0}
              </Text>
              <Text style={styles.newCaloriesUnit}> kcal</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.resultsMealBadge}
                onPress={() => setShowMealDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.resultsMealBadgeText}>{activeMealTab}</Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color="#fff"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              <Modal
                visible={showMealDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMealDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.mealDropdownOverlay}
                  activeOpacity={1}
                  onPress={() => setShowMealDropdown(false)}
                >
                  <View style={styles.mealDropdownMenu}>
                    {MEAL_TABS.map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.mealDropdownItem,
                          activeMealTab === tab &&
                            styles.mealDropdownItemActive,
                        ]}
                        onPress={() => {
                          setActiveMealTab(tab);
                          setShowMealDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.mealDropdownItemText,
                            activeMealTab === tab &&
                              styles.mealDropdownItemTextActive,
                          ]}
                        >
                          {tab}
                        </Text>
                        {activeMealTab === tab && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#00801D"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          )}

          {/* Macro + Micro card */}
          {scanResults?.totals && (
            <View style={styles.newNutriCard}>
              {/* Primary macros: Protein / Carbs / Fat rings */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginVertical: 4,
                }}
              >
                {SCAN_PRIMARY_MACROS.map((m) => (
                  <ScanMacroCircle
                    key={m.key}
                    value={scanResults.totals[m.key] || 0}
                    fill={m.fill}
                    bg={m.bg}
                    label={m.label}
                  />
                ))}
              </View>

              {/* Expandable: Fiber / Sugar / Calcium / Sodium */}
              <TouchableOpacity
                style={styles.macroExpandRow}
                onPress={() => setMacrosExpanded((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={styles.macroExpandLabel}>
                  View Macros & Micronutrients
                </Text>
                <Ionicons
                  name={macrosExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#555"
                />
              </TouchableOpacity>

              {macrosExpanded && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    paddingBottom: 4,
                  }}
                >
                  {SCAN_SECONDARY_ITEMS.map((item) => {
                    const value = item.isMicro
                      ? scanResults.micro_nutrients?.[item.key] || 0
                      : scanResults.totals[item.key] || 0;
                    return (
                      <ScanFullCircle
                        key={item.key}
                        value={value}
                        fill={item.fill}
                        bg={item.bg}
                        unit={item.unit}
                        label={item.label}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Food Items list - only show if there are multiple items with nutrition */}
          {scanResults?.items && scanResults.items.length > 0 && (
            <>
              <View style={styles.resultsFoodItemsHeader}>
                <Text style={styles.resultsFoodItemsTitle}>Food items</Text>
                <Text style={styles.resultsFoodItemsCount}>
                  {scanResults.items.length} items
                </Text>
              </View>

              <View style={styles.resultsFoodItemsCard}>
                {scanResults.items.map((item, index) => (
                  <View
                    key={item.id ?? index}
                    style={[
                      styles.resultsFoodItem,
                      index === scanResults.items.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.resultsFoodItemLeft}>
                      <Text style={styles.resultsFoodItemName}>
                        {cleanFoodName(item.name || item)}
                      </Text>
                      <Text style={styles.resultsFoodItemCal}>
                        {item.calories || 0} kcal
                      </Text>
                    </View>
                    <View style={styles.resultsFoodItemActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenEditItemModal(item)}
                        style={{ paddingHorizontal: 6 }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#bbb"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteFoodItem(item)}
                        style={{ paddingHorizontal: 6 }}
                      >
                        <Ionicons name="trash-outline" size={20} color="#bbb" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Anything missing? */}
          <View style={styles.resultsAddMissingCard}>
            <Text style={styles.resultsAddMissingText}>Anything missing?</Text>
            <TouchableOpacity
              onPress={handleEditItems}
              style={styles.resultsAddItemBtn}
            >
              <Text style={styles.resultsAddItemBtnText}>+ Add item</Text>
            </TouchableOpacity>
          </View>

          {/* AI Coach Insights - chat bubble */}
          {scanResults?.insights && scanResults.insights.length > 0 && (
            <View style={styles.resultsAiCoachRow}>
              {/* Avatar with sparkle */}
              <View style={styles.resultsAiCoachAvatarWrap}>
                <Image
                  source={require("../../../assets/images/home/ai.png")}
                  style={styles.resultsAiCoachAvatar}
                  contentFit="contain"
                />
              </View>

              {/* Bubble */}
              <View style={styles.resultsAiCoachBubble}>
                {/* Triangle pointer */}
                <View style={styles.resultsAiCoachBubbleTail} />
                <Text style={styles.resultsAiCoachTitle}>Your AI Coach</Text>
                <Text style={styles.resultsAiCoachText}>
                  {scanResults?.insights.join(" ")}
                </Text>
              </View>
            </View>
          )}

          {/* Burn this before it turns into fat */}
          <BurnClassCarousel router={router} nearbySessions={nearbySessions} />

          {/* ── Diet Plan Section Heading ── */}
          {nutrition_purchased !== "true" && (
            <View style={styles.promoSectionHeader}>
              <LinearGradient
                colors={["#EBF5FF", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.promoSectionHeaderGradient}
              >
                <Text style={styles.promoSectionHeaderText}>
                  Fix Your Diet Now!
                </Text>
              </LinearGradient>
            </View>
          )}

          {/* ── Talk to an Expert (₹199) Card ── */}
          {nutrition_purchased !== "true" && (
            <View style={styles.promo199CardWrap}>
              <View style={styles.promo199Card}>
                <Image
                  source={require("../../../assets/images/home_199_nutrition_card.webp")}
                  style={styles.promo199Image}
                  contentFit="cover"
                />
                <View style={styles.promo199Footer}>
                  <View style={styles.promo199PriceRow}>
                    <Text style={styles.promo199Price}>₹199</Text>
                    <Text style={styles.promo199Sub}> / 60 min Session</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.promo199Btn}
                    activeOpacity={0.85}
                    onPress={() => handleNutritionPurchase("nutri_basic")}
                  >
                    <Text style={styles.promo199BtnText}>
                      Talk to an Expert Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Log Food Button */}
          <TouchableOpacity
            onPress={logFood}
            style={styles.resultsLogBtn}
            disabled={isLogDisabled}
          >
            <LinearGradient
              colors={isLogDisabled ? ["#aaa", "#aaa"] : ["#007BFF", "#28A745"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resultsLogBtnGradient}
            >
              <Text style={styles.resultsLogBtnText}>Log Food</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* AI Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color="#aaa"
            />
            <Text style={styles.disclaimerText}>
              AI-generated data may contain errors.
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Premium Modal for iOS */}
      <Modal
        visible={premiumModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPremiumModalVisible(false)}>
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

      {/* Add Food Modal */}
      <Modal
        visible={addFoodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddFoodModal(false)}
      >
        <View style={styles.addFoodModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setAddFoodModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.addFoodModalContent,
              { paddingBottom: insets.bottom || 20 },
            ]}
          >
            <View style={styles.addFoodHeader}>
              <MaskedText
                bg2="#28A745"
                bg1="#007BFF"
                text="Add Food Items"
                textStyle={{ fontSize: 18, fontWeight: "700" }}
              >
                Add Food Items
              </MaskedText>
              <TouchableOpacity
                onPress={() => {
                  setAddFoodModal(false);
                  setNewFoodItems([{ name: "", quantity: "", unit: "g" }]);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.addFoodForm}
              contentContainerStyle={styles.addFoodFormContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {newFoodItems.map((item, index) => (
                <View key={index} style={styles.foodItemRow}>
                  <View style={styles.foodItemContainer}>
                    <View style={styles.foodItemHeader}>
                      <Text style={styles.foodItemNumber}>
                        Item {index + 1}
                      </Text>
                      {newFoodItems.length > 1 && (
                        <TouchableOpacity
                          onPress={() => handleRemoveFoodRow(index)}
                          style={styles.removeRowButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#dc3545"
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Food Name</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="e.g., Chicken Breast, Rice"
                        value={item.name}
                        onChangeText={(value) => {
                          setAddFoodError("");
                          handleUpdateFoodItem(index, "name", value);
                        }}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View style={styles.formRow}>
                      <View
                        style={[styles.formGroup, { flex: 1, marginRight: 8 }]}
                      >
                        <Text style={styles.formLabel}>Quantity</Text>
                        <TextInput
                          style={styles.formInput}
                          placeholder="e.g., 100"
                          value={item.quantity}
                          onChangeText={(value) =>
                            handleUpdateFoodItem(index, "quantity", value)
                          }
                          keyboardType="numeric"
                          placeholderTextColor="#999"
                        />
                      </View>

                      <View
                        style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}
                      >
                        <Text style={styles.formLabel}>Unit</Text>
                        <View style={styles.pickerWrapper}>
                          <CustomPicker
                            items={[
                              { label: "Grams (g)", value: "g" },
                              { label: "Kilograms (kg)", value: "kg" },
                              { label: "Milliliters (ml)", value: "ml" },
                              { label: "Liters (L)", value: "L" },
                              { label: "Serving", value: "serving" },
                              { label: "Cup", value: "cup" },
                              { label: "Bowl", value: "bowl" },
                              { label: "Tablespoon (tbsp)", value: "tbsp" },
                              { label: "Teaspoon (tsp)", value: "tsp" },
                              { label: "Piece", value: "piece" },
                              { label: "Ounce (oz)", value: "oz" },
                            ]}
                            value={item.unit}
                            onValueChange={(value) =>
                              handleUpdateFoodItem(index, "unit", value)
                            }
                            placeholder="Select unit"
                            style={styles.pickerStyle}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {/* Add More Item Button */}
              <TouchableOpacity
                onPress={handleAddFoodRow}
                style={styles.addMoreButton}
              >
                <LinearGradient
                  colors={["rgba(0, 123, 255, 0.1)", "rgba(40, 167, 69, 0.1)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addMoreButtonGradient}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#007BFF"
                  />
                  <Text style={styles.addMoreButtonText}>Add Another Item</Text>
                </LinearGradient>
              </TouchableOpacity>

              {!!addFoodError && (
                <Text style={styles.inlineErrorText}>{addFoodError}</Text>
              )}

              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleCancelEdit}
                  disabled={isRecalculating}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmitEditedItems}
                  disabled={isRecalculating}
                >
                  <LinearGradient
                    colors={["#007BFF", "#28A745"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.modalAddButton,
                      isRecalculating && { opacity: 0.6 },
                    ]}
                  >
                    {isRecalculating ? (
                      <>
                        <Text style={styles.modalAddButtonText}>
                          Recalculating...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.modalAddButtonText}>
                          Update {newFoodItems.length}{" "}
                          {newFoodItems.length > 1 ? "Items" : "Item"}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* Recalculating Overlay - Inside Modal */}
          {isRecalculating && (
            <View style={styles.recalculatingOverlay}>
              <View style={styles.recalculatingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.recalculatingText}>Recalculating...</Text>
                <Text style={styles.recalculatingSubText}>
                  Analyzing your food items
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Compact Edit Item Modal */}
      <Modal
        visible={editItemModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setEditItemModal({
            visible: false,
            itemId: null,
            name: "",
            quantity: "1",
            unit: "serving",
          })
        }
      >
        {Platform.OS === "ios" ? (
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <TouchableWithoutFeedback
              onPress={() =>
                setEditItemModal({
                  visible: false,
                  itemId: null,
                  name: "",
                  quantity: "1",
                  unit: "serving",
                })
              }
            >
              <View style={styles.editItemOverlay}>
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                  <View style={styles.editItemContent}>
                    <Text style={styles.editItemTitle}>Edit Food Item</Text>
                    <Text style={styles.formLabel}>Food Name</Text>
                    <TextInput
                      style={styles.editItemInput}
                      value={editItemModal.name}
                      onChangeText={(val) => {
                        setEditItemError("");
                        setEditItemModal((prev) => ({ ...prev, name: val }));
                      }}
                      placeholder="Dish name"
                      placeholderTextColor="#999"
                      autoFocus
                    />
                    <View style={[styles.formRow, { marginTop: 10 }]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.formLabel}>Quantity</Text>
                        <TextInput
                          style={styles.editItemInput}
                          value={editItemModal.quantity}
                          onChangeText={(val) =>
                            setEditItemModal((prev) => ({
                              ...prev,
                              quantity: val,
                            }))
                          }
                          placeholder="e.g., 100"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.formLabel}>Unit</Text>
                        <View style={styles.pickerWrapper}>
                          <CustomPicker
                            items={[
                              { label: "Grams (g)", value: "g" },
                              { label: "Kilograms (kg)", value: "kg" },
                              { label: "Milliliters (ml)", value: "ml" },
                              { label: "Liters (L)", value: "L" },
                              { label: "Serving", value: "serving" },
                              { label: "Cup", value: "cup" },
                              { label: "Bowl", value: "bowl" },
                              { label: "Tablespoon (tbsp)", value: "tbsp" },
                              { label: "Teaspoon (tsp)", value: "tsp" },
                              { label: "Piece", value: "piece" },
                              { label: "Ounce (oz)", value: "oz" },
                            ]}
                            value={editItemModal.unit}
                            onValueChange={(val) =>
                              setEditItemModal((prev) => ({
                                ...prev,
                                unit: val,
                              }))
                            }
                            placeholder="Select unit"
                            style={styles.pickerStyle}
                          />
                        </View>
                      </View>
                    </View>
                    {!!editItemError && (
                      <Text style={styles.inlineErrorText}>
                        {editItemError}
                      </Text>
                    )}
                    <View style={styles.editItemButtons}>
                      <TouchableOpacity
                        style={styles.editItemCancelBtn}
                        onPress={() =>
                          setEditItemModal({
                            visible: false,
                            itemId: null,
                            name: "",
                            quantity: "1",
                            unit: "serving",
                          })
                        }
                        disabled={isEditingItem}
                      >
                        <Text style={styles.editItemCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.editItemSaveBtn,
                          isEditingItem && { opacity: 0.6 },
                        ]}
                        onPress={handleSaveEditItem}
                        disabled={isEditingItem}
                      >
                        <Text style={styles.editItemSaveText}>
                          {isEditingItem ? "Saving..." : "Save"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isEditingItem && (
                      <View style={styles.recalculatingOverlay}>
                        <View style={styles.recalculatingContainer}>
                          <ActivityIndicator size="large" color="#007BFF" />
                          <Text style={styles.recalculatingText}>
                            Recalculating...
                          </Text>
                          <Text style={styles.recalculatingSubText}>
                            Analyzing your food items
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        ) : (
          <TouchableWithoutFeedback
            onPress={() =>
              setEditItemModal({
                visible: false,
                itemId: null,
                name: "",
                quantity: "1",
                unit: "serving",
              })
            }
          >
            <View style={styles.editItemOverlay}>
              <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                <View style={styles.editItemContent}>
                  <Text style={styles.editItemTitle}>Edit Food Item</Text>
                  <Text style={styles.formLabel}>Food Name</Text>
                  <TextInput
                    style={styles.editItemInput}
                    value={editItemModal.name}
                    onChangeText={(val) =>
                      setEditItemModal((prev) => ({ ...prev, name: val }))
                    }
                    placeholder="Dish name"
                    placeholderTextColor="#999"
                    autoFocus
                  />
                  <View style={[styles.formRow, { marginTop: 10 }]}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Quantity</Text>
                      <TextInput
                        style={styles.editItemInput}
                        value={editItemModal.quantity}
                        onChangeText={(val) =>
                          setEditItemModal((prev) => ({
                            ...prev,
                            quantity: val,
                          }))
                        }
                        placeholder="e.g., 100"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.formLabel}>Unit</Text>
                      <View style={styles.pickerWrapper}>
                        <CustomPicker
                          items={[
                            { label: "Grams (g)", value: "g" },
                            { label: "Kilograms (kg)", value: "kg" },
                            { label: "Milliliters (ml)", value: "ml" },
                            { label: "Liters (L)", value: "L" },
                            { label: "Serving", value: "serving" },
                            { label: "Cup", value: "cup" },
                            { label: "Bowl", value: "bowl" },
                            { label: "Tablespoon (tbsp)", value: "tbsp" },
                            { label: "Teaspoon (tsp)", value: "tsp" },
                            { label: "Piece", value: "piece" },
                            { label: "Ounce (oz)", value: "oz" },
                          ]}
                          value={editItemModal.unit}
                          onValueChange={(val) =>
                            setEditItemModal((prev) => ({ ...prev, unit: val }))
                          }
                          placeholder="Select unit"
                          style={styles.pickerStyle}
                        />
                      </View>
                    </View>
                  </View>
                  {!!editItemError && (
                    <Text style={styles.inlineErrorText}>{editItemError}</Text>
                  )}
                  <View style={styles.editItemButtons}>
                    <TouchableOpacity
                      style={styles.editItemCancelBtn}
                      onPress={() =>
                        setEditItemModal({
                          visible: false,
                          itemId: null,
                          name: "",
                          quantity: "1",
                          unit: "serving",
                        })
                      }
                      disabled={isEditingItem}
                    >
                      <Text style={styles.editItemCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editItemSaveBtn,
                        isEditingItem && { opacity: 0.6 },
                      ]}
                      onPress={handleSaveEditItem}
                      disabled={isEditingItem}
                    >
                      <Text style={styles.editItemSaveText}>
                        {isEditingItem ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {isEditingItem && (
                    <View style={styles.recalculatingOverlay}>
                      <View style={styles.recalculatingContainer}>
                        <ActivityIndicator size="large" color="#007BFF" />
                        <Text style={styles.recalculatingText}>
                          Recalculating...
                        </Text>
                        <Text style={styles.recalculatingSubText}>
                          Analyzing your food items
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        )}
      </Modal>

      {/* ── Nutrition Payment Processing Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayProcessing}
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <ActivityIndicator size="large" color="#28A745" />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#333",
                marginTop: 16,
              }}
            >
              Processing Payment
            </Text>
            {nutriPayStep ? (
              <Text style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
                {nutriPayStep}
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Nutrition Purchase Success Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPaySuccess}
        onRequestClose={() => setNutriPaySuccess(false)}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#F0FFF4",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark-circle" size={48} color="#28A745" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#28A745",
                marginTop: 12,
              }}
            >
              Purchase Successful!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Your nutrition package is active. Book your session now to get
              started!
            </Text>
            <TouchableOpacity
              style={[styles.scanNutriBtn, { marginTop: 16, width: "100%" }]}
              activeOpacity={0.85}
              onPress={() => {
                setNutriPaySuccess(false);
                router.push("/client/nutritionBooking");
              }}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanNutriBtnGradient}
              >
                <Text style={styles.scanNutriBtnText}>Book Your Slot Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 8 }}
              activeOpacity={0.7}
              onPress={() => setNutriPaySuccess(false)}
            >
              <Text style={{ color: "#888", fontSize: 14, fontWeight: "500" }}>
                I'll book later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Nutrition Purchase Failed Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayFailed}
        onRequestClose={() => setNutriPayFailed(false)}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#FFF0F0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close-circle" size={48} color="#FF5757" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#FF5757",
                marginTop: 12,
              }}
            >
              Payment Failed
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Payment could not be processed. Please try again.
            </Text>
            <TouchableOpacity
              style={[styles.scanNutriBtn, { marginTop: 16, width: "100%" }]}
              activeOpacity={0.85}
              onPress={() => setNutriPayFailed(false)}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.scanNutriBtnGradient}
              >
                <Text style={styles.scanNutriBtnText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const BurnClassCarousel = ({ router, nearbySessions = [] }) => {
  if (!nearbySessions.length) return null;

  return (
    <View style={styles.burnSection}>
      {/* Section header */}
      <View style={styles.burnHeaderRow}>
        <Text style={styles.burnHeaderIcon}>🔥</Text>
        <Text style={styles.burnHeaderTitle}>
          Burn this before it turns into fat
        </Text>
      </View>

      {/* Trending cards — same as home page */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.burnTrendingScroll}
      >
        {nearbySessions.map((item) => (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.88}
            style={styles.burnTrendingCardShadow}
            onPress={() => {
              const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
              const yyyy = now.getUTCFullYear();
              const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
              const dd = String(now.getUTCDate()).padStart(2, "0");
              const todayIST = `${yyyy}-${mm}-${dd}`;
              const params = {
                gymId: String(item.gym_id),
                gymName: item.gym_name,
                sessionId: String(item.session_id),
                sessionName: item.session_name || "",
                scheduleId: String(item.schedule_id),
                slotTime: `${item.start_time} - ${item.end_time}`,
                trainerId: item?.trainer_id ? String(item.trainer_id) : null,
                selectedDates: JSON.stringify([todayIST]),
              };
              router.push({
                pathname: item.trainer_id
                  ? "/client/(pt)/ptCheckout"
                  : "/client/(fitnessclass)/sessionCheckout",
                params,
              });
            }}
          >
            <View style={styles.burnTrendingCard}>
              <ImageBackground
                source={
                  SESSION_IMAGES[item.session_name] || DEFAULT_SESSION_IMAGE
                }
                style={styles.burnTrendingCardBg}
                imageStyle={{ borderRadius: 14 }}
                resizeMode="cover"
              >
                <View style={styles.burnTrendingCardTop}>
                  <Text style={styles.burnTrendingCardTitle}>
                    {item.session_name}
                  </Text>
                  <Text style={styles.burnTrendingCardSlots}>
                    Only Few Slots left
                  </Text>
                </View>
                <View style={styles.burnTrendingCardBottom}>
                  <View>
                    <Text style={styles.burnTrendingStartAt}>Start at</Text>
                    <View style={styles.burnTrendingTimeRow}>
                      <Ionicons
                        name="time-outline"
                        size={13}
                        color="#FF5757"
                        style={styles.burnTrendingTimeIcon}
                      />
                      <Text style={styles.burnTrendingTime}>
                        {item.start_time}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.burnTrendingPricePill}>
                    <Text style={styles.burnTrendingPriceText}>
                      ₹{item.price} only
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ── Circular arc path helper ──
function createArc(pct, r, cx, cy) {
  const safe = isNaN(pct) || pct < 0 ? 0 : Math.min(pct, 0.9999995);
  if (safe === 0) return "";
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + safe * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = safe > 0.5 ? 1 : 0;
  if (safe >= 0.9999995) {
    const mid = cx + r * Math.cos(startAngle + Math.PI);
    const midY = cy + r * Math.sin(startAngle + Math.PI);
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${mid} ${midY} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
  }
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const SCAN_PRIMARY_MACROS = [
  { key: "protein_g", label: "Protein", fill: "#5AB228", bg: "#F6FFF5" },
  { key: "carbs_g", label: "Carbs", fill: "#FFB200", bg: "#FEF6EB" },
  { key: "fat_g", label: "Fat", fill: "#EB0E13", bg: "#FEF0EF" },
];

const SCAN_SECONDARY_ITEMS = [
  { key: "fibre_g", label: "Fiber", fill: "#eee", bg: "#F6FFF5" },
  {
    key: "sugar_g",
    label: "Sugar",
    fill: "#eee",
    bg: "rgba(255,191,213,0.10)",
  },
  {
    key: "calcium_mg",
    label: "Calcium",
    fill: "#eee",
    bg: "rgba(162,206,255,0.10)",
    unit: "mg",
    isMicro: true,
  },
  {
    key: "sodium_mg",
    label: "Sodium",
    fill: "#eee",
    bg: "rgba(235,174,132,0.10)",
    unit: "mg",
    isMicro: true,
  },
];

// Primary macro ring with arc progress
function ScanMacroCircle({ value, fill, bg, label }) {
  const SIZE = 86;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 1;
  const R = (SIZE - STROKE) / 2 - 1;
  // Always show full ring (no target in scan context)
  const pct = 0.9999995;

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke="#EDEDED"
            strokeWidth={STROKE}
            fill={bg}
          />
          {/* <Path
            d={createArc(pct, R, CX, CY)}
            stroke={fill}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          /> */}
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#111" }}>
            {Math.round(value)}g
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#1A1A1A",
          marginTop: 5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Secondary item full ring (always 100% filled)
function ScanFullCircle({ value, fill, bg, unit, label }) {
  const SIZE = 68;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const STROKE = 1;
  const R = (SIZE - STROKE) / 2 - 1;

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={fill}
            strokeWidth={STROKE}
            fill={bg}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SIZE,
            height: SIZE,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: "#111" }}>
            {Math.round(value)}
            {unit ?? "g"}
          </Text>
        </View>
      </View>
      <Text
        style={{ fontSize: 11, fontWeight: "500", color: "#555", marginTop: 5 }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  gradientContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  cameraIcon: {
    width: 150,
    height: 150,
    borderRadius: 70,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  permissionText: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff",
    marginBottom: 12,
  },
  permissionSubText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  launchingText: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    color: "#fff",
    marginBottom: 12,
  },
  launchingSubText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 10,
    gap: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  manualCaptureButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  manualCaptureText: {
    color: "#28A745",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backButtonText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingDots: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  scanningContainer: {
    flex: 1,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  scanningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerLine: {
    position: "absolute",
    width: width * 0.99,
    height: 3,
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  scanTextContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: height * 0.5,
    position: "relative",
  },
  kyraAISparkle: {
    position: "absolute",
    top: 0,
    right: width * 0.06,
    zIndex: 2,
  },
  kyraAIText: {
    fontSize: 48,
    fontWeight: "900",
    textAlign: "center",
  },
  analyzingText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.9,
    fontWeight: "500",
  },

  // ─── Scanning redesign ─────────────────────────────────
  scanTopSection: {
    height: "40%",
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  scanTopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanAiContainer: {
    width: 110,
    height: 110,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scanArcLayer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scanAiIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00BC7D",
    justifyContent: "center",
    alignItems: "center",
  },
  scanTopTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  scanTopSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },
  scanBottomSection: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skelBar: {
    backgroundColor: "#E8E8E8",
    borderRadius: 6,
  },
  skelMacroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 16,
  },
  skelMacroItem: {
    alignItems: "center",
  },
  skelCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8E8E8",
  },
  skelCard: {
    backgroundColor: "#F6F6F6",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    gap: 14,
  },
  skelFoodRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  resultsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  mealCategoryText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  imagePreview: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: "100%",
    height: width >= 786 ? 350 : 200,
  },
  detectedFoodsSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  macroNutrientsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionGradientBackground: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  macroSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 22,
    height: 22,
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  foodTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },
  foodTagWrapper: {
    borderRadius: 8,
    overflow: "hidden",
  },
  foodTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tickIcon: {
    width: 12,
    height: 12,
    marginRight: 6,
  },
  foodTagText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  caloriesCard: {
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  caloriesContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  calorieIcon: {
    width: 24,
    height: 24,
    marginRight: 4,
  },
  arrowIcon: {
    width: 20,
    height: 20,
  },
  caloriesNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  caloriesLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  macroItemsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroNutrientItem: {
    alignItems: "center",
    flex: 1,
  },
  macroIcon: {
    width: 24,
    height: 24,
    marginBottom: 6,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: "#666",
  },
  // Micronutrients styles
  micronutrientsSection: {
    marginTop: 16,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  micronutrientsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    marginLeft: 12,
  },
  micronutrientsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  microItem: {
    alignItems: "center",
    flex: 1,
  },
  microValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  microValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  microUnit: {
    fontSize: 10,
    color: "#666",
    marginLeft: 2,
  },
  microLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  // Insights Section Styles
  insightsSection: {
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 16,
  },
  insightsSectionGradient: {
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  insightIcon: {
    width: 24,
    height: 24,
  },
  insightsContent: {
    gap: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  insightBullet: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  logFoodButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logFoodText: {
    color: "#007BFF",
    fontSize: 16,
    fontWeight: "600",
  },
  extraLarge: {
    width: 32,
  },
  // iOS Premium Animation Styles
  iosPremiumOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  iosScannerLine: {
    position: "absolute",
    width: width * 0.8,
    height: 2,
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    borderRadius: 1,
  },
  iosBreathingCard: {
    backgroundColor: "rgba(20,20,30,0.95)",
    paddingHorizontal: 50,
    paddingVertical: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.3)",
    overflow: "hidden",
  },
  iosShimmerOverlay: {
    position: "absolute",
    top: 0,
    left: -50,
    width: 100,
    height: "100%",
    backgroundColor: "rgba(0,122,255,0.2)",
    transform: [{ skewX: "-20deg" }],
  },
  iosTitleContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  iosPremiumTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: "rgba(0,122,255,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  iosGlowLine: {
    width: 60,
    height: 3,
    backgroundColor: "#007AFF",
    borderRadius: 2,
    marginTop: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  iosPremiumSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 30,
    textAlign: "center",
    fontWeight: "500",
  },
  iosSequentialDots: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  iosSequentialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  iosProgressContainer: {
    width: 200,
    height: 4,
    backgroundColor: "rgba(0,122,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  iosProgressBar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  // iOS-specific simple scanning styles (keeping for backup)
  iosSimpleOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  iosLoadingContainer: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 40,
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iosAnalyzingTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007BFF",
    marginBottom: 8,
  },
  iosAnalyzingSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  iosLoadingDots: {
    flexDirection: "row",
    gap: 8,
  },
  iosStaticDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#28A745",
    opacity: 0.8,
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
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingTop: 0,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
    lineHeight: 14,
    textAlign: "center",
  },
  // Food management styles
  foodActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  editItemOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  editItemContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: width * 0.82,
  },
  editItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 14,
  },
  editItemInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 15,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#F9F9F9",
    marginBottom: 18,
  },
  editItemButtons: {
    flexDirection: "row",
    gap: 10,
  },
  editItemCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  editItemCancelText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  editItemSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#007BFF",
    alignItems: "center",
  },
  editItemSaveText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
  inlineErrorText: {
    color: "#dc3545",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  editButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  editButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
  },
  addButton: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#28A745",
  },
  detectionNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  detectionNote: {
    fontSize: 14,
    color: "#666",
  },
  removeIconWrapper: {
    marginRight: 6,
  },
  // Add Food Modal styles
  addFoodModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  addFoodModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    height: height * 0.85,
  },
  addFoodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  addFoodForm: {
    flex: 1,
  },
  addFoodFormContent: {
    padding: 20,
    paddingBottom: 300, // Extra padding to allow scrolling above keyboard
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#F9F9F9",
    height: 50,
  },
  formRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#F9F9F9",
    overflow: "hidden",
    height: 50,
    justifyContent: "center",
  },
  pickerStyle: {
    backgroundColor: "transparent",
    borderWidth: 0,
    fontSize: 15,
    minHeight: 50,
    paddingVertical: 0,
  },
  modalButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  modalAddButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  modalAddButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  // Multiple food items styles
  foodItemRow: {
    marginBottom: 16,
    marginTop: 10,
  },
  foodItemContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  foodItemNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007BFF",
  },
  removeRowButton: {
    padding: 4,
  },
  addMoreButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  addMoreButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  addMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007BFF",
  },
  // Recalculating overlay styles
  recalculatingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  recalculatingContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  recalculatingText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  recalculatingSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },

  // ── In-app camera ──────────────────────────────────────────
  cameraBackBtn: {
    position: "absolute",
    left: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  cameraOverlayTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  cameraOverlayMiddle: {
    flexDirection: "row",
    height: width * 0.96,
  },
  cameraOverlaySide: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  cameraViewfinder: {
    width: width * 0.85,
    height: width * 0.96,
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#fff",
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  cameraOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  cameraLabelContainer: {
    position: "absolute",
    bottom: 140,
    right: "22%",
    alignItems: "center",
  },
  cameraLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },

  // Info modal
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoModalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    width: "100%",
    alignItems: "center",
  },
  infoModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
    textAlign: "center",
  },
  infoModalSubtitle: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 18,
    textAlign: "center",
  },
  infoImgRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  infoImgCol: {
    flex: 1,
    alignItems: "center",
  },
  infoImgWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  infoImg: {
    width: "100%",
    height: "100%",
  },
  infoIconBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTickBadge: {
    backgroundColor: "#28A745",
  },
  infoCrossBadge: {
    backgroundColor: "#DC3545",
  },
  infoImgCaption: {
    marginTop: 6,
    fontSize: 12,
    color: "#555555",
    fontWeight: "500",
  },
  infoDotRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
  },
  infoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D0D0D0",
  },
  infoDotActive: {
    backgroundColor: "#007BFF",
    width: 18,
  },
  infoNextBtn: {
    width: "100%",
    borderRadius: 26,
    overflow: "hidden",
  },
  infoNextBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  infoNextBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  cameraMealTabs: {
    position: "absolute",
    bottom: 170,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    marginHorizontal: 20,
    borderRadius: 30,
    paddingVertical: 0,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  cameraMealTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 26,
  },
  cameraMealTabActive: {
    overflow: "hidden",
    borderRadius: 26,
  },
  cameraMealTabGradient: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 26,
    paddingHorizontal: 8,
  },
  cameraMealTabText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  cameraMealTabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  cameraBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cameraActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#fff",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── New results view styles ──────────────────────────────────────
  resultsBackArrow: {
    position: "absolute",
    left: 16,
    zIndex: 100,
  },
  resultsBackArrowBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultsAnimatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  resultsAnimatedHeaderBack: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsAnimatedHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  resultsAnimatedHeaderRight: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsHeroImage: {
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  resultsMealBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00801D",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "center",
  },
  resultsMealBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  mealDropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  mealDropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 200,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  mealDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mealDropdownItemActive: {
    backgroundColor: "#f0faf2",
  },
  mealDropdownItemText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  mealDropdownItemTextActive: {
    color: "#00801D",
    fontWeight: "700",
  },
  resultsContentCard: {
    backgroundColor: "#fff",
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  resultsDishTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  resultsDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  resultsFoodItemsCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  resultsAddMissingCard: {
    // borderWidth: 1.5,
    // borderColor: "#ddd",
    // borderStyle: "dashed",
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  resultsAddMissingText: {
    fontSize: 13,
    color: "#999",
  },
  resultsAddItemBtn: {
    borderWidth: 1,
    borderColor: "#28A745",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 30,
  },
  resultsAddItemBtnText: {
    fontSize: 14,
    color: "#28A745",
  },
  resultsFoodItemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultsFoodItemsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  resultsFoodItemsCount: {
    fontSize: 13,
    color: "#888",
  },
  resultsFoodItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  resultsFoodItemLeft: {
    flex: 1,
  },
  resultsFoodItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
    marginBottom: 2,
  },
  resultsFoodItemCal: {
    fontSize: 12,
    color: "#888",
  },
  resultsFoodItemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultsFoodItemActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  resultsAiCoachRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  resultsAiCoachAvatarWrap: {
    width: 52,
    height: 52,
    marginRight: 8,
    position: "relative",
  },
  resultsAiCoachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  resultsAiCoachSparkle: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 2,
  },
  resultsAiCoachBubble: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  resultsAiCoachBubbleTail: {
    position: "absolute",
    left: -8,
    top: 14,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#fff",
  },
  resultsAiCoachTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  resultsAiCoachText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },
  // Calories inline + nutrient card
  newCaloriesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  newCaloriesFire: {
    fontSize: 30,
    marginRight: 4,
    lineHeight: 46,
  },
  newCaloriesNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#1a1a1a",
    lineHeight: 56,
  },
  newCaloriesUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginLeft: 4,
  },
  newNutriCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ebebeb",
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    paddingHorizontal: 8,
  },
  macroExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 12,
  },
  macroExpandLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    paddingHorizontal: 8,
  },
  newMicroSection: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
  newMicroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  newMicroTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginRight: 10,
  },
  newMicroDivider: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  newMicroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  newMicroItem: {
    alignItems: "flex-start",
  },
  newMicroValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
  },
  newMicroUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#888",
  },
  newMicroLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  // ── Burn class carousel ────────────────────────────────────────────────────
  burnSection: {
    backgroundColor: "#F2F8FF",
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 16,
    marginHorizontal: -20,
    overflow: "hidden",
  },
  burnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  burnHeaderIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  burnHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
  },
  burnTrendingScroll: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 10,
  },
  burnTrendingCardShadow: {
    width: (width - 20 - 10) / 2,
    borderRadius: 14,
    borderLeftWidth: 0.5,
    borderColor: "#ddd",
  },
  burnTrendingCard: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },
  burnTrendingCardBg: {
    width: "100%",
    height: Math.round(((width - 32 - 10) / 2) * 0.7),
    justifyContent: "space-between",
  },
  burnTrendingCardTop: {
    zIndex: 1,
    paddingTop: 10,
    paddingLeft: 10,
  },
  burnTrendingCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000000",
    marginBottom: 2,
  },
  burnTrendingCardSlots: {
    fontSize: 11,
    color: "rgba(0,0,0,0.85)",
  },
  burnTrendingCardBottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    zIndex: 1,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
  },
  burnTrendingStartAt: {
    fontSize: 11,
    color: "rgba(0,0,0,0.85)",
    marginBottom: 2,
  },
  burnTrendingTimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  burnTrendingTimeIcon: {
    marginRight: 3,
  },
  burnTrendingTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5757",
  },
  burnTrendingPricePill: {
    borderWidth: 1,
    borderColor: "#FF5757",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  burnTrendingPriceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF5757",
  },
  resultsLogBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  resultsLogBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  resultsLogBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resultsRescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginBottom: 8,
  },
  resultsRescanText: {
    fontSize: 14,
    color: "#007BFF",
    fontWeight: "600",
  },
  // ── Diet Plan Section Heading ──
  promoSectionHeader: {
    marginHorizontal: -20,
    marginBottom: ps(15),
  },
  promoSectionHeaderGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  promoSectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "left",
  },

  // ── Talk to Expert (₹199) Card ──
  promo199CardWrap: {
    marginHorizontal: -8,
    marginBottom: ps(16),
  },
  promo199Card: {
    height: ps(312),
    borderRadius: ps(14),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#E5E5E5",
  },
  promo199Image: {
    width: "100%",
    aspectRatio: 1024 / 576,
  },
  promo199Footer: {
    flex: 1,
    paddingHorizontal: ps(16),
    paddingTop: ps(10),
    paddingBottom: ps(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F6F7",
  },
  promo199PriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ps(10),
  },
  promo199Price: {
    fontSize: ps(28),
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: ps(32),
  },
  promo199Sub: {
    fontSize: ps(13),
    color: "#666",
    marginBottom: ps(4),
  },
  promo199Btn: {
    width: ps(200),
    height: ps(34),
    backgroundColor: "#FF5757",
    borderRadius: ps(10),
    alignItems: "center",
    justifyContent: "center",
  },
  promo199BtnText: {
    color: "#fff",
    fontSize: ps(15),
    fontWeight: "700",
  },

  // ── Scan Results Diet Plan Promo Card ──
  scanNutriCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 16,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
  },
  scanNutriCardHeader: {
    backgroundColor: "#F4FAFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: "center",
  },
  scanNutriCardHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  scanNutriCardHeaderSub: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginTop: 3,
  },
  scanNutriCardBody: {
    backgroundColor: "#F4FAFF",
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D9ECFF",
    overflow: "visible",
  },
  scanNutriCardBodyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  scanNutriSaveBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    backgroundColor: "#FF6900",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  scanNutriSaveBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scanNutriBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scanNutriCardBodyLeft: {
    flex: 1,
  },
  scanNutriBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  scanNutriBulletText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    flex: 1,
  },
  scanNutriCardFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: "center",
  },
  scanNutriPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  scanNutriPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  scanNutriPriceOld: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 6,
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  scanNutriBtn: {
    borderRadius: 30,
    overflow: "hidden",
    width: "80%",
    marginBottom: 10,
  },
  scanNutriBtnGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 30,
  },
  scanNutriBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  scanNutriTrustedText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },
});

export default SimpleFoodScanner;
