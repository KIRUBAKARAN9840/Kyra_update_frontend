import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import appsFlyer from "react-native-appsflyer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkeletonHome from "../components/ui/Home/skeletonHome";
import { FontFamily } from "../GlobalStyles";
import { loginAPI } from "../services/Api";
import apiConfig from "../services/apiConfig";
import { showToast } from "../utils/Toaster";

const { width, height } = Dimensions.get("window");
const baseURL = apiConfig.API_URL;
const WELCOME_SCREEN_VIEWED_KEY = "welcome_screen_viewed";

const SLIDE_INTERVAL_MS = 4000;

const SLIDES = [
  {
    image: require("../assets/images/dailypass_login.webp"),
    title: (
      <Text>
        <Text style={{ color: "#000000" }}>{"Access "}</Text>
        <Text style={{ color: "#FF5757" }}>{"Premium Gyms"}</Text>
        <Text style={{ color: "#000000" }}>{" \nat Just "}</Text>
        <Text style={{ color: "#FF5757" }}>{"₹99"}</Text>
      </Text>
    ),
  },
  {
    image: require("../assets/images/gymmate_login.webp"),
    title: (
      <Text>
        <Text style={{ color: "#000000" }}>{"Your "}</Text>
        <Text style={{ color: "#FF5757" }}>{"Gym Mate"}</Text>
        <Text style={{ color: "#000000" }}>{" Is Just \n"}</Text>
        <Text style={{ color: "#FF5757" }}>{"One Swipe"}</Text>
        <Text style={{ color: "#000000" }}>{" Away"}</Text>
      </Text>
    ),
  },
];

const HERO_IMAGE_ASPECT = 786 / 580;

const getResponsiveSizes = () => ({
  horizontalPadding: width * 0.06,
});

const HeroCarousel = ({ textPadding }) => {
  const loopData = React.useMemo(() => {
    if (SLIDES.length <= 1) return SLIDES;
    return [SLIDES[SLIDES.length - 1], ...SLIDES, SLIDES[0]];
  }, []);

  const [activeIndex, setActiveIndex] = useState(1);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(width)).current;
  const isScrolling = useRef(false);
  const autoScrollTimer = useRef(null);
  const transitionTimers = useRef([]);

  // Initialize scroll position to first real item
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const initTimer = setTimeout(() => {
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({ animated: false, index: 1 });
        } catch (_) {}
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
      transitionTimers.current.forEach((t) => clearTimeout(t));
      transitionTimers.current = [];
    };
  }, []);

  // Auto-play
  useEffect(() => {
    if (SLIDES.length <= 1) return;

    autoScrollTimer.current = setInterval(() => {
      if (!isScrolling.current && flatListRef.current) {
        const nextIndex = activeIndex + 1;
        if (nextIndex < loopData.length) {
          try {
            flatListRef.current.scrollToIndex({
              animated: true,
              index: nextIndex,
            });
          } catch (_) {}
        }
      }
    }, SLIDE_INTERVAL_MS);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }
    };
  }, [activeIndex, loopData.length]);

  // Handle infinite loop transitions
  useEffect(() => {
    if (SLIDES.length <= 1) return;

    const listener = scrollX.addListener(({ value }) => {
      const index = Math.round(value / width);

      // At the end duplicate → jump to real first item
      if (index === loopData.length - 1 && !isScrolling.current) {
        const timer = setTimeout(() => {
          isScrolling.current = true;
          if (flatListRef.current) {
            try {
              flatListRef.current.scrollToIndex({ animated: false, index: 1 });
              setActiveIndex(1);
              const innerTimer = setTimeout(() => {
                isScrolling.current = false;
              }, 50);
              transitionTimers.current.push(innerTimer);
            } catch (_) {
              isScrolling.current = false;
            }
          }
        }, 100);
        transitionTimers.current.push(timer);
      }
      // At the start duplicate → jump to real last item
      else if (index === 0 && !isScrolling.current) {
        const timer = setTimeout(() => {
          isScrolling.current = true;
          if (flatListRef.current) {
            const targetIndex = loopData.length - 2;
            try {
              flatListRef.current.scrollToIndex({
                animated: false,
                index: targetIndex,
              });
              setActiveIndex(targetIndex);
              const innerTimer = setTimeout(() => {
                isScrolling.current = false;
              }, 50);
              transitionTimers.current.push(innerTimer);
            } catch (_) {
              isScrolling.current = false;
            }
          }
        }, 100);
        transitionTimers.current.push(timer);
      }
    });

    return () => {
      scrollX.removeListener(listener);
      transitionTimers.current.forEach((t) => clearTimeout(t));
      transitionTimers.current = [];
    };
  }, [loopData.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        if (isScrolling.current || !event?.nativeEvent) return;
        const slideIndex = Math.round(
          event.nativeEvent.contentOffset.x / width,
        );
        if (
          slideIndex !== activeIndex &&
          slideIndex >= 0 &&
          slideIndex < loopData.length
        ) {
          setActiveIndex(slideIndex);
        }
      },
    },
  );

  const renderItem = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.imageWrap}>
        <Image
          source={item.image}
          style={styles.heroImage}
          contentFit="contain"
          contentPosition="center"
          priority="high"
        />
      </View>
      <View style={[styles.textBlock, { paddingHorizontal: textPadding }]}>
        <Text
          style={styles.heroTitle}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {item.title}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={loopData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          isScrolling.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isScrolling.current = false;
          }, 100);
        }}
        scrollEventThrottle={16}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        renderItem={renderItem}
      />
    </View>
  );
};

const Login = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role] = useState("client");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const [showInputModal, setShowInputModal] = useState(false);

  const modalSlideY = useRef(new Animated.Value(height)).current;
  const inputRef = useRef(null);

  const sizes = getResponsiveSizes();

  useEffect(() => {
    checkWelcomeStatus();
  }, []);

  const checkWelcomeStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(WELCOME_SCREEN_VIEWED_KEY);
      if (value === "true") return;

      trackAppOpen();
      const deviceId =
        Math.random().toString(15).substring(2) + Date.now().toString(15);
      await AsyncStorage.setItem("device_id", deviceId);

      appsFlyer
        .logEvent("af_app_open", {
          device_id: deviceId,
          device_type: Platform.OS,
        })
        .then(() => {})
        .catch((err) => console.log("AppsFlyer error:", err));

      await AsyncStorage.setItem(WELCOME_SCREEN_VIEWED_KEY, "true");
    } catch (error) {
      console.log("checkWelcomeStatus error:", error);
    }
  };

  const trackAppOpen = async () => {
    try {
      await axios.post(`${baseURL}/app_open/track`, { platform: Platform.OS });
    } catch (_) {}
  };

  useFocusEffect(
    useCallback(() => {
      checkAuthentication();
    }, []),
  );

  const checkAuthentication = async () => {
    try {
      setInitializing(true);
      const accessToken = await SecureStore.getItemAsync("access_token");
      const clientId = await AsyncStorage.getItem("client_id");
      const storedRole = (await AsyncStorage.getItem("role")) || "client";

      if (!accessToken) {
        setInitializing(false);
        return;
      }

      try {
        const response = await axios.get(`${baseURL}/auth/verify`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 200) {
          router.replace("/client/home");
        }
      } catch (_) {
        if (clientId) {
          try {
            const refreshResponse = await axios.post(
              `${baseURL}/auth/refresh`,
              {
                id: clientId,
                role: storedRole,
              },
            );
            if (refreshResponse?.status === 200) {
              await SecureStore.setItemAsync(
                "access_token",
                refreshResponse.data.access_token,
              );
              return checkAuthentication();
            } else {
              await clearTokens();
            }
          } catch (_) {
            await clearTokens();
          }
        } else {
          await clearTokens();
        }
      }

      setInitializing(false);
    } catch (_) {
      await clearTokens();
      setInitializing(false);
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const clearTokens = async () => {
    try {
      await SecureStore.deleteItemAsync("access_token");
      checkAuthentication();
    } catch (_) {}
  };

  const login = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      shakeInputs();
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginAPI({
        mobile_number: mobileNumber,
        role,
      });
      if (response?.status === 200) {
        router.replace({
          pathname: "/OtpVerification",
          params: { mobile: mobileNumber },
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
      showToast({
        type: "error",
        title: "Error",
        desc:
          error?.response?.detail ||
          "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shakeInputs = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openInputModal = () => {
    setShowInputModal(true);
    Animated.timing(modalSlideY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
    });
  };

  const closeInputModal = () => {
    Animated.timing(modalSlideY, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowInputModal(false));
    Keyboard.dismiss();
  };

  if (initializing) {
    return <SkeletonHome type="home" priority="low" />;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: (insets.top > 0 ? insets.top : 24) + 17 },
      ]}
    >
      <View style={styles.heroSection}>
        <HeroCarousel textPadding={sizes.horizontalPadding} />
      </View>

      <View
        style={[
          styles.bottomCard,
          {
            paddingHorizontal: sizes.horizontalPadding,
            paddingBottom:
              (insets.bottom > 0 ? insets.bottom : 16) +
              (Platform.OS === "ios" ? 8 : 4),
          },
        ]}
      >
        <View
          style={[
            styles.dividerRow,
            { width, marginHorizontal: -sizes.horizontalPadding },
          ]}
        >
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Login or Signup</Text>
          <View style={styles.dividerLine} />
        </View>

        <Animated.View
          style={{ transform: [{ translateX: shakeAnimation }], width: "100%" }}
        >
          <TouchableOpacity
            style={styles.inputDisplay}
            onPress={openInputModal}
            activeOpacity={0.8}
          >
            <View style={styles.inputContent}>
              <Text style={styles.countryCode}>+91</Text>
              <View style={styles.verticalDivider} />
              <Text
                style={
                  mobileNumber
                    ? styles.inputTextFilled
                    : styles.inputTextPlaceholder
                }
              >
                {mobileNumber || "Enter mobile Number"}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={login}
          disabled={isLoading || !mobileNumber || mobileNumber.length < 10}
        >
          {isLoading ? (
            <Animatable.View
              animation="pulse"
              easing="ease-out"
              iterationCount="infinite"
            >
              <Ionicons name="fitness" size={24} color="#FFFFFF" />
            </Animatable.View>
          ) : (
            <Text style={styles.continueButtonText}>Login or Signup</Text>
          )}
        </TouchableOpacity>

        <View
          style={[
            styles.termsDivider,
            { width, marginHorizontal: -sizes.horizontalPadding },
          ]}
        />

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{" "}
            <Text
              style={styles.linkText}
              onPress={() =>
                Linking.openURL("https://fymble.app/terms-and-conditions/")
              }
            >
              Terms & Conditions
            </Text>
            {" and "}
            <Text
              style={styles.linkText}
              onPress={() =>
                Linking.openURL("https://fymble.app/privacy-policy/")
              }
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>

      <Modal
        visible={showInputModal}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeInputModal}>
          <Pressable style={styles.pressableContainer}>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ translateY: modalSlideY }] },
              ]}
            >
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Mobile Number</Text>
                <TouchableOpacity onPress={closeInputModal}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalInputWrapper}>
                <Text style={styles.countryCodeText}>+91</Text>
                <View style={styles.modalDivider} />
                <TextInput
                  ref={inputRef}
                  style={styles.modalInput}
                  placeholder="Enter 10 digit number"
                  placeholderTextColor="#767676"
                  keyboardType="phone-pad"
                  value={mobileNumber}
                  onChangeText={(text) =>
                    setMobileNumber(text.replace(/[^0-9]/g, ""))
                  }
                  maxLength={10}
                />
                {mobileNumber.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMobileNumber("")}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!mobileNumber || mobileNumber.length < 10) &&
                    styles.modalButtonDisabled,
                ]}
                onPress={() => {
                  closeInputModal();
                  if (mobileNumber.length === 10) login();
                }}
                disabled={!mobileNumber || mobileNumber.length < 10}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  heroSection: {
    width: "100%",
  },
  carouselContainer: {
    width: "100%",
  },
  slide: {
    width,
    alignItems: "center",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: HERO_IMAGE_ASPECT,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    width: "100%",
    alignItems: "center",
  },
  heroTitle: {
    marginTop: 58,
    fontSize: 26,
    color: "#000000",
    fontFamily: FontFamily.urbanistSemiBold,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 32,
    width: "100%",
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 16,
    color: "#222222",
    fontFamily: FontFamily.urbanistMedium,
    textAlign: "center",
    lineHeight: 22,
    width: "100%",
  },
  bottomCard: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 45,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 33,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#888888",
    fontFamily: FontFamily.urbanistMedium,
  },
  inputDisplay: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 20,
  },
  inputContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    height: 54,
  },
  countryCode: {
    fontSize: 17,
    fontFamily: FontFamily.urbanistSemiBold,
    color: "#1A1A1A",
    marginRight: 12,
    fontWeight: "600",
  },
  verticalDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#DDDDDD",
    marginRight: 12,
  },
  inputTextFilled: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.urbanistMedium,
    color: "#333333",
  },
  inputTextPlaceholder: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.urbanistMedium,
    color: "#AAAAAA",
  },
  continueButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#FF5757",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
    ...Platform.select({
      ios: { shadowColor: "transparent" },
      android: { elevation: 0 },
    }),
  },
  continueButtonText: {
    fontSize: 17,
    fontFamily: FontFamily.urbanistSemiBold,
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  termsDivider: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginTop: 53,
  },
  termsContainer: {
    width: "100%",
    marginTop: 14,
  },
  termsText: {
    color: "#888888",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 17,
    flexShrink: 1,
  },
  linkText: {
    color: "#FF5757",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pressableContainer: {
    width: "100%",
    height: height * 0.65,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: width * 0.06,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? height * 0.05 : height * 0.03,
    minHeight: height * 0.75,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#DDDDDD",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.urbanistSemiBold,
    color: "#333333",
  },
  modalInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 56,
    marginBottom: 25,
  },
  countryCodeText: {
    fontSize: 17,
    fontFamily: FontFamily.urbanistSemiBold,
    color: "#333333",
    marginRight: 8,
  },
  modalDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#DDDDDD",
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 17,
    fontFamily: FontFamily.urbanistMedium,
    color: "#333333",
    paddingVertical: 0,
    paddingRight: 40,
  },
  clearButton: {
    position: "absolute",
    right: 15,
  },
  modalButton: {
    backgroundColor: "#FF5757",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FF5757",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  modalButtonDisabled: {
    backgroundColor: "#CCCCCC",
    ...Platform.select({
      ios: { shadowColor: "transparent" },
      android: { elevation: 0 },
    }),
  },
  modalButtonText: {
    fontSize: 17,
    fontFamily: FontFamily.urbanistSemiBold,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default Login;
