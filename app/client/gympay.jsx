import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Modal,
  ActivityIndicator,
  Linking,
  BackHandler,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGymMembershipCheckout } from "../../hooks/useGymMembershipCheckout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "../../utils/Toaster";
import { rewardApplyAPI } from "../../services/clientApi";
import { safeParseJSON } from "../../utils/safeHelpers";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Manual date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "—";

  const date = new Date(dateString);
  const months = [
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

  const day = date.getDate().toString().padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

const GymPay = () => {
  const router = useRouter();
  const {
    gymName,
    location,
    selectedPlanId,
    selectedPlanPrice,
    selectedPlanType,
    selectedPlanDuration,
    gymPlans,
    gym_id,
    passPrice,
    discountPrice,
    discount,
  } = useLocalSearchParams();
  const { start, busy } = useGymMembershipCheckout();
  const [selectedPlan, setSelectedPlan] = useState(selectedPlanId);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [availableRewards, setAvailableRewards] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    success: false,
    data: null,
    loading: false,
  });
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const intervalRef = useRef(null);

  // Parse gym plans from params or use default
  const parsedGymPlans = safeParseJSON(gymPlans, []);

  // Get selected gym plan details
  const getSelectedGymPlan = () => {
    return (
      parsedGymPlans.find((plan) => {
        const planId = plan.id || plan.plan_id;
        return planId?.toString() === selectedPlan;
      }) || parsedGymPlans[0]
    );
  };

  // Calculate eligibility based on fittbot_plan_offer data
  const calculateFittbotPlanEligibility = () => {
    const selectedGymPlan = getSelectedGymPlan();
    const gymDuration = selectedGymPlan?.duration || 1;

    if (selectedGymPlan?.fittbot_plan_offer?.can_offer_fittbot_plan) {
      const fittbotOffer = selectedGymPlan.fittbot_plan_offer.fittbot_plan;
      return {
        isEligible: true,
        freeMonths: fittbotOffer.duration,
        needsPurchase: false,
        fittbotPlanData: fittbotOffer,
      };
    } else {
      const pricePerMonth = 199;
      const totalValue = gymDuration * pricePerMonth;

      return {
        isEligible: true,
        freeMonths: gymDuration,
        needsPurchase: false,
        fittbotPlanData: {
          id: null,
          duration: gymDuration,
          price_rupees: totalValue,
        },
      };
    }
  };

  const eligibility = calculateFittbotPlanEligibility();

  // Calculate totals
  const gymPlanCost = getSelectedGymPlan()?.price || 0;
  const rewardDiscount = availableRewards;
  const finalPayment = rewardsApplied
    ? gymPlanCost - rewardDiscount
    : gymPlanCost;

  const handleBack = useCallback(() => {
    router.push({
      pathname: "/client/gymdetails",
      params: {
        gym_id: gym_id,
        passPrice: passPrice,
        discountPrice: discountPrice,
        discount: discount,
      },
    });
  }, [router, gym_id, passPrice, discountPrice, discount]);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        handleBack();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => {
        backHandler.remove();
      };
    }, [handleBack]),
  );

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
      setRewardsLoading(true);
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) return;

      const selectedGymPlan = getSelectedGymPlan();

      if (!selectedGymPlan?.price) return;

      const actualAmount = selectedGymPlan.price;

      const response = await rewardApplyAPI({
        client_id,
        amount: actualAmount,
        gym_id,
        plan_id: selectedGymPlan?.id,
      });

      if (response?.status === 200) {
        setAvailableRewards(response?.rewards || 0);
      } else {
        setAvailableRewards(0);
      }
    } catch (error) {
      console.error("Error fetching rewards:", error);
      setAvailableRewards(0);
    } finally {
      setRewardsLoading(false);
    }
  };

  const handlePayNow = async () => {
    try {
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

      const selectedGymPlanData = getSelectedGymPlan();
      const fittbotPlanId =
        selectedGymPlanData?.fittbot_plan_offer?.fittbot_plan?.id;
      const fittbotPlanToSend = fittbotPlanId?.toString() || null;
      const fittbotDuration = eligibility.freeMonths;

      const res = await start({
        gym_id,
        selectedPlan,
        client_id,
        themeColor: "#0ea5e9",
        description: "Secure checkout via Razorpay",
        selectedFittbotPlan: fittbotPlanToSend,
        fittbotDuration: fittbotDuration,
        includeSubscription: false,
        reward: rewardsApplied,
      });

      setTimeout(() => {
        if (res?.ok) {
          setPaymentModal({
            visible: true,
            success: true,
            data: res?.data,
            loading: false,
          });
        } else {
          setPaymentModal({
            visible: true,
            success: false,
            data: res,
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

  const handleClose = () => {
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
      ? `Hi,\n\nI'm facing an issue with my gym membership payment.\n\nOrder ID: ${paymentModal.data.orderId}\n\nPlease help me resolve this.\n\nThank you.`
      : "Hi,\n\nI'm facing an issue with my gym membership payment.\n\nPlease help me resolve this.\n\nThank you.";

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

  const handleGoToActivation = () => {
    setPaymentModal({
      visible: false,
      success: false,
      data: null,
      loading: false,
    });
    router.replace("/unpaid/activateaccount");
  };

  // Auto-redirect countdown effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (paymentModal.visible && paymentModal.success && !paymentModal.loading) {
      setCountdown(5);

      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setTimeout(() => {
              handleGoToActivation();
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
  }, [paymentModal.visible, paymentModal.success, paymentModal.loading]);

  // Fetch rewards on mount
  useEffect(() => {
    fetchRewards();
  }, []);

  const btnDisabled = busy;
  const insets = useSafeAreaInsets();
  const selectedGymPlan = getSelectedGymPlan();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Info</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        {/* Rewards Section at top */}
        {rewardsLoading ? (
          <View style={styles.topRewardsSection}>
            <View style={styles.topRewardsCard}>
              <ActivityIndicator size="small" color="#007BFF" />
              <Text style={styles.rewardsLoadingText}>Loading rewards...</Text>
            </View>
          </View>
        ) : (
          availableRewards > 0 && (
            <View style={styles.topRewardsSection}>
              <View style={styles.topRewardsCard}>
                <Image
                  source={require("../../assets/images/home/cash.png")}
                  style={styles.topRewardsIcon}
                  contentFit="contain"
                />
                <View style={styles.topRewardsTextContainer}>
                  <Text style={styles.topRewardsHeading}>
                    Available Reward in Wallet
                  </Text>
                  <Text style={styles.topRewardsCash}>
                    ₹{availableRewards} Cash
                  </Text>
                </View>
                {!rewardsApplied ? (
                  <TouchableOpacity
                    style={styles.topApplyButton}
                    onPress={handleApplyRewards}
                  >
                    <Text style={styles.topApplyButtonText}>Apply</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.topAppliedBadge}>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                  </View>
                )}
              </View>
            </View>
          )
        )}

        {/* No Cost EMI Info */}
        {selectedGymPlan?.no_cost_emi && (
          <View style={styles.noCostEmiSection}>
            <View style={styles.noCostEmiCard}>
              <Text style={styles.noCostEmiTitle}>No Cost EMI</Text>
              <Text style={styles.noCostEmiSubtitle}>
                Available on 3 & 6 months tenure
              </Text>
            </View>
          </View>
        )}

        {/* Selected Plan Display */}
        <View style={styles.selectedPlanSection}>
          <LinearGradient
            colors={["#007BFF", "#0056b3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectedPlanHeader}
          >
            <Text style={styles.selectedPlanHeaderText}>
              {selectedGymPlan?.duration} Month
              {selectedGymPlan?.duration > 1 ? "s" : ""} Plan
            </Text>
          </LinearGradient>

          {/* Payment Details */}
          <View style={styles.paymentDetailsSection}>
            <Text style={styles.paymentDetailsTitle}>Payment Details</Text>

            {/* Fittbot Subscription Row */}
            {selectedGymPlan?.fittbot_plan_offer?.can_offer_fittbot_plan && (
              <View style={styles.paymentDetailRow}>
                <View style={styles.paymentDetailLeft}>
                  <Image
                    source={require("../../assets/images/logo_pay.png")}
                    style={styles.paymentDetailIcon}
                    contentFit="contain"
                  />
                  <View>
                    <Text style={styles.paymentDetailLabel}>
                      {selectedGymPlan.fittbot_plan_offer.fittbot_plan.duration}{" "}
                      Months
                    </Text>
                    <Text style={styles.paymentDetailSubLabel}>
                      Fymble Premium Subscription
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentDetailFreeTag}>FREE</Text>
              </View>
            )}

            {/* Nutrition Consultation Row */}
            {selectedGymPlan?.nutritional_plan && (
              <View style={styles.paymentDetailRow}>
                <View style={styles.paymentDetailLeft}>
                  <Image
                    source={require("../../assets/images/nutri_pay.png")}
                    style={styles.paymentDetailIcon}
                    contentFit="contain"
                  />
                  <View>
                    <Text style={styles.paymentDetailLabel}>
                      {selectedGymPlan.nutritional_plan.consultations} sessions
                    </Text>
                    <Text style={styles.paymentDetailSubLabel}>
                      1:1 Nutrition Consultation
                    </Text>
                  </View>
                </View>
                <Text style={styles.paymentDetailFreeTag}>FREE</Text>
              </View>
            )}

            {/* Gym Membership Row */}
            <View style={styles.paymentDetailRow}>
              <View style={styles.paymentDetailLeft}>
                <MaterialCommunityIcons
                  name="calendar-month"
                  size={32}
                  color="#1278FF"
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.paymentDetailLabel}>
                    {selectedGymPlan?.duration} Months Gym Membership
                  </Text>
                  {selectedGymPlan?.duration > 1 && (
                    <Text style={styles.paymentDetailSubLabel}>
                      (₹
                      {selectedGymPlan?.per_month ||
                        Math.round(
                          selectedGymPlan?.price / selectedGymPlan?.duration,
                        )}{" "}
                      / Per Month)
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.paymentDetailPrice}>
                ₹{selectedGymPlan?.price}
              </Text>
            </View>

            {/* Final Payment Row */}
            <View style={styles.divider} />
            <View style={styles.finalPaymentRow}>
              <View style={styles.paymentDetailLeft}>
                <MaterialCommunityIcons
                  name="credit-card"
                  size={28}
                  color="#007BFF"
                />
                <Text style={styles.finalPaymentText}>Final Amount</Text>
              </View>
              <Text style={styles.finalPaymentAmount}>₹{finalPayment}</Text>
            </View>
          </View>
        </View>

        {/* Buy Now Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.buyNowButton}
            onPress={handlePayNow}
            disabled={btnDisabled}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF5757", "#FF8787"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyNowGradient}
            >
              <Text style={styles.buyNowText}>Buy Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Terms & Conditions */}
        {selectedGymPlan?.description && (
          <View style={styles.termsContainer}>
            <Text style={styles.termsTitle}>Terms & Conditions </Text>
            <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
              <Text style={styles.termsLink}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Payment Result Modal */}
      <Modal
        visible={paymentModal.visible}
        animationType="fade"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {paymentModal.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007BFF" />
                <Text style={styles.loadingText}>Processing Payment...</Text>
              </View>
            ) : paymentModal.success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <View style={styles.successIcon}>
                    <MaterialIcons name="check" size={40} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successMessage}>
                  Your gym membership has been activated{"\n"}successfully
                </Text>

                <View style={styles.rewardBanner}>
                  <Image
                    source={require("../../assets/images/refer/coin.webp")}
                    style={styles.rewardCoinImage}
                    contentFit="contain"
                  />
                  <View style={styles.rewardBannerText}>
                    <Text style={styles.rewardBannerTitle}>
                      You've earned a Reward Entry!
                    </Text>
                    <Text style={styles.rewardBannerSubtitle}>
                      Get a chance to win an iPhone 17 Pro Max!
                    </Text>
                  </View>
                </View>

                <View style={styles.compactDetailsContainer}>
                  <View style={styles.compactDetailRow}>
                    <Text style={styles.compactLabel}>Purchased at:</Text>
                    <Text style={styles.compactValue}>
                      {formatDate(paymentModal.data?.purchased_at)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.compactViewPassesButton}
                  onPress={handleGoToActivation}
                >
                  <Text style={styles.compactViewPassesButtonText}>
                    View Membership {countdown > 0 && `(${countdown})`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewEntriesButton}
                  onPress={() => {
                    handleClose();
                    router.push("/client/rewardprogram");
                  }}
                >
                  <Text style={styles.viewEntriesButtonText}>View Entries</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.failureContainer}>
                <View style={styles.failureIconContainer}>
                  <MaterialIcons name="error" size={60} color="#FF5757" />
                </View>
                <Text style={styles.failureTitle}>Payment Failed</Text>
                <Text style={styles.failureMessage}>
                  Payment not received. Please try again or contact support if
                  the issue persists.
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
                      support@fymble.app -Click here to proceed
                    </Text>
                  </Text>
                </View>

                <View style={styles.failureButtonsContainer}>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={termsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.termsModalOverlay}>
          <View style={styles.termsModalContent}>
            <View style={styles.termsModalHeader}>
              <Text style={styles.termsModalTitle}>Terms & Conditions</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styles.termsModalCloseButton}
              >
                <MaterialIcons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.termsModalBody}>
              <Text style={styles.termsModalDescriptionText}>
                {selectedGymPlan?.description}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.termsModalCloseFooterButton}
              onPress={() => setTermsModalVisible(false)}
            >
              <Text style={styles.termsModalCloseFooterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GymPay;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginLeft: 16,
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  topRewardsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  topRewardsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topRewardsIcon: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  topRewardsTextContainer: {
    flex: 1,
  },
  topRewardsHeading: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  topRewardsCash: {
    fontSize: 18,
    fontWeight: "700",
    color: "#101828",
  },
  topApplyButton: {
    backgroundColor: "#227BFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  topApplyButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  topAppliedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rewardsLoadingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    fontWeight: "500",
  },
  noCostEmiSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  noCostEmiCard: {
    backgroundColor: "#000000",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noCostEmiTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noCostEmiSubtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 4,
    fontWeight: "500",
  },
  selectedPlanSection: {
    marginHorizontal: 16,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  selectedPlanHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  selectedPlanHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  paymentDetailsSection: {
    padding: 16,
  },
  paymentDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  paymentDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    // borderBottomWidth: 1,
    // borderBottomColor: "#F0F0F0",
  },
  paymentDetailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  paymentDetailIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  paymentDetailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  paymentDetailSubLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  paymentDetailFreeTag: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E9C72",
  },
  paymentDetailPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
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
    paddingVertical: 8,
  },
  finalPaymentText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginLeft: 12,
  },
  finalPaymentAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#007BFF",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  buyNowButton: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buyNowGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  termsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  termsTitle: {
    fontSize: 12,
    color: "#666",
  },
  termsLink: {
    fontSize: 12,
    color: "#007BFF",
    fontWeight: "600",
    textDecorationLine: "underline",
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
  compactViewPassesButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  compactViewPassesButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9EC",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E6A817",
  },
  rewardCoinImage: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  rewardBannerText: {
    flex: 1,
  },
  rewardBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E6A817",
    marginBottom: 2,
  },
  rewardBannerSubtitle: {
    fontSize: 11,
    color: "#666",
  },
  viewEntriesButton: {
    backgroundColor: "#E6A817",
    paddingVertical: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  viewEntriesButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
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
  // Terms Modal Styles
  termsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  termsModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: "100%",
    maxHeight: "80%",
  },
  termsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E5E9",
  },
  termsModalTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  termsModalCloseButton: {
    padding: 4,
  },
  termsModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  termsModalDescriptionText: {
    fontSize: 15,
    color: "#4A5568",
    lineHeight: 22,
  },
  termsModalCloseFooterButton: {
    backgroundColor: "#0078FF",
    margin: 20,
    marginTop: 0,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  termsModalCloseFooterButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
