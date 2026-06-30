import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  useFocusEffect,
} from "expo-router";
import { Color, linearGradientColors } from "../../GlobalStyles";
import ContinueButton from "../../components/ui/Register/ContinueButton";
import { LinearGradient } from "expo-linear-gradient";
import MobileLogo from "../../components/ui/Register/MobileLogo";
import CardTitle from "../../components/ui/Register/CardTitle";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ageAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";
import { BackHandler } from "react-native";

// Scroll selector dimensions
const ITEM_HEIGHT = 70;
const VISIBLE_ITEMS = 5;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SELECTOR_WIDTH = (SCREEN_WIDTH - 110) / 3;

const DateOfBirthSelector = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedDay, setSelectedDay] = useState(15);
  const [selectedYear, setSelectedYear] = useState(1999);
  const [isInitialized, setIsInitialized] = useState(false);

  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  // Simple scroll state tracking like height selector
  const isScrollingRef = useRef({
    month: false,
    day: false,
    year: false,
  });

  const scrollTimeoutRef = useRef({
    month: null,
    day: null,
    year: null,
  });

  const { gender, full_name } = params;

  // Memoize the data arrays
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const years = useMemo(
    () =>
      Array.from(
        { length: 100 },
        (_, i) => new Date().getFullYear() - i,
      ).reverse(),
    [],
  );

  const formatMonth = useCallback((month) => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return monthNames[month - 1];
  }, []);

  // Initialize state from params
  useEffect(() => {
    if (params.dateOfBirth && !isInitialized) {
      const [year, month, day] = params.dateOfBirth.split("-").map(Number);
      setSelectedYear(year || 1999);
      setSelectedMonth(month || 6);
      setSelectedDay(day || 15);
      setIsInitialized(true);
    } else if (!isInitialized) {
      setSelectedMonth(6);
      setSelectedDay(15);
      setSelectedYear(1999);
      setIsInitialized(true);
    }
  }, [params, isInitialized]);

  // Scroll to initial positions - simplified like height selector
  useEffect(() => {
    if (!isInitialized) return;

    const scrollToInitialPositions = () => {
      const monthIndex = months.findIndex((m) => m === selectedMonth);
      const dayIndex = days.findIndex((d) => d === selectedDay);
      const yearIndex = years.findIndex((y) => y === selectedYear);

      if (
        monthScrollRef.current &&
        monthIndex >= 0 &&
        !isScrollingRef.current.month
      ) {
        monthScrollRef.current.scrollTo({
          y: monthIndex * ITEM_HEIGHT,
          animated: false,
        });
      }

      if (
        dayScrollRef.current &&
        dayIndex >= 0 &&
        !isScrollingRef.current.day
      ) {
        dayScrollRef.current.scrollTo({
          y: dayIndex * ITEM_HEIGHT,
          animated: false,
        });
      }

      if (
        yearScrollRef.current &&
        yearIndex >= 0 &&
        !isScrollingRef.current.year
      ) {
        yearScrollRef.current.scrollTo({
          y: yearIndex * ITEM_HEIGHT,
          animated: false,
        });
      }
    };

    const timeout = setTimeout(scrollToInitialPositions, 50);
    return () => clearTimeout(timeout);
  }, [
    selectedMonth,
    selectedDay,
    selectedYear,
    isInitialized,
    months,
    days,
    years,
  ]);

  // Simplified scroll handler like height selector
  const createScrollHandler = useCallback(
    (dataArray, setSelectedValue, scrollType) => {
      return (event) => {
        isScrollingRef.current[scrollType] = true;
        const offsetY = event.nativeEvent.contentOffset.y;
        const itemHeight = ITEM_HEIGHT;
        const currentIndex = Math.round(offsetY / itemHeight);

        if (dataArray[currentIndex] !== undefined) {
          // Don't set selected value here, just track scrolling
        }

        if (scrollTimeoutRef.current[scrollType]) {
          clearTimeout(scrollTimeoutRef.current[scrollType]);
        }

        const currentOffsetY = offsetY;
        scrollTimeoutRef.current[scrollType] = setTimeout(() => {
          const finalIndex = Math.round(currentOffsetY / itemHeight);

          if (dataArray[finalIndex] !== undefined) {
            setSelectedValue(dataArray[finalIndex]);
          }

          isScrollingRef.current[scrollType] = false;
        }, 150);
      };
    },
    [],
  );

  // Simplified momentum scroll end handler like height selector
  const createMomentumScrollEndHandler = useCallback(
    (dataArray, setSelectedValue, scrollType) => {
      return (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const itemHeight = ITEM_HEIGHT;
        const currentIndex = Math.round(offsetY / itemHeight);

        if (dataArray[currentIndex] !== undefined) {
          setSelectedValue(dataArray[currentIndex]);
        }

        isScrollingRef.current[scrollType] = false;
      };
    },
    [],
  );

  // Handle direct item press
  const handleItemPress = useCallback(
    (scrollRef, value, index, setSelectedValue, scrollType) => {
      if (isScrollingRef.current[scrollType]) return;

      setSelectedValue(value);

      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: true,
        });
      }
    },
    [],
  );

  const renderScrollSelector = useCallback(
    (
      scrollRef,
      dataArray,
      selectedValue,
      label,
      setSelectedValue,
      scrollType,
      formatFunc = (val) => val,
    ) => {
      const scrollHandler = createScrollHandler(
        dataArray,
        setSelectedValue,
        scrollType,
      );

      const momentumScrollEndHandler = createMomentumScrollEndHandler(
        dataArray,
        setSelectedValue,
        scrollType,
      );

      return (
        <View
          style={[
            styles.selectorContainer,
            { width: SELECTOR_WIDTH, paddingBottom: insets.bottom },
          ]}
        >
          <Text style={styles.selectorLabel}>{label}</Text>
          <View style={styles.heightScrollContainer}>
            <View style={styles.selectionHighlight} />
            <ScrollView
              ref={scrollRef}
              style={styles.heightScrollView}
              contentContainerStyle={styles.heightScrollViewContent}
              showsVerticalScrollIndicator={false}
              onScroll={scrollHandler}
              onMomentumScrollEnd={momentumScrollEndHandler}
              scrollEventThrottle={16}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              bounces={false}
              overScrollMode="never"
            >
              {dataArray.map((item, index) => (
                <TouchableOpacity
                  key={`${scrollType}-${item}`}
                  style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
                  onPress={() =>
                    handleItemPress(
                      scrollRef,
                      item,
                      index,
                      setSelectedValue,
                      scrollType,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.itemText,
                      item === selectedValue && styles.selectedItemText,
                    ]}
                  >
                    {formatFunc(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      );
    },
    [createScrollHandler, createMomentumScrollEndHandler, handleItemPress],
  );

  const handleContinue = useCallback(async () => {
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(
      2,
      "0",
    )}-${String(selectedDay).padStart(2, "0")}`;

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
        dob: formattedDate,
      };

      const response = await ageAPI(payload);

      if (response?.status === 200) {
        router.push({
          pathname: "/register/seventh-step",
          params: {
            ...params,
            full_name,
            gender,
            dateOfBirth: formattedDate,
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to save date of birth",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  }, [
    selectedYear,
    selectedMonth,
    selectedDay,
    router,
    params,
    full_name,
    gender,
  ]);

  const handleBack = useCallback(() => {
    router.push({
      pathname: "/client/home",
      params: { tab: params.tab || "My Progress" },
    });
  }, [router, params.tab]);

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => backHandler.remove();
    }, [handleBack]),
  );

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(scrollTimeoutRef.current).forEach((timeout) => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
    };
  }, []);

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
          Select Your
          <Text style={styles.highlightText}> Date of Birth</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.formContainer}>
          <View style={styles.contentContainer}>
            <LinearGradient
              colors={["#FFFFFF", "#EFEFEF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.selectorHeaderGradient}
            >
              <View style={styles.selectorHeaderContainer}>
                <Text style={styles.selectorHeaderText}>Month</Text>
                <Text style={styles.selectorHeaderText}>Day</Text>
                <Text style={styles.selectorHeaderText}>Year</Text>
              </View>
            </LinearGradient>
            <View style={styles.birthdaySelectorsContainer}>
              {renderScrollSelector(
                monthScrollRef,
                months,
                selectedMonth,
                "",
                setSelectedMonth,
                "month",
                formatMonth,
              )}
              {renderScrollSelector(
                dayScrollRef,
                days,
                selectedDay,
                "",
                setSelectedDay,
                "day",
              )}
              {renderScrollSelector(
                yearScrollRef,
                years,
                selectedYear,
                "",
                setSelectedYear,
                "year",
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleContinue}>
          <Text style={styles.nextButtonText}>Continue</Text>
          <Feather name="arrow-right" size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
};

export default DateOfBirthSelector;

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
    width: 34, // Same width as back button to center the title
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  formContainer: {
    paddingHorizontal: 20,
    // paddingTop: 5,
    height: "75%",
  },
  contentContainer: {
    marginBottom: 10,
  },
  birthdaySelectorsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorContainer: {
    alignItems: "center",
    marginHorizontal: 5,
  },
  selectorLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: "#fff",
    fontWeight: "600",
  },
  heightScrollContainer: {
    height: VISIBLE_ITEMS * ITEM_HEIGHT,
    position: "relative",
  },
  heightScrollView: {
    width: "100%",
  },
  heightScrollViewContent: {
    paddingVertical: (VISIBLE_ITEMS * ITEM_HEIGHT - ITEM_HEIGHT) / 2,
    alignItems: "center",
  },
  selectionHighlight: {
    position: "absolute",
    top: "43%",
    bottom: "43%",
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FF5757",
    zIndex: 1,
    pointerEvents: "none",
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: ITEM_HEIGHT,
    paddingHorizontal: 20,
  },
  itemText: {
    fontSize: 14,
    color: "#b9b9b9",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: ITEM_HEIGHT,
  },
  selectedItemText: {
    color: "#FF5757",
    fontSize: 16,
    fontWeight: "bold",
  },
  numberItem: {
    fontSize: 18,
    color: Color.rgDisable,
    textAlign: "center",
  },
  activeNumber: {
    fontSize: 26,
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
  nextButton: {
    flexDirection: "row",
    backgroundColor: Color.rgPrimary,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    width: "75%",
    marginHorizontal: "auto",
    justifyContent: "center",
  },
  nextButtonText: {
    color: Color.rgContinue,
    fontSize: 14,
    marginRight: 10,
  },
  backContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  backText: {
    color: Color.rgDisable,
  },
  backLink: {
    color: Color.rgPrimary,
    fontWeight: "bold",
  },
  selectorHeaderGradient: {
    borderRadius: 8,
    marginBottom: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  selectorHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  selectorHeaderText: {
    fontSize: 16,
    color: "#686868",
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
});
