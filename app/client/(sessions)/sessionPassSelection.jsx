import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { getAvailableSessionsPriceAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import PassSelectionSkeleton from "../../../components/ui/loaders/PassSelectionSkeleton";

const SessionPassSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [pricesData, setPricesData] = useState(null);

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

  const fetchAllPrices = async () => {
    setLoading(true);
    try {
      const gymId = params.gymId;
      const sessionId = params.sessionId;
      const trainer_id = params.trainer_id || null;
      const is_offer_eligible = params.session_offer_eligible === "true";

      if (!gymId || !sessionId) {
        showToast({
          type: "error",
          title: "Error fetching Prices",
        });
        setLoading(false);
        return;
      }
      const response = await getAvailableSessionsPriceAPI(
        gymId,
        sessionId,
        trainer_id,
        is_offer_eligible,
      );

      if (response?.status === 200) {
        setPricesData(response.data);
      } else {
        showToast({
          type: "error",
          title: "Error fetching Prices",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error fetching Prices",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPrices();
  }, []);

  const handleExploreMonthlyPlans = () => {
    router.push({
      pathname: "/client/gymdetails",
      params: {
        gym_id: params.gymId,
        passPrice: params.passPrice,
        discountPrice: params.discountPrice,
        discount: params.discount,
        session_id: params.sessionId,
        planTab: "pt",
      },
    });
  };

  const handleBookNow = (passType) => {
    if (passType === "1-month") {
      // Navigate to gym details for monthly plan
      router.push({
        pathname: "/client/gymdetails",
        params: {
          gym_id: params.gymId,
          passPrice: params.passPrice,
          discountPrice: params.discountPrice,
          discount: params.discount,
          session_id: params.sessionId,
        },
      });
    } else {
      // Navigate to date selection page
      router.push({
        pathname: "/client/(sessions)/dateSelection",
        params: {
          ...params,
          passType: passType,
        },
      });
    }
  };

  // Build pass options based on offer eligibility
  const is_offer_eligible = params.session_offer_eligible === "true";

  const allPassOptions = [
    {
      id: "1-session",
      icon: require("../../../assets/images/sessions/one_session.png"),
      title: "1 Session",
      subtitle: "Perfect for trial",
      originalPrice: is_offer_eligible
        ? null // Don't show strikethrough when offer is active
        : pricesData?.single?.discount_percentage
          ? `₹${pricesData.single.base_price}`
          : null,
      discountedPrice: is_offer_eligible
        ? "₹99" // Show fixed ₹99 when offer is active
        : `₹${pricesData?.single?.final_price || 0}`,
      discount: is_offer_eligible
        ? "New User Limited Offer"
        : "Try Before You Commit",
    },
    {
      id: "5-session",
      icon: require("../../../assets/images/sessions/five_session.png"),
      title: "5 Sessions",
      subtitle: "Best Value - Save More",
      originalPrice: pricesData?.bulk_5?.discount_percentage
        ? `₹${pricesData.bulk_5.base_price}`
        : null,
      discountedPrice: `₹${pricesData?.bulk_5?.final_price || 0}`,
      discount: "Build Your Routine",
    },
    {
      id: "custom-dates",
      icon: require("../../../assets/images/sessions/custom_session.png"),
      title: "Custom Selection",
      subtitle: "Select your own days and sessions",
      originalPrice: null,
      discountedPrice: null,
      discount: "Pick What Suits You",
    },
  ];

  // Filter options based on offer eligibility
  const passOptions = is_offer_eligible
    ? allPassOptions.filter((option) => option.id === "1-session") // Only show 1-session when offer is active
    : allPassOptions; // Show all options when no offer

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {params.sessionName || "Session"}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <PassSelectionSkeleton />
        ) : (
          <>
            {/* Title Section */}
            <View style={styles.titleCard}>
              <Text style={styles.mainTitle}>Choose Your Pass</Text>
              <Text style={styles.subtitle}>
                Select the perfect fitness plan for your goals
              </Text>
            </View>

            {/* Pass Options */}
            <View style={styles.passContainer}>
              {passOptions.map((pass) => (
                <TouchableOpacity
                  key={pass.id}
                  style={styles.passCard}
                  onPress={() => handleBookNow(pass.id)}
                >
                  {/* First Row: Icon, Title/Subtitle, Prices */}
                  <View style={styles.passTopRow}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                      <Image
                        source={pass.icon}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </View>

                    {/* Title and Subtitle */}
                    <View style={styles.passInfo}>
                      <Text style={styles.passTitle}>{pass.title}</Text>
                      <Text style={styles.passSubtitle}>{pass.subtitle}</Text>
                    </View>

                    {/* Prices */}
                    <View style={[styles.priceContainer, { marginRight: 20 }]}>
                      {pass?.originalPrice ? (
                        <Text style={styles.originalPrice}>
                          {pass.originalPrice}
                        </Text>
                      ) : (
                        ""
                      )}
                      <Text style={styles.discountedPrice}>
                        {pass.discountedPrice}
                      </Text>
                    </View>
                  </View>

                  {/* Second Row: Discount Badge and Book Button */}
                  <View style={styles.passBottomRow}>
                    {/* Discount Badge or Empty Space */}
                    <View style={styles.discountContainer}>
                      {pass.discount && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            {pass.discount}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Book Button */}
                    <TouchableOpacity
                      style={styles.bookButton}
                      onPress={() => handleBookNow(pass.id)}
                    >
                      <Text style={styles.bookButtonText}>Book Now</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Explore Monthly Plans Button */}
            {params?.trainer_id ? (
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={handleExploreMonthlyPlans}
              >
                <Text style={styles.exploreButtonText}>
                  Explore Monthly Plans
                </Text>
              </TouchableOpacity>
            ) : (
              ""
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default SessionPassSelection;

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
    paddingTop: 20,
  },
  titleCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    paddingVertical: 10,
  },
  mainTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "400",
  },
  passContainer: {
    gap: 16,
    paddingHorizontal: 10,
  },
  passCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  passTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  passBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconImage: {
    width: 45,
    height: 45,
  },
  passInfo: {
    flex: 1,
  },
  passTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  passSubtitle: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
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
    fontWeight: "500",
  },
  discountedPrice: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "700",
  },
  discountBadge: {
    backgroundColor: "#00C853",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  discountText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "700",
  },
  bookButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  exploreButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
    marginHorizontal: 16,
    width: "70%",
    alignSelf: "center",
  },
  exploreButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  discountContainer: {
    minWidth: 60,
  },
});
