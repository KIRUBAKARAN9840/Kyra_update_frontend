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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";

const { width } = Dimensions.get("window");

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const WeightTarget = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const initialMountRef = useRef(true);
  const insets = useSafeAreaInsets();
  const { height, weight } = params;
  const currentWeight = weight ? parseInt(weight) : 70;
  const [targetWeight, setTargetWeight] = useState(currentWeight - 1);

  const minWeight = 39;
  const maxWeight = 150;
  const weights = Array.from(
    { length: maxWeight - minWeight + 1 },
    (_, i) => minWeight + i,
  );
  const itemWidth = 8;

  const heightValue = height ? parseInt(height) : 170;

  const calculateBMI = (w, h) => {
    const heightInMeters = h / 100;
    return (w / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5)
      return { category: "Underweight", color: "#4A90E2", position: 0 };
    if (bmi < 25) return { category: "Normal", color: "#7ED321", position: 1 };
    if (bmi < 30)
      return { category: "Overweight", color: "#F5A623", position: 2 };
    return { category: "Obese", color: "#D0021B", position: 2 };
  };

  const targetBmi = calculateBMI(targetWeight, heightValue);
  const targetBmiInfo = getBMICategory(parseFloat(targetBmi));

  const weightDiff = currentWeight - targetWeight;
  const goalText =
    weightDiff > 0
      ? `Lose ${weightDiff} kg`
      : weightDiff < 0
        ? `Gain ${Math.abs(weightDiff)} kg`
        : "Maintain weight";

  useEffect(() => {
    if (params.targetWeight) {
      setTargetWeight(parseInt(params.targetWeight));
    } else {
      setTargetWeight(currentWeight - 1);
    }
  }, [params.targetWeight, currentWeight]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  useEffect(() => {
    if (Platform.OS === "ios") {
      if (scrollRef.current && initialMountRef.current) {
        const index = weights.findIndex((w) => w === targetWeight);
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
      if (scrollRef.current && !isScrollingRef.current) {
        const index = weights.findIndex((w) => w === targetWeight);
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
  }, [targetWeight, weights, itemWidth]);

  const handleScroll = useCallback(
    (event) => {
      isScrollingRef.current = true;

      if (Platform.OS === "ios") {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 150);
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const centerOffset = offsetX + itemWidth / 2;
      const currentIndex = Math.round(centerOffset / itemWidth);

      if (weights[currentIndex] !== undefined) {
        const newWeight = weights[currentIndex];
        if (newWeight !== targetWeight) {
          setTargetWeight(newWeight);
        }
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const finalCenterOffset = offsetX + itemWidth / 2;
        const finalIndex = Math.round(finalCenterOffset / itemWidth);
        if (weights[finalIndex] !== undefined) {
          setTargetWeight(weights[finalIndex]);
        }
        isScrollingRef.current = false;
      }, 150);
    },
    [weights, targetWeight, itemWidth],
  );

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const centerOffset = offsetX + itemWidth / 2;
      const currentIndex = Math.round(centerOffset / itemWidth);

      if (weights[currentIndex] !== undefined) {
        setTargetWeight(weights[currentIndex]);
      }
      isScrollingRef.current = false;
    },
    [weights, itemWidth],
  );

  const handleContinue = () => {
    router.push({
      pathname: "/client/(dietcoach)/goal",
      params: {
        ...params,
        targetWeight: targetWeight,
      },
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
    <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={ACCENT} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 3 of 8</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>What's your target </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="weight"
          textStyle={styles.titleTextBold}
        />
        <Text style={styles.titleText}>?</Text>
      </View>
      <Text style={styles.subtitleText}>
        Set a realistic goal we can achieve together
      </Text>

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.formContainer}>
          <View style={styles.weightDisplayContainer}>
            <MaskedText
              bg1={GRADIENT_1}
              bg2={GRADIENT_2}
              text={`${targetWeight}`}
              textStyle={styles.weightValue}
              extra={true}
              extraText="kg"
              extraStyle={styles.weightUnit}
            />
          </View>
          <Text style={styles.targetLabel}>Target Weight</Text>

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
              {weights.map((w) => {
                const isMajorTick = w % 10 === 0;
                const isMinorTick = w % 5 === 0 && !isMajorTick;

                return (
                  <View key={w} style={styles.weightOption}>
                    <View
                      style={[
                        styles.tickMark,
                        isMajorTick && styles.majorTickMark,
                        isMinorTick && styles.minorTickMark,
                      ]}
                    />
                    {isMajorTick && (
                      <Text style={[styles.weightText, styles.majorWeightText]}>
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
          <View style={styles.bmiLabelWrapper}>
            <Text style={styles.bmiLabel}>BMI Value</Text>
          </View>

          <View style={styles.bmiScale}>
            <View style={styles.bmiValuePositioner}>
              <View
                style={[
                  styles.bmiValueContainer,
                  {
                    left: `${targetBmiInfo.position * 33.33 + 16.67}%`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bmiValue,
                    { backgroundColor: targetBmiInfo.color },
                  ]}
                >
                  {targetBmi}
                </Text>
                <View
                  style={[
                    styles.triangle,
                    { borderTopColor: targetBmiInfo.color },
                  ]}
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

          {/* Goal pill */}
          <View style={styles.goalPill}>
            <Text style={styles.goalPillText}>{goalText}</Text>
          </View>
          <Text style={styles.goalMotivation}>
            An ambitious goal - let's do this!
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButtonWrapper}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[GRADIENT_1, GRADIENT_2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Feather name="arrow-right" size={16} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default WeightTarget;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  stepIndicator: {
    flex: 1,
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#6A7282",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 34,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    flexWrap: "wrap",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  titleTextBold: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 15,
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  formContainer: {
    borderRadius: 15,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 0,
  },
  weightDisplayContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 6,
    gap: 6,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: "bold",
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: "500",
    color: ACCENT,
    marginBottom: 10,
  },
  targetLabel: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginBottom: 15,
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
    backgroundColor: ACCENT,
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
  bmiContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    paddingTop: 35,
    marginBottom: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  bmiLabelWrapper: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 2,
  },
  bmiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    overflow: "hidden",
    backgroundColor: "#00BC7D",
  },
  bmiValuePositioner: {
    position: "relative",
    height: 40,
    marginBottom: 8,
  },
  bmiValueContainer: {
    position: "absolute",
    alignItems: "center",
    transform: [{ translateX: -25 }],
  },
  bmiValue: {
    fontSize: 16,
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
  goalPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DEF4E7",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginBottom: 6,
    gap: 6,
  },
  goalPillIcon: {
    color: "#00A63E",
    fontSize: 14,
  },
  goalPillText: {
    color: "#00A63E",
    fontSize: 14,
    fontWeight: "600",
  },
  goalMotivation: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
    marginTop: 10,
  },
  continueButton: {
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
