import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  BackHandler,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Color, linearGradientColors } from "../../GlobalStyles";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import CardTitle from "../../components/ui/Register/CardTitle";
import { LinearGradient } from "expo-linear-gradient";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const FifthStep = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const initialMountRef = useRef(true);
  const insets = useSafeAreaInsets();
  const { fullName, gender, height } = params;
  const [weight, setWeight] = useState(59);
  const [hasNavigatedFromSixthStep, setHasNavigatedFromSixthStep] =
    useState(false);

  const minWeight = 39;
  const maxWeight = 150;
  const weights = Array.from(
    { length: maxWeight - minWeight + 1 },
    (_, i) => minWeight + i,
  );
  const itemWidth = 8;

  // Use height from params (passed from fourth step)
  const heightValue = height ? parseInt(height) : 170;

  const calculateBMI = (weight, height) => {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5)
      return { category: "Underweight", color: "#4A90E2", position: 0 };
    if (bmi < 25) return { category: "Normal", color: "#7ED321", position: 1 };
    if (bmi < 30)
      return { category: "Overweight", color: "#F5A623", position: 2 };
    return { category: "Obese", color: "#D0021B", position: 2 }; // Obese shows in overweight section
  };

  const bmi = calculateBMI(weight, heightValue);
  const bmiInfo = getBMICategory(parseFloat(bmi));

  useEffect(() => {
    if (params.weight) {
      // Coming back from target weight or sixth step
      const paramWeight = parseInt(params.weight);
      setWeight(paramWeight - 1);
      setHasNavigatedFromSixthStep(true);
    }
  }, [params.weight]);

  // Handle hardware back button - preserve weight and go to fourth-step
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
  useEffect(() => {
    if (Platform.OS === "ios") {
      // iOS: Only auto-scroll on initial mount to prevent auto-scrolling during user interaction
      if (scrollRef.current && initialMountRef.current) {
        const index = weights.findIndex((w) => w === weight);
        if (index >= 0) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              x: index * itemWidth,
              animated: false,
            });
            initialMountRef.current = false;
          }, 200);
        }
      }
    } else {
      // Android: Keep original behavior
      if (scrollRef.current && !isScrollingRef.current) {
        const index = weights.findIndex((w) => w === weight);
        if (index >= 0) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              x: index * itemWidth,
              animated: false,
            });
          }, 200);
        }
      }
    }
  }, [weight, weights, itemWidth]);

  const handleScroll = useCallback(
    (event) => {
      isScrollingRef.current = true;

      if (Platform.OS === "ios") {
        // iOS: Simplified - just mark as scrolling, update happens in momentum end
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 150);
        return;
      }

      // Android: Keep original behavior
      const offsetX = event.nativeEvent.contentOffset.x;
      const centerOffset = offsetX + itemWidth / 2;
      const currentIndex = Math.round(centerOffset / itemWidth);

      if (weights[currentIndex] !== undefined) {
        const newWeight = weights[currentIndex];
        if (newWeight !== weight) {
          setWeight(newWeight);
        }
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const finalCenterOffset = offsetX + itemWidth / 2;
        const finalIndex = Math.round(finalCenterOffset / itemWidth);
        if (weights[finalIndex] !== undefined) {
          setWeight(weights[finalIndex]);
        }
        isScrollingRef.current = false;
      }, 150);
    },
    [weights, weight, itemWidth],
  );

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const centerOffset = offsetX + itemWidth / 2;
      const currentIndex = Math.round(centerOffset / itemWidth);

      if (weights[currentIndex] !== undefined) {
        setWeight(weights[currentIndex]);
      }
      isScrollingRef.current = false;
    },
    [weights, itemWidth],
  );

  const handleContinue = () => {
    router.push({
      pathname: "/register/fifth-step-target",
      params: { ...params, weight: weight },
    });
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
          Select Your Current <Text style={styles.highlightText}>Weight</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.formContainer}>
          {/* Weight Display */}
          <View style={styles.weightDisplayContainer}>
            <Text style={styles.weightValue}>{weight}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>

          {/* Horizontal Weight Selector */}
          <View style={styles.selectorContainer}>
            <View style={styles.weightScrollOverlay} />
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              scrollEventThrottle={Platform.OS === "ios" ? 32 : 16}
              snapToInterval={itemWidth}
              decelerationRate={Platform.OS === "ios" ? 0.98 : "fast"}
              bounces={false}
              onScrollBeginDrag={
                Platform.OS === "ios"
                  ? () => {
                      isScrollingRef.current = true;
                    }
                  : undefined
              }
            >
              {weights.map((w, index) => {
                const isSelected = w === weight;
                const isMajorTick = w % 10 === 0;
                const isMinorTick = w % 5 === 0 && !isMajorTick;

                return (
                  <View key={w} style={styles.weightOption}>
                    <View
                      style={[
                        styles.tickMark,
                        isMajorTick && styles.majorTickMark,
                        isMinorTick && !isSelected && styles.minorTickMark,
                      ]}
                    />
                    {isMajorTick && (
                      <Text
                        style={[
                          styles.weightText,
                          isMajorTick && styles.majorWeightText,
                        ]}
                      >
                        {w}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.bmiContainer}>
          <Text style={styles.bmiLabel}>Current BMI</Text>

          {/* BMI Scale */}
          <View style={styles.bmiScale}>
            {/* BMI Value positioned above the appropriate section */}
            <View style={styles.bmiValuePositioner}>
              <View
                style={[
                  styles.bmiValueContainer,
                  {
                    left: `${bmiInfo.position * 33.33 + 16.67}%`,
                  },
                ]}
              >
                <Text
                  style={[styles.bmiValue, { backgroundColor: bmiInfo.color }]}
                >
                  {bmi}
                </Text>
                <View
                  style={[styles.triangle, { borderTopColor: bmiInfo.color }]}
                />
              </View>
            </View>

            <View style={styles.bmiScaleBar}>
              <View
                style={[styles.bmiSection, { backgroundColor: "#4A90E2" }]}
              />
              <View
                style={[styles.bmiSection, { backgroundColor: "#7ED321" }]}
              />
              <View
                style={[styles.bmiSection, { backgroundColor: "#F5A623" }]}
              />
            </View>

            <View style={styles.bmiLabels}>
              <Text style={styles.bmiLabelText}>Underweight</Text>
              <Text style={styles.bmiLabelText}>Normal</Text>
              <Text style={styles.bmiLabelText}>Overweight</Text>
            </View>
          </View>

          <Text style={styles.bmiDescription}>
            Your current BMI is {bmi} ({bmiInfo.category.toLowerCase()}). Focus
            on eating a nutrient-rich, balanced diet with healthy calories
            daily.
          </Text>
        </View>

        <ContinueButton
          handleSubmit={handleContinue}
          text={"Continue"}
          isValid={true}
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
    justifyContent: "center",
  },
  formContainer: {
    borderRadius: 15,
    padding: 0,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 0,
  },
  title: {
    color: Color.rgTextSecondary,
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: Color.rgDisable,
    fontSize: 16,
    textAlign: "center",
  },
  weightDisplayContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 20,
    gap: 6,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#FF6B6B",
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FF6B6B",
    marginBottom: 10,
  },
  selectorContainer: {
    height: 80,
    marginBottom: 20,
    position: "relative",
    borderRadius: 8,
  },
  weightScrollOverlay: {
    position: "absolute",
    left: "50%",
    marginLeft: -1.5,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "#FF6B6B",
    zIndex: 1,
    pointerEvents: "none",
    borderRadius: 1.5,
  },
  scrollContent: {
    paddingLeft: width / 2 - 51,
    paddingRight: width / 2 - 4,
    alignItems: "flex-start",
    paddingTop: 10,
  },
  weightOption: {
    width: 8,
    height: 70,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  tickMark: {
    width: 1,
    height: 25,
    backgroundColor: "#E2E2E4",
  },
  majorTickMark: {
    width: 2,
    height: 45,
    backgroundColor: "#C5C5C5",
  },
  minorTickMark: {
    width: 1.5,
    height: 35,
    backgroundColor: "#c5c5c5dc",
  },
  weightText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "400",
    marginTop: 5,
    textAlign: "center",
  },
  majorWeightText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    width: 40,
  },
  selectedWeightText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "bold",
  },
  bmiContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  bmiValuePositioner: {
    position: "relative",
    height: 40,
    marginBottom: 8,
  },
  bmiValueContainer: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -25 }], // Center the box over the section
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    textAlign: "center",
  },
  triangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  bmiScale: {
    marginBottom: 16,
  },
  bmiScaleBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  bmiSection: {
    flex: 1,
  },
  bmiLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  bmiLabelText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  bmiDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: Color.rgPrimary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: Color.rgTextSecondary,
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
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

export default FifthStep;
