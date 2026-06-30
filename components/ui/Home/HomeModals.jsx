import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { MaskedText } from "../MaskedText";
import { width } from "./constants";
import styles from "./homeStyles";

const HomeModals = ({
  insets,
  // Daily Pass Promo
  showDailyPassModal,
  setShowDailyPassModal,
  locationArea,
  goListGyms,
  // Promo Modal
  promoModalType,
  setPromoModalType,
  promoModalConfig,
  handlePromoAction,
  // Join Session
  joinSessionModal,
  setJoinSessionModal,
  // iOS Nutrition
  iosNutriModal,
  setIosNutriModal,
  // No Credits
  noCreditsVisible,
  setNoCreditsVisible,
  goCredits,
  // Nutrition Payment
  nutriPayProcessing,
  nutriPayStep,
  // Nutrition Success
  nutriPaySuccess,
  setNutriPaySuccess,
  fetchAll,
  lastPurchasedSku,
  goNutritionBooking,
  goDietCoachHeight,
  // Nutrition Failed
  nutriPayFailed,
  setNutriPayFailed,
}) => {
  return (
    <>
      {/* Daily Pass Promo Modal */}
      {showDailyPassModal && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setShowDailyPassModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalCard, { paddingBottom: 32 + insets.bottom }]}
            >
              <View style={styles.modalImageWrap} pointerEvents="none">
                <Image
                  source={require("../../../assets/images/home_content/passbelow.webp")}
                  style={styles.modalCardsImage}
                  contentFit="contain"
                />
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowDailyPassModal(false)}
              >
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
              <View style={styles.modalBody}>
                <View style={styles.modalDemandRow}>
                  <Text style={styles.modalDemandText}>
                    🔥 High demand in {locationArea || "your area"}
                  </Text>
                </View>
                <View style={styles.modalTodayCard}>
                  <Text style={styles.modalTodayLabel}>Try it Today</Text>
                  <View style={styles.modalPricePill}>
                    <MaskedText
                      bg1="#1364D7"
                      bg2="#8F32A1"
                      text="₹99"
                      textStyle={styles.modalSalePrice}
                      extra={false}
                    />
                    <Text style={styles.modalOriginalPrice}>₹199</Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => {
                    setShowDailyPassModal(false);
                    goListGyms();
                  }}
                >
                  <LinearGradient
                    colors={["#1364D7", "#8F32A1"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalCta}
                  >
                    <Text style={styles.modalCtaText}>Book Your Pass Now</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Dynamic Promo Modal */}
      {promoModalType && promoModalConfig[promoModalType] && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setPromoModalType(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.referModalCard,
                { paddingBottom: 24 + insets.bottom },
              ]}
            >
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setPromoModalType(null)}
              >
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
              <View style={styles.referModalBody}>
                <Image
                  source={promoModalConfig[promoModalType].image}
                  style={styles.referModalImage}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.referModalReward,
                    { color: promoModalConfig[promoModalType].color },
                  ]}
                >
                  {promoModalConfig[promoModalType].heading}
                </Text>
                <Text style={styles.referModalDesc}>
                  {promoModalConfig[promoModalType].content}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.promoCtaButton,
                    {
                      backgroundColor:
                        promoModalConfig[promoModalType].color,
                    },
                  ]}
                  onPress={handlePromoAction}
                >
                  <Text style={styles.promoCtaText}>
                    {promoModalConfig[promoModalType].button}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Join Nutrition Session Modal */}
      {joinSessionModal.visible && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() =>
            setJoinSessionModal((s) => ({ ...s, visible: false }))
          }
          statusBarTranslucent
        >
          <View style={styles.joinModalOverlay}>
            <View style={styles.joinModalContent}>
              {joinSessionModal.type === "no_link" && (
                <>
                  <View style={styles.joinModalIconWrap}>
                    <Ionicons name="time-outline" size={36} color="#007AFF" />
                  </View>
                  <Text style={styles.joinModalTitle}>
                    Link Not Yet Available
                  </Text>
                  <Text style={styles.joinModalMessage}>
                    {joinSessionModal.message}
                  </Text>
                </>
              )}
              {joinSessionModal.type === "not_started" && (
                <>
                  <View
                    style={[
                      styles.joinModalIconWrap,
                      { backgroundColor: "#EEF6FF" },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={36}
                      color="#007AFF"
                    />
                  </View>
                  <Text style={styles.joinModalTitle}>
                    Session Not Started Yet
                  </Text>
                  <Text style={styles.joinModalMessage}>
                    {joinSessionModal.message}
                  </Text>
                </>
              )}
              {joinSessionModal.type === "expired" && (
                <>
                  <View
                    style={[
                      styles.joinModalIconWrap,
                      { backgroundColor: "#FFF0F0" },
                    ]}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={36}
                      color="#FF5757"
                    />
                  </View>
                  <Text style={[styles.joinModalTitle, { color: "#FF5757" }]}>
                    Session Expired
                  </Text>
                  <Text style={styles.joinModalMessage}>
                    {joinSessionModal.message}
                  </Text>
                </>
              )}
              {joinSessionModal.type === "not_found" && (
                <>
                  <View
                    style={[
                      styles.joinModalIconWrap,
                      { backgroundColor: "#FFF0F0" },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={36}
                      color="#FF5757"
                    />
                  </View>
                  <Text style={[styles.joinModalTitle, { color: "#FF5757" }]}>
                    Booking Not Found
                  </Text>
                  <Text style={styles.joinModalMessage}>
                    {joinSessionModal.message}
                  </Text>
                </>
              )}
              {(joinSessionModal.startTime || joinSessionModal.bookingDate) && (
                <View style={styles.joinModalTimeBox}>
                  {joinSessionModal.bookingDate && (
                    <Text style={styles.joinModalTimeText}>
                      📅 {joinSessionModal.bookingDate}
                    </Text>
                  )}
                  {joinSessionModal.startTime && joinSessionModal.endTime && (
                    <Text style={styles.joinModalTimeText}>
                      🕐 {joinSessionModal.startTime} –{" "}
                      {joinSessionModal.endTime}
                    </Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.joinModalCloseBtn}
                onPress={() =>
                  setJoinSessionModal((s) => ({ ...s, visible: false }))
                }
              >
                <Text style={styles.joinModalCloseBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* iOS Nutrition Interest Modal */}
      {iosNutriModal.visible && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() =>
            setIosNutriModal({ visible: false, alreadyExists: false })
          }
          statusBarTranslucent
        >
          <View style={styles.joinModalOverlay}>
            <View style={styles.joinModalContent}>
              <View style={styles.joinModalIconWrap}>
                <Ionicons
                  name={
                    iosNutriModal.alreadyExists
                      ? "checkmark-circle-outline"
                      : "thumbs-up-outline"
                  }
                  size={36}
                  color="#007AFF"
                />
              </View>
              <Text style={styles.joinModalTitle}>
                {iosNutriModal.alreadyExists
                  ? "Request Already Sent"
                  : "Thank You!"}
              </Text>
              <Text style={styles.joinModalMessage}>
                {iosNutriModal.alreadyExists
                  ? "Your request has already been received. Our team will contact you shortly."
                  : "Thank you for showing interest! Our team will contact you soon."}
              </Text>
              <TouchableOpacity
                style={styles.joinModalCloseBtn}
                onPress={() =>
                  setIosNutriModal({ visible: false, alreadyExists: false })
                }
              >
                <Text style={styles.joinModalCloseBtnText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* No Credits Modal */}
      {noCreditsVisible && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setNoCreditsVisible(false)}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setNoCreditsVisible(false)}
          >
            <View
              style={[
                styles.noCreditsSheet,
                { paddingBottom: 28 + insets.bottom },
              ]}
            >
              <Text style={styles.noCreditsTitle}>Not Enough Credits</Text>
              <Text style={styles.noCreditsSubtitle}>
                You don't have enough AI credits to scan food.
              </Text>
              {Platform.OS !== "ios" && (
                <TouchableOpacity
                  style={styles.noCreditsBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    setNoCreditsVisible(false);
                    goCredits();
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
                style={styles.noCreditsDismiss}
                onPress={() => setNoCreditsVisible(false)}
              >
                <Text style={styles.noCreditsDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Nutrition Payment Processing Modal */}
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

      {/* Nutrition Purchase Success Modal */}
      {nutriPaySuccess && (
        <Modal
          animationType="fade"
          transparent
          visible
          onRequestClose={() => {
            setNutriPaySuccess(false);
            fetchAll();
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
                {lastPurchasedSku === "ai_diet_coach"
                  ? "Your AI Diet Coach plan is now active. Generate your personalized diet plan now!"
                  : "Your nutrition package is active. Book your session now to get started!"}
              </Text>
              <TouchableOpacity
                style={[styles.nutriJoinBtn, { marginTop: 16, width: "100%" }]}
                activeOpacity={0.85}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchAll();
                  if (lastPurchasedSku === "ai_diet_coach") {
                    goDietCoachHeight();
                  } else {
                    goNutritionBooking();
                  }
                }}
              >
                <Text style={styles.nutriJoinBtnText}>
                  {lastPurchasedSku === "ai_diet_coach"
                    ? "Generate Your Diet Plan"
                    : "Book Your Slot Now"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 12, paddingVertical: 8 }}
                activeOpacity={0.7}
                onPress={() => {
                  setNutriPaySuccess(false);
                  fetchAll();
                }}
              >
                <Text
                  style={{ color: "#888", fontSize: 14, fontWeight: "500" }}
                >
                  {lastPurchasedSku === "ai_diet_coach"
                    ? "I'll do it later"
                    : "I'll book later"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Nutrition Purchase Failed Modal */}
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
    </>
  );
};

export default HomeModals;
