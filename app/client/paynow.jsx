import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PaymentMethodSelector from "../../components/ui/Payment/paymentmethod";
import PaymentMethodModal from "../../components/ui/Payment/paymentselectionmodal";
import { showToast } from "../../utils/Toaster";
import Constants from "expo-constants";
import apiConfig from "../../services/apiConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axiosInstance from "../../services/axiosInstance";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";

let RazorpayCheckout;

if (Constants.executionEnvironment !== "storeClient") {
  RazorpayCheckout = require("react-native-razorpay").default;
} else {
  RazorpayCheckout = null;
}
const PayNow = () => {
  const router = useRouter();
  const {
    name,
    price,
    duration,
    offerprice,
    months,
    xpEligiblePlanId,
    xpOfferPrice,
    paymentMethod: initialPaymentMethod,
    rc_id,
    product_rc,
    product_rp,
  } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Get number of months (default to 1 if not provided)
  const planMonths = parseInt(months) || 1;

  // Payment states - calculate total price based on duration
  const [regularPrice, setRegularPrice] = useState(
    (parseFloat(price) || 0) * planMonths,
  );
  const [discountedPrice, setDiscountedPrice] = useState(
    (parseFloat(offerprice) || 0) * planMonths,
  );
  const [xpPrice, setXpPrice] = useState(
    ((parseFloat(offerprice) || 0) - (parseFloat(xpOfferPrice) || 0)) *
      planMonths,
  );
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(
    (parseFloat(offerprice) || parseFloat(price) || 0) * planMonths,
  );
  const [paymentMethod, setPaymentMethod] = useState(
    initialPaymentMethod || null,
  );
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);

  // XP related states
  const [totalXp, setTotalXp] = useState(2500);
  const [isXpEligible, setIsXpEligible] = useState(false);
  const [showXpInfo, setShowXpInfo] = useState(false);

  // Payment processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [backendVerified, setBackendVerified] = useState(false);

  // Dynamic product identifiers
  const [rcIdentifier, setRcIdentifier] = useState(rc_id || "");
  const [productRcSku, setProductRcSku] = useState(product_rc || "");
  const [productRpSku, setProductRpSku] = useState(product_rp || "");

  // order ID
  const [orderId, setOrderId] = useState(null);

  // Timeout modal state
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // API Configuration
  const API_BASE = apiConfig.API_URL;

  const buildCommandUrl = useCallback(
    (requestId, commandPath = "/razorpay_payments_v2/commands/") => {
      if (!requestId) return "";
      const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
      const path = commandPath.endsWith("/") ? commandPath : `${commandPath}/`;
      return `${base}${path}${requestId}`;
    },
    [API_BASE],
  );

  const waitForCommandCompletion = useCallback(
    async (
      requestId,
      commandPath = "/razorpay_payments_v2/commands/",
      label = "checkout",
    ) => {
      const commandUrl = buildCommandUrl(requestId, commandPath);

      if (!commandUrl) {
        throw new Error(`Unable to resolve ${label} status URL`);
      }

      const maxAttempts = 20;
      let delayMs = 1500;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data } = await axiosInstance.get(commandUrl, {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (data?.status === "completed") {
          return data?.data || {};
        }

        if (data?.status === "failed") {
          throw new Error(data?.error || `${label} failed. Please try again.`);
        }

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
    [buildCommandUrl],
  );

  // Determine if user is eligible for XP discount plan
  useEffect(() => {
    const xpThreshold = 2500;
    const isEligible = totalXp >= xpThreshold && xpEligiblePlanId;
    setIsXpEligible(isEligible);

    if (isEligible) {
      const calculatedXpPrice =
        ((parseFloat(offerprice) || 0) - (parseFloat(xpOfferPrice) || 0)) *
        planMonths;
      setXpPrice(calculatedXpPrice);
      setSelectedPlanPrice(calculatedXpPrice);
    } else {
      const calculatedDiscountedPrice =
        (parseFloat(offerprice) || 0) * planMonths;
      setDiscountedPrice(calculatedDiscountedPrice);
      setSelectedPlanPrice(calculatedDiscountedPrice);
    }
  }, [totalXp, xpEligiblePlanId, offerprice, xpOfferPrice, planMonths]);

  useEffect(() => {
    if (initialPaymentMethod) {
      setPaymentMethod(initialPaymentMethod);
    }
  }, [initialPaymentMethod]);

  const openPaymentMethodModal = () => {
    setPaymentMethodModalVisible(true);
  };

  const handlePaymentMethodChange = (newMethod) => {
    setPaymentMethod(newMethod);
    setPaymentMethodModalVisible(false);
  };

  const handleCopyOrderId = async () => {
    try {
      await Clipboard.setStringAsync(orderId || "");
      showToast({
        type: "success",
        title: "Copied",
        desc: "Order ID copied to clipboard",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to copy Order ID",
      });
    }
  };

  const handleEmailPress = () => {
    const email = "support@fymble.app";
    const subject = orderId
      ? `Payment Issue - Order ID: ${orderId}`
      : "Payment Issue";
    const body = orderId
      ? `Hi,\n\nI'm facing an issue with my premium subscription payment.\n\nOrder ID: ${orderId}\n\nPlease help me resolve this.\n\nThank you.`
      : "Hi,\n\nI'm facing an issue with my premium subscription payment.\n\nPlease help me resolve this.\n\nThank you.";

    const mailto = `mailto:${email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailto).catch(() => {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not open email app",
      });
    });
  };

  // Helper function to retry verification with exponential backoff
  const retryVerification = async (verifyFunction, maxAttempts = 5) => {
    const delays = [3000, 5000, 7000, 9000, 10000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setProcessingStep(`Verifying payment...`);
        const result = await verifyFunction();

        // If verification successful, return result
        if (
          result &&
          (result.captured || result.verified || result.subscription_active)
        ) {
          return { success: true, data: result };
        }

        // If not successful and not last attempt, wait before retry
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, delays[attempt - 1]),
          );
        }
      } catch (error) {
        // If not last attempt, wait before retry
        if (attempt < maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, delays[attempt - 1]),
          );
        }
      }
    }

    // All attempts failed
    return { success: false, data: null };
  };

  const handlePayNow = async () => {
    if (!paymentMethod) {
      showToast({
        type: "error",
        title: "Payment Method Required",
        desc: "Please select a payment method to continue.",
      });
      return;
    }

    if (paymentMethod === "googleplay") {
      await handleGooglePlayPurchase();
    } else {
      await handleRazorpayPayment();
    }
  };

  // NEW: Poll backend to verify webhook processed (optimized)
  const handleGooglePlayPurchase = async () => {
    setIsProcessing(true);
    setProcessingStep("Initializing...");

    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        throw new Error("Client ID not found");
      }

      setProcessingStep("Checking account status...");
      const statusResponse = await axiosInstance.get(
        `/user_premium/payments/user/${client_id}/premium-status`,
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (statusResponse.data.has_premium) {
        showToast({
          type: "info",
          title: "Active Premium User",
          desc: "You already have an active premium subscription!",
        });
        setIsProcessing(false);
        return;
      }

      setProcessingStep("Queuing purchase...");
      const idempotencyKey = `rc_order_${client_id}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const { data: orderCommand } = await axiosInstance.post(
        `/revenuecat_v2/subscriptions/create`,
        {
          client_id,
          product_sku: productRcSku,
          currency: "INR",
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      const order = await waitForCommandCompletion(
        orderCommand?.request_id,
        "/revenuecat_v2/commands/",
        "revenuecat order",
      );
      setOrderId(order?.order_id || null);

      setProcessingStep("Setting up payment...");

      await Purchases.configure({
        apiKey: order?.api_key,
      });
      await Purchases.logIn(client_id);
      await Purchases.setAttributes({
        order_id: order.order_id,
        client_id,
      });

      setProcessingStep("Fetching offerings...");
      const offerings = await Purchases.getOfferings();

      if (
        !offerings.current ||
        offerings.current.availablePackages.length === 0
      ) {
        throw new Error("No subscription packages available");
      }

      let purchasePackage = offerings.current.availablePackages.find(
        (pkg) => pkg.identifier === rcIdentifier,
      );
      if (!purchasePackage) {
        purchasePackage = offerings.current.availablePackages[0];
      }

      setProcessingStep("Processing payment...");
      const { customerInfo } = await Purchases.purchasePackage(purchasePackage);

      const hasActiveEntitlements =
        Object.keys(customerInfo.entitlements.active).length > 0;
      const hasActiveSubscriptions =
        Object.keys(customerInfo.activeSubscriptions).length > 0;
      if (!hasActiveEntitlements && !hasActiveSubscriptions) {
        throw new Error(
          "Purchase completed but no active entitlements were returned.",
        );
      }

      // Retry verification 3 times before falling back to polling
      const verifyFunc = async () => {
        const verifyKey = `rc_verify_${client_id}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`;
        const { data: verifyCommand } = await axiosInstance.post(
          `/revenuecat_v2/subscriptions/verify`,
          { client_id },
          {
            headers: {
              "Idempotency-Key": verifyKey,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        const verification = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/revenuecat_v2/commands/",
          "revenuecat verify",
        );
        setOrderId(verification?.order_id ?? order?.order_id ?? null);
        return verification;
      };

      const verificationResult = await retryVerification(verifyFunc, 5);

      if (verificationResult.success) {
        // Verification succeeded within 3 attempts
        const verification = verificationResult.data;
        setBackendVerified(true);

        setProcessingStep("Done");
        setTimeout(() => {
          setIsProcessing(false);
          setShowSuccessModal(true);
        }, 1000);
      } else {
        // All verification attempts failed, start polling
        setProcessingStep("Waiting for subscription sync...");
        startPolling();
      }
    } catch (error) {
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

  const [razorpayPollingAttempt, setRazorpayPollingAttempt] = useState(0);
  const timerRef = useRef(null);
  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => clearTimer, []);

  const pollPremium = async (attempt = 1) => {
    try {
      setProcessingStep(`Verifying payment`);
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) throw new Error("Client ID not found");
      const { data } = await axiosInstance.get(
        `/user_premium/payments/user/${clientId}/premium-status`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );
      return data?.has_premium;
    } catch (error) {
      return false;
    }
  };

  const startPolling = () => {
    let attemptCount = 0;
    setProcessingStep("Verifying Payment...");

    timerRef.current = setInterval(async () => {
      attemptCount++;
      setRazorpayPollingAttempt(attemptCount);

      if (await pollPremium(attemptCount)) {
        setBackendVerified(true);

        clearTimer();
        setTimeout(() => {
          setIsProcessing(false);
          setShowSuccessModal(true);
        }, 1000);
      } else if (attemptCount >= 10) {
        clearTimer();
        setIsProcessing(false);
        setShowTimeoutModal(true);
      }
    }, 2500);
  };

  const handleRazorpayPayment = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingStep("Initializing...");

    try {
      // 1) Get client ID and check prerequisites
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) throw new Error("Client ID not found");

      // 2) Check current premium status
      setProcessingStep("Checking account status...");
      const { data } = await axiosInstance.get(
        `/user_premium/payments/user/${clientId}/premium-status`,
        {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      if (data?.has_premium) {
        showToast({
          type: "info",
          title: "Active Premium User",
          desc: "You already have an active premium subscription!",
        });
        setIsProcessing(false);
        return;
      }

      // 3) Create subscription on server via queue-backed flow
      setProcessingStep("Queuing subscription...");

      const idempotencyKey = `rzp_sub_${clientId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const { data: commandResponse } = await axiosInstance.post(
        `/razorpay_payments_v2/checkout`,
        {
          user_id: clientId,
          plan_sku: productRpSku,
        },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
            "ngrok-skip-browser-warning": "true",
          },
        },
      );

      setProcessingStep("Creating subscription...");
      const subscriptionData = await waitForCommandCompletion(
        commandResponse?.request_id,
        "/razorpay_payments_v2/commands/",
        "subscription checkout",
      );

      setOrderId(subscriptionData?.order_id || null);

      // 4) Open Razorpay checkout for the created subscription
      setProcessingStep("Setting up payment...");
      const options = {
        key: subscriptionData.razorpay_key_id,
        subscription_id: subscriptionData.subscription_id,
        name: "Fymble",
        description: subscriptionData.display_title || "Premium Subscription",
        prefill: {},
        theme: { color: "#FF5757" },
        // Explicitly enable payment methods for iOS
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: true,
          paylater: true,
        },
        // Configure display preferences
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                channels: [
                  { name: "Paytm" },
                  { name: "Google Pay" },
                  { name: "PhonePe" },
                  { name: "Amazon Pay" },
                  { name: "BHIM" },
                ],
              },
            },
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
        remember_customer: true,
      };

      setProcessingStep("Processing payment...");
      const result = await RazorpayCheckout.open(options);

      // 5) Retry verification 3 times before falling back to polling
      const verifyFunc = async () => {
        const verifyKey = `rzp_verify_${
          result.razorpay_payment_id
        }_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const { data: verifyCommand } = await axiosInstance.post(
          `/razorpay_payments_v2/verify`,
          {
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_subscription_id: result.razorpay_subscription_id,
            razorpay_signature: result.razorpay_signature,
          },
          {
            headers: {
              "Idempotency-Key": verifyKey,
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        const verifyResult = await waitForCommandCompletion(
          verifyCommand?.request_id,
          "/razorpay_payments_v2/commands/",
          "subscription verify",
        );
        setOrderId(verifyResult?.order_id);
        return verifyResult;
      };

      const verificationResult = await retryVerification(verifyFunc, 5);

      if (
        verificationResult.success &&
        verificationResult.data?.captured === true
      ) {
        // Immediate success (payment captured and recorded server-side)
        setBackendVerified(true);
        clearTimer();
        setTimeout(() => {
          setIsProcessing(false);
          setShowSuccessModal(true);
        }, 1000);
      } else if (
        verificationResult.success &&
        verificationResult.data?.verified === false
      ) {
        // Payment failed/refunded
        clearTimer();
        setIsProcessing(false);
        showToast({
          type: "error",
          title: "Payment Failed",
          desc: "Payment was not captured. Please try again.",
        });
      } else {
        // 6) All verification attempts failed, await webhook to flip premium, then poll status
        setProcessingStep("Waiting for payment confirmation...");
        startPolling();
      }
    } catch (err) {
      clearTimer();
      setIsProcessing(false);
      if (err?.code !== 2) {
        Alert.alert(
          "Payment Error",
          err?.message || err?.description || "Payment failed or cancelled.",
        );
      }
    }
  }, [API_BASE, productRpSku, isProcessing, waitForCommandCompletion]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment Summary</Text>
        </View>

        {/* Plan Details Card */}
        <View style={styles.card}>
          <View style={styles.planDetails}>
            <Text style={styles.planName}>{name || "Premium Plan"}</Text>
            <Text style={styles.planDuration}>
              {duration || "Monthly"} Subscription
            </Text>

            <View style={styles.priceLine}>
              <Text style={styles.priceLabel}>Regular Price (Total):</Text>
              <Text style={styles.priceValueStrikethrough}>
                ₹{regularPrice.toFixed(2)}
              </Text>
            </View>
            {planMonths > 1 && (
              <Text style={styles.perMonthNote}>
                ₹{(parseFloat(price) || 0).toFixed(2)}/month × {planMonths}{" "}
                months
              </Text>
            )}

            <View style={styles.priceLine}>
              <Text style={styles.priceLabel}>Discounted Price (Total):</Text>
              <Text style={styles.priceValue}>
                ₹{discountedPrice.toFixed(2)}
              </Text>
            </View>
            {planMonths > 1 && (
              <Text style={styles.perMonthNote}>
                ₹{(parseFloat(offerprice) || 0).toFixed(2)}/month × {planMonths}{" "}
                months
              </Text>
            )}

            <View style={styles.divider} />

            <View style={styles.priceLine}>
              <Text style={styles.totalLabel}>Total Amount to Pay:</Text>
              <Text style={styles.totalValue}>
                ₹{selectedPlanPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method Section */}
        {paymentMethod ? (
          <PaymentMethodSelector
            initialMethod={paymentMethod}
            showChangeOption={true}
            onSelectMethod={openPaymentMethodModal}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity
              style={styles.selectPaymentButton}
              onPress={openPaymentMethodModal}
            >
              <Text style={styles.selectPaymentText}>
                Select Payment Method
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed Pay Button at Bottom */}
      <View style={[styles.fixedButtonContainer, { bottom: insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!paymentMethod || isProcessing) && styles.payButtonDisabled,
          ]}
          onPress={handlePayNow}
          disabled={!paymentMethod || isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.payButtonText, { marginLeft: 10 }]}>
                {processingStep || "Processing..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₹{selectedPlanPrice.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        visible={paymentMethodModalVisible}
        onClose={() => setPaymentMethodModalVisible(false)}
        onPaymentMethodSelect={handlePaymentMethodChange}
        planData={{
          name: name || "Premium Plan",
          discountedPrice: parseFloat(offerprice) || 0,
          duration: duration || "Monthly",
          mrp: parseFloat(price) || 0,
          months: planMonths,
          rc_id: rcIdentifier,
          product_rc: productRcSku,
          product_rp: productRpSku,
        }}
      />

      {/* XP Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showXpInfo}
        onRequestClose={() => setShowXpInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowXpInfo(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>XP Benefit Information</Text>
            <Text style={styles.modalText}>
              • Accumulate XP by completing activities in the app{"\n"}• Once
              you reach 2500 XP, you unlock a special discounted plan{"\n"}• The
              discount is pre-configured and cannot be combined with other
              offers{"\n"}• XP benefits are subject to our terms and conditions
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowXpInfo(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Processing Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isProcessing}
        onRequestClose={() => {}}
      >
        <View style={styles.processingModalOverlay}>
          <View style={styles.processingModalContent}>
            <ActivityIndicator size="large" color="#FF5757" />
            <Text style={styles.processingTitle}>Processing Payment</Text>
            {/* <Text style={styles.processingText}>{processingStep}</Text> */}
            {backendVerified && (
              <Text style={styles.successText}>✅ Payment Verified!</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Timeout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTimeoutModal}
        onRequestClose={() => setShowTimeoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeoutModalContent}>
            <View style={styles.timeoutIconContainer}>
              <Text style={styles.timeoutIcon}>⏱️</Text>
            </View>
            <Text style={styles.timeoutTitle}>Payment Processing Pending</Text>
            <Text style={styles.timeoutDescription}>
              Your payment is being processed. It may take a few moments to
              reflect in your Fymble account.
            </Text>
            {orderId && (
              <View style={styles.orderIdContainer}>
                <Text style={styles.orderIdLabel}>
                  Your Subscription Order ID:
                </Text>
                <TouchableOpacity
                  style={styles.orderIdCopyRow}
                  onPress={handleCopyOrderId}
                >
                  <Text style={styles.orderIdValue}>{orderId}</Text>
                  <Ionicons
                    name="copy-outline"
                    size={20}
                    color="#007BFF"
                    style={styles.copyIcon}
                  />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.timeoutInfoBox}>
              <Text style={styles.timeoutInfoText}>
                If your premium subscription doesn't activate shortly, please
                contact our support team with your order ID at{" "}
                <Text
                  style={styles.supportEmailLink}
                  onPress={handleEmailPress}
                >
                  support@fymble.app
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.timeoutCloseButton}
              onPress={() => {
                setShowTimeoutModal(false);
                router.push("/client/help");
              }}
            >
              <Text style={styles.timeoutCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.push("/client/home");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Text style={styles.successIcon}>🎉</Text>
            </View>
            <Text style={styles.successTitle}>Congratulations!</Text>
            <Text style={styles.successMessage}>
              You are now a Fymble Premium User
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push("/client/home");
              }}
            >
              <Text style={styles.successButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PayNow;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 10,
    paddingVertical: 10,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    paddingVertical: 10,
  },
  planDetails: {
    // marginBottom: 10,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  planDuration: {
    fontSize: 12,
    color: "#4CAF50",
    marginBottom: 10,
    fontWeight: 600,
  },
  offerTag: {
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  offerTagText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
  },
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: "#555",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  priceValueStrikethrough: {
    fontSize: 14,
    fontWeight: "500",
    color: "#888",
    textDecorationLine: "line-through",
  },
  perMonthNote: {
    fontSize: 11,
    color: "#999",
    marginLeft: 10,
    marginTop: -2,
    marginBottom: 6,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 7,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF5757",
  },
  xpSpecialPrice: {
    color: "#4CAF50",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  selectPaymentButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FF5757",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectPaymentText: {
    color: "#FF5757",
    fontSize: 14,
    fontWeight: "600",
  },
  fixedButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  payButton: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: "#FFAAAA",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  // NEW: Processing styles
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    marginBottom: 10,
  },
  processingText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  successText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
    marginTop: 15,
  },
  // XP related styles
  xpTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  infoButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#555",
  },
  xpDetails: {
    marginBottom: 5,
  },
  xpCompactDisplay: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 5,
  },
  xpColumn: {
    alignItems: "center",
    flex: 1,
  },
  xpValueLarge: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  xpLabel: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
  },
  xpDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "#EEEEEE",
  },
  xpInfoBanner: {
    backgroundColor: "#F9F9F9",
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  xpInfoText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
    marginBottom: 15,
    textAlign: "left",
    alignSelf: "stretch",
  },
  modalCloseButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  modalCloseButtonText: {
    color: "white",
    fontWeight: "600",
  },
  // Timeout modal styles
  timeoutModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  timeoutIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 35,
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
    fontSize: 16,
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
  supportEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
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
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeoutCloseButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  // Success modal styles
  successModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE8E8",
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
    marginBottom: 30,
  },
  successButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  successButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
