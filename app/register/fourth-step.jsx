import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { safeParseInt } from "../../utils/safeHelpers";
import {
  Animated,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CardTitle from "../../components/ui/Register/CardTitle";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import { Color } from "../../GlobalStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { heightAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const FourthStep = () => {
  const scrollViewRef = useRef(null);
  const params = useLocalSearchParams();
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const insets = useSafeAreaInsets();
  const initialHeight = params?.height || 160;
  const initialUnit = params?.heightUnit || "Centimeter";

  const [selectedHeight, setSelectedHeight] = useState(initialHeight);
  const [selectedUnit, setSelectedUnit] = useState(initialUnit);
  const [heightInCm, setHeightInCm] = useState(initialHeight);

  const router = useRouter();

  // Initialize height values from params when navigating back from other steps
  useEffect(() => {
    if (params.height && params.height !== initialHeight) {
      const newHeightInCm = safeParseInt(params.height, 160);
      setHeightInCm(newHeightInCm);

      // Convert height to current unit
      let convertedHeight = newHeightInCm;
      if (selectedUnit === "Feet") {
        const totalInches = Math.round(newHeightInCm / 2.54);
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        convertedHeight = `${feet}'${inches}"`;
      }
      setSelectedHeight(convertedHeight);
    }
    if (params.heightUnit && params.heightUnit !== initialUnit) {
      setSelectedUnit(params.heightUnit);
    }
  }, [
    params.height,
    params.heightUnit,
    initialHeight,
    initialUnit,
    selectedUnit,
  ]);

  const animatedHeight = useRef(new Animated.Value(200)).current;
  const animatedWidth = useRef(new Animated.Value(90)).current;

  const getHeightInCm = useCallback((height, unit) => {
    if (unit === "Centimeter") return safeParseInt(height, 160);
    if (unit === "Feet") {
      if (!height || typeof height !== "string") return 160;
      const parts = height.split("'");
      const feet = safeParseInt(parts[0], 0);
      const inches = safeParseInt(parts[1], 0);
      return Math.round((feet * 12 + inches) * 2.54);
    }
    return safeParseInt(height, 160);
  }, []);

  const convertFromCm = useCallback((cm, toUnit) => {
    if (toUnit === "Centimeter") return cm;
    if (toUnit === "Feet") {
      const totalInches = Math.round(cm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}'${inches}"`;
    }
    return cm;
  }, []);

  const getImageDimensions = useCallback((heightInCm) => {
    const clampedHeight = Math.max(125, Math.min(210, heightInCm));

    const minImageHeight = 250;
    const maxImageHeight = 380;
    const heightRatio = (clampedHeight - 125) / (210 - 125);
    const imageHeight =
      minImageHeight + (maxImageHeight - minImageHeight) * heightRatio;

    const minImageWidth = 80;
    const maxImageWidth = 140;
    const imageWidth =
      minImageWidth + (maxImageWidth - minImageWidth) * heightRatio;

    return { height: imageHeight, width: imageWidth };
  }, []);

  const updateAnimations = useCallback(
    (heightInCm) => {
      const dimensions = getImageDimensions(heightInCm);

      Animated.parallel([
        Animated.timing(animatedHeight, {
          toValue: dimensions.height,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(animatedWidth, {
          toValue: dimensions.width,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [getImageDimensions, animatedHeight, animatedWidth],
  );

  const generateHeights = useCallback((unit) => {
    if (unit === "Centimeter") {
      return Array.from({ length: 86 }, (_, i) => 125 + i);
    }
    if (unit === "Feet") {
      const heights = [];
      for (let feet = 4; feet <= 6; feet++) {
        for (let inches = 0; inches <= 11; inches++) {
          if (feet === 4 && inches === 0) continue;
          if (feet === 6 && inches === 11) {
            heights.push(`${feet}'${inches}"`);
            break;
          }
          heights.push(`${feet}'${inches}"`);
        }
      }
      return heights;
    }
    return [];
  }, []);

  const heights = generateHeights(selectedUnit);

  useEffect(() => {
    if (scrollViewRef.current && !isScrollingRef.current) {
      const convertedHeight = convertFromCm(heightInCm, selectedUnit);

      const index = heights.findIndex((h) => {
        if (selectedUnit === "Feet") {
          return h === convertedHeight;
        }
        return parseInt(h) === parseInt(convertedHeight);
      });

      if (index >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: index * 50,
            animated: false,
          });
        }, 50);
      }
    }
  }, [selectedUnit, heights, heightInCm, convertFromCm]);

  const handleScroll = useCallback(
    (event) => {
      isScrollingRef.current = true;
      const offsetY = event.nativeEvent.contentOffset.y;
      const itemHeight = 50;
      const currentIndex = Math.round(offsetY / itemHeight);

      if (heights[currentIndex] !== undefined) {
        const newHeight = heights[currentIndex];
        const newHeightInCm = getHeightInCm(newHeight, selectedUnit);
        updateAnimations(newHeightInCm);
      }

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const currentOffsetY = offsetY;
      scrollTimeoutRef.current = setTimeout(() => {
        const finalIndex = Math.round(currentOffsetY / itemHeight);

        if (heights[finalIndex] !== undefined) {
          setSelectedHeight(heights[finalIndex]);
          const finalHeightInCm = getHeightInCm(
            heights[finalIndex],
            selectedUnit,
          );
          setHeightInCm(finalHeightInCm);
        }

        isScrollingRef.current = false;
      }, 150);
    },
    [heights, selectedUnit, getHeightInCm, updateAnimations],
  );

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const itemHeight = 50;
      const currentIndex = Math.round(offsetY / itemHeight);

      if (heights[currentIndex] !== undefined) {
        setSelectedHeight(heights[currentIndex]);
        const newHeightInCm = getHeightInCm(
          heights[currentIndex],
          selectedUnit,
        );
        setHeightInCm(newHeightInCm);
      }
    },
    [heights, selectedUnit, getHeightInCm],
  );

  const handleUnitChange = useCallback(
    (newUnit) => {
      if (newUnit === selectedUnit) return;
      const convertedHeight = convertFromCm(heightInCm, newUnit);

      setSelectedHeight(convertedHeight);
      setSelectedUnit(newUnit);
    },
    [selectedUnit, heightInCm, convertFromCm],
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
        height: heightInCm,
      };

      const response = await heightAPI(payload);

      if (response?.status === 200) {
        router.push({
          pathname: "/register/fifth-step",
          params: {
            ...params,
            height: heightInCm,
            unit: "Centimeter",
            heightUnit: "Centimeter",
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save height",
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

  const handleBack = () => {
    router.push({
      pathname: "/client/home",
      params: { tab: params.tab || "My Progress" },
    });
  };

  // Handle hardware back button - go to home
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
    updateAnimations(heightInCm);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [heightInCm, updateAnimations]);

  return (
    <LinearGradient
      style={{ flex: 1, width: "100%", height: "100%" }}
      colors={["#FFFFFF", "#FFFFFF", "#FFFFFF"]}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={24} color="#FF5757" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Select Your <Text style={styles.highlightText}>Height</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <View style={styles.formContainer}>
          <View style={styles.unitSelectorContainer}>
            {[
              { value: "Centimeter", label: "CM" },
              { value: "Feet", label: "FT" },
            ].map((unit) => (
              <TouchableOpacity
                key={unit?.value}
                style={[
                  styles.unitButton,
                  selectedUnit === unit?.value && styles.activeUnitButton,
                ]}
                onPress={() => handleUnitChange(unit?.value)}
              >
                <Text
                  style={[
                    styles.unitButtonText,
                    selectedUnit === unit?.value && styles.activeUnitButtonText,
                  ]}
                >
                  {unit?.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.silhouetteContainer}>
              <View style={styles.imageWrapper}>
                <Animated.Image
                  source={
                    params.gender.toLocaleLowerCase() == "male"
                      ? require("../../assets/images/MALE.webp")
                      : require("../../assets/images/FEMALE.webp")
                  }
                  style={{
                    width: animatedWidth,
                    height: animatedHeight,
                  }}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.heightScrollContainer}>
              <View style={styles.heightScrollOverlay} />
              <ScrollView
                ref={scrollViewRef}
                style={styles.heightScrollView}
                contentContainerStyle={styles.heightScrollViewContent}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                scrollEventThrottle={16}
                snapToInterval={50}
                decelerationRate="fast"
                bounces={false}
              >
                {heights.map((height) => (
                  <View key={height}>
                    <Text
                      style={[
                        styles.numberItem,
                        height == selectedHeight && styles.activeNumber,
                      ]}
                    >
                      {height} {selectedUnit === "Centimeter" ? "cm" : ""}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        <ContinueButton
          handleSubmit={handleContinue}
          isValid={true}
          text={"Continue"}
        />
      </View>
    </LinearGradient>
  );
};

export default FourthStep;

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
    backgroundColor: Color.rgBgContainer,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  formContainer: {
    borderRadius: 15,
    width: "100%",
    marginBottom: 20,
  },
  unitSelectorContainer: {
    flexDirection: "row",
    marginBottom: 20,
    justifyContent: "center",
    alignSelf: "center",
    width: 200,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 30,
    alignItems: "center",
    borderRadius: 20,
    marginHorizontal: 2,
    backgroundColor: "#F6F6F6",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  activeUnitButton: {
    backgroundColor: "#FF5A5A",
  },
  unitButtonText: {
    color: "#686868",
    fontSize: 16,
    fontWeight: "500",
  },
  activeUnitButtonText: {
    color: "white",
    fontWeight: "600",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    height: 400,
  },
  silhouetteContainer: {
    flex: 1,
    height: "100%",
    position: "relative",
  },
  imageWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  heightScrollContainer: {
    flex: 1,
    height: 350,
    position: "relative",
  },
  heightScrollOverlay: {
    position: "absolute",
    top: "40%",
    bottom: "45%",
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: Color.rgPrimaryTransparent,
    zIndex: 1,
    pointerEvents: "none",
  },
  heightScrollView: {
    width: "100%",
  },
  heightScrollViewContent: {
    paddingVertical: 140,
    alignItems: "center",
  },
  numberItem: {
    height: 50,
    fontSize: 18,
    textAlign: "center",
    color: Color.rgDisable,
    paddingHorizontal: 20,
    lineHeight: 50,
  },
  activeNumber: {
    fontSize: 28,
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
  backContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  backText: {
    color: "#888",
  },
  backLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
});
