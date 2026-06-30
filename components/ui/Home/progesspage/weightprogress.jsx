import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from "react-native";

import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { ClientWeightUpdateNew } from "../../../../services/clientApi";
import { showToast } from "../../../../utils/Toaster";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

// Function to determine if device is tablet
const isTablet = () => {
  return width >= 768;
};

// Custom Circular Progress Component with Gradient (similar to attendance card)
const CircularProgress = ({ percentage, size = 70, showText = true }) => {
  const radius = (size - 8) / 2; // Adjust radius based on size and stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={[styles.circularProgressContainer, { width: size, height: size }]}
    >
      {showText && (
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressPercentage, { fontSize: size * 0.2 }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      )}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(159, 153, 153, 0.3)"
          strokeWidth="6"
        />
        <Defs>
          <SvgLinearGradient
            id="weightProgressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <Stop offset="0%" stopColor="#FFA6A6" />
            <Stop offset="100%" stopColor="#FF5757" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#weightProgressGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const WeightProgressCard = ({
  targetWeight: initialTargetWeight,
  currentWeight: initialCurrentWeight,
  initialWeight: initialStartWeight,
  progress,
  getHomeData,
  gender,
  goal,
  difference,
  characterUrl,
  plan,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [weightData, setWeightData] = useState({
    startWeight: initialStartWeight,
    currentWeight: initialCurrentWeight,
    targetWeight: initialTargetWeight,
    startDate: "10.01.2025",
    currentDate: "20.02.2025",
    targetDate: "20.06.2025",
  });
  const router = useRouter();
  const progressPercentage = Math.round(progress);
  const deviceIsTablet = isTablet();

  const handleInputChange = (field, value) => {
    // Handle empty input - set to '0'
    if (value === "") {
      setWeightData({
        ...weightData,
        [field]: "",
      });
      return;
    }

    // Allow decimal values for weight fields
    if (field.includes("Weight")) {
      // Regex to match decimal numbers
      const regex = /^\d*\.?\d{0,1}$/;
      if (regex.test(value)) {
        setWeightData({
          ...weightData,
          [field]: value,
        });
      }
    } else {
      setWeightData({
        ...weightData,
        [field]: value,
      });
    }
  };

  const formatWeightValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    // Convert to string if it's a number
    const stringValue = typeof value === "number" ? value.toString() : value;

    // Return the value as is to preserve decimal places
    return stringValue;
  };

  const formatWeightDisplay = (value) => {
    if (value === null || value === undefined || value === "" || value === 0) {
      return "0.0";
    }

    const numValue = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return "0.0";
    }

    // Always show one decimal place for outer card display
    return numValue.toFixed(1);
  };

  const handleInputFocus = (field) => {
    // If the current value is '0', clear it when focused
    if (weightData[field] === "0") {
      setWeightData({
        ...weightData,
        [field]: "",
      });
    }
  };

  const handleUpdate = async () => {
    if (
      !weightData.startWeight ||
      !weightData.currentWeight ||
      !weightData.targetWeight
    ) {
      alert("Please Fill all the fields");
      return;
    }
    setIsLoading(true);
    const updatedData = {
      ...weightData,
      startWeight:
        typeof weightData.startWeight === "string" &&
        weightData.startWeight === ""
          ? 0
          : parseFloat(weightData.startWeight) || 0,
      currentWeight:
        typeof weightData.currentWeight === "string" &&
        weightData.currentWeight === ""
          ? 0
          : parseFloat(weightData.currentWeight) || 0,
      targetWeight:
        typeof weightData.targetWeight === "string" &&
        weightData.targetWeight === ""
          ? 0
          : parseFloat(weightData.targetWeight) || 0,
    };

    try {
      const payload = {
        type: "weight",
        target_weight: updatedData?.targetWeight,
        actual_weight: updatedData?.currentWeight,
        start_weight: updatedData?.startWeight,
      };
      const response = await ClientWeightUpdateNew(payload);

      if (response?.status === 200) {
        await getHomeData();
        showToast({
          type: "success",
          title: "Success",
          desc: "Weight Stats Set Successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
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
      setModalVisible(false);
    }
  };

  const getTranformationImage = () => {
    if (gender.toLowerCase() === "male") {
      return require("../../../../assets/images/transformation/male/wl80.png");
    } else {
      return require("../../../../assets/images/transformation/female/wl60.png");
    }
  };

  useEffect(() => {
    setModalVisible(false);
    setIsLoading(false);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.cardContainer}>
          <View style={styles.contentContainer}>
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={progressPercentage}
                size={deviceIsTablet ? 90 : 70}
                showText={true}
              />
            </View>

            {/* Weight Info */}
            <View style={styles.infoContainer}>
              {/* Target Weight */}
              <View
                style={[styles.infoRow, deviceIsTablet && styles.infoRowTablet]}
              >
                <View style={[styles.iconContainer]}>
                  <Image
                    source={require("../../../../assets/images/cup.png")}
                    style={[
                      styles.cardImage,
                      deviceIsTablet && styles.cardImageTablet,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.infoLabel,
                    deviceIsTablet && styles.infoLabelTablet,
                  ]}
                >
                  Target
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "40%",
                  }}
                >
                  <Text
                    style={[
                      styles.infoValueTarget,
                      deviceIsTablet && styles.infoValueTablet,
                    ]}
                  >
                    {formatWeightDisplay(weightData.targetWeight)}
                  </Text>
                  <Text
                    style={[
                      styles.infoUnit,
                      deviceIsTablet && styles.infoUnitTablet,
                    ]}
                  >
                    kg
                  </Text>
                </View>
              </View>

              {/* Current Weight */}
              <View
                style={[styles.infoRow, deviceIsTablet && styles.infoRowTablet]}
              >
                <View style={styles.iconContainer}>
                  <Image
                    source={require("../../../../assets/images/arrow1.png")}
                    style={[
                      styles.cardImage,
                      deviceIsTablet && styles.cardImageTablet,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.infoLabel,
                    deviceIsTablet && styles.infoLabelTablet,
                  ]}
                >
                  Current
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "40%",
                  }}
                >
                  <Text
                    style={[
                      styles.infoValueCurrent,
                      deviceIsTablet && styles.infoValueTablet,
                    ]}
                  >
                    {formatWeightDisplay(weightData.currentWeight)}
                  </Text>
                  <Text
                    style={[
                      styles.infoUnit,
                      deviceIsTablet && styles.infoUnitTablet,
                    ]}
                  >
                    kg
                  </Text>
                </View>
              </View>

              {/* Initial Weight */}
              <View
                style={[styles.infoRow, deviceIsTablet && styles.infoRowTablet]}
              >
                <View style={styles.iconContainer}>
                  <Image
                    source={require("../../../../assets/images/arrow2.png")}
                    style={[
                      styles.cardImage,
                      deviceIsTablet && styles.cardImageTablet,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.infoLabel,
                    deviceIsTablet && styles.infoLabelTablet,
                  ]}
                >
                  Initial
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "40%",
                  }}
                >
                  <Text
                    style={[
                      styles.infoValueInitial,
                      deviceIsTablet && styles.infoValueTablet,
                    ]}
                  >
                    {formatWeightDisplay(weightData.startWeight)}
                  </Text>
                  <Text
                    style={[
                      styles.infoUnit,
                      deviceIsTablet && styles.infoUnitTablet,
                    ]}
                  >
                    kg
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.characterContainer}>
              <Image
                source={characterUrl || getTranformationImage()}
                style={[
                  styles.characterImage,
                  deviceIsTablet && styles.characterImageTablet,
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setWeightData({
              startWeight: initialStartWeight,
              currentWeight: initialCurrentWeight,
              targetWeight: initialTargetWeight,
              startDate: "10.01.2025",
              currentDate: "20.02.2025",
              targetDate: "20.06.2025",
            });
            setModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback
              onPress={(e) => {
                e.stopPropagation();
              }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    {/* <Image
                      source={require("../../../../assets/images/journey.png")}
                      style={styles.modalIcon}
                      // tintColor={"#FF5757"}
                    /> */}
                    <Text style={styles.modalTitle}>
                      Update your Weight journey
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setWeightData({
                        startWeight: initialStartWeight,
                        currentWeight: initialCurrentWeight,
                        targetWeight: initialTargetWeight,
                        startDate: "10.01.2025",
                        currentDate: "20.02.2025",
                        targetDate: "20.06.2025",
                      });
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <View>
                  <Text style={styles.modalTitleSub}>
                    Click on the weight values to change and update
                  </Text>
                </View>
                <View style={styles.card}>
                  <LinearGradient
                    colors={["#FF5757", "#FFA6A6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressHeader}
                  >
                    <Text style={styles.progressHeaderText}>
                      Your Weight Progress
                    </Text>
                  </LinearGradient>

                  <View style={styles.circleProgressContainer}>
                    <View style={styles.startSection}>
                      <Text style={styles.sectionLabel}>START</Text>
                      <View style={styles.weightInputContainer}>
                        <TextInput
                          style={styles.weightInput}
                          value={formatWeightValue(weightData.startWeight)}
                          onChangeText={(value) =>
                            handleInputChange("startWeight", value)
                          }
                          onFocus={() => handleInputFocus("startWeight")}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        <Text style={styles.unitText}>kg</Text>
                      </View>
                    </View>

                    <View style={styles.circleProgress}>
                      <View style={styles.circleInner}>
                        <Text style={styles.todayLabel}>TODAY</Text>
                        <View style={styles.currentWeightContainer}>
                          <TextInput
                            style={styles.currentWeightInput}
                            value={formatWeightValue(weightData.currentWeight)}
                            onChangeText={(value) =>
                              handleInputChange("currentWeight", value)
                            }
                            onFocus={() => handleInputFocus("currentWeight")}
                            keyboardType="numeric"
                            maxLength={5}
                          />
                          <Text style={styles.kgLabel}>kg</Text>
                        </View>
                        <Text style={styles.currentDateText}></Text>
                      </View>
                      <View style={styles.progressIndicator}>
                        <CircularProgress
                          percentage={progressPercentage}
                          size={90}
                          showText={false}
                        />
                      </View>
                    </View>

                    <View style={styles.targetSection}>
                      <Text style={styles.sectionLabel}>TARGET</Text>
                      <View style={styles.weightInputContainer}>
                        <TextInput
                          style={styles.weightInput}
                          value={formatWeightValue(weightData.targetWeight)}
                          onChangeText={(value) =>
                            handleInputChange("targetWeight", value)
                          }
                          onFocus={() => handleInputFocus("targetWeight")}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        <Text style={styles.unitText}>kg</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.percentageContainer}>
                    <Text style={styles.percentageValue}>
                      {progressPercentage}%
                    </Text>
                    <Text style={styles.percentageLabel}>Complete</Text>
                  </View>

                  <TouchableOpacity onPress={handleUpdate} disabled={isLoading}>
                    <LinearGradient
                      colors={["#FF5757", "#FFA6A6"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.updateButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator />
                      ) : (
                        <Text style={styles.updateButtonText}>Update</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <Text style={styles.infoText}>
                  Update your target weight on your new journey.
                </Text>
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
  },
  cardContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: isTablet() ? "98%" : "95%",
    maxWidth: isTablet() ? "98%" : "95%",
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
    marginTop: 10,
  },
  contentContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    position: "relative",
    width: "25%",
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  // Updated styles for the new CircularProgress component
  circularProgressContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  progressTextContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  progressPercentage: {
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  percentageText: {
    position: "absolute",
    fontSize: 20,
    fontWeight: "bold",
    color: "#9C27B0",
  },
  infoContainer: {
    width: isTablet() ? "42%" : "35%",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    backgroundColor: "rgba(64, 175, 176, 0.08)",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: "space-between",
    // gap: 5,
  },
  infoRowTablet: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginVertical: 3,
  },
  iconContainer: {
    alignItems: "center",
    width: "20%",
  },
  infoLabel: {
    flex: 1,
    marginLeft: 4,
    fontSize: 10,
    color: "#333333",
    width: "40%",
  },
  infoLabelTablet: {
    fontSize: 12,
    marginLeft: 6,
  },
  infoValueTarget: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFA828",
    marginRight: 3,
  },
  infoValueCurrent: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#3C9107",
    marginRight: 5,
  },
  infoValueInitial: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F34646",
    marginRight: 5,
  },
  infoValueTablet: {
    fontSize: 16,
    marginRight: 6,
  },
  infoUnit: {
    fontSize: 10,
    color: "#9E9E9E",
  },
  infoUnitTablet: {
    fontSize: 12,
  },
  characterContainer: {
    flexDirection: "row",
    width: isTablet() ? "30%" : "37%",
    alignItems: "center",
    marginTop: 10,
  },
  characterImage: {
    width: "100%",
    height: 100,
    resizeMode: "cover",
  },
  characterImageTablet: {
    height: 160,
  },
  cardImage: {
    width: 12,
    height: 12,
  },
  cardImageTablet: {
    width: 16,
    height: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7b2cbf",
  },
  progressTextTablet: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 25,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  modalTitleSub: {
    fontSize: 12,
    color: "#aaa",
  },
  closeButton: {
    fontSize: 20,
    color: "#FF5757",
    fontWeight: "bold",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 10,
  },
  progressHeader: {
    width: "100%",
    paddingVertical: 10,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  progressHeaderText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  circleProgressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: 10,
    marginTop: 10,
    paddingHorizontal: 15,
  },
  startSection: {
    alignItems: "center",
    width: "25%",
  },
  targetSection: {
    alignItems: "center",
    width: "25%",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 5,
  },
  weightInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  weightInput: {
    fontSize: 14,
    fontWeight: "bold",
    minWidth: 40,
    textAlign: "center",
  },
  unitText: {
    fontSize: 12,
    color: "#9E9E9E",
    marginLeft: 2,
  },
  dateText: {
    fontSize: 10,
    color: "#9E9E9E",
    marginTop: 3,
  },
  circleProgress: {
    position: "relative",
    width: "50%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  progressIndicator: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  circleInner: {
    position: "absolute",
    zIndex: 10,
    alignItems: "center",
  },
  todayLabel: {
    fontSize: 12,
    color: "#757575",
    marginBottom: 5,
  },
  currentWeightContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 40,
  },
  currentWeightInput: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
    textAlign: "center",
  },
  kgLabel: {
    fontSize: 12,
    color: "#9E9E9E",
    marginLeft: 5,
  },
  currentDateText: {
    fontSize: 12,
    color: "#9E9E9E",
    marginTop: 3,
  },
  percentageContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  percentageValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
  },
  percentageLabel: {
    fontSize: 12,
    color: "#757575",
  },
  infoText: {
    fontSize: 12,
    color: "#757575",
    textAlign: "center",
    marginVertical: 15,
  },
  updateButton: {
    backgroundColor: "#9C27B0",
    paddingVertical: 5,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  updateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  viewJourneyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingVertical: 7,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 5,
  },
  viewJourneyText: {
    color: "#FF5757",
    fontSize: 12,
    fontWeight: "500",
  },
  arrowIcon: {
    color: "#FF5757",
    fontSize: 18,
    marginLeft: 5,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    borderRadius: 20,
    shadowColor: "#00000057",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default WeightProgressCard;
