import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  Text,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from "react-native";
import { useState, useEffect, useCallback, useRef } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";
import * as Clipboard from "expo-clipboard";
import axiosInstance from "../../services/axiosInstance";
import { handleNutritionPay } from "../../components/ui/Payment/nutritionpayfn";
import { showToast } from "../../utils/Toaster";

const PRODUCT_SKUS = {
  starter: Platform.OS === "ios" ? "credit_99" : "credit_50",
  unlimited: "credit_999",
};

// Module-level flag to ensure Purchases.configure() runs only once per app
// lifetime. Re-configuring mid-session can corrupt RevenueCat's internal
// purchase queue state and cause ITEM_NOT_OWNED errors.
let revenueCatConfigured = false;
const ensureRevenueCatConfigured = (apiKey) => {
  if (revenueCatConfigured) return;
  if (!apiKey) throw new Error("Missing RevenueCat API key");
  Purchases.configure({ apiKey });
  revenueCatConfigured = true;
};

const whatIsCredit = [
  {
    icon: "qr-code-scanner",
    title: "Scan & Log Food",
    desc: "Use KyraAI Food Scanner to instantly scan any food item and log it to your diet.",
  },
  {
    icon: "analytics",
    title: "Macros & Micros Breakdown",
    desc: "Get a detailed breakdown of carbohydrates, proteins, fats, fiber, sodium & more.",
  },

  {
    icon: "lightbulb",
    title: "Food Analysis & Insights",
    desc: "Receive AI-powered insights about your food choices and nutritional patterns.",
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SCAN_PLAN_TABS = {
  starter: { label: "Starter Plan", sku: "credit_50" },
  unlimited: { label: "Unlimited Plan", sku: "credit_999" },
};

const SHARED_SCAN_FEATURES = [
  {
    image: require("../../assets/images/scan/scan_1.webp"),
    title: "Snap Any Meal, Know Instantly",
    desc: "Just click a photo — Kyra AI identifies the dish and logs calories + nutrients automatically.",
  },
  {
    image: require("../../assets/images/scan/scan_2.webp"),
    title: "Works on Indian & Global Food",
    desc: "Just click a photo — Kyra AI identifies the dish and logs calories + nutrients automatically.",
  },
  {
    image: require("../../assets/images/scan/scan_3.webp"),
    title: "Full Macro Breakdown in Seconds",
    desc: "See proteins, carbs, fats and total calories — no manual searching, no guessing.",
  },
];

const STARTER_FOURTH = {
  image: require("../../assets/images/scan/scan_4.webp"),
  title: "50 Scans to Build the Habit",
  desc: "Perfect starter pack to track smarter and understand what's really on your plate.",
};

const UNLIMITED_FOURTH = {
  image: require("../../assets/images/scan/scan_5.webp"),
  title: "Track Every Day, All Year Long",
  desc: "Unlimited scans for 365 days — build a real nutrition habit without ever running out.",
};

const CreditsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [backendVerified, setBackendVerified] = useState(false);
  const [purchased, setPurchased] = useState(false);
  // Order tracking
  const [orderId, setOrderId] = useState(null);

  // Scan plan tab
  const [activeScanTab, setActiveScanTab] = useState("starter");

  // Pulsing border animation for inactive Unlimited tab
  const borderOpacity = useSharedValue(0);

  useEffect(() => {
    if (activeScanTab !== "unlimited") {
      borderOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, {
            duration: 700,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );
    } else {
      borderOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [activeScanTab]);

  // Credits balance
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [isUnlimited, setIsUnlimited] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        const { data } = await axiosInstance.get(
          "/api/v2/nutrition_purchase/status",
        );
        setBalance(data?.credits ?? 0);
        setIsUnlimited(data?.is_unlimited === true);
        setPurchased(data?.nutrition_purchased);
      } catch {
        setBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };
    fetchBalance();
  }, []);

  // Nutrition payment flow states
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);

  // Modals
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedOrderId] = useState(null);
  const [creditsGranted, setCreditsGranted] = useState(50);
  const [newBalance, setNewBalance] = useState(null);

  // Auto-navigate to home 1.5s after success
  useEffect(() => {
    if (!showSuccessModal) return;
    const t = setTimeout(() => {
      setShowSuccessModal(false);
      router.push("/client/home");
    }, 1500);
    return () => clearTimeout(t);
  }, [showSuccessModal]);

  // Polling timer
  const timerRef = useRef(null);
  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  useEffect(() => clearTimer, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const waitForCommandCompletion = useCallback(
    async (requestId, label = "credits") => {
      const maxAttempts = 20;
      let delayMs = 2000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data } = await axiosInstance.get(
          `/api/v2/credits/googleplay/commands/${requestId}`,
          { headers: { "ngrok-skip-browser-warning": "true" } },
        );

        if (data?.status === "completed") {
          return data?.data || {};
        }

        if (data?.status === "failed") {
          throw new Error(data?.error || `${label} failed. Please try again.`);
        }

        // pending_webhook or processing — keep polling
        const jitterMs = Math.random() * 300;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(delayMs + jitterMs, 10000)),
        );
        delayMs = Math.min(delayMs * 1.5, 10000);
      }

      throw new Error(
        `${label} is taking longer than expected. Please retry in a moment.`,
      );
    },
    [],
  );

  const retryVerification = async (verifyFunction, maxAttempts = 5) => {
    const delays = [3000, 5000, 7000, 9000, 10000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setProcessingStep("Confirming payment...");
        const result = await verifyFunction();
        if (result && (result.captured || result.verified)) {
          return { success: true, data: result };
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, delays[attempt - 1]),
          );
        }
      } catch {
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, delays[attempt - 1]),
          );
        }
      }
    }
    return { success: false, data: null };
  };

  const startPolling = () => {
    let attemptCount = 0;
    setProcessingStep("Confirming payment...");

    timerRef.current = setInterval(async () => {
      attemptCount++;

      try {
        const clientId = await AsyncStorage.getItem("client_id");
        const idempotencyKey = `cr_verify_poll_${clientId}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;

        const { data: verifyCommand } = await axiosInstance.post(
          `/api/v2/credits/verify`,
          { idempotency_key: idempotencyKey },
          {
            headers: {
              "Idempotency-Key": idempotencyKey,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );

        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "credits verify poll",
        );

        if (verification?.verified || verification?.captured) {
          clearTimer();
          setOrderId((prev) => verification?.order_id ?? prev);
          if (verification?.credits_granted)
            setCreditsGranted(verification.credits_granted);
          if (verification?.new_balance != null)
            setNewBalance(verification.new_balance);
          setBackendVerified(true);
          setTimeout(() => {
            setIsProcessing(false);
            setShowSuccessModal(true);
          }, 1000);
        } else if (attemptCount >= 10) {
          clearTimer();
          setIsProcessing(false);
          setShowTimeoutModal(true);
        }
      } catch {
        if (attemptCount >= 10) {
          clearTimer();
          setIsProcessing(false);
          setShowTimeoutModal(true);
        }
      }
    }, 2500);
  };

  // ─── Google Play (RevenueCat) purchase ─────────────────────────────────────

  const handleGooglePlayPurchase = async () => {
    setIsProcessing(true);
    setProcessingStep("Initializing...");

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) throw new Error("Client ID not found");

      // STEP 1 — Create order
      setProcessingStep("Creating order...");
      const idempotencyKey = `cr_order_${clientId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      const { data: orderCommand } = await axiosInstance.post(
        `/api/v2/credits/googleplay/purchase`,
        {
          product_sku: PRODUCT_SKUS[activeScanTab],
          currency: "INR",
          idempotency_key: idempotencyKey,
          os: Platform.OS,
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      // STEP 2 — Poll until order is ready
      setProcessingStep("Setting up order...");
      const order = await waitForCommandCompletion(
        orderCommand?.request_id,
        "credits order",
      );
      setOrderId(order?.order_id || null);

      // STEP 3 — Configure RevenueCat (once per app lifetime) & trigger Google Play purchase
      setProcessingStep("Setting up payment...");
      ensureRevenueCatConfigured(order?.api_key);
      await Purchases.logIn(clientId);
      await Purchases.setAttributes({
        order_id: order.order_id,
        client_id: clientId,
      });

      setProcessingStep("Processing payment...");
      const offerings = await Purchases.getOfferings();

      const allPackages = Object.values(offerings?.all ?? {}).flatMap(
        (o) => o.availablePackages ?? [],
      );
      const pkg = allPackages.find(
        (p) =>
          p.product?.identifier === PRODUCT_SKUS[activeScanTab] ||
          p.identifier === PRODUCT_SKUS[activeScanTab],
      );
      if (!pkg) {
        throw new Error("Product not found. Please try again later.");
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      const hasActiveEntitlements =
        Object.keys(customerInfo.entitlements.active).length > 0;
      const hasNonSubscriptions =
        customerInfo.nonSubscriptionTransactions?.length > 0;

      // For one-time products there are no active subscriptions — check non-sub transactions
      if (!hasActiveEntitlements && !hasNonSubscriptions) {
        throw new Error(
          "Purchase completed but could not verify entitlement. Please contact support.",
        );
      }

      // STEP 4 — Verify purchase
      const verifyFunc = async () => {
        const verifyKey = `cr_verify_${clientId}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        const { data: verifyCommand } = await axiosInstance.post(
          `/api/v2/credits/googleplay/verify`,
          { idempotency_key: verifyKey, order_id: order?.order_id },
          {
            headers: {
              "Idempotency-Key": verifyKey,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        // STEP 5 — Poll until credits are granted
        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "credits verify",
        );
        setOrderId((prev) => verification?.order_id ?? prev);
        if (verification?.credits_granted)
          setCreditsGranted(verification.credits_granted);
        if (verification?.new_balance != null)
          setNewBalance(verification.new_balance);
        return verification;
      };

      const verificationResult = await retryVerification(verifyFunc, 5);

      if (verificationResult.success) {
        setBackendVerified(true);
        setProcessingStep("Done");
        setTimeout(() => {
          setIsProcessing(false);
          setShowSuccessModal(true);
        }, 1000);
      } else {
        // Fallback: start polling
        setProcessingStep("Confirming payment...");
        startPolling();
      }
    } catch (error) {
      clearTimer();
      setIsProcessing(false);
      if (!error.userCancelled) {
        showToast({
          type: "error",
          title: "Purchase Failed",
          desc:
            error.message ||
            "There was an error processing your purchase. Please try again.",
        });
      }
    }
  };

  const handlePurchasePress = () => {
    handleGooglePlayPurchase();
  };

  const handleNutritionPurchase = async () => {
    if (nutriPayInProgress.current) return;
    nutriPayInProgress.current = true;
    setNutriPayProcessing(true);
    setNutriPayStep("Initializing...");

    const response = await handleNutritionPay({
      onStep: setNutriPayStep,
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

  const handleCopyOrderId = async () => {
    try {
      await Clipboard.setStringAsync(orderId || "");
      showToast({ type: "success", title: "Copied", desc: "Order ID copied" });
    } catch {
      // ignore
    }
  };

  const handleEmailPress = () => {
    const email = "support@fymble.app";
    const subject = orderId
      ? `Credits Purchase Issue - Order ID: ${orderId}`
      : "Credits Purchase Issue";
    const body = orderId
      ? `Hi,\n\nI'm facing an issue with my credits purchase.\n\nOrder ID: ${orderId}\n\nPlease help.\n\nThank you.`
      : "Hi,\n\nI'm facing an issue with my credits purchase.\n\nPlease help.\n\nThank you.";
    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    ).catch(() => {});
  };

  const currentBalance = newBalance ?? balance ?? 0;
  const isAndroid = Platform.OS === "android";
  const hasCredits = !balanceLoading && currentBalance > 0;
  const lowCredits = hasCredits && currentBalance < 50;

  const borderPulseStyle = useAnimatedStyle(() => ({
    borderWidth: 2,
    borderColor: `rgba(86, 112, 245, ${borderOpacity.value})`,
    borderRadius: 10,
  }));

  // ─── Shared Scan Plan Section (tabs + plan cards) ──────────────────────────

  const renderScanPlanSection = () => (
    <>
      {/* ── Tab Switcher ── */}
      <View style={sc.tabContainer}>
        {Object.entries(SCAN_PLAN_TABS).map(([key, tab]) => {
          const isUnlimited = key === "unlimited";
          const isActive = activeScanTab === key;
          if (isUnlimited && !isActive) {
            return (
              <TouchableOpacity
                key={key}
                style={sc.tab}
                onPress={() => setActiveScanTab(key)}
                activeOpacity={0.7}
              >
                <Text style={sc.tabText}>{tab.label}</Text>
                <Animated.View
                  style={[sc.tabBorderOverlay, borderPulseStyle]}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={key}
              style={[sc.tab, isActive && sc.tabActive]}
              onPress={() => setActiveScanTab(key)}
              activeOpacity={0.7}
            >
              <Text style={[sc.tabText, isActive && sc.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Plan Cards ── */}
      <View style={{ paddingHorizontal: 6, paddingTop: 16 }}>
        {Object.keys(SCAN_PLAN_TABS).map((key) => {
          const isStarter = key === "starter";
          const features = [
            ...SHARED_SCAN_FEATURES,
            isStarter ? STARTER_FOURTH : UNLIMITED_FOURTH,
          ];
          return (
            <View
              key={key}
              style={[
                sc.wrapper,
                { display: activeScanTab === key ? "flex" : "none" },
              ]}
            >
              {/* Best Value corner tag */}
              {!isStarter && (
                <View style={sc.bestValueBadge}>
                  <Text style={sc.bestValueText}>Best Value</Text>
                </View>
              )}

              {/* Plan Title */}
              <Text style={sc.planTitle}>
                {isStarter ? "Starter Plan" : "Unlimited Plan"}
              </Text>

              {/* Price */}
              <View style={sc.priceRow}>
                <Text style={sc.priceSymbol}>₹</Text>
                <Text style={sc.priceAmount}>{isStarter ? "99" : "999"}</Text>
                <Text style={sc.pricePer}>
                  {isStarter ? " / month" : " / year"}
                </Text>
              </View>

              {/* Badge */}
              <View
                style={[
                  sc.badge,
                  { backgroundColor: isStarter ? "#FF5757" : "#5670F5" },
                ]}
              >
                <Text style={sc.badgeText}>
                  {isStarter ? "50 Credits" : "Unlimited Credits"}
                </Text>
              </View>

              {/* Feature Cards */}
              {features.map((feature, i) => (
                <View key={i} style={sc.featureCard}>
                  <Image
                    source={feature.image}
                    style={sc.featureImage}
                    contentFit="cover"
                  />
                  <Text style={sc.featureTitle}>{feature.title}</Text>
                  <Text style={sc.featureDesc}>{feature.desc}</Text>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </>
  );

  // ─── Zero Credits View (matching screenshot design) ───────────────────────

  const renderZeroCreditsView = () => (
    <>
      {/* AI Credit Image */}
      <View style={s.zeroCreditImageWrap}>
        <Image
          source={require("../../assets/images/nutrition/ai_credit.png")}
          style={s.zeroCreditImage}
          contentFit="contain"
        />
      </View>

      {/* Main heading */}
      <Text style={s.zeroHeading}>Your Progress Has Stopped</Text>
      <Text style={s.zeroSubtext}>
        Every meal you skip tracking sets you back. Your streak, your data, your
        goals - all on hold.
      </Text>
      <Text style={s.zeroRedLine}>
        Don't lose your momentum - purchase Unlimited Credits and get back on
        track today!
      </Text>

      {renderScanPlanSection()}
    </>
  );

  // ─── Low Credits View (Android only, < 25 credits) ────────────────────────

  const renderLowCreditsView = () => {
    const daysLeft = Math.max(1, Math.floor(currentBalance / 3));
    return (
      <>
        {/* AI Credit Image */}
        <View style={s.zeroCreditImageWrap}>
          <Image
            source={require("../../assets/images/nutrition/ai_credit.png")}
            style={s.zeroCreditImage}
            contentFit="contain"
          />
        </View>

        {/* Warning heading */}
        <Text style={s.zeroHeading}>Credits Running Low</Text>
        <Text style={s.zeroSubtext}>
          You have only{" "}
          <Text style={s.lowCreditsBalance}>{currentBalance} credits</Text>
          {" - "}
          <Text style={s.lowCreditsBalance}>
            {daysLeft} {daysLeft === 1 ? "day" : "days"}
          </Text>{" "}
          of scans left
        </Text>
        <Text style={s.lowCreditsWarn}>
          Top up your credits to continue scanning
        </Text>

        {renderScanPlanSection()}
      </>
    );
  };

  // ─── Has Credits View ─────────────────────────────────────────────────────

  const renderHasCreditsView = () => {
    return <>{renderScanPlanSection()}</>;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={s.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kyra AI Credits</Text>
        <View style={s.headerPlaceholder} />
      </View>

      <ScrollView
        style={s.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 80,
        }}
      >
        <View style={s.contentContainer}>
          {balanceLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color="#2AD48B" />
            </View>
          ) : isUnlimited ? (
            renderHasCreditsView()
          ) : lowCredits ? (
            renderLowCreditsView()
          ) : hasCredits ? (
            renderHasCreditsView()
          ) : (
            renderZeroCreditsView()
          )}
        </View>
      </ScrollView>

      {/* Bottom sticky bar */}
      {!balanceLoading && (
        <View style={[s.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={s.bottomBarBtn}
            activeOpacity={0.85}
            onPress={handlePurchasePress}
          >
            <Text style={s.bottomBarBtnText}>
              Unlock Now - {activeScanTab === "starter" ? "₹99" : "₹999"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isProcessing}
        onRequestClose={() => {}}
      >
        <View style={s.processingModalOverlay}>
          <View style={s.processingModalContent}>
            <ActivityIndicator size="large" color="#FF5757" />
            <Text style={s.processingTitle}>Processing Payment</Text>
            {processingStep ? (
              <Text style={s.processingText}>{processingStep}</Text>
            ) : null}
            {backendVerified && (
              <Text style={s.successVerifiedText}>✅ Payment Verified!</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Failed Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showFailedModal}
        onRequestClose={() => setShowFailedModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.timeoutModalContent}>
            <MaterialIcons name="error" size={56} color="#FF5757" />
            <Text style={[s.timeoutTitle, { marginTop: 12 }]}>
              Payment Failed
            </Text>
            <Text style={s.timeoutDescription}>
              Payment not received. Please try again or contact support if the
              issue persists.
            </Text>
            {failedOrderId && (
              <View style={s.orderIdContainer}>
                <Text style={s.orderIdLabel}>Order ID:</Text>
                <TouchableOpacity
                  style={s.orderIdCopyRow}
                  onPress={async () => {
                    await Clipboard.setStringAsync(failedOrderId);
                    showToast({
                      type: "success",
                      title: "Copied",
                      desc: "Order ID copied",
                    });
                  }}
                >
                  <Text style={s.orderIdValue}>{failedOrderId}</Text>
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color="#007BFF"
                    style={s.copyIcon}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalRetryBtn}
                onPress={() => setShowFailedModal(false)}
              >
                <Text style={s.modalRetryText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setShowFailedModal(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timeout / Pending Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTimeoutModal}
        onRequestClose={() => setShowTimeoutModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.timeoutModalContent}>
            <View style={s.timeoutIconContainer}>
              <Text style={s.timeoutIcon}>⏱️</Text>
            </View>
            <Text style={s.timeoutTitle}>Payment Processing Pending</Text>
            <Text style={s.timeoutDescription}>
              Your payment is being processed. Credits may take a few moments to
              appear in your account.
            </Text>
            {orderId && (
              <View style={s.orderIdContainer}>
                <Text style={s.orderIdLabel}>Your Order ID:</Text>
                <TouchableOpacity
                  style={s.orderIdCopyRow}
                  onPress={handleCopyOrderId}
                >
                  <Text style={s.orderIdValue}>{orderId}</Text>
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color="#007BFF"
                    style={s.copyIcon}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.timeoutInfoBox}>
              <Text style={s.timeoutInfoText}>
                If credits don't appear shortly, contact us at{" "}
                <Text style={s.supportEmailLink} onPress={handleEmailPress}>
                  support@fymble.app
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={s.timeoutCloseButton}
              onPress={() => {
                setShowTimeoutModal(false);
                router.push("/client/help");
              }}
            >
              <Text style={s.timeoutCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal — auto-routes to home after 1.5s */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.push("/client/home");
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.successModalContent}>
            <View style={s.successIconContainer}>
              <Text style={s.successIcon}>🎉</Text>
            </View>
            <Text style={s.successTitle}>Congratulations!</Text>
            <Text style={s.successMessage}>
              You got {creditsGranted} credits!
              {newBalance != null
                ? `\nYour new balance: ${newBalance} credits`
                : ""}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Nutrition Payment Processing Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayProcessing}
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <View style={s.processingModalContent}>
            <ActivityIndicator size="large" color="#28A745" />
            <Text style={[s.processingTitle, { color: "#333" }]}>
              Processing Payment
            </Text>
            {nutriPayStep ? (
              <Text style={s.processingText}>{nutriPayStep}</Text>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── Nutrition Purchase Success Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPaySuccess}
        onRequestClose={() => setNutriPaySuccess(false)}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <View style={s.processingModalContent}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#F0FFF4",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="checkmark-circle" size={48} color="#28A745" />
            </View>
            <Text style={[s.processingTitle, { color: "#28A745" }]}>
              Purchase Successful!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Your nutrition package with 4 sessions is active. Book your first
              session now to get started!
            </Text>
            <TouchableOpacity
              style={[s.scanNutriBtn, { marginTop: 16, width: "100%" }]}
              activeOpacity={0.85}
              onPress={() => {
                setNutriPaySuccess(false);
                router.push("/client/nutritionBooking");
              }}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.scanNutriBtnGradient}
              >
                <Text style={s.scanNutriBtnText}>Book Your Slot Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 8 }}
              activeOpacity={0.7}
              onPress={() => setNutriPaySuccess(false)}
            >
              <Text style={{ color: "#888", fontSize: 14, fontWeight: "500" }}>
                I'll book later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Nutrition Purchase Failed Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayFailed}
        onRequestClose={() => setNutriPayFailed(false)}
        statusBarTranslucent
      >
        <View style={s.modalOverlay}>
          <View style={s.processingModalContent}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "#FFF0F0",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close-circle" size={48} color="#FF5757" />
            </View>
            <Text style={[s.processingTitle, { color: "#FF5757" }]}>
              Payment Failed
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#666",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Payment could not be processed. Please try again.
            </Text>
            <TouchableOpacity
              style={[s.scanNutriBtn, { marginTop: 16, width: "100%" }]}
              activeOpacity={0.85}
              onPress={() => setNutriPayFailed(false)}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.scanNutriBtnGradient}
              >
                <Text style={s.scanNutriBtnText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CreditsScreen;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerBackButton: {
    padding: 5,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 40,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingWrap: {
    paddingTop: 100,
    alignItems: "center",
  },

  // ─── Zero Credits Styles ──────────────────────────────────────────────────
  zeroCreditImageWrap: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 18,
  },
  zeroCreditImage: {
    width: 80,
    height: 80,
  },
  zeroHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 6,
  },
  zeroSubtext: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 8,
    marginHorizontal: 10,
  },
  zeroRedLine: {
    fontSize: 13,
    color: "#FF5757",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 14,
    marginHorizontal: 10,
  },
  hasCreditsHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 6,
  },
  hasCreditsCount: {
    color: "#2AD48B",
  },
  hasCreditsRunningLow: {
    fontSize: 13,
    color: "#FF8C00",
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 22,
  },
  lowCreditsBalance: {
    fontWeight: "800",
    color: "#FF8C00",
  },
  lowCreditsWarn: {
    fontSize: 13,
    color: "#FF5757",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 22,
  },

  // Offer card
  offerCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D4F5E2",
    marginBottom: 24,
  },
  offerOnlyTodayBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    backgroundColor: "#2AD48B",
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  offerOnlyTodayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  offerIcon: {
    width: 28,
    height: 28,
  },
  offerPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  offerPriceOld: {
    fontSize: 16,
    color: "#BBB",
    textDecorationLine: "line-through",
    fontWeight: "500",
  },
  offerCreditsText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },

  // Benefits
  benefitsSection: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: 20,
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitIcon: {
    fontSize: 16,
    color: "#FF5757",
  },
  benefitIconYellow: {
    fontSize: 16,
    color: "#FFB800",
  },
  benefitIconGreen: {
    fontSize: 16,
    color: "#2AD48B",
  },
  benefitText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
  },
  benefitBold: {
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Social proof
  socialProofSection: {
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: 24,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    marginLeft: -10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarMoreText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888",
  },
  socialProofTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  socialProofSub: {
    fontSize: 12,
    color: "#999",
  },

  // CTA
  ctaButton: {
    backgroundColor: "#2AD48B",
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ctaSubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },

  // Bottom sticky bar (zero credits)
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  bottomBarBtn: {
    backgroundColor: "#2AD48B",
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  bottomBarBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ─── Has Credits Styles (existing) ────────────────────────────────────────
  creditsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0E6CC",
  },
  creditsCardLeft: {
    flex: 1,
    justifyContent: "center",
  },
  creditsCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  creditsLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  coinSmall: {
    width: 30,
    height: 30,
  },
  creditsCount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#000000",
  },
  creditsSubtext: {
    fontSize: 12,
    color: "#999",
  },
  section: {
    marginTop: 20,
  },
  cardShadow: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    marginBottom: 8,
    marginHorizontal: -16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1A1A1A",
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  highlightText: {
    color: "#FF5757",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 0,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B4B4B",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 14,
    lineHeight: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletPoint: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5757",
    marginRight: 8,
    marginTop: 1,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
  },
  rewardText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    lineHeight: 20,
  },
  // Processing modal
  processingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingModalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
  successVerifiedText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  timeoutModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  timeoutIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF3E0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  timeoutIcon: {
    fontSize: 30,
  },
  timeoutTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  timeoutDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  orderIdContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  orderIdLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    textAlign: "center",
  },
  orderIdCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  orderIdValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    fontFamily: "monospace",
  },
  copyIcon: {
    marginLeft: 4,
  },
  timeoutInfoBox: {
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    padding: 14,
    width: "100%",
    marginBottom: 20,
  },
  timeoutInfoText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    textAlign: "center",
  },
  supportEmailLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
    textDecorationLine: "underline",
  },
  timeoutCloseButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  timeoutCloseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalRetryBtn: {
    flex: 1,
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalRetryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
  },
  successModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF8E1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 45,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  // Nutrition promo card
  scanNutriCard: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 16,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
    marginHorizontal: 16,
    marginTop: 20,
  },
  scanNutriCardHeader: {
    backgroundColor: "#F4FAFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: "center",
  },
  scanNutriCardHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  scanNutriCardHeaderSub: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginTop: 3,
  },
  scanNutriCardBody: {
    backgroundColor: "#F4FAFF",
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D9ECFF",
    overflow: "visible",
  },
  scanNutriCardBodyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  scanNutriSaveBadge: {
    position: "absolute",
    top: -1,
    right: -1,
    backgroundColor: "#FF6900",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
  scanNutriSaveBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scanNutriBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scanNutriCardBodyLeft: {
    flex: 1,
  },
  scanNutriBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  scanNutriBulletText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
    flex: 1,
  },
  scanNutriCardFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: "center",
  },
  scanNutriPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  scanNutriPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  scanNutriPriceOld: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 6,
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  scanNutriBtn: {
    borderRadius: 30,
    overflow: "hidden",
    width: "80%",
    marginBottom: 10,
  },
  scanNutriBtnGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 30,
  },
  scanNutriBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  scanNutriTrustedText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },
});

// ─── Scan Plan Card Styles ─────────────────────────────────────────────────
const sc = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 10,
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    marginTop: 8,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
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
  tabBorderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrapper: {
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    overflow: "hidden",
    paddingBottom: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    paddingTop: 20,
    paddingBottom: 4,
  },
  bestValueBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#2AD48B",
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 10,
  },
  bestValueText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 18,
    paddingTop: 4,
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
    paddingHorizontal: 35,
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
    paddingBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
