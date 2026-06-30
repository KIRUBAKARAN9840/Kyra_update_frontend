import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  BackHandler,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Color } from "../../GlobalStyles";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import { LinearGradient } from "expo-linear-gradient";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { shapeAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const { width } = Dimensions.get("window");

const BodyShapeTarget = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedTargetShapeId, setSelectedTargetShapeId] = useState(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const insets = useSafeAreaInsets();
  // Animation ref
  const translateX = useRef(new Animated.Value(0)).current;

  const {
    fullName,
    gender,
    height,
    weight,
    targetWeight,
    currentBodyShapeId,
    currentBodyShapeCheckId,
    goals,
  } = params;

  // Goal-based shape arrays (same as in body-shape-current)
  const femaleShapesWeightGain = [
    {
      id: "F7",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F7.png",
      check_id: 1,
    },

    {
      id: "F6",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F6.png",
      check_id: 2,
    },
    {
      id: "F4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F4.png",
      check_id: 4,
    },
    {
      id: "F5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F5.png",
      check_id: 3,
    },
  ];

  const femaleShapesWeightLoss = [
    {
      id: "F1",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F1.png",
      check_id: 1,
    },
    {
      id: "F2",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F2.png",
      check_id: 2,
    },
    {
      id: "F3",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F3.png",
      check_id: 3,
    },
    {
      id: "F4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F4.png",
      check_id: 4,
    },
    {
      id: "F5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F5.png",
      check_id: 5,
    },
  ];

  const maleShapesWeightGain = [
    {
      id: "M7",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M7.png",
      check_id: 1,
    },
    {
      id: "M6",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M6.png",
      check_id: 2,
    },
    {
      id: "M3",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M3.png",
      check_id: 3,
    },

    {
      id: "M4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M4.png",
      check_id: 5,
    },
    {
      id: "M5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M5.png",
      check_id: 4,
    },
  ];

  const maleShapesWeightLoss = [
    {
      id: "M1",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M1.png",
      check_id: 1,
    },
    {
      id: "M2",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M2.png",
      check_id: 2,
    },
    {
      id: "M3",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M3.png",
      check_id: 3,
    },
    {
      id: "M4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M4.png",
      check_id: 4,
    },
    {
      id: "M5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M5.png",
      check_id: 5,
    },
  ];

  const femaleShapesBodyRecomposition = [
    {
      id: "F4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F4.png",
      check_id: 1,
    },
    {
      id: "F5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F5.png",
      check_id: 2,
    },

    {
      id: "F6",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F6.png",
      check_id: 3,
    },
  ];

  const maleShapesBodyRecomposition = [
    {
      id: "M4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M4.png",
      check_id: 1,
    },
    {
      id: "M5",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M5.png",
      check_id: 2,
    },
    {
      id: "M6",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M6.png",
      check_id: 3,
    },
  ];

  // Get all shapes for the goal
  const getAllShapesForGoal = () => {
    // Safe gender check with fallback
    const isFemale = gender?.toLowerCase() === "female";

    // Safe goals check with fallback
    const safeGoals = goals?.toLowerCase();

    if (safeGoals === "weight_gain") {
      return isFemale ? femaleShapesWeightGain : maleShapesWeightGain;
    } else if (safeGoals === "weight_loss") {
      return isFemale ? femaleShapesWeightLoss : maleShapesWeightLoss;
    } else if (safeGoals === "maintain") {
      return isFemale
        ? femaleShapesBodyRecomposition
        : maleShapesBodyRecomposition;
    }

    // Default fallback for invalid/undefined goals
    return isFemale ? femaleShapesWeightLoss : maleShapesWeightLoss;
  };

  const allShapes = getAllShapesForGoal();

  // Filter shapes based on current check_id
  const getTargetShapes = () => {
    // Safety check: ensure allShapes is valid
    if (!allShapes || allShapes.length === 0) {
      return [];
    }

    const currentCheckId = parseInt(currentBodyShapeCheckId);

    if (goals === "maintain") {
      // For body recomposition, always show only check_id 2
      const filtered = allShapes.filter((shape) => shape.check_id === 2);
      // Fallback: if no shapes with check_id 2, return all shapes
      return filtered.length > 0 ? filtered : allShapes;
    }

    // If currentCheckId is NaN or invalid, return all shapes except the first one
    if (isNaN(currentCheckId) || !currentBodyShapeCheckId) {
      return allShapes.length > 1 ? allShapes.slice(1) : allShapes;
    }

    if (goals === "weight_gain") {
      // For weight gain, show shapes with check_id > current check_id
      const filtered = allShapes.filter((shape) => shape.check_id > currentCheckId);
      // Fallback: if no shapes found, return all shapes except first
      return filtered.length > 0 ? filtered : (allShapes.length > 1 ? allShapes.slice(1) : allShapes);
    } else if (goals === "weight_loss") {
      // For weight loss, show shapes with check_id > current check_id
      const filtered = allShapes.filter((shape) => shape.check_id > currentCheckId);
      // Fallback: if no shapes found, return all shapes except first
      return filtered.length > 0 ? filtered : (allShapes.length > 1 ? allShapes.slice(1) : allShapes);
    }

    return allShapes;
  };

  const shapes = getTargetShapes();

  // Calculate dynamic spacing based on number of shapes
  const numShapes = shapes.length;
  const containerWidth = width * 0.7;
  const dotSpacing = numShapes > 1 ? containerWidth / (numShapes - 1) : 0;
  const startOffset =
    numShapes === 1 ? width / 2 : (width - containerWidth) / 2;
  const maxTranslate = numShapes > 1 ? dotSpacing * (numShapes - 1) : 0;

  // Find current selected shape for display from all shapes
  // First try to find by ID
  let currentShape = allShapes.find((shape) => shape.id === currentBodyShapeId);

  // If not found (e.g., when switching goals), try to find by check_id
  if (!currentShape && currentBodyShapeCheckId) {
    const checkId = parseInt(currentBodyShapeCheckId);
    if (!isNaN(checkId)) {
      currentShape = allShapes.find((shape) => shape.check_id === checkId);
    }
  }

  // If still not found, use the first shape from allShapes
  if (!currentShape && allShapes.length > 0) {
    currentShape = allShapes[0];
  }

  useEffect(() => {
    // Reset and recalculate when goals or currentBodyShapeCheckId changes
    if (shapes.length > 0) {
      // Always reset to first shape when dependencies change
      setSelectedTargetShapeId(shapes[0].id);
      setCurrentShapeIndex(0);
      updateDotPosition(0);
    } else {
      // Safety: reset state if no shapes available
      setSelectedTargetShapeId(null);
      setCurrentShapeIndex(0);
    }
  }, [goals, currentBodyShapeCheckId, shapes.length]);

  const updateDotPosition = (index) => {
    const position = index * dotSpacing;
    Animated.spring(translateX, {
      toValue: position,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Handle hardware back button - go back to body-shape-current
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push({
          pathname: "/client/home",
          params: { tab: params.tab || "My Progress" },
        });
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => backHandler.remove();
    }, [params, router])
  );

  const handleContinue = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found",
        });
        return;
      }

      const payload = {
        client_id: clientId,
        current_body_shape_id: currentBodyShapeId,
        target_body_shape_id: selectedTargetShapeId,
      };

      const response = await shapeAPI(payload);

      if (response?.status === 200) {
        router.push({
          pathname: "/register/sixth-step",
          params: {
            ...params,
            currentBodyShapeId: currentBodyShapeId,
            targetBodyShapeId: selectedTargetShapeId,
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save body shape",
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

  const handleDotPress = (index) => {
    // Safety check: ensure index is valid
    if (index >= 0 && index < shapes.length && shapes[index]) {
      setCurrentShapeIndex(index);
      setSelectedTargetShapeId(shapes[index].id);
      updateDotPosition(index);
    }
  };

  const handlePrevious = () => {
    if (currentShapeIndex > 0 && shapes.length > 0) {
      const newIndex = currentShapeIndex - 1;
      if (newIndex >= 0 && shapes[newIndex]) {
        setCurrentShapeIndex(newIndex);
        setSelectedTargetShapeId(shapes[newIndex].id);
        updateDotPosition(newIndex);
      }
    }
  };

  const handleNext = () => {
    if (currentShapeIndex < shapes.length - 1 && shapes.length > 0) {
      const newIndex = currentShapeIndex + 1;
      if (newIndex < shapes.length && shapes[newIndex]) {
        setCurrentShapeIndex(newIndex);
        setSelectedTargetShapeId(shapes[newIndex].id);
        updateDotPosition(newIndex);
      }
    }
  };

  const handleGoBack = () => {
    router.push({
      pathname: "/register/body-shape-current",
      params: {
        ...params,
        targetBodyShapeId: selectedTargetShapeId,
      },
    });
  };

  return (
    <LinearGradient
      style={{ flex: 1, width: "100%", height: "100%" }}
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
    >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.push({
                pathname: "/client/home",
                params: { tab: params.tab || "My Progress" },
              })
            }
          >
            <Feather name="arrow-left" size={24} color="#FF5757" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Select Your Desired <Text style={styles.highlightText}>Shape</Text>
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
          {currentShape && (
            <View style={styles.transformationContainer}>
              {/* Left Arrow */}
              {currentShapeIndex > 0 && (
                <TouchableOpacity
                  style={styles.leftNavArrow}
                  onPress={handlePrevious}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-left" size={32} color="#FF5757" />
                </TouchableOpacity>
              )}

              <View style={styles.transformationItem}>
                <Text style={styles.transformationLabel}>Current</Text>
                <Image
                  source={{ uri: currentShape.imageUrl }}
                  style={styles.transformationImage}
                  contentFit="contain"
                  transition={200}
                  onError={(error) => {
                    console.warn("Failed to load current shape image:", error);
                  }}
                />
              </View>

              <View style={styles.arrowContainer}>
                <Image
                  source={require("../../assets/images/arrow.png")}
                  style={styles.arrowImage}
                  contentFit="contain"
                />
              </View>

              <View style={styles.transformationItem}>
                <Text style={styles.transformationLabel}>Target</Text>

                {shapes[currentShapeIndex] ? (
                  <Image
                    source={{ uri: shapes[currentShapeIndex].imageUrl }}
                    style={styles.transformationImage}
                    contentFit="contain"
                    transition={200}
                    onError={(error) => {
                      console.warn("Failed to load target shape image:", error);
                    }}
                  />
                ) : (
                  <View style={styles.noShapeContainer}>
                    <Text style={styles.noShapeText}>No target shape available</Text>
                  </View>
                )}
              </View>

              {/* Right Arrow */}
              {currentShapeIndex < shapes.length - 1 && (
                <TouchableOpacity
                  style={styles.rightNavArrow}
                  onPress={handleNext}
                  activeOpacity={0.7}
                >
                  <Feather name="chevron-right" size={32} color="#FF5757" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.dotsContainer}>
            {/* Background track for dots */}
            <View style={styles.dotTrack} />

            {/* Static dots */}
            {shapes.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.dot, { left: startOffset + index * dotSpacing }]}
                onPress={() => handleDotPress(index)}
              />
            ))}

            {/* Selected dot */}
            <Animated.View
              style={[
                styles.selectedDot,
                {
                  position: "absolute",
                  left: startOffset,
                  transform: [{ translateX: translateX }],
                },
              ]}
            />
          </View>

          <ContinueButton
            handleSubmit={handleContinue}
            text="Continue"
            isValid={selectedTargetShapeId !== null}
          />
        </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginHorizontal: 10,
  },
  highlightText: {
    color: "#FF5757",
  },
  headerSpacer: {
    width: 34,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 20,
  },
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 0,
    marginTop: 10,
  },
  bodyShapeImage: {
    width: width * 0.6,
    height: width * 0.7,
    maxHeight: 400,
  },
  dotsContainer: {
    height: 55,
    marginVertical: 10,
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 0,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
  },
  dotTrack: {
    position: "absolute",
    left: "10%",
    right: "10%",
    height: 2,
    backgroundColor: "#F0F0F0",
    top: 28,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 10,
    backgroundColor: "#E0E0E0",
    position: "absolute",
    top: 20,
    marginLeft: -20, // Center the dot on its position
  },
  selectedDot: {
    backgroundColor: "#FF6B6B",
    width: 20,
    height: 20,
    borderRadius: 12,
    top: 18,
    marginLeft: -24, // Center the larger dot
    zIndex: 10,
    elevation: 5,
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  transformationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 0,
    position: "relative",
  },
  leftNavArrow: {
    position: "absolute",
    left: 5,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  rightNavArrow: {
    position: "absolute",
    right: 5,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  transformationItem: {
    alignItems: "center",
    flex: 1,
  },
  transformationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 15,
  },
  transformationImage: {
    width: width * 0.35,
    height: 350,
  },
  arrowContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  arrowImage: {
    width: 40,
    height: 40,
  },
  noShapeContainer: {
    width: width * 0.35,
    height: 350,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
  },
  noShapeText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginText: {
    color: "#888",
  },
  loginLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
});

export default BodyShapeTarget;
