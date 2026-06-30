import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import CustomPicker from "../../components/ui/CustomPicker";
import axiosInstance from "../../services/axiosInstance";
import { pythonRound } from "../../utils/basicUtilFunctions";

const DailyPass = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true); // Start with loading true
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isDailypassOfferActive, setIsDailypassOfferActive] = useState(false);
  const isNavigating = useRef(false);
  const [count, setCount] = useState(0);

  const gymName = params.gymName || "Gym";
  const gymId = params.gymId ? parseInt(params.gymId) : null;

  // Check eligibility on mount
  useEffect(() => {
    const checkEligibility = async () => {
      if (!gymId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.post("/offer_eligibility/check", {
          gym_id: gymId,
          mode: "dailypass",
        });

        setIsDailypassOfferActive(response.data.is_eligible === true);
        setCount(response?.data?.available_count);
      } catch (error) {
        // On error, default to not eligible (safer)
        setIsDailypassOfferActive(false);
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [gymId]);

  const [customDays, setCustomDays] = useState(isDailypassOfferActive ? 1 : 5);
  const basePrice = isDailypassOfferActive
    ? 49
    : params.discountPrice
      ? parseInt(params.discountPrice)
      : 0;
  const originalPrice = params.amount ? parseInt(params.amount) : 0;
  const gymDiscount = params.discount_per ? parseInt(params.discount_per) : 0;

  // Update customDays when eligibility is determined
  useEffect(() => {
    setCustomDays(isDailypassOfferActive ? 1 : 5);
  }, [isDailypassOfferActive]);

  // Generate days options for custom picker
  // If offer is active, limit to count days; otherwise allow up to 30 days
  const maxDays = isDailypassOfferActive ? count : 30;
  const daysOptions = Array.from({ length: maxDays }, (_, i) => ({
    label: `${i + 1} ${i + 1 === 1 ? "Day" : "Days"}`,
    value: i + 1,
  }));

  const handleBack = () => {
    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      isNavigating.current = false;

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

  const handleBookNow = (passType) => {
    if (isNavigating.current) return;
    if (passType === "custom") {
      setShowCustomModal(true);
    } else {
      isNavigating.current = true;
      router.push({
        pathname: "/client/passDateSelection",
        params: {
          ...params,
          passType: passType,
          discountPrice: basePrice.toString(),
          gymId: gymId,
        },
      });
    }
  };

  const handleCustomConfirm = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setShowCustomModal(false);
    router.push({
      pathname: "/client/passDateSelection",
      params: {
        ...params,
        passType: "custom",
        customDays: customDays,
        discountPrice: basePrice.toString(),
      },
    });
  };

  // Calculate prices for different pass types
  const oneDayPrice = basePrice;
  const fiveDayBasePrice = basePrice * 5;
  const fiveDayPrice = basePrice * 5;

  const allPassOptions = [
    {
      id: "1-day",
      icon: require("../../assets/images/sessions/one_session.png"),
      title: "1 Day Pass",
      subtitle: "Perfect for trial",
      originalPrice: null,
      discountedPrice: isDailypassOfferActive
        ? "₹49" // Show fixed ₹49 when offer is active
        : `₹${oneDayPrice}`,
      discount: isDailypassOfferActive
        ? "New User Limited Offer" // Show "New User Limited Offer" when offer is active
        : "Try Before You Commit",
    },
    {
      id: "2-day",
      icon: require("../../assets/images/sessions/custom_session.png"),
      title: "2 Day Pass",
      subtitle: "Short-term flexibility",
      originalPrice: null,
      discountedPrice: "₹98", // 49*2
      discount: "New User Limited Offer",
    },
    {
      id: "3-day",
      icon: require("../../assets/images/sessions/custom_session.png"),
      title: "3 Day Pass",
      subtitle: "Extended trial experience",
      originalPrice: null,
      discountedPrice: "₹147", // 49*3
      discount: "New User Limited Offer",
    },
    {
      id: "5-day",
      icon: require("../../assets/images/sessions/five_session.png"),
      title: "5 Day Pass",
      subtitle: "Best Value - Save More",
      originalPrice: null,
      discountedPrice: `₹${fiveDayPrice}`,
      discount: "Build Your Routine",
    },
    {
      id: "custom",
      icon: require("../../assets/images/sessions/custom_session.png"),
      title: "Custom Selection",
      subtitle: "Select your own days",
      originalPrice: null,
      discountedPrice: null,
      discount: "Pick What Suits You",
    },
  ];

  // Filter pass options based on offer eligibility
  // When offer is active, show passes up to `count` days (1 = only 1-day, 2 = 1-day & 2-day, 3 = all three)
  const offerPassIds = ["1-day", "2-day", "3-day"].slice(0, count);
  const passOptions = isDailypassOfferActive
    ? allPassOptions.filter((option) => offerPassIds.includes(option.id))
    : allPassOptions.filter(
        (option) => option.id !== "2-day" && option.id !== "3-day",
      ); // Hide 2-day and 3-day pass when no offer

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text style={styles.loadingText}>Checking eligibility...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                  {pass.discountedPrice && (
                    <View style={[styles.priceContainer, { marginRight: 20 }]}>
                      {/* {pass.originalPrice && (
                        <Text style={styles.originalPrice}>
                          {pass.originalPrice}
                        </Text>
                      )} */}
                      <Text style={styles.discountedPrice}>
                        {pass.discountedPrice}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Second Row: Discount Badge and Book Button */}
                <View style={styles.passBottomRow}>
                  {/* Discount Badge or Empty Space */}
                  <View style={styles.discountContainer}>
                    {pass.discount && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{pass.discount}</Text>
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
        </ScrollView>
      )}

      {/* Custom Days Selection Modal */}
      <Modal
        visible={showCustomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Number of Days</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>How many days?</Text>
              {isDailypassOfferActive && (
                <Text style={styles.maxDaysNote}>Max 3 days only</Text>
              )}
              <CustomPicker
                items={daysOptions}
                value={customDays}
                onValueChange={setCustomDays}
                placeholder="Select days"
                style={styles.picker}
              />

              <Text style={styles.pricePreview}>
                Estimated: ₹{pythonRound(basePrice * customDays)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmButton2}
              onPress={handleCustomConfirm}
            >
              <Text style={styles.confirmButtonText2}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DailyPass;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
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
  discountContainer: {
    minWidth: 60,
  },
  priceSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginTop: 16,
  },
  priceSummaryText: {
    fontSize: 12,
    color: "#000000",
    marginLeft: 4,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  maxDaysNote: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF3B30",
    marginBottom: 8,
    textAlign: "center",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
  },
  pricePreview: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 16,
    textAlign: "center",
  },
  discountHint: {
    fontSize: 12,
    color: "#00C853",
    fontWeight: "500",
  },
  confirmButton2: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText2: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
