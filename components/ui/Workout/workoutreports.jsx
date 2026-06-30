import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Camera } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useState, useRef, forwardRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Image as ExpoImage } from "expo-image";
// import Share from "react-native-share";
import {
  clientReportAPI,
  getClientWorkoutAPI,
} from "../../../services/clientApi";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";
import { showToast } from "../../../utils/Toaster";
import WorkoutCompletionModal from "./workoutcompletionmodal";
import SkeletonWorkout from "./skeletonWorkout";
import FloatingActionButton from "../FloatingButton";
import Constants from "expo-constants";
import { isGymPremium } from "../../../config/access";
import WorkoutStreak from "../Home/progesspage/streak";
import WorkoutCard from "./WorkoutCard";
import DurationDisplay from "../TimeDisplay";
let Share;

if (Constants.executionEnvironment !== "storeClient") {
  // Not Expo Go (so it's a dev build or production)
  Share = require("react-native-share").default;
} else {
  // In Expo Go
  Share = null;
}

const { width, height } = Dimensions.get("window");
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);
const responsiveFontSize = (fontSize) => {
  const standardScreenHeight = 820;
  const standardFontScale = fontSize / standardScreenHeight;
  return Math.round(height * standardFontScale);
};

const isTablet = () => {
  const aspectRatio = height / width;
  return width >= 768 || (width >= 600 && aspectRatio < 1.6);
};

// Shareable Workout Report Component
const ShareableWorkoutReportView = forwardRef(
  (
    {
      report,
      selectedDate,
      totalCalories,
      totalVolume,
      profilePic,
      userName,
      badge,
      xp,
      workoutDetails,
      gender,
    },
    ref,
  ) => {
    const formatDate = (date) => {
      const months = [
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
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };

    const getExerciseCount = () => {
      if (!workoutDetails || workoutDetails.length === 0) return 0;
      return workoutDetails.reduce((total, muscleGroup) => {
        const exercises = Object.values(muscleGroup).flat();
        return total + exercises.length;
      }, 0);
    };

    const getWorkoutDuration = () => {
      return report?.time_spent || "N/A";
    };

    const getMainMuscleGroup = () => {
      if (!workoutDetails || workoutDetails.length === 0) return "N/A";
      // Get the first muscle group as the main one
      const firstWorkout = workoutDetails[0];
      const muscleGroups = Object.keys(firstWorkout);
      return muscleGroups.length > 0 ? muscleGroups[0] : "N/A";
    };

    const getChampionTitle = () => {
      // Use badge details if available
      if (report?.leaderboard?.badge_details) {
        const badgeDetails = report.leaderboard.badge_details;
        return `${badgeDetails.level} ${badgeDetails.badge_name}`;
      }

      return "Not Available";
    };

    return (
      <View ref={ref} style={shareStyles.container}>
        {/* Header with Profile and Leaderboard */}
        <View style={shareStyles.header}>
          <View style={shareStyles.profileSection}>
            <ExpoImage
              source={profilePic}
              style={shareStyles.profilePic}
              contentFit="cover"
            />
            <Text style={shareStyles.userName}>{userName || "User"}</Text>
          </View>

          <View style={shareStyles.leaderboardSection}>
            <View>
              <View style={shareStyles.rankContainer}>
                <Text style={shareStyles.rankNumber}>
                  #{report?.leaderboard?.position || "NA"}
                </Text>
                <Text style={shareStyles.rankLabel}>
                  /{report?.leaderboard?.total_participants || "NA"}
                </Text>
              </View>
              <Text style={shareStyles.leaderboardText}>Leaderboard</Text>
              <View style={shareStyles.xpContainer}>
                <Text style={shareStyles.xpText}>
                  {report?.leaderboard?.xp || xp || "0"} xp
                </Text>
              </View>
            </View>
            <View>
              <View style={shareStyles.badgeContainer}>
                <ExpoImage
                  source={
                    report?.leaderboard?.badge_details?.image_url
                      ? { uri: report.leaderboard.badge_details.image_url }
                      : badge
                  }
                  style={shareStyles.badgeImage}
                  contentFit="cover"
                />
              </View>
              <Text style={shareStyles.championText}>{getChampionTitle()}</Text>
            </View>
          </View>
        </View>

        {/* Workout Report Heading */}
        <Text style={shareStyles.dietReportTitle}>
          Workout Report for {formatDate(selectedDate)}
        </Text>

        {/* Calories Section */}
        <View style={shareStyles.caloriesBox}>
          <View style={shareStyles.caloriesContent}>
            <ExpoImage
              source={require("../../../assets/images/calories.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View
              style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
            >
              <Text style={shareStyles.caloriesValue}>
                {totalCalories ? totalCalories.toFixed(0) : "0"}
              </Text>
              <Text style={{ color: "#005B8E99" }}>kcal</Text>
            </View>
          </View>
          <View>
            <Text style={{ textAlign: "center", fontSize: 12 }}>
              Calories Burnt
            </Text>
          </View>
        </View>

        {/* First Row - Protein, Carbs, Fat */}
        <View style={shareStyles.macrosRow}>
          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/kgs.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <View
                style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
              >
                <Text style={shareStyles.macroValue}>
                  {totalVolume ? totalVolume.toFixed(0) : "0"}
                </Text>
                <Text style={{ color: "#005B8E99" }}>kg</Text>
              </View>
              <Text style={shareStyles.macroLabel}>Volume</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/workout/dumbell.png")}
              style={shareStyles.macroIcon}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <Text style={shareStyles.macroValue}>{getExerciseCount()}</Text>
              <Text style={shareStyles.macroLabel}>Exercises</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/noone.png")}
              style={[shareStyles.macroIcon]}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <Text style={shareStyles.macroValue}>
                {report?.top_performing_muscle_group?.muscle_group ||
                  getMainMuscleGroup()}
              </Text>
              <Text style={shareStyles.macroLabel}>Muscle Group</Text>
            </View>
          </View>
        </View>

        {/* Second Row - Fiber, Sugar, Streak */}
        <View style={shareStyles.macrosRow}>
          <View style={shareStyles.macroBox}>
            <View style={shareStyles.macroInside}>
              <Text style={shareStyles.macroValue}>
                {report?.time_spent || "0 h 0 min"}
              </Text>

              <Text style={shareStyles.macroLabel}>Gym Time</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/steps.png")}
              style={[shareStyles.macroIcon, { width: 28 }]}
              contentFit="contain"
            />
            <View style={shareStyles.macroInside}>
              <Text style={shareStyles.macroValue}>
                {report?.step_count || "2000"}
              </Text>
              <Text style={shareStyles.macroLabel}>Step Count</Text>
            </View>
          </View>

          <View style={shareStyles.macroBox}>
            <ExpoImage
              source={require("../../../assets/images/bmi.png")}
              style={[shareStyles.macroIcon, { width: 28 }]}
              contentFit="contain"
            />
            <View style={[shareStyles.macroInside]}>
              <Text style={shareStyles.macroValue}>{report?.bmi || "NA"}</Text>
              <Text style={[shareStyles.macroLabel]}>BMI Count</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={shareStyles.footer}>
          <View style={shareStyles.footerLeft}>
            <ExpoImage
              source={require("../../../assets/images/footer.png")}
              style={shareStyles.footerLogo}
              contentFit="contain"
            />
            {/* <View style={shareStyles.brandContainer}>
              <View style={shareStyles.brandNameContainer}>
                <Text style={shareStyles.fittText}>Fitt</Text>
                <Text style={shareStyles.botText}>bot</Text>
              </View>
              <Text style={shareStyles.websiteText}>www.fittbot.com</Text>
            </View> */}
          </View>

          {/* <View style={shareStyles.footerRight}>
            <View style={shareStyles.storeImagesContainer}>
              <ExpoImage
                source={require("../../../assets/images/workout/report_google.png")}
                style={shareStyles.storeImage}
                contentFit="contain"
              />
              <ExpoImage
                source={require("../../../assets/images/workout/report_ios.png")}
                style={shareStyles.storeImage}
                contentFit="contain"
              />
            </View>
          </View> */}
        </View>
      </View>
    );
  },
);

const shareStyles = StyleSheet.create({
  container: {
    width: 380,
    backgroundColor: "white",
    overflow: "hidden",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  leaderboardSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    marginRight: 20,
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  rankLabel: {
    fontSize: 12,
    color: "#666",
  },
  leaderboardText: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  badgeContainer: {
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(40,155,217,0.2)",
    borderRadius: 8,
    paddingVertical: 3,
    paddingTop: 6,
    marginLeft: 2,
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  badgeImage: {
    width: 40,
    height: 50,
    marginBottom: 4,
  },
  xpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  xpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4CAF50",
    marginRight: 4,
  },
  xpText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  championText: {
    fontSize: 8,
    color: "#666",
  },
  workoutReportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 25,
    marginBottom: 5,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  workoutReportImage: {
    width: 360,
    height: 160,
  },
  timingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 15,
  },
  timingBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    flex: 0.3,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  timingIcon: {
    width: 30,
    height: 30,
    marginBottom: 5,
  },
  timingLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  timingValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  durationBox: {
    backgroundColor: "rgba(32,52,2,0.08)",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    flex: 0.35,
    borderWidth: 1,
    borderColor: "rgba(32,52,2,0.08)",
  },
  durationLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 5,
  },
  durationValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    paddingVertical: 10,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  statInside: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  statIcon: {
    width: 22,
    height: 22,
    marginRight: 5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginRight: 3,
  },
  statUnit: {
    fontSize: 10,
    color: "#666",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  streakSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  streakBox: {
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    borderRadius: 12,
    padding: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 107, 53, 0.2)",
  },
  streakValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
    marginBottom: 5,
  },
  streakLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  dietReportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 25,
    marginBottom: 5,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  dietReportImage: {
    width: 350,
    height: 160,
  },
  caloriesBox: {
    backgroundColor: "#D4EBF7",
    marginTop: -5,
    borderRadius: 15,
    padding: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D4EBF7",
    width: "50%",
    margin: "auto",
  },
  caloriesContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  caloriesValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007CC3",
    marginLeft: 8,
  },
  caloriesTarget: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  macroBox: {
    backgroundColor: "#D4EBF7",
    borderRadius: 12,
    padding: 12,
    paddingVertical: 8,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#D4EBF7",
    flexDirection: "row",
    alignItems: "center",
  },
  macroInside: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  macroIcon: {
    width: 22,
    height: 22,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007CC3",
    marginLeft: 5,
  },
  macroTarget: {
    fontSize: 12,
    color: "#666",
  },
  macroLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    marginTop: 5,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  footerLogo: {
    width: 330,
    height: 45,
    marginRight: 8,
  },
  brandContainer: {
    flex: 1,
  },
  brandNameContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  fittText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF5757",
  },
  botText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  websiteText: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  footerRight: {
    alignItems: "center",
  },
  getItOnText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  storeImagesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  storeImage: {
    width: 70,
    height: 30,
  },
  // Preview Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 0,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "90%",
  },
  previewScrollView: {
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    marginHorizontal: 5,
  },
  shareButton: {
    backgroundColor: "#007BFF",
  },
  cancelButton: {
    backgroundColor: "#6C757D",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginTop: 10,
  },
  // Preview Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 0,
    borderRadius: 20,
    overflow: "hidden",
    maxHeight: "90%",
  },
  previewScrollView: {
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    backgroundColor: "#F8F9FA",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    marginHorizontal: 5,
  },
  shareButton: {
    backgroundColor: "#007BFF",
  },
  cancelButton: {
    backgroundColor: "#6C757D",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    borderRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007BFF",
    marginTop: 10,
  },
});

const DeleteConfirmationModal = ({ visible, onClose, onConfirm, photoUri }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Delete Photo?</Text>
          <Text style={styles.confirmModalMessage}>
            Are you sure you want to delete this photo? This action cannot be
            undone.
          </Text>
          <View style={styles.confirmModalButtons}>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmModalButton, styles.deleteButton]}
              onPress={() => onConfirm(photoUri)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const WeekdayButton = ({ day, date, isActive, onPress, fullDate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buttonDate = new Date(fullDate);
  buttonDate.setHours(0, 0, 0, 0);
  const isFutureDate = buttonDate > today;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "space-between",
        marginHorizontal: 7,
      }}
      disabled={isFutureDate}
    >
      <View
        style={[
          styles.weekdayButton,
          isActive && styles.activeWeekdayButton,
          isFutureDate && styles.disabledWeekdayButton,
        ]}
      >
        <Text
          style={[
            styles.weekdayText,
            isActive && styles.activeWeekdayText,
            isFutureDate && styles.disabledWeekdayText,
          ]}
        >
          {date}
        </Text>
      </View>
      <Text
        style={[
          styles.weekdayLabel,
          isActive && styles.activeWeekdayLabel,
          isFutureDate && styles.disabledWeekdayLabel,
        ]}
      >
        {day}
      </Text>
    </TouchableOpacity>
  );
};

const WorkoutReports = (props) => {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [workoutDetails, setWorkoutDetails] = useState(null);
  const [selectedTab, setSelectedTab] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const shareViewRef = useRef();
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const router = useRouter();
  const [workoutCompletionVisible, setWorkoutCompletionVisible] =
    useState(false);
  const [image, setImage] = useState(null);
  const {
    onSectionChange,
    scrollEventThrottle,
    onScroll,
    headerHeight,
    gender,
    profilePic,
    userName,
    badge,
    xp,
  } = props;
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const deviceIsTablet = isTablet();

  // Helper functions from ExerciseCard
  const getSetNumberColor = (index) => {
    const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FECA57"];
    return colors[index % colors.length];
  };

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}.${seconds.toString().padStart(2, "0")}`;
  };

  // Determine exercise type based on the sets data
  const getExerciseType = (exercise) => {
    if (!exercise.sets || exercise.sets.length === 0) return "regular";

    const firstSet = exercise.sets[0];
    const hasReps = firstSet.reps > 0;
    const hasWeight = firstSet.weight > 0;

    if (!hasReps && !hasWeight) return "cardio";
    if (hasReps && !hasWeight) return "bodyweight";
    return "regular";
  };

  // Render sets header similar to ExerciseCard
  const renderSetsHeader = (exercise) => {
    const exerciseType = getExerciseType(exercise);

    const getHeaderColumns = () => {
      if (exerciseType === "cardio") {
        return [
          { icon: "time", name: "Duration", unit: "minutes", color: "#4ECDC4" },
          { icon: "flame", name: "Cal", unit: "kcal", color: "#FF6B6B" },
        ];
      } else if (exerciseType === "bodyweight") {
        return [
          { icon: "time", name: "Duration", unit: "minutes", color: "#4ECDC4" },
          { icon: "repeat", name: "Reps", unit: "", color: "#45B7D1" },
          { icon: "flame", name: "Cal", unit: "kcal", color: "#FF6B6B" },
        ];
      } else {
        return [
          { icon: "time", name: "Duration", unit: "minutes", color: "#4ECDC4" },
          { icon: "repeat", name: "Reps", unit: "", color: "#45B7D1" },
          { icon: "flame", name: "Cal", unit: "kcal", color: "#FF6B6B" },
          {
            icon: "weight-kilogram",
            name: "Weight",
            unit: "kg",
            color: "#9B59B6",
            isFA: true,
          },
        ];
      }
    };

    const headerColumns = getHeaderColumns();
    const hasWeight = exerciseType === "regular";
    const headerFontSize = hasWeight ? 9 : 11;

    return (
      <View style={styles.setsHeaderContainer}>
        <View style={styles.setsHeaderRow}>
          <View style={styles.headerSetColumn}>
            <Ionicons name="fitness" size={16} color="#FF6B6B" />
            <Text
              style={[
                styles.headerText,
                { fontSize: responsiveFontSize(headerFontSize) },
              ]}
            >
              Sets
            </Text>
          </View>

          <View style={styles.headerDataContainer}>
            {headerColumns.map((column, index) => (
              <View key={index} style={styles.headerIconContainer}>
                <View style={styles.headerIconAndTitle}>
                  {column.isFA ? (
                    <MaterialCommunityIcons
                      name={column.icon}
                      size={14}
                      color={column.color}
                    />
                  ) : (
                    <Ionicons
                      name={column.icon}
                      size={14}
                      color={column.color}
                    />
                  )}
                  <Text
                    style={[
                      styles.headerText,
                      { fontSize: responsiveFontSize(headerFontSize) },
                    ]}
                  >
                    {column.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render individual set item similar to ExerciseCard
  const renderSetItem = ({ item: set, index: setIndex, exercise }) => {
    const exerciseType = getExerciseType(exercise);

    return (
      <View style={styles.newSetItem}>
        <View style={styles.setRowContent}>
          <View style={styles.setNumberContainer}>
            <View
              style={[
                styles.setNumberCircle,
                { backgroundColor: getSetNumberColor(setIndex) },
              ]}
            >
              <Text style={styles.setNumber}>{setIndex + 1}</Text>
            </View>
          </View>

          <View style={styles.setDataContainer}>
            {exerciseType === "cardio" ? (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {set.calories.toFixed(2)}
                    <Text style={styles.setDataLabel}>kcal</Text>
                  </Text>
                </View>
              </>
            ) : exerciseType === "bodyweight" ? (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.reps}</Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {set.calories.toFixed(2)}
                    <Text style={styles.setDataLabel}>kcal</Text>
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {formatDuration(set.duration)}
                    <Text style={styles.setDataLabel}>&nbsp;min</Text>
                  </Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>{set.reps}</Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {set.calories.toFixed(2)}
                    <Text style={styles.setDataLabel}>kcal</Text>
                  </Text>
                </View>
                <View style={styles.setDataColumn}>
                  <Text style={styles.setDataValue}>
                    {set.weight}
                    <Text style={styles.setDataLabel}>kg</Text>
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Function to show preview modal
  const handlePreview = () => {
    if (!report && (!workoutDetails || workoutDetails.length === 0)) {
      showToast({
        type: "error",
        title: "Error",
        desc: "No workout data available to share",
      });
      return;
    }
    setShowPreviewModal(true);
  };

  // Function to handle actual sharing
  //   const handleShare = async () => {
  //     try {
  //       setIsGeneratingShare(true);

  //       // Capture the view as image
  //       const uri = await captureRef(shareViewRef, {
  //         format: "png",
  //         quality: 1,
  //         result: "tmpfile",
  //       });

  //       setIsGeneratingShare(false);
  //       setShowPreviewModal(false);

  //       const shareMessage = `Start your Fitness journey with Fittbot Now!

  // 📱 Download Fittbot:
  // Android: https://play.google.com/store/apps/details?id=com.fittbot.fittbot_user&hl=en_IN
  // iOS: https://apps.apple.com/us/app/fittbot/id6747237294`;

  //       // Check if sharing is available
  //       if (await Sharing.isAvailableAsync()) {
  //         await Sharing.shareAsync(uri, {
  //           mimeType: "image/png",
  //           dialogTitle: "Share your workout report",
  //         });
  //       } else {
  //         showToast({
  //           type: "error",
  //           title: "Error",
  //           desc: "Sharing is not available on this device",
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error sharing:", error);
  //       setIsGeneratingShare(false);
  //       setShowPreviewModal(false);
  //       showToast({
  //         type: "error",
  //         title: "Error",
  //         desc: "Failed to generate shareable image",
  //       });
  //     }
  //   };

  const handleShare = async () => {
    try {
      setIsGeneratingShare(true);

      // Capture the view as image
      const uri = await captureRef(shareViewRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const shareMessage = `Start your Fitness journey with Fymble Now!

📱 Download Fymble App: https://fymble.app/download`;

      setIsGeneratingShare(false);
      setShowPreviewModal(false);

      const shareOptions = {
        title: "My Workout Report - Fymble",
        message: shareMessage,
        url: `file://${uri}`,
        filename: "workout-report.png",
      };

      try {
        const result = await Share.open(shareOptions);

        if (result.success) {
          showToast({
            type: "success",
            title: "Shared Successfully",
            desc: "Your workout report has been shared!",
          });
        }
      } catch (shareError) {
        // Handle specific error cases
        if (shareError.message === "User did not share") {
          // User cancelled sharing - this is normal, don't show error
          return;
        }

        // Fallback to Expo sharing if react-native-share fails
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share your workout report",
          });

          showToast({
            type: "success",
            title: "Shared Successfully",
            desc: "Your workout report has been shared!",
          });
        } else {
          throw new Error("No sharing method available");
        }
      }
    } catch (error) {
      console.error("Error sharing:", error);
      setIsGeneratingShare(false);
      setShowPreviewModal(false);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to share workout report",
      });
    }
  };

  // Function to close preview modal
  const handleClosePreview = () => {
    setShowPreviewModal(false);
  };

  // Fetch client ID from AsyncStorage on component mount
  useEffect(() => {
    const fetchClientId = async () => {
      try {
        const storedClientId = await AsyncStorage.getItem("client_id");
        if (storedClientId) {
          setClientId(storedClientId);
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc: "Client ID not found. Please login again.",
          });
        }
      } catch (error) {
        console.error("Error fetching client ID:", error);
        showToast({
          type: "error",
          title: "Error",
          desc: "Failed to fetch user information",
        });
      }
    };

    fetchClientId();
  }, []);

  const formatHeaderDate = (date) => {
    const months = [
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
    const day = date.getDate();
    const month = months[date.getMonth()];

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${month} ${day}`;
    }
    return `${month} ${day}`;
  };

  const generateWeekDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDate = new Date(selectedDate);
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - 3);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const isSelected = date.toDateString() === selectedDate.toDateString();

      weekDays.push({
        day: days[date.getDay()],
        date: date.getDate(),
        fullDate: new Date(date),
        isActive: isSelected,
      });
    }

    return weekDays;
  };

  const selectDayFromStrip = (fullDate) => {
    const newSelectedDate = new Date(fullDate);
    newSelectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newSelectedDate > today) {
      return;
    }
    setSelectedDate(newSelectedDate);
  };

  const toggleExerciseExpand = (exerciseId) => {
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId);
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);

    if (newDate > today) return;
    setSelectedDate(newDate);
  };

  const getSavedPhotosByDate = async (date) => {
    if (!clientId) return [];

    try {
      const dirUri = `${FileSystem.documentDirectory}FymbleImages/`;
      const dirInfo = await FileSystem.getInfoAsync(dirUri);

      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(dirUri);
      const formattedDate = formatDateForAPI(date);

      // Filter files by client ID and date
      const dateFiles = files.filter((filename) => {
        // Check if file belongs to current client
        if (!filename.startsWith(`${clientId}_`)) {
          return false;
        }

        // Extract date from filename (format is clientId_randomId_date.jpg)
        const parts = filename.split("_");
        if (parts.length < 3) return false;

        const dateStr = parts[2]?.split(".")[0];
        return dateStr && dateStr === formattedDate;
      });

      if (dateFiles.length === 0) {
        return [];
      }

      const imagePaths = dateFiles.map((file) => `${dirUri}${file}`);
      return imagePaths;
    } catch (error) {
      console.error("Error fetching photos:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: `Failed to load images: ${error.message}`,
      });
      return [];
    }
  };

  const generateFilename = () => {
    if (!clientId) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Client ID not found. Cannot save image.",
      });
      return null;
    }

    const randomId = Math.random().toString().slice(2, 10);
    const date = toIndianISOString(new Date()).split("T")[0];
    return `${clientId}_${randomId}_${date}.jpg`;
  };

  const setupImageDirectory = async () => {
    const dirUri = `${FileSystem.documentDirectory}FymbleImages/`;
    const dirInfo = await FileSystem.getInfoAsync(dirUri);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }

    return dirUri;
  };

  const handleDeletePhoto = async (photoUri) => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photoUri);
        const updatedPhotos = await getSavedPhotosByDate(selectedDate);
        setSavedPhotos(updatedPhotos);
        setDeleteModalVisible(false);
        if (selectedPhoto === photoUri) {
          setPhotoModalVisible(false);
        }
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to delete the photo. Please try again later",
      });
    }
  };

  const formatDateForAPI = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const confirmDeletePhoto = (photoUri) => {
    setPhotoToDelete(photoUri);
    setDeleteModalVisible(true);
  };

  const handleImageUpload = async () => {
    setWorkoutCompletionVisible(false);

    if (!clientId) {
      showToast({
        type: "error",
        title: "Error",
        desc: "User not authenticated. Please login again.",
      });
      return;
    }

    try {
      // Request camera permissions with proper error handling
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();

      if (cameraStatus !== "granted") {
        showToast({
          type: "error",
          title: "Camera Permission Required",
          desc: "Please enable camera permissions in your device settings to take photos.",
        });
        setWorkoutCompletionVisible(true);
        return;
      }

      // For iOS, also request media library permissions
      if (Platform.OS === "ios") {
        const { status: mediaLibraryStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (mediaLibraryStatus !== "granted") {
        }
      }

      const dirUri = await setupImageDirectory();
      const newFilename = generateFilename();

      if (!newFilename) {
        setWorkoutCompletionVisible(true);
        return;
      }

      const newFileUri = `${dirUri}${newFilename}`;

      // Enhanced camera options for better iOS compatibility
      const cameraOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Set to false for better iOS compatibility
        aspect: [4, 3],
        quality: Platform.OS === "ios" ? 0.7 : 0.8,
        base64: false, // Set to false to reduce memory usage
        exif: false, // Disable EXIF data for faster processing
      };

      // Add iOS-specific options
      if (Platform.OS === "ios") {
        cameraOptions.presentationStyle =
          ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN;
      }

      const result = await ImagePicker.launchCameraAsync(cameraOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        // Delete previous image if exists
        if (image) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(image);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(image);
            }
          } catch (deleteError) {}
        }

        // Copy the image to our directory
        try {
          await FileSystem.copyAsync({
            from: selectedAsset.uri,
            to: newFileUri,
          });

          setImage(newFileUri);

          showToast({
            type: "success",
            title: "Success",
            desc: "Photo captured successfully!",
          });
        } catch (copyError) {
          showToast({
            type: "error",
            title: "Error",
            desc: "Failed to save the image. Please try again.",
          });
        }
      } else {
      }
    } catch (error) {
      console.error("Camera error:", error);

      let errorMessage = "Failed to open camera. Please try again.";

      // Provide specific error messages based on the error
      if (error.message?.includes("permission")) {
        errorMessage =
          "Camera permission is required. Please enable it in Settings.";
      } else if (error.message?.includes("unavailable")) {
        errorMessage = "Camera is not available on this device.";
      } else if (error.message?.includes("cancelled")) {
        errorMessage = "Camera was cancelled.";
      }

      showToast({
        type: "error",
        title: "Camera Error",
        desc: errorMessage,
      });
    } finally {
      setWorkoutCompletionVisible(true);
    }
  };

  const showDate = (event, selected) => {
    // On iOS, the picker stays open until explicitly closed
    // On Android, it closes automatically after selection
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    // Update the date if one was selected (not cancelled)
    if (selected) {
      if (selected > today) return;
      setSelectedDate(selected);
      // Close the picker on iOS after selection
      if (Platform.OS === "ios") {
        setShowDatePicker(false);
      }
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      // Handle iOS dismissal
      setShowDatePicker(false);
    }
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    setPhotoModalVisible(true);
  };

  const getReportDetails = async () => {
    if (!clientId) return;

    const formattedDate = formatDateForAPI(selectedDate);
    setIsLoading(true);

    try {
      const response = await clientReportAPI(clientId, formattedDate);

      if (response?.status === 200) {
        setReport(response?.data);
        const photos = await getSavedPhotosByDate(selectedDate);
        setSavedPhotos(photos);
        await fetchWorkoutDetails(formattedDate);
      } else {
        setWorkoutDetails([]);
        setReport(null);
      }
    } catch (error) {
      setWorkoutDetails([]);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkoutDetails = async (formattedDate) => {
    if (!clientId) return;

    try {
      const response = await getClientWorkoutAPI(clientId, formattedDate);

      if (response?.status === 200) {
        const workoutData = response?.data?.workout_details || [];

        setWorkoutDetails(workoutData);

        if (workoutData && workoutData.length > 0) {
          setSelectedTab(Object.keys(workoutData[0])[0] || "");
        } else {
          setSelectedTab(null);
        }
      } else {
        setWorkoutDetails([]);
        setSelectedTab(null);
      }
    } catch (error) {
      setWorkoutDetails([]);
      setSelectedTab(null);
    }
  };

  useEffect(() => {
    if (clientId) {
      getReportDetails();
    }
  }, [selectedDate, clientId]);

  if (isLoading) {
    return <SkeletonWorkout header={false} priority="high" type="reports" />;
  }

  const availableTabs = workoutDetails
    ? [
        ...new Set(
          workoutDetails.flatMap((workout) => Object.keys(workout || {})),
        ),
      ]
    : [];
  const getExercisesForSelectedTab = () => {
    if (!workoutDetails || workoutDetails.length === 0) return [];

    const allExercises = workoutDetails
      .flatMap((workout) =>
        Object.entries(workout || {})
          .filter(([muscleGroup]) => muscleGroup === selectedTab)
          .map(([_, exercises]) => exercises),
      )
      .flat();

    return allExercises;
  };

  const totalCalories = workoutDetails?.reduce((total, muscleGroup) => {
    const exercises = Object.values(muscleGroup).flat();
    exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        total += set.calories;
      });
    });
    return total;
  }, 0);

  const totalVolume = workoutDetails?.reduce((total, muscleGroup) => {
    const exercises = Object.values(muscleGroup).flat();
    exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        total += set.weight * set.reps;
      });
    });
    return total;
  }, 0);

  const getCurrentExercises = getExercisesForSelectedTab();

  return (
    <View style={styles.container}>
      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant="light"
            textColor="#000000"
            onChange={showDate}
            maximumDate={today}
            style={Platform.OS === "ios" ? styles.iosDatePicker : {}}
          />
          {Platform.OS === "ios" && (
            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.confirmButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="slide"
      >
        <View style={shareStyles.modalContainer}>
          <View
            style={[shareStyles.modalContent, { paddingBottom: insets.bottom }]}
          >
            {/* Modal Header */}
            <View style={shareStyles.modalHeader}>
              <Text style={shareStyles.modalHeaderTitle}>Share Preview</Text>
              <TouchableOpacity
                style={shareStyles.closeButton}
                onPress={handleClosePreview}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Preview Content */}
            <ScrollView
              style={shareStyles.previewScrollView}
              showsVerticalScrollIndicator={false}
            >
              <ShareableWorkoutReportView
                key={toIndianISOString(selectedDate)}
                ref={shareViewRef}
                report={report}
                selectedDate={selectedDate}
                totalCalories={totalCalories}
                totalVolume={totalVolume}
                profilePic={profilePic}
                userName={userName}
                badge={badge}
                xp={xp}
                workoutDetails={workoutDetails}
                gender={gender}
              />
            </ScrollView>

            {/* Modal Actions */}
            <View style={shareStyles.modalActions}>
              <TouchableOpacity
                style={[shareStyles.actionButton, shareStyles.cancelButton]}
                onPress={handleClosePreview}
              >
                <Ionicons name="close" size={18} color="white" />
                <Text style={shareStyles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[shareStyles.actionButton, shareStyles.shareButton]}
                onPress={handleShare}
                disabled={isGeneratingShare}
              >
                <Ionicons name="share-social" size={18} color="white" />
                <Text style={shareStyles.actionButtonText}>
                  {isGeneratingShare ? "Sharing..." : "Share"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Loading Overlay */}
            {isGeneratingShare && (
              <View style={shareStyles.loadingOverlay}>
                <Ionicons name="hourglass" size={30} color="#007BFF" />
                <Text style={shareStyles.loadingText}>Generating image...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ padding: 15 }}
        >
          <View style={styles.dateHeader}>
            <View style={styles.dateNavigator}>
              <TouchableOpacity onPress={() => navigateDate(-1)}>
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateHeaderText}>
                  {formatHeaderDate(selectedDate)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigateDate(1)}
                disabled={selectedDate.toDateString() === today.toDateString()}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={
                    selectedDate.toDateString() === today.toDateString()
                      ? "#ccc"
                      : "#000"
                  }
                />
              </TouchableOpacity>
            </View>
            {deviceIsTablet ? (
              // For tablets: Center the days without scrolling
              <View style={styles.weekDayStripTablet}>
                {generateWeekDays().map((item, index) => (
                  <WeekdayButton
                    key={index}
                    day={item.day}
                    date={item.date}
                    isActive={item.isActive}
                    onPress={() => selectDayFromStrip(item.fullDate)}
                    fullDate={item.fullDate}
                  />
                ))}
              </View>
            ) : (
              // For mobile: Keep scrollable horizontal strip
              <ScrollView
                horizontal
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.days}
                style={styles.weekDayStrip}
              >
                {generateWeekDays().map((item, index) => (
                  <WeekdayButton
                    key={index}
                    day={item.day}
                    date={item.date}
                    isActive={item.isActive}
                    onPress={() => selectDayFromStrip(item.fullDate)}
                    fullDate={item.fullDate}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <WorkoutStreak
              workoutData={report?.workout_data?.attendance || []}
            />
          </View>

          <View>
            <WorkoutCard
              title={"Average Gym Time"}
              textColor={"#313131"}
              paraTextColor={"#00000081"}
              buttonTextColor={"#28A745"}
              bg1={"#2fc0e841"}
              bg2={"#FFFFFF"}
              border1={"#28a74629"}
              border2={"#297eb32f"}
              charWidth={140}
              childComponent={
                <DurationDisplay
                  hours={report?.total_gym_time?.hour || 0}
                  minutes={report?.total_gym_time?.minutes || 0}
                />
              }
            />
          </View>

          <View style={styles.workoutDetailsSection}>
            <Text style={styles.sectionTitle}>Workout Details</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsContainer}
            >
              {availableTabs.map((tab, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.tabButton,
                    selectedTab === tab && styles.activeTabButton,
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === tab && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.exerciseList}>
              {getCurrentExercises.length > 0 ? (
                getCurrentExercises.map((exercise, idx) => (
                  <View key={idx} style={styles.exerciseItem}>
                    <TouchableOpacity
                      onPress={() =>
                        toggleExerciseExpand(`${selectedTab}_${idx}`)
                      }
                      style={styles.exerciseHeader}
                    >
                      <View style={styles.exerciseNameContainer}>
                        <Text
                          style={styles.exerciseName}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {exercise.name}
                        </Text>
                        <Text style={styles.setDetails}>
                          {exercise.sets ? `${exercise.sets.length} sets` : ""}
                          {exercise.sets &&
                          exercise.sets.some((set) => set.reps > 0)
                            ? ` • ${Object.values(exercise.sets).reduce(
                                (sum, group) => sum + group.reps,
                                0,
                              )} reps`
                            : ""}
                          {exercise.sets &&
                          exercise.sets.some((set) => set.weight > 0)
                            ? ` • ${Object.values(exercise.sets).reduce(
                                (sum, group) => sum + group.weight,
                                0,
                              )} kg`
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.exerciseMeta}>
                        <Text style={styles.exerciseCalories}>
                          {exercise.sets
                            ? `${Object.values(exercise.sets)
                                .reduce((sum, group) => sum + group.calories, 0)
                                .toFixed(2)} kcal`
                            : ""}
                        </Text>
                        <Ionicons
                          name={
                            expandedExercise === `${selectedTab}_${idx}`
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#555"
                        />
                      </View>
                    </TouchableOpacity>

                    {expandedExercise === `${selectedTab}_${idx}` &&
                      exercise.sets && (
                        <View style={styles.setsDisplayContainer}>
                          {renderSetsHeader(exercise)}
                          <FlatList
                            data={exercise.sets}
                            renderItem={({ item, index }) =>
                              renderSetItem({ item, index, exercise })
                            }
                            keyExtractor={(item, index) => `set-${index}`}
                            horizontal={false}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                            style={styles.setsList}
                            contentContainerStyle={styles.setsContainer}
                            initialNumToRender={50}
                            maxToRenderPerBatch={50}
                          />
                        </View>
                      )}
                  </View>
                ))
              ) : (
                <Text style={styles.noExercisesText}>
                  No exercise Data found
                </Text>
              )}
            </View>
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>

            <View style={styles.progressStatsContainer}>
              <View style={styles.progressStat}>
                <Image
                  source={require("../../../assets/images/calories.png")}
                  resizeMode="contain"
                  style={styles.progressImage}
                />
                <Text style={styles.statValue}>
                  {totalCalories
                    ? `${totalCalories.toFixed(2)} kcal`
                    : "0 kcal"}
                </Text>
                <Text style={styles.statLabel}>Calories</Text>
              </View>

              <View style={styles.progressStat}>
                <Image
                  source={require("../../../assets/images/workout/volume.png")}
                  resizeMode="contain"
                  style={styles.progressImage}
                />
                <Text style={styles.statValue}>
                  {totalVolume ? `${totalVolume.toFixed(2)} kg` : "0 kg"}
                </Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>

              <View style={styles.progressStat}>
                <Image
                  source={require("../../../assets/images/machines.webp")}
                  resizeMode="contain"
                  style={{ width: 80, height: 80 }}
                />
                <Text style={styles.statValue}>
                  {report?.workout?.count} Exercises
                </Text>
                <Text style={styles.statLabel}> Completed</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={handleDeletePhoto}
          photoUri={photoToDelete}
        />

        <WorkoutCompletionModal
          visible={workoutCompletionVisible}
          onClose={async () => {
            setWorkoutCompletionVisible(false);
            setImage(null);
            setSavedPhotos(await getSavedPhotosByDate(selectedDate));
          }}
          onAddImage={handleImageUpload}
          image={image}
          type={"reports"}
        />
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    marginTop: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Date picker styles (same as DietReport)
  datePickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    margin: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "absolute",
    top: 300,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  iosDatePicker: {
    height: 200,
  },
  datePickerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 10,
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  confirmButton: {
    backgroundColor: "#FF5757",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },

  dateNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateHeader: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: "white",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderRadius: 15,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  weekDayStrip: {
    paddingLeft: 8,
    paddingTop: 10,
    paddingBottom: 16,
  },

  weekDayStripTablet: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  weekdayButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: "rgba(0, 123, 255, 0.06)",
  },

  weekdayButtonTablet: {
    width: 45,
    height: 45,
    borderRadius: 25,
  },
  activeWeekdayButton: {
    backgroundColor: "#007BFF",
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "400",
  },
  weekdayLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  activeWeekdayText: {
    color: "white",
  },
  activeWeekdayLabel: {
    color: "#007BFF",
  },
  entryExitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    borderRadius: 15,
    paddingVertical: 15,
  },
  entryTimeContainer: {
    width: "33%",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    backgroundColor: "white",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "visible",
  },
  exitTimeContainer: {
    width: "33%",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 15,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "white",
    elevation: 3,
    overflow: "visible",
  },
  timeContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  entryTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  exitTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  entryLabel: {
    fontSize: 12,
    color: "#777",
  },
  exitLabel: {
    fontSize: 12,
    color: "#777",
  },
  workoutDuration: {
    width: "33%",
    padding: 5,
  },
  durationText: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: "white",
    elevation: 3,
    paddingHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  workoutDetailsSection: {
    backgroundColor: "white",
    borderRadius: 15,
    marginVertical: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: "#D9D9D9",
  },
  activeTabButton: {
    backgroundColor: "#007BFF",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "400",
  },
  activeTabText: {
    color: "white",
  },
  exerciseList: {
    marginTop: 10,
  },
  exerciseItem: {
    marginBottom: 12,
    backgroundColor: "rgba(217, 217, 217, 0.25)",
    borderRadius: 8,
    overflow: "hidden",
  },
  exerciseHeader: {
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseNameContainer: {
    flex: 1,
    marginRight: 10,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
    flexWrap: "wrap",
  },
  exerciseMeta: {
    alignItems: "flex-end",
  },
  exerciseCalories: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  setDetails: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.80)",
  },
  noExercisesText: {
    textAlign: "center",
    color: "#777",
    padding: 20,
  },

  // New styles from ExerciseCard for sets display
  setsDisplayContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(1),
    marginTop: responsiveHeight(0.5),
  },
  setsHeaderContainer: {
    marginBottom: responsiveHeight(0.8),
  },
  setsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: responsiveWidth(2),
    paddingVertical: responsiveHeight(1),
    backgroundColor: "rgba(100, 150, 200, 0.1)",
    borderRadius: 8,
    marginBottom: 0,
  },
  headerSetColumn: {
    width: responsiveWidth(15),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  headerDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  headerIconContainer: {
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerIconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  headerText: {
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  setsList: {
    maxHeight: responsiveHeight(30),
  },
  setsContainer: {
    paddingVertical: responsiveHeight(0.5),
  },
  newSetItem: {
    paddingVertical: responsiveHeight(1),
    paddingHorizontal: responsiveWidth(2),
    marginBottom: responsiveHeight(0.8),
    backgroundColor: "rgba(240, 245, 250, 0.9)",
    borderRadius: responsiveWidth(2.5),
    borderLeftWidth: 4,
    borderLeftColor: "#4ECDC4",
  },
  setRowContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  setNumberContainer: {
    width: responsiveWidth(15),
    alignItems: "center",
    justifyContent: "center",
  },
  setNumberCircle: {
    width: responsiveWidth(4),
    height: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  setNumber: {
    color: "white",
    fontSize: responsiveFontSize(10),
    fontWeight: "bold",
  },
  setDataContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  setDataColumn: {
    flex: 1,
    alignItems: "center",
  },
  setDataValue: {
    fontSize: responsiveFontSize(12),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  setDataLabel: {
    fontSize: responsiveFontSize(9),
    color: "#666",
    textAlign: "center",
  },

  progressSection: {
    marginVertical: 10,
  },
  progressStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  progressStat: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FBFBFB",
    justifyContent: "flex-end",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 5,
    shadowColor: "rgba(0, 0, 0, 0.50)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressImage: {
    width: 70,
    height: 70,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
  },
  photoSection: {
    backgroundColor: "white",
    marginVertical: 10,
    marginBottom: 20,
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 5,
  },
  uploadPhotoTile: {
    width: "32%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  uploadIconContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  plusIconOverlay: {
    position: "absolute",
    right: -6,
    top: -4,
    backgroundColor: "#000",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadPhotoText: {
    fontSize: 12,
    color: "#777",
  },
  photoContainer: {
    position: "relative",
    width: "32%",
    height: width / 3.5,
    marginBottom: 10,
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  deleteIconContainer: {
    position: "absolute",
    top: -12,
    right: -5,
    backgroundColor: "white",
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
  },
  noPhotosText: {
    fontSize: 14,
    color: "#777",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
    width: "100%",
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeablePhotoContainer: {
    width: width,
    height: width,
    position: "relative",
  },
  photoSlide: {
    width: width,
    height: width,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPhoto: {
    width: width,
    height: width,
  },
  paginationDots: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "white",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  photoCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  photoDeleteButton: {
    position: "absolute",
    bottom: 40,
    right: 20,
    zIndex: 10,
  },
  disabledWeekdayButton: {
    backgroundColor: "#D9D9D9",
  },
  disabledWeekdayText: {
    color: "#999",
  },
  disabledWeekdayLabel: {
    color: "#999",
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmModalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  confirmModalMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  confirmModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#297DB3",
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "500",
  },
});

export default WorkoutReports;
