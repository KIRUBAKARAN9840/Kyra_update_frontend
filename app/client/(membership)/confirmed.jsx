import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Modal,
} from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { MaskedText } from "../../../components/ui/MaskedText";

const gymEntryGuidelines = [
  {
    image: require("../../../assets/images/plans/rule_1.webp"),
    title: "Wear Appropriate Workout Gear",
    desc: "Please wear comfortable workout attire and closed athletic shoes to ensure a safe training environment.",
  },
  {
    image: require("../../../assets/images/plans/rule_2.webp"),
    title: "Handle Equipment Responsibly",
    desc: "After using equipment, re-rack your weights and return gym equipment to its designated place to keep the floor clean and safe.",
  },
  {
    image: require("../../../assets/images/plans/rule_3.png"),
    title: "Respect Trainers & Fellow Members",
    desc: "Be respectful to gym staff and fellow members by practicing courtesy, sharing equipment and waiting patiently.",
  },
  {
    image: require("../../../assets/images/plans/rule_4.webp"),
    title: "Train Safe & Follow Gym Instructions",
    desc: "Use equipment correctly & consider consulting an on-ground gym trainer per gym Instructions to ensure your safety and that of others.",
  },
];

const MembershipConfirmed = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const gymName = params.gymName || "";
  const gymLogo = params.gymLogo || "";
  const planLabel = params.planLabel || "";
  const amount = params.amount || "0";

  useEffect(() => {
    setIsMounted(true);
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/client/home");
        return true;
      },
    );

    return () => {
      backHandler.remove();
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isMounted) {
        setShowReferralModal(true);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      setShowReferralModal(false);
    };
  }, [isMounted]);

  const handleViewMemberships = () => {
    router.push({
      pathname: "/unpaid/activateaccount",
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Referral Modal */}
      <Modal
        visible={showReferralModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReferralModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowReferralModal(false)}
          >
            <MaterialIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modalContent}>
            <View style={styles.rewardCard}>
              <Text style={styles.congratsText}>Congratulations!!!</Text>
              <Image
                source={require("../../../assets/images/refer/coin.webp")}
                style={styles.coinImage}
                contentFit="contain"
              />
              <Text style={styles.rewardTitle}>You've earned Reward Entry</Text>
              <Text style={styles.rewardSubtitle}>
                Collect more entries and get a chance to win an
              </Text>
              <Text style={styles.rewardPrize}>iPhone 17 Pro Max!</Text>
              <TouchableOpacity
                style={styles.viewEntriesButton}
                onPress={() => {
                  setShowReferralModal(false);
                  router.push("/client/rewardprogram");
                }}
              >
                <Text style={styles.viewEntriesText}>View Entries</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Image
            source={require("../../../assets/images/sessions/tick.png")}
            style={styles.tickIcon}
            contentFit="contain"
          />
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your Membership is ready to be activated 🎉
        </Text>

        {/* Booking Details Card */}
        <View style={styles.bookingCard}>
          <LinearGradient
            colors={["rgba(91, 43, 155, 0.15)", "rgba(255, 60, 123, 0.15)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientCard}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                {gymLogo ? (
                  <Image
                    source={{ uri: gymLogo }}
                    style={styles.gymLogoSmall}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons
                    name="fitness-center"
                    size={24}
                    color="#5B2B9B"
                  />
                )}
                <View>
                  <MaskedText
                    bg1="#5B2B9B"
                    bg2="#FF3C7B"
                    text={planLabel}
                    textStyle={styles.cardPlanLabel}
                  />
                  <Text style={styles.cardGymName} numberOfLines={1}>
                    {gymName}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Amount Paid</Text>
                <Text style={styles.amountValue}>₹{amount}</Text>
              </View>
              <View style={styles.warningContainer}>
                <MaterialIcons name="info-outline" size={16} color="#666" />
                <Text style={styles.warningText}>
                  Present your membership pass at the gym for entry.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Gym Mate Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/client/gymmate")}
          style={styles.gymMateBanner}
        >
          <Image
            source={require("../../../assets/images/plans/gym_mate.webp")}
            style={styles.gymMateImage}
            contentFit="cover"
          />
        </TouchableOpacity>

        {/* Gym Entry Guidelines */}
        <View style={styles.guidelinesSection}>
          <Text style={styles.guidelinesTitle}>Gym Entry Guidelines</Text>
          <Text style={styles.guidelinesSubtitle}>
            Follow gym rules for a safe workout experience
          </Text>

          {gymEntryGuidelines.map((item, i) => (
            <View key={i} style={styles.guidelineCard}>
              <Image
                source={item.image}
                style={styles.guidelineImage}
                contentFit="cover"
              />
              <Text style={styles.guidelineCardTitle}>{item.title}</Text>
              <Text style={styles.guidelineCardDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* View Memberships Button */}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleViewMemberships}
        >
          <LinearGradient
            colors={["#00C950", "#009966"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.viewGradient}
          >
            <Text style={styles.viewButtonText}>View Booked Plans</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default MembershipConfirmed;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 50,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  tickIcon: {
    width: 100,
    height: 100,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  bookingCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientCard: {
    padding: 20,
    paddingHorizontal: 0,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 2,
    paddingBottom: 14,
    borderBottomColor: "#ffffff",
    paddingHorizontal: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  gymLogoSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  cardGymName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  cardPlanLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#01BE2C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  cardBody: {
    gap: 16,
    paddingHorizontal: 16,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 43, 155, 0.08)",
    padding: 12,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: "#666",
    lineHeight: 18,
  },
  rulesSection: {
    marginBottom: 24,
  },
  rulesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  rulesSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  rulesCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    gap: 12,
  },
  ruleItem: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  viewButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  viewGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "82%",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 6,
  },
  coinImage: {
    width: 110,
    height: 110,
    marginVertical: 16,
  },
  rewardCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  congratsText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E6A817",
    marginBottom: 10,
    textAlign: "center",
  },
  rewardSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  rewardPrize: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 24,
  },
  viewEntriesButton: {
    width: "100%",
    backgroundColor: "#E6A817",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  viewEntriesText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  gymMateBanner: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  gymMateImage: {
    width: "100%",
    aspectRatio: 16 / 7,
    borderRadius: 16,
  },
  guidelinesSection: {
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  guidelinesSubtitle: {
    fontSize: 12,
    color: "#888",
    marginBottom: 16,
  },
  guidelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  guidelineImage: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  guidelineCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  guidelineCardDesc: {
    fontSize: 12,
    color: "#444",
    fontWeight: "500",
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
