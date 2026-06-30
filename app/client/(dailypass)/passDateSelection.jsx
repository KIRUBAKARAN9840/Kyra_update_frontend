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
} from "react-native";
import { useState, useCallback, useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDailyPassDetails,
  rewardProgramOptInAPI,
  applyDailyPassCoupon,
  redeemDailyPassPromo,
} from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import handlePay from "../../../components/ui/Payment/passpayfn";

const formatGymTimings = (timings) => {
  if (!timings || !Array.isArray(timings) || timings.length === 0) return [];
  return timings
    .filter((t) => t?.startTime && t?.endTime)
    .map((timing) => {
      try {
        const startTime = new Date(timing.startTime).toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          },
        );
        const endTime = new Date(timing.endTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const dayLabel = timing?.day || timing?.days || "Daily";
        const formattedDay =
          dayLabel && typeof dayLabel === "string" && dayLabel.length > 0
            ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1).toLowerCase()
            : "Daily";
        return `${formattedDay} ${startTime} - ${endTime}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const todayDate = new Date();
todayDate.setHours(0, 0, 0, 0);

const toKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const todayKey = toKey(todayDate);

const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

const PassDateSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const gymId = params?.gymId ? Number(params.gymId) : null;

  // Gym / pass details from API
  const [gymName, setGymName] = useState("");
  const [operatingHours, setOperatingHours] = useState([]);
  const [timingsExpanded, setTimingsExpanded] = useState(false);

  // Pricing from API
  const [dailyPassPrice, setDailyPassPrice] = useState(null);
  const [totalAmount, setTotalAmount] = useState(null);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [participated, setParticipated] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(false);
  const [billingLines, setBillingLines] = useState([]);
  const [showModalSelf, setShowModalSelf] = useState(false);
  const [showModalFriend, setShowModalFriend] = useState(false);

  // Calendar state — today pre-selected
  const [calYear, setCalYear] = useState(todayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(todayDate.getMonth());
  const [selectedDates, setSelectedDates] = useState([new Date(todayDate)]);

  // Group pass
  const [groupCount, setGroupCount] = useState(0);

  // Rewards
  const [rewardsApplied, setRewardsApplied] = useState(false);

  // Reward opt-in
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [optInLoading, setOptInLoading] = useState(false);

  // Coupon code
  const [showCouponCode, setShowCouponCode] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");

  // Payment modal
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    success: false,
    data: null,
    loading: false,
  });
  const paymentInProgress = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        router.back();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // Fetch details whenever selectedDates or groupCount changes
  useEffect(() => {
    if (!gymId) return;
    const numberOfDays = selectedDates.length;
    fetchDetails(numberOfDays, groupCount);
  }, [gymId, selectedDates, groupCount]);

  const fetchDetails = async (number_of_days, group_count = 0) => {
    setLoadingDetails(true);
    try {
      const res = await getDailyPassDetails(gymId, number_of_days, group_count);
      if (res?.status === 200) {
        if (res.gym_name) setGymName(res.gym_name);
        if (res.operating_hours) setOperatingHours(res.operating_hours);
        setDailyPassPrice(res.dailypass_price ?? null);
        setTotalAmount(res.total_amount ?? null);
        setBillingLines(res.billing_lines ?? []);
        setShowModalSelf(res.show_modal_self ?? false);
        setShowModalFriend(res.show_modal_friend ?? false);
        setRewardAmount(res.reward_amount ?? 0);
        setParticipated(res.opted_in ?? true);
        setShowCouponCode(res.show_coupon_code ?? false);
        setDetailsError(false);
      } else {
        setDetailsError(true);
      }
    } catch (_) {
      setDetailsError(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Also fetch gym name/timings on mount (without number_of_days)
  useEffect(() => {
    if (!gymId) return;
    fetchDetails(1);
  }, [gymId]);

  // Cleanup: Close payment modal on unmount (fixes iOS modal persistence issue)
  useEffect(() => {
    return () => {
      setPaymentModal({
        visible: false,
        success: false,
        data: null,
        loading: false,
      });
    };
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
        // Re-fetch to get updated reward_amount
        const numberOfDays = selectedDates.length;
        fetchDetails(numberOfDays, groupCount);
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

  // ─── Coupon code ─────────────────────────────────────────────────────────────
  const isCouponEligible = showCouponCode && selectedDates.length === 1;
  const isCouponFlowActive = isCouponEligible && couponApplied;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await applyDailyPassCoupon(couponCode.trim());
      if (res?.status === 200 && res?.valid) {
        setCouponApplied(true);
        setCouponMessage(res?.message || "Coupon applied successfully");
        setGroupCount(0);
        setRewardsApplied(false);
        showToast({
          type: "success",
          title: res?.message || "Coupon applied!",
        });
      } else {
        showToast({
          type: "error",
          title: res?.message || "Invalid coupon code",
        });
      }
    } catch {
      showToast({ type: "error", title: "Failed to apply coupon" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponCode("");
    setCouponMessage("");
  };

  // Auto-remove coupon if dates change to more than 1
  useEffect(() => {
    if (couponApplied && selectedDates.length !== 1) {
      handleRemoveCoupon();
    }
  }, [selectedDates.length]);

  // ─── Redeem promo (coupon checkout) ─────────────────────────────────────────
  const handleRedeemPromo = async () => {
    if (paymentInProgress.current) return;
    if (!selectedDates.length || !couponCode.trim()) return;
    paymentInProgress.current = true;

    setPaymentModal({
      visible: true,
      success: false,
      data: null,
      loading: true,
    });

    try {
      const dateObj = selectedDates[0];
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const selectedDate = `${yyyy}-${mm}-${dd}`;

      const res = await redeemDailyPassPromo(
        couponCode.trim(),
        Number(gymId),
        selectedDate,
      );

      if (res?.success || res?.daily_pass_activated) {
        setPaymentModal({
          visible: false,
          success: true,
          data: null,
          loading: false,
        });
        router.push({
          pathname: "/client/allpass",
          params: {
            review: "true",
          },
        });
      } else {
        showToast({
          type: "error",
          title: res?.detail || res?.message || "Failed to redeem promo code",
        });
        setPaymentModal({
          visible: false,
          success: false,
          data: null,
          loading: false,
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Something went wrong. Please try again.",
      });
      setPaymentModal({
        visible: false,
        success: false,
        data: null,
        loading: false,
      });
    } finally {
      paymentInProgress.current = false;
    }
  };

  // ─── Calendar nav ────────────────────────────────────────────────────────────
  const isCurrentMonth =
    calYear === todayDate.getFullYear() && calMonth === todayDate.getMonth();
  const nextMonthVal = todayDate.getMonth() + 1;
  const maxYear =
    nextMonthVal > 11 ? todayDate.getFullYear() + 1 : todayDate.getFullYear();
  const maxMonthNorm = nextMonthVal > 11 ? nextMonthVal - 12 : nextMonthVal;
  const isAtMax = calYear === maxYear && calMonth === maxMonthNorm;

  const goPrev = () => {
    if (isCurrentMonth) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };

  const goNext = () => {
    if (isAtMax) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  // ─── Date toggle ─────────────────────────────────────────────────────────────
  const toggleDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < todayDate) return;
    const key = toKey(d);
    setSelectedDates((prev) => {
      const exists = prev.find((x) => toKey(x) === key);
      if (exists) return prev.filter((x) => toKey(x) !== key);
      return [...prev, d].sort((a, b) => a - b);
    });
  };

  const isSelected = (date) =>
    date && selectedDates.some((x) => toKey(x) === toKey(date));
  const isPast = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < todayDate;
  };
  const isToday = (date) => date && toKey(date) === todayKey;

  const cells = buildMonthGrid(calYear, calMonth);

  // ─── Group pass ──────────────────────────────────────────────────────────────
  const incrementGroup = () => setGroupCount((c) => c + 1);
  const decrementGroup = () => setGroupCount((c) => Math.max(0, c - 1));

  // ─── Derived amounts ─────────────────────────────────────────────────────────
  const subtotal = totalAmount ?? 0;
  const rewardDiscount = rewardsApplied ? rewardAmount : 0;
  const total = Math.round((subtotal - rewardDiscount) * 100) / 100;

  // ─── Checkout ────────────────────────────────────────────────────────────────
  const canCheckout =
    selectedDates.length > 0 && !detailsError && !loadingDetails;

  const proceedWithPayment = async () => {
    if (paymentInProgress.current) return;
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

      const formatDate = (d) => {
        const date = new Date(d);
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${yyyy}-${mm}-${dd}`;
      };

      const sortedDates = [...selectedDates].sort((a, b) => a - b);

      const payload = {
        gymId: Number(gymId),
        clientId: String(client_id),
        dates: sortedDates.map(formatDate),
        numberOfUsers: groupCount + 1,
        reward: rewardsApplied,
        packSize: 1,
      };

      const response = await handlePay(payload);

      if (response?.success) {
        const startDateStr = formatDate(sortedDates[0]);
        const endDateStr = formatDate(sortedDates[sortedDates.length - 1]);
        setPaymentModal({
          visible: false,
          success: true,
          data: null,
          loading: false,
        });
        router.push({
          pathname: "/client/passConfirmed",
          params: {
            gymName,
            days: String(Math.max(selectedDates.length, 1)),
            startDate: startDateStr,
            endDate: endDateStr,
            selectedDates: JSON.stringify(sortedDates.map(formatDate)),
            groupCount: String(groupCount),
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
    } catch (e) {
      console.error("Payment error:", e);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {gymName || "Daily Pass"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Available Timings ────────────────────────────────────── */}
        {(() => {
          const fmtTimings = formatGymTimings(operatingHours);
          if (fmtTimings.length === 0) return null;
          return (
            <View style={[styles.card, styles.timingsInlineCard]}>
              <View style={styles.timingsInlineLeft}>
                <MaterialIcons name="schedule" size={15} color="#555" />
                <Text style={styles.timingsInlineLabel}>Timings</Text>
                <View style={styles.timingsInlineDivider} />
                <View style={styles.timingsInlineItem}>
                  <Text style={styles.timingsInlineTime}>{fmtTimings[0]}</Text>
                </View>
                {timingsExpanded &&
                  fmtTimings.slice(1).map((t, i) => (
                    <View key={i} style={styles.timingsInlineItem}>
                      <Text style={styles.timingsInlineSep}>·</Text>
                      <Text style={styles.timingsInlineTime}>{t}</Text>
                    </View>
                  ))}
              </View>
              {fmtTimings.length > 1 && (
                <TouchableOpacity
                  onPress={() => setTimingsExpanded((v) => !v)}
                  style={styles.timingsToggleBtn}
                >
                  <MaterialIcons
                    name={timingsExpanded ? "expand-less" : "expand-more"}
                    size={22}
                    color="#007BFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* ── Calendar Card ─────────────────────────────────────────── */}
        <View style={[styles.card, { paddingBottom: 0 }]}>
          <View style={styles.calHeader}>
            <TouchableOpacity
              onPress={goPrev}
              disabled={isCurrentMonth}
              style={styles.navBtn}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={isCurrentMonth ? "#CCC" : "#007AFF"}
              />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[calMonth]} {calYear}
            </Text>
            <TouchableOpacity
              onPress={goNext}
              disabled={isAtMax}
              style={styles.navBtn}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={isAtMax ? "#CCC" : "#007AFF"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.dayRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.dayLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={`empty-${i}`} style={styles.cell} />;
              const selected = isSelected(date);
              const past = isPast(date);
              const todayCell = isToday(date);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.cell}
                  onPress={() => toggleDate(date)}
                  disabled={past}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dateCircle,
                      selected && styles.dateCircleSelected,
                      !selected && todayCell && styles.dateCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        selected && styles.dateTextSelected,
                        !selected && todayCell && styles.dateTextToday,
                        past && styles.dateTextPast,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Intro Offer Banner ────────────────────────────────────── */}
        {!loadingDetails &&
          (showModalSelf || showModalFriend) &&
          billingLines.length > 0 && (
            <View style={styles.offerBanner}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={15}
                color="#7C3AED"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.offerBannerTitle}>
                  Intro Offer Applied 🎉
                </Text>
                {billingLines.map((line, i) => {
                  if (line.type === "user_offer") {
                    return (
                      <Text key={i} style={styles.offerBannerLine}>
                        • You: {line.days} day{line.days > 1 ? "s" : ""} @ ₹
                        {line.price_per_day}/day = ₹{line.amount}
                      </Text>
                    );
                  }
                  if (line.type === "user_actual" && showModalSelf) {
                    return (
                      <Text key={i} style={styles.offerBannerLine}>
                        • You: {line.days} day{line.days > 1 ? "s" : ""} @ ₹
                        {line.price_per_day}/day(Actual price) = ₹{line.amount}
                      </Text>
                    );
                  }
                  if (line.type === "friend" && showModalFriend) {
                    return (
                      <Text key={i} style={styles.offerBannerLine}>
                        • {line.count} Friend{line.count > 1 ? "s" : ""}:{" "}
                        {line.days} day{line.days > 1 ? "s" : ""} @ ₹
                        {line.price_per_day}/day(Actual price) = ₹{line.amount}
                      </Text>
                    );
                  }
                  return null;
                })}
              </View>
            </View>
          )}

        {/* ── Coupon Code ──────────────────────────────────────────── */}
        {isCouponEligible && (
          <View
            style={[
              styles.card,
              {
                borderWidth: 1,
                borderColor: couponApplied ? "#22C55E" : "#eee",
              },
            ]}
          >
            <Text style={styles.cardTitle}>Have a Coupon Code?</Text>
            <View style={styles.couponRow}>
              <TextInput
                style={[
                  styles.couponInput,
                  couponApplied && styles.couponInputApplied,
                ]}
                placeholder="Enter coupon code"
                placeholderTextColor="#AAA"
                value={couponCode}
                onChangeText={couponApplied ? undefined : setCouponCode}
                editable={!couponApplied}
                autoCapitalize="characters"
              />
              {!couponApplied ? (
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    (!couponCode.trim() || couponLoading) &&
                      styles.applyBtnDisabled,
                  ]}
                  onPress={handleApplyCoupon}
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
            {couponApplied && couponMessage ? (
              <Text style={styles.couponSuccessMsg}>{couponMessage}</Text>
            ) : null}
          </View>
        )}

        {/* ── Group Pass ────────────────────────────────────────────── */}
        {!isCouponFlowActive && (
          <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
            <Text style={styles.cardTitle}>Group Pass</Text>
            <View style={styles.groupPill}>
              <View style={styles.groupLabelPill}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={18}
                  color="#555"
                />
                <Text style={styles.groupLabel}>Book for your friends too</Text>
              </View>
              <View style={styles.groupCounter}>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    groupCount === 0 && styles.counterBtnDisabled,
                  ]}
                  onPress={decrementGroup}
                  disabled={groupCount === 0}
                >
                  <MaterialIcons
                    name="remove"
                    size={18}
                    color={groupCount === 0 ? "#CCC" : "#333"}
                  />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{groupCount}</Text>
                <TouchableOpacity
                  style={styles.counterBtnPlus}
                  onPress={incrementGroup}
                >
                  <MaterialIcons name="add" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
            {groupCount > 0 && dailyPassPrice !== null && (
              <Text style={styles.groupHint}>
                {groupCount} friend{groupCount > 1 ? "s" : ""} added · ₹
                {dailyPassPrice} /day
              </Text>
            )}
          </View>
        )}

        {/* ── Rewards ───────────────────────────────────────────────── */}
        {!isCouponFlowActive && (
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
        )}

        {/* ── Reward Program Opt-In ─────────────────────────────────── */}
        {!isCouponFlowActive && !participated && (
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

        {/* ── Selected Dates ────────────────────────────────────────── */}
        {selectedDates.length > 0 && (
          <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
            <Text style={styles.cardTitle}>Selected Dates</Text>
            <View style={styles.selectedDatesWrap}>
              {selectedDates.map((d, i) => (
                <View key={i} style={styles.dateChip}>
                  <Text style={styles.dateChipText}>
                    {DAY_LABELS[d.getDay()]},{" "}
                    {MONTH_NAMES[d.getMonth()].slice(0, 3)} {d.getDate()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Payment Summary ───────────────────────────────────────── */}
        {canCheckout && (
          <View style={[styles.card, { borderWidth: 1, borderColor: "#eee" }]}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            {loadingDetails ? (
              <ActivityIndicator
                size="small"
                color="#22C55E"
                style={{ marginVertical: 10 }}
              />
            ) : isCouponFlowActive ? (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Daily Pass (1 day)</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { textDecorationLine: "line-through", color: "#999" },
                    ]}
                  >
                    ₹{subtotal}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: "#4CAF50" }]}>
                    Coupon Discount
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#4CAF50" }]}>
                    -₹{subtotal}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={[styles.totalValue, { color: "#22C55E" }]}>
                    ₹0
                  </Text>
                </View>
              </>
            ) : (
              <>
                {billingLines.length > 0 ? (
                  billingLines.map((line, i) => {
                    let label = "";
                    if (line.type === "user_offer") {
                      label = `${line.days} day${line.days > 1 ? "s" : ""} × ₹${line.price_per_day} (Intro Offer)`;
                    } else if (line.type === "user_actual") {
                      label = `${line.days} day${line.days > 1 ? "s" : ""} × ₹${line.price_per_day}${showModalSelf || showModalFriend ? "(Actual daily pass price)" : ""}`;
                    } else if (line.type === "friend") {
                      label = `${line.count} Friend${line.count > 1 ? "s" : ""} · ${line.days} day${line.days > 1 ? "s" : ""} × ₹${line.price_per_day}${showModalSelf || showModalFriend ? "(Actual daily pass price)" : ""}`;
                    }
                    const isActual =
                      line.type === "user_actual" || line.type === "friend";
                    const showActualNote =
                      isActual && (showModalSelf || showModalFriend);
                    const baseLabel = showActualNote
                      ? label.replace("(Actual daily pass price)", "").trimEnd()
                      : label;
                    return (
                      <View key={i} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          {baseLabel}
                          {showActualNote && (
                            <Text style={{ fontSize: 10, color: "#666" }}>
                              {" "}
                              (Actual daily pass price)
                            </Text>
                          )}
                        </Text>
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
        )}
      </ScrollView>

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
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
                {paymentModal.data?.orderId && (
                  <View style={styles.modalOrderRow}>
                    <Text style={styles.modalOrderLabel}>Order ID: </Text>
                    <Text style={styles.modalOrderId}>
                      {paymentModal.data.orderId}
                    </Text>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color="#007BFF"
                      onPress={async () => {
                        const Clipboard = await import("expo-clipboard");
                        await Clipboard.setStringAsync(
                          paymentModal.data.orderId,
                        );
                        showToast({
                          type: "success",
                          title: "Copied",
                          desc: "Order ID copied",
                        });
                      }}
                    />
                  </View>
                )}
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

      {/* ── Checkout Bar ──────────────────────────────────────────────────── */}
      <View
        style={[styles.checkoutWrapper, { paddingBottom: insets.bottom + 10 }]}
      >
        <View style={styles.checkoutRow}>
          <View style={styles.checkoutPriceBox}>
            {loadingDetails ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : canCheckout ? (
              <>
                <Text style={styles.checkoutPayLabel}>To pay</Text>
                <Text style={styles.checkoutPayAmount}>
                  {isCouponFlowActive ? "₹0" : `₹${total}`}
                </Text>
              </>
            ) : (
              <Text style={styles.checkoutSelectDayText}>
                Select at least one day
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={
              isCouponFlowActive ? handleRedeemPromo : proceedWithPayment
            }
            disabled={!canCheckout}
            activeOpacity={0.85}
            style={[
              styles.checkoutBtnWrap,
              !canCheckout && styles.checkoutBtnDisabled,
            ]}
          >
            <Text style={styles.checkoutText}>
              {isCouponFlowActive ? "Confirm" : "Proceed to Checkout"}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default PassDateSelection;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#1A1A1A" },
  navBtn: { padding: 4 },

  scroll: { paddingHorizontal: 8, paddingTop: 14, paddingBottom: 8 },

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
    paddingBottom: 10,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 10,
  },

  // Calendar
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  monthLabel: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  dayRow: { flexDirection: "row", marginBottom: 0 },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontWeight: "500",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  dateCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  dateCircleSelected: { backgroundColor: "#22C55E", borderRadius: 20 },
  dateCircleToday: { borderWidth: 1.5, borderColor: "#22C55E" },
  dateText: { fontSize: 13, color: "#1A1A1A", fontWeight: "400" },
  dateTextSelected: { color: "#FFF", fontWeight: "700" },
  dateTextToday: { color: "#22C55E", fontWeight: "700" },
  dateTextPast: { color: "#CCCCCC" },

  // Selected dates
  selectedDatesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateChip: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dateChipText: { fontSize: 12, color: "#0000009d", fontWeight: "600" },

  // Timings — compact inline row
  timingsInlineCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  timingsInlineLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  timingsInlineLabel: { fontSize: 12, fontWeight: "600", color: "#555" },
  timingsInlineDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#DDD",
    marginHorizontal: 2,
  },
  timingsInlineItem: { flexDirection: "row", alignItems: "center" },
  timingsInlineSep: { fontSize: 12, color: "#BBB", marginRight: 6 },
  timingsInlineDay: { fontSize: 11, color: "#666" },
  timingsInlineTime: { fontSize: 11, color: "#007BFF", fontWeight: "500" },
  timingsToggleBtn: { marginLeft: 2 },

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

  // Reward Program Opt-In
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

  // Group pass
  groupPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupLabelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  groupLabel: { fontSize: 13, color: "#444" },
  groupCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F2F2",
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
  },
  counterBtnDisabled: { backgroundColor: "#EBEBEB" },
  counterBtnPlus: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    minWidth: 20,
    textAlign: "center",
  },
  groupHint: { fontSize: 11, color: "#888", marginTop: 8 },

  // Intro offer banner
  offerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3EEFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  offerBannerText: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "500",
    flex: 1,
  },
  offerBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 3,
  },
  offerBannerLine: {
    fontSize: 11,
    color: "#6D28D9",
    lineHeight: 17,
  },

  // Coupon code
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  couponInputApplied: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FFF4",
    color: "#22C55E",
  },
  couponSuccessMsg: {
    fontSize: 11,
    color: "#22C55E",
    marginTop: 6,
    fontWeight: "500",
  },

  // Payment summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 13, color: "#666" },
  summaryValue: { fontSize: 13, color: "#1A1A1A", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 6 },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  totalValue: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },

  // Checkout
  checkoutWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  checkoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutPriceBox: { flex: 1 },
  checkoutPayLabel: { fontSize: 11, color: "#888", fontWeight: "400" },
  checkoutPayAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 1,
  },
  checkoutBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  checkoutBtnDisabled: { backgroundColor: "#CCC" },
  checkoutSelectDayText: { fontSize: 11, color: "#888", fontWeight: "500" },
  checkoutText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

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
    color: "#FF5757",
    marginTop: 14,
    marginBottom: 8,
  },
  modalFailMsg: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  modalOrderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  modalOrderLabel: { fontSize: 12, color: "#888" },
  modalOrderId: { fontSize: 12, color: "#333", fontWeight: "600" },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  modalRetryBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalRetryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalCancelText: { color: "#666", fontWeight: "600", fontSize: 14 },
});
