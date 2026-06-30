import React, { useState, useEffect } from "react";
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
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ratingFeedbackAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";

const PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.fittbot.fittbot_client&hl=en_IN";

const APP_STORE_LINK = "https://apps.apple.com/us/app/fittbot/id6747237294";
const { width, height } = Dimensions.get("window");

const RateNowScreen = ({ navigation }) => {
  const [rating, setRating] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Animation effect when user taps a star
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
      setShowFeedback(false);
      await handleSubmitRating(selectedRating, null);
      setTimeout(() => {
        redirectToStore();
      }, 1000);
    } else {
      // For 1-4 stars, show feedback form
      setShowThankYou(false);
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
        return false;
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
        if (star === 5) {
          setShowThankYou(true);
        }
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
      setShowThankYou(true);
      setShowFeedback(false);
      setTimeout(() => {
        router.push("/client/home");
      }, 1500);
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/client/account");
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);
  // Render stars for rating
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
              size={30}
              color={i <= rating ? "#FFD700" : "#CCCCCC"}
            />
          </Animated.View>
        </TouchableOpacity>,
      );
    }
    return stars;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={[styles.backArrow, { top: insets.top + 10 }]}
          onPress={() => router.replace("/client/account")}
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Image
          source={require("../../assets/images/rateus.webp")}
          style={{ width: "100%", height: 340, marginTop: insets.top + 20 }}
        />
        <View style={styles.mainContainer}>
          <View style={[styles.logoContainer]}>
            <Image
              source={
                Platform.OS === "ios"
                  ? require("../../assets/images/apple.png")
                  : require("../../assets/images/google.png")
              }
              style={{ width: 160, height: 46 }}
            />
          </View>

          <Text style={styles.title}>Your opinion matters to us!</Text>

          <Text style={styles.subtitle}>
            We work super hard to serve you better and would love to know how
            would you rate our app?
          </Text>

          {/* Star Rating */}
          <View style={styles.ratingContainer}>{renderStars()}</View>

          {/* Thank You Message (conditionally shown) */}
          {showThankYou && rating === 5 && (
            <Animated.View style={styles.thankYouContainer}>
              <Text style={styles.thankYouText}>
                Thank you for your feedback.Please rate us in{" "}
                {Platform.OS === "ios" ? "App Store" : "Play Store"}!
              </Text>
              <Text style={styles.redirectText}>
                Redirecting to{" "}
                {Platform.OS === "ios" ? "App Store" : "Play Store"}
                ...
              </Text>
            </Animated.View>
          )}

          {/* Feedback Section (shown for ratings < 5) */}
          {showFeedback && (
            <View style={styles.feedbackContainer}>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Give us your feedback"
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
                  {loading ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Success message after feedback submission */}
          {showThankYou && rating < 5 && (
            <Animated.View style={styles.thankYouContainer}>
              <Text style={styles.thankYouText}>
                Thank you for your feedback!
              </Text>
            </Animated.View>
          )}

          {/* Skip Option */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push("/client/account")}
          >
            <Text style={styles.skipText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: 0,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#3D3F7C",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 0,
    color: "#4E4E4E",
    paddingHorizontal: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  starContainer: {
    padding: 8,
  },
  thankYouContainer: {
    marginTop: 15,
    alignItems: "center",
  },
  thankYouText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 5,
  },
  redirectText: {
    fontSize: 10,
    color: "#666",
  },
  skipButton: {
    marginTop: 30,
    padding: 10,
  },
  skipText: {
    color: "#999",
    fontSize: 14,
  },
  motivationText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 20,
    color: "#888",
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: height * 0.025,
    marginTop: 0,
  },
  logoText: {
    fontSize: 42,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
    fontWeight: "500",
  },
  logoFirstPart: {
    color: "#FF5757",
  },
  logoSecondPart: {
    color: "#000000",
  },
  logoUnderline: {
    width: 80,
    height: 4,
    backgroundColor: "#FF5757",
    borderRadius: 2,
    marginTop: 5,
  },
  tagline: {
    color: "#000000",
    fontSize: 10,
    marginTop: 10,
    fontFamily: Platform.OS === "ios" ? "Avenir" : "sans-serif",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginTop: 25,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 20,
  },
  backArrow: {
    position: "absolute",
    left: 15,
    zIndex: 10,
    padding: 5,
  },
  feedbackContainer: {
    width: "100%",
    marginTop: 20,
    paddingHorizontal: 10,
  },
  feedbackInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    color: "#333",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    alignItems: "center",
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
});

export default RateNowScreen;
