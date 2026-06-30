import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  ScrollView,
  BackHandler,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { showToast } from "../../utils/Toaster";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMyReferralCodeAPI } from "../../services/clientApi";

const ReferralScreen = () => {
  const router = useRouter();
  const { source } = useLocalSearchParams();
  const isGymMate = source === "gymmate";
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");

  const howItWorks = [
    "Share your referral code with your friend",
    "Friend downloads Fymble app and enters your referral code on registration",
    "You both get ₹100 Fymble Cash",
  ];

  const getReferralCode = async () => {
    setLoading(true);
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
      const response = await getMyReferralCodeAPI(clientId);
      if (response?.status === 200) {
        setReferralCode(response?.referral_code);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getReferralCode();
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

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
      const message = isGymMate
        ? `Join Gym Mate on Fymble — find a workout partner and meet new fitness friends near you! 💪\n\nUse my referral code *${referralCode}* to get ₹100 Fymble cash on successful registration.\n\n📱 Download Fymble: https://fymble.app/download\n\n`
        : `Try this amazing Fitness App - Fymble powered by KyraAI.\n\nUse my referral code *${referralCode}* to get ₹100 Fymble cash now on successful registration.\n\n Use the Fymble Cash and Book Daily Pass, Fitness Class, Gym Membership & More.\n\n📱 Download Fymble: https://fymble.app/download\n\n`;
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showToast({
          type: "error",
          title: "WhatsApp not found",
          desc: "Please install WhatsApp to use this feature",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to open WhatsApp",
      });
    }
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & earn</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Single Card */}
        <View style={styles.card}>
          {/* Coins Image inside card */}
          <Image
            source={
              isGymMate
                ? require("../../assets/images/refer/mate_referral.webp")
                : require("../../assets/images/refer/referral.webp")
            }
            style={styles.image}
            contentFit="contain"
          />

          <Text style={styles.referTitle}>
            {isGymMate ? "Refer a Friend to Gym Mate" : "Refer a Friend to Fymble"}
          </Text>
          <Text style={[styles.rewardAmount, isGymMate && { color: "#CE0000" }]}>
            Get ₹100
          </Text>
          <Text style={styles.rewardDesc}>
            Your friend gets ₹100 Fymble Cash on{"\n"}signup using your referral
            code
          </Text>

          {/* Referral Code Box */}
          {loading ? (
            <View style={styles.codeBoxSkeleton} />
          ) : (
            <TouchableOpacity
              style={styles.codeBox}
              onPress={handleCopyReferralCode}
            >
              <Text style={styles.codeText}>{referralCode}</Text>
              <Ionicons name="copy-outline" size={18} color="#888" />
            </TouchableOpacity>
          )}

          {/* How it works */}
          <Text style={styles.howTitle}>How it works</Text>
          {howItWorks.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { bottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleShareReferral}
        >
          <LinearGradient
            colors={isGymMate ? ["#FF5757", "#FF7878"] : ["#D89319", "#E6B136"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.whatsappGradient}
          >
            <Image
              source={require("../../assets/images/refer/wa.png")}
              style={{ width: 24, height: 24 }}
              contentFit="contain"
            />
            <Text style={styles.whatsappText}>Invite via WhatsApp</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerBackButton: {
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 100,
  },
  image: {
    width: 212,
    height: 231,
    alignSelf: "center",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  referTitle: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontWeight: "bold",
  },
  rewardAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#E6A800",
    textAlign: "center",
    marginBottom: 8,
  },
  rewardDesc: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  codeBoxSkeleton: {
    height: 46,
    borderRadius: 8,
    backgroundColor: "#E1E9EE",
    marginBottom: 10,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  stepText: {
    fontSize: 13,
    color: "#444",
    flex: 1,
    lineHeight: 20,
  },
  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 7,
    backgroundColor: "#F5F5F5",
  },
  whatsappButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  whatsappGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 10,
    borderRadius: 8,
  },
  whatsappText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ReferralScreen;
