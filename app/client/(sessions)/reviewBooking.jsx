import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { handlePay as handleSessionPay } from "../../../components/ui/Payment/sessionpayfn";
import { showToast } from "../../../utils/Toaster";
import axiosInstance from "../../../services/axiosInstance";
import {
  rewardCheck,
  rewardProgramOptInAPI,
} from "../../../services/clientApi";

const ReviewBooking = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const [availableRewards, setAvailableRewards] = useState(0);
  const [paying, setPaying] = useState(false);
  const [participated, setParticipated] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  // Eligibility modal state - shows when client is eligible but gym isn't opted in
  const [eligibilityModal, setEligibilityModal] = useState({
    visible: false,
    loading: false,
  });

  const sessionName = params.sessionName;
  const sessionId = params.sessionId;
  const gymId = params.gymId;
  const passType = params.passType;
  const selectedDatesString = params.selectedDates;
  const timeDataString = params.timeData;
  const passPrice = parseFloat(params.passPrice) || 0;
  const discountPrice = parseFloat(params.discountPrice) || 0;
  const session_offer_eligible = params.session_offer_eligible === "true";

  const selectedDates = selectedDatesString
    ? JSON.parse(selectedDatesString).map((d) => new Date(d))
    : [];

  const timeData = timeDataString ? JSON.parse(timeDataString) : null;

  // Parse pricing data from API
  const pricingData = React.useMemo(() => {
    try {
      return params.pricingData ? JSON.parse(params.pricingData) : null;
    } catch (error) {
      console.error("Error parsing pricingData:", error);
      return null;
    }
  }, [params.pricingData]);

  const handleBack = () => {
    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  const formatDate = (date) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    return `${days[date.getDay()]}, ${
      months[date.getMonth()]
    } ${date.getDate()}`;
  };

  const getPassTitle = () => {
    if (passType === "1-session") return "1 Day Pass";
    if (passType === "5-session") return "5 Day Pass";
    return `${selectedDates.length} Day Pass`;
  };

  const getPassSubtitle = () => {
    if (passType === "1-session") return "1 Session";
    if (passType === "5-session") return "5 Sessions";
    return `${selectedDates.length} Sessions`;
  };

  // Set available rewards from pricing data
  useEffect(() => {
    if (pricingData?.is_rewards && pricingData?.rewards) {
      setAvailableRewards(pricingData.rewards);
    } else {
      setAvailableRewards(0);
    }
  }, [pricingData]);

  // Fetch reward opt-in status only
  useEffect(() => {
    const fetchOptInStatus = async () => {
      try {
        const client_id = await AsyncStorage.getItem("client_id");
        if (!client_id) return;
        const response = await rewardCheck(client_id);
        setParticipated(response?.opted_in ?? true);
      } catch {
        // silently fail
      }
    };
    fetchOptInStatus();
  }, []);

  // Cleanup: Close modals and reset loading state on unmount (fixes iOS modal persistence issue)
  useEffect(() => {
    return () => {
      setPaying(false);
      setEligibilityModal({
        visible: false,
        loading: false,
      });
    };
  }, []);

  const handleApplyRewards = () => {
    if (availableRewards > 0) {
      setRewardsApplied(true);
    }
  };

  const handleRemoveRewards = () => {
    setRewardsApplied(false);
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

  // Calculate totals from pricing data
  const subtotal = pricingData?.total || discountPrice;
  const tax = 0;
  const rewardDiscount = rewardsApplied ? availableRewards : 0;
  const total = pricingData?.total
    ? pricingData.total - rewardDiscount
    : subtotal + tax - rewardDiscount;
  const basePrice = pricingData?.base_price || passPrice;
  const discountPercentage = pricingData?.discount_percentage || 0;
  const savings =
    discountPercentage > 0
      ? basePrice * pricingData.sessions_count - subtotal
      : 0;

  // Check eligibility and show modal if client is eligible but gym isn't
  const checkEligibilityBeforePayment = async () => {
    try {
      setEligibilityModal({ visible: false, loading: true });

      const response = await axiosInstance.post("/offer_eligibility/check", {
        gym_id: Number(gymId),
        mode: "session",
      });

      const { is_eligible, client_eligible } = response.data;

      // If client is eligible but gym isn't opted in, show modal
      if (client_eligible && !is_eligible) {
        setEligibilityModal({ visible: true, loading: false });
        return false; // Don't proceed with payment
      }

      return true; // Proceed with payment
    } catch (error) {
      // On error, proceed with payment (don't block the user)
      return true;
    }
  };

  // Proceed with actual payment
  const proceedWithPayment = async () => {
    setPaying(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const trainer_id = params.trainer_id || null;
      if (!clientId) {
        showToast({ type: "error", title: "Client ID not found" });
        setPaying(false);
        return;
      }

      // Convert dates to YYYY-MM-DD format
      const scheduledDates = selectedDates.map((date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      });

      // Prepare session type and slots
      const sessionType =
        timeData?.type === "same_time" ? "same_time" : "custom";
      const defaultSlot = sessionType === "same_time" ? timeData?.slot : null;
      const customSlot = sessionType === "custom" ? timeData?.slots : null;

      const paymentData = {
        clientId,
        gymId,
        sessionId,
        sessionsCount: selectedDates.length,
        reward: rewardsApplied,
        sessionType,
        scheduledDates,
        defaultSlot,
        customSlot,
        trainer_id,
        is_offer_eligible: session_offer_eligible,
      };

      const result = await handleSessionPay(paymentData);

      if (result?.success || result?.verified) {
        // Reset loading state before navigation (fixes iOS modal persistence)
        setPaying(false);
        showToast({ type: "success", title: "Payment successful!" });
        router.push({
          pathname: "/client/(sessions)/bookingConfirmed",
          params: {
            ...params,
          },
        });
      } else {
        showToast({
          type: "error",
          title: result?.message || "Payment failed",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      showToast({
        type: "error",
        title: error?.message || "Payment failed",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmPay = async () => {
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
      params: { tab: "Fitness Studios", sessionFilter: "true" },
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{sessionName || "Session"}</Text>
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
                  <Text style={styles.passDetailLabel}>{getPassTitle()}</Text>
                  <Text style={styles.passDetailSubtitle}>
                    {getPassSubtitle()}
                  </Text>
                </View>
                <Text style={styles.discountedPrice}>₹{subtotal}</Text>
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
            {timeData?.type === "same_time" ? (
              // Same time for all days
              <>
                {selectedDates.map((date, index) => (
                  <View key={index} style={styles.scheduleCard}>
                    <Text style={styles.scheduleDate}>{formatDate(date)}</Text>
                    <Text style={styles.scheduleTime}>{timeData.slot}</Text>
                  </View>
                ))}
              </>
            ) : (
              // Custom time per day
              <>
                {selectedDates.map((date, index) => {
                  // Convert date to YYYY-MM-DD format to match the slots keys
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  const dateString = `${year}-${month}-${day}`;

                  const slotData = timeData?.slots?.[dateString]?.[0];
                  const slotTime = slotData?.start_time || "N/A";

                  return (
                    <View key={index} style={styles.scheduleCard}>
                      <Text style={styles.scheduleDate}>
                        {formatDate(date)}
                      </Text>
                      <Text style={styles.scheduleTime}>{slotTime}</Text>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>

        {/* Rewards Section */}
        <View style={styles.rewardsSection}>
          <View style={styles.rewardsCard}>
            <View style={styles.rewardsLeft}>
              <MaterialCommunityIcons name="gift" size={20} color="#FF5757" />
              <View style={styles.rewardsTextContainer}>
                <Text style={styles.rewardsHeading}>Rewards</Text>
                <Text style={styles.rewardsText}>
                  You can use ₹{availableRewards} Fymble Cash
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

        {/* Reward Program Opt-In Banner */}
        {!participated && (
          <View style={styles.rewardOptInWrapper}>
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
                    </Text>
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
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal}</Text>
            </View>
            {/* <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (18%)</Text>
              <Text style={styles.summaryValue}>₹{tax}</Text>
            </View> */}
            {/* {rewardsApplied && ( */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rewards Discount</Text>
              <Text style={[styles.summaryValue, styles.discountText]}>
                {rewardsApplied ? `-₹${rewardDiscount}` : 0}
              </Text>
            </View>
            {/* )} */}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>
        </View>

        {/* Savings Badge */}
        {discountPercentage > 0 && savings > 0 && (
          <View style={styles.savingsBadge}>
            <MaterialIcons name="celebration" size={16} color="#00C853" />
            <Text style={styles.savingsText}>
              You're saving {discountPercentage}% (₹{savings.toFixed(0)})!
            </Text>
          </View>
        )}

        {/* Confirm & Pay Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmPay}
            disabled={paying}
          >
            <LinearGradient
              colors={["#00C950", "#009966"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              {paying ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Confirm & Pay ₹{total.toFixed(0)}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                <MaterialIcons name="fitness-center" size={40} color="#FFF" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.eligibilityTitle}>
              You're Eligible for ₹99 Sessions!
            </Text>

            {/* Message */}
            <Text style={styles.eligibilityMessage}>
              Great news! You qualify for our special ₹99/session offer.
              However, this gym hasn't opted into the promotional program yet.
            </Text>

            {/* Info Box */}
            <View style={styles.eligibilityInfoBox}>
              <MaterialIcons name="lightbulb" size={20} color="#FF5757" />
              <Text style={styles.eligibilityInfoText}>
                You can book sessions at ₹99 at other participating gyms, or
                continue with this gym's regular pricing.
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

export default ReviewBooking;

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
    marginBottom: 20,
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
  },
  card: {
    backgroundColor: "#FFF",
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
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
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
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  scheduleDate: {
    fontSize: 13,
    color: "#333",
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
  },
  rewardsSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
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
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
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
  // Eligibility Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
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
    backgroundColor: "#F0FFF4",
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
  rewardOptInWrapper: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: "#FFF8F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE5CC",
    padding: 14,
  },
  rewardOptInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rewardOptInMid: {
    flex: 1,
  },
  rewardOptInTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
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
    borderColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  rewardOptInCheckboxChecked: {
    backgroundColor: "#FF5757",
    borderColor: "#FF5757",
  },
  rewardOptInCheckText: {
    fontSize: 12,
    color: "#555",
  },
  rewardOptInLink: {
    color: "#FF5757",
    fontWeight: "600",
  },
  rewardOptInButton: {
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardOptInButtonDisabled: {
    backgroundColor: "#FFBBBB",
  },
  rewardOptInButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  rewardOptInButtonTextDisabled: {
    color: "#FFF",
  },
});
