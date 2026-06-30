import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  RefreshControl,
  BackHandler,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import QRCode from "react-native-qrcode-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getUUIDAPI,
  cancelMembershipAPI,
  PauseMembershipAPI,
  ContinueMembershipAPI,
  deleteRequestAPI,
} from "../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "../../utils/Toaster";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Skeleton Loader Component
const ActivateAccountSkeleton = ({ insets }) => {
  const [shimmerAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({ width, height, style }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E5E7EB",
          borderRadius: 8,
          opacity: shimmerOpacity,
        },
        style,
      ]}
    />
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header Skeleton */}
      <View style={styles.headerContainer}>
        <SkeletonBox width={30} height={30} style={{ borderRadius: 15 }} />
        <SkeletonBox width={150} height={20} />
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Active Membership Skeleton */}
        <View style={styles.section}>
          <SkeletonBox width={140} height={18} style={{ marginBottom: 12 }} />
          <View style={styles.activeMembershipCard}>
            <View
              style={[
                styles.activeCardGradient,
                { backgroundColor: "#F3F4F6" },
              ]}
            >
              <SkeletonBox
                width={80}
                height={24}
                style={{ borderRadius: 20, marginBottom: 12 }}
              />
              <SkeletonBox
                width="70%"
                height={24}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                width="40%"
                height={16}
                style={{ marginBottom: 16 }}
              />
              <View style={styles.activeDetailsRow}>
                <SkeletonBox width="45%" height={18} />
                <SkeletonBox width="45%" height={18} />
              </View>
              <SkeletonBox
                width="100%"
                height={40}
                style={{ marginTop: 16, borderRadius: 10 }}
              />
            </View>
          </View>
        </View>

        {/* Partner Gym Skeleton */}
        <View style={styles.section}>
          <SkeletonBox width={130} height={18} style={{ marginBottom: 12 }} />
          <View style={styles.partnerCard}>
            <View style={styles.partnerCardHeader}>
              <SkeletonBox
                width={56}
                height={56}
                style={{ borderRadius: 28, marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <SkeletonBox
                  width="80%"
                  height={16}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox width="100%" height={14} />
              </View>
              <SkeletonBox width={24} height={24} />
            </View>
          </View>
        </View>

        {/* Upcoming Plans Skeleton */}
        <View style={styles.section}>
          <SkeletonBox width={200} height={18} style={{ marginBottom: 12 }} />
          {[1, 2].map((item) => (
            <View key={item} style={styles.upcomingCard}>
              <View style={styles.upcomingCardHeader}>
                <SkeletonBox
                  width={44}
                  height={44}
                  style={{ borderRadius: 22 }}
                />
                <SkeletonBox
                  width={90}
                  height={20}
                  style={{ borderRadius: 12 }}
                />
              </View>
              <SkeletonBox
                width="60%"
                height={20}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBox
                width="40%"
                height={16}
                style={{ marginBottom: 12 }}
              />
              <View style={styles.upcomingDetailsContainer}>
                <SkeletonBox
                  width="100%"
                  height={16}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox
                  width="100%"
                  height={16}
                  style={{ marginBottom: 8 }}
                />
                <SkeletonBox width="100%" height={16} />
              </View>
              <SkeletonBox
                width="100%"
                height={32}
                style={{ borderRadius: 8 }}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default function ActivateAccount({ route }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [uuid, setUuid] = useState(null);
  const [membershipCards, setMembershipCards] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedQRData, setSelectedQRData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [cancellingMembership, setCancellingMembership] = useState(false);
  const [pausingMembership, setPausingMembership] = useState(false);
  const [continuingMembership, setContinuingMembership] = useState(false);
  const [activeTab, setActiveTab] = useState("membership"); // "membership" or "pt"
  const [sentRequest, setSentRequest] = useState(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchData = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Failed to load activation details",
        });
        return;
      }
      const response = await getUUIDAPI(clientId);

      if (response?.status === 200) {
        setUuid(response.data.uuid);
        setMembershipCards(response?.data?.membership_cards || []);
        setSentRequest(response?.data?.sent_request || null);
        setUserData({
          name: response?.data.name,
          contact: response?.data.contact,
          email: response?.data.email,
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace({
          pathname: "/client/account",
        });
        return true;
      },
    );

    return () => backHandler.remove();
  }, [router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const activeMemberships = (membershipCards || []).filter(
    (card) => card.status === "active" || card.status === "paused",
  );

  const upcomingMemberships = (membershipCards || []).filter(
    (card) => card.status === "upcoming",
  );
  const hasActiveMembership = activeMemberships.length > 0;

  // Filter memberships by type
  const gymMemberships = (upcomingMemberships || []).filter(
    (card) => card.type === "gym_membership",
  );

  const ptPlans = (upcomingMemberships || []).filter(
    (card) => card.type === "personal_training",
  );

  const showCustomAlert = (title, message, onConfirm = null) => {
    setConfirmAction({
      title,
      message,
      onConfirm,
    });
    setShowConfirmModal(true);
  };

  const handleCardPress = (membershipId = null, membershipType = null) => {
    if (hasActiveMembership) {
      showCustomAlert(
        "Active Membership Exists",
        "Please cancel your currently active membership to activate this membership.",
      );
    } else {
      // Create QR data object with identifier and type
      const qrData = membershipId
        ? JSON.stringify({
            id: membershipId,
            type: membershipType,
          })
        : JSON.stringify({
            id: uuid,
            type: "normal",
          });
      setSelectedQRData(qrData);
      setShowQRModal(true);
    }
  };

  const handleCancelMembership = (membershipId, gymName) => {
    showCustomAlert(
      "Cancel Membership",
      `Are you sure you want to cancel your membership at ${gymName}? This action cannot be undone.`,
      () => confirmCancelMembership(membershipId),
    );
  };

  const confirmCancelMembership = async (membershipId) => {
    setCancellingMembership(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }
      const response = await cancelMembershipAPI(membershipId, clientId);
      if (response?.status === 200) {
        try {
          await AsyncStorage.removeItem("gym_id");
          showToast({
            type: "success",
            title: "Success",
            desc: "Membership cancelled successfully",
          });
          // Refresh data
          const clientId = await AsyncStorage.getItem("client_id");
          const updatedResponse = await getUUIDAPI(clientId);
          if (updatedResponse?.status === 200) {
            setMembershipCards(updatedResponse?.data?.membership_cards || []);
          }
        } catch (err) {
          showToast({
            type: "error",
            title: "Some Error Occured",
          });
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to cancel membership",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setCancellingMembership(false);
    }
  };

  const handlePauseMembership = (membership) => {
    showCustomAlert(
      "Pause Membership",
      `Are you sure you want to pause your membership at ${membership.gym_name}?`,
      () => confirmPauseMembership(membership),
    );
  };

  const confirmPauseMembership = async (membership) => {
    setPausingMembership(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      const payload = {
        membership_id: membership.membership_id,
        pause: membership.pause,
        pause_type: membership.pause_type,
        client_id: clientId,
      };

      const response = await PauseMembershipAPI(payload);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Membership paused successfully",
        });
        // Refresh data
        const updatedResponse = await getUUIDAPI(clientId);
        if (updatedResponse?.status === 200) {
          setMembershipCards(updatedResponse?.data?.membership_cards || []);
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to pause membership",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setPausingMembership(false);
    }
  };

  const handleContinueMembership = (membership) => {
    showCustomAlert(
      "Continue Membership",
      `Are you sure you want to continue your membership at ${membership.gym_name}?`,
      () => confirmContinueMembership(membership),
    );
  };

  const confirmContinueMembership = async (membership) => {
    setContinuingMembership(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      const payload = {
        membership_id: membership.membership_id,
        client_id: clientId,
      };

      const response = await ContinueMembershipAPI(payload);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Membership continued successfully",
        });
        // Refresh data
        const updatedResponse = await getUUIDAPI(clientId);
        if (updatedResponse?.status === 200) {
          setMembershipCards(updatedResponse?.data?.membership_cards || []);
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to continue membership",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setContinuingMembership(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleCancelRequest = () => {
    showCustomAlert(
      "Cancel Join Request",
      `Are you sure you want to cancel your join request to ${sentRequest?.gym_name}?`,
      () => confirmCancelRequest(),
    );
  };

  const confirmCancelRequest = async () => {
    if (!sentRequest?.id) return;

    setCancellingRequest(true);
    try {
      const response = await deleteRequestAPI(sentRequest.id);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Request deleted successfully",
        });
        setSentRequest(null);
        // Refresh data
        const clientId = await AsyncStorage.getItem("client_id");
        const updatedResponse = await getUUIDAPI(clientId);
        if (updatedResponse?.status === 200) {
          setSentRequest(updatedResponse?.data?.sent_request || null);
        }
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to cancel request",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setCancellingRequest(false);
    }
  };

  if (loading) {
    return <ActivateAccountSkeleton insets={insets} />;
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace({
              pathname: "/client/account",
            })
          }
        >
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Membership</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#6D28D9" />
          ) : (
            <Ionicons name="refresh" size={22} color="#FF5757" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6D28D9"]}
            tintColor="#6D28D9"
          />
        }
      >
        {/* Gym Join Request Section */}
        {sentRequest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gym Join Request</Text>
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color="#F59E0B"
                />
                <Text style={styles.requestGymName}>
                  {sentRequest.gym_name}
                </Text>
              </View>
              <Text style={styles.requestSentDate}>
                Sent on:{" "}
                {new Date(sentRequest.sent_at).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <TouchableOpacity
                style={styles.cancelRequestButton}
                onPress={handleCancelRequest}
                disabled={cancellingRequest}
              >
                {cancellingRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.cancelRequestButtonText}>
                      Cancel Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Membership Section */}
        {activeMemberships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Membership</Text>
            {(activeMemberships || []).map((membership) => (
              <View
                key={membership.membership_id}
                style={styles.activeMembershipCard}
              >
                <View style={styles.activeCardHeader}>
                  <Text style={styles.activeCardGymName}>
                    {membership.gym_name}
                  </Text>
                  <View
                    style={[
                      styles.activeBadgeTopRight,
                      membership.continue_available &&
                        styles.pausedBadgeTopRight,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        membership.continue_available
                          ? "pause-circle"
                          : "check-circle"
                      }
                      size={16}
                      color={
                        membership.continue_available ? "#F59E0B" : "#22C55E"
                      }
                    />
                    <Text
                      style={[
                        styles.activeBadgeTopRightText,
                        membership.continue_available &&
                          styles.pausedBadgeTopRightText,
                      ]}
                    >
                      {membership.continue_available ? "PAUSED" : "ACTIVE"}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeValidityContainer}>
                  <Text style={styles.activeValidityLabel}>Validity: </Text>
                  <Text style={styles.activeValidityValue}>
                    {membership.duration
                      ? `${membership.duration} Months`
                      : "N/A"}
                    {membership.bonus && membership.bonus > 0 && (
                      <Text style={styles.bonusTextNew}>
                        {" "}
                        + {membership.bonus}{" "}
                        {membership.bonus_type === "month"
                          ? membership.bonus === 1
                            ? "Month"
                            : "Months"
                          : membership.bonus === 1
                            ? "Day"
                            : "Days"}
                      </Text>
                    )}
                  </Text>
                </View>

                <Text style={styles.activeExpiresText}>
                  Expires on: {formatDate(membership.expires_at)}
                </Text>

                {membership?.continue_available ? (
                  <>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={styles.cancelButtonRow}
                        onPress={() =>
                          handleCancelMembership(
                            membership.membership_id,
                            membership.gym_name,
                          )
                        }
                        disabled={cancellingMembership}
                      >
                        {cancellingMembership ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.cancelButtonTextNew}>
                            Cancel Membership
                          </Text>
                        )}
                      </TouchableOpacity>

                      <View style={styles.pauseButtonContainer}>
                        <TouchableOpacity
                          style={styles.continueButtonRow}
                          onPress={() => handleContinueMembership(membership)}
                          disabled={continuingMembership}
                        >
                          {continuingMembership ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.continueButtonText}>
                              Continue Membership
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                ) : membership?.pause_available ? (
                  <>
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={styles.cancelButtonRow}
                        onPress={() =>
                          handleCancelMembership(
                            membership.membership_id,
                            membership.gym_name,
                          )
                        }
                        disabled={cancellingMembership}
                      >
                        {cancellingMembership ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.cancelButtonTextNew}>
                            Cancel Membership
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pauseButtonRow}
                        onPress={() => handlePauseMembership(membership)}
                        disabled={pausingMembership}
                      >
                        {pausingMembership ? (
                          <ActivityIndicator size="small" color="#374151" />
                        ) : (
                          <Text style={styles.pauseButtonText}>
                            Pause Membership
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {membership?.pause && (
                      <>
                        <View style={styles.pauseInfoRow}>
                          <View style={styles.pauseInfoEmpty} />
                          <View style={styles.pauseInfoTextContainer}>
                            <Text style={styles.pauseAvailableText}>
                              {membership.pause}{" "}
                              {membership.pause_type === "month"
                                ? membership.pause === 1
                                  ? "Month"
                                  : "Months"
                                : membership.pause === 1
                                  ? "Day"
                                  : "Days"}{" "}
                              Pause Available
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.pauseOneTimeNote}>
                          *Membership can be paused only one time
                        </Text>
                      </>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.cancelButtonNew}
                    onPress={() =>
                      handleCancelMembership(
                        membership.membership_id,
                        membership.gym_name,
                      )
                    }
                    disabled={cancellingMembership}
                  >
                    {cancellingMembership ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.cancelButtonTextNew}>
                        Cancel Membership
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Plans Section */}
        {upcomingMemberships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Purchased via <Text style={{ color: "#FF5757" }}>Fy</Text>mble
            </Text>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "membership" && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab("membership")}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "membership" && styles.tabButtonTextActive,
                  ]}
                >
                  Membership
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "pt" && styles.tabButtonActive,
                ]}
                onPress={() => setActiveTab("pt")}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === "pt" && styles.tabButtonTextActive,
                  ]}
                >
                  PT Plans
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === "membership" &&
              gymMemberships.map((membership) => (
                <TouchableOpacity
                  key={membership.membership_id}
                  style={styles.upcomingCard}
                  onPress={() =>
                    handleCardPress(membership.membership_id, membership.type)
                  }
                >
                  <View style={styles.upcomingCardHeader}>
                    <Text style={styles.upcomingGymName}>
                      {membership.gym_name}
                    </Text>
                    <View style={styles.upcomingBadge}>
                      <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                    </View>
                  </View>

                  <View style={styles.upcomingValidityRow}>
                    <Text style={styles.upcomingValidityLabel}>Validity: </Text>
                    <Text style={styles.upcomingValidityValue}>
                      {membership.duration
                        ? `${membership.duration} Months`
                        : "N/A"}
                      {membership.bonus && membership.bonus > 0 && (
                        <Text style={styles.upcomingBonusText}>
                          {" "}
                          + {membership.bonus}{" "}
                          {membership.bonus_type === "month"
                            ? membership.bonus === 1
                              ? "Month"
                              : "Months"
                            : membership.bonus === 1
                              ? "Day"
                              : "Days"}
                        </Text>
                      )}
                    </Text>
                  </View>

                  <Text style={styles.upcomingAmountText}>
                    Amount: ₹{membership.amount}
                  </Text>

                  {membership?.pause_available && membership?.pause && (
                    <Text style={styles.upcomingPauseText}>
                      Pause: {membership.pause}{" "}
                      {membership.pause_type === "month"
                        ? membership.pause === 1
                          ? "Month"
                          : "Months"
                        : membership.pause === 1
                          ? "Day"
                          : "Days"}
                    </Text>
                  )}

                  <Text style={styles.upcomingPurchasedText}>
                    Purchased on: {formatDate(membership.purchased_at)}
                  </Text>

                  {membership.nutritional_plan && (
                    <View style={styles.upcomingSubRow}>
                      <LinearGradient
                        colors={["#28A745", "#007BFF"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.upcomingSubIcon}
                      >
                        <Image
                          source={require("../../assets/images/free_nutrition.png")}
                          style={styles.upcomingSubIconImg}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                      <View style={styles.upcomingSubTextWrap}>
                        <Text style={styles.upcomingSubLine1}>
                          1 Free session
                        </Text>
                        <Text style={styles.upcomingSubLine2}>
                          1:1 Nutrition Consultation
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.tapToActivateButton}
                    onPress={() =>
                      handleCardPress(membership.membership_id, membership.type)
                    }
                  >
                    <Text style={styles.tapToActivateText}>
                      Tap to access QR, activate plan & join gym
                    </Text>
                    <MaterialCommunityIcons
                      name="qrcode-scan"
                      size={20}
                      color="#007BFF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

            {activeTab === "pt" &&
              ptPlans.map((membership) => (
                <TouchableOpacity
                  key={membership.membership_id}
                  style={styles.upcomingCard}
                  onPress={() =>
                    handleCardPress(membership.membership_id, membership.type)
                  }
                >
                  <View style={styles.upcomingCardHeader}>
                    <Text style={styles.upcomingGymName}>
                      {membership.gym_name}
                    </Text>
                    <View style={styles.upcomingBadge}>
                      <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
                    </View>
                  </View>

                  <View style={styles.upcomingValidityRow}>
                    <Text style={styles.upcomingValidityLabel}>Validity: </Text>
                    <Text style={styles.upcomingValidityValue}>
                      {membership.duration
                        ? `${membership.duration} Months`
                        : "N/A"}
                      {membership.bonus && membership.bonus > 0 && (
                        <Text style={styles.upcomingBonusText}>
                          {" "}
                          + {membership.bonus}{" "}
                          {membership.bonus_type === "month"
                            ? membership.bonus === 1
                              ? "Month"
                              : "Months"
                            : membership.bonus === 1
                              ? "Day"
                              : "Days"}
                        </Text>
                      )}
                    </Text>
                  </View>

                  <Text style={styles.upcomingAmountText}>
                    Amount: ₹{membership.amount}
                  </Text>

                  {membership?.pause_available && membership?.pause && (
                    <Text style={styles.upcomingPauseText}>
                      Pause: {membership.pause}{" "}
                      {membership.pause_type === "month"
                        ? membership.pause === 1
                          ? "Month"
                          : "Months"
                        : membership.pause === 1
                          ? "Day"
                          : "Days"}
                    </Text>
                  )}

                  <Text style={styles.upcomingPurchasedText}>
                    Purchased on: {formatDate(membership.purchased_at)}
                  </Text>

                  {membership.nutritional_plan && (
                    <View style={styles.upcomingSubRow}>
                      <LinearGradient
                        colors={["#28A745", "#007BFF"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.upcomingSubIcon}
                      >
                        <Image
                          source={require("../../assets/images/free_nutrition.png")}
                          style={styles.upcomingSubIconImg}
                          resizeMode="contain"
                        />
                      </LinearGradient>
                      <View style={styles.upcomingSubTextWrap}>
                        <Text style={styles.upcomingSubLine1}>
                          {membership.nutritional_plan?.consultations} Free
                          sessions
                        </Text>
                        <Text style={styles.upcomingSubLine2}>
                          1:1 Nutrition Consultation
                        </Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.tapToActivateButton}
                    onPress={() =>
                      handleCardPress(membership.membership_id, membership.type)
                    }
                  >
                    <Text style={styles.tapToActivateText}>
                      Tap to access QR, activate plan & join gym
                    </Text>
                    <MaterialCommunityIcons
                      name="qrcode-scan"
                      size={20}
                      color="#007BFF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

            {activeTab === "membership" && gymMemberships.length === 0 && (
              <View style={styles.emptyTabContainer}>
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyTabText}>
                  No gym memberships purchased
                </Text>
              </View>
            )}

            {activeTab === "pt" && ptPlans.length === 0 && (
              <View style={styles.emptyTabContainer}>
                <MaterialCommunityIcons
                  name="account"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={styles.emptyTabText}>No PT plans purchased</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchased Via Offline</Text>
          <TouchableOpacity
            style={styles.partnerCard}
            onPress={() => handleCardPress(null)}
          >
            <View style={styles.partnerCardHeader}>
              <View style={styles.partnerCardContent}>
                <Text style={styles.partnerCardTitle}>
                  Join Gym - Offline Purchase
                </Text>
                <Text style={styles.partnerCardSubtitle}>
                  Tap to reveal your unique{" "}
                  <Text style={{ color: "#007BFF", fontSize: 14 }}> QR </Text>{" "}
                  and join partnered gyms
                </Text>
              </View>

              <View style={styles.partnerIconContainer}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={32}
                  color="#FF5757"
                />
              </View>
              {/* <Ionicons name="chevron-forward" size={24} color="#9CA3AF" /> */}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Ionicons name="close-circle" size={32} color="#FF5757" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Your QR Code</Text>

            <View style={styles.qrWrapper}>
              {selectedQRData ? (
                <QRCode
                  value={String(selectedQRData)}
                  size={220}
                  color="#000"
                  backgroundColor="#fff"
                  // logo={require("../../assets/images/new_logo.png")}
                  // logoSize={60}
                  // logoBackgroundColor="white"
                />
              ) : (
                <ActivityIndicator size="large" color="#FF5757" />
              )}
            </View>

            <View style={styles.modalInstructionCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#FF5757"
              />
              <Text style={styles.modalInstructionText}>
                Ask the Gym Admin to scan this QR code using the Fymble Business
                app
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmIconContainer}>
              <MaterialCommunityIcons
                name={confirmAction?.onConfirm ? "alert-circle" : "information"}
                size={48}
                color={confirmAction?.onConfirm ? "#DC2626" : "#FF5757"}
              />
            </View>

            <Text style={styles.confirmTitle}>{confirmAction?.title}</Text>
            <Text style={styles.confirmMessage}>{confirmAction?.message}</Text>

            <View style={styles.confirmButtonsContainer}>
              {confirmAction?.onConfirm ? (
                <>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.cancelConfirmButton]}
                    onPress={() => setShowConfirmModal(false)}
                  >
                    <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.confirmConfirmButton]}
                    onPress={() => {
                      setShowConfirmModal(false);
                      confirmAction.onConfirm();
                    }}
                  >
                    <Text style={styles.confirmConfirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.confirmButton, styles.singleConfirmButton]}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={styles.confirmConfirmButtonText}>OK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 17,

    color: "#333",
  },
  headerRight: {
    width: 30,
  },
  refreshButton: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 12,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,

    color: "#1F2937",
    marginBottom: 12,
  },
  // Active Membership Styles - New Design
  activeMembershipCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 20,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  activeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  activeCardGymName: {
    fontSize: 18,

    color: "#1F2937",
    flex: 1,
    marginRight: 12,
  },
  activeBadgeTopRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeBadgeTopRightText: {
    color: "#16A34A",
    fontSize: 11,

    marginLeft: 4,
    letterSpacing: 0.5,
  },
  pausedBadgeTopRight: {
    backgroundColor: "#FEF3C7",
  },
  pausedBadgeTopRightText: {
    color: "#D97706",
  },
  activeValidityContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  activeValidityLabel: {
    fontSize: 15,

    color: "#4B5563",
  },
  activeValidityValue: {
    fontSize: 15,

    color: "#007BFF",
  },
  bonusTextNew: {
    fontSize: 14,

    color: "#007BFF",
  },
  activeExpiresText: {
    fontSize: 14,

    color: "#6B7280",
    marginBottom: 16,
  },
  cancelButtonNew: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    width: "60%",
  },
  cancelButtonTextNew: {
    color: "#fff",
    fontSize: 11,
  },
  pauseButton: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 8,
  },
  pauseButtonText: {
    color: "#374151",
    fontSize: 13,
  },
  pauseInfoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  pauseInfoEmpty: {
    flex: 1,
  },
  pauseInfoTextContainer: {
    flex: 1,
  },
  pauseAvailableText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginLeft: 10,
  },
  pauseOneTimeNote: {
    fontSize: 10,
    color: "#FF5757",
    textAlign: "center",
    marginTop: 6,
  },
  // Button Row Styles (when pause is available)
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButtonRow: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseButtonContainer: {
    flex: 1,
  },
  pauseButtonRow: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  continueButtonRow: {
    backgroundColor: "#22C55E",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 11,
  },
  purchasedViaContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  purchasedViaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  purchasedViaFittbot: {
    fontSize: 13,
    color: "#FF5757",
  },
  // Old styles (kept for backwards compatibility)
  activeCardGradient: {
    padding: 20,
    borderRadius: 16,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  activeBadgeText: {
    color: "#fff",
    fontSize: 11,

    marginLeft: 4,
    letterSpacing: 0.5,
  },
  activeGymName: {
    fontSize: 22,

    color: "#fff",
    marginBottom: 4,
  },
  activeMembershipType: {
    fontSize: 14,

    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
  },
  activeDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activeDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeDetailText: {
    fontSize: 14,

    color: "#fff",
    marginLeft: 6,
  },
  bonusText: {
    fontSize: 12,

    color: "#FFD700",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 14,

    marginLeft: 6,
  },
  // Partner Card Styles
  partnerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  partnerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,87,87,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  partnerCardContent: {
    flex: 1,
  },
  partnerCardTitle: {
    fontSize: 15,

    color: "#1F2937",
    marginBottom: 4,
  },
  partnerCardSubtitle: {
    fontSize: 12,

    color: "#6B7280",
    lineHeight: 16,
  },
  // Tab Styles
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#FF5757",
  },
  tabButtonText: {
    fontSize: 14,

    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  emptyTabContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTabText: {
    fontSize: 14,

    color: "#9CA3AF",
    marginTop: 12,
  },
  // Upcoming Card Styles - Updated with #007BFF
  upcomingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  upcomingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingBadge: {
    backgroundColor: "#FFF4E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingBadgeText: {
    fontSize: 10,

    color: "#D97706",
    letterSpacing: 0.5,
  },
  upcomingGymName: {
    fontSize: 17,

    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  upcomingValidityRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  upcomingValidityLabel: {
    fontSize: 14,

    color: "#4B5563",
  },
  upcomingValidityValue: {
    fontSize: 14,

    color: "#007BFF",
  },
  upcomingBonusText: {
    fontSize: 13,

    color: "#007BFF",
  },
  upcomingAmountText: {
    fontSize: 14,

    color: "#4B5563",
    marginBottom: 4,
  },
  upcomingPauseText: {
    fontSize: 14,

    color: "#4B5563",
    marginBottom: 4,
  },
  upcomingPurchasedText: {
    fontSize: 14,

    color: "#4B5563",
    marginBottom: 12,
  },
  upcomingType: {
    fontSize: 13,

    color: "#6B7280",
    marginBottom: 12,
  },
  upcomingDetailsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  upcomingSubContainer: {
    backgroundColor: "rgba(34,197,94,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.15)",
    padding: 10,
    marginBottom: 12,
    position: "relative",
  },
  upcomingFreeBadge: {
    position: "absolute",
    top: -10,
    right: 8,
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  upcomingFreeBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  upcomingSubRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 10,
  },
  upcomingSubIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  upcomingSubIconImg: {
    width: 26,
    height: 26,
  },
  upcomingSubTextWrap: {
    flex: 1,
  },
  upcomingSubLine1: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 1,
  },
  upcomingSubLine2: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  upcomingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  upcomingDetailLabel: {
    fontSize: 13,

    color: "#6B7280",
  },
  upcomingDetailValue: {
    fontSize: 13,

    color: "#1F2937",
  },
  tapToActivate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
  },
  tapToActivateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007BFF",
  },
  tapToActivateText: {
    fontSize: 11,

    color: "#007BFF",
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "85%",
    maxWidth: 400,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,

    color: "#1F2937",
    marginBottom: 20,
  },
  qrWrapper: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    height: 260,
    width: 260,
  },
  modalInstructionCard: {
    flexDirection: "row",
    backgroundColor: "#F3E8FF",
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  modalInstructionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,

    color: "#4B5563",
    lineHeight: 18,
  },
  // Custom Confirmation Modal Styles
  confirmModalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: "85%",
    maxWidth: 380,
  },
  confirmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,

    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 14,

    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelConfirmButton: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  confirmConfirmButton: {
    backgroundColor: "#DC2626",
  },
  singleConfirmButton: {
    backgroundColor: "#FF5757",
  },
  cancelConfirmButtonText: {
    fontSize: 15,

    color: "#374151",
  },
  confirmConfirmButtonText: {
    fontSize: 15,

    color: "#fff",
  },
  // Gym Join Request Styles
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#FEF3C7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  requestGymName: {
    fontSize: 17,

    color: "#1F2937",
    flex: 1,
  },
  requestSentDate: {
    fontSize: 14,

    color: "#6B7280",
    marginBottom: 16,
  },
  cancelRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  cancelRequestButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});
