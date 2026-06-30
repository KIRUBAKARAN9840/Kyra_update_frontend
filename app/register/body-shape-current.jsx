import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  BackHandler,
  Image,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Color } from "../../GlobalStyles";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import { LinearGradient } from "expo-linear-gradient";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const BodyShapeCurrent = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [currentShapeIndex, setCurrentShapeIndex] = useState(0);
  const insets = useSafeAreaInsets();
  // Animation ref
  const translateX = useRef(new Animated.Value(0)).current;

  const { fullName, gender, height, weight, targetWeight, goals } = params;

  // Goal-based shape arrays
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
  ];

  const femaleShapesBodyRecomposition = [
    {
      id: "F4",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_female_latest/F4.png",
      check_id: 1,
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
      id: "M6",
      imageUrl:
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/characters_male_latest/M6.png",
      check_id: 3,
    },
  ];

  // Select the appropriate shapes based on gender and goal
  const getShapesForGoal = () => {
    const isFemale = gender?.toLowerCase() === "female";

    if (goals === "weight_gain") {
      return isFemale ? femaleShapesWeightGain : maleShapesWeightGain;
    } else if (goals === "weight_loss") {
      return isFemale ? femaleShapesWeightLoss : maleShapesWeightLoss;
    } else if (goals === "maintain") {
      return isFemale
        ? femaleShapesBodyRecomposition
        : maleShapesBodyRecomposition;
    }

    // Default fallback
    return isFemale ? femaleShapesWeightLoss : maleShapesWeightLoss;
  };

  const shapes = getShapesForGoal();

  // Calculate dynamic spacing based on number of shapes
  const numShapes = shapes.length;
  const containerWidth = width * 0.7;
  const dotSpacing = numShapes > 1 ? containerWidth / (numShapes - 1) : 0;
  const startOffset =
    numShapes === 1 ? width / 2 : (width - containerWidth) / 2;
  const maxTranslate = numShapes > 1 ? dotSpacing * (numShapes - 1) : 0;

  useEffect(() => {
    if (params.currentBodyShapeId) {
      const shapeId = params.currentBodyShapeId;
      const index = shapes.findIndex((shape) => shape.id === shapeId);
      if (index >= 0) {
        // Shape exists in current goal's shapes
        setSelectedShapeId(shapeId);
        setCurrentShapeIndex(index);
        updateDotPosition(index);
      } else {
        // Shape doesn't exist in current goal, reset to first shape
        setSelectedShapeId(shapes[0].id);
        setCurrentShapeIndex(0);
        updateDotPosition(0);
      }
    } else {
      // Default to first shape
      setSelectedShapeId(shapes[0].id);
      setCurrentShapeIndex(0);
      updateDotPosition(0);
    }
  }, [params.currentBodyShapeId, goals]);

  const updateDotPosition = (index) => {
    const position = index * dotSpacing;
    Animated.spring(translateX, {
      toValue: position,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Handle hardware back button - go back to fifth-step-target
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.push({
          pathname: "/client/home",
          params: { tab: params.tab || "My Progress" },
        });
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [params, router]),
  );

  const handleContinue = () => {
    const selectedShape = shapes.find((shape) => shape.id === selectedShapeId);
    router.push({
      pathname: "/register/body-shape-target",
      params: {
        ...params,
        currentBodyShapeId: selectedShapeId,
        currentBodyShapeCheckId: selectedShape?.check_id,
      },
    });
  };

  const handleDotPress = (index) => {
    setCurrentShapeIndex(index);
    setSelectedShapeId(shapes[index].id);
    updateDotPosition(index);
  };

  const handlePrevious = () => {
    if (currentShapeIndex > 0) {
      const newIndex = currentShapeIndex - 1;
      setCurrentShapeIndex(newIndex);
      setSelectedShapeId(shapes[newIndex].id);
      updateDotPosition(newIndex);
    }
  };

  const handleNext = () => {
    if (currentShapeIndex < shapes.length - 1) {
      const newIndex = currentShapeIndex + 1;
      setCurrentShapeIndex(newIndex);
      setSelectedShapeId(shapes[newIndex].id);
      updateDotPosition(newIndex);
    }
  };

  const handleGoBack = () => {
    router.push({
      pathname: "/register/fifth-step-target",
      params: {
        ...params,
        currentBodyShapeId: selectedShapeId,
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
          Select Your{" "}
          <Text style={styles.highlightText}>Current Body Shape</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.imageContainer}>
          {/* Left Arrow */}
          {currentShapeIndex > 0 && (
            <TouchableOpacity
              style={styles.leftArrow}
              onPress={handlePrevious}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={32} color="#FF5757" />
            </TouchableOpacity>
          )}

          <Image
            source={{ uri: shapes[currentShapeIndex].imageUrl }}
            style={styles.bodyShapeImage}
            resizeMode="contain"
          />

          {/* Right Arrow */}
          {currentShapeIndex < shapes.length - 1 && (
            <TouchableOpacity
              style={styles.rightArrow}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={32} color="#FF5757" />
            </TouchableOpacity>
          )}
        </View>

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
          text={"Continue"}
          isValid={selectedShapeId !== null}
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
    marginTop: 30,
  },
  imageContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 0,
    marginTop: 10,
    position: "relative",
  },
  bodyShapeImage: {
    width: width * 0.35,
    height: 350,
  },
  leftArrow: {
    position: "absolute",
    left: 20,
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
  rightArrow: {
    position: "absolute",
    right: 20,
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
  dotsContainer: {
    height: 55,
    marginVertical: 20,
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

export default BodyShapeCurrent;
