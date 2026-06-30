import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList as RNFlatList,
  ScrollView,
  Platform,
  Alert,
  BackHandler,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

import { Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Purchases from "react-native-purchases";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import SubscriptionComparison from "../../components/ui/Payment/SubscriptionComparison";
import PaymentMethodModal from "../../components/ui/Payment/paymentselectionmodal";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  cancelFittbotSubscription,
  getMyFittbotPlanAPI,
} from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";
import { useUser } from "../../context/UserContext";
import { isPureFreemium, isPurePremium } from "../../config/access";
import { MaskedText } from "../../components/ui/MaskedText";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const SubscriptionPage = () => {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(
    params?.selectedPlan || "12",
  ); // Default to 12 months (middle plan)
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Redirect iOS users to home
  useEffect(() => {
    if (Platform.OS === "ios") {
      router.replace("/client/home");
    }
  }, []);

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

  const getPlanData = () => {
    const planData = {
      1: {
        name: "Gold Plan",
        duration: "1 Month",
        months: 1,
        mrp: 398,
        discountedPrice: 199,
        savePercentage: 50,
        dailyRate: 6.6,
        rc_id: "$rc_monthly",
        product_rc: "one_month_plan:one-month-premium",
        product_rp: "one_month_plan:one-month-premium:rp",
      },
      12: {
        name: "Diamond Plan",
        duration: "12 Months",
        months: 12,
        mrp: 398,
        discountedPrice: 159,
        savePercentage: 60,
        dailyRate: 5.2,
        rc_id: "$rc_annual",
        product_rc: "twelve_month_plan:twelve-month-premium",
        product_rp: "twelve_month_plan:twelve-month-premium:rp",
      },
      6: {
        name: "Platinum Plan",
        duration: "6 Months",
        months: 6,
        mrp: 398,
        discountedPrice: 179,
        savePercentage: 55,
        dailyRate: 5.9,
        rc_id: "$rc_six_month",
        product_rc: "six_month_plan:six-month-premium",
        product_rp: "six_month_plan:six-month-premium:rp",
      },
    };
    return planData[selectedPlan];
  };

  const handleContinue = () => {
    setPaymentMethodModalVisible(true);
  };

  const cancelSubscription = async (subscriptionId) => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again.",
        });
        return;
      }
      const payload = {
        client_id: clientId,
        subscription_id: subscriptionId,
      };
      const response = await cancelFittbotSubscription(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Auto-renewal cancelled successfully.",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail ||
            "Error Cancelling Subscription. Please try again.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Error Cancelling Subscription. Please try again.",
      });
    } finally {
    }
  };

  const formatDateToIndian = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleCancelSubscription = () => {
    const paidSubscription = subscriptionData?.paid_subscriptions?.[0];
    if (!paidSubscription) {
      showToast({
        type: "error",
        title: "Error",
        desc: "No active subscription found.",
      });
      return;
    }

    // Show cancel modal for all providers
    setCancelModalVisible(true);
  };

  const confirmCancelSubscription = async () => {
    const paidSubscription = subscriptionData?.paid_subscriptions?.[0];
    setCancelModalVisible(false);

    // If provider is google_play, redirect to Play Store subscription page
    if (paidSubscription.provider === "google_play") {
      Linking.openURL("https://play.google.com/store/account/subscriptions");
      return;
    }

    // For razorpay or other providers, call the API
    await cancelSubscription(paidSubscription.id);
    await getPremiumStatus();
  };

  const getPremiumStatus = async () => {
    try {
      setLoading(true);
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again.",
        });
        return;
      }
      const response = await getMyFittbotPlanAPI(clientId);

      if (response?.status === 200) {
        setSubscriptionData(response?.data);
        setIsPremium(
          response?.data?.plan === "premium" ||
            response?.data?.plan === "premium_gym",
        );
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail ||
            "Error Fetching Subscription details. Please try again.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Error Fetching Subscription details. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPremiumStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.push("/client/account");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => {
        backHandler.remove();
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push("/client/account")}>
          <MaterialIcons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!isPremium ? (
            <>
              <Text style={{ color: "#FF5757", fontWeight: 600, fontSize: 16 }}>
                Fymble
              </Text>
              {/* <Text style={{ color: "#000000", fontWeight: 600, fontSize: 16 }}>
                bot
              </Text> */}
              <Text style={{ fontSize: 16 }}> Subscription Plans</Text>
            </>
          ) : (
            <Text style={{ fontSize: 16 }}>My Subscription</Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>
      {isPremium ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.premiumContent}
        >
          {/* Paid Subscriptions */}
          {(subscriptionData?.paid_subscriptions || []).map(
            (subscription, index) => (
              <View key={subscription.id} style={styles.paidSubscriptionCard}>
                <LinearGradient
                  colors={[
                    "rgba(91, 43, 155, 0.15)",
                    "rgba(255, 60, 123, 0.15)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientCard}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Image
                        source={require("../../assets/images/plans/crown.png")}
                        style={styles.crownIcon}
                      />
                      <MaskedText
                        bg1="#5B2B9B"
                        bg2="#FF3C7B"
                        text={subscription.plan_name}
                        textStyle={styles.planNameText}
                      />
                    </View>
                    <View style={styles.activeBadge}>
                      <MaterialIcons
                        name="check-circle"
                        size={14}
                        color="#FFFFFF"
                      />
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                      <MaskedText
                        bg1="rgba(0,0,0,0.62)"
                        bg2="rgba(0,0,0,0.62)"
                        text="Valid Till"
                        textStyle={styles.labelText}
                      />

                      <MaskedText
                        bg1="#5B2B9B"
                        bg2="#FF3C7B"
                        text={formatDateToIndian(subscription.active_until)}
                        textStyle={styles.labelText}
                      />
                    </View>

                    <View style={styles.infoBox}>
                      <MaterialIcons
                        name="info-outline"
                        size={16}
                        color="#666"
                      />
                      {subscription?.auto_renew ? (
                        <Text style={styles.infoText}>
                          Your plan will auto renew on{" "}
                          {formatDateToIndian(subscription.active_until)}
                        </Text>
                      ) : (
                        <Text style={styles.infoText}>
                          Auto Renewal Cancelled
                        </Text>
                      )}
                    </View>
                    {subscription?.auto_renew ? (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "center",
                        }}
                      >
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={handleCancelSubscription}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      ""
                    )}
                  </View>
                </LinearGradient>
              </View>
            ),
          )}

          {/* Cancellation & Refund Policy Disclaimer */}
          <View style={styles.policyDisclaimerContainer}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#5B2B9B"
            />
            <View style={styles.policyDisclaimerTextContainer}>
              <Text style={styles.policyDisclaimerText}>
                Subscriptions auto-renew unless canceled 24 hours before
                renewal. View our{" "}
                <Text
                  style={styles.policyLink}
                  onPress={() =>
                    Linking.openURL(
                      "https://fymble.app/cancellation-refund-policy/",
                    )
                  }
                >
                  Cancellation & Refund Policy
                </Text>
              </Text>
            </View>
          </View>

          {/* Complementary Subscriptions */}
          {subscriptionData?.complementary_plans?.length > 0 && (
            <View style={styles.complementarySection}>
              <Text style={styles.sectionTitle}>
                Complementary Subscriptions
              </Text>
              {(subscriptionData?.complementary_plans || []).map(
                (plan, index) => (
                  <View key={plan.id} style={styles.complementaryCard}>
                    <View style={styles.complementaryHeader}>
                      <Text style={styles.complementaryTitle}>
                        {plan.duration} Plan
                      </Text>
                      <View style={styles.activeBadge}>
                        <MaterialIcons
                          name="check-circle"
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.activeText}>ACTIVE</Text>
                      </View>
                    </View>
                    <View style={styles.complementaryBody}>
                      <Text style={styles.expiresText}>
                        {plan?.mode || "Gym Membership / Personal Training"}
                      </Text>
                      <Text style={styles.expiresText}>
                        Expires on: {formatDateToIndian(plan.expires_at)}
                      </Text>
                    </View>
                  </View>
                ),
              )}

              {/* Show Purchase Button if only complementary subscriptions exist */}
              {(!subscriptionData?.paid_subscriptions ||
                subscriptionData.paid_subscriptions.length === 0) && (
                <View style={styles.purchaseFittbotContainer}>
                  <View style={styles.purchaseInfoCard}>
                    <Text style={styles.purchaseInfoTitle}>
                      Upgrade to Fymble Premium
                    </Text>
                    <Text style={styles.purchaseInfoDesc}>
                      Get access to all Premium features and more.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.purchaseFittbotButton}
                    onPress={() => setIsPremium(false)}
                  >
                    <Text style={styles.purchaseFittbotButtonText}>
                      Purchase Fymble Subscription
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
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
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                Subscriptions auto-renew unless canceled 24 hours before
                renewal. View our{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() =>
                    Linking.openURL(
                      "https://fymble.app/cancellation-refund-policy/",
                    )
                  }
                >
                  Cancellation & Refund Policy
                </Text>{" "}
                . By upgrading, you agree to our{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() =>
                    Linking.openURL("https://fymble.app/terms-and-conditions/")
                  }
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() =>
                    Linking.openURL("https://fymble.app/privacy-policy/")
                  }
                >
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.supportSection}>
            <View style={styles.supportCard}>
              <Text style={styles.supportTitle}>Need Help?</Text>
              <Text style={styles.supportText}>
                Having trouble with your subscription or have questions? Our
                support team is available 24/7 to assist you.
              </Text>

              <TouchableOpacity
                onPress={() => Linking.openURL("mailto:support@fymble.app")}
              >
                <LinearGradient
                  colors={["#FFFFFF", "#FFFFFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.supportButton}
                >
                  <MaterialIcons name="email" size={18} color="#FF5757" />
                  <Text style={styles.supportButtonText}>Contact Support</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.linksContainer}>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://fymble.app/terms-and-conditions/")
                  }
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Terms & Conditions</Text>
                </TouchableOpacity>

                <View style={styles.linkDivider} />

                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL("https://fymble.app/privacy-policy/")
                  }
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </TouchableOpacity>

                <View style={styles.linkDivider} />

                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      "https://fymble.app/cancellation-refund-policy/",
                    )
                  }
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Cancellation Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <PaymentMethodModal
        visible={paymentMethodModalVisible}
        onClose={() => setPaymentMethodModalVisible(false)}
        planData={getPlanData()}
      />

      {/* Cancel Subscription Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.cancelModalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => setCancelModalVisible(false)}
          >
            <View style={styles.cancelModalBackground} />
          </TouchableWithoutFeedback>

          <View style={styles.cancelModalContainer}>
            <View style={styles.cancelModalContent}>
              {/* Icon */}
              <View style={styles.cancelIconContainer}>
                <MaterialIcons name="info-outline" size={48} color="#FF5757" />
              </View>

              {/* Title */}
              <Text style={styles.cancelModalTitle}>Cancel Auto-Renewal?</Text>

              {/* Message */}
              <Text style={styles.cancelModalMessage}>
                Are you sure you want to cancel auto-renewal?
              </Text>

              <View style={styles.cancelInfoBox}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.cancelInfoText}>
                  This will not affect your current subscription
                </Text>
              </View>

              <View style={styles.cancelInfoBox}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.cancelInfoText}>
                  Only stops automatic renewal
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.cancelModalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButtonSecondary}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={styles.cancelModalButtonTextSecondary}>
                    Keep Subscription
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelModalButtonPrimary}
                  onPress={confirmCancelSubscription}
                >
                  <Text style={styles.cancelModalButtonTextPrimary}>
                    Cancel Auto-Renewal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  supportSection: {
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
  supportCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  supportButtonText: {
    color: "#FF5757",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 14,
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  linkText: {
    fontSize: 10,
    color: "#000000",
    textDecorationLine: "underline",
  },
  linkDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#DDD",
  },

  // Plan Selection Styles
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
  selectedPlan: {},
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
  continueButton: {
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 15,
    width: "90%",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  termsContainer: {
    alignItems: "center",
    paddingHorizontal: 6,
  },
  termsText: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: "#FF5757",
    textDecorationLine: "underline",
  },
  policyDisclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(91, 43, 155, 0.08)",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(91, 43, 155, 0.2)",
  },
  policyDisclaimerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  policyDisclaimerText: {
    fontSize: 11,
    color: "#666",
    lineHeight: 16,
  },
  policyLink: {
    color: "#FF3C7B",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Premium Subscription Styles
  premiumContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 30,
  },
  paidSubscriptionCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientCard: {
    padding: 20,
    paddingHorizontal: 0,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 2,
    paddingBottom: 14,
    borderBottomColor: "#ffffff",
    paddingHorizontal: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crownIcon: {
    width: 20,
    height: 20,
  },
  planNameText: {
    fontSize: 16,
    fontWeight: "700",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#01BE2C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  cardBody: {
    gap: 16,
    paddingHorizontal: 16,
  },
  dateRow: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 43, 155, 0.08)",
    padding: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  cancelButton: {
    backgroundColor: "#FF3C7B",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 2,
    width: "40%",
  },
  cancelButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Complementary Subscription Styles
  complementarySection: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
  },
  complementaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  complementaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  complementaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  complementaryBody: {
    gap: 6,
  },
  validityLabel: {
    fontSize: 12,
    color: "#666",
  },
  expiresText: {
    fontSize: 12,
    color: "#666",
  },

  // Purchase Fittbot Subscription Styles
  purchaseFittbotContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  purchaseInfoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
  },
  purchaseInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 0,
    marginBottom: 8,
    textAlign: "center",
  },
  purchaseInfoDesc: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  purchaseFittbotButton: {
    backgroundColor: "#FF5757",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  purchaseFittbotButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // Cancel Modal Styles
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelModalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cancelModalContainer: {
    width: "85%",
    maxWidth: 400,
  },
  cancelModalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 87, 87, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  cancelModalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  cancelInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9F4",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    marginBottom: 10,
    gap: 8,
  },
  cancelInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#333",
    lineHeight: 18,
  },
  cancelModalButtons: {
    width: "100%",
    gap: 12,
    marginTop: 10,
  },
  cancelModalButtonPrimary: {
    backgroundColor: "#FF5757",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalButtonTextPrimary: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelModalButtonSecondary: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelModalButtonTextSecondary: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SubscriptionPage;
