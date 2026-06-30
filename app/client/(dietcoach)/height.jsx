import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const Height = () => {
  const scrollViewRef = useRef(null);
  const params = useLocalSearchParams();
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const insets = useSafeAreaInsets();
  const initialHeight = params?.height || 160;
  const initialUnit = params?.heightUnit || "Centimeter";

  const [selectedHeight, setSelectedHeight] = useState(initialHeight);
  const [selectedUnit, setSelectedUnit] = useState(initialUnit);
  const [heightInCm, setHeightInCm] = useState(parseInt(initialHeight) || 160);

  const router = useRouter();

  useEffect(() => {
    if (params.height) {
      const newHeightInCm = parseInt(params.height) || 160;
      setHeightInCm(newHeightInCm);
      let convertedHeight = newHeightInCm;
      if (selectedUnit === "Feet") {
        const totalInches = Math.round(newHeightInCm / 2.54);
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        convertedHeight = `${feet}'${inches}"`;
      }
      setSelectedHeight(convertedHeight);
    }
    if (params.heightUnit) {
      setSelectedUnit(params.heightUnit);
    }
  }, [params.height, params.heightUnit]);

  const getHeightInCm = useCallback((height, unit) => {
    if (unit === "Centimeter") return parseInt(height) || 160;
    if (unit === "Feet") {
      if (!height || typeof height !== "string") return 160;
      const parts = height.split("'");
      const feet = parseInt(parts[0]) || 0;
      const inches = parseInt(parts[1]) || 0;
      return Math.round((feet * 12 + inches) * 2.54);
    }
    return parseInt(height) || 160;
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
        if (selectedUnit === "Feet") return h === convertedHeight;
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
    [heights, selectedUnit, getHeightInCm],
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

  const handleContinue = () => {
    router.push({
      pathname: "/client/(dietcoach)/weightactual",
      params: {
        ...params,
        height: heightInCm,
        heightUnit: selectedUnit,
      },
    });
  };

  const handleBack = () => {
    router.back();
  };

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
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LinearGradient colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]} locations={[0, 0.5, 1]} start={[0, 0]} end={[1, 1]} style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={24} color={ACCENT} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step 1 of 8</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>What's your </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="height"
          textStyle={styles.titleTextBold}
        />
        <Text style={styles.titleText}>?</Text>
      </View>
      <Text style={styles.subtitleText}>
        We'll use this to calculate your personalized plan
      </Text>

      <View style={styles.unitSelectorContainer}>
        {[
          { value: "Centimeter", label: "CM" },
          { value: "Feet", label: "FT" },
        ].map((unit) => (
          <TouchableOpacity
            key={unit.value}
            style={[
              styles.unitButton,
              selectedUnit === unit.value && styles.activeUnitButton,
            ]}
            onPress={() => handleUnitChange(unit.value)}
          >
            <Text
              style={[
                styles.unitButtonText,
                selectedUnit === unit.value && styles.activeUnitButtonText,
              ]}
            >
              {unit.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.scrollSection}>
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
              <View key={height} style={styles.numberItemContainer}>
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

      <View
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
      >
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

export default Height;

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
  unitSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "center",
    width: 200,
    marginBottom: 10,
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
    backgroundColor: ACCENT,
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
  scrollSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heightScrollContainer: {
    height: 400,
    width: "60%",
    position: "relative",
  },
  heightScrollOverlay: {
    position: "absolute",
    top: "35%",
    bottom: "52%",
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: ACCENT,
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
  numberItemContainer: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  numberItem: {
    height: 50,
    fontSize: 18,
    textAlign: "center",
    color: "#C5C5C5",
    paddingHorizontal: 20,
    lineHeight: 50,
  },
  activeNumber: {
    fontSize: 28,
    color: ACCENT,
    fontWeight: "bold",
  },
  bottomContainer: {
    paddingHorizontal: 20,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
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
