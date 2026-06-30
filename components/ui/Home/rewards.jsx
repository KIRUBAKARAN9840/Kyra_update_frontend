import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  Dimensions,
  Share,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  getClientRewardsAPI,
  redeemCash,
  rewardProgramOptInAPI,
  getSmartWatchInterestAPI,
} from "../../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

import { showToast } from "../../../utils/Toaster";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import SkeletonHome from "./skeletonHome";
import { isGymPremium } from "../../../config/access";
import GrainConfettiAnimation from "../ConfettiAnimation";
import { Feather } from "@expo/vector-icons";
const { width, height } = Dimensions.get("window");

const isTablet = () => {
  const aspectRatio = height / width;
  return width >= 768 || (width >= 600 && aspectRatio < 1.6);
};

const getImageContainerHeight = () => {
  const aspectRatio = height / width;

  // For very tall screens (phones with high aspect ratio)
  if (width >= 768) {
    return height * 0.65;
  } else if (aspectRatio > 2.15) {
    return height * 0.45;
  }
  // For medium aspect ratio phones
  else if (aspectRatio > 1.8) {
    return height * 0.49;
  }
  // For shorter screens (older phones, some tablets)
  else if (aspectRatio > 1.6) {
    return height * 0.52;
  }

  // For tablets and wide screens
};

const RedeemXPModal = ({ visible, onClose, xpAmount, onConfirm }) => {
  const cashAmount = (xpAmount / 1000) * 10;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.centeredModalContainer}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.redeemModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Redeem XP</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.redeemContainer}>
            <View style={styles.redeemSide}>
              <Image
                source={require("../../../assets/images/XP 1.png")}
                style={styles.redeemIcon}
                contentFit="contain"
              />
              <Text style={styles.redeemAmount}>{xpAmount}</Text>
              <Text style={styles.redeemLabel}>XP</Text>
            </View>

            <Ionicons name="arrow-forward" size={24} color="#035570" />

            <View style={styles.redeemSide}>
              <Image
                source={require("../../../assets/images/home/cash.png")}
                style={styles.redeemIcon}
                contentFit="contain"
              />
              <Text style={styles.redeemAmount}>₹{cashAmount}</Text>
              <Text style={styles.redeemLabel}>Cash</Text>
            </View>
          </View>

          <Text style={styles.conversionInfo}>1000 XP = ₹10</Text>

          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const Rewards = ({ plan }) => {
  const [badgeDetails, setBadgeDetails] = useState(null);
  const [loading, setloading] = useState(true);
  const [showBadgeSummary, setShowBadgeSummary] = useState(false);
  const [showBadgeDetails, setShowBadgeDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("Rewards");
  const [selectedReward, setSelectedReward] = useState(null);

  const [showRewardDetails, setShowRewardDetails] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [fibbotCash, setFittbotCash] = useState(0);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [redeemableXP, setRedeemableXP] = useState(0);
  const [interest, setInterest] = useState(true);
  const [showSuccessGrains, setShowSuccessGrains] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const successModalTimerRef = useRef(null);
  const router = useRouter();
  const deviceIsTablet = isTablet();
  const tabs = ["Rewards", "Fymble Cash"];

  const getInterest = async () => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      // Call both APIs - opt-in and show interest
      const [optInResponse, interestResponse] = await Promise.all([
        rewardProgramOptInAPI(client_id),
        getSmartWatchInterestAPI({ client_id }),
      ]);

      if (optInResponse?.status === 200 || interestResponse?.status === 200) {
        if (Platform.OS === "android") {
          setShowSuccessGrains(true);

          successModalTimerRef.current = setTimeout(() => {
            setShowSuccessGrains(false);
          }, 3000);
        } else {
          showToast({
            type: "success",
            title: "Success",
            desc: optInResponse?.message || "You have successfully opted in!",
          });
        }
        setInterest(true);
        fetchRewardDetails();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            optInResponse?.detail ||
            optInResponse?.message ||
            "Something went wrong. Please try again later",
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

  const fetchRewardDetails = async () => {
    setloading(true);
    try {
      const response = await getClientRewardsAPI();
      if (response?.status === 200) {
        setInterest(response?.data?.reward_interest_modal);
        setRedeemableXP(response?.data?.actual_redeemable || 0);
        setReferralCode(response?.data?.referral_code);
        setFittbotCash(response?.data?.fittbot_cash || 0);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error fetching rewards",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    fetchRewardDetails();
  }, []);

  useEffect(() => {
    return () => {
      if (successModalTimerRef.current) {
        clearTimeout(successModalTimerRef.current);
        successModalTimerRef.current = null;
      }
    };
  }, []);

  const handleMoreDetailsClick = () => {
    setShowBadgeSummary(false);
    setShowBadgeDetails(true);
  };

  const handleSelectReward = (reward) => {
    setSelectedReward(reward);
    setShowRewardDetails(true);
  };

  const handleCopyReferralCode = async () => {
    try {
      await Clipboard.setStringAsync(referralCode);
      showToast({
        type: "success",
        title: "Copied",
        desc: "Referral code copied to clipboard",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to copy referral code",
      });
    }
  };

  const handleShareReferral = async () => {
    try {
      const message = `Try this amazing Fitness App - Fymble powered by KyraAI.
      
Use my referral code *${referralCode}* to get 100 Fymble cash now on successful registration.

📱 Download Fymble: https://fymble.app/download`;

      await Share.share({
        message: message,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to share referral code",
      });
    }
  };

  const handleRedeemConfirm = async () => {
    try {
      const payload = {
        redeemable_points: redeemableXP,
      };

      const response = await redeemCash(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: response?.message || "XP redeemed successfully",
        });
        setShowRedeemModal(false);
        fetchRewardDetails();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to redeem XP",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  if (loading) {
    return <SkeletonHome type="analysis" header={true} />;
  }

  const calculateProgressPercentage = () => {
    const currentXP = parseInt(badgeDetails?.client_xp) || 0;
    const nextLevelXP = parseInt(badgeDetails?.next_level_start) || 1985;
    const percentage = (currentXP / nextLevelXP) * 100;
    return Math.min(percentage, 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab)}
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
      <ScrollView>
        {activeTab === "Earn Xp" ? (
          <></>
        ) : activeTab === "Fymble Cash" ? (
          <View>
            <TouchableOpacity
              style={[styles.badgeCard2]}
              onPress={() => router.push("/client/fittbotcash")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#FBFBFB", "#FBFBFB"]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.2 }}
                style={{
                  paddingTop: 6,
                  paddingBottom: 15,
                  paddingHorizontal: 16,
                }}
              >
                <View style={[styles.badgeHeaderRow, { marginBottom: 0 }]}>
                  <View style={{ flex: 1 }}>
                    <MaskedView
                      maskElement={
                        <Text style={{ fontSize: 14, fontWeight: 600 }}>
                          Fymble Cash
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={["#474747", "#474747"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0.4, y: 0 }}
                        style={{ justifyContent: "center" }}
                      >
                        <Text
                          style={[
                            { opacity: 0, fontSize: 14, fontWeight: 600 },
                          ]}
                        >
                          Fymble Cash
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                    <Text
                      style={[
                        {
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#FF5757",
                          marginTop: 8,
                        },
                      ]}
                    >
                      ₹{fibbotCash}
                    </Text>
                  </View>

                  <Image
                    source={require("../../../assets/images/home/cash.png")}
                    style={{ width: 80, height: 80 }}
                    contentFit="contain"
                  />
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#FF5757"
                    style={{ marginLeft: 5, marginBottom: 20 }}
                  />
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text
                    style={[
                      {
                        fontSize: 11,
                        textAlign: "left",
                        color: "#383030ff",
                      },
                    ]}
                  >
                    Use it for Memberships, Daily Pass, Sessions Purchases.
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {redeemableXP > 0 && (
              <TouchableOpacity
                style={[styles.badgeCard2, { marginTop: 10 }]}
                onPress={() => setShowRedeemModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#FBFBFB", "#FBFBFB"]}
                  start={{ x: 0, y: 0.2 }}
                  end={{ x: 1, y: 0.2 }}
                  style={{
                    paddingTop: 6,
                    paddingBottom: 15,
                    paddingHorizontal: 16,
                  }}
                >
                  <View style={[styles.badgeHeaderRow, { marginBottom: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <MaskedView
                        maskElement={
                          <Text style={{ fontSize: 14, fontWeight: 600 }}>
                            Redeemable XP
                          </Text>
                        }
                      >
                        <LinearGradient
                          colors={["#474747", "#474747"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0.4, y: 0 }}
                          style={{ justifyContent: "center" }}
                        >
                          <Text
                            style={[
                              { opacity: 0, fontSize: 14, fontWeight: 600 },
                            ]}
                          >
                            Redeemable XP
                          </Text>
                        </LinearGradient>
                      </MaskedView>
                      <Text
                        style={[
                          {
                            fontSize: 22,
                            fontWeight: 700,
                            color: "#FF5757",
                            marginTop: 8,
                          },
                        ]}
                      >
                        {redeemableXP} XP
                      </Text>
                    </View>

                    <Image
                      source={require("../../../assets/images/XP 1.png")}
                      style={{ width: 50, height: 50 }}
                      contentFit="contain"
                    />
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#FF5757"
                      style={{ marginLeft: 5, marginBottom: 20 }}
                    />
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={[
                        {
                          fontSize: 11,
                          textAlign: "left",
                          color: "#383030ff",
                        },
                      ]}
                    >
                      Convert your XP to Fymble Cash. 1000 XP = ₹10
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View
              style={[
                styles.badgeCard2,
                { marginTop: 10, borderWidth: 1, borderColor: "#ddd" },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#FFFFFF"]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.2 }}
                style={{
                  paddingTop: 10,
                  paddingBottom: 15,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  Invite & Earn <Text style={{ color: "#FF5757" }}>₹100</Text>{" "}
                  Fymble Cash
                </Text>

                <View style={styles.referralContainer}>
                  <View style={styles.referralCodeBox}>
                    <Text style={styles.referralLabel}>Your referral code</Text>
                    <TouchableOpacity onPress={handleCopyReferralCode}>
                      <View style={styles.referralCodeRow}>
                        <Text style={styles.referralCodeText}>
                          {referralCode}
                        </Text>
                        <Ionicons
                          name="copy-outline"
                          size={20}
                          color="#FF5757"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareReferral}
                  >
                    <Ionicons name="paper-plane" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : activeTab === "Rewards" ? (
          <View>
            <View style={{ position: "relative", marginTop: 15 }}>
              <Image
                source={require("../../../assets/images/contest/reward_box.webp")}
                style={{
                  width: 60,
                  height: 60,
                  position: "absolute",
                  top: -15,
                  left: 18,
                  zIndex: 1,
                }}
                contentFit="contain"
              />
              <View style={[styles.fittbotRewardsCard, { marginTop: 0 }]}>
                <View
                  style={[
                    styles.fittbotRewardsContent,
                    { paddingVertical: 10, marginLeft: 58 },
                  ]}
                >
                  <View style={styles.fittbotRewardsTextContainer}>
                    <Text style={styles.fittbotRewardsTitle}>
                      <Text style={styles.fittbotBrand}>
                        Fy<Text style={{ color: "#000000" }}>mble</Text>
                      </Text>{" "}
                      Mega Fitness Rewards Program
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {!interest && (
              <View style={styles.participateCard}>
                <View style={styles.participateCardHeader}>
                  <View style={styles.participateGiftIcon}>
                    <Ionicons name="ticket-outline" size={32} color="#FF5757" />
                  </View>
                  <View style={styles.participateHeaderContent}>
                    <Text style={styles.participateCardTitle}>
                      Join the Rewards Program Now!
                    </Text>
                    <Text style={styles.participateCardSubtitle}>
                      Participate Now & start earning exciting rewards
                    </Text>
                  </View>
                </View>

                <View style={styles.termsParticipateContainer}>
                  <View style={styles.termsContainerInline}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setTermsAccepted(!termsAccepted)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          termsAccepted && styles.checkboxChecked,
                        ]}
                      >
                        {termsAccepted && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.termsText}>
                        I have read the{" "}
                        <Text
                          style={styles.termsLink}
                          onPress={() => router.push("/client/rewardtc")}
                        >
                          Terms and Conditions
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.participateButtonInline,
                      !termsAccepted && styles.participateButtonDisabled,
                    ]}
                    onPress={getInterest}
                    disabled={!termsAccepted}
                  >
                    <LinearGradient
                      colors={
                        termsAccepted
                          ? ["#FF5757", "#FF5757"]
                          : ["#CCCCCC", "#CCCCCC"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.participateButtonGradient}
                    />
                    <Text
                      style={[
                        styles.participateButtonText,
                        !termsAccepted && styles.participateButtonTextDisabled,
                      ]}
                    >
                      Participate Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {interest && (
              <View style={styles.participatedCard}>
                <View style={styles.participatedContent}>
                  <View style={styles.participatedHeader}>
                    <View style={styles.participatedIconWrapper}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#4CAF50"
                      />
                    </View>
                    <View style={styles.participatedTextContainer}>
                      <Text style={styles.participatedTitle}>
                        You're Participating!
                      </Text>
                      <Text style={styles.participatedSubtitle}>
                        You have Already joined the{" "}
                        <Text style={styles.participatedBrand}>Fymble</Text>{" "}
                        Mega Fitness Rewards Program
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewDashboardButton}
                    onPress={() => router.push("/client/rewarddashboard")}
                  >
                    <Text style={styles.viewDashboardButtonText}>
                      View Reward Dashboard
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.iphoneSection}>
              <Image
                source={require("../../../assets/images/contest/iphone.webp")}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
              />
            </View>

            <View style={styles.bottomProducts}>
              <View style={styles.productItem}>
                <Image
                  source={require("../../../assets/images/contest/hoodie.webp")}
                  style={styles.productImage}
                  contentFit="contain"
                />
              </View>
              <View style={styles.productItem}>
                <Image
                  source={require("../../../assets/images/contest/sipper.webp")}
                  style={styles.productImage}
                  contentFit="contain"
                />
              </View>
            </View>

            <View style={styles.bottomProducts}>
              <View style={styles.productItem}>
                <Image
                  source={require("../../../assets/images/contest/bottle.webp")}
                  style={styles.productImage}
                  contentFit="contain"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.fittbotRewardsCard}
              activeOpacity={0.7}
              onPress={() => router.push("/client/rewardtc")}
            >
              <View style={styles.fittbotRewardsContent}>
                <Image
                  source={require("../../../assets/images/contest/reward_box.webp")}
                  style={styles.rewardBoxIcon}
                  contentFit="contain"
                />
                <View style={styles.fittbotRewardsTextContainer}>
                  <Text style={styles.fittbotRewardsTitle}>
                    How{" "}
                    <Text style={styles.fittbotBrand}>
                      Fy<Text style={{ color: "#000000" }}>mble</Text>
                    </Text>{" "}
                    Rewards Works
                  </Text>
                  <Text style={styles.fittbotRewardsSubtitle}>
                    Book Daily Pass, Fitness Class{" "}
                    <Text style={styles.viewMoreText}>View more...</Text>
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color="#666"
                  style={styles.chevronIcon}
                />
              </View>
            </TouchableOpacity>

            <View
              style={[
                styles.badgeCard2,
                {
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: "#ddd",
                  marginBottom: 60,
                },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#FFFFFF"]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.2 }}
                style={{
                  paddingTop: 10,
                  paddingBottom: 15,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={[
                    {
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 12,
                    },
                  ]}
                >
                  Invite & Earn <Text style={{ color: "#FF5757" }}>₹100</Text>{" "}
                  Fymble Cash
                </Text>

                <View style={styles.referralContainer}>
                  <View style={styles.referralCodeBox}>
                    <Text style={styles.referralLabel}>Your referral code</Text>
                    <TouchableOpacity onPress={handleCopyReferralCode}>
                      <View style={styles.referralCodeRow}>
                        <Text style={styles.referralCodeText}>
                          {referralCode}
                        </Text>
                        <Ionicons
                          name="copy-outline"
                          size={20}
                          color="#FF5757"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShareReferral}
                  >
                    <Ionicons name="paper-plane" size={30} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : null}

        <RedeemXPModal
          visible={showRedeemModal}
          onClose={() => setShowRedeemModal(false)}
          xpAmount={redeemableXP}
          onConfirm={handleRedeemConfirm}
        />

        {showSuccessGrains && Platform.OS === "android" && (
          <GrainConfettiAnimation numberOfGrains={100} xpPoints={0} />
        )}

        <Modal
          visible={Platform.OS === "android" && showSuccessGrains}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessGrains(false)}
        >
          <TouchableOpacity
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0, 0, 0, 0.1)" },
            ]}
            activeOpacity={1}
            onPress={() => setShowSuccessGrains(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.successModal}>
                <View style={styles.successIconContainer}>
                  <Feather name="check-circle" size={60} color="#FF5757" />
                </View>
                <Text style={styles.successTitle}>Congratulations!</Text>
                <Text style={styles.successMessage}>
                  Thank You for Participating!!
                </Text>
                <Text style={styles.successSubMessage}>
                  You can Track Your Progress in Reward Dashboard.
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
    paddingBottom: Platform.OS === "ios" ? 100 : 0,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  imageContainer: {
    width: width,
    height: Math.max(300, Math.min(800, getImageContainerHeight())), // Adaptive height with min/max constraints
    position: "relative",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EBF5FB",
    padding: 16,
    borderRadius: 8,
  },
  infoIcon: {
    width: "10%",
  },
  infoText: {
    fontSize: 12,
    color: "#0154A0",
    flex: 1,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#fff",
    paddingBottom: 20,
    marginTop: 10,
    gap: 10,
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
  badgeCard: {
    backgroundColor: "#FFD373",
    position: "absolute",
    bottom: -50,
    right: 0,
    left: 0,
    borderRadius: 12,
    margin: 16,
    shadowColor: "#fff",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
    marginTop: 10,
  },
  contestSection: {
    paddingVertical: 0,
    backgroundColor: "#fff",
    marginBottom: 0,
  },
  topSection: {
    width: "96%",
    aspectRatio: 2.4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    alignSelf: "center",
  },
  watchImage: {
    width: "100%",
    height: "100%",
  },
  winnerSection: {
    flexDirection: "row",
    gap: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iphoneSection: {
    width: width - 32,
    aspectRatio: 0.9,
    alignSelf: "center",
    // marginBottom: 10,
  },
  prize: {
    width: "33%",
    aspectRatio: 1.11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  medalImage: {
    width: "100%",
    height: "100%",
  },
  bottomProducts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    // marginBottom: 20,
    paddingHorizontal: 10,
  },
  productItem: {
    flex: 1,
    borderRadius: 12,
    // padding: width * 0.01,
    alignItems: "center",
    justifyContent: "center",
    aspectRatio: 0.9,
    // maxHeight: width * 0.4,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  interestedButton: {
    paddingVertical: width > 400 ? 14 : 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    width: "60%",
    alignSelf: "center",
    overflow: "hidden",
    position: "relative",
  },
  interestedButtonGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  interestedButtonText: {
    color: "#000",
    fontSize: width > 400 ? 18 : 18,
    fontWeight: "700",
  },
  participateButton: {
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    width: "60%",
    alignSelf: "center",
    overflow: "hidden",
    position: "relative",
  },
  participateButtonDisabled: {
    opacity: 0.6,
  },
  participateButtonGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  participateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  participateButtonTextDisabled: {
    color: "#999",
  },
  termsContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  termsParticipateContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  termsContainerInline: {
    marginBottom: 15,
  },
  participateButtonInline: {
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#FF5757",
    borderColor: "#FF5757",
  },
  termsText: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
  termsLink: {
    color: "#0066CC",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  challengeInfo: {
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 0,
    marginTop: 3,
  },
  challengeText: {
    fontSize: width > 400 ? 16 : 14,
    color: "#464646",
    textAlign: "center",
    flexWrap: "wrap",
  },
  challengeDate: {
    color: "#FF4444",
    fontWeight: "700",
    fontSize: 16,
  },
  dateGradientContainer: {
    alignItems: "center",
    marginBottom: 3,
    paddingHorizontal: 0,
  },
  dateGradient: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  dateGif: {
    width: width,
    aspectRatio: 5,
    borderRadius: 0,
    alignSelf: "center",
  },
  challengeDateText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelUpText: {
    fontSize: 16,
    color: "#464646",
    textAlign: "center",
    marginBottom: 5,
    fontWeight: "500",
  },
  rewardCashBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF7A7A",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  giftIcon: {
    width: 45,
    height: 45,
    marginRight: 10,
  },
  rewardCashTextContainer: {
    flex: 1,
  },
  rewardCashText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  rewardCash2x: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFE500",
  },
  rewardCashSubText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  rewardCashArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  thankYouContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  thankYouText: {
    textAlign: "center",
    color: "#464646",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  challengeSubtext: {
    fontSize: width > 400 ? 16 : 16,
    color: "#FF5757",
    fontWeight: "600",
    textAlign: "center",
  },
  badgeCard2: {
    borderColor: "rgba(255, 255, 255, 0.33)",
    borderWidth: 0.5,
    borderRadius: 12,
    margin: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    marginTop: 18,
  },

  badgeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  badgeIcon: {
    width: 50,
    height: 50,
  },
  xpIcon: {
    width: 25,
    height: 25,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    position: "absolute",
    left: 0,
    top: 20,
    fontSize: 12,
  },
  xpText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  progressContainer: {
    position: "relative",
    height: 10,
    marginBottom: 16,
  },
  progressBackground: {
    height: "100%",
    backgroundColor: "#eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0154A0",
    borderRadius: 5,
  },
  nextLevelXp: {
    position: "absolute",
    right: 0,
    top: 20,
    fontSize: 14,
    color: "#FF5757",
    fontWeight: 600,
  },
  nextBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextBadgeText: {
    fontSize: 12,
    color: "#555",
    flex: 1,
  },
  smallBadgeIcon: {
    width: 45,
    height: 50,
  },
  // New reward cards styling
  rewardsSection: {
    backgroundColor: "#ff57570e",
    borderRadius: 12,
    margin: 16,
    padding: 15,
    shadowColor: "#ccc",
    borderColor: "rgba(255, 255, 255, 0.33)",
    borderWidth: 0.5,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  rewardsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  rewardsScrollContainer: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  rewardCard: {
    width: 145,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: "#0154A0",
    overflow: "hidden",
  },
  selectedRewardCard: {
    // borderWidth: 2,
    // borderColor: '#0154A0',
  },
  rewardImageContainer: {
    height: 120,
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  rewardImageBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardImage: {
    width: "100%",
    height: "100%",
  },
  rewardInfoContainer: {
    padding: 8,
  },
  rewardName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  xpContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rewardXpIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  rewardXp: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0154A0",
  },
  historyContainer: {
    backgroundColor: "#ff57570e",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    borderColor: "rgba(255, 255, 255, 0.33)",
    borderWidth: 0.5,
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
  },
  historyListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: "rgba(53, 53, 53, 0.2)",
    borderRadius: 7,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  historyListItemInside: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyLeftContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusIndicator: {
    marginRight: 6,
  },
  rewardItemTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#035570",
  },
  rewardItemDate: {
    fontSize: 12,
    color: "#035570CC",
    marginTop: 4,
  },
  rewardItemPoints: {
    fontSize: 12,
    fontWeight: "500",
    color: "#035570",
  },
  rewardItemPointsXp: {
    color: "#FBC33E",
    fontSize: 10,
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 12,
    color: "#035570",
    fontWeight: "500",
  },
  monthlyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  monthlyTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  monthItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  monthName: {
    fontSize: 12,
    fontWeight: "500",
  },
  monthPoints: {
    fontSize: 12,
    fontWeight: "500",
  },
  workoutText: {
    paddingTop: 5,
    color: "#454545b3",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyDate: {
    flex: 1,
  },
  historyPoints: {
    flex: 1,
    textAlign: "center",
  },
  historyReward: {
    flex: 1,
    textAlign: "right",
  },
  rewardTitleNo: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  noData: {
    textAlign: "center",
    fontSize: 12,
    marginVertical: 5,
    color: "#035570",
  },
  centeredModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  centeredModalContent: {
    width: "60%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  rewardDetailContainer: {
    alignItems: "center",
    paddingBottom: 15,
    borderWidth: 2,
    borderRadius: 25,
    borderColor: "#0154A0",
    overflow: "hidden",
  },
  rewardDetailImage: {
    width: "100%",
    height: 150,
    marginBottom: 16,
  },
  rewardDetailTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  rewardDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 8,
  },
  referralContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  referralCodeBox: {
    flex: 1,
    backgroundColor: "#EEEEEE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  referralLabel: {
    fontSize: 12,
    color: "#717171",
    marginBottom: 4,
  },
  referralCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  referralCodeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF5757",
  },
  shareButton: {
    backgroundColor: "#FF5757",
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  redeemButtonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  redeemModalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  redeemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 24,
    paddingVertical: 20,
    backgroundColor: "#F8FCFF",
    borderRadius: 12,
  },
  redeemSide: {
    alignItems: "center",
    gap: 8,
  },
  redeemIcon: {
    width: 50,
    height: 50,
  },
  redeemAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#035570",
  },
  redeemLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#035570CC",
  },
  conversionInfo: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: "#035570",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 35,
    width: width * 0.85,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF5757",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  fittbotRewardsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  fittbotRewardsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  rewardBoxIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  fittbotRewardsTextContainer: {
    flex: 1,
  },
  fittbotRewardsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  fittbotBrand: {
    color: "#FF5757",
  },
  fittbotRewardsSubtitle: {
    fontSize: 12,
    color: "#454545",
  },
  viewMoreText: {
    color: "#005EFF",
    fontWeight: "400",
  },
  chevronIcon: {
    marginLeft: 4,
  },
  disclaimerCard: {
    backgroundColor: "#FFF9F0",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE4C4",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#5D4E37",
    lineHeight: 18,
    textAlign: "left",
  },
  participatedContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  participateCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#FF5757",
    shadowColor: "#FF5757",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  participateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 87, 87, 0.2)",
  },
  participateGiftIcon: {
    width: 45,
    height: 45,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  participateHeaderContent: {
    flex: 1,
  },
  participateCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
    marginBottom: 4,
  },
  participateCardSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
  },
  participatedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF5757",
    textAlign: "center",
    marginBottom: 16,
  },
  participatedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  participatedContent: {
    padding: 16,
  },
  participatedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  participatedIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  participatedTextContainer: {
    flex: 1,
  },
  participatedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  participatedSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "#666",
    lineHeight: 18,
  },
  participatedBrand: {
    fontWeight: "600",
    color: "#FF5757",
  },
  viewDashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  viewDashboardButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default Rewards;
