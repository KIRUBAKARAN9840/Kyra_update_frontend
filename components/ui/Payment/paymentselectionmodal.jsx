import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
  StatusBar,
  Dimensions,
  TouchableWithoutFeedback,
  Linking,
  BackHandler,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PLAY_HELP_CENTER_URL = "https://support.google.com/googleplay";
const ASYNCSTORAGE_INFO_SCREEN_KEY = "hasSeenInformationScreen";

const PaymentMethodModal = ({ visible, onClose, planData, onPaymentMethodSelect, asyncStorageKey }) => {
  const storageKey = asyncStorageKey || ASYNCSTORAGE_INFO_SCREEN_KEY;
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [showInfoScreen, setShowInfoScreen] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);
  const isLandscape = useIsLandscape();
  const insets = useSafeAreaInsets();
  // Check if user has seen the information screen before
  useEffect(() => {
    if (visible) {
      checkIfFirstPurchase();
    }
    setModalVisible(visible);
  }, [visible]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => backHandler.remove();
  }, [modalVisible, showInfoScreen]);

  const handleBackPress = () => {
    if (modalVisible) {
      if (showInfoScreen) {
        setShowInfoScreen(false);
        onClose();
      } else {
        onClose();
      }
      return true;
    }
    return false;
  };

  const checkIfFirstPurchase = async () => {
    try {
      const hasSeenInfo = await AsyncStorage.getItem(storageKey);
      if (hasSeenInfo !== "true") {
        setShowInfoScreen(true);
      }
    } catch (error) {
      console.error("Error checking first purchase status:", error);
      setShowInfoScreen(true);
    }
  };

  const markInfoScreenAsSeen = async () => {
    try {
      await AsyncStorage.setItem(storageKey, "true");
    } catch (error) {
      console.error("Error saving info screen status:", error);
    }
  };

  const handleSelectPaymentProvider = (provider) => {
    setSelectedMethod(provider);

    // If callback is provided (when called from paynow page), use it
    // Otherwise navigate to paynow page (when called from subscription page)
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(provider);
    } else {
      // Navigate to the payment summary page with selected payment method
      router.push({
        pathname: "/client/paynow",
        params: {
          name: planData?.name,
          offerprice: planData?.discountedPrice,
          duration: planData?.duration,
          price: planData?.mrp,
          months: planData?.months,
          paymentMethod: provider,
          rc_id: planData?.rc_id,
          product_rc: planData?.product_rc,
          product_rp: planData?.product_rp,
        },
      });
    }

    // Close the modal
    onClose();
  };

  const handleContinue = () => {
    markInfoScreenAsSeen();
    setShowInfoScreen(false);
  };

  const handleDismiss = () => {
    setShowInfoScreen(false);
    onClose();
  };

  const handleLearnMorePress = () => {
    Linking.openURL(PLAY_HELP_CENTER_URL);
  };

  const handleOutsidePress = () => {
    if (showInfoScreen) {
      handleDismiss();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={handleBackPress}
    >
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.bottomSheet,
                isLandscape && styles.bottomSheetLandscape,
              ]}
            >
              {showInfoScreen ? (
                // Information Screen (first purchase only)
                <View
                  style={[
                    styles.infoScreenContainer,
                    { paddingBottom: insets.bottom },
                  ]}
                >
                  <Text style={styles.infoTitle}>
                    Changes to your checkout options
                  </Text>

                  <Text style={styles.infoMainText}>
                    You now have more options at checkout. Your choice will
                    determine:
                  </Text>
                  <View style={styles.bulletPoints}>
                    <Text style={styles.infoText}>
                      • Who secures your purchase, processes your payment, and
                      stores any payment information
                    </Text>
                    <Text style={styles.infoText}>
                      • Who provides customer support for the purchase
                    </Text>
                    <Text style={styles.infoText}>
                      • Which benefits are available with your purchase
                    </Text>
                  </View>

                  <Text style={styles.infoSecondaryText}>
                    Benefits and available forms of payment may vary. Play
                    features like gift cards, Play Points, Play Pass offers,
                    purchase controls, and subscription management are only
                    available when you choose Play.
                  </Text>

                  <View style={styles.infoButtonsContainer}>
                    <TouchableOpacity
                      style={styles.learnMoreButton}
                      onPress={handleLearnMorePress}
                    >
                      <Text style={styles.learnMoreButtonText}>Learn more</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.continueButton}
                      onPress={handleContinue}
                    >
                      <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Billing Choice Screen
                <View
                  style={[
                    styles.billingChoiceContainer,
                    { paddingBottom: insets.bottom },
                  ]}
                >
                  <Text style={styles.choiceTitle}>
                    Choose how to check out
                  </Text>

                  <Text style={styles.choiceDescription}>
                    Choose who will secure and process your payment and provide
                    customer service. Benefits and available forms of payment
                    may vary.
                    <Text
                      style={styles.learnMoreLink}
                      onPress={handleLearnMorePress}
                    >
                      {" "}
                      Learn more
                    </Text>
                  </Text>

                  {/* Razorpay Payment Option */}
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => handleSelectPaymentProvider("razorpay")}
                  >
                    <View style={styles.providerInfo}>
                      <Image
                        source={require("../../../assets/images/new_logo.png")}
                        style={styles.providerLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.providerName}>Fymble</Text>
                    </View>

                    <View style={styles.paymentMethodsRow}>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/googlepay.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/phonepe.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/paytm.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/bhim.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.andMoreText}>and more</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Google Play Payment Option */}
                  <TouchableOpacity
                    style={styles.paymentOption}
                    onPress={() => handleSelectPaymentProvider("googleplay")}
                  >
                    <View style={styles.providerInfo}>
                      <Image
                        source={require("../../../assets/images/googleplay.png")}
                        style={styles.providerLogo}
                        resizeMode="contain"
                      />
                      <Text style={styles.providerName}>Google Play</Text>
                    </View>

                    <View style={styles.paymentMethodsRow}>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/play.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/googlepay.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/visa.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.paymentMethodIcon}>
                        <Image
                          source={require("../../../assets/images/payment/mastercard.png")}
                          style={styles.methodLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.andMoreText}>and more</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.bottomIndicator} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Custom hook to detect orientation
const useIsLandscape = () => {
  const [isLandscape, setIsLandscape] = useState(
    Dimensions.get("window").width > Dimensions.get("window").height
  );

  useEffect(() => {
    const updateOrientation = () => {
      setIsLandscape(
        Dimensions.get("window").width > Dimensions.get("window").height
      );
    };

    Dimensions.addEventListener("change", updateOrientation);

    return () => {
      // For newer React Native versions
      if (Dimensions.removeEventListener) {
        Dimensions.removeEventListener("change", updateOrientation);
      }
    };
  }, []);

  return isLandscape;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Dark scrim as per guidelines
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: "100%",
    elevation: 8, // For Android shadow
    shadowColor: "#000", // For iOS shadow
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  bottomSheetLandscape: {
    maxWidth: 500,
    alignSelf: "center",
  },

  // Information Screen Styles
  infoScreenContainer: {
    width: "100%",
  },
  infoTitle: {
    fontFamily: "Roboto",
    fontSize: 18,
    color: "#202124",
    marginBottom: 24,
    fontWeight: "500",
  },
  infoMainText: {
    fontFamily: "Roboto",
    fontSize: 14,
    lineHeight: 20,
    color: "#5F6368",
    marginBottom: 8,
  },
  bulletPoints: {
    marginBottom: 16,
  },
  infoText: {
    fontFamily: "Roboto",
    fontSize: 14,
    lineHeight: 20,
    color: "#5F6368",
  },
  infoSecondaryText: {
    fontFamily: "Roboto",
    fontSize: 12,
    lineHeight: 16,
    color: "#5F6368",
    marginBottom: 24,
  },
  infoButtonsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  learnMoreButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DADCE0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  learnMoreButtonText: {
    fontFamily: "Roboto",
    fontSize: 14,
    fontWeight: "500",
    color: "#01875F",
    textAlign: "center",
  },
  continueButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#01875F",
  },
  continueButtonText: {
    fontFamily: "Roboto",
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Billing Choice Screen Styles
  billingChoiceContainer: {
    width: "100%",
  },
  choiceTitle: {
    fontFamily: "Roboto",
    fontSize: 18,
    color: "#202124",
    marginBottom: 16,
    fontWeight: "500",
  },
  choiceDescription: {
    fontFamily: "Roboto",
    fontSize: 14,
    color: "#5F6368",
    marginBottom: 24,
    lineHeight: 20,
  },
  learnMoreLink: {
    textDecorationLine: "underline",
    color: "#5F6368",
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 4,
    marginBottom: 16,
    padding: 16,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  providerLogo: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  providerName: {
    fontFamily: "Roboto",
    fontSize: 14,
    color: "#202124",
    fontWeight: "500",
  },
  paymentMethodsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentMethodIcon: {
    width: 32,
    height: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DADCE0",
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  methodLogo: {
    width: "100%",
    height: "100%",
  },
  andMoreText: {
    fontFamily: "Roboto",
    fontSize: 12,
    color: "#5F6368",
  },
  bottomIndicator: {
    height: 4,
    width: 40,
    backgroundColor: "#DADCE0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 16,
  },
});

export default PaymentMethodModal;
