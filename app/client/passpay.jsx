import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaskedText } from "../../components/ui/MaskedText";
import SubscriptionComparison from "../../components/ui/Payment/SubscriptionComparison";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "../../context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import handlePay, {
  handlePayUpgrade,
} from "../../components/ui/Payment/passpayfn";
import { showToast } from "../../utils/Toaster";
import { isPureFreemium } from "../../config/access";
import {
  rewardApplyDailPassAPI,
  rewardProgramOptInAPI,
} from "../../services/clientApi";
import * as Clipboard from "expo-clipboard";
import axiosInstance from "../../services/axiosInstance";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const PassPay = () => {
  const router = useRouter();
  const {
    gymName,
    location,
    finalAmount,
    days,
    basePrice,
    startDate,
    endDate,
    expectedTime,
    gymId,
    type = "new",
    pass_id,
    total_upgrade_cost,
    dailypass_offer_eligible = "false",
  } = useLocalSearchParams();
  const { plan } = useUser();

  const [rewardsApplied, setRewardsApplied] = useState(false);
  const [newUser, setNewUser] = useState("existing"); // "new" or "existing"
  const [selectedPlan, setSelectedPlan] = useState("1"); // Default to 1 month
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    success: false,
    data: null,
    loading: false,
  });
  const [countdown, setCountdown] = useState(5);
  const intervalRef = useRef(null);
  const [availableRewards, setAvailableRewards] = useState(0);
  const [participated, setParticipated] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  // Eligibility modal state - shows when client is eligible but gym isn't opted in
  const [eligibilityModal, setEligibilityModal] = useState({
    visible: false,
    loading: false,
  });

  // Plan data
  const planData = {
    1: {
      name: "Gold Plan",
      duration: "1 Month",
      mrp: 398,
      discountedPrice: 199,
      savePercentage: 50,
      dailyRate: 6.6,
    },
    12: {
      name: "Diamond Plan",
      duration: "12 Months",
      mrp: 398,
      discountedPrice: 159,
      savePercentage: 60,
      dailyRate: 5.2,
    },
    6: {
      name: "Platinum Plan",
      duration: "6 Months",
      mrp: 398,
      discountedPrice: 179,
      savePercentage: 55,
      dailyRate: 5.9,
    },
  };

  // Get plan styles
  const getPlanStyles = (planId) => {
    switch (planId) {
      case "1": // Gold - 1 Month
        return {
          backgroundColor: selectedPlan === "1" ? "#FFFBF0" : "#FFF",
          borderColor: "#FFD700",
          borderWidth: selectedPlan === "1" ? 2 : 0,
        };
      case "12": // Diamond - 12 Months
        return {
          backgroundColor: selectedPlan === "12" ? "#FFF0F5" : "#FFF",
          borderColor: "#E91E63",
          borderWidth: selectedPlan === "12" ? 2 : 0,
        };
      case "6": // Platinum - 6 Months
        return {
          backgroundColor: selectedPlan === "6" ? "#F8FAFF" : "#FFF",
          borderColor: "#1565C0",
          borderWidth: selectedPlan === "6" ? 2 : 0,
        };
      default:
        return {
          backgroundColor: "#FFF",
          borderWidth: 0,
        };
    }
  };

  // Calculate values
  const totalCost = parseInt(finalAmount);
  const rewardDiscount = availableRewards;

  // Calculate subscription cost based on plan duration
  const getSubscriptionCost = () => {
    const plan = planData[selectedPlan];
    if (!plan) return 199;

    switch (selectedPlan) {
      case "1":
        return plan.discountedPrice; // ₹199 for 1 month
      case "6":
        return plan.discountedPrice * 6; // ₹179 * 6 = ₹1074
      case "12":
        return plan.discountedPrice * 12; // ₹159 * 12 = ₹1908
      default:
        return plan.discountedPrice;
    }
  };

  const subscriptionCost = newUser === "new" ? getSubscriptionCost() : 0;
  const finalPayment =
    newUser === "new"
      ? rewardsApplied
        ? totalCost + subscriptionCost - rewardDiscount
        : totalCost + subscriptionCost
      : rewardsApplied
        ? totalCost - rewardDiscount
        : totalCost;

  const handleBack = () => {
    router.back();
  };

  const handleApplyRewards = () => {
    if (availableRewards > 0) {
      setRewardsApplied(true);
    }
  };

  const handleRemoveRewards = () => {
    setRewardsApplied(false);
  };

  // Fetch available rewards
  const fetchRewards = async () => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) return;

      const response = await rewardApplyDailPassAPI({
        client_id,
        amount: totalCost,
      });

      if (response?.status === 200) {
        setAvailableRewards(response?.reward_amount || 0);
        setParticipated(response?.opted_in ?? true);
      } else {
        setAvailableRewards(0);
      }
    } catch (error) {
      setAvailableRewards(0);
    }
  };

  const handleOptIn = async () => {
    if (!termsAccepted) return;
    setOptInLoading(true);
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) return;
      const response = await rewardProgramOptInAPI(client_id);
      if (response?.status === 200) {
        setParticipated(true);
        showToast({
          type: "success",
          title: "Joined!",
          desc: response?.message || "You're now part of the Rewards Program!",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Something went wrong. Please try again.",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again.",
      });
    } finally {
      setOptInLoading(false);
    }
  };

  // Check eligibility and show modal if client is eligible but gym isn't
  const checkEligibilityBeforePayment = async () => {
    try {
      setEligibilityModal({ visible: false, loading: true });

      const response = await axiosInstance.post("/offer_eligibility/check", {
        gym_id: Number(gymId),
        mode: "dailypass",
      });

      const { is_eligible, client_eligible } = response.data;

      // If client is eligible but gym isn't opted in, show modal
      if (client_eligible && !is_eligible) {
        setEligibilityModal({ visible: true, loading: false });
        return false; // Don't proceed with payment
      }

      return true; // Proceed with payment
    } catch (error) {
      console.error("[PASSPAY] Eligibility check failed:", error);
      // On error, proceed with payment (don't block the user)
      return true;
    }
  };

  // Proceed with actual payment (called after eligibility check passes or user confirms)
  const proceedWithPayment = async () => {
    try {
      // Show loading
      setPaymentModal({
        visible: true,
        success: false,
        data: null,
        loading: true,
      });

      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        setPaymentModal({
          visible: true,
          success: false,
          data: null,
          loading: false,
        });
        return;
      }

      // Convert DD/MM/YYYY → YYYY-MM-DD (or pass through if already normalized)
      const formatDateToSQL = (dateString) => {
        const parts = String(dateString).split("/");
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
            2,
            "0",
          )}`;
        }
        return String(dateString);
      };

      const payload = {
        // required
        gymId: Number(gymId),
        clientId: String(client_id),
        startDate: formatDateToSQL(startDate),
        daysTotal: Number(days),
        selectedTime: expectedTime ?? null,
        reward: rewardsApplied,

        // subscription: this quick path is daily-pass only
        includeSubscription: false,
        selectedPlan: Number(selectedPlan),

        // amounts are now computed on the server; don't send them
        dailyPassAmount: null,
        subscriptionAmount: null,
        rewardDiscount: 0,
        finalAmount: null,

        // optional meta (not used by server for pricing)
        userType: "existing",
        planDetails: null,

        // offer eligibility - force ₹49 pricing if client is eligible
        is_offer_eligible: dailypass_offer_eligible === "true",
      };

      const payloadEdit = {
        gymId: Number(gymId),
        clientId: String(client_id),
        pass_id: pass_id,
        days: Number(days),
        total_upgrade_cost: Number(total_upgrade_cost),
      };

      const response =
        type === "upgrade"
          ? await handlePayUpgrade(payloadEdit)
          : await handlePay(payload);

      setTimeout(() => {
        if (response?.success) {
          // Close the processing modal before navigation (fixes iOS modal persistence)
          setPaymentModal({
            visible: false,
            success: false,
            data: null,
            loading: false,
          });
          // Navigate to pass confirmed page
          router.push({
            pathname: "/client/passConfirmed",
            params: {
              gymName,
              location,
              days,
              startDate,
              endDate,
            },
          });
        } else {
          setPaymentModal({
            visible: true,
            success: false,
            data: response,
            loading: false,
          });
        }
      }, 0);
    } catch (e) {
      console.error("Payment error:", e);
      setTimeout(() => {
        setPaymentModal({
          visible: true,
          success: false,
          data: null,
          loading: false,
        });
      }, 0);
    }
  };

  const handlePayNow = async () => {
    // First check eligibility
    const canProceed = await checkEligibilityBeforePayment();
    if (!canProceed) return;

    // Proceed with payment
    await proceedWithPayment();
  };

  // Handle user choosing to continue with current selection from eligibility modal
  const handleContinueWithSelection = () => {
    setEligibilityModal({ visible: false, loading: false });
    proceedWithPayment();
  };

  // Handle user choosing to explore other gyms from eligibility modal
  const handleExploreGyms = () => {
    setEligibilityModal({ visible: false, loading: false });
    router.push({
      pathname: "/client/home",
      params: { tab: "Fitness Studios", dailypassFilter: "true" },
    });
  };

  const handleGoToAllPasses = useCallback(() => {
    setPaymentModal({
      visible: false,
      success: false,
      data: null,
      loading: false,
    });
    router.replace("/client/allpass");
  }, [router]);

  // Auto-redirect countdown effect
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (paymentModal.visible && paymentModal.success && !paymentModal.loading) {
      // Reset countdown
      setCountdown(5);

      // Start countdown timer
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            // Clear interval before navigation
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Navigate after countdown
            setTimeout(() => {
              handleGoToAllPasses();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paymentModal.success, handleGoToAllPasses]);

  // Fetch rewards on mount
  useEffect(() => {
    fetchRewards();
  }, []);

  // Cleanup: Close payment modal on unmount (fixes iOS modal persistence issue)
  useEffect(() => {
    return () => {
      // Close any open modals when component unmounts
      setPaymentModal({
        visible: false,
        success: false,
        data: null,
        loading: false,
      });
      setEligibilityModal({
        visible: false,
        loading: false,
      });
    };
  }, []);

  const handleCloseModal = () => {
    setPaymentModal({
      visible: false,
      success: false,
      data: null,
      loading: false,
    });
  };

  const handleCopyOrderId = async () => {
    try {
      await Clipboard.setStringAsync(paymentModal.data?.orderId || "");
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
    const subject = paymentModal.data?.orderId
      ? `Payment Issue - Order ID: ${paymentModal.data.orderId}`
      : "Payment Issue";
    const body = paymentModal.data?.orderId
      ? `Hi,\n\nI'm facing an issue with my payment.\n\nOrder ID: ${paymentModal.data.orderId}\n\nPlease help me resolve this.\n\nThank you.`
      : "Hi,\n\nI'm facing an issue with my payment.\n\nPlease help me resolve this.\n\nThank you.";

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

  const formatAmount = (amount) => {
    if (!amount) return "0";
    return (amount / 100).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gymName}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <MaterialIcons name="receipt-long" size={30} color="#FF3B30" />
          <View>
            <Text style={styles.mainTitle}>Review & Pay</Text>
            <Text style={styles.subtitle}>Confirm your booking details</Text>
          </View>
        </View>

        {/* Show subscription comparison and plan selection for new users */}
        {newUser === "new" && (
          <>
            <SubscriptionComparison />

            {/* Plan Selection Section */}
            <View style={styles.planSelectionContainer}>
              <View style={styles.plansRow}>
                {/* 1 Month Plan */}
                <View style={styles.planColumn}>
                  <TouchableOpacity
                    style={[styles.planCard, getPlanStyles("1")]}
                    onPress={() => setSelectedPlan("1")}
                  >
                    <View style={styles.planContent}>
                      <Text style={styles.planTitle}>1 Month</Text>
                      <Text style={styles.saveText}>Save 50%</Text>
                      <Text style={styles.originalPrice}>₹398</Text>
                      <Text style={styles.currentPrice}>₹199</Text>
                      <Text style={styles.perMonthText}>Per Month</Text>
                      <Text style={styles.inclGst}>*incl gst</Text>
                    </View>
                    {selectedPlan === "1" ? (
                      <View style={styles.checkMark}>
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.dailyRate}>
                    Start Now at{" "}
                    <Text style={{ color: "#4CAF50", fontSize: 12 }}>₹6.6</Text>{" "}
                    day
                  </Text>
                </View>

                {/* 12 Month Plan - Power Pack */}
                <View style={styles.planColumn}>
                  <TouchableOpacity
                    style={[styles.planCard, getPlanStyles("12")]}
                    onPress={() => setSelectedPlan("12")}
                  >
                    <View style={styles.powerPackBadge}>
                      <Text style={styles.powerPackText}>Power Pack</Text>
                    </View>
                    <View style={styles.planContent}>
                      <Text style={styles.planTitle}>12 Months</Text>
                      <Text style={styles.saveText}>Save 60%</Text>
                      <Text style={styles.originalPrice}>₹398</Text>
                      <Text style={styles.currentPrice}>₹159</Text>
                      <Text style={styles.perMonthText}>Per Month</Text>
                      <Text style={styles.inclGst}>*incl gst</Text>
                    </View>
                    {selectedPlan === "12" ? (
                      <View style={styles.checkMark}>
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.dailyRate}>
                    Get Strong at{" "}
                    <Text style={{ color: "#4CAF50", fontSize: 12 }}>₹5.2</Text>{" "}
                    day
                  </Text>
                </View>

                {/* 6 Month Plan - Popular */}
                <View style={styles.planColumn}>
                  <TouchableOpacity
                    style={[styles.planCard, getPlanStyles("6")]}
                    onPress={() => setSelectedPlan("6")}
                  >
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                    <View style={styles.planContent}>
                      <Text style={styles.planTitle}>6 Months</Text>
                      <Text style={styles.saveText}>Save 55%</Text>
                      <Text style={styles.originalPrice}>₹398</Text>
                      <Text style={styles.currentPrice}>₹179</Text>
                      <Text style={styles.perMonthText}>Per Month</Text>
                      <Text style={styles.inclGst}>*incl gst</Text>
                    </View>
                    {selectedPlan === "6" ? (
                      <View style={styles.checkMark}>
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.dailyRate}>
                    Stay Fit Under{" "}
                    <Text style={{ color: "#4CAF50", fontSize: 12 }}>₹5.9</Text>{" "}
                    day
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Pass Details Section */}
        <View style={styles.section}>
          <View style={styles.outerCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="local-offer" size={20} color="#FF5757" />
              <Text style={styles.sectionTitle}>Pass Details</Text>
            </View>
            <View style={styles.innerCard}>
              <View style={styles.passDetailRow}>
                <View>
                  <Text style={styles.passDetailLabel}>{days} Day Pass</Text>
                </View>
                <Text style={styles.discountedPrice}>₹{totalCost}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Your Schedule Section */}
        <View style={styles.section}>
          <View style={styles.outerCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="event" size={20} color="#FF5757" />
              <Text style={styles.sectionTitle}>Your Schedule</Text>
            </View>
            <View style={styles.scheduleCard}>
              <Text style={styles.scheduleDate}>
                {startDate} {parseInt(days) === 1 ? "" : `to ${endDate}`}
              </Text>
            </View>
          </View>
        </View>
        {type === "upgrade" ? (
          ""
        ) : (
          <View style={styles.rewardsSection}>
            <View style={styles.rewardsCard}>
              <View style={styles.rewardsLeft}>
                <MaterialCommunityIcons name="gift" size={20} color="#FF5757" />
                <View style={styles.rewardsTextContainer}>
                  <Text style={styles.rewardsHeading}>Rewards</Text>
                  <Text style={styles.rewardsText}>
                    You can use ₹{rewardDiscount} Fymble Cash
                  </Text>
                </View>
              </View>
              {!rewardsApplied ? (
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    availableRewards === 0 && styles.applyButtonDisabled,
                  ]}
                  onPress={handleApplyRewards}
                  disabled={availableRewards === 0}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={handleRemoveRewards}
                >
                  <Text style={styles.removeText}>Remove</Text>
                  <MaterialIcons name="close" size={16} color="#FF5757" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Reward Program Opt-In — compact banner */}
        {!participated && type !== "upgrade" && (
          <View style={styles.rewardOptInWrapper}>
            {/* Top row: icon + title + checkbox + button */}
            <View style={styles.rewardOptInRow}>
              <View style={styles.rewardOptInMid}>
                <Text style={styles.rewardOptInTitle}>
                  Join Fymble Mega Fitness Rewards
                </Text>
                <Text
                  style={{ color: "#827878", fontSize: 12, marginBottom: 6 }}
                >
                  Get a Chance to win iPhone 17 pro max
                </Text>
                <TouchableOpacity
                  style={styles.rewardOptInCheckRow}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.rewardOptInCheckbox,
                      termsAccepted && styles.rewardOptInCheckboxChecked,
                    ]}
                  >
                    {termsAccepted && (
                      <MaterialIcons name="check" size={10} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.rewardOptInCheckText}>
                    I agree to the{" "}
                    <Text
                      style={styles.rewardOptInLink}
                      onPress={() => router.push("/client/rewardtc")}
                    >
                      T&C
                    </Text>{" "}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  styles.rewardOptInButton,
                  !termsAccepted && styles.rewardOptInButtonDisabled,
                ]}
                onPress={handleOptIn}
                disabled={!termsAccepted || optInLoading}
                activeOpacity={0.85}
              >
                {optInLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text
                    style={[
                      styles.rewardOptInButtonText,
                      !termsAccepted && styles.rewardOptInButtonTextDisabled,
                    ]}
                  >
                    Join
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitlePlain}>Payment Summary</Text>
          <View style={styles.card}>
            {/* Subscription Cost for new users */}
            {newUser === "new" && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.iconImage}
                  />
                  <Text style={styles.summaryText}>
                    Fymble {planData[selectedPlan]?.duration} Subscription
                  </Text>
                </View>
                <Text style={styles.summaryAmount}>₹{subscriptionCost}</Text>
              </View>
            )}

            {/* Days Pass Cost */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{totalCost}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (18%)</Text>
              <Text style={styles.summaryValue}>₹0</Text>
            </View>

            {/* Rewards Redemption */}
            {rewardsApplied && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rewards Discount</Text>
                <Text style={[styles.summaryValue, styles.discountText]}>
                  -₹{rewardDiscount}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Final Payment */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{finalPayment}</Text>
            </View>
          </View>
        </View>

        {/* Confirm & Pay Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handlePayNow}
            disabled={paymentModal.loading}
          >
            <LinearGradient
              colors={["#00C950", "#009966"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              {paymentModal.loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm & Pay ₹{finalPayment}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Result Modal */}
      <Modal
        visible={paymentModal.visible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {paymentModal.loading ? (
              // Loading state
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Processing Payment...</Text>
              </View>
            ) : paymentModal.success ? (
              // Success state
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <View style={styles.successIcon}>
                    <MaterialIcons name="check" size={40} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successMessage}>
                  Your daily pass has been activated{"\n"}successfully
                </Text>

                {/* Compact Payment Details */}
                <View style={styles.compactDetailsContainer}>
                  <View style={styles.compactDetailRow}>
                    <Text style={styles.compactLabel}>Order ID:</Text>
                    <Text style={styles.compactValue}>
                      {paymentModal.data?.order_id || "ord_"}
                    </Text>
                  </View>
                  <View style={styles.compactDetailRow}>
                    <Text style={styles.compactLabel}>Payment ID:</Text>
                    <Text style={styles.compactValue}>
                      {paymentModal.data?.payment_id || "p"}
                    </Text>
                  </View>
                  <View style={styles.compactDetailRow}>
                    <Text style={styles.compactLabel}>Amount Paid:</Text>
                    <Text style={styles.compactValue}>
                      ₹{formatAmount(paymentModal.data?.total_amount)}
                    </Text>
                  </View>

                  {paymentModal.data?.daily_pass_details && (
                    <>
                      <View style={styles.compactDivider} />
                      <Text style={styles.compactSectionTitle}>
                        Pass Details:
                      </Text>
                      <View style={styles.compactDetailRow}>
                        <Text style={styles.compactLabel}>Duration:</Text>
                        <Text style={styles.compactValue}>
                          {paymentModal.data.daily_pass_details.days_total}
                        </Text>
                      </View>
                      <View style={styles.compactDetailRow}>
                        <Text style={styles.compactLabel}>Valid From:</Text>
                        <Text style={styles.compactValue}>
                          {formatDate(
                            paymentModal.data.daily_pass_details.valid_from,
                          )}
                        </Text>
                      </View>
                      <View style={styles.compactDetailRow}>
                        <Text style={styles.compactLabel}>Valid Until:</Text>
                        <Text style={styles.compactValue}>
                          {formatDate(
                            paymentModal.data.daily_pass_details.valid_until,
                          )}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.compactViewPassesButton}
                  onPress={handleGoToAllPasses}
                >
                  <Text style={styles.compactViewPassesButtonText}>
                    View My Passes {countdown > 0 && `(${countdown})`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Failure state
              <View style={styles.failureContainer}>
                <View style={styles.failureIconContainer}>
                  <MaterialIcons name="error" size={60} color="#FF5757" />
                </View>
                <Text style={styles.failureTitle}>Payment Failed</Text>
                <Text style={styles.failureMessage}>
                  {
                    "Payment not received. Please try again or contact support if the issue persists."
                  }
                </Text>

                {paymentModal.data?.orderId && (
                  <View style={styles.failureDetailsContainer}>
                    <Text style={styles.failureOrderIdLabel}>Order ID:</Text>
                    <TouchableOpacity
                      style={styles.orderIdCopyRow}
                      onPress={handleCopyOrderId}
                    >
                      <Text style={styles.failureOrderId}>
                        {paymentModal.data.orderId}
                      </Text>
                      <Ionicons
                        name="copy-outline"
                        size={18}
                        color="#007BFF"
                        style={styles.copyIcon}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.supportContainer}>
                  <Text style={styles.supportText}>
                    Please contact support with Order ID at{" "}
                    <Text
                      style={styles.supportEmail}
                      onPress={handleEmailPress}
                    >
                      support@fymble.app - Click here to proceed
                    </Text>
                  </Text>
                </View>

                <View style={styles.failureButtonsContainer}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Eligibility Modal - Shows when client is eligible but gym isn't opted in */}
      <Modal
        visible={eligibilityModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() =>
          setEligibilityModal({ visible: false, loading: false })
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eligibilityModalContainer}>
            {/* Icon */}
            <View style={styles.eligibilityIconContainer}>
              <LinearGradient
                colors={["#FF5757", "#FF5757"]}
                style={styles.eligibilityIconGradient}
              >
                <MaterialIcons name="card-giftcard" size={40} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.eligibilityTitle}>
              You're Eligible for ₹49 Daily Pass!
            </Text>

            {/* Message */}
            <Text style={styles.eligibilityMessage}>
              Great news! You qualify for our special ₹49/day offer. However,
              this gym hasn't opted into the promotional program yet.
            </Text>

            {/* Info Box */}
            <View style={styles.eligibilityInfoBox}>
              <MaterialIcons name="lightbulb" size={20} color="#FF5757" />
              <Text style={styles.eligibilityInfoText}>
                You can book at ₹49/day at other participating gyms, or continue
                with this gym's regular pricing.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.eligibilityButtonsContainer}>
              <TouchableOpacity
                style={styles.eligibilityExploreButton}
                onPress={handleExploreGyms}
              >
                <MaterialIcons name="explore" size={20} color="#FF5757" />
                <Text style={styles.eligibilityExploreButtonText}>
                  Explore Other Gyms
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.eligibilitySecondaryButton}
                onPress={handleContinueWithSelection}
              >
                <Text style={styles.eligibilitySecondaryButtonText}>
                  Continue with Current Selection
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PassPay;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollContent: {
    paddingTop: 10,
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  section: {
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  outerCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    paddingVertical: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  innerCard: {
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    padding: 12,
  },
  sectionTitlePlain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 16,
  },
  passDetailLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF3B30",
    marginBottom: 4,
  },
  passDetailSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  discountedPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF3B30",
  },
  scheduleCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleDate: {
    fontSize: 13,
    color: "#333",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  discountText: {
    color: "#FF5757",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00C853",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  confirmButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "70%",
    alignSelf: "center",
  },
  confirmGradient: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  gymSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  gymName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  gymLocation: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  passDetailsSection: {
    marginTop: 15,
  },
  gradient: {
    paddingVertical: 8,
    marginBottom: 10,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#525252",
    marginLeft: 20,
  },
  passDetailsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 16,
  },
  passDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passDetailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  passDetailText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  passDetailValue: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    fontWeight: "bold",
  },
  gymInfoContainer: {
    marginLeft: 8,
    flex: 1,
  },
  passDetailGymName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  passDetailLocation: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  passDetailDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  rewardsSection: {
    marginTop: 8,
  },
  rewardsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE5CC",
    marginHorizontal: 16,
  },
  rewardsLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  rewardsTextContainer: {
    marginLeft: 12,
    justifyContent: "center",
  },
  rewardsHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  rewardsText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  applyButton: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  appliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  appliedText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  removeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeText: {
    color: "#FF5757",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  summarySection: {
    marginTop: 15,
    marginBottom: 60,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  discountAmount: {
    color: "#FF5757",
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 12,
  },
  finalPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  finalPaymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  finalPaymentAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007BFF",
  },
  spacer: {
    height: 80,
  },
  payNowContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  payNowButton: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  payNowGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  // Plan selection styles
  planSelectionContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  plansRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  planColumn: {
    alignItems: "center",
    width: (screenWidth - 40) / 3,
  },
  planCard: {
    backgroundColor: "#FFF",
    borderRadius: 15,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
    width: "100%",
    minHeight: 180,
    alignItems: "center",
    marginBottom: 8,
  },
  planContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    marginTop: 15,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
    textAlign: "center",
  },
  saveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 3,
    textAlign: "center",
  },
  originalPrice: {
    fontSize: 10,
    color: "#999",
    textDecorationLine: "line-through",
    marginBottom: 2,
    textAlign: "center",
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
    textAlign: "center",
  },
  perMonthText: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
    textAlign: "center",
  },
  inclGst: {
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  dailyRate: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
  },
  powerPackBadge: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    backgroundColor: "#FF5757",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  powerPackText: {
    fontSize: 8,
    color: "#FFF",
    fontWeight: "600",
  },
  popularBadge: {
    position: "absolute",
    top: -6,
    alignSelf: "center",
    backgroundColor: "#FF8C00",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 8,
    color: "#FFF",
    fontWeight: "600",
  },
  checkMark: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCircle: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  iconImage: {
    width: 20,
    height: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: screenWidth - 60,
    maxHeight: screenHeight * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  // Loading styles
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },

  // Success styles
  successContainer: {
    alignItems: "center",
    width: "100%",
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#22C55E",
    marginBottom: 8,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  // Compact success styles
  compactDetailsContainer: {
    width: "100%",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  compactDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  compactLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
  },
  compactValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  compactDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  compactSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 4,
  },
  compactViewPassesButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  compactViewPassesButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Failure styles
  failureContainer: {
    alignItems: "center",
    width: "100%",
  },
  failureIconContainer: {
    marginBottom: 16,
  },
  failureTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF5757",
    marginBottom: 8,
    textAlign: "center",
  },
  failureMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  failureDetailsContainer: {
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  failureOrderIdLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  orderIdCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  failureOrderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  copyIcon: {
    marginLeft: 4,
  },
  supportContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: "100%",
  },
  supportText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  supportEmail: {
    fontWeight: "600",
    color: "#007BFF",
  },
  failureButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  // Eligibility Modal Styles
  eligibilityModalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  eligibilityIconContainer: {
    marginBottom: 16,
  },
  eligibilityIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  eligibilityTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
  },
  eligibilityMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  eligibilityInfoBox: {
    flexDirection: "row",
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: "flex-start",
    gap: 10,
  },
  eligibilityInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  eligibilityButtonsContainer: {
    width: "100%",
    gap: 12,
  },
  eligibilityPrimaryButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  eligibilityButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  eligibilityPrimaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  eligibilityExploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF5757",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  eligibilityExploreButtonText: {
    color: "#FF5757",
    fontSize: 16,
    fontWeight: "600",
  },
  eligibilitySecondaryButton: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  eligibilitySecondaryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Reward opt-in compact banner
  rewardOptInWrapper: {
    marginHorizontal: 16,
    marginBottom: 6,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFD5D5",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rewardOptInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardOptInMid: {
    flex: 1,
  },
  rewardOptInTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CC2222",
    marginBottom: 4,
  },
  rewardOptInCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rewardOptInCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  rewardOptInCheckboxChecked: {
    borderColor: "#FF5757",
    backgroundColor: "#FF5757",
  },
  rewardOptInCheckText: {
    fontSize: 11,
    color: "#666",
    flex: 1,
    lineHeight: 15,
  },
  rewardOptInLink: {
    color: "#FF5757",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  rewardOptInButton: {
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 46,
  },
  rewardOptInButtonDisabled: {
    backgroundColor: "#DDD",
  },
  rewardOptInButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  rewardOptInButtonTextDisabled: {
    color: "#AAA",
  },
});
