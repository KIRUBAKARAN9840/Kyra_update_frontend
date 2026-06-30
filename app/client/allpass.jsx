import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StatusBar,
  Platform,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  BackHandler,
  ScrollView,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Ionicons,
} from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import QRCode from "react-native-qrcode-svg";
import { toIndianISOString } from "../../utils/basicUtilFunctions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaskedText } from "../../components/ui/MaskedText";
import {
  addPunchInAPI,
  addPunchOutAPI,
  getAllDailyPassesAPI,
  getTodayQrAPI,
  getBookedSessionsAPI,
  scanCheckInAPI,
  generatePackDailyPassAPI,
} from "../../services/clientApi";
import {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  LocationAccuracy,
} from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { showToast } from "../../utils/Toaster";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedbackModal from "../../components/ui/FeedbackModal";
import { handleNutritionPay } from "../../components/ui/Payment/nutritionpayfn";
import CustomCalendarContinuous from "../../components/ui/CustomCalendarContinuous";

const { width: screenWidth } = Dimensions.get("window");
const ps = (n) => Math.round((screenWidth / 375) * n);

const muscleGroups = [
  "Chest",
  "Shoulder",
  "Leg",
  "Back",
  "ABS",
  "Biceps",
  "Cardio",
  "Core",
  "Cycling",
  "Forearms",
  "Treadmill",
  "Triceps",
];

const ALLOWED_DISTANCE = 200;

const PassCard = ({ item, router, onQRPress, onScanPress }) => {
  const handleLocationPress = () => {
    if (item.latitude && item.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open maps:", err);
        showToast({
          type: "error",
          title: "Error",
          desc: "Unable to open maps. Please ensure Google Maps is installed.",
        });
      });
    }
  };

  const handleContactPress = () => {
    if (item.owner_mobile) {
      const url = `tel:${item.owner_mobile}`;
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open dialer:", err);
        showToast({
          type: "error",
          title: "Error",
          desc: "Unable to open dialer.",
        });
      });
    }
  };

  const isDateCompleted = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    // A date is completed if it's not in next_dates (i.e. already used)
    const isNext = (item.next_dates || []).includes(dateStr);
    return !isNext && d <= today;
  };

  const formatChipDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const titleText = item.booking_type === "multi" ? "Group Pass" : "Daily Pass";
  const badgeText =
    item.booking_type === "multi"
      ? `${item.head_count} members`
      : `${item.days_total} Day Pass`;

  const qrValue = JSON.stringify({
    type: "daily_pass",
    day_id: item.current_day_id,
  });

  return (
    <LinearGradient
      colors={["#E2F4FD", "#F6E6F7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.dpCard}
    >
      {/* ── Header: Title + Badge ── */}
      <View style={styles.dpHeader}>
        <MaskedText
          bg1="#2F45C7"
          bg2="#B650BC"
          text={titleText}
          textStyle={styles.dpTitle}
        />
        <View style={styles.dpBadge}>
          <Text style={styles.dpBadgeText}>{badgeText}</Text>
        </View>
      </View>

      {/* ── Gym Image + Name + Address ── */}
      <View style={styles.dpGymRow}>
        <Image
          source={{ uri: item.cover_pic }}
          style={styles.dpGymImage}
          contentFit="cover"
        />
        <View style={styles.dpGymInfo}>
          <Text style={styles.dpGymName} numberOfLines={1}>
            {item.gym_name}
          </Text>
          <View style={styles.dpGymLocalityRow}>
            <Text style={styles.dpGymLocality} numberOfLines={1}>
              {[item.address_area, item.address_city]
                .filter(Boolean)
                .join(", ")}
            </Text>
            <TouchableOpacity
              onPress={handleLocationPress}
              activeOpacity={0.7}
              style={styles.dpViewMapRow}
            >
              <Text style={styles.dpViewMap}>View on map</Text>
              <Ionicons name="chevron-forward" size={14} color="#2F45C7" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Booked Dates Chips ── */}
      {item.booked_dates && item.booked_dates.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dpChipsScroll}
          contentContainerStyle={styles.dpChipsContent}
        >
          {item.booked_dates.map((date) => {
            const completed = isDateCompleted(date);
            return (
              <View
                key={date}
                style={[
                  styles.dpChip,
                  completed ? styles.dpChipDone : styles.dpChipNext,
                ]}
              >
                <Text
                  style={[
                    styles.dpChipText,
                    completed && styles.dpChipTextDone,
                  ]}
                >
                  {formatChipDate(date)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── QR Code ── */}
      <View style={styles.dpQrWrapper}>
        {item.current_day_id ? (
          <QRCode
            value={qrValue}
            size={160}
            backgroundColor="white"
            color="black"
          />
        ) : (
          <View style={styles.dpQrPlaceholder}>
            <MaterialIcons name="qr-code" size={60} color="#CCC" />
            <Text style={styles.dpQrPlaceholderText}>QR not available</Text>
          </View>
        )}
        <Text style={styles.dpQrHint}>Show QR to gym admin</Text>
      </View>

      {/* ── OR Divider ── */}
      <View style={styles.dpOrRow}>
        <View style={styles.dpOrLine} />
        <Text style={styles.dpOrText}> OR </Text>
        <View style={styles.dpOrLine} />
      </View>

      {/* ── Scan QR to Activate ── */}
      <TouchableOpacity
        style={styles.dpScanBtn}
        onPress={() => onScanPress(item)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#6B35C8", "#B650BC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.dpScanGradient}
        >
          <MaterialIcons name="qr-code-scanner" size={22} color="#FFF" />
          <Text style={styles.dpScanText}>Scan QR to activate</Text>
          <Text style={styles.dpScanArrow}>{">>"}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Need Help ── */}
      {item.owner_mobile && (
        <TouchableOpacity
          onPress={handleContactPress}
          activeOpacity={0.7}
          style={styles.dpHelpRow}
        >
          <Text style={styles.dpHelpText}>Need Help?</Text>
          <View style={styles.dpViewMapRow}>
            <Text style={styles.dpHelpLink}>Contact Gym</Text>
            <Ionicons name="chevron-forward" size={14} color="#2F45C7" />
          </View>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

// Helper for ordinal numbers (1st, 2nd, 3rd, etc.)
const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Helper to format date string to "29 Jun 2026"
const formatPackDateStr = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// ── Pack Pass Card (for 7/15-day packs) ──────────────────────────
const PackPassCard = ({ item, onGeneratePress, onScanPress, onStatsPress }) => {
  const handleLocationPress = () => {
    if (item.latitude && item.longitude) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
      ).catch(() => {});
    }
  };

  const formatPackDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
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
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formatChipDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const progressPercent =
    item.days_total > 0 ? (item.days_used / item.days_total) * 100 : 0;

  return (
    <LinearGradient
      colors={["#E2F4FD", "#F6E6F7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.dpCard}
    >
        {/* Header */}
        <View style={styles.dpHeader}>
          <MaskedText
            bg1="#2F45C7"
            bg2="#B650BC"
            text="Pack Pass"
            textStyle={styles.dpTitle}
          />
          <View style={styles.dpBadge}>
            <Text style={styles.dpBadgeText}>
              {item.pack_label || `${item.pack_size} Day Pass`}
            </Text>
          </View>
        </View>

      {/* Gym Info */}
      <View style={styles.dpGymRow}>
        <Image
          source={{ uri: item.cover_pic }}
          style={styles.dpGymImage}
          contentFit="cover"
        />
        <View style={styles.dpGymInfo}>
          <Text style={styles.dpGymName} numberOfLines={1}>
            {item.gym_name}
          </Text>
          <View style={styles.dpGymLocalityRow}>
            <Text style={styles.dpGymLocality} numberOfLines={1}>
              {[item.address_area, item.address_city]
                .filter(Boolean)
                .join(", ")}
            </Text>
            <TouchableOpacity
              onPress={handleLocationPress}
              activeOpacity={0.7}
              style={styles.dpViewMapRow}
            >
              <Text style={styles.dpViewMap}>View on map</Text>
              <Ionicons name="chevron-forward" size={14} color="#2F45C7" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <TouchableOpacity
        style={styles.pkStatsBox}
        activeOpacity={0.7}
        onPress={() => onStatsPress && onStatsPress(item)}
      >
        <View style={styles.pkStatsBoxInner}>
          <View style={{ flex: 1 }}>
            <View style={styles.pkStatsRow}>
              <View style={styles.pkStatItem}>
                <Text style={styles.pkStatValue}>{item.days_remaining ?? 0}</Text>
                <Text style={styles.pkStatLabel}>Days Left</Text>
              </View>
              <View style={styles.pkStatDivider} />
              <View style={styles.pkStatItem}>
                <Text style={styles.pkStatValue}>{item.days_used ?? 0}</Text>
                <Text style={styles.pkStatLabel}>Generated</Text>
              </View>
              <View style={styles.pkStatDivider} />
              <View style={styles.pkStatItem}>
                <Text style={styles.pkStatValue}>{item.days_total}</Text>
                <Text style={styles.pkStatLabel}>Total</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.pkProgressBar}>
              <LinearGradient
                colors={["#22C55E", "#16A34A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.pkProgressFill, { width: `${progressPercent}%` }]}
              />
            </View>

            {/* Validity */}
            <Text style={styles.pkValidityText}>
              Valid till {formatPackDate(item.valid_until)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#888" />
        </View>
      </TouchableOpacity>

      {/* Attended Dates */}
      {item.attended_dates.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dpChipsScroll}
          contentContainerStyle={styles.dpChipsContent}
        >
          {item.attended_dates.map((date) => (
            <View key={date} style={[styles.dpChip, styles.dpChipDone]}>
              <Text style={[styles.dpChipText, styles.dpChipTextDone]}>
                {formatChipDate(date)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Active QR Section (when a day is generated but not yet scanned) */}
      {item.current_day_id && item.current_day_status === "generated" && (
        <>
          <View style={styles.dpQrWrapper}>
            <Text style={styles.pkQrDateLabel}>
              Pass for {formatPackDate(item.current_day_date)}
            </Text>
            <QRCode
              value={JSON.stringify({
                type: "daily_pass",
                day_id: item.current_day_id,
              })}
              size={140}
              backgroundColor="white"
              color="black"
            />
            <Text style={styles.dpQrHint}>Show QR to gym admin</Text>
          </View>

          {/* OR Divider */}
          <View style={styles.dpOrRow}>
            <View style={styles.dpOrLine} />
            <Text style={styles.dpOrText}> OR </Text>
            <View style={styles.dpOrLine} />
          </View>

          {/* Scan QR to Activate */}
          <TouchableOpacity
            style={styles.dpScanBtn}
            onPress={() => onScanPress(item)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#6B35C8", "#B650BC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dpScanGradient}
            >
              <MaterialIcons name="qr-code-scanner" size={22} color="#FFF" />
              <Text style={styles.dpScanText}>Scan QR to activate</Text>
              <Text style={styles.dpScanArrow}>{">>"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {/* Generate Daily Pass Button */}
      {item.days_remaining > 0 && (
        <TouchableOpacity
          style={styles.pkGenerateBtn}
          onPress={() => onGeneratePress(item)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#6B35C8", "#B650BC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pkGenerateGradient}
          >
            <Text style={styles.pkGenerateText}>
              Generate Your{" "}
              {item.days_used === 0 ? "First" : getOrdinal(item.days_used + 1)}{" "}
              Pass
            </Text>
            <Text style={styles.dpScanArrow}>{">>"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const QRModal = ({
  visible,
  onClose,
  gymData,
  onPunchInPress,
  onPunchOutPress,
}) => {
  const [punchInLoading, setPunchInLoading] = useState(false);
  const [punchOutLoading, setPunchOutLoading] = useState(false);
  const [isUserPunchedIn, setIsUserPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState(null);
  const [gymLocation, setGymLocation] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [showMuscleSelection, setShowMuscleSelection] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [todayDate, setTodayDate] = useState("");

  const fetchQrData = async () => {
    if (!gymData?.pass_id) {
      console.error("No pass_id available");
      return;
    }

    setQrLoading(true);
    try {
      const response = await getTodayQrAPI(gymData.pass_id);

      if (response?.status === 200) {
        setQrData(
          JSON.stringify({
            type: "daily_pass",
            day_id: response.day_id,
          }),
        );
        setTodayDate(
          response.date || toIndianISOString(new Date()).split("T")[0],
        );

        // Update punch status from QR API response
        setIsUserPunchedIn(!response.in_punch);
        setPunchInTime(response.in_time);
        setPunchOutTime(response.out_time);
        setGymLocation(response?.gym_location);
      } else if (response?.status === 409) {
        alert("Today's Pass Already Scanned");
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.message || "Unable to generate QR code for today",
        });
      }
    } catch (error) {
      console.error("Error fetching QR data:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to fetch QR data",
      });
    } finally {
      setQrLoading(false);
    }
  };

  const checkPunchStatus = async () => {
    // This function is now replaced by fetchQrData, but keeping for compatibility
    await fetchQrData();
  };

  // Check punch status when modal opens
  React.useEffect(() => {
    if (visible && gymData) {
      checkPunchStatus();
    }
  }, [visible, gymData]);

  const formatTimeTo12Hour = (timeString) => {
    if (!timeString || timeString === "NA") return "NA";

    try {
      const [hours, minutes, seconds] = timeString.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch (error) {
      return timeString;
    }
  };

  // UUID generation is no longer needed - using API QR data

  const toggleMuscleSelection = (muscle) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  };

  const handlePunchInPress = () => {
    if (onPunchInPress) {
      onPunchInPress(gymData, gymLocation);
    }
  };

  const handlePunchIn = async () => {
    if (punchInLoading) return;
    setPunchInLoading(true);

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");

      if (!clientId || !gymId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client or Gym information not found. Please login again.",
        });
        return;
      }

      const payload = {
        client_id: clientId,
        gym_id: gymId,
        muscle: selectedMuscles,
      };

      const response = await addPunchInAPI(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Punched In Successfully!",
        });
        // Update the punch status after successful punch in
        await checkPunchStatus();
        setShowMuscleSelection(false);
        setSelectedMuscles([]);
        onClose(); // Close modal on success
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to punch in.",
        });
      }
    } catch (error) {
      console.error("Punch in error:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setPunchInLoading(false);
    }
  };

  const handlePunchOutPress = () => {
    if (onPunchOutPress) {
      onPunchOutPress(gymData);
    }
  };

  if (!gymData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* QR Section with Background */}
          <View style={styles.qrSection}>
            {/* Gym Name */}
            <Text style={styles.modalGymName}>{gymData.gymName}</Text>

            {/* Date Display */}
            {todayDate && (
              <Text style={styles.qrDate}>
                {new Date(todayDate).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            )}

            {/* QR Code Container */}
            <View style={styles.qrContainer}>
              {qrLoading ? (
                <View style={styles.qrLoadingContainer}>
                  <ActivityIndicator size="large" color="#007BFF" />
                  <Text style={styles.qrLoadingText}>Loading QR...</Text>
                </View>
              ) : qrData ? (
                <QRCode
                  value={qrData}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              ) : (
                <View style={styles.qrErrorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={48}
                    color="#FF5757"
                  />
                  <Text style={styles.qrErrorText}>QR Code Unavailable</Text>
                </View>
              )}
            </View>

            {/* Instructions */}
            <Text style={styles.qrInstructions}>
              Please Show this QR code at your gym for entry.
            </Text>

            {/* Enhanced Punch Status Display */}
            {/* {qrLoading ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color="#007BFF" />
                <Text style={styles.statusTextModal}>Loading status...</Text>
              </View>
            ) : (
              <View style={styles.punchStatusContainer}>
              
                <View style={styles.punchStatusRow}>
                  <MaterialIcons
                    name="login"
                    size={16}
                    color={isUserPunchedIn ? "#22C55E" : "#FF5757"}
                  />
                  <Text style={styles.punchStatusLabel}>Punch In:</Text>
                  <Text
                    style={[
                      styles.punchStatusValue,
                      { color: isUserPunchedIn ? "#22C55E" : "#FF5757" },
                    ]}
                  >
                    {punchInTime
                      ? formatTimeTo12Hour(punchInTime)
                      : "Not punched In"}
                  </Text>
                </View>

                <View style={styles.punchStatusRow}>
                  <MaterialIcons
                    name="logout"
                    size={16}
                    color={punchOutTime ? "#22C55E" : "#999"}
                  />
                  <Text style={styles.punchStatusLabel}>Punch Out:</Text>
                  <Text
                    style={[
                      styles.punchStatusValue,
                      { color: punchOutTime ? "#22C55E" : "#999" },
                    ]}
                  >
                    {punchOutTime
                      ? formatTimeTo12Hour(punchOutTime)
                      : "Not punched Out"}
                  </Text>
                </View>
              </View>
            )} */}
          </View>

          {/* Punch Buttons */}
          {/* <View style={styles.punchButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.punchInButton,
                (punchInLoading || qrLoading || isUserPunchedIn || !qrData) &&
                  styles.disabledButton,
              ]}
              onPress={handlePunchInPress}
              disabled={
                punchInLoading ||
                punchOutLoading ||
                qrLoading ||
                isUserPunchedIn ||
                !qrData
              }
            >
              {punchInLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="login" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.punchButtonText}>Punch in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.punchOutButton,
                (punchOutLoading ||
                  qrLoading ||
                  !isUserPunchedIn ||
                  !qrData ||
                  Boolean(punchOutTime)) &&
                  styles.disabledButton,
              ]}
              onPress={handlePunchOutPress}
              disabled={
                punchInLoading ||
                punchOutLoading ||
                qrLoading ||
                !isUserPunchedIn ||
                !qrData ||
                Boolean(punchOutTime)
              }
            >
              {punchOutLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="logout" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.punchButtonText}>Punch out</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      </View>
    </Modal>
  );
};

const SessionCard = ({ item, onFullSchedule, onScanQR, formatDateShort }) => {
  const sessionDates = item.sessions || [];

  const handleLocationPress = () => {
    if (item.latitude && item.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open maps:", err);
        showToast({
          type: "error",
          title: "Error",
          desc: "Unable to open maps. Please ensure Google Maps is installed.",
        });
      });
    }
  };

  const handleContactPress = () => {
    if (item.owner_mobile) {
      const url = `tel:${item.owner_mobile}`;
      Linking.openURL(url).catch((err) => {
        console.error("Failed to open dialer:", err);
        showToast({
          type: "error",
          title: "Error",
          desc: "Unable to open dialer.",
        });
      });
    }
  };

  // Format address from address object if available
  const formatAddress = () => {
    if (!item.address) return null;
    const addressParts = [
      item.address?.door_no,
      item.address?.building,
      item.address?.street,
      item.address?.area,
      item.address?.locality,
      item.address?.city,
      item.address?.state,
    ].filter(Boolean);
    return addressParts.join(", ") || null;
  };

  const formattedAddress = formatAddress();

  return (
    <View style={styles.sessionCard}>
      <LinearGradient
        colors={["rgba(91, 43, 155, 0.15)", "rgba(255, 60, 123, 0.15)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sessionGradientCard}
      >
        <View style={styles.sessionCardHeader}>
          <View style={styles.sessionTitleRow}>
            <Image
              source={require("../../assets/images/plans/crown.png")}
              style={styles.sessionCrownIcon}
            />
            <MaskedText
              bg1="#5B2B9B"
              bg2="#FF3C7B"
              text={item.session_name?.replace(/_/g, " ").toUpperCase()}
              textStyle={styles.sessionTitle}
            />
          </View>
          <View style={styles.sessionActiveBadge}>
            <MaterialIcons name="check-circle" size={14} color="#FFFFFF" />
            <Text style={styles.sessionActiveText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.sessionCardBody}>
          {item.gym_name && (
            <View style={styles.sessionGymContainer}>
              <Text style={styles.sessionGymName}>{item.gym_name}</Text>
            </View>
          )}

          {item.trainer_name && (
            <View style={styles.sessionTrainerContainer}>
              <MaterialIcons name="person" size={14} color="#666" />
              <Text style={styles.sessionTrainerName}>{item.trainer_name}</Text>
            </View>
          )}

          {formattedAddress && (
            <TouchableOpacity
              style={styles.sessionAddressContainer}
              onPress={handleLocationPress}
              activeOpacity={0.7}
              disabled={!item.latitude || !item.longitude}
            >
              <MaterialIcons name="place" size={14} color="#666" />
              <Text
                style={[
                  styles.sessionAddressText,
                  item.latitude &&
                    item.longitude &&
                    styles.sessionClickableAddress,
                ]}
                numberOfLines={1}
              >
                {formattedAddress}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.sessionDatesContainer}>
            {sessionDates.map((session, index) => (
              <Text key={index} style={styles.sessionDateLabel}>
                {formatDateShort(session.date)}
                {index < sessionDates.length - 1 ? ", " : ""}
              </Text>
            ))}
          </View>

          <View style={styles.sessionButtonsContainer}>
            <TouchableOpacity
              style={styles.fullScheduleButton}
              onPress={() => onFullSchedule(item)}
            >
              <MaterialIcons name="event" size={16} color="#666" />
              <Text style={styles.fullScheduleButtonText}>Full Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanQrButton}
              onPress={() => onScanQR(item)}
            >
              <MaterialIcons name="qr-code-scanner" size={16} color="#666" />
              <Text style={styles.scanQrButtonText}>Check In</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Support Section */}
          {item?.owner_mobile && (
            <TouchableOpacity
              style={styles.sessionContactSection}
              onPress={handleContactPress}
              activeOpacity={0.7}
            >
              <Text style={styles.sessionContactText}>
                Need support?{" "}
                <Text style={styles.sessionContactLink}>Contact Gym</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const SessionQRModal = ({ visible, onClose, sessionData }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    if (visible && sessionData?.sessions?.length > 0) {
      // Find today's session or the nearest upcoming session
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySession = sessionData.sessions.find((session) => {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });

      if (todaySession) {
        setSelectedBooking(todaySession);
        setQrData(
          JSON.stringify({
            type: "sessions",
            checkin_token: todaySession.checkin_token,
          }),
        );
      } else {
        // Get nearest upcoming session
        const upcomingSessions = sessionData.sessions
          .filter((session) => {
            const sessionDate = new Date(session.date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate >= today;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcomingSessions.length > 0) {
          setSelectedBooking(upcomingSessions[0]);
          setQrData(
            JSON.stringify({
              type: "sessions",
              checkin_token: upcomingSessions[0].checkin_token,
            }),
          );
        }
      }
    }
  }, [visible, sessionData]);

  const formatDateForQR = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (!sessionData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.modalGymName}>
              {sessionData.session_name?.replace(/_/g, " ").toUpperCase()}
            </Text>

            {selectedBooking && (
              <Text style={styles.qrDate}>
                {formatDateForQR(selectedBooking.date)} at{" "}
                {selectedBooking.start_time}
              </Text>
            )}

            <View style={styles.qrContainer}>
              {qrData ? (
                <QRCode
                  value={qrData}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              ) : (
                <View style={styles.qrErrorContainer}>
                  <MaterialIcons
                    name="error-outline"
                    size={48}
                    color="#FF5757"
                  />
                  <Text style={styles.qrErrorText}>
                    No Session Available Today
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.qrInstructions}>
              Please show this QR code for check-in at your session.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FullScheduleModal = ({
  visible,
  onClose,
  sessionData,
  formatDateFull,
}) => {
  if (!sessionData) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.scheduleModalContent}>
              <View style={styles.scheduleModalHeader}>
                <Text style={styles.scheduleModalTitle}>Full Schedule</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.scheduleCloseButton}
                >
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.scheduleSessionName}>
                {sessionData.session_name?.replace(/_/g, " ").toUpperCase()}
              </Text>

              <ScrollView
                style={styles.scheduleScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scheduleScrollContent}
              >
                {sessionData.sessions?.map((session, index) => (
                  <View key={index} style={styles.scheduleCard}>
                    <Text style={styles.scheduleDate}>
                      {formatDateFull(session.date)}
                    </Text>
                    <View style={styles.scheduleTimeContainer}>
                      <Text style={styles.scheduleTime}>
                        {session.start_time}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const AllPass = () => {
  const router = useRouter();
  const { tab, review } = useLocalSearchParams();
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    tab === "Fitness Classes" ? "Fitness Classes" : "Daily Pass",
  );
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showQrOptionsModal, setShowQrOptionsModal] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [sessionQrModalVisible, setSessionQrModalVisible] = useState(false);
  const [qrOptionsType, setQrOptionsType] = useState(null); // 'daily' or 'session'
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [activePassIndex, setActivePassIndex] = useState(0);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseConfig, setResponseConfig] = useState({
    title: "",
    message: "",
    isSuccess: false,
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [nutritionCardVariant, setNutritionCardVariant] = useState(null);
  const [nutriPayProcessing, setNutriPayProcessing] = useState(false);
  const [nutriPayStep, setNutriPayStep] = useState("");
  const [nutriPaySuccess, setNutriPaySuccess] = useState(false);
  const [nutriPayFailed, setNutriPayFailed] = useState(false);
  const nutriPayInProgress = useRef(false);
  const lastPurchasedSku = useRef(null);
  const insets = useSafeAreaInsets();

  // Pack generation flow
  const [showPackCalendarModal, setShowPackCalendarModal] = useState(false);
  const [selectedPackPass, setSelectedPackPass] = useState(null);
  const [packSelectedDate, setPackSelectedDate] = useState(null);
  const [packGenerating, setPackGenerating] = useState(false);
  const [showPackDetailsModal, setShowPackDetailsModal] = useState(false);
  const [packDetailsItem, setPackDetailsItem] = useState(null);

  const handleNutritionPurchase = async (sku) => {
    if (nutriPayInProgress.current) return;
    nutriPayInProgress.current = true;
    lastPurchasedSku.current = sku;
    setNutriPayProcessing(true);
    setNutriPayStep("Initializing...");

    const response = await handleNutritionPay({
      onStep: setNutriPayStep,
      productSku: sku,
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

  useEffect(() => {
    if (review === "true") {
      setTimeout(() => setShowFeedbackModal(true), 500);
    }
  }, [review]);
  const tabs = ["Daily Pass", "Fitness Classes"];

  const passViewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  });
  const onPassViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActivePassIndex(viewableItems[0].index ?? 0);
    }
  });

  const fetchAllPasses = async () => {
    try {
      setLoading(true);
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found. Please login again.",
        });
        setPasses([]);
        setLoading(false);
        return;
      }

      const response = await getAllDailyPassesAPI(parseInt(clientId));
     
      setNutritionCardVariant(response?.nutrition_card_variant ?? null);

      if (response?.passes) {
        // Transform API response to match our current UI format
        const transformedPasses = response.passes.map((pass, index) => {
          // Format address as single line like in gymstudios
          const addressParts = [
            pass.address?.door_no,
            pass.address?.building,
            pass.address?.street,
            pass.address?.area,
            pass.address?.locality,
            pass.address?.city,
            pass.address?.state,
          ].filter(Boolean);

          const formattedAddress =
            addressParts.join(", ") || "Location not specified";

          return {
            id: index + 1,
            pass_id: pass.pass_id,
            gym_name: pass.gym_name,
            gymName: pass.gym_name,
            cover_pic: pass.cover_pic,
            address_area: pass.address?.area,
            address_city: pass.address?.city,
            address: formattedAddress,
            latitude: pass.latitude,
            longitude: pass.longitude,
            owner_mobile: pass.owner_mobile,
            fromDate: pass.valid_from,
            toDate: pass.valid_until,
            booking_type: pass.booking_type,
            head_count: pass.head_count,
            days_total: pass.days_total,
            booked_dates: pass.booked_dates || [],
            next_dates: pass.next_dates || [],
            current_day_id: pass.current_day_id,
            remaining_days: pass.remaining_days,
            status: pass.remaining_days > 0 ? "active" : "expired",
            amount: pass?.amount,
            can_reschedule: pass.can_reschedule,
            can_upgrade: pass.can_upgrade,
            gym_id: pass.gym_id,
            is_edited: pass.is_edited,
            actual_days: pass.actual_days,
            rescheduled_days: pass.rescheduled_days,
            is_upgraded: pass?.is_upgraded || false,
            oldGymName: pass?.old_gym_name,
            // V3 pack fields
            consumption_mode: pass.consumption_mode || "dates",
            pack_size: pass.pack_size,
            pack_label: pass.pack_label,
            validity_days: pass.validity_days,
            valid_from: pass.valid_from,
            valid_until: pass.valid_until,
            days_used: pass.days_used,
            days_remaining: pass.days_remaining ?? pass.remaining_days,
            attended_dates: pass.attended_dates || [],
            generated_dates: pass.generated_dates || [],
            current_day_status: pass.current_day_status,
            current_day_date: pass.current_day_date,
          };
        });

        setPasses(transformedPasses);
      } else {
        setPasses([]);
      }
    } catch (error) {
      console.error("Error fetching passes:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to fetch daily passes",
      });
      setPasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSessions = async () => {
    try {
      setSessionsLoading(true);
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found. Please login again.",
        });
        setSessions([]);
        setSessionsLoading(false);
        return;
      }

      const response = await getBookedSessionsAPI(parseInt(clientId));

      if (response?.status === 200 && response?.data) {
        setSessions(response.data);
      } else {
        setSessions([]);
        if (response?.status !== 200) {
          showToast({
            type: "error",
            title: "Error",
            desc: response?.message || "Failed to fetch booked sessions",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching booked sessions:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to fetch booked sessions",
      });
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
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
    const month = months[date.getMonth()];
    const dateNum = date.getDate();
    return `${month} ${dateNum}`;
  };

  const formatDateFull = (dateString) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dateNum = date.getDate();
    return `${day}, ${month} ${dateNum}`;
  };

  const handleFullSchedule = (session) => {
    setSelectedSession(session);
    setShowScheduleModal(true);
  };

  const handleScanQR = (session) => {
    setSelectedSession(session);
    setQrOptionsType("session");
    setShowQrOptionsModal(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchAllPasses();
      if (activeTab === "Fitness Classes") {
        fetchBookedSessions();
      }
    }, [activeTab]),
  );

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/client/home");
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const handleBack = () => {
    router.replace("/client/home");
  };

  const handleQRPress = (gymItem) => {
    setSelectedGym(gymItem);
    setQrModalVisible(false);
    setScannerVisible(false);
    setIsScanning(false);
    setQrOptionsType("daily");
    setShowQrOptionsModal(true);
  };

  const handleShowQR = () => {
    setScannerVisible(false);
    setIsScanning(false);
    setShowQrOptionsModal(false);
    if (qrOptionsType === "session") {
      setSessionQrModalVisible(true);
    } else {
      setQrModalVisible(true);
    }
  };

  const handleScanGymQR = async () => {
    // Check camera permission first
    if (!cameraPermission) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        showToast({
          type: "error",
          title: "Camera Permission Required",
          desc: "Camera permission is required to scan QR codes. Please enable it in settings.",
        });
        return;
      }
    } else if (!cameraPermission.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        showToast({
          type: "error",
          title: "Camera Permission Required",
          desc: "Camera permission is required to scan QR codes. Please enable it in settings.",
        });
        return;
      }
    }

    setQrModalVisible(false);
    setSessionQrModalVisible(false);
    setShowQrOptionsModal(false);
    setScannerVisible(true);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      // QR code contains just the gym_id number as a string
      const gymId = data.trim();

      if (!gymId) {
        setResponseConfig({
          title: "Invalid QR Code",
          message: "QR code must contain gym_id.",
          isSuccess: false,
        });
        setShowResponseModal(true);
        setIsScanning(false);
        return;
      }

      let payload;
      let response;

      // Handle based on qrOptionsType (set when user clicked Check In)
      if (qrOptionsType === "daily") {
        // Daily Pass - get day_id from selectedGym
        if (!selectedGym?.pass_id) {
          setResponseConfig({
            title: "Info",
            message: "Pass information not found.",
            isSuccess: false,
          });
          setShowResponseModal(true);
          setScannerVisible(false);
          setIsScanning(false);
          return;
        }

        // Fetch today's QR data to get day_id
        const qrResponse = await getTodayQrAPI(selectedGym.pass_id);

        // Handle 409 status - Pass already attended
        if (qrResponse?.status === 409) {
          setResponseConfig({
            title: "Scan is Successful",
            message: "Start your workout session and have a great day!",
            isSuccess: true,
          });
          setShowResponseModal(true);
          setScannerVisible(false);
          setIsScanning(false);
          return;
        }

        if (qrResponse?.status !== 200 || !qrResponse.day_id) {
          setResponseConfig({
            title: "Info",
            message: qrResponse?.message || "Unable to get day information.",
            isSuccess: false,
          });
          setShowResponseModal(true);
          setScannerVisible(false);
          setIsScanning(false);
          return;
        }

        payload = {
          gym_id: gymId,
          mode: "dailypass",
          day_id: qrResponse.day_id,
        };

        response = await scanCheckInAPI(payload);
      } else if (qrOptionsType === "session") {
        // Sessions - get checkin_token from selectedSession
        if (!selectedSession?.sessions) {
          setResponseConfig({
            title: "Info",
            message: "Session information not found.",
            isSuccess: false,
          });
          setShowResponseModal(true);
          setScannerVisible(false);
          setIsScanning(false);
          return;
        }

        // Find today's session
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySession = selectedSession.sessions.find((session) => {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === today.getTime();
        });

        if (!todaySession || !todaySession.checkin_token) {
          setResponseConfig({
            title: "Session Not Available",
            message:
              "No session found for today or check-in token missing. Please check your session details and try again.",
            isSuccess: false,
          });
          setShowResponseModal(true);
          setScannerVisible(false);
          setIsScanning(false);
          return;
        }
        payload = {
          gym_id: gymId,
          mode: "sessions",
          checkin_token: todaySession.checkin_token,
        };

        response = await scanCheckInAPI(payload);
      } else {
        setResponseConfig({
          title: "Invalid Operation",
          message: "Please select a pass or session first.",
          isSuccess: false,
        });
        setShowResponseModal(true);
        setScannerVisible(false);
        setIsScanning(false);
        return;
      }

      // Close all open modals
      setQrModalVisible(false);
      setSessionQrModalVisible(false);
      setShowQrOptionsModal(false);
      setScannerVisible(false);

      // Handle different response statuses
      if (response?.status === 409) {
        setResponseConfig({
          title: "Wrong Date",
          message:
            "This pass is valid for a different date. Please check the pass validity and try again.",
          isSuccess: false,
        });
        setShowResponseModal(true);
      } else if (response?.status === 403) {
        setResponseConfig({
          title: "Different Gym",
          message:
            "This pass was purchased from a different gym. You cannot use this pass at this gym.",
          isSuccess: false,
        });
        setShowResponseModal(true);
      } else if (response?.already_attended) {
        setResponseConfig({
          title: "Scan is Successful",
          message: "Start your workout session and have a great day!",
          isSuccess: true,
        });
        setShowResponseModal(true);
      } else if (response?.status === 200) {
        setResponseConfig({
          title: "Scan is Successful",
          message: "Start your workout session and have a great day!",
          isSuccess: true,
        });
        setShowResponseModal(true);
      } else {
        setResponseConfig({
          title: "Scan Failed",
          message:
            response?.message || "Unable to process scan. Please try again.",
          isSuccess: false,
        });
        setShowResponseModal(true);
      }
    } catch (error) {
      console.error("QR scanning error:", error);
      setResponseConfig({
        title: "Error",
        message: "Failed to process QR code. Please try again.",
        isSuccess: false,
      });
      setShowResponseModal(true);
      setScannerVisible(false);
    } finally {
      setIsScanning(false);
    }
  };

  const closeQRModal = () => {
    setQrModalVisible(false);
    setScannerVisible(false);
    setIsScanning(false);
    setShowQrOptionsModal(false);
    setQrOptionsType(null);
    setSelectedGym(null);
  };

  const closeScannerModal = () => {
    setScannerVisible(false);
    setIsScanning(false);
  };

  const handlePunchInPress = (gymData, gymLocationData) => {
    setQrModalVisible(false);
    setSelectedGym({
      ...gymData,
      showMuscleSelection: true,
      selectedMuscles: [],
      gym_location: gymLocationData, // Pass the gym location from the QR API response
    });
  };

  const handlePunchOutPress = (gymData) => {
    setQrModalVisible(false);
    setSelectedGym({ ...gymData, showExitConfirm: true });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handlePunchInConfirm = async () => {
    if (!selectedGym?.selectedMuscles?.length) return;

    try {
      setSelectedGym({ ...selectedGym, punchInLoading: true });

      // Check if we have gym location from getTodayQrAPI
      if (!selectedGym.gym_location) {
        showToast({
          type: "error",
          title: "Location Error",
          desc: "Gym location not available. Please try again.",
        });
        setSelectedGym({ ...selectedGym, punchInLoading: false });
        return;
      }

      // Check location permission
      let { status } = await requestForegroundPermissionsAsync();

      if (status !== "granted") {
        showToast({
          type: "error",
          title: "Permission Required",
          desc: "Location permission is required to punch in. Please enable it in settings.",
        });
        setSelectedGym({ ...selectedGym, punchInLoading: false });
        return;
      }

      // Add a small delay to ensure permission is fully processed
      if (Platform.OS === "ios") {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Get current location with retry logic
      let position = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!position && attempts < maxAttempts) {
        try {
          position = await getCurrentPositionAsync({
            accuracy:
              Platform.OS === "android"
                ? LocationAccuracy.High
                : LocationAccuracy.Best,
            maximumAge: 10000,
            timeout: 10000,
          });
          break;
        } catch (locationError) {
          attempts++;

          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } else {
            throw locationError;
          }
        }
      }

      if (!position) {
        throw new Error("Unable to get location after multiple attempts");
      }

      // Calculate distance from gym
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        selectedGym.gym_location.latitude,
        selectedGym.gym_location.longitude,
      );

      if (distance > ALLOWED_DISTANCE) {
        showToast({
          type: "error",
          title: "Location Error",
          desc: "You are not at the gym. Please punch in only when you are inside the gym.",
        });
        setSelectedGym({ ...selectedGym, punchInLoading: false });
        return;
      }

      // Proceed with punch in if location is valid
      const clientId = await AsyncStorage.getItem("client_id");

      const payload = {
        client_id: clientId,
        gym_id: selectedGym?.gym_id,
        muscle: selectedGym.selectedMuscles,
      };

      const response = await addPunchInAPI(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Punched In Successfully!",
        });
        // Reset all modal states
        setSelectedGym(null);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to punch in.",
        });
        setSelectedGym({ ...selectedGym, punchInLoading: false });
      }
    } catch (error) {
      console.error("Location/Punch in error:", error);

      let errorMessage =
        "Could not get your location. Please ensure location services are enabled and try again.";

      if (error.message.includes("denied")) {
        errorMessage =
          "Location access was denied. Please enable location permissions in settings.";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Location request timed out. Please try again.";
      } else if (error.message.includes("unavailable")) {
        errorMessage =
          "Location services are unavailable. Please check your device settings.";
      }

      showToast({
        type: "error",
        title: "Error",
        desc: errorMessage,
      });
      setSelectedGym({ ...selectedGym, punchInLoading: false });
    }
  };

  const handlePunchOutConfirm = async () => {
    try {
      setSelectedGym({ ...selectedGym, punchOutLoading: true });
      const clientId = await AsyncStorage.getItem("client_id");

      const payload = {
        client_id: clientId,
        gym_id: selectedGym?.gym_id,
      };

      const response = await addPunchOutAPI(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Punched Out Successfully!",
        });
        // Reset all modal states
        setSelectedGym(null);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to punch out.",
        });
        setSelectedGym({ ...selectedGym, punchOutLoading: false });
      }
    } catch (error) {
      console.error("Punch out error:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
      setSelectedGym({ ...selectedGym, punchOutLoading: false });
    }
  };

  const handleScanPassQR = (passItem) => {
    setSelectedGym(passItem);
    setQrOptionsType("daily");
    setScannerVisible(false);
    setIsScanning(false);
    handleScanGymQR();
  };

  // ── Pack Generation Handlers ──
  const handleGenerateDailyPass = (passItem) => {
    setSelectedPackPass(passItem);
    setPackSelectedDate(null);
    setShowPackCalendarModal(true);
  };

  const computeAvailableDates = (passItem) => {
    if (!passItem) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validFrom = new Date(passItem.valid_from || passItem.fromDate);
    validFrom.setHours(0, 0, 0, 0);
    const validUntil = new Date(passItem.valid_until || passItem.toDate);
    validUntil.setHours(0, 0, 0, 0);
    const attendedSet = new Set(passItem.attended_dates || []);
    const generatedSet = new Set(passItem.generated_dates || []);
    const available = [];
    const startDate = validFrom > today ? validFrom : today;
    const current = new Date(startDate);
    while (current <= validUntil) {
      const dateStr = current.toISOString().split("T")[0];
      if (!attendedSet.has(dateStr) && !generatedSet.has(dateStr)) {
        available.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
    return available;
  };

  const handleConfirmPackGeneration = async () => {
    if (!packSelectedDate || !selectedPackPass) return;
    setPackGenerating(true);
    try {
      const response = await generatePackDailyPassAPI(
        selectedPackPass.pass_id,
        packSelectedDate,
      );
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Pass Generated!",
          desc: `Daily pass generated for ${packSelectedDate}`,
        });
        setShowPackCalendarModal(false);
        setSelectedPackPass(null);
        setPackSelectedDate(null);
        await fetchAllPasses();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.message || "Failed to generate daily pass.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to generate daily pass. Please try again.",
      });
    } finally {
      setPackGenerating(false);
    }
  };

  const handlePackStatsPress = (item) => {
    setPackDetailsItem(item);
    setShowPackDetailsModal(true);
  };

  // Get today's date in IST (UTC+5:30)
  const getTodayIST = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000);
    return istDate.toISOString().split("T")[0];
  };

  const categorizePackDates = (passItem) => {
    if (!passItem) return { expired: [], today: null, active: [] };
    const todayStr = getTodayIST();
    const generatedDates = passItem.generated_dates || [];

    const expired = [];
    let today = null;
    const active = [];

    generatedDates.forEach((dateStr) => {
      if (dateStr < todayStr) {
        expired.push(dateStr);
      } else if (dateStr === todayStr) {
        today = dateStr;
      } else {
        active.push(dateStr);
      }
    });

    // Sort dates
    expired.sort();
    active.sort();

    return { expired, today, active };
  };

  const renderPass = ({ item }) => {
    if (item.consumption_mode === "pack") {
      return (
        <PackPassCard
          item={item}
          onGeneratePress={handleGenerateDailyPass}
          onScanPress={handleScanPassQR}
          onStatsPress={handlePackStatsPress}
        />
      );
    }
    return (
      <PassCard
        item={item}
        router={router}
        onQRPress={handleQRPress}
        onScanPress={handleScanPassQR}
      />
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Daily Pass & Fitness Class Bookings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
            onPress={() => {
              setActiveTab(tab);
              if (tab === "Fitness Classes") {
                fetchBookedSessions();
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on active tab */}
      {/* Daily Pass tab */}
      <View
        style={{
          display: activeTab === "Daily Pass" ? "flex" : "none",
          flex: 1,
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>Loading your passes...</Text>
          </View>
        ) : passes.length === 0 ? (
          <>
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-note" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No Daily Passes Found</Text>
              <Text style={styles.emptySubtitle}>
                You haven't purchased any daily passes yet.
              </Text>
            </View>
          </>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          >
            <FlatList
              data={passes}
              renderItem={renderPass}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dpListContainer}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              onViewableItemsChanged={onPassViewableItemsChanged.current}
              viewabilityConfig={passViewabilityConfig.current}
            />
            {passes.length > 1 && (
              <View style={styles.dotRow}>
                {passes.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activePassIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}

            {nutritionCardVariant && (
              <>
                {nutritionCardVariant && (
                  <View style={styles.dietPlansHeader}>
                    <LinearGradient
                      colors={["#EBF5FF", "#FFFFFF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.membershipHeadingCard,
                        { marginBottom: 0 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectionHeading,
                          { marginBottom: 0, flex: 1, textAlign: "left" },
                        ]}
                      >
                        Fix Your Diet Now!
                      </Text>
                    </LinearGradient>
                  </View>
                )}

                {nutritionCardVariant === "nutri_basic" && (
                  <View
                    style={[
                      styles.section,
                      { paddingHorizontal: ps(12), paddingTop: 0 },
                    ]}
                  >
                    <View style={styles.promo199Card}>
                      <Image
                        source={require("../../assets/images/home_199_nutrition_card.webp")}
                        style={styles.promo199Image}
                        contentFit="cover"
                      />
                      <View style={styles.promo199Footer}>
                        <View style={styles.promo199PriceRow}>
                          <Text style={styles.promo199Price}>₹199</Text>
                          <Text style={styles.promo199Sub}>
                            {" "}
                            / 60 min Session
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.promo199Btn}
                          activeOpacity={0.85}
                          onPress={() => handleNutritionPurchase("nutri_basic")}
                        >
                          <Text style={styles.promo199BtnText}>
                            Talk to an Expert Now
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {nutritionCardVariant === "ai_diet_coach" && (
                  <View
                    style={[
                      styles.section,
                      {
                        marginTop: ps(15),
                        paddingTop: 0,
                        paddingHorizontal: ps(12),
                      },
                    ]}
                  >
                    <View style={styles.promoAiCard}>
                      <Image
                        source={require("../../assets/images/home_ai_diet_card.webp")}
                        style={styles.promoAiImage}
                        contentFit="cover"
                      />
                      <View style={styles.promoAiFooter}>
                        <View style={styles.promoAiPriceRow}>
                          <Text style={styles.promoAiPrice}>₹499</Text>
                          <Text style={styles.promoAiSub}> / month</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.promoAiBtnWrap}
                          activeOpacity={0.85}
                          onPress={() =>
                            handleNutritionPurchase("ai_diet_coach")
                          }
                        >
                          <LinearGradient
                            colors={["#3C65D3", "#739FD1"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.promoAiBtn}
                          >
                            <Text style={styles.promoAiBtnText}>
                              Unlock Your AI Plan
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>

      {/* Fitness Classes tab */}
      <View
        style={{
          display: activeTab === "Fitness Classes" ? "flex" : "none",
          flex: 1,
        }}
      >
        {sessionsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={styles.loadingText}>
              Loading your Fitness Classes...
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="event-available" size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No Fitness Classes Found</Text>
            <Text style={styles.emptySubtitle}>
              You haven't booked any fitness classes yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={({ item }) => (
              <SessionCard
                item={item}
                onFullSchedule={handleFullSchedule}
                onScanQR={handleScanQR}
                formatDateShort={formatDateShort}
              />
            )}
            keyExtractor={(item) => item.purchase_id.toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          />
        )}
      </View>

      {/* QR Code Modal */}
      <QRModal
        visible={qrModalVisible}
        onClose={closeQRModal}
        gymData={selectedGym}
        onPunchInPress={handlePunchInPress}
        onPunchOutPress={handlePunchOutPress}
      />

      {/* Additional Modals rendered separately to avoid nesting issues */}
      {selectedGym && (
        <>
          {/* Muscle Selection Modal */}
          <Modal
            visible={selectedGym?.showMuscleSelection || false}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setSelectedGym({
                ...selectedGym,
                showMuscleSelection: false,
                selectedMuscles: [],
              });
            }}
          >
            <TouchableWithoutFeedback
              onPress={() => {
                setSelectedGym({
                  ...selectedGym,
                  showMuscleSelection: false,
                  selectedMuscles: [],
                });
              }}
            >
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Muscle Groups</Text>
                    <Text style={styles.modalSubtitle}>
                      Which areas are you planning to workout today?
                    </Text>

                    <View style={styles.muscleGroupsModalContainer}>
                      {muscleGroups.map((muscle) => (
                        <TouchableOpacity
                          key={muscle}
                          style={[
                            styles.muscleGroupItem,
                            (selectedGym?.selectedMuscles || []).includes(
                              muscle,
                            ) && styles.selectedMuscleGroupItem,
                          ]}
                          onPress={() => {
                            const currentMuscles =
                              selectedGym?.selectedMuscles || [];
                            const newMuscles = currentMuscles.includes(muscle)
                              ? currentMuscles.filter((m) => m !== muscle)
                              : [...currentMuscles, muscle];
                            setSelectedGym({
                              ...selectedGym,
                              selectedMuscles: newMuscles,
                            });
                          }}
                        >
                          <Text
                            style={[
                              styles.muscleGroupItemText,
                              (selectedGym?.selectedMuscles || []).includes(
                                muscle,
                              ) && styles.selectedMuscleGroupItemText,
                            ]}
                          >
                            {muscle}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.modalButtonsContainer}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() => {
                          setSelectedGym({
                            ...selectedGym,
                            showMuscleSelection: false,
                            selectedMuscles: [],
                          });
                        }}
                      >
                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.modalConfirmButton,
                          (!selectedGym?.selectedMuscles?.length ||
                            selectedGym?.punchInLoading) &&
                            styles.disabledConfirmButton,
                        ]}
                        disabled={
                          !selectedGym?.selectedMuscles?.length ||
                          selectedGym?.punchInLoading
                        }
                        onPress={handlePunchInConfirm}
                      >
                        {selectedGym?.punchInLoading ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.modalConfirmButtonText}>
                            Confirm
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Exit Confirmation Modal */}
          <Modal
            visible={selectedGym?.showExitConfirm || false}
            transparent
            animationType="fade"
            onRequestClose={() =>
              setSelectedGym({ ...selectedGym, showExitConfirm: false })
            }
          >
            <TouchableWithoutFeedback
              onPress={() =>
                setSelectedGym({ ...selectedGym, showExitConfirm: false })
              }
            >
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Confirm Gym Exit</Text>
                    <Text style={styles.modalSubtitle}>
                      Are you sure you want to end your workout session?
                    </Text>

                    <View style={styles.modalButtonsContainer}>
                      <TouchableOpacity
                        style={styles.modalCancelButton}
                        onPress={() =>
                          setSelectedGym({
                            ...selectedGym,
                            showExitConfirm: false,
                          })
                        }
                      >
                        <Text style={styles.modalCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.modalConfirmButton}
                        disabled={selectedGym?.punchOutLoading}
                        onPress={handlePunchOutConfirm}
                      >
                        {selectedGym?.punchOutLoading ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.modalConfirmButtonText}>
                            Confirm
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </>
      )}

      {/* Session Modals */}
      <FullScheduleModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        sessionData={selectedSession}
        formatDateFull={formatDateFull}
      />

      <SessionQRModal
        visible={sessionQrModalVisible}
        onClose={() => setSessionQrModalVisible(false)}
        sessionData={selectedSession}
      />

      {/* QR Options Modal */}
      <Modal
        visible={showQrOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={closeQRModal}
      >
        <TouchableWithoutFeedback onPress={closeQRModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.optionsModalContent}>
                {/* Header with title and close button */}
                <View style={styles.optionsModalHeader}>
                  <View style={{ width: 24 }} />
                  <Text style={styles.optionsModalTitle}>Check In</Text>
                  <TouchableOpacity
                    onPress={closeQRModal}
                    style={styles.optionsCloseButton}
                  >
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.optionsModalSubtitle}>
                  How would you like to check in at{" "}
                  {qrOptionsType === "session"
                    ? selectedSession?.gym_name
                    : selectedGym?.gymName}
                  ?
                </Text>

                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleShowQR}
                  >
                    <View style={styles.optionIconContainer}>
                      <MaterialIcons name="qr-code" size={28} color="#007BFF" />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>
                        Show QR to Gym Admin
                      </Text>
                      <Text style={styles.optionDescription}>
                        Display your QR code for the gym staff to scan
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={handleScanGymQR}
                  >
                    <View style={styles.optionIconContainer}>
                      <MaterialIcons
                        name="qr-code-scanner"
                        size={28}
                        color="#007BFF"
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>
                        Scan Gym QR for Self Check-In
                      </Text>
                      <Text style={styles.optionDescription}>
                        Scan the gym's QR code for self check-in
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={closeScannerModal}
        statusBarTranslucent={true}
      >
        <View style={styles.scannerContainer}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeScannerModal}
            >
              <MaterialIcons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan Gym QR Code</Text>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={isScanning ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
            <View style={styles.scannerOverlay} pointerEvents="none">
              <View style={styles.scannerFrame} />
            </View>
          </View>

          <View style={styles.scannerInstructions}>
            <MaterialIcons name="info" size={24} color="#007AFF" />
            <Text style={styles.instructionText}>
              Position the gym's QR code within the frame to scan
            </Text>
          </View>

          {isScanning && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.scanningText}>Processing...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Response Modal for Self Check-In */}
      <Modal
        visible={showResponseModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowResponseModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowResponseModal(false)}>
          <View style={styles.responseModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.responseModalContent}>
                {/* Icon */}
                <View
                  style={[
                    styles.responseIconContainer,
                    responseConfig.isSuccess
                      ? styles.successIconContainer
                      : styles.errorIconContainer,
                  ]}
                >
                  <MaterialIcons
                    name={responseConfig.isSuccess ? "check-circle" : "error"}
                    size={60}
                    color={responseConfig.isSuccess ? "#4CAF50" : "#F44336"}
                  />
                </View>

                {/* Title */}
                <Text style={styles.responseModalTitle}>
                  {responseConfig.title}
                </Text>

                {/* Message */}
                <Text style={styles.responseModalMessage}>
                  {responseConfig.message}
                </Text>

                {/* Close Button */}
                <TouchableOpacity
                  style={[
                    styles.responseModalButton,
                    responseConfig.isSuccess
                      ? styles.successButton
                      : styles.errorButton,
                  ]}
                  onPress={() => setShowResponseModal(false)}
                >
                  <Text style={styles.responseModalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* WhatsApp Support Button */}
      <TouchableOpacity
        style={[styles.whatsappFab, { bottom: insets.bottom + 20 }]}
        onPress={() => Linking.openURL("https://wa.me/9743971315")}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="whatsapp" size={16} color="#fff" />
        <Text style={styles.whatsappFabText}>Support</Text>
      </TouchableOpacity>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

      {/* ── Nutrition Payment Processing Modal ── */}
      {nutriPayProcessing && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => {}}
          statusBarTranslucent
        >
          <View style={styles.joinModalOverlay}>
            <View style={styles.joinModalContent}>
              <ActivityIndicator size="large" color="#28A745" />
              <Text
                style={[
                  styles.joinModalTitle,
                  { marginTop: 16, color: "#333" },
                ]}
              >
                Processing Payment
              </Text>
              {nutriPayStep ? (
                <Text style={styles.joinModalMessage}>{nutriPayStep}</Text>
              ) : null}
            </View>
          </View>
        </Modal>
      )}

      {/* ── Nutrition Purchase Success Modal ── */}
      {nutriPaySuccess && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => {
            setNutriPaySuccess(false);
            fetchAllPasses();
          }}
          statusBarTranslucent
        >
          <View style={styles.joinModalOverlay}>
            <View style={styles.joinModalContent}>
              <View
                style={[
                  styles.joinModalIconWrap,
                  { backgroundColor: "#F0FFF4" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={48} color="#28A745" />
              </View>
              <Text style={[styles.joinModalTitle, { color: "#28A745" }]}>
                Purchase Successful!
              </Text>
              <Text style={styles.joinModalMessage}>
                {lastPurchasedSku.current === "ai_diet_coach"
                  ? "Your AI Diet Coach plan is now active. Generate your personalized diet plan now!"
                  : "Your nutrition package is active. Book your session now to get started!"}
              </Text>
              <TouchableOpacity
                style={[styles.nutriJoinBtn, { marginTop: 16, width: "100%" }]}
                activeOpacity={0.85}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchAllPasses();
                  if (lastPurchasedSku.current === "ai_diet_coach") {
                    router.push("/client/(dietcoach)/height");
                  } else {
                    router.push("/client/nutritionBooking");
                  }
                }}
              >
                <Text style={styles.nutriJoinBtnText}>
                  {lastPurchasedSku.current === "ai_diet_coach"
                    ? "Generate Your Diet Plan"
                    : "Book Your Slot Now"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 8 }}
                activeOpacity={0.7}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchAllPasses();
                }}
              >
                <Text
                  style={{ color: "#888", fontSize: 14, fontWeight: "500" }}
                >
                  {lastPurchasedSku.current === "ai_diet_coach"
                    ? "I'll do it later"
                    : "I'll book later"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Nutrition Purchase Failed Modal ── */}
      {/* ── Pack Date Picker Modal ── */}
      <Modal
        visible={showPackCalendarModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPackCalendarModal(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback
          onPress={() => setShowPackCalendarModal(false)}
        >
          <View style={styles.pkModalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.pkModalContent,
                  { paddingBottom: insets.bottom + 20 },
                ]}
              >
                {/* Header */}
                <View style={styles.pkModalHeader}>
                  <Text style={styles.pkModalTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowPackCalendarModal(false)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pkModalSubtitle}>
                  Choose a date to generate your daily pass
                </Text>

                {/* Calendar */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 340 }}
                >
                  <CustomCalendarContinuous
                    numberOfDays={1}
                    mode="continuous"
                    onSelectionChange={(dates) => {
                      if (dates && dates.length > 0) {
                        const d = dates[0];
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                        setPackSelectedDate(dateStr);
                      } else {
                        setPackSelectedDate(null);
                      }
                    }}
                    availableDates={computeAvailableDates(selectedPackPass)}
                  />
                </ScrollView>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={[
                    styles.pkConfirmBtn,
                    !packSelectedDate && styles.pkConfirmBtnDisabled,
                  ]}
                  disabled={!packSelectedDate || packGenerating}
                  onPress={handleConfirmPackGeneration}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      packSelectedDate
                        ? ["#22C55E", "#16A34A"]
                        : ["#CCC", "#AAA"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pkConfirmGradient}
                  >
                    {packGenerating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.pkConfirmText}>
                        Confirm & Generate
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Pack Details Modal ── */}
      <Modal
        visible={showPackDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPackDetailsModal(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback
          onPress={() => setShowPackDetailsModal(false)}
        >
          <View style={styles.pkModalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.pkModalContent,
                  { paddingBottom: insets.bottom + 20 },
                ]}
              >
                {/* Header */}
                <View style={styles.pkModalHeader}>
                  <Text style={styles.pkModalTitle}>Pass Details</Text>
                  <TouchableOpacity
                    onPress={() => setShowPackDetailsModal(false)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.pkModalSubtitle}>
                  Your generated pass dates
                </Text>

                {/* Date List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 400 }}
                >
                  {(() => {
                    const { expired, today, active } = categorizePackDates(packDetailsItem);
                    const hasAny = expired.length > 0 || today || active.length > 0;

                    if (!hasAny) {
                      return (
                        <View style={styles.pkDetEmpty}>
                          <Text style={styles.pkDetEmptyText}>
                            No passes generated yet
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.pkDetList}>
                        {/* Active (today + future) */}
                        {(today || active.length > 0) && (
                          <View style={styles.pkDetSection}>
                            <Text style={styles.pkDetSectionTitle}>Active</Text>
                            {today && (
                              <View style={[styles.pkDetDateRow, styles.pkDetDateToday]}>
                                <View style={[styles.pkDetDot, { backgroundColor: "#22C55E" }]} />
                                <Text style={styles.pkDetDateText}>
                                  {formatPackDateStr(today)}
                                </Text>
                                <View style={styles.pkDetBadgeToday}>
                                  <Text style={styles.pkDetBadgeTodayText}>Today</Text>
                                </View>
                              </View>
                            )}
                            {active.map((dateStr) => (
                              <View key={dateStr} style={styles.pkDetDateRow}>
                                <View style={[styles.pkDetDot, { backgroundColor: "#3B82F6" }]} />
                                <Text style={styles.pkDetDateText}>
                                  {formatPackDateStr(dateStr)}
                                </Text>
                                <View style={styles.pkDetBadgeActive}>
                                  <Text style={styles.pkDetBadgeActiveText}>Upcoming</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Expired */}
                        {expired.length > 0 && (
                          <View style={styles.pkDetSection}>
                            <Text style={styles.pkDetSectionTitle}>Expired</Text>
                            {expired.map((dateStr) => (
                              <View key={dateStr} style={[styles.pkDetDateRow, styles.pkDetDateExpired]}>
                                <View style={[styles.pkDetDot, { backgroundColor: "#9CA3AF" }]} />
                                <Text style={[styles.pkDetDateText, { color: "#9CA3AF" }]}>
                                  {formatPackDateStr(dateStr)}
                                </Text>
                                <View style={styles.pkDetBadgeExpired}>
                                  <Text style={styles.pkDetBadgeExpiredText}>Expired</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {nutriPayFailed && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => setNutriPayFailed(false)}
          statusBarTranslucent
        >
          <View style={styles.joinModalOverlay}>
            <View style={styles.joinModalContent}>
              <View
                style={[
                  styles.joinModalIconWrap,
                  { backgroundColor: "#FFF0F0" },
                ]}
              >
                <Ionicons name="close-circle" size={48} color="#FF5757" />
              </View>
              <Text style={[styles.joinModalTitle, { color: "#FF5757" }]}>
                Payment Failed
              </Text>
              <Text style={styles.joinModalMessage}>
                Payment could not be processed. Please try again.
              </Text>
              <TouchableOpacity
                style={[styles.nutriJoinBtn, { marginTop: 16, width: "100%" }]}
                activeOpacity={0.85}
                onPress={() => setNutriPayFailed(false)}
              >
                <Text style={styles.nutriJoinBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default AllPass;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 150,
  },
  ticketContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#ddd",
  },
  ticket: {
    flex: 1,
    padding: 16,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  gymInfo: {
    flex: 1,
    marginRight: 12,
  },
  gymName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 6,
    backgroundColor: "#F5F5F5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  address: {
    fontSize: 12,
    color: "#666666",
    marginLeft: 8,
    flex: 1,
  },
  clickableAddress: {
    color: "#007BFF",
    // textDecorationLine: "underline",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFF",
  },
  dottedLineContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 0,
  },
  dot: {
    width: 6,
    height: 2,
    backgroundColor: "#D5D5D5",
  },
  dateTimeSection: {
    marginBottom: 8,
  },
  originalDatesSection: {
    marginBottom: 2,
  },
  originalDatesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF9800",
    marginBottom: 4,
    textAlign: "center",
  },
  editedDatesSection: {
    marginBottom: 8,
  },
  editedDatesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22C55E",
    marginBottom: 4,
    textAlign: "center",
  },
  editedDateBox: {
    borderColor: "#22C55E",
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
  },
  dateLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fromToLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    flex: 1,
    textAlign: "left",
    marginLeft: 12,
  },
  dateBoxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  timeRow: {
    alignItems: "flex-start",
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: "100%",
  },
  timeLeftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    fontWeight: "500",
  },
  timeValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },
  actionSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  upgradedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
    flex: 1,
  },
  upgradedText: {
    fontSize: 14,
    color: "#166534",
    marginLeft: 8,
    fontWeight: "500",
  },
  upgradedGymName: {
    fontWeight: "600",
    color: "#22C55E",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22C55E",
    flex: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  editButtonDisabled: {
    borderColor: "#DDD",
    backgroundColor: "#F9F9F9",
  },
  editButtonText: {
    fontSize: 12,
    color: "#22C55E",
    marginLeft: 4,
    fontWeight: "500",
  },
  editButtonTextDisabled: {
    color: "#999",
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF5757",
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
  upgradeButtonDisabled: {
    borderColor: "#DDD",
    backgroundColor: "#F9F9F9",
  },
  upgradeButtonText: {
    fontSize: 12,
    color: "#FF5757",
    marginLeft: 4,
    fontWeight: "500",
  },
  upgradeButtonTextDisabled: {
    color: "#999",
  },
  noteSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    // backgroundColor: "#FFF9E6",
    padding: 8,
    borderRadius: 6,
    marginBottom: 0,
    paddingVertical: 0,
  },
  noteText: {
    fontSize: 10,
    color: "#666",
    marginLeft: 2,
    flex: 1,
    lineHeight: 14,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#007BFF",
    borderRadius: 8,
    width: "100%",
    marginTop: 8,
  },
  contactButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "600",
  },
  contactSection: {
    alignItems: "center",
    marginTop: 4,
  },
  contactText: {
    fontSize: 11,
    color: "#999",
    marginLeft: 0,
  },
  contactLink: {
    fontSize: 11,
    color: "#007BFF",
    fontWeight: "500",
  },
  qrSection: {
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
  },
  qrPlaceholder: {
    width: 40,
    height: 40,
    borderWidth: 1.5,
    borderColor: "#007BFF",
    borderStyle: "dashed",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketStub: {
    width: 40,
  },
  stubGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    minWidth: 300,
    maxWidth: screenWidth - 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalGymName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007BFF",
    marginBottom: 8,
    textAlign: "center",
  },
  qrDate: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "500",
  },
  qrContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 240,
  },
  qrLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  qrLoadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  qrErrorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  qrErrorText: {
    fontSize: 14,
    color: "#FF5757",
    marginTop: 8,
    textAlign: "center",
  },
  qrInstructions: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 20,
  },
  punchButtonsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  punchInButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  punchOutButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  punchButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    gap: 8,
  },
  statusTextModal: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  punchStatusContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    width: "100%",
  },
  punchStatusRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  punchStatusLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  punchStatusValue: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  muscleGroupsModalContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 24,
  },
  muscleGroupItem: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 4,
    marginVertical: 6,
  },
  selectedMuscleGroupItem: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },
  muscleGroupItemText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  selectedMuscleGroupItemText: {
    color: "#FFF",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    flex: 0.5,
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#007BFF",
    flex: 0.45,
    alignItems: "center",
  },
  disabledConfirmButton: {
    opacity: 0.5,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#fff",
    paddingBottom: 10,
    gap: 10,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 7,
    backgroundColor: "#EEEEEE",
  },
  activeTabButton: {
    borderColor: "#FF5757",
    backgroundColor: "#FF5757",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#454545",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  // Session Card Styles
  sessionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  sessionGradientCard: {
    padding: 20,
    paddingHorizontal: 0,
    borderRadius: 16,
  },
  sessionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 2,
    paddingBottom: 14,
    borderBottomColor: "#ffffff",
    paddingHorizontal: 16,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionCrownIcon: {
    width: 20,
    height: 20,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sessionActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#01BE2C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  sessionActiveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  sessionCardBody: {
    gap: 8,
    paddingHorizontal: 16,
  },
  sessionGymContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionGymName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  sessionTrainerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  sessionTrainerName: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  sessionAddressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(91, 43, 155, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sessionAddressText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    flex: 1,
  },
  sessionClickableAddress: {
    color: "#5B2B9B",
    textDecorationLine: "underline",
  },
  sessionDatesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sessionDateLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  sessionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  fullScheduleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(91, 43, 155, 0.08)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(91, 43, 155, 0.2)",
  },
  fullScheduleButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  scanQrButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 60, 123, 0.08)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 60, 123, 0.2)",
  },
  scanQrButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  sessionContactSection: {
    alignItems: "center",
    marginTop: 4,
  },
  sessionContactText: {
    fontSize: 11,
    color: "#999",
  },
  sessionContactLink: {
    fontSize: 11,
    color: "#5B2B9B",
    fontWeight: "500",
  },
  // Schedule Modal Styles
  scheduleModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    width: screenWidth - 32,
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scheduleModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  scheduleModalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
  scheduleCloseButton: {
    padding: 4,
  },
  scheduleSessionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    marginBottom: 16,
  },
  scheduleScrollView: {
    flexGrow: 0,
  },
  scheduleScrollContent: {
    paddingBottom: 8,
  },
  scheduleCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  scheduleTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF3B30",
  },
  // QR Options Modal Styles
  optionsModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: screenWidth - 40,
    maxWidth: screenWidth - 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    paddingHorizontal: 12,
  },
  optionsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  optionsModalSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    width: "100%",
  },
  optionsCloseButton: {
    padding: 4,
  },
  optionsContainer: {
    width: "100%",
    gap: 12,
  },
  optionButton: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
    paddingHorizontal: 10,
  },
  optionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  // Scanner Modal Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 16,
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  scannerInstructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 12,
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  scanningIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -75 }, { translateY: -50 }],
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  scanningText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 8,
  },
  responseModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  responseModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  responseIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIconContainer: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
  },
  errorIconContainer: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
  },
  responseModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  responseModalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  responseModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#4CAF50",
  },
  errorButton: {
    backgroundColor: "#F44336",
  },
  responseModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  whatsappFab: {
    position: "absolute",
    bottom: 40,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  whatsappFabText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Daily Pass card (new design) ──
  dpListContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#C8C8C8",
  },
  dotActive: {
    backgroundColor: "#007BFF",
    width: 18,
    borderRadius: 4,
  },
  dpCard: {
    width: screenWidth - 32,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  dpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
    paddingTop: 0,
  },
  dpTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  dpBadge: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  dpBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  dpGymRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  dpGymImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#DDD",
  },
  dpGymInfo: {
    flex: 1,
    justifyContent: "center",
  },
  dpGymName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },

  dpGymLocality: {
    fontSize: 12,
    color: "#555",
    marginBottom: 4,
  },
  dpViewMapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dpViewMap: {
    fontSize: 12,
    color: "#2F45C7",
    fontWeight: "600",
  },
  dpChipsScroll: {
    marginBottom: 14,
  },
  dpChipsContent: {
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  dpChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  dpChipNext: {
    backgroundColor: "#FFF",
    borderColor: "#C0C0D0",
  },
  dpChipDone: {
    backgroundColor: "#D4EDDA",
    borderColor: "#28A745",
  },
  dpChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#444",
  },
  dpChipTextDone: {
    color: "#155724",
  },
  dpQrWrapper: {
    maxWidth: 260,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    margin: "auto",
  },
  dpQrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  dpQrPlaceholderText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  dpQrHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 10,
  },
  dpOrRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dpOrLine: {
    flex: 1,
    height: 1,
    borderStyle: "dotted",
    borderWidth: 1,
    borderColor: "#B0B0C0",
    borderRadius: 1,
  },
  dpOrText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginHorizontal: 8,
  },
  dpScanBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  dpScanGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  dpScanText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
    flex: 1,
    textAlign: "center",
  },
  dpScanArrow: {
    fontSize: 14,
    color: "#FFF",
    fontWeight: "700",
  },
  dpHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
  },
  dpHelpText: {
    fontSize: 13,
    color: "#555",
  },
  dpHelpLink: {
    color: "#2F45C7",
    fontWeight: "600",
  },
  // ── Nutrition card section (mirrors home.jsx exactly) ──
  section: {
    paddingHorizontal: 10,
    paddingTop: 16,
    backgroundColor: "#ffffff",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 0,
    marginHorizontal: 10,
  },
  dietPlansHeader: {
    marginTop: ps(24),
    marginBottom: ps(15),
  },
  membershipHeadingCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  // ── Talk to Expert (₹199) Card ──
  promo199Card: {
    height: ps(312),
    borderRadius: ps(14),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#E5E5E5",
  },
  promo199Image: {
    width: "100%",
    aspectRatio: 1024 / 576,
  },
  promo199Footer: {
    flex: 1,
    paddingHorizontal: ps(16),
    paddingTop: ps(10),
    paddingBottom: ps(14),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F6F7",
  },
  promo199PriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ps(10),
  },
  promo199Price: {
    fontSize: ps(28),
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: ps(32),
  },
  promo199Sub: {
    fontSize: ps(13),
    color: "#666",
    marginBottom: ps(4),
  },
  promo199Btn: {
    width: ps(220),
    height: ps(40),
    backgroundColor: "#FF5757",
    borderRadius: ps(10),
    alignItems: "center",
    justifyContent: "center",
  },
  promo199BtnText: {
    color: "#fff",
    fontSize: ps(15),
    fontWeight: "700",
  },
  // ── AI Diet Coach (₹499) Card ──
  promoAiCard: {
    height: ps(250),
    borderRadius: ps(14),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: Platform.OS === "ios" ? 1 : 0,
    borderColor: "#E5E5E5",
  },
  promoAiImage: {
    width: "100%",
    aspectRatio: 1366 / 488,
  },
  promoAiFooter: {
    flex: 1,
    paddingHorizontal: ps(16),
    paddingTop: ps(8),
    paddingBottom: ps(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F7",
  },
  promoAiPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: ps(8),
  },
  promoAiPrice: {
    fontSize: ps(26),
    fontWeight: "800",
    color: "#1A1A1A",
    lineHeight: ps(30),
  },
  promoAiSub: {
    fontSize: ps(13),
    color: "#666",
    marginBottom: ps(3),
  },
  promoAiBtnWrap: {
    width: ps(220),
    height: ps(40),
    borderRadius: ps(10),
    overflow: "hidden",
  },
  promoAiBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  promoAiBtnText: {
    color: "#fff",
    fontSize: ps(15),
    fontWeight: "700",
  },
  // ── Nutrition payment modals (mirrors home.jsx) ──
  joinModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  joinModalContent: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 8,
  },
  joinModalIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EEF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  joinModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  joinModalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  nutriJoinBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  nutriJoinBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Pack Pass Card Styles ──
  pkStatsBox: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  pkStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 6,
  },
  pkStatItem: {
    alignItems: "center",
  },
  pkStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A2E",
  },
  pkStatLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginTop: 1,
  },
  pkStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#D0D0D0",
  },
  pkProgressBar: {
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 6,
    overflow: "hidden",
  },
  pkProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  pkValidityText: {
    fontSize: 11,
    color: "#555",
    textAlign: "center",
    fontWeight: "500",
  },
  pkGenerateBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  pkGenerateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  pkGenerateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  pkQrDateLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
    textAlign: "center",
  },

  // ── Pack Calendar Modal Styles ──
  pkModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pkModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  pkModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pkModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  pkModalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  pkConfirmBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 16,
  },
  pkConfirmBtnDisabled: {
    opacity: 0.6,
  },
  pkConfirmGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  pkConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },

  // ── Pack Stats Box Inner ──
  pkStatsBoxInner: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Pack Details Modal Styles ──
  pkDetList: {
    gap: 16,
  },
  pkDetSection: {
    gap: 8,
  },
  pkDetSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pkDetDateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pkDetDateToday: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  pkDetDateExpired: {
    backgroundColor: "#F9FAFB",
  },
  pkDetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pkDetDateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  pkDetBadgeToday: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkDetBadgeTodayText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  pkDetBadgeActive: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkDetBadgeActiveText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  pkDetBadgeExpired: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pkDetBadgeExpiredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  pkDetEmpty: {
    alignItems: "center",
    paddingVertical: 30,
  },
  pkDetEmptyText: {
    fontSize: 14,
    color: "#999",
  },
});
