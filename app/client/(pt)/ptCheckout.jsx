import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getPTBookingDataAPI,
  rewardProgramOptInAPI,
} from "../../../services/clientApi";
import { handlePay } from "../../../components/ui/Payment/sessionpayfn";
import { showToast } from "../../../utils/Toaster";
import { resetPtListCache } from "./listtrainers";

const PTCheckout = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const gymId = Number(params.gymId);
  const trainerId = Number(params.trainerId);
  const scheduleId = Number(params.scheduleId);
  const gymName = params.gymName || "";
  const slotTime = params.slotTime || "";
  const selectedDates = params.selectedDates
    ? JSON.parse(params.selectedDates)
    : [];

  // API data
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState(null);

  // Rewards
  const [rewardAmount, setRewardAmount] = useState(0);
  const [rewardsApplied, setRewardsApplied] = useState(false);

  // Payment modal
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
    if (!gymId || !trainerId || !scheduleId || selectedDates.length === 0)
      return;
    setLoading(true);
    try {
      const res = await getPTBookingDataAPI(
        gymId,
        trainerId,
        scheduleId,
        selectedDates,
      );
      if (res?.status === 200) {
        setApiData(res);
        setRewardAmount(res.reward_amount ?? 0);
        setParticipated(res.opted_in ?? true);
      } else {
        showToast({ type: "error", title: "Failed to load pricing" });
      }
    } catch {
      showToast({ type: "error", title: "Failed to load pricing" });
    } finally {
      setLoading(false);
    }
  }, [gymId, trainerId, scheduleId, selectedDates]);

  useEffect(() => {
    fetchDetails();
  }, []);

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
    if (paymentInProgress.current) return;
    paymentInProgress.current = true;

    setPaymentModal({
      visible: true,
      success: false,
      data: null,
      loading: true,
    });

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        setPaymentModal({
          visible: true,
          success: false,
          data: null,
          loading: false,
        });
        paymentInProgress.current = false;
        return;
      }

      const isOfferEligible =
        apiData?.billing_lines?.some((line) => line.type === "user_offer") ??
        false;

      const scheduledDates = selectedDates.map((iso) => iso);

      const result = await handlePay({
        clientId,
        gymId,
        sessionId: 2,
        sessionsCount: selectedDates.length,
        reward: rewardsApplied,
        sessionType: "same_time",
        scheduledDates,
        schedule_id: scheduleId,
        customSlot: null,
        trainer_id: trainerId,
        is_offer_eligible: isOfferEligible,
      });

      if (result?.success || result?.verified) {
        resetPtListCache();
        setPaymentModal({
          visible: false,
          success: true,
          data: null,
          loading: false,
        });
        router.push({
          pathname: "/client/(sessions)/bookingConfirmed",
          params: {
            gymId,
            gymName,
            sessionId: 2,
            sessionName: apiData?.session_name || "Personal Training",
            scheduleId,
            selectedDates: JSON.stringify(selectedDates),
            timeData: JSON.stringify({ type: "same_time", slot: displaySlot }),
          },
        });
      } else {
        setPaymentModal({
          visible: true,
          success: false,
          data: result,
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

  // ── Derived values ────────────────────────────────────────────────────────────
  const subtotal = apiData?.total_amount ?? 0;
  const rewardDiscount = rewardsApplied ? rewardAmount : 0;
  const total = Math.max(0, subtotal - rewardDiscount);
  const billingLines = apiData?.billing_lines ?? [];

  const slotDetail = apiData?.slot;
  const displaySlot = slotDetail
    ? `${slotDetail.start_time} – ${slotDetail.end_time}`
    : slotTime;

  const trainer = apiData?.trainer;

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_SHORT = [
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
  const formatDateChip = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return `${DAY_LABELS[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {gymName || "Checkout"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Trainer Details ─────────────────────────────────────────── */}
        <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
          <Text style={styles.cardTitle}>Trainer</Text>
          {loading && !trainer ? (
            <ActivityIndicator
              size="small"
              color="#FF5757"
              style={{ marginTop: 10 }}
            />
          ) : trainer ? (
            <View style={styles.trainerRow}>
              <View style={styles.trainerAvatar}>
                {trainer.profile_image ? (
                  <Image
                    source={{ uri: trainer.profile_image }}
                    style={styles.trainerAvatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.trainerAvatarFallback}>
                    <Ionicons name="person" size={22} color="#AAAAAA" />
                  </View>
                )}
              </View>
              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName}>{trainer.name}</Text>
                {trainer.experience != null && (
                  <Text style={styles.trainerExp}>
                    {trainer.experience} yrs experience
                  </Text>
                )}
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Selected Sessions ──────────────────────────────────────── */}
        <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Selected Sessions</Text>
            <Text style={styles.gymNameRight} numberOfLines={1}>
              {gymName}
            </Text>
          </View>
          {selectedDates.map((iso, i) => (
            <View key={i} style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>
                {apiData?.session_name || "Personal Training"} ·{" "}
                {formatDateChip(iso)}
              </Text>
              <Text style={styles.sessionDay}>Day {i + 1}</Text>
            </View>
          ))}
        </View>

        {/* ── Selected Slot ──────────────────────────────────────────── */}
        {displaySlot ? (
          <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
            <View style={styles.slotRow}>
              <MaterialIcons name="schedule" size={16} color="#555" />
              <Text style={styles.slotLabel}>Slot</Text>
              <View style={styles.slotDivider} />
              <Text style={styles.slotTime}>{displaySlot}</Text>
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
                  {apiData.gym_name || gymName}
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

        {/* ── Rewards ────────────────────────────────────────────────── */}
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

        {/* ── Mega Reward Opt-In ─────────────────────────────────────── */}
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

        {/* ── Payment Summary ────────────────────────────────────────── */}
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
              {billingLines.length > 0 ? (
                billingLines.map((line, i) => {
                  let label = "";
                  if (line.type === "user_offer") {
                    label = `${line.days} day${line.days > 1 ? "s" : ""} × ₹${line.price_per_day} (Intro Offer)`;
                  } else {
                    label = `${line.days} day${line.days > 1 ? "s" : ""} × ₹${line.price_per_day}`;
                  }
                  return (
                    <View key={i} style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>{label}</Text>
                      <Text style={styles.summaryValue}>₹{line.amount}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>₹{subtotal}</Text>
                </View>
              )}

              {rewardsApplied && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Rewards Discount</Text>
                  <Text style={[styles.summaryValue, { color: "#4CAF50" }]}>
                    -₹{rewardDiscount}
                  </Text>
                </View>
              )}
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
              (loading || paymentModal.loading || !apiData) &&
                styles.checkoutBtnDisabled,
            ]}
            disabled={loading || paymentModal.loading || !apiData}
            activeOpacity={0.85}
            onPress={handlePayNow}
          >
            <Text style={styles.checkoutText}>Pay Now</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Payment Modal ──────────────────────────────────────────────────── */}
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
            ) : paymentModal.success ? null : (
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

export default PTCheckout;

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
  headerTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },

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

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  gymNameRight: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
    flexShrink: 1,
    marginLeft: 8,
  },

  // Trainer card
  trainerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  trainerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  trainerAvatarImg: { width: "100%", height: "100%" },
  trainerAvatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerInfo: { flex: 1 },
  trainerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  trainerExp: { fontSize: 12, color: "#6B7280" },

  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  sessionLabel: { fontSize: 13, color: "#333" },
  sessionDay: { fontSize: 12, color: "#888", fontWeight: "500" },

  slotRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  slotLabel: { fontSize: 12, fontWeight: "600", color: "#555" },
  slotDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#DDD",
    marginHorizontal: 2,
  },
  slotTime: { fontSize: 13, color: "#007BFF", fontWeight: "600" },

  // Address
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addressTextWrap: { flex: 1 },
  addressTitle: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  addressText: { fontSize: 12, color: "#666", marginTop: 2, lineHeight: 17 },

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

  rewardOptInWrapper: {
    marginBottom: 14,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFD5D5",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rewardOptInRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rewardOptInMid: { flex: 1 },
  rewardOptInTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CC2222",
    marginBottom: 4,
  },
  rewardOptInDesc: { color: "#827878", fontSize: 12, marginBottom: 6 },
  rewardOptInCheckRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 13, color: "#555" },
  summaryValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 6 },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  totalValue: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },

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
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
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
