import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Vibration,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MaskedText } from "../../../components/ui/MaskedText";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import * as Speech from "expo-speech";
import axios from "axios";
import axiosInstance from "../../../services/axiosInstance";
import * as SecureStore from "expo-secure-store";
import EventSource from "react-native-sse";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addClientDietAIAPI,
  closeChatbotAPI,
  getAIConsentAPI,
  postAIConsentAPI,
  reportKyraAPI,
} from "../../../services/clientApi";
import GrainConfettiAnimation from "../../../components/ui/ConfettiAnimation";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useChatSound } from "../../../hooks/useChatSound";

const { width } = Dimensions.get("window");
import apiConfig from "../../../services/apiConfig";
import { useSafeAreaInsets } from "react-native-safe-area-context";
/* ─────────────────── CONFIG ─────────────────── */
const API_BASE_URL = apiConfig.API_URL;

/* ─────────────────── TAB CONFIGURATION ─────────────────── */
const TAB_CONFIG = [
  { id: "default", label: "Chat", icon: "chat-bubble-outline" },
  { id: "foodlog", label: "Diet Log", icon: "restaurant" },
  { id: "workoutlog", label: "Workout Log", icon: "fitness-center" },
  { id: "dietTemplate", label: "Diet Plan", icon: "calendar-today" },
  { id: "workoutTemplate", label: "Workout Plan", icon: "trending-up" },
  { id: "analysis", label: "Analysis", icon: "analytics" },
];

// Configuration based on source
const getSourceConfig = (source, user_id, selectedMeal = null) => {
  switch (source) {
    case "dietTemplate":
      return {
        welcomeMessage:
          "Hey {userName}! 🥗\nI'm here to help you create and customize your diet template. Let's build the perfect nutrition plan for you!",
        thinkingText: "Creating diet template",
        typingText: "Generating diet plan",
        endpoint: `/food_template/chat/stream?client_id=${encodeURIComponent(
          user_id,
        )}&user_id=${encodeURIComponent(user_id)}`,
        placeholder: "Describe your diet goals or ask for nutrition advice...",
      };
    case "workoutTemplate":
      return {
        welcomeMessage:
          "Hey {userName}! 💪\nGreat to see you back! Let’s take a quick look at your profile to set up your perfect workout plan. 🏋️‍♂️🔥\nShall we start? 😊",
        thinkingText: "Designing workout",
        typingText: "Creating workout plan",
        endpoint: `/workout_template/workout_stream?user_id=${encodeURIComponent(
          user_id,
        )}`,
        placeholder:
          "Tell me about your fitness goals or workout preferences...",
      };
    case "foodlog":
      // Only create endpoint if selectedMeal is provided
      if (!selectedMeal) {
        return {
          welcomeMessage: null, // No welcome message, just show meal selector
          thinkingText: "Processing food log",
          typingText: "Analyzing nutrition",
          endpoint: null, // No endpoint until meal is selected
          placeholder: "Select a meal first...",
          needsMealSelection: true,
        };
      }

      const mealParam = selectedMeal;
      let parsedMeal;
      try {
        parsedMeal = JSON.parse(mealParam);
      } catch (error) {
        console.error("Error parsing meal parameter:", error);
        parsedMeal = mealParam; // Use as-is if not valid JSON
      }
      const endpoint = `/food_log/chat/stream_test?user_id=${encodeURIComponent(
        user_id,
      )}&meal=${encodeURIComponent(parsedMeal)}`;

      return {
        welcomeMessage:
          "Hey {userName}! 📝\nLet's log your meals! Tell me what you've eaten or use voice to quickly add foods to your daily log.",
        thinkingText: "Processing food log",
        typingText: "Analyzing nutrition",
        endpoint: endpoint,
        placeholder: 'What did you eat? e.g., "2 eggs and 1 slice of bread"...',
      };
    case "workoutlog":
      return {
        welcomeMessage:
          "Hey {userName}! 🏋️‍♂️\nTime to log your workout! Share your exercises, sets, and reps - I'll help track your progress.",
        thinkingText: "Processing workout",
        typingText: "Logging exercises",
        endpoint: `/workout_log/chat/stream?user_id=${encodeURIComponent(
          user_id,
        )}`,
        placeholder: 'Log your workout: e.g., "3 sets of 10 push-ups"...',
      };
    case "analysis":
      return {
        welcomeMessage:
          "Hey {userName}! 📊\nI'm here to analyze your fitness data and provide insights about your progress and performance.",
        thinkingText: "Analyzing data",
        typingText: "Generating insights",
        endpoint: `/analysis/chat/stream?user_id=${encodeURIComponent(
          user_id,
        )}`,
        placeholder: "Ask me about your progress or request an analysis...",
      };
    default:
      return {
        welcomeMessage:
          "Hey {userName}! 👋\nYou can chat or use voice messages to ask me anything about your fitness journey.",
        thinkingText: "Thinking",
        typingText: "Responding",
        endpoint: `/chatbot/chat/stream_test?user_id=${encodeURIComponent(
          user_id,
        )}`,
        placeholder: "Type or hold mic to record...",
      };
  }
};

/* ─────────────────── API WRAPPER ─────────────────── */
const chatbotAPI = {
  // (non-stream)
  sendMessage: async (payload) => {
    const res = await axiosInstance.post(`/chatbot/chat`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });
    return res?.data;
  },

  healthCheck: async () => {
    const res = await axiosInstance.get(`/chatbot/healthz`);
    return res?.data;
  },

  // Verify token validity
  verifyToken: async (token) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      });
      return res?.status === 200;
    } catch (error) {
      // If 401, token is invalid
      if (error?.response?.status === 401) {
        return false;
      }
      // Other errors, assume token might be valid
      console.error("Token verification error:", error);
      return true; // Don't refresh on network errors
    }
  },

  // Token refresh utility for SSE
  refreshTokenForSSE: async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const role = "client";

      if (!clientId) {
        throw new Error("No client ID found");
      }

      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {
          id: clientId,
          role: role,
        },
        {
          timeout: 10000,
        },
      );

      if (refreshResponse?.status === 200) {
        await SecureStore.setItemAsync(
          "access_token",
          refreshResponse.data.access_token,
        );
        return refreshResponse.data.access_token;
      }
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  },

  // Get valid token (verify first, refresh if needed)
  getValidToken: async () => {
    try {
      // Get current token
      let token = await SecureStore.getItemAsync("access_token");

      if (!token) {
        return await chatbotAPI.refreshTokenForSSE();
      }

      // Verify token
      const isValid = await chatbotAPI.verifyToken(token);

      if (!isValid) {
        token = await chatbotAPI.refreshTokenForSSE();
      }

      return token;
    } catch (error) {
      console.error("Error getting valid token:", error);
      return null;
    }
  },

  // streaming GET with token (no auto-refresh here, handled in component)
  openSSE: async ({
    user_id,
    text,
    endpoint = "/chatbot/chat",
    onMessage,
    token,
  }) => {
    const url = `${API_BASE_URL}${endpoint}&text=${encodeURIComponent(text)}`;

    // react-native-sse configuration
    const es = new EventSource(url, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...(token && { Authorization: `Bearer ${token}` }), // Include auth token
      },
      timeout: 300000, // 5 minutes
      pollingInterval: 0, // Disable polling, use pure streaming
    });

    // Debug: Log all possible event types
    es.onopen = () => {};

    es.onmessage = (e) => {
      // Call the callback if provided
      if (onMessage) {
        onMessage(e);
      }
    };

    es.onerror = async (e) => {
      console.error("SSE error:", e);
    };

    return es;
  },

  // voice → text
  transcribeVoice: async (audioUri, client_id) => {
    const form = new FormData();

    // Determine file extension and MIME type based on platform
    const extension = Platform.OS === "ios" ? "m4a" : "mp4";
    const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";

    // // Read and print audio bytes
    // try {
    //   const base64Audio = await readAsStringAsync(audioUri, {
    //     encoding: "base64",
    //   });
    //   const audioBytes = atob(base64Audio);
    //   const byteArray = new Uint8Array(audioBytes.length);
    //   for (let i = 0; i < audioBytes.length; i++) {
    //     byteArray[i] = audioBytes.charCodeAt(i);
    //   }
    //   console.log("===== AUDIO BYTES INFO =====");
    //   console.log("Audio file size (bytes):", byteArray.length);
    //   console.log("First 100 bytes:", Array.from(byteArray.slice(0, 100)));
    //   console.log("Last 100 bytes:", Array.from(byteArray.slice(-100)));
    //   console.log("============================");
    // } catch (error) {
    //   console.error("Error reading audio bytes:", error);
    // }

    form.append("audio", {
      uri: audioUri,
      type: mimeType,
      name: `recording.${extension}`,
    });

    // Step 1: Verify token and refresh if needed (like axiosInstance)
    const token = await chatbotAPI.getValidToken();

    if (!token) {
      throw new Error("Failed to get valid token for transcription");
    }

    // Step 2: Make API call with verified token (user_id as query parameter)
    const res = await fetch(
      `${API_BASE_URL}/chatbot/voice/transcribe?user_id=${client_id}`,
      {
        method: "POST",
        body: form,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Transcribe failed ${res.status}: ${txt}`);
    }

    const json = await res.json();
    // accept any of the three common response shapes
    return json?.transcript || json?.text || json?.data?.text || "";
  },
};

/* ─────────────────── COMPONENT ─────────────────── */
const AIFitnessBot = () => {
  /* ===== chat state ===== */
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);
  const [showNavigationModal, setShowNavigationModal] = useState(false);
  const [loggedMessage, setLoggedMessage] = useState("");
  const [xpRewardVisible, setXpRewardVisible] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [showWorkoutNavigationModal, setShowWorkoutNavigationModal] =
    useState(false);
  const [workoutLoggedMessage, setWorkoutLoggedMessage] = useState("");
  const [workoutData, setWorkoutData] = useState(null);
  const [showMealPlanButtons, setShowMealPlanButtons] = useState(false);
  const [mealPlanData, setMealPlanData] = useState(null);
  const [showTemplateNavigationModal, setShowTemplateNavigationModal] =
    useState(false);
  const [templateSaveMessage, setTemplateSaveMessage] = useState("");

  /* ===== AI Policy Compliance State ===== */
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [showAIConsentModal, setShowAIConsentModal] = useState(false);

  /* ===== voice / recording state ===== */
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(
    getSourceConfig("default", clientId, null),
  );
  const insets = useSafeAreaInsets();

  // Initialize audio recorder with platform-specific settings
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    // iOS-specific settings
    ...(Platform.OS === "ios" && {
      extension: ".m4a",
      audioQuality: "MAX",
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    }),
    // Android-specific settings
    ...(Platform.OS === "android" && {
      extension: ".mp4",
      audioQuality: "HIGH",
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    }),
  });
  const recorderState = useAudioRecorderState(audioRecorder);

  /* ===== refs ===== */
  const flatListRef = useRef(null);
  const esRef = useRef(null);
  const thinkingAnim = useRef(new Animated.Value(0)).current;
  const typingAnim = useRef(new Animated.Value(0)).current;
  const recordingAnim = useRef(new Animated.Value(0)).current;
  const radioButtonAnim = useRef(new Animated.Value(1)).current;
  const durationInterval = useRef(null);
  const typingAnimationRef = useRef(null); // Store animation loop reference
  const welcomeMessageSet = useRef(false);
  const scrollY = useRef(0);
  const isNearBottom = useRef(true);
  const scrollTimeout = useRef(null);
  const lastScrollDirection = useRef(null);
  const lastToggleTime = useRef(0);
  const { profileImage, userName, source, selectedMeal } =
    useLocalSearchParams();
  const router = useRouter();

  const [showRadioButtons] = useState(true); // Always show tabs
  const isAtBottom = useRef(true); // Track if user is at bottom
  const isScrollingProgrammatically = useRef(false); // Track programmatic scrolls
  const radioButtonScrollRef = useRef(null); // Ref for horizontal scroll

  /* ===== Chat Sound Effects (UISFX) ===== */
  // Track screen focus state for conditional sound playback
  const isScreenFocused = useRef(true);

  // Initialize chat sound hook with focus tracking
  const {
    playMessageSentSound,
    playMessageReceivedSound,
    playTypingSound,
    stopTypingSound,
  } = useChatSound(isScreenFocused.current);

  // Track screen focus using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - enable sounds
      isScreenFocused.current = true;

      return () => {
        // Screen is blurred - disable sounds
        isScreenFocused.current = false;
      };
    }, []),
  );

  // Stop typing sound when source/bot changes
  useEffect(() => {
    // Stop any ongoing typing sound when switching bots
    stopTypingSound();
  }, [source, stopTypingSound]);

  // Get initial label based on source
  const getInitialLabel = () => {
    const tab = TAB_CONFIG.find((t) => t.id === source);
    return tab ? tab.label : "Chat";
  };

  const [activeTabLabel, setActiveTabLabel] = useState(getInitialLabel());

  const getClientId = async () => {
    try {
      const id = await AsyncStorage.getItem("client_id");
      setClientId(id);
      // Update config when clientId is available
      const config = getSourceConfig(source, id, selectedMeal);
      setCurrentConfig(config);
    } catch (err) {
      console.error("Error fetching client_id:", err);
    }
  };

  useEffect(() => {
    getClientId();
  }, [source, selectedMeal]);

  // Scroll active tab to center on mount and source change
  useEffect(() => {
    if (source) {
      setTimeout(() => scrollToActiveTab(source), 300);
    }
  }, [source]);

  // Handle recording state changes and cleanup
  useEffect(() => {
    // Only update if there's an actual change to prevent loops
    if (recorderState.isRecording !== isRecording) {
      if (recorderState.isRecording && !isRecording) {
        setIsRecording(true);
        // Start timer when recording begins
        setRecordingDuration(0);
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
        }
        durationInterval.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } else if (!recorderState.isRecording && isRecording) {
        setIsRecording(false);
        // Clear timer when recording stops
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
        // Stop animation when recording stops
        recordingAnim.stopAnimation();
      }
    }

    // Cleanup on unmount
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [recorderState.isRecording]); // Only depend on recorderState.isRecording

  // Cleanup audio recorder on unmount (important for iOS)
  useEffect(() => {
    return () => {
      if (recorderState.isRecording) {
        audioRecorder.stop().catch(console.error);
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  /* utils */
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  /* welcome + permissions */
  useEffect(() => {
    // Only set welcome message once using ref and when clientId is available
    if (!welcomeMessageSet.current && clientId) {
      welcomeMessageSet.current = true;
      const config = getSourceConfig(source, clientId, selectedMeal);
      setCurrentConfig(config);

      // For dietTemplate, skip welcome message and directly start the flow
      if (source === "dietTemplate") {
        // Automatically trigger the diet template flow by sending an initial message
        setTimeout(() => {
          sendStreamingMessage("start");
        }, 500); // Small delay to ensure everything is initialized
      } else if (source === "foodlog" && !selectedMeal) {
        // For foodlog without meal selection, just show meal selector
        // Add voice for meal selection
        try {
          Speech.speak("Select your meal slot", {
            voice:
              Platform.OS === "ios"
                ? "com.apple.ttsbundle.siri_female_en-US_compact"
                : "en-us-x-tpc-network",
            language: "en-US",
            pitch: 1.0,
            rate: 1,
            volume: 1.0,
          });
        } catch (error) {
          console.error(
            "VOICE_DEBUG: Error playing meal selector voice:",
            error,
          );
        }
        setShowMealSelector(true);
        // No welcome message, user will see meal selector directly
      } else {
        // For other sources, show the normal welcome message
        const welcomeText = config.welcomeMessage.replace(
          "{userName}",
          userName?.split(" ")[0] || "friend",
        );
        setMessages([
          {
            id: Date.now(),
            text: welcomeText,
            isUser: false,
            timestamp: new Date(),
            isComplete: true,
          },
        ]);

        // Speak welcome message with AI voice
        const spokenWelcome = `Welcome ${
          userName?.split(" ")[0] || "friend"
        }!. How can I help you today?`;
        Speech.speak(spokenWelcome, {
          voice:
            Platform.OS === "ios"
              ? "com.apple.ttsbundle.siri_female_en-US_compact"
              : "en-us-x-tpc-network",
          language: "en-US",
          pitch: 1.0,
          rate: 1,
          volume: 1.0,
        });
      }
    }

    configureAudioMode();
    requestAudioPermissions();

    return () => {
      safeCloseSSE();
      stopRecording();
      closeBot();
      // Stop any ongoing speech on unmount
      Speech.stop();
      if (durationInterval.current) clearInterval(durationInterval.current);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [clientId]); // Depend on clientId being available

  const configureAudioMode = async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        ...(Platform.OS === "ios" && {
          staysActiveInBackground: false,
          interruptionMode: "mixWithOthers",
        }),
      });
    } catch (err) {
      console.error("Audio config error:", err);
    }
  };

  const requestAudioPermissions = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setHasAudioPermission(granted);
      if (granted) await configureAudioMode();
    } catch (err) {
      console.error("Permission error:", err);
    }
  };

  /* ─────────────────── SSE helpers ─────────────────── */
  const safeCloseSSE = () => {
    try {
      esRef.current?.close();
      esRef.current = null;
    } catch {}
  };

  const closeBot = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        return;
      }

      const payload = {
        user_id: clientId,
      };

      const response = await closeChatbotAPI(payload);

      if (response?.status === 200) {
        // You can add success handling here if needed
      } else {
        console.error("Failed to Unmount");
      }
    } catch (error) {
      console.error("Error saving food log:", error);
    }
  };

  /* ─────────────────── Food Logging API ─────────────────── */
  const saveFoodLog = async (foodData) => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      const gymId = await AsyncStorage.getItem("gym_id");

      if (!clientId || !gymId) {
        console.error("Missing client_id or gym_id");
        return;
      }

      const today = new Date();
      const todaySQL = today.toISOString().split("T")[0]; // YYYY-MM-DD format
      const currentTime = today.toTimeString().slice(0, 5); // HH:MM format

      const newFoods = foodData.items.map((food) => {
        const quantity = parseInt(food.quantity) || 1;
        return {
          id: `${food.food}-${Date.now()}-${Math.random()}`,
          food: food.food,
          quantity,
          unit: food.unit,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          timeAdded: currentTime,
        };
      });

      const payload = {
        client_id: clientId,
        date: todaySQL,
        diet_data: newFoods,
        gym_id: gymId,
        type: "chatbot",
      };

      const response = await addClientDietAIAPI(payload);

      if (response?.status === 200) {
      } else {
        console.error("Failed to log food");
      }

      return response;
    } catch (error) {
      console.error("Error saving food log:", error);
    }
  };

  /* ─────────────────── animations ─────────────────── */
  const startThinkingAnimation = () => {
    setIsThinking(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(thinkingAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };
  const stopThinkingAnimation = () => {
    setIsThinking(false);
    thinkingAnim.stopAnimation();
    Animated.timing(thinkingAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };
  const startTypingAnimation = () => {
    // Stop any existing animation first
    if (typingAnimationRef.current) {
      typingAnimationRef.current.stop();
      typingAnimationRef.current = null;
    }

    setIsTyping(true);
    // Reset animation value to 0 before starting
    typingAnim.setValue(0);

    // Store the animation reference so we can stop it later
    typingAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    typingAnimationRef.current.start();
  };
  const stopTypingAnimation = () => {
    // Stop the animation loop if it's running
    if (typingAnimationRef.current) {
      typingAnimationRef.current.stop();
      typingAnimationRef.current = null;
    }

    setIsTyping(false);
    typingAnim.stopAnimation();
    typingAnim.setValue(0); // Reset to initial state
  };
  const startRecordingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(recordingAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(recordingAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };
  const stopRecordingAnimation = () => {
    recordingAnim.stopAnimation();
    Animated.timing(recordingAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  /* ─────────────────── Voice recording helpers ─────────────────── */
  const attemptRecordingWithRetry = async () => {
    try {
      // Re-configure audio mode before recording (especially important for iOS)
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        ...(Platform.OS === "ios" && {
          staysActiveInBackground: false,
          interruptionMode: "mixWithOthers",
        }),
      });

      // Give iOS time to finalize AVAudioSession state
      if (Platform.OS === "ios") {
        await wait(500);
      }

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();

      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(recordingAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
      Vibration.vibrate(50);
    } catch (err) {
      console.error("First recording attempt failed:", err);

      // Retry once for iOS (common issue with audio session)
      if (Platform.OS === "ios") {
        await wait(500);
        try {
          // Reset the recorder state before retry
          if (recorderState.isRecording) {
            try {
              await audioRecorder.stop();
            } catch (stopErr) {
              console.warn("Failed to stop recorder before retry:", stopErr);
            }
          }
          await audioRecorder.prepareToRecordAsync();
          await audioRecorder.record();
        } catch (retryErr) {
          console.error("Recording retry failed:", retryErr);
          throw retryErr;
        }
      } else {
        throw err;
      }
    }
  };

  const startRecording = async () => {
    if (isTyping || isThinking || recorderState.isRecording) return;
    if (!hasAudioPermission) {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission Required", "Enable microphone permission.", [
          { text: "OK" },
        ]);
        return;
      }
      setHasAudioPermission(true);
    }
    try {
      await attemptRecordingWithRetry();
    } catch (e) {
      Alert.alert(
        "Recording Error",
        "Could not start audio recording. Please try again.",
      );
    }
  };

  const stopRecording = async () => {
    try {
      if (!recorderState.isRecording) {
        console.warn("Attempted to stop recording when not recording");
        return;
      }

      // Stop recording animation first
      recordingAnim.stopAnimation();

      const result = await audioRecorder.stop();

      // Extract the URL from the result object
      let uri = null;

      // IMPORTANT: On Android, result.url might be a relative path without file://
      // but audioRecorder.uri has the proper file:// URI, so prefer that first
      if (audioRecorder.uri && typeof audioRecorder.uri === "string") {
        // Prefer the recorder's uri property (has proper file:// prefix)
        uri = audioRecorder.uri;
      } else if (typeof result === "string") {
        // Sometimes the result is the URI string directly
        uri = result;
      } else if (result?.uri) {
        uri = result.uri;
      } else if (result?.url) {
        // Android might return relative path here, add file:// if missing
        uri = result.url;
        if (
          uri &&
          !uri.startsWith("file://") &&
          !uri.startsWith("content://")
        ) {
          uri = `file://${uri}`;
        }
      }

      if (uri && typeof uri === "string") {
        await sendVoiceMessage(uri);
      } else {
        throw new Error(
          `No valid recording URI found. Result: ${JSON.stringify(result)}`,
        );
      }

      setRecordingDuration(0);
    } catch (err) {
      console.error("Failed to stop recording", err);

      // Try to get the URI even if stop failed
      let uri = null;

      try {
        const recUri = audioRecorder.uri;

        if (typeof recUri === "string") {
          uri = recUri;
        } else if (recUri?.uri) {
          uri = recUri.uri;
        } else if (recUri?.url) {
          uri = recUri.url;
        }
      } catch (uriErr) {
        console.error("Failed to get fallback URI:", uriErr);
      }

      if (uri && typeof uri === "string") {
        try {
          await sendVoiceMessage(uri);
        } catch (voiceErr) {
          console.error("Failed to send voice message", voiceErr);
        }
      } else {
        // Reset state and show error
        setRecordingDuration(0);
        recordingAnim.stopAnimation();

        Alert.alert(
          "Recording Error",
          "Recording stopped but could not find the audio file. Please try again.",
        );
        return;
      }

      // Reset state
      setRecordingDuration(0);
    }
  };

  const cancelRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      recordingAnim.stopAnimation();
      await audioRecorder.stop();
      setRecordingDuration(0);
      Vibration.vibrate([50, 50, 50]);
    } catch (err) {
      console.error("Cancel recording error:", err);
      setRecordingDuration(0);
      recordingAnim.stopAnimation();
    }
  };

  /* ─────────────────── Voice → text → SSE  (original flow) ─────────────────── */
  const sendVoiceMessage = async (audioUri) => {
    if (isTyping || isThinking) return;

    const voiceId = Date.now();

    // placeholder bubble
    setMessages((prev) => [
      ...prev,
      {
        id: voiceId,
        text: "Voice message",
        isUser: true,
        timestamp: new Date(),
        isComplete: true,
        isVoice: true,
        duration: recordingDuration,
      },
    ]);
    setRecordingDuration(0);
    startThinkingAnimation();

    try {
      const transcript = await chatbotAPI.transcribeVoice(audioUri, clientId);
      if (!transcript) throw new Error("Empty transcript");

      // swap bubble text with transcript for better UX
      setMessages((prev) =>
        prev.map((m) =>
          m.id === voiceId ? { ...m, text: "Voice Message" } : m,
        ),
      );

      // stream the response
      await sendStreamingMessage(transcript);
    } catch (err) {
      console.error("Voice error:", err);
      stopThinkingAnimation();
      stopTypingAnimation();
      safeCloseSSE();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Sorry, I'm having trouble processing your voice message. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
      ]);
    }
  };

  /* ─────────────────── Handle special SSE JSON events ─────────────────── */
  const handleSpecialEvent = async (obj) => {
    // Play message received sound for JSON events (food log, workout log, etc.)
    // This is the "UISFX receive sound" - plays when AI responds with JSON
    // Note: playMessageReceivedSound now automatically stops typing sound
    playMessageReceivedSound();

    // Stop animations
    stopThinkingAnimation();
    stopTypingAnimation();
    setCurrentMessageId(null);

    // Check if this is a meal plan complete event (food template)
    if (obj.type === "meal_plan_complete" && obj.is_save === true) {
      // Store meal plan data
      setMealPlanData(obj);
      // Show Save and Modify buttons
      setShowMealPlanButtons(true);

      // Add voice feedback for template creation
      try {
        const voiceMessage = "Here is your diet template.";
        Speech.speak(voiceMessage, {
          voice:
            Platform.OS === "ios"
              ? "com.apple.ttsbundle.siri_female_en-US_compact"
              : "en-us-x-tpc-network",
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0,
        });
      } catch (error) {
        console.error("Voice feedback error:", error);
      }

      return; // Exit early, buttons will be shown
    }

    // Check if this is a workout template complete event (workout template)
    if (
      obj.type === "workout_template" &&
      obj.status === "complete" &&
      obj.is_save === true
    ) {
      // Store workout plan data
      setMealPlanData(obj);
      // Show Save and Modify buttons
      setShowMealPlanButtons(true);

      // Add voice feedback for workout template creation
      try {
        const voiceMessage = "Here is your workout plan";
        Speech.speak(voiceMessage, {
          voice:
            Platform.OS === "ios"
              ? "com.apple.ttsbundle.siri_female_en-US_compact"
              : "en-us-x-tpc-network",
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0,
        });
      } catch (error) {
        console.error("Voice feedback error:", error);
      }

      return; // Exit early, buttons will be shown
    }

    // Check if this is a template save navigation event (is_nav: True)
    if (
      obj.is_nav === true &&
      (obj.type === "meal_template" ||
        obj.type === "meal_plan_final" ||
        obj.type === "workout_template")
    ) {
      // Add the success message first
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: obj.message || "Meal plan saved successfully!",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
        },
      ]);

      // Add voice feedback for meal template saved
      if (obj.type === "meal_template" || obj.type === "meal_plan_final") {
        try {
          const voiceMessage = "Your diet plan saved";
          Speech.speak(voiceMessage, {
            voice:
              Platform.OS === "ios"
                ? "com.apple.ttsbundle.siri_female_en-US_compact"
                : "en-us-x-tpc-network",
            language: "en-US",
            pitch: 1.0,
            rate: 1.0,
            volume: 1.0,
          });
        } catch (error) {
          console.error("Voice feedback error:", error);
        }
      }

      // Add voice feedback for workout template saved
      if (obj.type === "workout_template") {
        try {
          const voiceMessage = "Workout plan saved";
          Speech.speak(voiceMessage, {
            voice:
              Platform.OS === "ios"
                ? "com.apple.ttsbundle.siri_female_en-US_compact"
                : "en-us-x-tpc-network",
            language: "en-US",
            pitch: 1.0,
            rate: 1.0,
            volume: 1.0,
          });
        } catch (error) {
          console.error("Voice feedback error:", error);
        }
      }

      // Show the template navigation modal
      setTemplateSaveMessage(obj.message || "Meal plan saved successfully!");
      setShowTemplateNavigationModal(true);
      return; // Exit early
    }

    // Check if this is a food log entry that needs to be saved
    if (obj.is_log === true && obj.type === "food_log" && obj.entry) {
      await saveFoodLog(obj.entry);
    }

    // Report analysis voice feedback removed - no voice for report analysis

    // Check if this is a navigation event
    if (obj.is_navigation === true) {
      // Add the message first
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: obj.ask || obj.prompt || obj.message || "What's on your mind",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          special: obj.type,
          meta: obj,
        },
      ]);

      // Determine navigation target based on prompt content and context
      setTimeout(() => {
        const navigationPrompt = obj.prompt || obj.message || "";

        const isWorkoutRelated =
          navigationPrompt.toLowerCase().includes("workout") ||
          navigationPrompt.toLowerCase().includes("exercise") ||
          (workoutData && navigationPrompt.toLowerCase().includes("logs"));

        // Route to appropriate destination
        if (isWorkoutRelated) {
          // Navigate directly to workout reports component with parameters

          const navigationParams = {
            profilePic: profileImage || "",
            userName: userName || "",
            // Additional parameters will be fetched from AsyncStorage in route wrapper
            gender: "", // Will be fetched in route wrapper
            plan: "", // Will be fetched in route wrapper
            badge: "", // Will be fetched in route wrapper
            xp: "0", // Will be fetched in route wrapper
          };

          router.push({
            pathname: "/client/(tabs)/workout",
            params: { tab: "Reports", ...navigationParams },
          });
        } else {
          router.push("/client/myListedFoodLogs");
        }
      }, 1000); // 1 second delay to let user see the message

      return; // Exit early since we've already added the message
    }

    // Check if food was successfully logged (status: "logged")
    if (obj.status === "logged" && obj.type === "food_log") {
      // Add the message first
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: obj.message || "Food logged successfully!",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          special: obj.type,
          meta: obj,
        },
      ]);

      // Check if reward_point exists and is greater than 0
      if (obj.reward_point && obj.reward_point > 0) {
        setXpAmount(obj.reward_point);
        setXpRewardVisible(true);
      }

      // Show navigation modal
      setLoggedMessage(obj.message || "Food logged successfully!");
      setShowNavigationModal(true);

      // Add voice feedback for food logging success
      try {
        const voiceMessage = "Food logged successfully!";
        Speech.speak(voiceMessage, {
          voice:
            Platform.OS === "ios"
              ? "com.apple.ttsbundle.siri_female_en-US_compact"
              : "en-us-x-tpc-network",
          language: "en-US",
          pitch: 1.0,
          rate: 1,
          volume: 1.0,
        });
      } catch (error) {
        console.error("Voice feedback error:", error);
      }

      return; // Exit early since we've already added the message
    }

    // Check if workout was successfully logged (status: "logged" and type: "workout_logged")
    if (obj.status === "logged" && obj.type === "workout_logged") {
      // Add the message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: obj.message || "Workout logged successfully!",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          special: obj.type,
          meta: obj,
        },
      ]);

      // Check for workout completion rewards (XP, achievements)
      if (obj.reward_point && obj.reward_point > 0) {
        setXpAmount(obj.reward_point);
        setXpRewardVisible(true);
      }

      // Show workout navigation modal
      setWorkoutLoggedMessage(obj.message || "Workout logged successfully!");
      setWorkoutData(obj); // Store workout data for modal access
      setShowWorkoutNavigationModal(true);

      // Add workout completion voice feedback
      try {
        const voiceMessage = "Great job! Workout logged successfully";

        Speech.speak(voiceMessage, {
          voice:
            Platform.OS === "ios"
              ? "com.apple.ttsbundle.siri_female_en-US_compact"
              : "en-us-x-tpc-network",
          language: "en-US",
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0,
        });
      } catch (error) {}

      return; // Exit early since we've handled the modal
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: obj.ask || obj.prompt || obj.message || "What's on your mind",
        isUser: false,
        timestamp: new Date(),
        isComplete: true,
        special: obj.type,
        meta: obj,
      },
    ]);
  };

  /* ─────────────────── TEXT MESSAGE (SSE) ─────────────────── */
  const sendMessage = async () => {
    // Play sent sound IMMEDIATELY when send button is pressed
    // This ensures sound plays before any async operations
    playMessageSentSound();

    const txt = inputText.trim();
    if (!txt || isTyping || isThinking || isRecording) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: txt,
        isUser: true,
        timestamp: new Date(),
        isComplete: true,
      },
    ]);
    setInputText("");
    startThinkingAnimation();

    try {
      await sendStreamingMessage(txt);
    } catch (err) {
      console.error("SSE error:", err);
      stopThinkingAnimation();
      stopTypingAnimation();
      safeCloseSSE();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Sorry, I'm having trouble connecting right now.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
      ]);
    }
  };

  const sendStreamingMessageWithConfig = async (messageText, config) => {
    // Start typing sound loop after a short delay
    // Note: sent sound is already played in sendMessage() when button is pressed
    setTimeout(() => {
      playTypingSound();
    }, 200);

    stopThinkingAnimation();
    startTypingAnimation();
    const aiId = Date.now();
    setCurrentMessageId(aiId);

    setMessages((prev) => [
      ...prev,
      {
        id: aiId,
        text: " ",
        textChunks: [],
        isUser: false,
        timestamp: new Date(),
        isComplete: false,
        isStreaming: true,
      },
    ]);

    safeCloseSSE();

    // Define handlers before try-catch
    const finalize = () => {
      // Stop typing sound when connection finalizes
      stopTypingSound();

      // Remove any remaining loaders
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoader);
        return filtered.map((m) =>
          m.id === aiId ? { ...m, isComplete: true, isStreaming: false } : m,
        );
      });
      stopTypingAnimation();
      setCurrentMessageId(null);
      safeCloseSSE();
    };

    // Track if we've played the receive sound for this message
    // Using closure variable instead of useRef (cannot use hooks inside functions)
    let hasPlayedReceiveSound = false;

    const handleMessage = (event) => {
      const payload = (event?.data || "").trim();

      if (!payload) {
        return;
      }

      // Handle JSON events (welcome, cuisine, etc.)
      if (payload.startsWith("{") && payload.endsWith("}")) {
        try {
          const jsonObj = JSON.parse(payload);

          // Handle all special events (welcome, cuisine, etc.)
          handleSpecialEvent(jsonObj);
          return;
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }

      // Handle plain text content (streaming meal plan)

      // Check if this is a loader message
      if (payload.startsWith("⏳ Generating")) {
        const loaderId = `loader_${Date.now()}`;

        // Remove any existing loaders first
        setMessages((prev) => prev.filter((m) => !m.isLoader));

        // Add new loader
        setMessages((prev) => [
          ...prev,
          {
            id: loaderId,
            text: payload.trim(),
            isUser: false,
            timestamp: new Date(),
            isComplete: false,
            isLoader: true,
          },
        ]);

        // Start typing animation for loader
        startTypingAnimation();
        return;
      }

      // Check if this is a remove loader signal
      if (payload.startsWith("🗑️REMOVE_LOADER_")) {
        setMessages((prev) => prev.filter((m) => !m.isLoader));
        stopTypingAnimation();
        return;
      }

      // Play message received sound on FIRST text chunk only
      // This is the "UISFX receive sound" - plays when AI starts responding
      if (!hasPlayedReceiveSound && !payload.startsWith("event:")) {
        hasPlayedReceiveSound = true;
        // playMessageReceivedSound now automatically stops typing sound
        playMessageReceivedSound();
      }

      setMessages((prev) => {
        return prev.map((m) => {
          if (m.id === aiId) {
            return {
              ...m,
              text: m.text + payload + "\n",
              isStreaming: true,
            };
          }
          return m;
        });
      });

      // Auto-scroll if near bottom
      if (isNearBottom.current) {
        isScrollingProgrammatically.current = true;
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          setTimeout(() => {
            isScrollingProgrammatically.current = false;
          }, 300);
        }, 30);
      }
    };

    // Store the message handler globally so openSSE can access it
    const messageCallback = (event) => {
      handleMessage(event);
    };

    try {
      // Step 1: Verify token and refresh if needed (like axiosInstance)
      const token = await chatbotAPI.getValidToken();

      if (!token) {
        throw new Error("Failed to get valid token");
      }

      // Step 2: Open SSE connection with verified token
      const es = await chatbotAPI.openSSE({
        user_id: clientId,
        text: messageText,
        endpoint: config.endpoint,
        onMessage: messageCallback,
        token: token,
      });
      esRef.current = es;

      // Add connection logging
      const fullUrl = `${config.endpoint}&text=${encodeURIComponent(
        messageText,
      )}`;

      // Check if open event is supported
      if (typeof es.addEventListener === "function") {
        es.addEventListener("open", () => {});
      }

      // React Native SSE might handle errors differently
      es.onerror = (error) => {
        console.error("❌ EventSource error:", error);

        if (es.readyState !== undefined) {
        }
      };

      // Add the message handler
      es.addEventListener("message", handleMessage);

      es.addEventListener("done", finalize);
      es.addEventListener("error", () => {
        finalize();
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "Connection dropped. If the message looks incomplete, please ask again.",
            isUser: false,
            timestamp: new Date(),
            isComplete: true,
            isError: true,
          },
        ]);
      });
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      // Stop typing sound on error
      stopTypingSound();
      stopTypingAnimation();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "Authentication failed. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
      ]);
    }
  };

  const sendStreamingMessage = async (messageText) => {
    // Always use currentConfig to ensure we have the latest config with proper parameters
    const config = currentConfig;
    if (!config || !config.endpoint) {
      console.error("Config not initialized properly", config);
      return;
    }
    await sendStreamingMessageWithConfig(messageText, config);
  };

  /* ─────────────────── helpers ─────────────────── */
  const formatDuration = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  /* ─────────────────── Meal Plan Handlers (Save & Modify) ─────────────────── */
  const handleSaveMealPlan = async () => {
    try {
      // Hide buttons immediately
      setShowMealPlanButtons(false);

      // Send "save" message to trigger backend save flow
      await sendStreamingMessage("save");

      // Clear meal plan data
      setMealPlanData(null);
    } catch (error) {
      console.error("Error saving plan:", error);
      Alert.alert("Error", "Failed to save. Please try again.");
      setShowMealPlanButtons(true); // Show buttons again on error
    }
  };

  const handleModifyMealPlan = async () => {
    try {
      // Hide buttons
      setShowMealPlanButtons(false);

      // Send a message to enter modify flow (existing modify flow)
      await sendStreamingMessage("modify");

      // Clear meal plan data
      setMealPlanData(null);
    } catch (error) {
      console.error("Error modifying plan:", error);
      Alert.alert("Error", "Failed to start modification. Please try again.");
      setShowMealPlanButtons(true); // Show buttons again on error
    }
  };

  /* ─────────────────── Meal Selection Handler ─────────────────── */
  const handleMealSelection = (mealTitle) => {
    const mealParam = JSON.stringify(mealTitle);

    // Update the config with the selected meal
    const newConfig = getSourceConfig("foodlog", clientId, mealParam);
    setCurrentConfig(newConfig);

    // Update URL params
    router.setParams({
      source: "foodlog",
      selectedMeal: mealParam,
    });

    // Hide meal selector
    setShowMealSelector(false);

    // Add a confirmation message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: `Great! Let's log your food for ${mealTitle}. Tell me what you ate!`,
        isUser: false,
        timestamp: new Date(),
        isComplete: true,
      },
    ]);
  };
  /* ─────────────────── Radio Button Handlers ─────────────────── */
  const handleChatbotSwitch = async (newSource) => {
    // Don't switch if already on this chatbot
    if (newSource === source) return;

    // Close current SSE connection
    safeCloseSSE();

    // Stop any ongoing animations
    stopThinkingAnimation();
    stopTypingAnimation();
    stopRecordingAnimation();

    // Clear recording if active
    if (isRecording) {
      await cancelRecording();
    }

    // **CRITICAL FIX**: Clear backend conversation state (Redis history and pending state)
    // This ensures the new chatbot starts with a fresh context
    try {
      if (clientId) {
        const payload = { user_id: clientId };
        await closeChatbotAPI(payload);
      }
    } catch (error) {
      console.error("Error clearing chatbot context:", error);
    }

    // Reset welcome message flag so new chatbot shows welcome message
    welcomeMessageSet.current = false;

    // Clear current messages
    setMessages([]);
    setInputText("");
    setIsTyping(false);
    setIsThinking(false);
    setCurrentMessageId(null);
    setShowMealPlanButtons(false); // Hide save/modify buttons when switching tabs

    // Update the source config
    const newConfig = getSourceConfig(newSource, clientId, null);
    setCurrentConfig(newConfig);

    // Update the URL params without navigating away
    router.setParams({
      source: newSource,
      selectedMeal: null,
    });

    if (newSource === "dietTemplate") {
      // For dietTemplate, automatically start the flow with the new config
      setTimeout(() => {
        sendStreamingMessageWithConfig("start", newConfig);
      }, 300);
    } else if (newSource === "foodlog") {
      // For foodlog, just show meal selector without welcome message
      setTimeout(() => {
        // Add voice for meal selection
        try {
          Speech.speak("Select your meal slot", {
            voice:
              Platform.OS === "ios"
                ? "com.apple.ttsbundle.siri_female_en-US_compact"
                : "en-us-x-tpc-network",
            language: "en-US",
            pitch: 1.0,
            rate: 1,
            volume: 1.0,
          });
        } catch (error) {
          console.error(
            "VOICE_DEBUG: Error playing meal selector voice:",
            error,
          );
        }
        setShowMealSelector(true);
      }, 300);
    } else {
      // For other sources, show welcome message
      const welcomeText = newConfig.welcomeMessage.replace(
        "{userName}",
        userName?.split(" ")[0] || "friend",
      );
      setMessages([
        {
          id: Date.now(),
          text: welcomeText,
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
        },
      ]);
    }
  };

  // Animation effect for radio buttons - Always visible
  useEffect(() => {
    // Always keep tabs expanded
    Animated.timing(radioButtonAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, []);

  /* ─────────────────── Scroll Handler ─────────────────── */
  const handleScroll = (event) => {
    // Ignore programmatic scrolls
    if (isScrollingProgrammatically.current) {
      return;
    }

    const currentScrollY = event.nativeEvent.contentOffset.y;
    const { contentSize, layoutMeasurement } = event.nativeEvent;

    // Calculate if user is near the bottom (within 150px of bottom)
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - currentScrollY;
    const nearBottom = distanceFromBottom < 150;
    isNearBottom.current = nearBottom;
    isAtBottom.current = distanceFromBottom < 20; // Very close to bottom

    scrollY.current = currentScrollY;
  };

  /* ─────────────────── AI Policy Compliance Handlers ─────────────────── */

  // Handle Report Message
  const handleReportMessage = (message) => {
    setReportingMessage(message);
    setReportModalVisible(true);
  };

  // Submit Report
  const submitReport = async (reason) => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        Alert.alert("Error", "Failed to submit report. Please try again.");
        return;
      }

      const payload = {
        client_id: clientId,
        message: reportingMessage?.text || "",
        template: reason,
      };

      const response = await reportKyraAPI(payload);

      if (response?.status === 200) {
        Alert.alert(
          "Thank you",
          "Your report has been submitted. Our team will review it shortly.",
          [{ text: "OK" }],
        );
        setReportModalVisible(false);
        setReportingMessage(null);
      } else {
        Alert.alert(
          "Error",
          response?.message || "Failed to submit report. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    }
  };

  // Check AI Consent on mount
  useEffect(() => {
    checkAIConsent();
  }, []);

  const checkAIConsent = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        console.error("Client ID not found");
        return;
      }

      const response = await getAIConsentAPI(clientId);
      if (response?.status === 200 && response?.consent) {
        setAiConsentGiven(true);
      } else {
        setTimeout(() => setShowAIConsentModal(true), 1000);
      }
    } catch (error) {
      console.error("Error checking AI consent:", error);
    }
  };

  const handleAIConsentAccept = async () => {
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        console.error("Client ID not found");
        return;
      }
      const payload = {
        client_id: clientId,
      };

      const response = await postAIConsentAPI(payload);

      if (response?.status === 200) {
        setAiConsentGiven(true);
        setShowAIConsentModal(false);
      } else {
        Alert.alert("Error", "Failed to save consent. Please try again.");
      }
    } catch (error) {
      console.error("Error saving AI consent:", error);
      Alert.alert("Error", "Failed to save consent. Please try again.");
    }
  };

  const handleAIConsentDecline = () => {
    setShowAIConsentModal(false);
    Alert.alert(
      "AI Feature Required",
      "This feature requires AI assistance. You will be returned to the previous screen.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ],
    );
  };

  /* ─────────────────── Scroll Active Tab to Center ─────────────────── */
  const scrollToActiveTab = (activeId) => {
    const chatbots = TAB_CONFIG;

    const activeIndex = chatbots.findIndex((bot) => bot.id === activeId);
    if (activeIndex === -1 || !radioButtonScrollRef.current) return;

    // Update active tab label for header
    const activeTab = chatbots.find((bot) => bot.id === activeId);
    if (activeTab) {
      setActiveTabLabel(activeTab.label);
    }

    // Calculate the position to center the active tab
    const buttonWidth = 100; // Approximate width of each button
    const buttonSpacing = 8; // Margin between buttons
    const totalButtonWidth = buttonWidth + buttonSpacing;
    const scrollPosition =
      activeIndex * totalButtonWidth - width / 2 + buttonWidth / 2;

    radioButtonScrollRef.current.scrollTo({
      x: Math.max(0, scrollPosition),
      animated: true,
    });
  };

  /* ─────────────────── Radio Button Renderer ─────────────────── */
  const renderRadioButtons = () => {
    const chatbots = TAB_CONFIG;

    return (
      <View
        style={{
          height: 52,
          overflow: "hidden",
        }}
      >
        <View style={styles.radioButtonContainer}>
          <ScrollView
            ref={radioButtonScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.radioButtonScrollView}
            contentContainerStyle={styles.radioButtonScrollContent}
            decelerationRate="fast"
          >
            {chatbots.map((bot) => {
              const isActive = source === bot.id;
              return (
                <TouchableOpacity
                  key={bot.id}
                  onPress={() => {
                    handleChatbotSwitch(bot.id);
                    setTimeout(() => scrollToActiveTab(bot.id), 100);
                  }}
                  activeOpacity={0.8}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={["#25ACE5", "#006FAD"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.radioButtonActive}
                    >
                      <MaterialIcons
                        name={bot.icon}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.radioButtonTextActive}>
                        {bot.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.radioButton}>
                      <MaterialIcons name={bot.icon} size={18} color="#666" />
                      <Text style={styles.radioButtonText}>{bot.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  /* thinking indicator */
  const renderThinkingIndicator = () => {
    if (!isThinking) return null;

    const config =
      currentConfig || getSourceConfig(source, clientId, selectedMeal);
    const thinkingText = config?.thinkingText || "Thinking";

    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={styles.aiAvatar}>
          <LinearGradient
            colors={["#CECECE75", "#CECECE75"]}
            style={styles.avatarGradient}
          >
            <Animated.View style={{ opacity: thinkingAnim }}>
              <Image
                source={require("../../../assets/images/kyraAI.png")}
                style={{ width: 24, height: 24 }}
              />
            </Animated.View>
          </LinearGradient>
        </View>
        <View style={[styles.messageBubble, styles.aiBubble]}>
          <LinearGradient
            colors={["#CECECE75", "#CECECE75"]}
            style={styles.aiBubbleGradient}
          >
            <View style={styles.thinkingContainer}>
              <Text style={styles.thinkingText}>{thinkingText}</Text>
              <View style={styles.dotsContainer}>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.typingDotContainer,
                      {
                        opacity: thinkingAnim,
                        transform: [
                          {
                            scale: thinkingAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#25ACE5", "#006FAD"]}
                      style={styles.typingDot}
                    />
                  </Animated.View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  /* compact typing indicator */
  const renderCompactTypingIndicator = () => {
    // Don't show compact typing indicator if there's a loader message
    const hasLoaderMessage = messages.some((m) => m.isLoader);
    if (hasLoaderMessage) return null;

    return (
      isTyping &&
      currentMessageId && (
        <View style={[styles.messageContainer, styles.aiMessageContainer]}>
          <View style={styles.aiAvatar}>
            <LinearGradient
              colors={["#CECECE75", "#CECECE75"]}
              style={styles.avatarGradient}
            >
              <Image
                source={require("../../../assets/images/kyraAI.png")}
                style={{ width: 24, height: 24 }}
              />
            </LinearGradient>
          </View>
          <View style={[styles.messageBubble, styles.compactTypingBubble]}>
            <LinearGradient
              colors={["#CECECE75", "#CECECE75"]}
              style={styles.compactTypingGradient}
            >
              <View style={styles.compactTypingContainer}>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.typingDotContainer,
                      {
                        opacity: typingAnim,
                        transform: [
                          {
                            translateY: typingAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -3],
                            }),
                          },
                          {
                            scale: typingAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={["#25ACE5", "#006FAD"]}
                      style={styles.compactTypingDot}
                    />
                  </Animated.View>
                ))}
              </View>
            </LinearGradient>
          </View>
        </View>
      )
    );
  };

  /* single chat bubble renderer - UPDATED to skip empty text messages */
  const renderMessage = ({ item }) => {
    const isStreaming = item.isStreaming && item.id === currentMessageId;
    if (isStreaming && isTyping && !item.text) return null; // handled by compact indicator only

    // Skip rendering messages with empty text (but not loaders)
    if (!item.isLoader && (!item.text || item.text.trim() === "")) return null;

    // Special rendering for loader messages with creative animation
    if (item.isLoader) {
      return (
        <View style={[styles.messageContainer, styles.aiMessageContainer]}>
          <View style={styles.aiAvatar}>
            <LinearGradient
              colors={["#CECECE75", "#CECECE75"]}
              style={styles.avatarGradient}
            >
              <Animated.View
                style={{
                  opacity: typingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                }}
              >
                <Image
                  source={require("../../../assets/images/kyraAI.png")}
                  style={{ width: 24, height: 24 }}
                />
              </Animated.View>
            </LinearGradient>
          </View>
          <View style={[styles.messageBubble, styles.loaderBubble]}>
            <View style={styles.loaderBubbleContent}>
              <View style={styles.loaderTextContainer}>
                <Text style={styles.loaderDayText}>{item.dayName}</Text>
                <View style={styles.loaderDotsRow}>
                  {[0, 1, 2].map((i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.loaderDot,
                        {
                          opacity: typingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1],
                          }),
                          transform: [
                            {
                              scale: typingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.6, 1],
                              }),
                            },
                            {
                              translateY: typingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -3],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.loaderDotInner} />
                    </Animated.View>
                  ))}
                </View>
              </View>
              <Animated.View
                style={[
                  styles.loaderProgressBar,
                  {
                    opacity: typingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ width: "100%" }}>
        <View
          style={[
            styles.messageContainer,
            item.isUser
              ? styles.userMessageContainer
              : styles.aiMessageContainer,
          ]}
        >
          {!item.isUser && (
            <View style={styles.aiAvatar}>
              <LinearGradient
                colors={["#CECECE75", "#CECECE75"]}
                style={styles.avatarGradient}
              >
                <Image
                  source={require("../../../assets/images/kyraAI.png")}
                  style={{ width: 24, height: 24 }}
                />
              </LinearGradient>
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              item.isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {item.isUser ? (
              <LinearGradient
                colors={["#006FAD", "#25ACE5"]}
                style={styles.userBubbleContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {item.isVoice && (
                  <MaterialIcons name="mic" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.userMessageText}>
                  {item.text}
                  {item.isVoice && item.duration ? (
                    <Text style={styles.durationText}>
                      {" "}
                      ({formatDuration(item.duration)})
                    </Text>
                  ) : null}
                </Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={
                  item.isError
                    ? ["#ff6b6b", "#ee5a52"]
                    : ["#CECECE75", "#CECECE75"]
                }
                style={styles.aiBubbleGradient}
              >
                <View style={styles.aiMessageContent}>
                  <Text
                    style={[
                      styles.aiMessageText,
                      item.isError && { color: "#FFF" },
                    ]}
                  >
                    {item.text.split("\n").map((line, index, array) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < array.length - 1 && "\n"}
                      </React.Fragment>
                    ))}
                  </Text>
                </View>
              </LinearGradient>
            )}
          </View>

          {/* {item.isUser && (
            <View style={styles.userAvatar}>
              {profileImage ? (
                <Image source={profileImage} style={styles.userAvatarImage} />
              ) : (
                <MaterialIcons name="person" size={20} color="#FFF" />
              )}
            </View>
          )} */}
        </View>

        {/* Report Button Below AI Message (ChatGPT Style) */}
        {!item.isUser && !item.isError && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => handleReportMessage(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="flag-outline" size={14} color="#888" />
            <Text style={styles.reportButtonText}>Report</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* recording overlay */
  const renderRecordingIndicator = () =>
    isRecording && (
      <View style={styles.recordingOverlay}>
        <View style={styles.recordingContainer}>
          <Animated.View
            style={[
              styles.recordingPulse,
              {
                opacity: recordingAnim,
                transform: [
                  {
                    scale: recordingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons name="mic" size={40} color="#FF4444" />
          </Animated.View>
          <Text style={styles.recordingText}>Recording...</Text>
          <Text style={styles.recordingDuration}>
            {formatDuration(recordingDuration)}
          </Text>
          <View style={styles.recordingActions}>
            <TouchableOpacity
              style={[styles.recordingButton, styles.cancelButton]}
              onPress={cancelRecording}
            >
              <MaterialIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.recordingButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <MaterialIcons name="stop" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* header */}
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF"]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // Stop typing sound before navigating
                stopTypingSound();
                router.push("/client/home");
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerAvatar}>
              <Image
                source={require("../../../assets/images/kyraAI.png")}
                style={{ width: 40, height: 40 }}
              />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaskedText
                  bg1="#25ACE5"
                  bg2="#006FAD"
                  text="KyraAI"
                  textStyle={styles.headerTitle}
                />
                <MaterialIcons
                  name="auto-awesome"
                  size={16}
                  color="#25ACE5"
                  style={{ marginLeft: 4, marginTop: -8 }}
                />
              </View>
              <MaskedText
                bg1="#000000"
                bg2="#000000"
                text="Your AI Personal Assistant"
                textStyle={styles.headerSubtitle}
              />
            </View>
          </View>
          <View style={styles.categoryBadge}>
            <LinearGradient
              colors={["#25ACE5", "#006FAD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryBadgeGradient}
            >
              {/* <MaterialIcons
                name={
                  TAB_CONFIG.find((t) => t.id === source)?.icon ||
                  "chat-bubble-outline"
                }
                size={14}
                color="#FFFFFF"
              /> */}
              <Text style={styles.categoryText}>{activeTabLabel}</Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

      {/* chat */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Radio Buttons */}
        {renderRadioButtons()}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            // Only auto-scroll if user is near bottom (not reading old messages)
            if (isNearBottom.current) {
              isScrollingProgrammatically.current = true;
              flatListRef.current?.scrollToEnd({ animated: true });
              // Reset flag after scroll completes
              setTimeout(() => {
                isScrollingProgrammatically.current = false;
              }, 300);
            }
          }}
          onLayout={() => {
            // Initial layout - scroll to end
            if (messages.length <= 1) {
              isScrollingProgrammatically.current = true;
              flatListRef.current?.scrollToEnd();
              setTimeout(() => {
                isScrollingProgrammatically.current = false;
              }, 300);
            }
          }}
          onScrollBeginDrag={() => {
            // User is manually scrolling
            isScrollingProgrammatically.current = false;
          }}
          onMomentumScrollEnd={() => {
            // Ensure flag is reset after momentum scroll
            setTimeout(() => {
              isScrollingProgrammatically.current = false;
            }, 100);
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <>
              {renderThinkingIndicator()}
              {renderCompactTypingIndicator()}
              {showMealPlanButtons && (
                <View style={styles.mealPlanButtonsContainer}>
                  <TouchableOpacity
                    style={styles.mealPlanButton}
                    onPress={handleSaveMealPlan}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#28A745", "#218838"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.mealPlanButtonGradient}
                    >
                      <Ionicons name="save" size={20} color="#fff" />
                      <Text style={styles.mealPlanButtonText}>Save</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mealPlanButton}
                    onPress={handleModifyMealPlan}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#25ACE5", "#006FAD"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.mealPlanButtonGradient}
                    >
                      <Ionicons name="create" size={20} color="#fff" />
                      <Text style={styles.mealPlanButtonText}>Modify</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        />
        {/* input area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                hasAudioPermission
                  ? currentConfig.placeholder || "Type or hold mic to record..."
                  : currentConfig.placeholder || "Type your message..."
              }
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              editable={!isTyping && !isThinking && !isRecording}
            />

            {/* mic */}
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonRecording,
                !hasAudioPermission && styles.voiceButtonDisabled,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTyping || isThinking}
            >
              <MaterialIcons
                name={isRecording ? "mic" : "mic-none"}
                size={20}
                color={
                  !hasAudioPermission
                    ? "#999"
                    : isRecording
                      ? "#FF4444"
                      : "#006FAD"
                }
              />
            </TouchableOpacity>

            {/* send */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                inputText.trim() && !isTyping && !isThinking && !isRecording
                  ? styles.sendButtonActive
                  : styles.sendButtonInactive,
              ]}
              onPress={sendMessage}
              disabled={
                !inputText.trim() || isTyping || isThinking || isRecording
              }
            >
              <LinearGradient
                colors={
                  inputText.trim() && !isTyping && !isThinking && !isRecording
                    ? ["#25ACE5", "#006FAD"]
                    : ["#E0E0E0", "#BDBDBD"]
                }
                style={styles.sendButtonGradient}
              >
                {isThinking || isTyping ? (
                  <ActivityIndicator
                    size="small"
                    color={inputText.trim() ? "#FFF" : "#757575"}
                  />
                ) : (
                  <MaterialIcons
                    name="send"
                    size={20}
                    color={
                      inputText.trim() && !isRecording ? "#FFF" : "#757575"
                    }
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {!hasAudioPermission && (
            <Text style={styles.permissionHint}>
              Tap the microphone icon to enable voice messages
            </Text>
          )}

          {/* AI-Generated Content Disclaimer (Policy Requirement) */}
          <View style={styles.disclaimerContainer}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#888"
            />
            <Text style={styles.disclaimerText}>
              AI-generated responses may contain errors. Always consult
              healthcare professionals for medical advice
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* recording overlay */}
      {renderRecordingIndicator()}

      {/* Meal Selector Modal */}
      <Modal
        visible={showMealSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMealSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mealSelectorContent}>
            <View style={styles.mealSelectorHeader}>
              <Text style={styles.mealSelectorTitle}>Select Meal</Text>
              <Text style={styles.mealSelectorSubtitle}>
                Choose which meal you want to log
              </Text>
            </View>

            <ScrollView
              style={styles.mealOptionsContainer}
              contentContainerStyle={styles.mealOptionsContent}
              showsVerticalScrollIndicator={false}
            >
              {[
                {
                  title: "Pre workout",
                  tagline: "Energy boost",
                  timeRange: "6:30-7:00 AM",
                },
                {
                  title: "Post workout",
                  tagline: "Recovery fuel",
                  timeRange: "7:30-8:00 AM",
                },
                {
                  title: "Early morning Detox",
                  tagline: "Early morning nutrition",
                  timeRange: "5:30-6:00 AM",
                },
                {
                  title: "Pre-Breakfast / Pre-Meal Starter",
                  tagline: "Pre-breakfast fuel",
                  timeRange: "7:00-7:30 AM",
                },
                {
                  title: "Breakfast",
                  tagline: "Start your day right",
                  timeRange: "8:30-9:30 AM",
                },
                {
                  title: "Mid-Morning snack",
                  tagline: "Healthy meal",
                  timeRange: "10:00-11:00 AM",
                },
                {
                  title: "Lunch",
                  tagline: "Nutritious midday meal",
                  timeRange: "1:00-2:00 PM",
                },
                {
                  title: "Evening snack",
                  tagline: "Healthy meal",
                  timeRange: "4:00-5:00 PM",
                },
                {
                  title: "Dinner",
                  tagline: "End your day well",
                  timeRange: "7:30-8:30 PM",
                },
                {
                  title: "Bed time",
                  tagline: "Rest well",
                  timeRange: "9:30-10:00 PM",
                },
              ].map((meal, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mealOption}
                  onPress={() => handleMealSelection(meal.title)}
                  activeOpacity={0.7}
                >
                  <View style={styles.mealOptionContent}>
                    <View style={styles.mealOptionLeft}>
                      <Text style={styles.mealOptionTitle}>{meal.title}</Text>
                      <Text style={styles.mealOptionTagline}>
                        {meal.tagline}
                      </Text>
                    </View>
                    <View style={styles.mealOptionRight}>
                      <Text style={styles.mealOptionTime}>
                        {meal.timeRange}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#25ACE5"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Navigation Modal */}
      <Modal
        visible={showNavigationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNavigationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={60} color="#28A745" />
              <Text style={styles.modalTitle}>Food Logged Successfully!</Text>
              <Text style={styles.modalMessage}>{loggedMessage}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowNavigationModal(false);
                  router.push("/client/myListedFoodLogs");
                }}
              >
                <LinearGradient
                  colors={["#007BFF", "#28A745"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="book" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>View Food Logs</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowNavigationModal(false);
                  // Show meal selector to choose meal for logging more food
                  setTimeout(() => {
                    // Add voice for meal selection
                    try {
                      Speech.speak("Select your meal slot", {
                        voice:
                          Platform.OS === "ios"
                            ? "com.apple.ttsbundle.siri_female_en-US_compact"
                            : "en-us-x-tpc-network",
                        language: "en-US",
                        pitch: 1.0,
                        rate: 1,
                        volume: 1.0,
                      });
                    } catch (error) {
                      console.error(
                        "VOICE_DEBUG: Error playing meal selector voice:",
                        error,
                      );
                    }
                    setShowMealSelector(true);
                  }, 300);
                }}
              >
                <LinearGradient
                  colors={["#28A745", "#007BFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Add More Food</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workout Success Navigation Modal */}
      <Modal
        visible={showWorkoutNavigationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWorkoutNavigationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="fitness" size={60} color="#FF6B35" />
              <Text style={styles.modalTitle}>
                Workout Logged Successfully!
              </Text>
              <Text style={styles.modalMessage}>{workoutLoggedMessage}</Text>

              {/* Workout Summary Stats */}
              {workoutData?.total_duration_minutes && (
                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStatText}>
                    Duration: {workoutData.total_duration_minutes} minutes
                  </Text>
                  {workoutData?.estimated_calories && (
                    <Text style={styles.workoutStatText}>
                      Calories: ~{workoutData.estimated_calories} burned
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              {/* View Workout Logs Button */}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowWorkoutNavigationModal(false);
                  router.push({
                    pathname: "/client/(tabs)/workout",
                    params: { tab: "Reports" },
                  });
                }}
              >
                <LinearGradient
                  colors={["#FF6B35", "#F7931E"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="bar-chart" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>View Workout Logs</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Log More Workouts Button */}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowWorkoutNavigationModal(false);
                  // User stays on chatbot page, ready to log another workout
                }}
              >
                <LinearGradient
                  colors={["#28A745", "#20C997"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Log More Workouts</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Template Navigation Modal */}
      <Modal
        visible={showTemplateNavigationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTemplateNavigationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={60} color="#28A745" />
              <Text style={styles.modalTitle}>
                {source === "workoutTemplate"
                  ? "Workout Plan Saved!"
                  : "Meal Plan Saved!"}
              </Text>
              <Text style={styles.modalMessage}>{templateSaveMessage}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowTemplateNavigationModal(false);
                  // Navigate based on source (dietTemplate or workoutTemplate)
                  if (source === "workoutTemplate") {
                    router.push({
                      pathname: "/client/(workout)/personalTemplate",
                      params: {
                        method: "personal",
                      },
                    });
                  } else {
                    router.push({
                      pathname: "/client/(diet)/personalTemplate",
                      params: {
                        method: "personal",
                      },
                    });
                  }
                }}
              >
                <LinearGradient
                  colors={["#25ACE5", "#006FAD"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="calendar" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>See Saved Template</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  setShowTemplateNavigationModal(false);
                  // Clear the conversation and start fresh
                  try {
                    if (clientId) {
                      const payload = { user_id: clientId };
                      await closeChatbotAPI(payload);
                    }
                  } catch (error) {
                    console.error("Error clearing chatbot context:", error);
                  }

                  // Clear messages and restart the flow
                  setMessages([]);
                  welcomeMessageSet.current = false;

                  // Restart diet template flow
                  setTimeout(() => {
                    sendStreamingMessage("start");
                  }, 300);
                }}
              >
                <LinearGradient
                  colors={["#28A745", "#218838"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Create Again</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Consent Modal (Apple App Store Requirement) */}
      <Modal
        visible={showAIConsentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { maxWidth: 380, maxHeight: "85%" }]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>AI-Powered Feature</Text>
                <Text
                  style={[
                    styles.modalMessage,
                    { textAlign: "left", marginTop: 10 },
                  ]}
                >
                  This feature uses AI technology to provide personalized
                  fitness and nutrition advice.
                  {"\n\n"}
                  <Text style={{ fontWeight: "600" }}>Data Sharing:</Text>
                  {"\n"}Your messages, fitness data, and health information will
                  be processed by our AI service provider to generate
                  personalized responses.
                  {"\n\n"}
                  <Text style={{ fontWeight: "600" }}>Important:</Text>
                  {"\n"}• AI responses may contain errors
                  {"\n"}• Always consult healthcare professionals for medical
                  advice, diagnosis, or treatment.
                  {"\n"}• You can report inappropriate content at any time
                  {"\n\n"}
                  Do you consent to using this AI-powered feature?
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton]}
                  onPress={handleAIConsentAccept}
                >
                  <LinearGradient
                    colors={["#25ACE5", "#006FAD"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>I Accept</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleAIConsentDecline}
                >
                  <View
                    style={[
                      styles.modalButtonGradient,
                      { backgroundColor: "#888" },
                    ]}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Decline</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Content Modal (Google Play Requirement) */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="flag" size={50} color="#FF6B6B" />
              <Text style={styles.modalTitle}>Report AI Content</Text>
              <Text style={styles.modalMessage}>
                Help us improve by reporting inappropriate or concerning
                content.
              </Text>
            </View>

            <ScrollView style={{ maxHeight: 300, width: "100%" }}>
              <Text style={styles.reportSectionTitle}>Select a reason:</Text>
              {[
                {
                  id: "inappropriate",
                  label: "Inappropriate content",
                  icon: "alert-circle",
                },
                {
                  id: "harmful",
                  label: "Harmful or dangerous information",
                  icon: "warning",
                },
                {
                  id: "inaccurate",
                  label: "Inaccurate information",
                  icon: "information-circle",
                },
                {
                  id: "offensive",
                  label: "Offensive language",
                  icon: "hand-left",
                },
                {
                  id: "privacy",
                  label: "Privacy concern",
                  icon: "lock-closed",
                },
                { id: "other", label: "Other", icon: "ellipsis-horizontal" },
              ].map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={styles.reportReasonButton}
                  onPress={() => submitReport(reason.label)}
                >
                  <Ionicons name={reason.icon} size={20} color="#006FAD" />
                  <Text style={styles.reportReasonText}>{reason.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#CCC" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setReportModalVisible(false)}
              >
                <View
                  style={[
                    styles.modalButtonGradient,
                    { backgroundColor: "#888" },
                  ]}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ─────────────────── STYLES ─────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#4E4E4E" },
  headerSubtitle: { fontSize: 12, color: "rgba(78,78,78,0.6)" },
  categoryBadge: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#25ACE5",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  categoryText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  chatContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  messagesList: { flex: 1, paddingHorizontal: 16 },
  messagesContent: { paddingTop: 20, paddingBottom: 10 },
  messageContainer: { marginVertical: 4, maxWidth: width * 0.8 },
  userMessageContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    flexDirection: "row",
  },
  aiMessageContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    flexDirection: "row",
  },
  aiAvatar: { marginRight: 8, marginTop: 4 },
  userAvatar: {
    marginLeft: 8,
    marginBottom: 2,
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: "#006FAD",
    justifyContent: "center",
    alignItems: "center",
  },
  userAvatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  messageBubble: { marginVertical: 2 },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    overflow: "hidden",
  },
  aiBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    overflow: "hidden",
    flex: 1,
  },
  userBubbleContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  aiBubbleGradient: { paddingVertical: 12, paddingHorizontal: 16 },
  aiMessageContent: { flexDirection: "row", alignItems: "flex-end" },
  userMessageText: { fontSize: 16, color: "#FFFFFF", lineHeight: 22 },
  aiMessageText: { fontSize: 16, color: "#404040", lineHeight: 22, flex: 1 },
  durationText: { fontSize: 12, color: "#FFFFFF", fontStyle: "italic" },

  thinkingContainer: { flexDirection: "row", alignItems: "center" },
  thinkingText: { fontSize: 16, color: "#404040", marginRight: 8 },
  dotsContainer: { flexDirection: "row" },
  typingDotContainer: { marginHorizontal: 1 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFF" },

  /* compact typing */
  compactTypingBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    overflow: "hidden",
    maxWidth: 60,
  },
  compactTypingGradient: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  compactTypingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  compactTypingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#404040",
    marginHorizontal: 2,
  },

  inputContainer: {
    backgroundColor: "#FFF",
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    maxHeight: 100,
    lineHeight: 20,
    paddingBottom: 8,
  },
  permissionHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },

  /* Loader styles - Creative and lightweight */
  loaderBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(37, 172, 229, 0.15)",
    shadowColor: "#25ACE5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  loaderBubbleContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loaderTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  loaderDayText: {
    fontSize: 14,
    color: "#25ACE5",
    fontWeight: "600",
    marginRight: 6,
    letterSpacing: 0.3,
  },
  loaderDotsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loaderDot: {
    marginHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#25ACE5",
  },
  loaderProgressBar: {
    height: 2,
    backgroundColor: "rgba(37, 172, 229, 0.2)",
    borderRadius: 1,
    overflow: "hidden",
  },

  voiceButton: {
    marginLeft: 8,
    marginRight: 4,
    marginBottom: 2,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  voiceButtonRecording: { backgroundColor: "#FFE5E5" },
  voiceButtonDisabled: { backgroundColor: "#E8E8E8" },
  sendButton: { marginLeft: 4, marginBottom: 2 },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: { elevation: 4 },
  sendButtonInactive: {},

  recordingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  recordingContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    minWidth: 200,
  },
  recordingPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  recordingDuration: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF4444",
    marginBottom: 20,
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 120,
  },
  recordingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  cancelButton: { backgroundColor: "#FF6B6B" },
  stopButton: { backgroundColor: "#4CAF50" },

  /* Radio Button Styles - Compact rectangular with Kyra gradient */
  radioButtonContainer: {
    height: 52,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    overflow: "hidden",
  },
  radioButtonScrollView: {
    flexGrow: 0,
  },
  radioButtonScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    gap: 8,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    minWidth: 100,
    height: 36,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButtonActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    minWidth: 100,
    height: 36,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#25ACE5",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  radioButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  radioButtonTextActive: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  backButton: {
    marginRight: 8,
  },

  // Navigation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  modalButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Meal Selector Modal Styles
  mealSelectorContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: width * 0.9,
    maxWidth: 450,
    height: "80%",
    overflow: "hidden",
  },
  mealSelectorHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    backgroundColor: "#FAFAFA",
  },
  mealSelectorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  mealSelectorSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  mealOptionsContainer: {
    flexGrow: 1,
  },
  mealOptionsContent: {
    padding: 16,
    paddingBottom: 24,
  },
  mealOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mealOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  mealOptionLeft: {
    flex: 1,
    marginRight: 12,
  },
  mealOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mealOptionTagline: {
    fontSize: 13,
    color: "#666",
  },
  mealOptionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mealOptionTime: {
    fontSize: 12,
    color: "#25ACE5",
    fontWeight: "500",
  },

  // Meal Plan Save/Modify Buttons Styles
  mealPlanButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  mealPlanButton: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mealPlanButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  mealPlanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  workoutStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 15,
    paddingHorizontal: 20,
  },
  workoutStatText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
  },

  /* ===== AI Policy Compliance Styles ===== */

  // Disclaimer Banner (ChatGPT/Gemini style - below keyboard)
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginTop: 2,
    backgroundColor: "transparent",
  },
  disclaimerText: {
    fontSize: 10,
    color: "#888",
    marginLeft: 6,
    lineHeight: 14,
    textAlign: "center",
    flexShrink: 1,
  },

  // Report Button (below AI message - ChatGPT style)
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 40, // Align with message bubble (32px avatar + 8px margin)
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "transparent",
  },
  reportButtonText: {
    fontSize: 11,
    color: "#999",
    marginLeft: 4,
    fontWeight: "400",
  },

  // Report Modal
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginTop: 10,
    paddingHorizontal: 5,
  },
  reportReasonButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  reportReasonText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 12,
    fontWeight: "500",
  },
});

export default AIFitnessBot;
