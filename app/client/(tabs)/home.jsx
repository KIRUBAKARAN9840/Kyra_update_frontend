import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  View,
  Text,
  BackHandler,
  ToastAndroid,
  TouchableOpacity,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { registerForPushNotificationsAsync } from "../../../components/usePushNotifications";
import { Ionicons } from "@expo/vector-icons";
import {
  getCachedLocation,
  peekPermissionStatus,
  refreshPermissionStatus,
  clearLocationCache,
  setLocationOverride as setLocationOverrideCache,
  clearLocationOverride as clearLocationOverrideCache,
  getLocationOverride,
} from "../../../services/locationCache";
import * as Location from "expo-location";
import {
  getHomeDataAPI,
  checkScanEligibilityAPI,
  joinNutritionSession,
} from "../../../services/clientApi";
import { handleNutritionPay } from "../../../components/ui/Payment/nutritionpayfn";
import { showToast } from "../../../utils/Toaster";
import { useTabScroll } from "../../../context/TabScrollContext";
import Footer from "../../../components/ui/Home/progesspage/footer";
import LocationSearchModal from "../../../components/ui/Home/LocationSearchModal";
import GymPricingModal from "../../../components/ui/DailyPass/GymPricingModal";

// ── Extracted components ──
import {
  HOME_GIF_MAP,
  FETCH_COOLDOWN,
  width,
} from "../../../components/ui/Home/constants";
import styles from "../../../components/ui/Home/homeStyles";
import SkeletonBox from "../../../components/ui/Home/SkeletonBox";
import LocationHeader from "../../../components/ui/Home/LocationHeader";
import {
  SlideBanner,
  OfferBanner,
  ExpertBanner,
  DietCoach,
  GymMateBanner,
  ScannerBanner,
  DailyPassBanner,
} from "../../../components/ui/Home/LottieBanners";
import ActiveBookingsBanner from "../../../components/ui/Home/ActiveBookingsBanner";
import FreeCreditsCard from "../../../components/ui/Home/FreeCreditsCard";
import FrequentlyBookedCard from "../../../components/ui/Home/FrequentlyBookedCard";
import DailyPassSection from "../../../components/ui/Home/DailyPassSection";
import GymMateCards from "../../../components/ui/Home/GymMateSection";
import FriendRequestsBanner from "../../../components/ui/Home/FriendRequestsBanner";
import TrendingSessionsSection from "../../../components/ui/Home/TrendingSessionsSection";
import ExpertCard from "../../../components/ui/Home/ExpertCard";
import MembershipSection from "../../../components/ui/Home/MembershipSection";
import ArrivingSection from "../../../components/ui/Home/ArrivingSection";
import WorkoutPartnersSection from "../../../components/ui/Home/WorkoutPartnersSection";
import HomeModals from "../../../components/ui/Home/HomeModals";
import CenterModal from "../../../components/ui/Home/CenterModal";

const HomeScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useTabScroll();
  const lastFetchTime = useRef(0);
  const locationFetched = useRef(false);
  const doubleBackPressRef = useRef(false);
  const backTimeoutRef = useRef(null);
  const lottieRef = useRef(null);
  const viewAllLottieRef = useRef(null);
  const creditIconScale = useRef(new Animated.Value(1)).current;

  const [locationArea, setLocationArea] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationOverride, setLocationOverride] = useState(() =>
    getLocationOverride(),
  );
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [credits, setCredits] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(false);

  const [nextDay, setNextDay] = useState(false);
  const [nearbySessions, setNearbySessions] = useState([]);
  const [earliestSlot, setEarliestSlot] = useState(null);
  const [nearbyMemberships, setNearbyMemberships] = useState([]);
  const [dailyPassGyms, setDailyPassGyms] = useState([]);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [pricingGymId, setPricingGymId] = useState(null);
  const [pricingGymName, setPricingGymName] = useState("");
  const [homeLoading, setHomeLoading] = useState(true);
  const [gif, setGif] = useState("second");
  const [showDailyPassModal, setShowDailyPassModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [promoModalType, setPromoModalType] = useState(null);
  const [passesLeft, setPassesLeft] = useState(0);
  const [noGyms, setNoGyms] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [gymRequestMsg, setGymRequestMsg] = useState(null);
  const [gymRequested, setGymRequested] = useState(false);
  const [nutritionPurchased, setNutritionPurchased] = useState(false);
  const [showExpertCard, setShowExpertCard] = useState(true);
  const [notAttended, setNotAttended] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [dietPlanAssigned, setDietPlanAssigned] = useState(false);
  const [joinSessionModal, setJoinSessionModal] = useState({
    visible: false,
    type: null,
    message: null,
    bookingDate: null,
    startTime: null,
    endTime: null,
  });
  const [joiningSession, setJoiningSession] = useState(false);
  const [nutritionSchedule, setNutritionSchedule] = useState(null);
  const [freeCreditsCard, setFreeCreditsCard] = useState(null);
  const [scanEligibilityChecking, setScanEligibilityChecking] = useState(false);
  const [noCreditsVisible, setNoCreditsVisible] = useState(false);
  const [bookings, setBookings] = useState(null);
  const [nutritionSlots, setNutritionSlots] = useState(null);
  const [nutritionPackage, setNutritionPackage] = useState(null);
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);
  const lastPurchasedSku = useRef(null);
  const [iosNutriModal, setIosNutriModal] = useState({
    visible: false,
    alreadyExists: false,
  });
  const [iosNutriLoading, setIosNutriLoading] = useState(false);
  const [centerModalType, setCenterModalType] = useState(null);
  const [gmOnboarding, setGmOnboarding] = useState(null);
  const [myPendingRequests, setMyPendingRequests] = useState([]);
  const [friendRequests, setFriendRequests] = useState(null);
  const [entries, setEntries] = useState(null);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [frequentlyBooked, setFrequentlyBooked] = useState(null);
  // ── Navigation handlers ──
  const goCredits = useCallback(() => router.push("/client/credits"), []);
  const goAccount = useCallback(() => router.push("/client/account"), []);
  const goAllClass = useCallback(
    () => router.push("/client/(fitnessclass)/allclass"),
    [],
  );
  const goListGyms = useCallback(
    () => router.push("/client/(workout)/kyraAI"),
    [],
  );

  const handleDailyPassCardPress = useCallback((gym) => {
    setPricingGymId(gym.gym_id);
    setPricingGymName(gym.gym_name || gym.name || "");
    setPricingModalVisible(true);
  }, []);

  const handleDailyPassBook = useCallback((gym) => {
    setPricingGymId(gym.gym_id);
    setPricingGymName(gym.gym_name || gym.name || "");
    setPricingModalVisible(true);
  }, []);

  const goNutritionBooking = useCallback(
    () => router.push("/client/nutritionBooking"),
    [],
  );
  const goNutritionPage = useCallback(() => router.push("/client/diet"), []);
  const goListAll = useCallback(
    () => router.push("/client/(membership)/listall"),
    [],
  );
  const goToGymMate = useCallback(() => router.push("/client/gymmate"), []);
  const goToGymMateFriend = useCallback(
    () => router.push("/client/(gymmate)/friends"),
    [],
  );

  const goToGymMateExplore = useCallback(() => {
    const onboarded = gmOnboarding?.onboarding_completed === true;
    const hasRequests = myPendingRequests && myPendingRequests.length > 0;
    if (onboarded && hasRequests) {
      router.push("/client/(gymmate)/allmates");
    } else {
      router.push("/client/gymmate");
    }
  }, [gmOnboarding, myPendingRequests]);

  // ── Data fetching ──
  const fetchAll = async () => {
    try {
      const coords = await getCachedLocation();
      const override = getLocationOverride();
      let geoPromise;

      if (override) {
        setLocationCoords(coords);
        setLocationDenied(false);
        geoPromise = Promise.resolve(null);
        setLocationArea(override.label || "");
        setLocationAddress("");
        locationFetched.current = true;
      } else {
        if (coords) {
          setLocationCoords(coords);
          setLocationDenied(false);
        }
        if (!coords) {
          const perm = peekPermissionStatus();
          if (perm && perm.status !== "granted") {
            setLocationDenied(true);
          }
          setHomeLoading(false);
          return;
        }
        geoPromise = locationFetched.current
          ? Promise.resolve(null)
          : Location.reverseGeocodeAsync({
              latitude: coords.lat,
              longitude: coords.lng,
            });
      }

      const [data, geoResults] = await Promise.all([
        getHomeDataAPI(coords.lat, coords.lng),
        geoPromise,
      ]);
      if (data?.status === 200) {
        setNextDay(data?.next_day ?? false);
        setCredits(data.credits ?? 0);
        setIsUnlimited(data.is_unlimited === true);
        setNearbySessions(data.nearby_sessions ?? []);
        setEarliestSlot(data.earliest_slot ?? null);
        setNearbyMemberships(data.nearby_memberships ?? []);
        setDailyPassGyms(data.dailypass_gyms ?? []);
        setNutritionPurchased(data.nutrition_purchased ?? false);
        setShowExpertCard(data?.personal_coach !== false);
        setNotAttended(data.not_attended ?? false);
        setBookingId(data.nutrition_booking_id ?? null);
        setDietPlanAssigned(data.diet_plan_assigned ?? false);
        setNutritionSchedule(data.nutrition_schedule ?? null);
        setNutritionPackage(data.nutrition_package ?? null);
        setFreeCreditsCard(data.free_credits_card ?? null);
        setBookings(data.bookings ?? null);
        setNutritionSlots(data.nutrition_slots_available ?? null);
        setFriendSuggestions(data.gym_mate_friend_suggestions ?? []);
        setFrequentlyBooked(data.frequently_booked ?? null);
        setReferralCode(data.referral_code ?? "");
        if (data?.no_gyms) {
          setNoGyms(true);
          setGif("seventh");
        } else {
          setNoGyms(false);
          const mapped = HOME_GIF_MAP[data?.home_gif];
          if (mapped) setGif(mapped);
        }
        setPassesLeft(data.no_of_passes_left ?? 0);
        setGmOnboarding(data.gym_mate_onboarding ?? null);
        setMyPendingRequests(data.gym_mate_nearby ?? []);
        setFriendRequests(data.gym_mate_friend_requests ?? null);
        setEntries(data.total_entries ?? null);
        if (data?.modal) {
          if (!data?.no_gyms && data.modal === "dailypass") {
            setTimeout(() => setShowDailyPassModal(true), 2000);
          } else if (["gymmate1", "gymmate2"].includes(data.modal)) {
            setTimeout(() => setCenterModalType(data.modal), 2000);
          } else if (
            [
              "rewards",
              "rewards1",
              "rewards2",
              "refer",
              "diet",
              "workout",
              "step",
              "water",
            ].includes(data.modal)
          ) {
            setTimeout(() => setPromoModalType(data.modal), 2000);
          }
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }

      if (geoResults && geoResults.length > 0) {
        locationFetched.current = true;
        const r = geoResults[0];
        const area = r.district || r.subregion || r.city || r.name || "";
        const parts = [r.street, r.district, r.city, r.region]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i);
        setLocationArea(area);
        setLocationAddress(parts.join(", "));
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setHomeLoading(false);
    }
  };

  const handleEnableLocation = async () => {
    if (requestingLocation) return;
    setRequestingLocation(true);
    try {
      const current = await refreshPermissionStatus();
      if (current && current.status !== "granted" && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      clearLocationCache();
      setHomeLoading(true);
      await fetchAll();
    } finally {
      setRequestingLocation(false);
    }
  };

  const applyLocationOverride = useCallback(async (override) => {
    setLocationOverrideCache(override);
    setLocationOverride(override);
    setShowLocationModal(false);
    setHomeLoading(true);
    await fetchAll();
  }, []);

  const clearLocationOverrideHandler = useCallback(async (newCoords) => {
    clearLocationOverrideCache();
    setLocationOverride(null);
    setShowLocationModal(false);
    setHomeLoading(true);
    locationFetched.current = false;
    if (newCoords?.label) setLocationArea(newCoords.label);
    await fetchAll();
  }, []);

  const handleShareReferral = async () => {
    try {
      const message = `Try this amazing Fitness App - Fymble powered by KyraAI.\n\nUse my referral code *${referralCode}* to get ₹100 Fymble cash now on successful registration.\n\n Use the Fymble Cash and Book Daily Pass, Fitness Class, Gym Membership & More.\n\n📱 Download Fymble: https://fymble.app/download\n\n`;
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast({
          type: "error",
          title: "WhatsApp not found",
          desc: "Please install WhatsApp to use this feature",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to open WhatsApp",
      });
    }
  };

  const PROMO_MODAL_CONFIG = {
    rewards: {
      image: require("../../../assets/images/modal/modal_iphone.webp"),
      heading: "Win iPhone 17 Pro Max",
      content:
        "Book passes, join classes, or refer\nfriends to earn more entries daily.",
      button: "View Rewards",
      color: "#E6B136",
      route: "/client/rewardprogram",
    },
    rewards1: {
      image: require("../../../assets/images/modal/modal_rewards1.webp"),
      heading: "Win iPhone 17 Pro Max",
      content:
        entries > 0
          ? `You have ${entries} ${entries === 1 ? "entry" : "entries"}. Earn more entries to increase your winning chance!`
          : "Start using Fymble to earn entries and get a chance to win big!",
      button: "View Rewards",
      color: "#E6B136",
      route: "/client/rewardprogram",
    },
    rewards2: {
      image: require("../../../assets/images/modal/modal_rewards2.webp"),
      heading: "Win iPhone 17 Pro Max",
      content:
        entries > 0
          ? `You have ${entries} ${entries === 1 ? "entry" : "entries"}. Earn more entries to increase your winning chance!`
          : "Start using Fymble to earn entries and get a chance to win big!",
      button: "View Rewards",
      color: "#E6B136",
      route: "/client/rewardprogram",
    },
    refer: {
      image: require("../../../assets/images/modal/modal_refer.webp"),
      heading: "Refer a Friend to Fymble & Get \u20B9100",
      content:
        "Your friend gets \u20B9100 Fymble Cash on\nsignup using your referral code",
      button: "Invite via WhatsApp",
      color: "#E6B136",
      action: "handleShareReferral",
    },
    diet: {
      image: require("../../../assets/images/modal/modal_diet.webp"),
      heading: "Eat Right,\nAchieve More",
      content:
        "Personalizes diet plans, calories tracking and healthy meals to fuel your goals.",
      button: "Explore Diet Plans",
      color: "#309938",
      route: "/client/diet",
    },
    workout: {
      image: require("../../../assets/images/modal/modal_workout.webp"),
      heading: "Ready for\nToday's Workout?",
      content: "Start your training journey now",
      button: "Go to Workout",
      color: "#FF5757",
      route: "/client/workouttracker",
    },
    step: {
      image: require("../../../assets/images/modal/modal_steps.webp"),
      heading: "Track Every Step",
      content:
        "Track daily steps, calories, distance, and activity automatically with smart monitoring",
      button: "Start Tracking",
      color: "#008765",
      route: "/client/stepDetails",
    },
    water: {
      image: require("../../../assets/images/modal/modal_water.webp"),
      heading: "Stay Hydrated",
      content:
        "Track your daily water intake and reach hydration goal every day",
      button: "Track Now",
      color: "#307486",
      route: "/client/watertracker",
    },
  };

  const handlePromoAction = () => {
    const config = PROMO_MODAL_CONFIG[promoModalType];
    if (!config) return;
    setPromoModalType(null);
    if (config.action === "handleShareReferral") {
      handleShareReferral();
    } else if (config.route) {
      router.push(config.route);
    }
  };

  const handleViewBookings = () => {
    if (!bookings) return;
    const { dailypass, sessions, gym_membership } = bookings;
    if (gym_membership && (dailypass || sessions)) {
      router.push("/client/account");
      return;
    }
    if (gym_membership) {
      router.push("/unpaid/activateaccount");
      return;
    }
    if (dailypass) {
      router.push({
        pathname: "/client/allpass",
        params: { tab: "Daily Pass" },
      });
      return;
    }
    if (sessions) {
      router.push({
        pathname: "/client/allpass",
        params: { tab: "Fitness Classes" },
      });
    }
  };

  const handleScanFood = async () => {
    setScanEligibilityChecking(true);
    try {
      const coords = await getCachedLocation();
      const res = await checkScanEligibilityAPI({
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (res?.eligibility === false) {
        setNoCreditsVisible(true);
        return;
      }
      router.push({
        pathname: "/client/(diet)/foodscanner",
        params: {
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          nearby_sessions: JSON.stringify(res?.nearby_sessions ?? []),
          nutrition_purchased: res?.nutrition_purchased || false,
        },
      });
    } finally {
      setScanEligibilityChecking(false);
    }
  };

  const handleNutritionPurchase = async (sku) => {
    if (nutriPayInProgress.current) return;
    nutriPayInProgress.current = true;
    lastPurchasedSku.current = sku;
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

  const handleJoinSession = async () => {
    if (!bookingId || joiningSession) return;
    setJoiningSession(true);
    try {
      const res = await joinNutritionSession(bookingId);
      if (res?.status === 200) {
        const d = res.data;
        if (d.join_time && d.meeting_link && d.link) {
          Linking.openURL(d.link).catch(() =>
            showToast({ type: "error", title: "Could not open meeting link" }),
          );
        } else if (d.join_time && !d.meeting_link) {
          setJoinSessionModal({
            visible: true,
            type: "no_link",
            message: d.message,
            bookingDate: d.booking_date,
            startTime: d.start_time,
            endTime: d.end_time,
          });
        } else if (d.session_expired) {
          setJoinSessionModal({
            visible: true,
            type: "expired",
            message: d.message,
            bookingDate: d.booking_date,
            startTime: d.start_time,
            endTime: d.end_time,
          });
        } else {
          setJoinSessionModal({
            visible: true,
            type: "not_started",
            message: d.message,
            bookingDate: d.booking_date,
            startTime: d.start_time,
            endTime: d.end_time,
          });
        }
      } else {
        setJoinSessionModal({
          visible: true,
          type: "not_found",
          message: "Booking not found or not accessible.",
          bookingDate: null,
          startTime: null,
          endTime: null,
        });
      }
    } catch {
      showToast({ type: "error", title: "Failed to join session" });
    } finally {
      setJoiningSession(false);
    }
  };

  // ── Effects ──
  useFocusEffect(
    useCallback(() => {
      fetchAll();
      const now = Date.now();
      if (now - lastFetchTime.current > FETCH_COOLDOWN) {
        lastFetchTime.current = now;
        AsyncStorage.getItem("client_id")
          .then((client_id) => {
            if (client_id) registerForPushNotificationsAsync(client_id);
          })
          .catch(() => {
            showToast({
              type: "error",
              title: "Error",
              desc: "Something went wrong. Please try again later",
            });
          });
      }
    }, []),
  );

  useEffect(() => {
    if (!homeLoading) {
      const t = setTimeout(() => {
        lottieRef.current?.play();
        viewAllLottieRef.current?.play();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [homeLoading]);

  useEffect(() => {
    if (!homeLoading) {
      const bounce = () => {
        Animated.sequence([
          Animated.timing(creditIconScale, {
            toValue: 2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(creditIconScale, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(creditIconScale, {
            toValue: 1.15,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(creditIconScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
      };
      const t = setTimeout(bounce, 2000);
      const interval = setInterval(bounce, 5000);
      return () => {
        clearTimeout(t);
        clearInterval(interval);
      };
    }
  }, [homeLoading]);

  useFocusEffect(
    useCallback(() => {
      if (!homeLoading) {
        lottieRef.current?.play();
        viewAllLottieRef.current?.play();
      }

      const backAction = () => {
        if (doubleBackPressRef.current) {
          BackHandler.exitApp();
          return true;
        }
        doubleBackPressRef.current = true;
        if (Platform.OS === "android") {
          ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
        }
        if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
        backTimeoutRef.current = setTimeout(() => {
          doubleBackPressRef.current = false;
        }, 2000);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", backAction);

      return () => {
        lottieRef.current?.pause();
        viewAllLottieRef.current?.pause();
        sub.remove();
        if (backTimeoutRef.current) clearTimeout(backTimeoutRef.current);
      };
    }, [homeLoading]),
  );

  // ── Render ──
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LocationHeader
        insets={insets}
        gif={gif}
        locationDenied={locationDenied}
        locationArea={locationArea}
        locationAddress={locationAddress}
        requestingLocation={requestingLocation}
        handleEnableLocation={handleEnableLocation}
        onLocationPress={() => setShowLocationModal(true)}
        homeLoading={homeLoading}
        isUnlimited={isUnlimited}
        credits={credits}
        creditIconScale={creditIconScale}
        goCredits={goCredits}
        goAccount={goAccount}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + 10 }}
        onScroll={
          scrollY
            ? Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true },
              )
            : undefined
        }
        scrollEventThrottle={16}
      >
        {/* Fitness Classes Banner */}
        {homeLoading ? (
          <View style={{ alignItems: "center", paddingBottom: 14 }}>
            <SkeletonBox
              style={{ width: width, height: 135, borderRadius: 0 }}
            />
          </View>
        ) : (
          <>
            {gif === "first" && (
              <SlideBanner ref={lottieRef} onPress={goAllClass} />
            )}
            {gif === "second" && (
              <OfferBanner ref={lottieRef} onPress={goAllClass} />
            )}
            {gif === "third" && <ScannerBanner ref={lottieRef} />}
            {gif === "fourth" && (
              <DailyPassBanner ref={lottieRef} onPress={goListGyms} />
            )}
            {gif === "fifth" && (
              <ExpertBanner ref={lottieRef} onPress={goNutritionPage} />
            )}
            {gif === "sixth" && (
              <DietCoach ref={lottieRef} onPress={goNutritionPage} />
            )}
            {gif === "seventh" && (
              <GymMateBanner ref={lottieRef} onPress={goToGymMate} />
            )}
          </>
        )}

        <ActiveBookingsBanner
          bookings={bookings}
          onViewBookings={handleViewBookings}
        />

        <FreeCreditsCard
          freeCreditsCard={freeCreditsCard}
          setFreeCreditsCard={setFreeCreditsCard}
          scanEligibilityChecking={scanEligibilityChecking}
          handleScanFood={handleScanFood}
          goCredits={goCredits}
        />

        <FrequentlyBookedCard
          gym={frequentlyBooked}
          onBookAgain={handleDailyPassBook}
        />

        <DailyPassSection
          homeLoading={homeLoading}
          noGyms={noGyms}
          dailyPassGyms={dailyPassGyms}
          goListGyms={goListGyms}
          onCardPress={handleDailyPassCardPress}
          onBookPress={handleDailyPassBook}
        />

        {/* Gym Mate Section */}
        {homeLoading ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
            <SkeletonBox
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                marginBottom: 12,
              }}
            />
            <SkeletonBox
              style={{ width: "100%", height: 120, borderRadius: 14 }}
            />
          </View>
        ) : !(
            gmOnboarding?.onboarding_completed === true &&
            !(myPendingRequests && myPendingRequests.length > 0)
          ) ? (
          <>
            <View style={styles.gymMateSection}>
              <LinearGradient
                colors={["#F4F4F4", "rgba(244,244,244,0)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.membershipHeadingCard}
              >
                <TouchableOpacity
                  style={styles.sectionTitleRow}
                  onPress={goToGymMateExplore}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sectionHeading,
                      { marginBottom: 0, flex: 1, textAlign: "left" },
                    ]}
                  >
                    Find gym mates near You
                  </Text>
                  <TouchableOpacity
                    style={styles.viewAllInline}
                    activeOpacity={0.7}
                    onPress={goToGymMateExplore}
                  >
                    <Text style={styles.viewAll}>Explore Now</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#007AFF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <GymMateCards
              onboarding={gmOnboarding}
              pendingRequests={myPendingRequests}
              onRequestSent={(sessionId) =>
                setMyPendingRequests((prev) =>
                  prev.map((r) =>
                    r.session_id === sessionId
                      ? { ...r, _requestSent: true }
                      : r,
                  ),
                )
              }
              goToGymMate={goToGymMate}
              goToGymMateExplore={goToGymMateExplore}
            />
          </>
        ) : null}

        <FriendRequestsBanner
          homeLoading={homeLoading}
          friendRequests={friendRequests}
        />

        <TrendingSessionsSection
          homeLoading={homeLoading}
          noGyms={noGyms}
          nearbySessions={nearbySessions}
          nextDay={nextDay}
          goAllClass={goAllClass}
          viewAllLottieRef={viewAllLottieRef}
        />

        <ExpertCard showExpertCard={showExpertCard} />

        <MembershipSection
          homeLoading={homeLoading}
          noGyms={noGyms}
          nearbyMemberships={nearbyMemberships}
          goListAll={goListAll}
        />

        <WorkoutPartnersSection
          suggestions={friendSuggestions}
          onboardingCompleted={gmOnboarding?.onboarding_completed === true}
          onCardPress={(client_id) =>
            gmOnboarding?.onboarding_completed === true
              ? router.push({
                  pathname: "/client/(gymmate)/profilemate",
                  params: { client_id },
                })
              : router.push("/client/gymmate")
          }
          onNotOnboarded={() => router.push("/client/gymmate")}
          onSeeAll={() =>
            gmOnboarding?.onboarding_completed === true
              ? router.push("/client/(gymmate)/friends")
              : router.push("/client/gymmate")
          }
          onSent={(clientId) =>
            setFriendSuggestions((prev) =>
              prev.filter((f) => f.client_id !== clientId),
            )
          }
        />

        <ArrivingSection
          noGyms={noGyms}
          locationCoords={locationCoords}
          gymRequested={gymRequested}
          setGymRequested={setGymRequested}
          gymRequestMsg={gymRequestMsg}
          setGymRequestMsg={setGymRequestMsg}
        />

        <Footer />
      </Animated.ScrollView>

      {/* Location Search Modal */}
      <LocationSearchModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        hasOverride={!!locationOverride}
        onSelect={applyLocationOverride}
        onUseCurrentLocation={clearLocationOverrideHandler}
      />

      {/* Gym Pricing Modal (Daily Pass cards) */}
      <GymPricingModal
        visible={pricingModalVisible}
        onClose={() => setPricingModalVisible(false)}
        gymId={pricingGymId}
        gymName={pricingGymName}
      />

      <HomeModals
        insets={insets}
        showDailyPassModal={showDailyPassModal}
        setShowDailyPassModal={setShowDailyPassModal}
        locationArea={locationArea}
        goListGyms={goListGyms}
        promoModalType={promoModalType}
        setPromoModalType={setPromoModalType}
        promoModalConfig={PROMO_MODAL_CONFIG}
        handlePromoAction={handlePromoAction}
        joinSessionModal={joinSessionModal}
        setJoinSessionModal={setJoinSessionModal}
        iosNutriModal={iosNutriModal}
        setIosNutriModal={setIosNutriModal}
        noCreditsVisible={noCreditsVisible}
        setNoCreditsVisible={setNoCreditsVisible}
        goCredits={goCredits}
        nutriPayProcessing={nutriPayProcessing}
        nutriPayStep={nutriPayStep}
        nutriPaySuccess={nutriPaySuccess}
        setNutriPaySuccess={setNutriPaySuccess}
        fetchAll={fetchAll}
        lastPurchasedSku={lastPurchasedSku.current}
        goNutritionBooking={goNutritionBooking}
        goDietCoachHeight={() => router.push("/client/(dietcoach)/height")}
        nutriPayFailed={nutriPayFailed}
        setNutriPayFailed={setNutriPayFailed}
      />

      <CenterModal
        visible={!!centerModalType}
        modalType={centerModalType}
        onClose={() => setCenterModalType(null)}
        onImagePress={goToGymMate}
      />
    </View>
  );
};

export default HomeScreen;
