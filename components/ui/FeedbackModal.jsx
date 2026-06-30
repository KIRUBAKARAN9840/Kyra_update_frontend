import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Animated,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ratingFeedbackAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.fittbot.fittbot_client&hl=en_IN";
const APP_STORE_LINK = "https://apps.apple.com/us/app/fittbot/id6747237294";
const { width, height } = Dimensions.get("window");

const FeedbackModal = ({ visible, onClose }) => {
  const [rating, setRating] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Reset state when modal is closed
  React.useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setRating(0);
        setShowFeedback(false);
        setFeedback("");
        setLoading(false);
      }, 300);
    }
  }, [visible]);

  const animateStar = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRating = async (selectedRating) => {
    setRating(selectedRating);
    animateStar();

    if (selectedRating === 5) {
      // For 5 stars, immediately call API and redirect to store
      await handleSubmitRating(selectedRating, null);
      setTimeout(() => {
        redirectToStore();
        onClose();
      }, 1000);
    } else {
      // For 1-4 stars, show feedback form
      setShowFeedback(true);
    }
  };

  const redirectToStore = () => {
    try {
      Linking.openURL(Platform.OS === "ios" ? APP_STORE_LINK : PLAY_STORE_LINK);
    } catch (error) {
      console.error(
        `Could not open ${Platform.OS === "ios" ? "App Store" : "Play Store"}`,
        error,
      );
    }
  };

  const handleSubmitRating = async (star, feedbackText) => {
    try {
      setLoading(true);
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found. Please try again.",
        });
        setLoading(false);
        return;
      }

      const payload = {
        status: "ok",
        client_id: clientId,
        star: star,
        feedback: feedbackText || null,
      };

      const response = await ratingFeedbackAPI(payload);

      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc:
            star === 5
              ? "Thank you for your 5-star rating!"
              : "Thank you for your feedback!",
        });
        return true;
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Failed to submit feedback. Please try again.",
        });
        return false;
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (loading) return;

    const success = await handleSubmitRating(rating, feedback);
    if (success) {
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  const handleNotNow = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (clientId) {
        // Send cancel status to API
        await ratingFeedbackAPI({
          status: "cancel",
          client_id: clientId,
          star: 0,
          feedback: null,
        });
      }
    } catch (error) {
      console.error("Error sending cancel status:", error);
    }
    onClose();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleRating(i)}
          style={styles.starContainer}
        >
          <Animated.View
            style={{
              transform: [{ scale: rating === i ? scaleAnim : 1 }],
            }}
          >
            <Ionicons
              name={i <= rating ? "star" : "star-outline"}
              size={36}
              color={i <= rating ? "#FFD700" : "#CCCCCC"}
            />
          </Animated.View>
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleNotNow}>
              <Ionicons name="close-circle" size={32} color="#999" />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={
                  Platform.OS === "ios"
                    ? require("../../assets/images/apple.png")
                    : require("../../assets/images/google.png")
                }
                style={styles.storeLogo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Your opinion matters to us!</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              We work super hard to serve you better and would love to know how
              would you rate our app?
            </Text>

            {/* Star Rating */}
            <View style={styles.ratingContainer}>{renderStars()}</View>

            {/* Feedback Section (shown for ratings 1-4) */}
            {showFeedback && rating > 0 && rating < 5 && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackLabel}>
                  Help us improve! What can we do better?
                </Text>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Share your thoughts with us..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={feedback}
                  onChangeText={setFeedback}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitFeedback}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Submitting..." : "Submit Feedback"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* For 5 stars - show thank you message */}
            {rating === 5 && (
              <View style={styles.thankYouContainer}>
                <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                <Text style={styles.thankYouText}>
                  Thank you for your 5-star rating!
                </Text>
                <Text style={styles.redirectText}>
                  Redirecting to{" "}
                  {Platform.OS === "ios" ? "App Store" : "Play Store"}...
                </Text>
              </View>
            )}

            {/* Not Now Button */}
            {rating === 0 && (
              <TouchableOpacity
                style={styles.notNowButton}
                onPress={handleNotNow}
              >
                <Text style={styles.notNowText}>Not Now</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollContent: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 15,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  storeLogo: {
    width: 160,
    height: 46,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#3D3F7C",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#4E4E4E",
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
    marginTop: 10,
    gap: 5,
  },
  starContainer: {
    padding: 5,
  },
  feedbackContainer: {
    width: "100%",
    marginTop: 10,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  feedbackInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  thankYouContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 20,
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 10,
    marginBottom: 5,
  },
  redirectText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  notNowButton: {
    marginTop: 20,
    padding: 12,
  },
  notNowText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default FeedbackModal;
