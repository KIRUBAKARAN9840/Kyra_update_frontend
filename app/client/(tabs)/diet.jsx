import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Animated, ScrollView } from "react-native";
import { useTabScroll } from "../../../context/TabScrollContext";
import FeedbackModal from "../../../components/ui/FeedbackModal";
import { MaskedText } from "../../../components/ui/MaskedText";
import {
  getNutritionPageAPI,
  joinNutritionSession,
} from "../../../services/clientApi";
import { getCachedLocation } from "../../../services/locationCache";
import { showToast } from "../../../utils/Toaster";
import DietSelection from "../../../components/ui/Diet/adddiet";
import { handleNutritionPay } from "../../../components/ui/Payment/nutritionpayfn";
import YoutubeIframe from "react-native-youtube-iframe";

const { width } = Dimensions.get("window");
const isIOS = Platform.OS === "ios";

const Diet = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState("");
  const [activeTab, setActiveTab] = useState("expert");
  const [selectedPersonalPlan, setSelectedPersonalPlan] = useState("expert_1m");

  const [macrosData, setMacrosData] = useState(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [nutritionPurchased, setNutritionPurchased] = useState(false);
  const [dietPlanAssigned, setDietPlanAssigned] = useState(false);

  // Nutrition page API state
  const [aiPurchased, setAiPurchased] = useState(false);
  const [personalPurchased, setPersonalPurchased] = useState(false);
  const [createPlan, setCreatePlan] = useState(false);
  const [personalStatus, setPersonalStatus] = useState(null);
  const [joiningSession, setJoiningSession] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [videoIds, setVideoIds] = useState(null);

  // Payment flow states
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);
  const lastPurchasedSku = useRef(null);

  const scrollY = useTabScroll();
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const [stickyVisible, setStickyVisible] = useState(false);

  // Drive sticky purchase CTA visibility from the same scrollY the tab bar uses:
  // scroll down → CTA slides up into view (and the tab bar hides);
  // scroll up   → CTA slides off (and the tab bar comes back).
  // Uses a larger threshold (12 vs tab bar's 5) so the CTA only appears after
  // the tab bar has definitively hidden, preventing both being visible at once.
  const STICKY_THRESHOLD = 12;
  const stickyTarget = useRef(0);
  useEffect(() => {
    if (!scrollY) return;
    let lastY = 0;
    const id = scrollY.addListener(({ value }) => {
      const diff = value - lastY;
      lastY = value;
      if (diff > STICKY_THRESHOLD && stickyTarget.current !== 1) {
        stickyTarget.current = 1;
        setStickyVisible(true);
        Animated.timing(stickyAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      } else if (diff < -5 && stickyTarget.current !== 0) {
        stickyTarget.current = 0;
        setStickyVisible(false);
        Animated.timing(stickyAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, stickyAnim]);

  useEffect(() => {
    if (params?.showTarget === "true") {
      setTimeout(() => setShowTargetModal(true), 500);
    } else if (params?.showFeedback === "true") {
      setTimeout(() => setShowFeedbackModal(true), 500);
    }
  }, [params?.showTarget, params?.showFeedback]);

  useFocusEffect(
    useCallback(() => {
      // Hide diet UI while we decide whether to redirect — prevents the flash
      setPageReady(false);
      fetchNutritionPage();
    }, [params?.forceChoose]),
  );

  const fetchNutritionPage = async () => {
    try {
      const res = await getNutritionPageAPI();

      if (res?.status === 200) {
        const ai = res?.ai ?? false;
        const personal = res?.personal ?? false;
        const cp = res?.create_plan ?? false;
        const dietAssigned = res?.personal_status?.diet_plan_assigned ?? false;

        setAiPurchased(ai);
        setPersonalPurchased(personal);
        setCreatePlan(cp);
        setNutritionPurchased(
          res?.personal_status?.nutrition_purchased ?? false,
        );
        setDietPlanAssigned(dietAssigned);
        setPersonalStatus(res?.personal_status ?? null);
        setVideoIds(res?.video ?? null);

        // forceChoose: opened from profile → always show "Choose Your Nutrition Plan",
        // skip redirects and don't render purchased state.
        const forceChoose = params?.forceChoose === "true";

        if (!forceChoose) {
          // Only-AI + plan generated → go straight to the saved plan page
          if (ai && !personal && !cp) {
            router.replace("/client/(dietcoach)/savedmeal");
            return;
          }
          // Only-Personal + plan assigned → go straight to nutrition plan page
          if (!ai && personal && dietAssigned) {
            router.replace("/client/(diet)/nutritionplan");
            return;
          }
        }

        // No redirect — show the diet page
        setPageReady(true);
      } else {
        setPageReady(true);
      }
    } catch (error) {
      console.error("Error fetching nutrition page:", error);
      setPageReady(true);
    }
  };

  useEffect(() => {
    const getGender = async () => {
      try {
        setGender(await AsyncStorage.getItem("gender"));
      } catch (err) {}
    };
    getGender();
    getCachedLocation().then((coords) => {
      if (coords) setLocationCoords(coords);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.push("/client/home");
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, []),
  );

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
    const bId = personalStatus?.nutrition_booking_id;
    if (!bId || joiningSession) return;
    setJoiningSession(true);
    try {
      const res = await joinNutritionSession(bId);
      if (res?.status === 200 && res.data?.link) {
        Linking.openURL(res.data.link).catch(() =>
          showToast({ type: "error", title: "Could not open meeting link" }),
        );
      } else {
        showToast({
          type: "info",
          title: res?.data?.message || "Session not available yet",
        });
      }
    } catch {
      showToast({ type: "error", title: "Failed to join session" });
    } finally {
      setJoiningSession(false);
    }
  };

  const formatSessionDateTime = () => {
    const schedule = personalStatus?.nutrition_schedule;
    if (!schedule?.booking_date || !schedule?.start_time) return "";
    const dateObj = new Date(schedule.booking_date);
    const day = dateObj.getUTCDate();
    const month = dateObj.toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    const [hStr, mStr] = schedule.start_time.split(":");
    let h = parseInt(hStr, 10);
    const mins = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${day} ${month} • ${h}:${mins} ${ampm}`;
  };

  const pkg = personalStatus?.nutrition_package;

  const renderPurchasedSection = () => {
    if (!aiPurchased && !personalPurchased) return null;

    return (
      <View style={pStyles.section}>
        {/* Section Header */}
        <View style={pStyles.sectionHeader}>
          <Text style={pStyles.sectionHeaderText}>My Nutrition Plans</Text>
        </View>
        <View style={pStyles.sectionHeaderDivider} />

        {/* AI Diet Card — Generate flow (plan not yet generated) */}
        {aiPurchased && createPlan && (
          <View style={pStyles.aiGenCard}>
            <ExpoImage
              source={require("../../../assets/images/generate_ai_diet.webp")}
              style={pStyles.aiGenHero}
              contentFit="cover"
            />
            <View style={pStyles.aiGenBottomSection}>
              <View style={pStyles.aiGenInfoRow}>
                <ExpoImage
                  source={require("../../../assets/images/ai_icon_diet_coach.png")}
                  style={pStyles.aiGenIcon}
                  contentFit="contain"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={pStyles.aiGenTitle}>AI Diet Coach</Text>
                  <Text style={pStyles.aiGenSubtitle}>
                    Generate your AI Diet Plan
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push("/client/(dietcoach)/height")}
                style={pStyles.aiGenBtn}
              >
                <Text style={pStyles.aiGenBtnText}>Generate My AI Plan</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="#1A2A4F"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Diet Card — plan already generated (View flow) */}
        {aiPurchased && !createPlan && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={pStyles.purchasedCard}
            onPress={() => router.push("/client/(dietcoach)/savedmeal")}
          >
            <LinearGradient
              colors={["#EEF4FF", "#F5F0FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={pStyles.purchasedCardGradient}
            >
              <View style={pStyles.purchasedCardRow}>
                <View style={pStyles.purchasedIconWrap}>
                  <Ionicons name="sparkles" size={22} color="#3A63D3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pStyles.purchasedCardTitle}>AI Diet Coach</Text>
                  <Text style={pStyles.purchasedCardSub}>
                    View your AI-generated diet plan
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#3A63D3" />
              </View>
              <View style={pStyles.purchasedCardBtnRow}>
                <View
                  style={[
                    pStyles.purchasedCardBtn,
                    { backgroundColor: "#3A63D3" },
                  ]}
                >
                  <Ionicons
                    name="eye"
                    size={14}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={pStyles.purchasedCardBtnText}>
                    View AI Generated Plan
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Personal Nutrition Cards */}
        {personalPurchased && (
          <>
            {/* JOIN CARD — hero design (matches Book Session card pattern) */}
            {personalStatus?.not_attended &&
            personalStatus?.nutrition_booking_id &&
            personalStatus?.nutrition_schedule ? (
              <View style={pStyles.joinSessionCard}>
                <ExpoImage
                  source={require("../../../assets/images/consultation_booked.webp")}
                  style={pStyles.joinSessionHero}
                  contentFit="cover"
                />
                <View style={pStyles.joinSessionBottom}>
                  <View style={pStyles.joinSessionInfoRow}>
                    <View style={pStyles.joinSessionIconWrap}>
                      <Ionicons name="calendar" size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={pStyles.joinSessionTitle}>
                        Nutrition Session Scheduled
                      </Text>
                      <Text style={pStyles.joinSessionSubtitle}>
                        Your Session with nutrition expert is booked
                      </Text>
                    </View>
                  </View>
                  {!!formatSessionDateTime() && (
                    <Text style={pStyles.joinSessionDate}>
                      {formatSessionDateTime()}
                    </Text>
                  )}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleJoinSession}
                    disabled={joiningSession}
                    style={pStyles.joinSessionBtnWrapper}
                  >
                    <LinearGradient
                      colors={["#FFA940", "#FF7A1A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={pStyles.joinSessionBtn}
                    >
                      <Text style={pStyles.joinSessionBtnText}>
                        {joiningSession ? "Joining..." : "Join Session"}
                      </Text>
                      {!joiningSession && (
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : !personalStatus?.not_attended &&
              !personalStatus?.diet_plan_assigned &&
              personalStatus?.nutrition_booking_id ? (
              /* PLAN IN PROGRESS — user attended a session, plan being prepared.
                 Takes priority over BOOK/LOCKED so we don't suggest booking
                 another session while the plan is mid-creation. */
              <View style={pStyles.bookSessionCard}>
                <ExpoImage
                  source={require("../../../assets/images/book_session_image.webp")}
                  style={pStyles.bookSessionHero}
                  contentFit="cover"
                />
                <View
                  style={[
                    pStyles.bookSessionBottom,
                    { height: undefined, paddingVertical: 14 },
                  ]}
                >
                  <View style={pStyles.bookSessionInfoRow}>
                    <ExpoImage
                      source={require("../../../assets/images/expert_nutrition_icon.png")}
                      style={pStyles.bookSessionIcon}
                      contentFit="contain"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={pStyles.bookSessionTitle}>
                        Diet Plan Creation In Progress
                      </Text>
                      <Text style={pStyles.bookSessionSubtitle}>
                        Your personalized plan is being prepared
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : pkg?.has_active_package && pkg?.next_session_unlocked ? (
              /* BOOK CARD — hero design (matches AI Diet card pattern) */
              <View style={pStyles.bookSessionCard}>
                <ExpoImage
                  source={require("../../../assets/images/book_session_image.webp")}
                  style={pStyles.bookSessionHero}
                  contentFit="cover"
                />
                <View style={pStyles.bookSessionBottom}>
                  <View style={pStyles.bookSessionInfoRow}>
                    <ExpoImage
                      source={require("../../../assets/images/expert_nutrition_icon.png")}
                      style={pStyles.bookSessionIcon}
                      contentFit="contain"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={pStyles.bookSessionTitle}>
                        Expert Nutrition Plan
                      </Text>
                      <Text style={pStyles.bookSessionSubtitle}>
                        Book Your 1:1 Slot to get personalized diet plan
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push("/client/nutritionBooking")}
                    style={pStyles.bookSessionBtn}
                  >
                    <Text style={pStyles.bookSessionBtnText}>
                      Book 1:1 Session
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#FFFFFF"
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : pkg?.has_active_package && !pkg?.next_session_unlocked ? (
              /* LOCKED CARD: next session not yet unlocked */
              <View style={[pStyles.statusCard, { opacity: 0.75 }]}>
                <View style={pStyles.statusHeader}>
                  <View
                    style={[
                      pStyles.purchasedIconWrap,
                      { backgroundColor: "#FFF3E0" },
                    ]}
                  >
                    <Ionicons name="lock-closed" size={20} color="#FF9800" />
                  </View>
                  <Text style={pStyles.statusTitle}>
                    Nutrition Session Locked
                  </Text>
                </View>
                <Text style={pStyles.statusBigText}>
                  Nutrition Session {pkg.next_session_number} (
                  {pkg.next_session_duration} min)
                </Text>
                <View style={pStyles.statusDateRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color="#999"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={pStyles.statusDateMuted}>
                    Unlocks {pkg.next_unlock_date}
                  </Text>
                </View>
                <Text style={pStyles.statusSub}>
                  {pkg.sessions_remaining} session
                  {pkg.sessions_remaining !== 1 ? "s" : ""} remaining
                </Text>
              </View>
            ) : null}

            {/* DIET PLAN READY CARD */}
            {personalStatus?.diet_plan_assigned && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={pStyles.dietReadyCard}
                onPress={() => router.push("/client/(diet)/nutritionplan")}
              >
                <Ionicons name="leaf" size={20} color="#28A745" />
                <Text style={pStyles.dietReadyText}>
                  Your Nutrition Plan is Ready
                </Text>
                <Text style={pStyles.dietReadyArrow}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  const PLAN_TABS = {
    ai: {
      buttonText: "Get Your Plan Now",
      gradient: ["#739FD1", "#3A63D3"],
      sku: "ai_diet_coach",
    },
    expert: {
      buttonText: "Start Your Transformation",
      gradient: ["#00BBA7", "#00BC7D"],
    },
  };

  const PERSONAL_SUB_PLANS = {
    expert_1m: {
      title: "Expert Nutrition Plan",
      duration: "1 month",
      icon: require("../../../assets/images/expert_nutrition_icon.png"),
      aspectRatio: 1548 / 6000,
      sku: "nutri_1m",
    },
    expert_3m: {
      title: "Transformation \nPlan",
      duration: "3 month",
      icon: require("../../../assets/images/transformation_icon.png"),
      aspectRatio: 1548 / 7084,
      sku: "nutri_3m",
    },
  };

  const handlePlanImagePress = () => {
    const sku =
      activeTab === "expert"
        ? PERSONAL_SUB_PLANS[selectedPersonalPlan].sku
        : PLAN_TABS[activeTab].sku;
    handleNutritionPurchase(sku);
  };

  const AI_FEATURES = [
    {
      image: require("../../../assets/images/nutrition/diet_coach_two.webp"),
      title: "✨ Instant AI-Powered Nutrition",
      bullets: [
        "AI-Personalized Diet Plan (Built for Indian Food)",
        "Plans Based on Your Taste, Goal & Lifestyle",
        "Instant AI Food Calorie Scanner",
      ],
    },
    {
      image: require("../../../assets/images/nutrition/diet_coach_three.webp"),
      title: "🧠 Smart Guidance That Adapts",
      bullets: [
        "Weekly Followups based on Progress & Feedback",
        "Smart Food Swaps (Eat Better Without Sacrificing Taste)",
      ],
    },
    {
      image: require("../../../assets/images/nutrition/diet_coach_four.webp"),
      title: "📊 Effortless Tracking",
      bullets: [
        "Track Meals, Calories & Daily Progress",
        "Step, Water & Nutrition Tracking — All in One",
        "100 AI Food Scanner Credits Free",
      ],
    },
  ];

  const renderAiPlanCard = () => {
    const CardWrapper = TouchableOpacity;
    const wrapperProps = { activeOpacity: 0.9, onPress: handlePlanImagePress };

    return (
      <CardWrapper
        key="ai"
        {...wrapperProps}
        style={[
          aiCardStyles.wrapper,
          { display: activeTab === "ai" ? "flex" : "none" },
        ]}
      >
        {/* Hero Image */}
        <ExpoImage
          source={require("../../../assets/images/nutrition/diet_coach_one.webp")}
          style={aiCardStyles.heroImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />

        {/* Price */}
        <View style={aiCardStyles.priceRow}>
          <Text style={aiCardStyles.priceSymbol}>₹</Text>
          <Text style={aiCardStyles.priceAmount}>499</Text>
          <Text style={aiCardStyles.pricePer}> / month</Text>
        </View>

        {/* Badge */}
        <View style={aiCardStyles.badge}>
          <Text style={aiCardStyles.badgeText}>
            AI Diet Coach Plan Includes
          </Text>
        </View>

        {/* Feature Cards */}
        {AI_FEATURES.map((feature, i) => (
          <View key={i} style={aiCardStyles.featureCard}>
            <ExpoImage
              source={feature.image}
              style={aiCardStyles.featureImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <Text style={aiCardStyles.featureTitle}>{feature.title}</Text>
            <View style={aiCardStyles.bulletsWrap}>
              {feature.bullets.map((bullet, j) => (
                <View key={j} style={aiCardStyles.bulletRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color="#5670F5"
                    style={aiCardStyles.bulletIcon}
                  />
                  <Text style={aiCardStyles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </CardWrapper>
    );
  };

  const EXPERT_FEATURES = [
    {
      image: require("../../../assets/images/nutrition/expert_two.webp"),
      title: "👨‍⚕️ Personal Coaching & Guidance",
      bullets: [
        "Weekly 1:1 Expert Video Consultation",
        "Unlimited Chat Support with Your Nutrition Coach",
        "Personalized Diet Plan (Built for Your Goal & Lifestyle)",
        "Weekly Progress Tracking & Plan Adjustments",
      ],
    },
    {
      image: require("../../../assets/images/nutrition/expert_three.webp"),
      title: "🛠 Smart Tools & Daily Support",
      bullets: [
        "Daily Workout Guidance (Simple, Follow-Along)",
        "Step, Water & Nutrition Tracking — All in One",
        "AI-Powered Food & Calorie Tracking",
      ],
    },
    {
      image: require("../../../assets/images/nutrition/expert_four.webp"),
      title: "🩺 Condition-Based Diet Support",
      bullets: [
        "PCOS / PCOD Diet",
        "Diabetes Management Diet",
        "Thyroid Care Diet",
        "Muscle Specific Diet",
        "Obesity / Weight Loss Diet",
      ],
    },
    {
      image: require("../../../assets/images/nutrition/expert_five.webp"),
      title: "🌿 Sustainable Lifestyle Transformation",
      bullets: [
        "Build Healthy Eating Habits",
        "Practice Mindful Eating",
        "Lose Weight Without Giving Up Your Favourite Indian Food",
      ],
    },
  ];

  const TRANSFORMATION_EXTRA = {
    image: require("../../../assets/images/nutrition/transformation_six.webp"),
    title: "💎 Why 3 Months Works Better",
    bullets: [
      "Real body transformation needs 8-12 weeks minimum",
      "A single month isn't enough to build real sustainable results",
      "Continuous expert support = higher success rate",
    ],
  };

  const renderExpertPlanCard = () => {
    const plans = {
      expert_1m: {
        heroImage: require("../../../assets/images/nutrition/expert_one.webp"),
        price: "2499",
        pricePer: " / month",
        saveBadge: "Save 50%",
        badgeText: "Expert Nutrition Plan Includes",
        scannerCredits: "200 AI Food Scanner Credits Free",
        features: EXPERT_FEATURES,
      },
      expert_3m: {
        heroImage: require("../../../assets/images/nutrition/transformation_one.webp"),
        price: "5999",
        pricePer: " / 3 months",
        saveBadge: "Save 60%",
        badgeText: "3-Month Transformation Plan Includes",
        scannerCredits: "500 AI Food Scanner Credits Free",
        features: [...EXPERT_FEATURES, TRANSFORMATION_EXTRA],
      },
    };

    const CardWrapper = TouchableOpacity;
    const wrapperProps = { activeOpacity: 0.9, onPress: handlePlanImagePress };

    return (
      <View
        key="expert"
        style={{ display: activeTab === "expert" ? "flex" : "none" }}
      >
        {Object.entries(plans).map(([subKey, plan]) => (
          <CardWrapper
            key={subKey}
            {...wrapperProps}
            style={[
              expertCardStyles.wrapper,
              { display: selectedPersonalPlan === subKey ? "flex" : "none" },
            ]}
          >
            {/* Hero Image */}
            <ExpoImage
              source={plan.heroImage}
              style={expertCardStyles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />

            {/* Price Row */}
            <View style={expertCardStyles.priceRow}>
              <Text style={expertCardStyles.priceSymbol}>₹</Text>
              <Text style={expertCardStyles.priceAmount}>{plan.price}</Text>
              <Text style={expertCardStyles.pricePer}>{plan.pricePer}</Text>
              <View style={expertCardStyles.saveBadge}>
                <Text style={expertCardStyles.saveBadgeText}>
                  {plan.saveBadge}
                </Text>
              </View>
            </View>

            {/* Badge */}
            <LinearGradient
              colors={["#00BC7D", "#00BBA7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={expertCardStyles.badge}
            >
              <Text style={expertCardStyles.badgeText}>{plan.badgeText}</Text>
            </LinearGradient>

            {/* Feature Cards */}
            {plan.features.map((feature, i) => {
              const bullets =
                i === 1
                  ? [...feature.bullets, plan.scannerCredits]
                  : feature.bullets;
              return (
                <View key={i} style={expertCardStyles.featureCard}>
                  <ExpoImage
                    source={feature.image}
                    style={expertCardStyles.featureImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <Text style={expertCardStyles.featureTitle}>
                    {feature.title}
                  </Text>
                  <View style={expertCardStyles.bulletsWrap}>
                    {bullets.map((bullet, j) => (
                      <View key={j} style={expertCardStyles.bulletRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#00BC7D"
                          style={expertCardStyles.bulletIcon}
                        />
                        <Text style={expertCardStyles.bulletText}>
                          {bullet}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </CardWrapper>
        ))}
      </View>
    );
  };

  const renderPlanCard = (key) => {
    if (key === "ai") return renderAiPlanCard();
    if (key === "expert") return renderExpertPlanCard();
    return null;
  };

  if (!pageReady) {
    return (
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#3A63D3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom:
            params?.forceChoose === "true" ||
            (!aiPurchased && !personalPurchased)
              ? 160
              : 60,
        }}
        onScroll={
          scrollY
            ? Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false },
              )
            : undefined
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Purchased Plans Section — hidden in forceChoose mode (entry from profile) */}
        {params?.forceChoose !== "true" &&
          (aiPurchased || personalPurchased) && (
            <View
              style={{ paddingTop: insets.top + 10, paddingHorizontal: 16 }}
            >
              {renderPurchasedSection()}
            </View>
          )}

        {/* Choose Your Nutrition Plan — always shown in forceChoose mode */}
        {(params?.forceChoose === "true" ||
          (!aiPurchased && !personalPurchased)) && (
          <>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
              <Text style={styles.headerTitle}>Choose Your Nutrition Plan</Text>
            </View>
            <Text style={styles.subtitle}>
              Personalized diets designed for your fitness goals
            </Text>

            {/* Promo Video */}
            <View style={styles.ytContainer}>
              <YoutubeIframe
                videoId={
                  activeTab === "ai"
                    ? videoIds?.ai
                    : selectedPersonalPlan === "expert_1m"
                      ? videoIds?.elite
                      : videoIds?.expert
                }
                height={180}
                width="100%"
                play={false}
                mute={true}
                forceAndroidAutoplay={true}
                onChangeState={() => {}}
                webViewStyle={{ width: "100%", height: "100%" }}
                webViewProps={{ androidLayerType: "hardware" }}
                viewContainerStyle={{
                  width: "100%",
                  height: 180,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: "#000",
                }}
                initialPlayerParams={{
                  controls: true,
                  modestbranding: true,
                  preventFullScreen: false,
                }}
              />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === "expert" && styles.tabActive]}
                onPress={() => setActiveTab("expert")}
                activeOpacity={0.7}
              >
                <ExpoImage
                  source={require("../../../assets/images/pc_icon.png")}
                  style={styles.tabIcon}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "expert" && styles.tabTextActive,
                  ]}
                >
                  Personal Coach
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === "ai" && styles.tabActive]}
                onPress={() => setActiveTab("ai")}
                activeOpacity={0.7}
              >
                <ExpoImage
                  source={require("../../../assets/images/ai_coach_ic.png")}
                  style={styles.tabIcon}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "ai" && styles.tabTextActive,
                  ]}
                >
                  AI Plan
                </Text>
              </TouchableOpacity>
            </View>

            {/* Personal Coach sub-plan picker (Expert Nutrition / Transformation) */}
            {activeTab === "expert" && (
              <View style={styles.subPlanRow}>
                {Object.entries(PERSONAL_SUB_PLANS).map(([key, sub]) => {
                  const isActive = selectedPersonalPlan === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPersonalPlan(key)}
                      style={[
                        styles.subPlanCard,
                        isActive && styles.subPlanCardActive,
                      ]}
                    >
                      {key === "expert_3m" && (
                        <View style={styles.mostPopularTag}>
                          <Text style={styles.mostPopularTagText}>Most Popular</Text>
                        </View>
                      )}
                      <View style={styles.subPlanIconWrap}>
                        <ExpoImage
                          source={sub.icon}
                          style={styles.subPlanIcon}
                          contentFit="contain"
                        />
                      </View>
                      <Text style={styles.subPlanTitle}>{sub.title}</Text>
                      <Text style={styles.subPlanDuration}>{sub.duration}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Plan Cards — both AI and Personal mounted, only active is visible */}
            <View style={{ paddingHorizontal: 6, paddingTop: 24 }}>
              {Object.keys(PLAN_TABS).map((key) => renderPlanCard(key))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky Purchase CTA — slides up on scroll-down, off on scroll-up */}
      {(params?.forceChoose === "true" ||
          (!aiPurchased && !personalPurchased)) &&
        PLAN_TABS[activeTab] && (
          <Animated.View
            pointerEvents={stickyVisible ? "auto" : "none"}
            style={[
              styles.stickyPurchaseWrapper,
              {
                bottom: insets.bottom + 16,
                opacity: stickyAnim,
                transform: [
                  {
                    translateY: stickyAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [120, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                handleNutritionPurchase(
                  activeTab === "expert"
                    ? PERSONAL_SUB_PLANS[selectedPersonalPlan].sku
                    : PLAN_TABS[activeTab].sku,
                )
              }
              style={styles.stickyPurchaseBtnWrapper}
            >
              <LinearGradient
                colors={PLAN_TABS[activeTab].gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.stickyPurchaseBtn}
              >
                <Text style={styles.stickyPurchaseBtnText}>
                  {PLAN_TABS[activeTab].buttonText}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

      {/* Modals from DietSelection (payment, guest, etc.) */}
      <DietSelection
        gender={gender}
        locationCoords={locationCoords}
        nutritionPurchased={nutritionPurchased}
        dietPlanAssigned={dietPlanAssigned}
        hidden
      />

      {/* Target Achievement Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTargetModal}
        onRequestClose={() => setShowTargetModal(false)}
      >
        <View style={styles.achievementOverlay}>
          <View style={styles.achievementContent}>
            <TouchableOpacity
              style={styles.achievementClose}
              onPress={() => setShowTargetModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>

            <ExpoImage
              source={require("../../../assets/images/modal/diet.webp")}
              style={styles.achievementImage}
              contentFit="cover"
            />

            <View style={{ marginBottom: 8 }}>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text="Great job!"
                textStyle={styles.achievementTitleText}
              >
                Great job!
              </MaskedText>
            </View>

            <View style={{ marginBottom: 8 }}>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text="You've hit your daily diet goal!"
                textStyle={styles.achievementSubtitleText}
              >
                You've hit your daily diet goal!
              </MaskedText>
            </View>

            <View style={styles.achievementTextRow}>
              <Text style={styles.achievementText}>You've consumed </Text>
              <MaskedText
                bg1="#28A745"
                bg2="#007BFF"
                text={`${Math.round(macrosData?.caloriesTarget ?? 0)}`}
                textStyle={styles.achievementAmount}
              >
                {Math.round(macrosData?.caloriesTarget ?? 0)}
              </MaskedText>
              <Text style={styles.achievementText}>kcal today</Text>
            </View>

            <Text style={styles.achievementSubtext}>
              Stay consistent — your body's loving the progress
            </Text>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* ── Nutrition Payment Processing Modal ── */}
      {nutriPayProcessing && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => {}}
          statusBarTranslucent
        >
          <View style={styles.achievementOverlay}>
            <View style={styles.achievementContent}>
              <ActivityIndicator size="large" color="#28A745" />
              <Text
                style={[
                  styles.achievementTitleText,
                  { marginTop: 16, color: "#333" },
                ]}
              >
                Processing Payment
              </Text>
              {nutriPayStep ? (
                <Text style={styles.achievementSubtext}>{nutriPayStep}</Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}

      {/* ── Nutrition Purchase Success Modal ── */}
      {nutriPaySuccess && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => {
            setNutriPaySuccess(false);
            fetchNutritionPage();
          }}
          statusBarTranslucent
        >
          <View style={styles.achievementOverlay}>
            <View style={styles.achievementContent}>
              <Ionicons name="checkmark-circle" size={48} color="#28A745" />
              <Text
                style={[
                  styles.achievementTitleText,
                  { marginTop: 12, color: "#28A745" },
                ]}
              >
                Purchase Successful!
              </Text>
              <Text style={[styles.achievementSubtext, { marginTop: 8 }]}>
                {lastPurchasedSku.current === "ai_diet_coach"
                  ? "Your AI Diet Coach plan is now active. Generate your personalized diet plan now!"
                  : "Your nutrition package is now active. Book your first session to get started!"}
              </Text>
              <TouchableOpacity
                style={[styles.personalNutriButtonWrapper, { width: "100%" }]}
                activeOpacity={0.85}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchNutritionPage();
                  if (lastPurchasedSku.current === "ai_diet_coach") {
                    router.push("/client/(dietcoach)/height");
                  } else {
                    router.push("/client/nutritionBooking");
                  }
                }}
              >
                <LinearGradient
                  colors={["#00BBA7", "#00BC7D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButton}
                >
                  <Text style={styles.startButtonText}>
                    {lastPurchasedSku.current === "ai_diet_coach"
                      ? "Generate Your Diet Plan"
                      : "Book Your Slot Now"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 8 }}
                activeOpacity={0.7}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchNutritionPage();
                }}
              >
                <Text
                  style={{ color: "#888", fontSize: 14, fontWeight: "500" }}
                >
                  I'll do it later
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Nutrition Purchase Failed Modal ── */}
      {nutriPayFailed && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => setNutriPayFailed(false)}
          statusBarTranslucent
        >
          <View style={styles.achievementOverlay}>
            <View style={styles.achievementContent}>
              <Ionicons name="close-circle" size={48} color="#FF5757" />
              <Text
                style={[
                  styles.achievementTitleText,
                  { marginTop: 12, color: "#FF5757" },
                ]}
              >
                Payment Failed
              </Text>
              <Text style={[styles.achievementSubtext, { marginTop: 8 }]}>
                Payment could not be processed. Please try again.
              </Text>
              <TouchableOpacity
                style={[styles.personalNutriButtonWrapper, { width: "100%" }]}
                activeOpacity={0.85}
                onPress={() => setNutriPayFailed(false)}
              >
                <LinearGradient
                  colors={["#00BBA7", "#00BC7D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.startButton}
                >
                  <Text style={styles.startButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000000",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 19,
  },
  // ── YouTube Video ──
  ytContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // ── Tab Switcher ──
  tabContainer: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    padding: 6,
    marginBottom: 10,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 8,
  },
  tabIcon: {
    width: 18,
    height: 18,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6A7282",
  },
  tabTextActive: {
    color: "#1A1A1A",
  },
  chooseLabel: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 8,
  },
  // ── Cards ──
  cardWrapper: {
    gap: 16,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImageWrapper: {
    width: "100%",
    height: 120,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  planImage: {
    width: "100%",
  },
  planButtonWrapper: {
    marginTop: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardBody: {
    padding: 18,
    paddingTop: 6,
  },
  // ── Pricing ──
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  priceSymbol: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  pricePer: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  strikePrice: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
    fontWeight: "500",
    marginBottom: 0,
  },
  saveBadge: {
    backgroundColor: "#01AB40",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: "auto",
    alignSelf: "center",
  },
  saveBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  socialProofRow: {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    paddingVertical: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: -18,
  },
  socialProofText: {
    fontSize: 12,
    color: "#E7000B",
    fontWeight: "600",
    textAlign: "center",
  },
  // ── Features ──
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
    flex: 1,
  },
  // ── Buttons ──
  aiButtonWrapper: {
    marginTop: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  personalButtonWrapper: {
    marginTop: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  personalNutriButtonWrapper: {
    marginTop: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  startButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  // Personal Coach sub-plan cards (Expert Nutrition / Transformation)
  subPlanRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  subPlanCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    overflow: "visible",
  },
  subPlanCardActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#00BC7D",
  },
  mostPopularTag: {
    position: "absolute",
    top: -10,
    right: -1,
    backgroundColor: "#FF6B00",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  mostPopularTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subPlanIconWrap: {
    width: 44,
    height: 44,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subPlanIcon: {
    width: 44,
    height: 44,
  },
  subPlanTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  subPlanDuration: {
    fontSize: 12,
    color: "#6A7282",
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  // Sticky purchase CTA pinned above tab bar
  stickyPurchaseWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  stickyPurchaseBtnWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  stickyPurchaseBtn: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  stickyPurchaseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // ── Info Card ──
  infoCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  // ── Achievement Modal ──
  achievementOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  achievementContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  achievementClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
  },
  achievementImage: {
    width: 180,
    height: 160,
    marginBottom: 20,
  },
  achievementTitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementSubtitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 3,
  },
  achievementText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  achievementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  achievementSubtext: {
    fontSize: 10,
    color: "#868686",
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
});

// ── Purchased Nutrition Section Styles ──
const pStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  sectionHeaderDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: -16,
    marginTop: 8,
  },
  // AI Generate Card (createPlan === true) — single seamless card
  // Design: 335 wide × 337 tall = hero 217 + bottom 120
  aiGenCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 34,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  aiGenHero: {
    width: "100%",
    aspectRatio: 335 / 217,
  },
  aiGenBottomSection: {
    height: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  aiGenInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiGenIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  aiGenTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  aiGenSubtitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  aiGenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C9D8F5",
    paddingVertical: 12,
    borderRadius: 12,
  },
  aiGenBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2A4F",
  },
  aiGenBtnArrow: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2A4F",
  },
  // Join Session Card — hero design (335×217 image + flexible bottom)
  joinSessionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 34,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  joinSessionHero: {
    width: "100%",
    aspectRatio: 335 / 217,
  },
  joinSessionBottom: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  joinSessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinSessionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FF8A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  joinSessionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  joinSessionSubtitle: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  joinSessionDate: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 12,
  },
  joinSessionBtnWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  joinSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  joinSessionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Book Session Card — hero design (335×217 image + 120 bottom = 337 total)
  bookSessionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginTop: 80,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  bookSessionHero: {
    width: "100%",
    aspectRatio: 335 / 217,
  },
  bookSessionBottom: {
    height: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  bookSessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookSessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  bookSessionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  bookSessionSubtitle: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  bookSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00BC7D",
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookSessionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // AI Purchased Card
  purchasedCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 34,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  purchasedCardGradient: {
    padding: 16,
  },
  purchasedCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  purchasedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#E8EEFF",
    alignItems: "center",
    justifyContent: "center",
  },
  purchasedCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  purchasedCardSub: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  purchasedCardBtnRow: {
    marginTop: 14,
  },
  purchasedCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  purchasedCardBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Personal Status Cards
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },
  statusDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  statusDate: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statusDateMuted: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  statusBigText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 22,
    marginBottom: 6,
  },
  statusSub: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  // Diet Plan Ready Card
  dietReadyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    gap: 10,
  },
  dietReadyText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  dietReadyArrow: {
    fontSize: 22,
    color: "#28A745",
    fontWeight: "700",
  },
  // Progress Bar
  progressBarBg: {
    height: 8,
    backgroundColor: "#E8EDF5",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressBarFill: {
    width: "60%",
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
});

// ── AI Plan Code-Based Card Styles ──
const aiCardStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: 120,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: "center",
  },
  priceSymbol: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  pricePer: {
    fontSize: 18,
    color: "#888",
    fontWeight: "500",
  },
  badge: {
    backgroundColor: "#5670F5",
    alignSelf: "center",
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  featureImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  bulletsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bulletIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
    lineHeight: 17,
    flex: 1,
  },
  ctaWrapper: {
    marginHorizontal: 14,
    marginTop: 6,
    borderRadius: 14,
    overflow: "hidden",
  },
  ctaBtn: {
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 14,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

const expertCardStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
  },
  heroImage: {
    width: "100%",
    height: 120,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    justifyContent: "center",
  },
  priceSymbol: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  priceAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  pricePer: {
    fontSize: 18,
    color: "#888",
    fontWeight: "500",
  },
  saveBadge: {
    backgroundColor: "#00BC7D",
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saveBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    alignSelf: "center",
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  featureImage: {
    width: "100%",
    height: 150,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  bulletsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bulletIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
    lineHeight: 17,
    flex: 1,
  },
});

export default Diet;
