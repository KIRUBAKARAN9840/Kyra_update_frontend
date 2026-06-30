import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Animated,
  Linking,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  SlideInLeft,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { getGymDetailsPricing } from "../../../services/clientApi";
import { handlePayPack } from "../Payment/passpayfn";
import { showToast } from "../../../utils/Toaster";
import styles from "../Home/homeStyles";

const { width: screenWidth } = Dimensions.get("window");

// ── Image Carousel (same pattern as GymDetailModal) ─────────────
const PricingCarousel = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isScrolling = useRef(false);

  const imageList = useMemo(() => {
    if (!images || images.length === 0) return [];
    return images.filter(
      (img) =>
        !img.toLowerCase().includes(".mp4") &&
        !img.toLowerCase().includes(".mov") &&
        !img.toLowerCase().includes("video"),
    );
  }, [images]);

  useEffect(() => {
    if (imageList.length <= 1) return;
    const timer = setInterval(() => {
      if (!isScrolling.current) {
        const nextIndex = (activeIndex + 1) % imageList.length;
        flatListRef.current?.scrollToIndex({
          animated: true,
          index: nextIndex,
        });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeIndex, imageList.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const slideIndex = Math.round(
          event.nativeEvent.contentOffset.x / screenWidth,
        );
        if (
          slideIndex !== activeIndex &&
          slideIndex >= 0 &&
          slideIndex < imageList.length
        ) {
          setActiveIndex(slideIndex);
        }
      },
    },
  );

  const handleImagePress = useCallback((index) => {
    setImageViewIndex(index);
    setIsImageViewVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={s.carouselSlide}
        activeOpacity={0.9}
        onPress={() => handleImagePress(index)}
      >
        <Image
          source={{ uri: item }}
          style={s.carouselImage}
          contentFit="cover"
        />
      </TouchableOpacity>
    ),
    [handleImagePress],
  );

  if (imageList.length === 0) return null;

  return (
    <View style={s.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={imageList}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          isScrolling.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isScrolling.current = false;
          }, 100);
        }}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        snapToInterval={screenWidth}
        decelerationRate="fast"
      />
      <ImageView
        images={imageList.map((uri) => ({ uri }))}
        imageIndex={imageViewIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
      />
    </View>
  );
};

// ── Format operating hours ───────────────────────────────────────
const fmtTime = (val) => {
  if (!val) return "";
  // Handle ISO date string ("2025-12-16T05:30:00.000") or simple "HH:MM"
  let h, m;
  if (val.includes("T")) {
    const d = new Date(val);
    h = d.getHours();
    m = d.getMinutes();
  } else {
    const parts = val.split(":");
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
  }
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${h12}${ampm}`
    : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
};

const formatHourEntry = (entry) => {
  const start = entry?.startTime || entry?.open;
  const end = entry?.endTime || entry?.close;
  if (!start || !end) return null;
  const day = entry?.day || entry?.days || "Daily";
  return { day, time: `${fmtTime(start)} - ${fmtTime(end)}` };
};

// ── Shimmer Badge (Most Popular) ────────────────────────────────
const ShimmerBadge = ({ children, colors }) => {
  const translateX = useSharedValue(-80);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(80, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[s.badge, { overflow: "hidden" }]}
    >
      <ReAnimated.View style={[s.shimmerOverlay, shimmerStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.8)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </ReAnimated.View>
      {children}
    </LinearGradient>
  );
};

// ── Pack Card ───────────────────────────────────────────────────
const PackCard = ({ pack, selected, onPress, badge, rewardDiscount = 0 }) => {
  const displayPrice = pack.customer_price - rewardDiscount;
  const displaySavings = pack.savings + rewardDiscount;
  const badgeContent = badge && (
    <>
      <Ionicons
        name={badge === "Most Popular" ? "flame" : "star"}
        size={11}
        color="#FFF"
        style={{ marginRight: 3 }}
      />
      <Text style={s.badgeText}>{badge}</Text>
    </>
  );

  return (
    <TouchableOpacity
      style={[s.packCard, selected && s.packCardSelected]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {badge === "Most Popular" && (
        <ShimmerBadge colors={["#FF5722", "#FF3D00"]}>
          {badgeContent}
        </ShimmerBadge>
      )}
      {badge === "Best Value" && (
        <LinearGradient
          colors={["#EEA300", "#D49100"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.badge}
        >
          {badgeContent}
        </LinearGradient>
      )}

      <View style={s.packRow}>
        {/* Left side: label + details */}
        <View style={s.packLeft}>
          <View style={s.packLabelRow}>
            <Text style={s.packLabel}>{pack.label} Pass</Text>
            {pack.days > 1 && (
              <Text style={s.packDaily}>• ₹{pack.effective_daily}/day</Text>
            )}
          </View>
          <Text style={s.packValidity}>
            Validity: {pack.validity_days}{" "}
            {pack.validity_days === 1 ? "day" : "days"}
          </Text>
        </View>

        {/* Right side: price + savings */}
        <View style={s.packRight}>
          <Text style={s.packPrice}>₹{displayPrice}</Text>
          {displaySavings > 0 && (
            <Text style={s.packSavings}>Save ₹{displaySavings}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Modal ──────────────────────────────────────────────────
const GymPricingModal = ({ visible, onClose, gymId, gymName }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [gymData, setGymData] = useState(null);
  const [selectedPackIndex, setSelectedPackIndex] = useState(null);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState("daily_pass");
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [rewardsApplied, setRewardsApplied] = useState(false);
  const paymentInProgress = useRef(false);
  const scrollViewRef = useRef(null);

  // Fetch pricing data when modal opens
  useEffect(() => {
    if (visible && gymId) {
      setLoading(true);
      setGymData(null);
      setSelectedPackIndex(null);
      setError(false);
      setActiveTab("daily_pass");
      setHoursExpanded(false);
      setPaymentLoading(false);
      setRewardsApplied(false);
      paymentInProgress.current = false;

      getGymDetailsPricing(gymId)
        .then((res) => {
          console.log(JSON.stringify(res));
          if (res?.status === 200) {
            setGymData(res);
            // Auto-select if only one pack
            if (res.packs?.length === 1) setSelectedPackIndex(0);
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [visible, gymId]);

  // Build address string
  const fullAddress = useMemo(() => {
    if (!gymData?.address) return "";
    return [
      gymData.address.door_no,
      gymData.address.building,
      gymData.address.street,
      gymData.address.area,
      gymData.address.city,
      gymData.address.state,
      gymData.address.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  }, [gymData]);

  const formattedHours = useMemo(() => {
    const hours = gymData?.operating_hours;
    if (!hours || !Array.isArray(hours) || hours.length === 0) return [];
    return hours.map(formatHourEntry).filter(Boolean);
  }, [gymData]);

  const images = useMemo(() => {
    if (gymData?.gym_pics?.length > 0) {
      return gymData.gym_pics.map((p) => p.image_url).filter(Boolean);
    }
    return [];
  }, [gymData]);

  // Build tabs list: "Daily Pass" first, then API tabs
  const tabs = useMemo(() => {
    const list = [{ key: "daily_pass", label: "Daily Pass" }];
    if (gymData?.tabs?.length > 0) {
      gymData.tabs.forEach((t) => {
        list.push({ key: t.key, label: t.label });
      });
    }
    return list;
  }, [gymData]);

  const packs = gymData?.packs || [];

  // Whether selected pack qualifies for reward (7 or 15 day, reward_amount > 0)
  const selectedPack =
    selectedPackIndex != null ? packs[selectedPackIndex] : null;
  const rewardAmount = selectedPack?.reward_amount || 0;
  const shouldShowReward =
    selectedPack && selectedPack.days > 1 && rewardAmount > 0;
  const pendingScrollRef = useRef(false);

  // When a multi-day pack is selected, flag that we need to scroll
  useEffect(() => {
    if (shouldShowReward) {
      pendingScrollRef.current = true;
    }
  }, [shouldShowReward, selectedPackIndex]);

  // Scroll after content size changes (banner rendered = more height)
  const handleContentSizeChange = useCallback((_w, _h) => {
    if (pendingScrollRef.current) {
      pendingScrollRef.current = false;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, []);

  const handleAddressPress = useCallback(() => {
    if (!gymData?.latitude || !gymData?.longitude) return;
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${gymData.latitude},${gymData.longitude}`,
    );
  }, [gymData]);

  const handleBookNow = useCallback(async () => {
    if (selectedPackIndex == null || !packs[selectedPackIndex]) return;
    if (paymentInProgress.current) return;

    const selectedPack = packs[selectedPackIndex];
    const packSize = selectedPack.days;

    // 1-day pack → navigate to passDateSelection
    if (packSize === 1) {
      onClose?.();
      router.push({
        pathname: "/client/(dailypass)/passDateSelection",
        params: { gymId: gymData?.gym_id || gymId },
      });
      return;
    }

    // 7/15-day packs → direct payment from modal
    paymentInProgress.current = true;
    setPaymentLoading(true);

    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({ type: "error", title: "Please log in to continue" });
        return;
      }

      const res = await handlePayPack({
        gymId: Number(gymData?.gym_id || gymId),
        clientId: String(client_id),
        packSize,
        reward: rewardsApplied,
      });

      if (res?.success || res?.verified) {
        onClose?.();
        router.push({
          pathname: "/client/passConfirmed",
          params: {
            gymName: gymData?.gym_name || gymName || "",
            days: String(packSize),
            packSize: String(packSize),
            validityDays: String(selectedPack.validity_days || packSize),
          },
        });
      } else {
        showToast({
          type: "error",
          title: res?.message || "Payment failed. Please try again.",
        });
      }
    } catch (e) {
      showToast({
        type: "error",
        title: e?.message || "Something went wrong",
      });
    } finally {
      setPaymentLoading(false);
      paymentInProgress.current = false;
    }
  }, [
    selectedPackIndex,
    packs,
    gymData,
    gymId,
    gymName,
    onClose,
    rewardsApplied,
  ]);

  const displayName = gymData?.gym_name || gymName || "";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Content */}
        {loading ? (
          <View style={[s.loaderContainer, { paddingTop: insets.top }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[s.loaderBackBtn, { top: insets.top + 8 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
            <ActivityIndicator size="large" color="#FF5757" />
            <Text style={s.loaderText}>Loading details...</Text>
          </View>
        ) : error ? (
          <View style={[s.loaderContainer, { paddingTop: insets.top }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[s.loaderBackBtn, { top: insets.top + 8 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
            <MaterialIcons name="error-outline" size={40} color="#CCC" />
            <Text style={s.loaderText}>Could not load gym details</Text>
          </View>
        ) : gymData ? (
          <>
            {/* Back button overlaid on carousel (outside ScrollView for fixed positioning) */}
            <TouchableOpacity
              onPress={onClose}
              style={[s.backBtnOverlay, { top: insets.top + 8 }]}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={handleContentSizeChange}
              contentContainerStyle={[
                s.scrollContent,
                { paddingBottom: 100 + insets.bottom },
              ]}
            >
              {/* Image Carousel (topmost, behind status bar) */}
              <PricingCarousel images={images} />

              {/* Gym Name */}
              <Text style={s.gymName} numberOfLines={1}>
                {displayName}{" "}
              </Text>

              {/* Address row */}
              {fullAddress ? (
                <View style={s.addressRow}>
                  <Ionicons name="location-outline" size={16} color="#888" />
                  <Text style={s.addressText} numberOfLines={2}>
                    {fullAddress}
                  </Text>
                  {gymData?.latitude && gymData?.longitude && (
                    <TouchableOpacity
                      onPress={handleAddressPress}
                      activeOpacity={0.7}
                      style={s.navigateBtn}
                    >
                      <Ionicons name="navigate" size={16} color="#FF5757" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Operating Hours */}
              {formattedHours.length > 0 && (
                <TouchableOpacity
                  style={s.hoursCard}
                  activeOpacity={formattedHours.length > 1 ? 0.7 : 1}
                  onPress={() => {
                    if (formattedHours.length > 1)
                      setHoursExpanded((prev) => !prev);
                  }}
                  disabled={formattedHours.length <= 1}
                >
                  <View style={s.hoursFirstRow}>
                    <MaterialIcons name="access-time" size={15} color="#888" />
                    <Text style={s.hoursDay}>{formattedHours[0].day}</Text>
                    <Text style={s.hoursTime}>{formattedHours[0].time}</Text>
                    {formattedHours.length > 1 && (
                      <MaterialIcons
                        name={
                          hoursExpanded
                            ? "keyboard-arrow-up"
                            : "keyboard-arrow-down"
                        }
                        size={18}
                        color="#999"
                      />
                    )}
                  </View>
                  {hoursExpanded &&
                    formattedHours.slice(1).map((h, i) => (
                      <View key={i} style={s.hoursRow}>
                        <Text style={s.hoursDay}>{h.day}</Text>
                        <Text style={s.hoursTime}>{h.time}</Text>
                      </View>
                    ))}
                </TouchableOpacity>
              )}
              {/* Tabs */}
              {tabs.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.tabsScroll}
                  style={s.tabsContainer}
                >
                  {tabs.map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        s.tabPill,
                        activeTab === tab.key && s.tabPillActive,
                      ]}
                      onPress={() => setActiveTab(tab.key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          s.tabPillText,
                          activeTab === tab.key && s.tabPillTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <View style={s.divider} />

              {/* Choose Your Pass */}
              {packs.length > 0 ? (
                <View style={s.packsSection}>
                  <View style={s.packsHeader}>
                    <Text style={s.packsTitle}>Choose Your Pass</Text>
                    <Text style={s.packsCount}>
                      {packs.length} {packs.length === 1 ? "option" : "options"}
                    </Text>
                  </View>

                  {packs.map((pack, index) => {
                    let badge = null;
                    if (pack.days === 7) badge = "Most Popular";
                    else if (pack.days === 15) badge = "Best Value";
                    const isSelected = selectedPackIndex === index;
                    const packReward = pack.reward_amount || 0;
                    const discount =
                      isSelected &&
                      rewardsApplied &&
                      pack.days > 1 &&
                      packReward > 0
                        ? packReward
                        : 0;
                    return (
                      <PackCard
                        key={pack.days}
                        pack={pack}
                        selected={isSelected}
                        onPress={() => setSelectedPackIndex(index)}
                        badge={badge}
                        rewardDiscount={discount}
                      />
                    );
                  })}

                  {/* Fymble Cash Reward Banner */}
                  {shouldShowReward && (
                    <ReAnimated.View
                      entering={FadeIn.duration(400)}
                      key={`reward-${selectedPackIndex}`}
                    >
                      <View style={s.rewardBanner}>
                        <View style={s.rewardLeft}>
                          <View style={s.rewardIconWrap}>
                            <Ionicons name="gift" size={18} color="#FF5757" />
                          </View>
                          <View>
                            <Text style={s.rewardTitle}>
                              You have ₹{rewardAmount} Fymble Cash
                            </Text>
                            <Text style={s.rewardSub}>
                              {rewardsApplied
                                ? `₹${rewardAmount} applied to your pack`
                                : "Apply to get extra discount"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[
                            s.rewardApplyBtn,
                            rewardsApplied && s.rewardAppliedBtn,
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setRewardsApplied((prev) => !prev)}
                        >
                          <Text
                            style={[
                              s.rewardApplyText,
                              rewardsApplied && s.rewardAppliedText,
                            ]}
                          >
                            {rewardsApplied ? "Remove" : "Apply"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </ReAnimated.View>
                  )}
                </View>
              ) : (
                <View style={s.emptyPricing}>
                  <MaterialIcons name="info-outline" size={32} color="#CCC" />
                  <Text style={s.emptyPricingText}>
                    Pricing not available for this gym
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Sticky Footer */}
            {packs.length > 0 && (
              <View
                style={[
                  s.footer,
                  { paddingBottom: Math.max(insets.bottom + 12, 20) },
                ]}
              >
                <TouchableOpacity
                  style={[
                    s.bookNowBtn,
                    selectedPackIndex == null && s.bookNowBtnDisabled,
                  ]}
                  onPress={handleBookNow}
                  activeOpacity={0.85}
                  disabled={selectedPackIndex == null}
                >
                  <Text style={s.bookNowText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : null}

        {/* Payment loading overlay */}
        {paymentLoading && (
          <View style={s.paymentOverlay}>
            <View style={s.paymentOverlayBox}>
              <ActivityIndicator size="large" color="#FF5757" />
              <Text style={s.paymentOverlayText}>Processing payment...</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default GymPricingModal;

// ── Styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Back button overlay on carousel
  backBtnOverlay: {
    position: "absolute",
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  // Gym name below carousel
  gymName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A1A",
    paddingHorizontal: 16,
    marginTop: 12,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#999",
  },
  loaderBackBtn: {
    position: "absolute",
    left: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Carousel
  carouselContainer: {
    height: 210,
    position: "relative",
  },
  carouselSlide: {
    width: screenWidth,
    height: 210,
    position: "relative",
    overflow: "hidden",
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Content
  scrollContent: {
    paddingBottom: 16,
  },

  // Address row
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 12.5,
    color: "#888",
    lineHeight: 18,
  },
  navigateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF0EF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Operating Hours
  hoursCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hoursFirstRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    paddingLeft: 21,
    gap: 6,
  },
  hoursDay: {
    fontSize: 12.5,
    color: "#555",
    fontWeight: "600",
  },
  hoursTime: {
    flex: 1,
    fontSize: 12.5,
    color: "#888",
  },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 10,
  },

  // Tabs
  tabsContainer: {
    marginTop: 16,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  tabPillActive: {
    backgroundColor: "#FF5757",
    borderColor: "#FF5757",
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  tabPillTextActive: {
    color: "#FFFFFF",
  },

  // Packs
  packsSection: {
    paddingHorizontal: 16,
    marginTop: 0,
  },
  packsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  packsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  packsCount: {
    fontSize: 13,
    color: "#999",
  },

  // Pack Card
  packCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#F0F0F0",
    padding: 16,
    marginBottom: 16,
    position: "relative",
    overflow: "visible",
  },
  packCardSelected: {
    borderColor: "#FF5757",
    backgroundColor: "#FFF8F7",
  },
  packRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packLeft: {
    flex: 1,
    marginRight: 12,
  },
  packLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  packLabel: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  packDaily: {
    fontSize: 12.5,
    color: "#888",
  },
  packValidity: {
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
  },
  packRight: {
    alignItems: "flex-end",
  },
  packPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  packSavings: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34C759",
    marginTop: 2,
  },

  // Badge
  badge: {
    position: "absolute",
    top: -10,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#FFFFFF",
    zIndex: 1,
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 0,
  },

  // Reward banner
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE0D6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rewardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rewardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE8E2",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  rewardSub: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },
  rewardApplyBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginLeft: 8,
  },
  rewardAppliedBtn: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  rewardApplyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },
  rewardAppliedText: {
    color: "#FF5757",
  },

  // Empty state
  emptyPricing: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyPricingText: {
    fontSize: 14,
    color: "#AAAAAA",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#EEEEEE",
  },
  bookNowBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  bookNowBtnDisabled: {
    backgroundColor: "#FFB3B3",
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Payment overlay
  paymentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  paymentOverlayBox: {
    alignItems: "center",
    gap: 14,
  },
  paymentOverlayText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
});
