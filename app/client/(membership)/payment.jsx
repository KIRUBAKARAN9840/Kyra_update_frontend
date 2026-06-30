import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Modal,
  TextInput,
  Linking,
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import {
  getPaymentSummaryDetail,
  rewardProgramOptInAPI,
  applyCouponCode,
} from "../../../services/clientApi";
import { useGymMembershipCheckout } from "../../../hooks/useGymMembershipCheckout";
import { showToast } from "../../../utils/Toaster";

const MembershipPayment = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const gymId = Number(params.gym_id);
  const planId = Number(params.plan_id);

  // API data
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponData, setCouponData] = useState(null); // holds full API response when applied
  const [couponApplied, setCouponApplied] = useState(false);

  // Rewards
  const [rewardsApplied, setRewardsApplied] = useState(false);

  // Payment
  const { start, busy } = useGymMembershipCheckout();
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    success: false,
    data: null,
    loading: false,
  });
  const paymentInProgress = useRef(false);

  // Reward opt-in
  const [participated, setParticipated] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        router.back();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  const fetchDetails = useCallback(async () => {
    if (!gymId || !planId) return;
    setLoading(true);
    try {
      const res = await getPaymentSummaryDetail(gymId, planId);
      if (res?.status === 200) {
        setApiData(res);
        setParticipated(res.opted_in ?? true);
      } else {
        showToast({ type: "error", title: "Failed to load pricing" });
      }
    } catch {
      showToast({ type: "error", title: "Failed to load pricing" });
    } finally {
      setLoading(false);
    }
  }, [gymId, planId]);

  useEffect(() => {
    fetchDetails();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await applyCouponCode(gymId, planId, couponCode.trim());

      if (res?.coupon_applied) {
        setCouponData(res);
        setCouponApplied(true);
        showToast({
          type: "success",
          title: res.coupon_message || "Coupon applied!",
        });
      } else {
        showToast({
          type: "error",
          title: res?.coupon_message || "Invalid or expired coupon code",
        });
      }
    } catch {
      showToast({ type: "error", title: "Failed to apply coupon" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponData(null);
    setCouponApplied(false);
    setCouponCode("");
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
        fetchDetails();
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

  const handlePayNow = async () => {
    if (paymentInProgress.current || busy) return;
    paymentInProgress.current = true;

    setPaymentModal({
      visible: true,
      success: false,
      data: null,
      loading: true,
    });

    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        setPaymentModal({
          visible: true,
          success: false,
          data: null,
          loading: false,
        });
        paymentInProgress.current = false;
        return;
      }

      const res = await start({
        gym_id: gymId,
        selectedPlan: planId.toString(),
        client_id,
        themeColor: "#22C55E",
        description: "Gym Membership Checkout",
        reward: rewardsApplied,
        coupon_code: couponApplied ? couponCode.trim() : undefined,
      });

      if (res?.ok) {
        setPaymentModal({
          visible: false,
          success: true,
          data: res?.data,
          loading: false,
        });
        router.push({
          pathname: "/client/(membership)/confirmed",
          params: {
            gymName: apiData?.gym_name || "",
            gymLogo: apiData?.gym_logo || "",
            planLabel: getDurationLabel(),
            amount: total.toString(),
          },
        });
      } else {
        setPaymentModal({
          visible: true,
          success: false,
          data: res,
          loading: false,
        });
      }
    } catch {
      setPaymentModal({
        visible: true,
        success: false,
        data: null,
        loading: false,
      });
    } finally {
      paymentInProgress.current = false;
    }
  };

  // Derived amounts — when coupon is applied, use couponData for prices
  const activeData = couponData ?? apiData;
  const subtotal = couponData
    ? couponData.amount_before_coupon
    : (apiData?.amount ?? 0);
  const couponDiscount = couponData?.coupon_discount_amount ?? 0;
  const rewardAmount = activeData?.reward_amount ?? 0;
  const rewardDiscount = rewardsApplied ? rewardAmount : 0;
  const total = Math.max(0, (activeData?.amount ?? 0) - rewardDiscount);

  // Derive plan type label from API fields
  const getPlanTypeLabel = () => {
    const planFor = apiData?.plan_for;
    const isPT = apiData?.personal_training;
    if (planFor === "buddy") return isPT ? "Buddy PT" : "Buddy";
    if (planFor === "couple") return isPT ? "Couple PT" : "Couple Membership";
    return isPT ? "Personal Training" : "Membership";
  };

  // Derive duration display
  const getDurationLabel = () => {
    const d = apiData?.duration;
    if (!d) return "";
    return `${d}M ${getPlanTypeLabel()}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Gym & Plan Card ──────────────────────────────────────────── */}
        {loading ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator size="small" color="#22C55E" />
          </View>
        ) : apiData ? (
          <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
            <View style={styles.gymRow}>
              {apiData.gym_logo ? (
                <Image
                  source={{ uri: apiData.gym_logo }}
                  style={styles.gymLogo}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.gymLogoPlaceholder}>
                  <MaterialIcons name="fitness-center" size={24} color="#888" />
                </View>
              )}
              <View style={styles.gymInfo}>
                <Text style={styles.gymName} numberOfLines={1}>
                  {apiData.gym_name}
                </Text>
                <Text style={styles.planName} numberOfLines={1}>
                  {getDurationLabel()}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Address ──────────────────────────────────────────────── */}
        {apiData?.address && (
          <TouchableOpacity
            style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}
            activeOpacity={0.7}
            onPress={() => {
              const lat = apiData.latitude;
              const lng = apiData.longitude;
              if (lat && lng) {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
                Linking.openURL(url);
              }
            }}
          >
            <View style={styles.addressRow}>
              <MaterialIcons name="location-on" size={20} color="#FF5757" />
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressTitle}>
                  {apiData.gym_name || ""}
                </Text>
                <Text style={styles.addressText}>
                  {[
                    apiData.address.door_no,
                    apiData.address.building,
                    apiData.address.street,
                    apiData.address.area,
                    apiData.address.city,
                    apiData.address.state,
                    apiData.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </View>
              <MaterialIcons name="directions" size={22} color="#007BFF" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── No Cost EMI ───────────────────────────────────────────────── */}
        {apiData?.no_cost_emi && (
          <View style={[styles.card, styles.noCostEmiCard]}>
            <Text style={styles.noCostEmiTitle}>No Cost EMI</Text>
            <Text style={styles.noCostEmiSubtitle}>
              Available on 3 &amp; 6 months tenure
            </Text>
          </View>
        )}

        {/* ── Coupon Code ──────────────────────────────────────────────── */}
        <View
          style={[
            styles.card,
            { borderWidth: 1, borderColor: couponData ? "#22C55E" : "#eee" },
          ]}
        >
          <Text style={styles.couponTitle}>Have a Coupon Code?</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[
                styles.couponInput,
                couponData && styles.couponInputApplied,
              ]}
              placeholder="Enter coupon code"
              placeholderTextColor="#AAA"
              value={couponCode}
              onChangeText={couponData ? undefined : setCouponCode}
              editable={!couponData}
              autoCapitalize="characters"
            />
            {!couponData ? (
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  (!couponCode.trim() || couponLoading) &&
                    styles.applyBtnDisabled,
                ]}
                onPressIn={() => handleApplyCoupon()}
                disabled={!couponCode.trim() || couponLoading}
              >
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text
                    style={[
                      styles.applyBtnText,
                      !couponCode.trim() && styles.applyBtnTextDisabled,
                    ]}
                  >
                    Apply
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={handleRemoveCoupon}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
                <MaterialIcons name="close" size={15} color="#FF5757" />
              </TouchableOpacity>
            )}
          </View>
          {couponData && (
            <Text style={styles.couponSuccessMsg}>
              {couponData.coupon_message}
            </Text>
          )}
        </View>

        {/* ── Rewards ──────────────────────────────────────────────────── */}
        <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
          <View style={styles.rewardsRow}>
            <View style={styles.rewardsLeft}>
              <MaterialCommunityIcons name="gift" size={20} color="#FF5757" />
              <View>
                <Text style={styles.rewardsTitle}>Rewards</Text>
                <Text style={styles.rewardsSubtitle}>
                  {rewardAmount > 0
                    ? `You have ₹${rewardAmount} Fymble Cash`
                    : "You Don't Have Fymble Cash"}
                </Text>
              </View>
            </View>
            {!rewardsApplied ? (
              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  rewardAmount === 0 && styles.applyBtnDisabled,
                ]}
                onPress={() => rewardAmount > 0 && setRewardsApplied(true)}
                disabled={rewardAmount === 0}
              >
                <Text
                  style={[
                    styles.applyBtnText,
                    rewardAmount === 0 && styles.applyBtnTextDisabled,
                  ]}
                >
                  Apply
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setRewardsApplied(false)}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
                <MaterialIcons name="close" size={15} color="#FF5757" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Mega Reward Opt-In ────────────────────────────────────────── */}
        {!participated && (
          <View style={styles.rewardOptInWrapper}>
            <View style={styles.rewardOptInRow}>
              <View style={styles.rewardOptInMid}>
                <Text style={styles.rewardOptInTitle}>
                  Join Fymble Mega Fitness Rewards
                </Text>
                <Text style={styles.rewardOptInDesc}>
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

        {/* ── Payment Summary ───────────────────────────────────────────── */}
        <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#22C55E"
              style={{ marginVertical: 10 }}
            />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal}</Text>
              </View>
              {couponData && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Coupon ({couponData.coupon_discount_percent}% off)
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#22C55E" }]}>
                    -{`₹${couponDiscount}`}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rewards</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    rewardDiscount > 0 && { color: "#4CAF50" },
                  ]}
                >
                  {rewardDiscount > 0 ? `-₹${rewardDiscount}` : `₹0`}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Checkout Bar ─────────────────────────────────────────────── */}
      <View
        style={[styles.checkoutWrapper, { paddingBottom: insets.bottom + 10 }]}
      >
        <View style={styles.checkoutRow}>
          <View style={styles.checkoutPriceBox}>
            {loading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <>
                <Text style={styles.checkoutPayLabel}>To pay</Text>
                <Text style={styles.checkoutPayAmount}>₹{total}</Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutBtnWrap,
              (loading || busy || !apiData) && styles.checkoutBtnDisabled,
            ]}
            disabled={loading || busy || !apiData}
            activeOpacity={0.85}
            onPress={handlePayNow}
          >
            <Text style={styles.checkoutText}>Proceed to Pay</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Payment Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={paymentModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {paymentModal.loading ? (
              <>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.modalLoadingText}>Processing payment…</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="error" size={56} color="#FF5757" />
                <Text style={styles.modalFailTitle}>Payment Failed</Text>
                <Text style={styles.modalFailMsg}>
                  Payment not received. Please try again or contact support if
                  the issue persists.
                </Text>
                <View style={styles.modalBtns}>
                  <TouchableOpacity
                    style={styles.modalRetryBtn}
                    onPress={() =>
                      setPaymentModal({
                        visible: false,
                        success: false,
                        data: null,
                        loading: false,
                      })
                    }
                  >
                    <Text style={styles.modalRetryText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() =>
                      setPaymentModal({
                        visible: false,
                        success: false,
                        data: null,
                        loading: false,
                      })
                    }
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MembershipPayment;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1A1A1A" },

  scroll: { paddingHorizontal: 8, paddingTop: 14 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
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
  loadingCard: {
    alignItems: "center",
    paddingVertical: 24,
  },

  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gymLogo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  gymLogoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  planName: { fontSize: 14, color: "#E6A817", fontWeight: "500", marginTop: 2 },

  // Address
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addressTextWrap: { flex: 1 },
  addressTitle: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  addressText: { fontSize: 12, color: "#666", marginTop: 2, lineHeight: 17 },

  // Coupon
  couponTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  couponInputApplied: { borderColor: "#22C55E", backgroundColor: "#F0FFF4" },
  couponSuccessMsg: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "500",
    marginTop: 8,
  },

  // Rewards
  rewardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rewardsLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rewardsTitle: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  rewardsSubtitle: { fontSize: 11, color: "#888", marginTop: 2 },
  applyBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  applyBtnDisabled: { backgroundColor: "#F5F5F5" },
  applyBtnText: { fontSize: 13, fontWeight: "500", color: "#FFF" },
  applyBtnTextDisabled: { color: "#AAA" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  removeBtnText: { fontSize: 12, color: "#FF5757" },

  // Reward Opt-In
  rewardOptInWrapper: {
    marginBottom: 14,
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
  rewardOptInMid: { flex: 1 },
  rewardOptInTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CC2222",
    marginBottom: 4,
  },
  rewardOptInDesc: {
    color: "#827878",
    fontSize: 12,
    marginBottom: 6,
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
  rewardOptInButtonDisabled: { backgroundColor: "#DDD" },
  rewardOptInButtonText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  rewardOptInButtonTextDisabled: { color: "#AAA" },

  // Payment Summary
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, color: "#555" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 6,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  totalValue: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },

  // Bottom bar
  checkoutWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  checkoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutPriceBox: { flex: 1, marginRight: 12 },
  checkoutPayLabel: { fontSize: 11, color: "#888", fontWeight: "400" },
  checkoutPayAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 2,
  },
  checkoutBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  checkoutBtnDisabled: { backgroundColor: "#CCC" },
  checkoutText: { color: "#FFF", fontSize: 15, fontWeight: "600" },

  // Payment modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  modalFailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 8,
  },
  modalFailMsg: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalRetryBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalRetryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600", fontSize: 14 },
});
