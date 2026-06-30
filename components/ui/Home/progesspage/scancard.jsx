import { useRouter } from "expo-router";

import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PremiumBadge from "../../Payment/premiumbadge";
import { scanFood, isPureFreemium } from "../../../../config/access";
import { toIndianISOString } from "../../../../utils/basicUtilFunctions";
// import WorkoutCard from "../Workout/WorkoutCard";
import { getClientDietAPI } from "../../../../services/clientApi";
import { showToast } from "../../../../utils/Toaster";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TryOnce from "../../tryonce";

const { width, height } = Dimensions.get("window");

// Function to determine if device is tablet
const isTablet = () => {
  return width >= 768;
};

const ScanCard = ({
  gender,
  plan,
  oneTimeScan,
  userType,
  registrationSteps,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceIsTablet = isTablet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [dietTemplate, setDietTemplate] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const scanFoods = () => {
    if (isPureFreemium(plan)) {
      if (oneTimeScan) {
        router.push({
          pathname: "/client/foodscanner",
          params: {
            food_scan: "true",
          },
        });
      } else {
        if (Platform.OS === "android") {
          router.push("/client/subscription");
        } else if (Platform.OS === "ios") {
          return;
        }
      }
    } else if (userType === "guest") {
      setGuestModalVisible(true);
    } else {
      // Show meal selection modal instead of directly going to scanner
      fetchTodayDiet();
    }
  };

  const fetchTodayDiet = async () => {
    const clientId = await AsyncStorage.getItem("client_id");
    setIsLoading(true);
    try {
      const today = toIndianISOString(new Date()).split("T")[0];

      const response = await getClientDietAPI(clientId, today);

      if (response?.status === 200) {
        setDietTemplate(response?.data || []);
        setIsModalVisible(true);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Could not fetch diet data",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedMeal(null);
  };

  const handleMealSelect = (meal) => {
    setSelectedMeal(meal);
    closeModal();
    router.push({
      pathname: "/client/(diet)/foodscanner",
      params: {
        selectedMeal: JSON.stringify(meal),
        template: JSON.stringify(dietTemplate),
      },
    });
  };
  return (
    <View style={[styles.container, deviceIsTablet && styles.containerTablet]}>
      <TouchableOpacity activeOpacity={0.8} onPress={scanFoods}>
        <View
          style={[
            styles.cardContainer,
            deviceIsTablet && styles.cardContainerTablet,
          ]}
        >
          <View
            style={[
              styles.top,
              { flexDirection: "row", gap: 0, alignItems: "center" },
            ]}
          >
            <Text style={[styles.title, deviceIsTablet && styles.titleTablet]}>
              Scan Your Food
            </Text>
            {isPureFreemium(plan) && oneTimeScan && <TryOnce size={12} />}
            {isPureFreemium(plan) && !oneTimeScan && (
              <Image
                source={require("../../../../assets/images/lock.png")}
                style={{ width: 16, height: 16 }}
              />
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.progressContainer}>
              <Image
                source={require("../../../../assets/images/home/qr_code.png")}
                style={[styles.qrImage, deviceIsTablet && styles.qrImageTablet]}
              />
            </View>

            <View
              style={[
                styles.infoContainer,
                deviceIsTablet && styles.infoContainerTablet,
              ]}
            >
              <View
                style={[styles.infoRow, deviceIsTablet && styles.infoRowTablet]}
              >
                <Text
                  style={[
                    styles.scanText,
                    deviceIsTablet && styles.scanTextTablet,
                  ]}
                >
                  Scan to unlock your meal's nutrition.
                </Text>
              </View>
              <View
                style={[
                  styles.nutritionContainer,
                  deviceIsTablet && styles.nutritionContainerTablet,
                ]}
              >
                <View>
                  <Image
                    source={require("../../../../assets/images/home/calories_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
                <View>
                  <Image
                    source={require("../../../../assets/images/home/carbs_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
                <View>
                  <Image
                    source={require("../../../../assets/images/home/protein_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
                <View>
                  <Image
                    source={require("../../../../assets/images/home/fat_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
                <View>
                  <Image
                    source={require("../../../../assets/images/home/fiber_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
                <View>
                  <Image
                    source={require("../../../../assets/images/home/sugar_home.png")}
                    style={[
                      styles.nutritionIcon,
                      deviceIsTablet && styles.nutritionIconTablet,
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.dummyContainer}></View>

            <View
              style={[
                styles.characterContainer,
                deviceIsTablet && styles.characterContainerTablet,
              ]}
            >
              <Image
                source={
                  gender?.toLowerCase() === "male"
                    ? require("../../../../assets/images/home/scan_male.png")
                    : require("../../../../assets/images/home/scan_female.png")
                }
                style={[
                  styles.characterImage,
                  deviceIsTablet && styles.characterImageTablet,
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Meal Selection Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={modalStyles.modalOverlay}>
          <View
            style={[modalStyles.modalContent, { paddingBottom: insets.bottom }]}
          >
            <LinearGradient
              colors={["#28A745", "#007BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle}>
                  Select Meal to Log Food
                </Text>
                <TouchableOpacity
                  onPress={closeModal}
                  style={modalStyles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView
              style={modalStyles.mealList}
              showsVerticalScrollIndicator={false}
            >
              {dietTemplate.map((meal, index) => (
                <TouchableOpacity
                  key={index}
                  style={modalStyles.mealItem}
                  onPress={() => handleMealSelect(meal)}
                >
                  <View style={modalStyles.mealItemContent}>
                    <View style={modalStyles.mealItemLeft}>
                      <Text style={modalStyles.mealItemTitle}>
                        {meal.title}
                      </Text>
                      <Text style={modalStyles.mealItemSubtitle}>
                        {meal.tagline}
                      </Text>
                      <Text style={modalStyles.mealItemTime}>
                        {meal.timeRange}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Guest Modal */}
      <Modal
        visible={guestModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGuestModalVisible(false)}>
          <View style={modalStyles.guestModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={modalStyles.guestModalContent}>
                <Text style={[modalStyles.guestModalText, { fontWeight: 'bold' }]}>
                  Finish Setting Up Your Account to Access This Feature
                </Text>
                <TouchableOpacity
                  style={modalStyles.guestModalButton}
                  onPress={() => {
                    setGuestModalVisible(false);
                    let pathname = "/register/age-selector";

                    if (registrationSteps) {
                      if (!registrationSteps.dob) {
                        pathname = "/register/age-selector";
                      } else if (registrationSteps.dob && !registrationSteps.goal) {
                        pathname = "/register/seventh-step";
                      } else if (registrationSteps.dob && registrationSteps.goal && !registrationSteps.height) {
                        pathname = "/register/fourth-step";
                      } else if (registrationSteps.dob && registrationSteps.goal && registrationSteps.height && !registrationSteps.weight) {
                        pathname = "/register/fifth-step";
                      } else if (registrationSteps.dob && registrationSteps.goal && registrationSteps.height && registrationSteps.weight && !registrationSteps.body_shape) {
                        pathname = "/register/body-shape-current";
                      } else if (registrationSteps.dob && registrationSteps.goal && registrationSteps.height && registrationSteps.weight && registrationSteps.body_shape && !registrationSteps.lifestyle) {
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
                  <Text style={modalStyles.guestModalButtonText}>Complete Profile</Text>
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
    alignItems: "center",
    width: "100%",
    marginTop: 20,
    marginBottom: 10,
  },
  containerTablet: {
    padding: 0,
    margin: 0,
  },
  cardContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "95%",
    maxWidth: "95%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: isTablet() ? 18 : 14,
    fontWeight: "bold",
    marginHorizontal: 14,
  },
  top: {
    marginTop: 10,
  },
  titleTablet: {
    fontSize: 18,
    marginBottom: 10,
  },
  cardContainerTablet: {
    marginTop: 20,
    width: "103%",
    maxWidth: "103%",
    paddingVertical: 20,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  progressContainer: {
    position: "relative",
    width: "25%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  qrImage: {
    width: 55,
    height: 55,
  },
  qrImageTablet: {
    width: 80,
    height: 80,
  },
  infoContainer: {
    width: "47%",
  },
  infoContainerTablet: {
    width: "42%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    backgroundColor: "#FFFCFD",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 5,
    justifyContent: "center",
  },
  infoRowTablet: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginVertical: 3,
  },
  scanText: {
    fontSize: 9,
    color: "#7D7C7C",
  },
  scanTextTablet: {
    fontSize: 16,
  },
  nutritionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    justifyContent: "center",
    marginTop: 5,
  },
  nutritionContainerTablet: {
    gap: 5,
    marginTop: 5,
  },
  nutritionIcon: {
    width: 26,
    height: 26,
  },
  nutritionIconTablet: {
    width: 50,
    height: 50,
  },
  dummyContainer: {
    width: "25%",
  },
  characterContainer: {
    position: "absolute",
    bottom: -3.5,
    right: 0,
    width: "25%",
    height: "100%",
    zIndex: 100000,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  characterContainerTablet: {
    width: "20%",
    bottom: -20,
  },
  characterImage: {
    width: 85,
    height: 130,
    resizeMode: "contain",
  },
  characterImageTablet: {
    width: "100%",
    height: 160,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: width,
    maxHeight: height * 0.7,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  mealList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: height * 0.6,
  },
  mealItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
    overflow: "hidden",
  },
  mealItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  mealItemLeft: {
    flex: 1,
  },
  mealItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mealItemSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  mealItemTime: {
    fontSize: 11,
    color: "#999",
  },
  guestModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  guestModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.8,
    maxWidth: 400,
  },
  guestModalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  guestModalButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  guestModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ScanCard;
