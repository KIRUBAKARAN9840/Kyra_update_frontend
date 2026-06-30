import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList as RNFlatList,
  ScrollView,
  Modal,
  Linking,
  Platform,
  BackHandler,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ImageView from "react-native-image-viewing";
import { getOneGymDetail } from "../../../services/clientApi";
import { MaskedText } from "../../../components/ui/MaskedText";

const { width: screenWidth } = Dimensions.get("window");

// ─── Daily Offer Banner ───────────────────────────────────────────────────────
// Self-contained: only this tiny component re-renders every second
const DailyOfferBanner = () => {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 0, 0);
    return Math.max(0, Math.floor((end - now) / 1000));
  });

  useEffect(() => {
    const id = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");

  return (
    <LinearGradient
      colors={["#1A1A2E", "#16213E"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.dailyOfferBanner}
    >
      <Text style={styles.dailyOfferTitle}>FREE Nutrition Consultation</Text>
      <Text style={styles.dailyOfferSubtitle}>
        + Extra Discount on all Plans
      </Text>
      <Text style={styles.dailyOfferDealLabel}>Deal Ends In</Text>
      <View style={styles.dailyOfferTimerRow}>
        <View style={styles.dailyOfferTimeBlock}>
          <Text style={styles.dailyOfferTimeDigits}>{h}</Text>
          <Text style={styles.dailyOfferTimeUnit}>Hours</Text>
        </View>
        <Text style={styles.dailyOfferColon}>:</Text>
        <View style={styles.dailyOfferTimeBlock}>
          <Text style={styles.dailyOfferTimeDigits}>{m}</Text>
          <Text style={styles.dailyOfferTimeUnit}>Mins</Text>
        </View>
        <Text style={styles.dailyOfferColon}>:</Text>
        <View style={styles.dailyOfferTimeBlock}>
          <Text style={styles.dailyOfferTimeDigits}>{s}</Text>
          <Text style={styles.dailyOfferTimeUnit}>Sec</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

// ─── Gym Images Carousel ──────────────────────────────────────────────────────
const GymCarousel = ({ media }) => {
  const images = useMemo(() => {
    if (!media || media.length === 0) return [];
    return media.filter(
      (item) =>
        !item.toLowerCase().includes(".mp4") &&
        !item.toLowerCase().includes(".mov") &&
        !item.toLowerCase().includes("video"),
    );
  }, [media]);

  const carouselData = useMemo(
    () => images.map((img) => ({ type: "image", uri: img })),
    [images],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isScrolling = useRef(false);

  useEffect(() => {
    if (carouselData.length <= 1) return;
    const timer = setInterval(() => {
      if (!isScrolling.current) {
        const nextIndex = (activeIndex + 1) % carouselData.length;
        flatListRef.current?.scrollToIndex({
          animated: true,
          index: nextIndex,
        });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeIndex, carouselData.length]);

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
          slideIndex < carouselData.length
        ) {
          setActiveIndex(slideIndex);
        }
      },
    },
  );

  const handleMediaPress = useCallback((index) => {
    setImageViewIndex(index);
    setIsImageViewVisible(true);
  }, []);

  const renderMedia = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={styles.carouselSlide}
        activeOpacity={0.9}
        onPress={() => handleMediaPress(index)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.carouselImage}
          contentFit="cover"
        />
        <View style={styles.imageOverlay} pointerEvents="none">
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"]}
            style={{ flex: 1 }}
          />
        </View>
      </TouchableOpacity>
    ),
    [handleMediaPress],
  );

  return (
    <View style={styles.carouselContainer}>
      <RNFlatList
        ref={flatListRef}
        data={carouselData}
        renderItem={renderMedia}
        keyExtractor={(item, index) => `${item.type}-${index}`}
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
      />
      {carouselData.length > 1 && (
        <View style={styles.indicatorContainer}>
          {carouselData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { opacity: index === activeIndex ? 1 : 0.4 },
              ]}
            />
          ))}
        </View>
      )}
      <ImageView
        images={images.map((uri) => ({ uri }))}
        imageIndex={imageViewIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
      />
    </View>
  );
};

// ─── Plan Card ───────────────────────────────────────────────────────────────
const PlanCard = ({
  plan,
  router,
  gymName,
  location,
  allPlans,
  gymId,
  sectionTitle,
  isPTPlan = false,
  dailyOfferActive = false,
}) => {
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showPlanNameInfo, setShowPlanNameInfo] = useState(false);
  const [showBuyNowInfo, setShowBuyNowInfo] = useState(false);

  const handleJoinNow = () => {
    router.push({
      pathname: "/client/(membership)/payment",
      params: {
        plan_id: plan.id.toString(),
        gym_id: gymId,
      },
    });
  };

  const hasDiscount =
    plan.originalPrice &&
    plan.price &&
    parseFloat(plan.price) < parseFloat(plan.originalPrice);

  const calculateDiscount = () => {
    if (hasDiscount) {
      const disc =
        ((parseFloat(plan.originalPrice) - parseFloat(plan.price)) /
          parseFloat(plan.originalPrice)) *
        100;
      return disc.toFixed(0);
    }
    return null;
  };

  const hasBonus = plan.bonus && parseInt(plan.bonus) > 0;
  const hasPause = plan.pause && parseInt(plan.pause) > 0;
  const visibleServices = plan.allServices?.filter((_, idx) => idx < 1) || [];
  const hasMoreServices = plan.allServices && plan.allServices.length > 1;

  return (
    <View style={styles.planCardWrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleJoinNow}
        style={styles.planCard}
      >
        {/* Blue Header */}
        <LinearGradient
          colors={["#007BFF", "#0154A0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.planCardHeader}
        >
          <Text style={styles.planCardTitle}>
            {plan.duration === 1
              ? "1 Month"
              : plan.duration === 12
                ? "1 Year"
                : `${plan.duration} Months`}{" "}
            Plan
          </Text>
          {plan?.duplicate ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setShowPlanNameInfo(true);
              }}
              style={styles.planInfoButton}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : plan.duration === 1 || plan.duration === 12 ? (
            <LinearGradient
              colors={["#FFF0C3", "#F4B23B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.planPackBadge}
            >
              <Text style={styles.planPackBadgeText}>
                {plan.duration === 1 ? "Value Pack" : "Power Pack"}
              </Text>
            </LinearGradient>
          ) : null}
        </LinearGradient>

        {/* Content */}
        <View style={styles.planCardContent}>
          {/* Buddy Count Badge */}
          {plan.plan_for === "buddy" && plan.buddy_count ? (
            <View style={styles.buddyCountBadge}>
              <MaterialIcons name="groups" size={18} color="#007BFF" />
              <Text style={styles.buddyCountText}>
                {plan.buddy_count} Members Plan
              </Text>
            </View>
          ) : null}

          {/* Bonus, Pause, Services */}
          <View style={styles.detailsSection}>
            {hasBonus ? (
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="circle"
                  size={6}
                  color="#434343"
                  style={styles.bulletIcon}
                />
                <Text style={styles.detailText}>
                  {plan.bonus}{" "}
                  {plan.bonusType === "month"
                    ? parseInt(plan.bonus) > 1
                      ? "Months"
                      : "Month"
                    : parseInt(plan.bonus) > 1
                      ? "Days"
                      : "Day"}{" "}
                  <Text style={styles.bonusHighlight}>Bonus</Text> Available
                </Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="circle"
                  size={6}
                  color="#434343"
                  style={styles.bulletIcon}
                />
                <Text style={styles.detailText}>No Bonus Available</Text>
              </View>
            )}

            {hasPause ? (
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="circle"
                  size={6}
                  color="#434343"
                  style={styles.bulletIcon}
                />
                <Text style={styles.detailText}>
                  {plan.pause}{" "}
                  {plan.pauseType === "month"
                    ? parseInt(plan.pause) > 1
                      ? "Months"
                      : "Month"
                    : parseInt(plan.pause) > 1
                      ? "Days"
                      : "Day"}{" "}
                  <Text style={styles.pauseHighlight}>Pause</Text> Available
                </Text>
              </View>
            ) : (
              <View style={styles.detailRow}>
                <MaterialIcons
                  name="circle"
                  size={6}
                  color="#434343"
                  style={styles.bulletIcon}
                />
                <Text style={styles.detailText}>No Pause Available</Text>
              </View>
            )}

            {isPTPlan ? (
              plan.sessions_count && parseInt(plan.sessions_count) > 0 ? (
                <View style={styles.detailRow}>
                  <MaterialIcons
                    name="circle"
                    size={6}
                    color="#434343"
                    style={styles.bulletIcon}
                  />
                  <Text style={styles.detailText}>
                    <Text style={styles.sessionsHighlight}>
                      {plan.sessions_count}{" "}
                      {parseInt(plan.sessions_count) > 1
                        ? "Sessions"
                        : "Session"}
                    </Text>{" "}
                    Per Month
                  </Text>
                </View>
              ) : (
                <View style={styles.detailRow}>
                  <MaterialIcons
                    name="circle"
                    size={6}
                    color="#434343"
                    style={styles.bulletIcon}
                  />
                  <Text style={styles.detailText}>No Sessions Limit</Text>
                </View>
              )
            ) : null}

            {/* Access to Gym Floor */}
            <View style={styles.detailRow}>
              <MaterialIcons
                name="circle"
                size={6}
                color="#434343"
                style={styles.bulletIcon}
              />
              <Text style={styles.detailText}>Access to Gym Floor</Text>
              {visibleServices.length > 0 || hasMoreServices ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    hasMoreServices && setShowServicesModal(true);
                  }}
                  style={{ marginLeft: 4 }}
                >
                  {hasMoreServices && (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.moreText}>View all benefits</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={12}
                        color="#007BFF"
                        style={{ marginLeft: 2 }}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.newPricingSection}>
            {/* {hasDiscount && (
              <View style={styles.pricingDiscountBadge}>
                <Text style={styles.pricingDiscountText}>
                  {calculateDiscount()}% OFF
                </Text>
              </View>
            )} */}
            <View style={styles.priceRow}>
              <Text style={styles.newFinalPrice}>
                ₹{parseFloat(plan.price || plan.originalPrice).toFixed(0)}
              </Text>
              {hasDiscount && (
                <Text style={styles.newOriginalPrice}>
                  ₹{parseFloat(plan.originalPrice).toFixed(0)}
                </Text>
              )}
            </View>
            {plan?.no_cost_emi ? (
              <View style={styles.noCostEmiContainer}>
                <MaskedText
                  bg1="#F4B23B"
                  bg2="#FFF0C3"
                  text="NO COST EMI Available"
                  textStyle={styles.noCostEmiText}
                />
              </View>
            ) : plan?.save > 0 ? (
              <LinearGradient
                colors={["#FF6900", "#FB2C36"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBadge}
              >
                <MaterialIcons
                  name="local-fire-department"
                  size={13}
                  color="#FFF"
                />
                <Text style={styles.saveBadgeText}>
                  Save ₹{plan.save} Today
                </Text>
              </LinearGradient>
            ) : null}
          </View>

          {/* Nutrition / Feature Checklist Card */}
          <View style={styles.nutritionCard}>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionCheckCircle}>
                <MaterialIcons name="check" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.nutritionText}>
                AI Diet Tracking{" "}
                <Text style={styles.nutritionBoldText}>(50 Credits)</Text>
              </Text>
            </View>
            {plan.nutritional_plan?.consultations ? (
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionCheckCircle}>
                  <MaterialIcons name="check" size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.nutritionText}>
                  1:1 Nutrition Consultation{" "}
                  <Text style={styles.nutritionBoldText}>(1 Session)</Text>
                </Text>
              </View>
            ) : null}
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionCheckCircle}>
                <MaterialIcons name="check" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.nutritionText}>Personalized Diet Plan</Text>
            </View>

            <View style={styles.nutritionRow}>
              <View style={styles.nutritionCheckCircle}>
                <MaterialIcons name="check" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.nutritionText}>Workout Tracking</Text>
            </View>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionCheckCircle}>
                <MaterialIcons name="check" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.nutritionText}>Water Tracking</Text>
            </View>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionCheckCircle}>
                <MaterialIcons name="check" size={10} color="#FFFFFF" />
              </View>
              <Text style={styles.nutritionText}>Step Count Monitoring</Text>
            </View>
          </View>

          {dailyOfferActive ? (
            <LinearGradient
              colors={["#FFFFFF", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.onlyTodayBadge}
            >
              <Image
                source={require("../../../assets/images/calories.png")}
                width={14}
                height={18}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.onlyTodayText}>Only Today</Text>
            </LinearGradient>
          ) : null}

          {/* Join Now Button */}
          <TouchableOpacity
            style={styles.joinNowButton}
            onPress={handleJoinNow}
          >
            <LinearGradient
              colors={["#007BFF", "#007BFF"]}
              style={styles.joinNowButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.joinNowButtonText}>
                Start My Fitness Plan
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Buy Now, Start Anytime */}
          <TouchableOpacity
            style={styles.buyNowAnytimeButton}
            onPress={(e) => {
              e.stopPropagation();
              setShowBuyNowInfo(true);
            }}
          >
            <Text style={styles.buyNowAnytimeText}>Buy Now, Start Anytime</Text>
            <MaterialIcons
              name="arrow-forward"
              size={12}
              color="#007BFF"
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Buy Now Start Anytime Modal */}
      <Modal
        visible={showBuyNowInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBuyNowInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 16 }]}>
                Buy Now, Start Anytime
              </Text>
              <TouchableOpacity
                onPress={() => setShowBuyNowInfo(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: "#666",
                  marginBottom: 14,
                  lineHeight: 19,
                }}
              >
                Your membership activates only when you're ready - no rush, no
                expiry on activation.
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color="#10B981"
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    marginLeft: 10,
                    flex: 1,
                    lineHeight: 20,
                  }}
                >
                  Membership begins only after your first gym visit and scan -
                  not from the date of purchase.
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color="#10B981"
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    marginLeft: 10,
                    flex: 1,
                    lineHeight: 20,
                  }}
                >
                  Activate at your convenience - no pressure, no deadlines.
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <Icon
                  name="check-circle"
                  size={18}
                  color="#10B981"
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    marginLeft: 10,
                    flex: 1,
                    lineHeight: 20,
                  }}
                >
                  Secure today's price and start whenever you're ready.
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Icon
                  name="check-circle"
                  size={18}
                  color="#10B981"
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    marginLeft: 10,
                    flex: 1,
                    lineHeight: 20,
                  }}
                >
                  Full membership duration starts from the day you activate -
                  not a day is wasted.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseFooterButton}
              onPress={() => setShowBuyNowInfo(false)}
            >
              <Text style={styles.modalCloseFooterButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Services Modal */}
      <Modal
        visible={showServicesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowServicesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 16 }]}>
                All Services
              </Text>
              <TouchableOpacity
                onPress={() => setShowServicesModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {plan.allServices &&
                plan.allServices.map((service, index) => (
                  <View key={index} style={styles.serviceModalItem}>
                    <Icon name="check-circle" size={18} color="#10B981" />
                    <Text style={styles.serviceModalText}>{service}</Text>
                  </View>
                ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseFooterButton}
              onPress={() => setShowServicesModal(false)}
            >
              <Text style={styles.modalCloseFooterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Plan Name Info Modal */}
      <Modal
        visible={showPlanNameInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlanNameInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.planNameInfoModal}>
            <View style={styles.planNameInfoModalHeader}>
              <Text style={styles.planNameInfoModalTitle}>Plan Details</Text>
              <TouchableOpacity
                onPress={() => setShowPlanNameInfo(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <View style={styles.planNameInfoModalContent}>
              <Text style={styles.planNameInfoModalText}>{plan.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.planNameInfoModalCloseBtn}
              onPress={() => setShowPlanNameInfo(false)}
            >
              <Text style={styles.planNameInfoModalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Horizontal Plans List ────────────────────────────────────────────────────
const HorizontalPlansList = ({
  plans,
  title,
  router,
  gymName,
  location,
  allPlans,
  gymId,
  isPTPlan = false,
  dailyOfferActive = false,
}) => {
  const renderPlanItem = ({ item }) => (
    <PlanCard
      plan={item}
      router={router}
      gymName={gymName}
      location={location}
      allPlans={allPlans}
      gymId={gymId}
      sectionTitle={title}
      isPTPlan={isPTPlan}
      dailyOfferActive={dailyOfferActive}
    />
  );

  return (
    <View style={styles.plansSection}>
      <RNFlatList
        data={plans}
        renderItem={renderPlanItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalPlansList}
        ItemSeparatorComponent={() => <View style={{ width: 15 }} />}
      />
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const OneGym = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { gym_id, scroll_to_plans } = useLocalSearchParams();

  const [gymData, setGymData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlanTab, setSelectedPlanTab] = useState("membership");
  const [isTimingsExpanded, setIsTimingsExpanded] = useState(false);
  const [isWhyJoinExpanded, setIsWhyJoinExpanded] = useState(false);
  const [walkawayModalVisible, setWalkawayModalVisible] = useState(false);

  const scrollViewRef = useRef(null);
  const planTabScrollRef = useRef(null);
  const currentScrollY = useRef(0);
  const tabLayouts = useRef({});
  const plansSectionY = useRef(0);

  // Back handler
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  // Fetch gym details
  useEffect(() => {
    if (!gym_id) return;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await getOneGymDetail(gym_id);

        if (response?.status === 200) {
          setGymData(response.data);
          if (response?.data?.walkaway_show_modal)
            setWalkawayModalVisible(true);
        } else {
          setError("Failed to fetch gym details");
        }
      } catch (err) {
        console.error("OneGym fetch error:", err);
        setError("Error fetching gym details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [gym_id]);

  // Scroll to plans section when requested
  useEffect(() => {
    if (scroll_to_plans !== "1" || loading || !gymData) return;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: plansSectionY.current,
        animated: true,
      });
    }, 300);
  }, [scroll_to_plans, loading, gymData]);

  // Plan tabs configuration
  const planSubTabs = [
    { id: "membership", label: "Membership Plans" },
    { id: "pt", label: "Personal Training" },
    { id: "coupleMembership", label: "Couple Membership" },
    { id: "couplePT", label: "Couple PT" },
    { id: "buddy", label: "Buddy" },
    { id: "buddyPT", label: "Buddy PT" },
  ];

  const handleTabChange = useCallback((tabId, index) => {
    const savedScrollY = currentScrollY.current;
    setSelectedPlanTab(tabId);
    const layout = tabLayouts.current[index];
    if (layout) {
      const scrollX = layout.x - screenWidth / 2 + layout.width / 2;
      planTabScrollRef.current?.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      });
    }
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: savedScrollY, animated: false });
    }, 50);
  }, []);

  const formatGymTimings = (timings) => {
    if (!timings || !Array.isArray(timings) || timings.length === 0)
      return ["Timing not available"];
    return timings
      .filter((t) => t?.startTime && t?.endTime)
      .map((t) => {
        try {
          const start = new Date(t.startTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          const end = new Date(t.endTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          const day = t?.day || t?.days || "Daily";
          const dayLabel =
            day && typeof day === "string" && day.length > 0
              ? day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
              : "Daily";
          return `${dayLabel} ${start} - ${end}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };

  const processPlansData = () => {
    if (!gymData?.plans)
      return {
        regularPlans: [],
        personalTrainingPlans: [],
        coupleMembershipPlans: [],
        couplePTPlans: [],
        buddyPlans: [],
        buddyPTPlans: [],
      };

    const regularPlans = [],
      personalTrainingPlans = [],
      coupleMembershipPlans = [],
      couplePTPlans = [],
      buddyPlans = [],
      buddyPTPlans = [];

    gymData.plans.forEach((plan) => {
      let servicesArray = [];
      if (Array.isArray(plan.services)) servicesArray = plan.services;
      else if (typeof plan.services === "string")
        servicesArray = plan.services.split(",");

      const processed = {
        id: plan.plan_id,
        type: plan.plan_name,
        name: plan.plan_name,
        price: plan.amount,
        originalPrice: plan.original,
        duration: plan.duration,
        bonus: plan.bonus,
        bonusType: plan.bonus_type,
        pause: plan.pause,
        pauseType: plan.pause_type,
        allServices: servicesArray,
        nutritional_plan: plan.nutritional_plan,
        no_cost_emi: plan.no_cost_emi,
        description: plan.description,
        plan_for: plan.plan_for,
        buddy_count: plan.buddy_count,
        duplicate: plan.duplicate || false,
        sessions_count: plan.sessions_count || 0,
        per_month: plan.per_month,
        user_saving_price: plan.user_saving_price || 0,
        save: plan?.discount ?? 0,
      };

      if (plan.plan_for === "buddy") {
        plan.personal_training
          ? buddyPTPlans.push(processed)
          : buddyPlans.push(processed);
      } else if (plan.plan_for === "couple" || plan.is_couple) {
        plan.personal_training
          ? couplePTPlans.push(processed)
          : coupleMembershipPlans.push(processed);
      } else {
        plan.personal_training
          ? personalTrainingPlans.push(processed)
          : regularPlans.push(processed);
      }
    });

    return {
      regularPlans,
      personalTrainingPlans,
      coupleMembershipPlans,
      couplePTPlans,
      buddyPlans,
      buddyPTPlans,
    };
  };

  const getGymMedia = () => {
    const pics = gymData?.gym_pics || gymData?.photos || [];
    if (pics.length === 0) {
      return [
        "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
      ];
    }
    return pics.map((photo) => photo.image_url);
  };

  if (loading) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <Text style={styles.loadingText}>Loading gym details...</Text>
      </View>
    );
  }

  if (error || !gymData) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <Text style={styles.errorText}>{error || "Gym not found"}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButtonFallback}
        >
          <Text style={styles.backButtonFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    regularPlans,
    personalTrainingPlans,
    coupleMembershipPlans,
    couplePTPlans,
    buddyPlans,
    buddyPTPlans,
  } = processPlansData();
  const gymMedia = getGymMedia();
  const formattedTimings = formatGymTimings(
    gymData.gym_timings || gymData.operating_hours,
  );

  const gymLocation = [
    gymData?.address?.door_no,
    gymData?.address?.building,
    gymData?.address?.street,
    gymData?.address?.area,
    gymData?.address?.city,
    gymData?.address?.state,
    gymData?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const gymLocationShort = [
    gymData?.address?.door_no,
    gymData?.address?.building,
    gymData?.address?.street,
    gymData?.address?.area,
    gymData?.address?.city,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerGymName} numberOfLines={1}>
          {gymData?.gym_name ? String(gymData.gym_name).toUpperCase() : ""}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          currentScrollY.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        {/* Photos Carousel */}
        <GymCarousel media={gymMedia} />

        {/* Gym Info: Location + Operating Hours */}
        <View style={styles.gymInfoSection}>
          <TouchableOpacity
            style={styles.locationRow}
            onPress={() => {
              const latitude =
                gymData?.latitude ?? gymData?.exact_location?.latitude;
              const longitude =
                gymData?.longitude ?? gymData?.exact_location?.longitude;
              if (latitude && longitude) {
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
                );
              }
            }}
          >
            <MaterialIcons name="location-on" size={18} color="#007BFF" />
            <Text style={[styles.gymLocation, { color: "#007BFF" }]}>
              {gymLocation}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.locationRow, { marginTop: 5 }]}
            onPress={() => {
              if (formattedTimings.length > 1)
                setIsTimingsExpanded(!isTimingsExpanded);
            }}
            disabled={formattedTimings.length <= 1}
            activeOpacity={formattedTimings.length > 1 ? 0.7 : 1}
          >
            <MaterialIcons name="alarm" size={18} color="#666" />
            <View
              style={[
                styles.gymLocation,
                {
                  flexDirection: "row",
                  alignItems: isTimingsExpanded ? "flex-start" : "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(65,65,65,0.7)",
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                {isTimingsExpanded
                  ? formattedTimings.join("\n")
                  : formattedTimings[0]}
              </Text>
              {formattedTimings.length > 1 && (
                <MaterialIcons
                  name={
                    isTimingsExpanded
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={18}
                  color="#666"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Why Fymble? Collapsible Card */}
        <View style={styles.whyJoinContainer}>
          <TouchableOpacity
            style={styles.whyJoinHeader}
            onPress={() => setIsWhyJoinExpanded(!isWhyJoinExpanded)}
            activeOpacity={0.8}
          >
            <Text style={styles.whyJoinHeaderText}>Why Fymble?</Text>
            <MaterialIcons
              name={
                isWhyJoinExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"
              }
              size={22}
              color="#374151"
            />
          </TouchableOpacity>

          {isWhyJoinExpanded && (
            <View style={styles.whyJoinBody}>
              <View
                style={[
                  styles.whyJoinRow,
                  { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
                ]}
              >
                <View style={styles.whyJoinColHeader}>
                  <Text style={styles.whyJoinColHeaderText}>Gym Direct</Text>
                </View>
                <View
                  style={[
                    styles.whyJoinColHeader,
                    styles.whyJoinColHeaderFymble,
                  ]}
                >
                  <Text style={styles.whyJoinColHeaderFymbleText}>
                    ⭐ With Fymble
                  </Text>
                </View>
              </View>

              {[
                { label: "Gym Access", gymHas: true },
                {
                  gymLabel: "No Nutrition Consultation",
                  fymbleLabel: "1:1 Nutrition Consultation",
                  gymHas: false,
                },
                {
                  gymLabel: "No Meal Plan",
                  fymbleLabel: "Basic Meal Plan",
                  gymHas: false,
                },
                {
                  gymLabel: "No Diet Tracking",
                  fymbleLabel: "Kyra AI Diet Tracking",
                  gymHas: false,
                },
                {
                  gymLabel: "No Workout Tracking",
                  fymbleLabel: "Workout Tracking",
                  gymHas: false,
                },
                {
                  gymLabel: "No Water Tracking",
                  fymbleLabel: "Water Tracking",
                  gymHas: false,
                },
              ].map((item, index) => (
                <View key={index} style={styles.whyJoinRow}>
                  <View style={styles.whyJoinCell}>
                    <View
                      style={[
                        styles.whyJoinIcon,
                        item.gymHas
                          ? styles.whyJoinIconGreen
                          : styles.whyJoinIconRed,
                      ]}
                    >
                      <MaterialIcons
                        name={item.gymHas ? "check" : "close"}
                        size={14}
                        color="#FFF"
                      />
                    </View>
                    <Text style={styles.whyJoinCellText}>
                      {item.gymHas ? item.label : item.gymLabel}
                    </Text>
                  </View>
                  <View style={styles.whyJoinCell}>
                    <View style={[styles.whyJoinIcon, styles.whyJoinIconGreen]}>
                      <MaterialIcons name="check" size={14} color="#FFF" />
                    </View>
                    <Text style={styles.whyJoinCellText}>
                      {item.gymHas ? item.label : item.fymbleLabel}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Plan Tabs */}
        <View
          style={styles.planTabsContainer}
          onLayout={(e) => {
            plansSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <ScrollView
            ref={planTabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.planTabScrollContent}
          >
            {planSubTabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.planTab,
                  selectedPlanTab === tab.id && styles.planTabActive,
                ]}
                onPress={() => handleTabChange(tab.id, index)}
                onLayout={(e) => {
                  tabLayouts.current[index] = e.nativeEvent.layout;
                }}
              >
                <Text
                  style={[
                    styles.planTabText,
                    selectedPlanTab === tab.id && styles.planTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {planSubTabs.map((tab) => (
              <View
                key={tab.id}
                style={[
                  styles.paginationDot,
                  selectedPlanTab === tab.id && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Daily Offer Banner */}
        {gymData?.daily_offer_active ? <DailyOfferBanner /> : null}

        {/* Plans */}
        {selectedPlanTab === "membership" &&
          (regularPlans.length > 0 ? (
            <HorizontalPlansList
              plans={regularPlans}
              title="Membership Plans"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={regularPlans}
              gymId={gymData?.gym_id}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {selectedPlanTab === "pt" &&
          (personalTrainingPlans.length > 0 ? (
            <HorizontalPlansList
              plans={personalTrainingPlans}
              title="Personal Training"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={personalTrainingPlans}
              gymId={gymData?.gym_id}
              isPTPlan={true}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {selectedPlanTab === "coupleMembership" &&
          (coupleMembershipPlans.length > 0 ? (
            <HorizontalPlansList
              plans={coupleMembershipPlans}
              title="Couple Membership"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={coupleMembershipPlans}
              gymId={gymData?.gym_id}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {selectedPlanTab === "couplePT" &&
          (couplePTPlans.length > 0 ? (
            <HorizontalPlansList
              plans={couplePTPlans}
              title="Couple PT"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={couplePTPlans}
              gymId={gymData?.gym_id}
              isPTPlan={true}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {selectedPlanTab === "buddy" &&
          (buddyPlans.length > 0 ? (
            <HorizontalPlansList
              plans={buddyPlans}
              title="Buddy"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={buddyPlans}
              gymId={gymData?.gym_id}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {selectedPlanTab === "buddyPT" &&
          (buddyPTPlans.length > 0 ? (
            <HorizontalPlansList
              plans={buddyPTPlans}
              title="Buddy PT"
              router={router}
              gymName={gymData?.gym_name}
              location={gymLocationShort}
              allPlans={buddyPTPlans}
              gymId={gymData?.gym_id}
              isPTPlan={true}
              dailyOfferActive={!!gymData?.daily_offer_active}
            />
          ) : (
            <View style={styles.noPlansSection}>
              <Text style={styles.noPlansText}>No Plans Found</Text>
            </View>
          ))}

        {/* Trusted by 10k+ Users */}
        <View style={styles.trustedBadge}>
          <Text style={styles.trustedText}>
            Trusted by <Text style={styles.trustedNumber}>15k+</Text> Users
          </Text>
          <Icon
            name="arm-flex"
            size={28}
            color="#FFAB76"
            style={{ marginRight: 6 }}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Walkaway Offer Modal */}
      <Modal
        visible={walkawayModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setWalkawayModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.walkawayOverlay}
          activeOpacity={1}
          onPress={() => setWalkawayModalVisible(false)}
        >
          <View style={styles.walkawayModalImageContainer}>
            <TouchableOpacity
              style={styles.walkawayClose}
              onPress={() => setWalkawayModalVisible(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#999" />
            </TouchableOpacity>
            <Image
              source={require("../../../assets/images/home/offer_inside.webp")}
              style={styles.walkawayModalImage}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default OneGym;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, color: "#777" },
  errorText: {
    fontSize: 15,
    color: "#FF5757",
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  backButtonFallback: {
    backgroundColor: "#007BFF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonFallbackText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    width: 30,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerGymName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },

  // Carousel
  carouselContainer: { height: 240, position: "relative", marginTop: 10 },
  carouselSlide: {
    width: screenWidth - 20,
    height: 200,
    overflow: "hidden",
    borderRadius: 16,
    marginHorizontal: 10,
  },
  carouselImage: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "#FFF",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4A4A4A",
    marginHorizontal: 3,
  },

  // Gym Info
  gymInfoSection: {
    backgroundColor: "#FFF",
    padding: 20,
    paddingVertical: 5,
    marginBottom: 10,
  },
  locationRow: { flexDirection: "row", alignItems: "center" },
  gymLocation: {
    fontSize: 12,
    color: "rgba(65,65,65,0.7)",
    marginLeft: 5,
    flex: 1,
    lineHeight: 20,
    backgroundColor: "#F6F6F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  // Why Join
  whyJoinContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  whyJoinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  whyJoinHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  whyJoinBody: { backgroundColor: "#FFFFFF" },
  whyJoinRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  whyJoinColHeader: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  whyJoinColHeaderFymble: { backgroundColor: "#EFF6FF" },
  whyJoinColHeaderText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  whyJoinColHeaderFymbleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#007BFF",
  },
  whyJoinCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    gap: 6,
  },
  whyJoinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  whyJoinIconGreen: { backgroundColor: "#22C55E" },
  whyJoinIconRed: { backgroundColor: "#EF4444" },
  whyJoinCellText: { fontSize: 12, color: "#374151", flex: 1 },

  // Plan Tabs
  planTabsContainer: {
    paddingVertical: 8,
    paddingBottom: 4,
    backgroundColor: "#fff",
  },
  planTabScrollContent: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
  },
  planTab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
  },
  planTabActive: {
    backgroundColor: "#E8F4FD",
    borderColor: "#007BFF",
    borderWidth: 2,
  },
  planTabText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  planTabTextActive: {
    color: "#007BFF",
    fontWeight: "600",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  paginationDotActive: {
    backgroundColor: "#007BFF",
  },

  // Plans Section
  plansSection: {
    backgroundColor: "#FFF",
    paddingTop: 10,
    paddingBottom: 15,
    marginBottom: 10,
    minHeight: 280,
  },
  horizontalPlansList: { paddingHorizontal: 20 },
  noPlansSection: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 80,
    minHeight: 380,
  },
  noPlansText: { fontSize: 14, color: "#999", fontWeight: "500" },
  trustedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  trustedText: {
    fontSize: 20,

    color: "#333",
  },
  trustedNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  // Plan Card
  planCardWrapper: {
    width: 280,
    position: "relative",
    marginVertical: 10,
    marginTop: 0,
  },
  planCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
  },
  planCardHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planCardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  planInfoButton: { padding: 4, marginLeft: 8 },
  planPackBadge: {
    marginLeft: 8,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planPackBadgeText: { fontSize: 12, fontWeight: "700", color: "#7A4A00" },
  planCardContent: {
    padding: 16,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
  },

  // Buddy badge
  buddyCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF8FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BEE3F8",
    gap: 6,
  },
  buddyCountText: { fontSize: 13, fontWeight: "600", color: "#007BFF" },

  // Details
  detailsSection: { marginBottom: 6, marginLeft: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  bulletIcon: { marginRight: 8, marginTop: 2 },
  detailText: { fontSize: 13, color: "#434343", lineHeight: 20, flex: 1 },
  bonusHighlight: { color: "#22C55E", fontWeight: "700", fontSize: 14 },
  pauseHighlight: { color: "#22C55E", fontWeight: "700", fontSize: 14 },
  sessionsHighlight: { color: "#22C55E", fontWeight: "700" },
  moreText: { color: "#007BFF", fontWeight: "600", fontSize: 12 },

  // Pricing
  newPricingSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 90,
  },
  pricingDiscountBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 10,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 0,
    position: "absolute",
    top: 0,
    right: 0,
  },
  pricingDiscountText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 0,
  },
  newFinalPrice: { fontSize: 28, fontWeight: "700", color: "#434343" },
  newOriginalPrice: {
    fontSize: 16,
    color: "rgba(142,142,142,0.6)",
    textDecorationLine: "line-through",
    fontWeight: "500",
    marginLeft: 8,
  },
  newPerMonthPrice: {
    fontSize: 15,
    color: "#007BFF",
    marginTop: 4,
    fontWeight: "600",
  },
  noCostEmiContainer: {
    marginTop: 4,
    alignSelf: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noCostEmiText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  saveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    gap: 4,
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Nutrition / feature checklist card
  nutritionCard: {
    backgroundColor: "#22C55E05",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    width: "100%",
    gap: 6,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nutritionCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nutritionText: { fontSize: 11, color: "#374151", lineHeight: 18, flex: 1 },
  nutritionBoldText: { fontSize: 11, color: "#374151", fontWeight: "700" },
  onlyTodayBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 8,
    width: "100%",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  onlyTodayText: {
    fontSize: 14,
    color: "#0A0A0A",
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Daily Offer Banner
  dailyOfferBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 10,
  },
  dailyOfferTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  dailyOfferSubtitle: {
    fontSize: 13,
    color: "#CBD5E1",
    marginTop: 2,
    textAlign: "center",
  },
  dailyOfferDealLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  dailyOfferTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  dailyOfferTimeBlock: { alignItems: "center", minWidth: 56 },
  dailyOfferTimeDigits: {
    fontSize: 38,
    color: "#FFFFFF",
    fontFamily: Platform.OS === "android" ? "AdvancedDotDigital" : undefined,
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  dailyOfferTimeUnit: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dailyOfferColon: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 14,
  },

  // Join Now Button
  joinNowButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
    elevation: 4,
    shadowColor: "#007BFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  joinNowButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  joinNowButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  buyNowAnytimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 6,
    paddingBottom: 0,
  },
  buyNowAnytimeText: {
    color: "#007BFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "85%",
    maxWidth: 340,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  modalCloseButton: { padding: 4 },
  modalBody: { padding: 16, maxHeight: 300 },
  serviceModalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  serviceModalText: { fontSize: 14, color: "#333", marginLeft: 10, flex: 1 },
  modalCloseFooterButton: {
    backgroundColor: "#0078FF",
    margin: 20,
    marginTop: 0,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseFooterButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  planNameInfoModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "85%",
    maxWidth: 320,
    overflow: "hidden",
  },
  planNameInfoModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  planNameInfoModalTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  planNameInfoModalContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  planNameInfoModalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    lineHeight: 22,
  },
  planNameInfoModalCloseBtn: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    alignItems: "center",
  },
  planNameInfoModalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Walkaway Offer Modal ─────────────────────────────────────────
  walkawayOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  walkawayModalImageContainer: {
    width: screenWidth * 0.85,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  walkawayModalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  walkawayClose: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
