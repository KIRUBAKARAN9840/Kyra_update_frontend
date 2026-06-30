import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Modal,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import WorkoutCard from "../Workout/WorkoutCard";
import { isPureFreemium } from "../../../config/access";
import { useUser } from "../../../context/UserContext";
import PremiumBadge from "../Payment/premiumbadge";
import { checkScanEligibilityAPI } from "../../../services/clientApi";
import { handleNutritionPay } from "../Payment/nutritionpayfn";
const { width, height } = Dimensions.get("window");

const DietSelection = ({
  gender,
  locationCoords,
  nutritionPurchased = false,
  dietPlanAssigned = false,
  hidden = false,
}) => {
  const router = useRouter();
  const { plan, userType, registrationSteps } = useUser();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [noCreditsVisible, setNoCreditsVisible] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [notPurchasedVisible, setNotPurchasedVisible] = useState(false);
  const [notAssignedVisible, setNotAssignedVisible] = useState(false);
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);

  const handleNutritionPurchase = async () => {
    if (nutriPayInProgress.current) return;
    nutriPayInProgress.current = true;
    setNutriPayProcessing(true);
    setNutriPayStep("Initializing...");

    const response = await handleNutritionPay({
      onStep: setNutriPayStep,
    });

    nutriPayInProgress.current = false;

    if (response?.success) {
      setNutriPayProcessing(false);
      setNutriPaySuccess(true);
    } else if (response?.pendingPolling) {
      setNutriPayProcessing(false);
      setNutriPaySuccess(true);
    } else if (response?.userCancelled) {
      setNutriPayProcessing(false);
    } else {
      setNutriPayProcessing(false);
      setNutriPayFailed(true);
    }
  };

  const handleNutritionistPress = () => {
    if (dietPlanAssigned) {
      router.push("/client/(diet)/nutritionplan");
    } else if (nutritionPurchased) {
      setNotAssignedVisible(true);
    } else {
      setNotPurchasedVisible(true);
    }
  };

  const handleScanPress = async () => {
    setEligibilityChecking(true);
    try {
      const res = await checkScanEligibilityAPI({
        lat: locationCoords?.lat ?? null,
        lng: locationCoords?.lng ?? null,
      });
      if (res?.eligibility === false) {
        setNoCreditsVisible(true);
        return;
      }
      router.push({
        pathname: "/client/foodscanner",
        params: {
          lat: locationCoords?.lat ?? null,
          lng: locationCoords?.lng ?? null,
          nearby_sessions: JSON.stringify(res?.nearby_sessions ?? []),
          nutrition_purchased: res?.nutrition_purchased || false,
        },
      });
    } finally {
      setEligibilityChecking(false);
    }
  };

  const handleModalClick = (type) => {
    if (type === "personal") {
      router.push({
        pathname: "/client/personalTemplate",
        params: { method: "personal" },
      });
    }
  };

  const renderSelectionButtons = () => {
    return (
      <View style={styles.selectionButtonsContainer}>
        <WorkoutCard
          title={"Snap a photo of your meal"}
          subtitle={
            "KyraAI calculates calories in seconds\nSnap ➜ Know Calories ➜ Stay Fit"
          }
          imagePath={require("../../../assets/images/home_content/scanner.webp")}
          buttonText={eligibilityChecking ? "Checking..." : "Scan Your Food"}
          onPress={handleScanPress}
          disabled={eligibilityChecking}
          textColor={"#000000"}
          paraTextColor={"#00000081"}
          bg1={"#28A7450A"}
          bg2={"#007BFF0A"}
          border1={"#28a74629"}
          border2={"#297eb32f"}
          charWidth={110}
          charHeight={105}
          smallTitle
          scanButton
        />

        <WorkoutCard
          title={"Make your own Diet Chart"}
          subtitle={
            "Easily create templates based on\nyour food, fitness, and habits.."
          }
          imagePath={require("../../../assets/images/diet/char_15.png")}
          buttonText="Create Diet"
          onPress={() => handleModalClick("personal")}
          textColor={"#000000"}
          paraTextColor={"#00000081"}
          buttonTextColor={"#28A745"}
          bg1={"#FFFFFF"}
          bg2={"#FFFFFF"}
          border1={"#28a74629"}
          border2={"#297eb32f"}
          charWidth={120}
          charHeight={100}
          extra
          smallTitle
        />
      </View>
    );
  };

  return (
    <View
      style={
        hidden
          ? { position: "absolute", width: 0, height: 0, overflow: "hidden" }
          : styles.container
      }
    >
      {!hidden && renderSelectionButtons()}

      {/* Premium Modal for iOS */}
      <Modal
        visible={premiumModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPremiumModalVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <PremiumBadge size={30} />
                <Text style={styles.premiumModalText}>
                  This feature requires a Premium subscription
                </Text>
                <TouchableOpacity
                  style={styles.premiumModalButton}
                  onPress={() => setPremiumModalVisible(false)}
                >
                  <Text style={styles.premiumModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* No Credits Modal */}
      <Modal
        visible={noCreditsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNoCreditsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNoCreditsVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <Text style={styles.noCreditsTitle}>Not Enough Credits</Text>
                <Text style={styles.premiumModalText}>
                  You don't have enough AI credits to scan food.
                </Text>
                {Platform.OS !== "ios" && (
                  <TouchableOpacity
                    style={styles.noCreditsBtn}
                    onPress={() => {
                      setNoCreditsVisible(false);
                      router.push("/client/credits");
                    }}
                  >
                    <LinearGradient
                      colors={["#6A92DF", "#4365A7"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.noCreditsBtnGradient}
                    >
                      <Text style={styles.noCreditsBtnText}>
                        Purchase Credits
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.premiumModalButton}
                  onPress={() => setNoCreditsVisible(false)}
                >
                  <Text style={styles.premiumModalButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Guest Modal */}
      <Modal
        visible={guestModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGuestModalVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <Text style={[styles.premiumModalText, { fontWeight: "bold" }]}>
                  Finish Setting Up Your Account to Access This Feature
                </Text>
                <TouchableOpacity
                  style={styles.premiumModalButton}
                  onPress={() => {
                    setGuestModalVisible(false);
                    let pathname = "/register/age-selector";

                    if (registrationSteps) {
                      if (!registrationSteps.dob) {
                        pathname = "/register/age-selector";
                      } else if (
                        registrationSteps.dob &&
                        !registrationSteps.goal
                      ) {
                        pathname = "/register/seventh-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        !registrationSteps.height
                      ) {
                        pathname = "/register/fourth-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        !registrationSteps.weight
                      ) {
                        pathname = "/register/fifth-step";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        registrationSteps.weight &&
                        !registrationSteps.body_shape
                      ) {
                        pathname = "/register/body-shape-current";
                      } else if (
                        registrationSteps.dob &&
                        registrationSteps.goal &&
                        registrationSteps.height &&
                        registrationSteps.weight &&
                        registrationSteps.body_shape &&
                        !registrationSteps.lifestyle
                      ) {
                        pathname = "/register/sixth-step";
                      }
                    }

                    router.push({
                      pathname,
                      params: {
                        tab: "My Progress",
                        gender: gender || "male",
                      },
                    });
                  }}
                >
                  <Text style={styles.premiumModalButtonText}>
                    Complete Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Nutrition Not Purchased Modal — Promo Card */}
      <Modal
        visible={notPurchasedVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotPurchasedVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotPurchasedVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.nutriPromoModal}>
                <View style={styles.nutriPromoHeader}>
                  <Text style={styles.nutriPromoHeaderText}>
                    🔥 Start Your Fitness Journey Today
                  </Text>
                </View>
                <View style={styles.nutriPromoBody}>
                  <Text style={styles.nutriPromoBodyTitle}>
                    1:1 Expert Nutrition Program
                  </Text>
                  <View style={styles.nutriPromoBodyRow}>
                    <View style={styles.nutriPromoBodyLeft}>
                      {[
                        "Personalized 30-Day Diet Plan",
                        "Expert Video Guidance",
                        "Whatsapp Chat Support",
                        "Progress Tracking",
                        "100 food scan credits free",
                      ].map((item) => (
                        <View key={item} style={styles.nutriPromoBulletRow}>
                          <Text style={styles.nutriPromoBulletDot}>•</Text>
                          <Text style={styles.nutriPromoBulletText}>
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                {Platform.OS !== "ios" && (
                  <View style={styles.nutriPromoFooter}>
                    <View style={styles.nutriPromoPriceCard}>
                      <View style={styles.nutriPromoSaveBadge}>
                        <Text style={styles.nutriPromoSaveBadgeText}>
                          Save ₹3000
                        </Text>
                      </View>
                      <View style={styles.nutriPromoPriceRow}>
                        <Text style={styles.nutriPromoPrice}>₹1999</Text>
                        <Text style={styles.nutriPromoPriceOld}> ₹4999</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setNotPurchasedVisible(false);
                          handleNutritionPurchase();
                        }}
                        activeOpacity={0.85}
                        style={styles.nutriPromoBtn}
                      >
                        <Text style={styles.nutriPromoBtnText}>
                          Get My Diet Plan
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.nutriPromoTrustedRow}>
                      <Text style={styles.nutriPromoTrustedText}>
                        Trusted by 5K+ Users
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Nutrition Payment Processing Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayProcessing}
        onRequestClose={() => {}}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <ActivityIndicator size="large" color="#28A745" />
            <Text style={[styles.nutritionModalTitle, { marginTop: 16 }]}>
              Processing Payment
            </Text>
            {nutriPayStep ? (
              <Text style={styles.premiumModalText}>{nutriPayStep}</Text>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Nutrition Purchase Success Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPaySuccess}
        onRequestClose={() => setNutriPaySuccess(false)}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <Ionicons name="checkmark-circle" size={48} color="#28A745" />
            <Text
              style={[
                styles.nutritionModalTitle,
                { color: "#28A745", marginTop: 12 },
              ]}
            >
              Purchase Successful!
            </Text>
            <Text style={styles.premiumModalText}>
              Your nutrition package with 4 sessions is active. Book your first
              session now to get started!
            </Text>
            <TouchableOpacity
              style={styles.nutritionPrimaryBtn}
              onPress={() => {
                setNutriPaySuccess(false);
                router.push("/client/nutritionBooking");
              }}
            >
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nutritionPrimaryBtnGradient}
              >
                <Text style={styles.nutritionPrimaryBtnText}>
                  Book Your Slot Now
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginTop: 12, paddingVertical: 8 }}
              onPress={() => setNutriPaySuccess(false)}
            >
              <Text style={{ color: "#888", fontSize: 14, fontWeight: "500" }}>
                I'll book later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nutrition Purchase Failed Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={nutriPayFailed}
        onRequestClose={() => setNutriPayFailed(false)}
        statusBarTranslucent
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalContent}>
            <Ionicons name="close-circle" size={48} color="#FF5757" />
            <Text
              style={[
                styles.nutritionModalTitle,
                { color: "#FF5757", marginTop: 12 },
              ]}
            >
              Payment Failed
            </Text>
            <Text style={styles.premiumModalText}>
              Payment could not be processed. Please try again.
            </Text>
            <TouchableOpacity
              style={styles.nutritionSecondaryBtn}
              onPress={() => setNutriPayFailed(false)}
            >
              <Text style={styles.nutritionSecondaryBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nutrition Plan In Progress Modal */}
      <Modal
        visible={notAssignedVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotAssignedVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotAssignedVisible(false)}>
          <View style={styles.premiumModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.premiumModalContent}>
                <Text style={styles.nutritionModalTitle}>
                  Your Diet Plan Preparation{"\n"}is in Progress
                </Text>
                <Text style={styles.premiumModalText}>
                  Our nutritionist is crafting a personalised diet plan for you.
                  You'll be notified as soon as it's ready.
                </Text>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={["#28A745", "#007BFF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.progressBarFill}
                    />
                  </View>
                  <Text style={styles.progressBarText}>65%</Text>
                </View>
                <TouchableOpacity
                  style={styles.nutritionSecondaryBtn}
                  onPress={() => setNotAssignedVisible(false)}
                >
                  <Text style={styles.nutritionSecondaryBtnText}>Got it</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sectionContainer: {
    flex: 1,
    padding: width * 0.04,
    paddingTop: 0,
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.02,
    marginTop: height * 0.03,
  },
  backButtonText: {
    fontSize: width * 0.04,
    marginLeft: width * 0.02,
    fontWeight: "500",
  },
  selectionButtonsContainer: {
    padding: width * 0.04,
    marginTop: 0,
    paddingTop: 0,
  },
  selectionButton: {
    marginBottom: height * 0.02,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  buttonGradient: {
    padding: height * 0.03,
  },
  buttonIconContainer: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.075,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: height * 0.01,
  },
  buttonTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: height * 0.005,
  },
  buttonSubtitle: {
    fontSize: width * 0.035,
    color: "rgba(255, 255, 255, 0.9)",
  },
  dateSelector: {
    padding: width * 0.04,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: width * 0.04,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF5757",
  },
  currentTimeText: {
    color: "#666",
  },
  searchInput: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  mostCommon: {
    fontSize: 14,
    color: "#666",
    padding: 10,
    fontWeight: "700",
  },
  foodList: {
    flex: 1,
  },
  noResultsText: {
    textAlign: "center",
    fontSize: 14,
    width: "75%",
    alignSelf: "center",
    marginTop: 20,
    color: "#666",
  },
  foodItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedFoodItem: {
    borderColor: "#FF5757",
    backgroundColor: "#E3F2FD",
  },
  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  foodTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  foodItemTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  foodItemSubTitle: {
    fontSize: 11,
  },
  foodItemNutrition: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  nutritionText: {
    fontSize: 14,
    color: "#666",
  },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityLabel: {
    fontSize: 14,
    color: "#666",
  },
  individualQuantityInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    padding: 4,
    width: 50,
    textAlign: "center",
    marginLeft: 8,
    fontSize: 14,
  },
  inputError: {
    borderColor: "red",
    borderWidth: 1,
  },
  saveButtonContainer: {
    padding: 15,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "white",
    borderRadius: 10,
  },
  saveButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  templateList: {
    padding: 10,
  },
  templateItem: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  templateHeader: {
    padding: 15,
  },
  templateTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "600",
  },
  templateMacros: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  templateDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    padding: 15,
  },
  templateDishItem: {
    marginBottom: 15,
  },
  dishInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  dishName: {
    fontSize: 16,
  },
  dishMacros: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 20,
  },
  macroText: {
    fontSize: 14,
    color: "#666",
  },
  vegIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: width * 0.08,
    marginTop: height * 0.06,
  },
  emptyStateTitle: {
    fontSize: width * 0.05,
    fontWeight: "bold",
    color: "#333",
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
  },
  emptyStateText: {
    fontSize: width * 0.04,
    color: "#777",
    textAlign: "center",
  },
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  premiumModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.8,
    maxWidth: 400,
  },
  premiumModalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  premiumModalButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  premiumModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noCreditsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  noCreditsBtn: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  noCreditsBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  noCreditsBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  // ── Nutrition Promo Modal Styles ──
  nutriPromoModal: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    width: width * 0.88,
    maxWidth: 420,
  },
  nutriPromoHeader: {
    backgroundColor: "#F4FAFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    alignItems: "center",
  },
  nutriPromoHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  nutriPromoBody: {
    backgroundColor: "#F4FAFF",
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#D9ECFF",
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  nutriPromoBodyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  nutriPromoBodyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nutriPromoBodyLeft: {
    width: "60%",
    paddingRight: 8,
  },
  nutriPromoBodyRight: {
    width: "40%",
  },
  nutriPromoBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  nutriPromoBulletDot: {
    fontSize: 12,
    color: "#555",
    marginRight: 4,
    lineHeight: 18,
  },
  nutriPromoBulletText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 18,
  },
  nutriPromoImage: {
    width: 120,
    height: 100,
  },
  nutriPromoFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    alignItems: "center",
  },
  nutriPromoPriceCard: {
    backgroundColor: "#F4FAFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9ECFF",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: "center",
    width: "90%",
    overflow: "visible",
    marginTop: 6,
  },
  nutriPromoSaveBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#2B9E55",
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  nutriPromoSaveBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  nutriPromoPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  nutriPromoPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  nutriPromoPriceOld: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 6,
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  nutriPromoBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "75%",
  },
  nutriPromoBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  nutriPromoTrustedRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  nutriPromoTrustedText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  nutritionModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
    textAlign: "center",
  },
  nutritionPrimaryBtn: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  nutritionPrimaryBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  nutritionPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  progressBarContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: "#E8EDF5",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    width: "65%",
    height: "100%",
    borderRadius: 5,
  },
  progressBarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#28A745",
  },
  nutritionSecondaryBtn: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  nutritionSecondaryBtnText: {
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default DietSelection;
