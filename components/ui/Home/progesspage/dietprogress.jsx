import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import Svg, {
  Circle,
  Path,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import {
  handleFreemiumAccess,
  isPureFreemium,
} from "../../../../config/access";
import PremiumBadge from "../../Payment/premiumbadge";

const { width } = Dimensions.get("window");

const DietProgressTracker = ({
  calories = { actual: 0, target: 0 },
  carbs = { actual: 0, target: 0 },
  protein = { actual: 0, target: 0 },
  fat = { actual: 0, target: 0 },
  fiber = { actual: 0, target: 0 },
  sugar = { actual: 0, target: 0 },
  calcium = 0,
  magnesium = 0,
  sodium = 0,
  potassium = 0,
  iron = 0,
  plan,
  userType,
  registrationSteps,
}) => {
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Calculate percentages for progress indicators with null/undefined safety
  const safeCaloriePercentage =
    (calories?.actual || 0) / (calories?.target || 1);
  const caloriePercentage = Math.min(
    isNaN(safeCaloriePercentage) ? 0 : safeCaloriePercentage * 100,
    100,
  );

  const safeCarbsPercentage = (carbs?.actual || 0) / (carbs?.target || 1);
  const carbsPercentage = Math.min(
    isNaN(safeCarbsPercentage) ? 0 : safeCarbsPercentage,
    1,
  );

  const safeProteinPercentage = (protein?.actual || 0) / (protein?.target || 1);
  const proteinPercentage = Math.min(
    isNaN(safeProteinPercentage) ? 0 : safeProteinPercentage,
    1,
  );

  const safeFatPercentage = (fat?.actual || 0) / (fat?.target || 1);
  const fatPercentage = Math.min(
    isNaN(safeFatPercentage) ? 0 : safeFatPercentage,
    1,
  );

  const safeFiberPercentage = (fiber?.actual || 0) / (fiber?.target || 1);
  const fiberPercentage = Math.min(
    isNaN(safeFiberPercentage) ? 0 : safeFiberPercentage,
    1,
  );

  const safeSugarPercentage = (sugar?.actual || 0) / (sugar?.target || 1);
  const sugarPercentage = Math.min(
    isNaN(safeSugarPercentage) ? 0 : safeSugarPercentage,
    1,
  );

  // Create full circular arc for small indicators - larger radius
  const createCircularArc = (percentage, radius = 35) => {
    // Ensure percentage is a valid number
    const safePercentage =
      isNaN(percentage) || percentage < 0 ? 0 : Math.min(percentage, 1);

    const startAngle = -90; // Start from top
    const endAngle = startAngle + safePercentage * 360;

    const centerX = 40;
    const centerY = 40;
    const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
    const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
    const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
    const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

    const largeArcFlag = safePercentage > 0.5 ? 1 : 0;

    if (safePercentage === 0) return "";
    if (safePercentage >= 1) {
      // For 100%, create a full circle using two arcs
      const midX = centerX + radius;
      const midY = centerY;
      return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${midX} ${midY} A ${radius} ${radius} 0 0 1 ${startX} ${startY}`;
    }

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  const router = useRouter();

  const SmallProgressCircle = ({
    actual,
    target,
    color,
    label,
    iconSource,
    large,
    high,
  }) => {
    const safeActual = actual || 0;
    const safeTarget = target || 1;
    const rawPercentage = safeActual / safeTarget;
    const percentage = Math.min(
      isNaN(rawPercentage) ? 0 : rawPercentage,
      0.9999995,
    );

    return (
      <View style={styles.smallCircleContainer}>
        <View style={styles.smallCircleWrapper}>
          <Svg width="60" height="60" viewBox="0 0 80 80">
            {/* Background circle */}
            <Circle
              cx="40"
              cy="40"
              r="35"
              stroke="#E5E5E5"
              strokeWidth="6"
              fill="none"
            />

            {/* Progress arc */}
            <Path
              d={createCircularArc(percentage, 35)}
              stroke={color}
              strokeLinecap="round"
              strokeWidth="6"
              fill="none"
            />

            {/* Values inside circle */}
            <SvgText
              x="40"
              y="35"
              textAnchor="middle"
              fontSize="14"
              fontWeight="bold"
              fill="#333"
            >
              {`${Math.round(safeActual)}g`}
            </SvgText>
            <SvgText
              x="45"
              y="55"
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {`/${safeTarget}g`}
            </SvgText>
          </Svg>
        </View>

        {/* Icon below circle */}
        <View style={styles.iconContainer}>
          <Image
            source={iconSource}
            style={[
              styles.smallIcon,
              large && styles.largeIcon,
              high && { height: 24 },
            ]}
          />
        </View>

        {/* Label */}
        <Text style={styles.smallCircleLabel}>{label}</Text>
      </View>
    );
  };

  const goTo = () => {
    if (userType === "guest") {
      setGuestModalVisible(true);
    } else {
      handleFreemiumAccess(plan, "/client/myListedFoodLogs");
    }
    // router.push({
    //   pathname: "/client/diet",
    //   params: {
    //     selectedTab: "Reports",
    //   },
    // });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={goTo}>
      <View style={styles.header}>
        <Text style={styles.title}>Diet Progress</Text>
        {isPureFreemium(plan) && (
          <Image
            source={require("../../../../assets/images/lock.png")}
            style={{ width: 20, height: 20 }}
          />
        )}
      </View>

      {/* Main semicircular progress for calories - Using react-native-circular-progress */}
      <View style={styles.mainProgressContainer}>
        <AnimatedCircularProgress
          size={230}
          width={12}
          fill={caloriePercentage}
          tintColor="#1F9C74"
          backgroundColor="#E5E5E5"
          lineCap="round"
          arcSweepAngle={180}
          rotation={270}
          duration={1000}
        >
          {() => (
            <View style={styles.calorieContent}>
              <Text style={styles.goalLabel}>Goal</Text>
              <Text style={styles.calorieValue}>🔥{calories.actual || 0}</Text>
              <Text style={styles.calorieTarget}>
                of {calories.target ? calories.target.toLocaleString() : 0} Kcal
              </Text>
            </View>
          )}
        </AnimatedCircularProgress>
      </View>

      {/* Small circular progress indicators */}
      <View style={styles.smallCirclesContainer}>
        <SmallProgressCircle
          actual={carbs.actual || 0}
          target={carbs.target || 0}
          color="#FF9800"
          label="Carbs"
          iconSource={require("../../../../assets/images/diet/carb.png")}
        />

        <SmallProgressCircle
          actual={protein.actual || 0}
          target={protein.target || 0}
          color="#2196F3"
          label="Protein"
          iconSource={require("../../../../assets/images/diet/protein.png")}
        />

        <SmallProgressCircle
          actual={fat.actual || 0}
          target={fat.target || 0}
          color="#9C27B0"
          label="Fat"
          iconSource={require("../../../../assets/images/diet/fat.png")}
          high
        />

        <SmallProgressCircle
          actual={fiber.actual || 0}
          target={fiber.target || 0}
          color="#FF7043"
          label="Fiber"
          iconSource={require("../../../../assets/images/diet/fiber.png")}
          large
        />

        <SmallProgressCircle
          actual={sugar.actual || 0}
          target={sugar.target || 0}
          color="#4CAF50"
          label="Sugar"
          iconSource={require("../../../../assets/images/diet/sugar.png")}
        />
      </View>

      {/* Micronutrients - Full width below macros */}
      <View style={styles.micronutrientsSection}>
        <View style={styles.micronutrientsHeader}>
          <Text style={styles.micronutrientsTitle}>Micro Nutrients</Text>
          <View style={styles.micronutrientsDivider} />
        </View>
        <View style={styles.micronutrientsRow}>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>{Math.round(calcium || 0)}mg</Text>
            <Text style={styles.microLabel}>Calcium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(magnesium || 0)}mg
            </Text>
            <Text style={styles.microLabel}>Magnesium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>{Math.round(sodium || 0)}mg</Text>
            <Text style={styles.microLabel}>Sodium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>
              {Math.round(potassium || 0)}mg
            </Text>
            <Text style={styles.microLabel}>Potassium</Text>
          </View>
          <View style={styles.microItem}>
            <Text style={styles.microValue}>{Math.round(iron || 0)}mg</Text>
            <Text style={styles.microLabel}>Iron</Text>
          </View>
        </View>
      </View>

      {/* Guest Modal */}
      <Modal
        visible={guestModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGuestModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setGuestModalVisible(false)}>
          <View style={styles.guestModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.guestModalContent}>
                <Text style={[styles.guestModalText, { fontWeight: 'bold' }]}>
                  Finish Setting Up Your Account to Access This Feature
                </Text>
                <TouchableOpacity
                  style={styles.guestModalButton}
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
                      },
                    });
                  }}
                >
                  <Text style={styles.guestModalButtonText}>Complete Profile</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 14,
    marginHorizontal: 10,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "flex-start",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  mainProgressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
    height: 60,
    marginTop: 90,
  },
  calorieContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 20,
  },
  goalLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  calorieValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  calorieTarget: {
    fontSize: 16,
    color: "#666",
  },
  smallCirclesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 30,
    marginTop: 0,
    marginBottom: 10,
  },
  smallCircleContainer: {
    alignItems: "center",
    flex: 1,
  },
  smallCircleWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    marginBottom: 0,
  },
  smallIcon: {
    width: 20,
    height: 20,
  },
  smallCircleLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  largeIcon: {
    width: 24,
  },
  // Micronutrients styles
  micronutrientsSection: {
    marginTop: 4,
    paddingTop: 4,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  micronutrientsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  micronutrientsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  micronutrientsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  microItem: {
    alignItems: "center",
    flex: 1,
  },
  microValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  microLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
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

export default DietProgressTracker;
