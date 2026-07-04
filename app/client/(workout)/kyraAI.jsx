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
  Modal,
  Keyboard,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MaskedText } from "../../../components/ui/MaskedText";
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer } from "expo-audio";
import axios from "axios";
import axiosInstance from "../../../services/axiosInstance";
import * as SecureStore from "expo-secure-store";
import EventSource from "react-native-sse";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  closeChatbotAPI,
  getAIConsentAPI,
  postAIConsentAPI,
} from "../../../services/clientApi";
import { useChatSound } from "../../../hooks/useChatSound";
import apiConfig from "../../../services/apiConfig";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const API_BASE_URL = apiConfig.API_URL;

/* ─────────────────── API WRAPPER ─────────────────── */
const chatbotAPI = {
  healthCheck: async () => {
    const res = await axiosInstance.get(`/api/v2/chatbot/healthz`);
    return res?.data;
  },

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
      if (error?.response?.status === 401) {
        return false;
      }
      console.error("Token verification error:", error);
      return true;
    }
  },

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

  getValidToken: async () => {
    try {
      let token = await SecureStore.getItemAsync("access_token");
      if (!token) {
        return await chatbotAPI.refreshTokenForSSE();
      }
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

  openSSE: async ({
    text,
    endpoint = "/api/v2/chatbot/chat/stream_test",
    onMessage,
    token,
  }) => {
    const url = `${API_BASE_URL}${endpoint}&text=${encodeURIComponent(text)}`;
    const es = new EventSource(url, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      timeout: 300000,
      pollingInterval: 0,
    });

    es.onopen = () => { };
    es.onmessage = (e) => {
      if (onMessage) {
        onMessage(e);
      }
    };
    es.onerror = (e) => {
      console.error("SSE error:", e);
    };

    return es;
  },

  transcribeVoice: async (audioUri, client_id) => {
    const form = new FormData();
    const extension = Platform.OS === "ios" ? "m4a" : "mp4";
    const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";

    form.append("audio", {
      uri: audioUri,
      type: mimeType,
      name: `recording.${extension}`,
    });

    const token = await chatbotAPI.getValidToken();
    if (!token) {
      throw new Error("Failed to get valid token for transcription");
    }

    const res = await fetch(
      `${API_BASE_URL}/api/v2/chatbot/voice/transcribe?user_id=${client_id}`,
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

    const data = await res.json();
    return data.transcript || "";
  },

  getUploadUrl: async (user_id, fileName, contentType) => {
    const res = await axiosInstance.get(`/api/v2/chatbot/chat/upload-url`, {
      params: {
        user_id,
        file_name: fileName,
        content_type: contentType,
      },
    });
    return res?.data;
  },
  fetchHistory: async (user_id, offset = 0, limit = 20) => {
    const res = await axiosInstance.get(`/api/v2/chatbot/chat/history`, {
      params: {
        user_id,
        offset,
        limit,
      },
    });
    return res?.data;
  },
  fetchDailyGreeting: async (user_id) => {
    const res = await axiosInstance.post(`/api/v2/chatbot/chat/daily-greeting`, null, {
      params: {
        user_id,
      },
    });
    return res?.data;
  },
};

const VoiceMessagePlayer = ({ uri, durationSecs, transcript }) => {
  const player = useAudioPlayer(uri ? { uri } : null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  useEffect(() => {
    let interval;
    if (player && player.playing) {
      interval = setInterval(() => {
        setCurrentTimeMs((player.currentTime || 0) * 1000);
      }, 100);
    } else if (player) {
      setCurrentTimeMs((player.currentTime || 0) * 1000);
    }
    return () => clearInterval(interval);
  }, [player?.playing, player?.currentTime]);

  if (!player) return null;

  const handlePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      if (player.currentTime >= player.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null || secs === undefined) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const totalDuration = player.duration > 0 ? player.duration : durationSecs || 0;
  const currentPos = player.currentTime || 0;
  const progress = totalDuration > 0 ? currentPos / totalDuration : 0;

  return (
    <View style={styles.voicePlayerCard}>
      <View style={styles.voicePlayerRow}>
        <TouchableOpacity style={styles.voicePlayButton} onPress={handlePlayPause}>
          <Ionicons
            name={player.playing ? "pause" : "play"}
            size={18}
            color="#006FAD"
          />
        </TouchableOpacity>

        <View style={styles.voiceProgressWrapper}>
          <View style={styles.voiceProgressBarBg}>
            <View style={[styles.voiceProgressBarFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          
          <View style={styles.voiceTimeLabelsRow}>
            <Text style={styles.voiceTimeLabel}>{formatTime(currentPos)}</Text>
            <Text style={styles.voiceTimeLabel}>{formatTime(totalDuration)}</Text>
          </View>
        </View>
      </View>

      {/* transcript && transcript !== "Voice message" && (
        <View style={styles.voiceTranscriptWrapper}>
          <TouchableOpacity 
            style={styles.voiceTranscriptToggle} 
            onPress={() => setShowTranscript(!showTranscript)}
          >
            <Text style={styles.voiceTranscriptToggleText}>
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </Text>
            <Ionicons 
              name={showTranscript ? "chevron-up" : "chevron-down"} 
              size={12} 
              color="#FFF" 
            />
          </TouchableOpacity>
          {showTranscript && (
            <Text style={styles.voiceTranscriptText}>{transcript}</Text>
          )}
        </View>
      ) */}
    </View>
  );
};


export default function KyraAI() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [clientId, setClientId] = useState(null);
  const [userName, setUserName] = useState("there");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleRemoveSelectedImage = () => {
    setSelectedImage(null);
    setIsUploadingImage(false);
  };

  // WhatsApp recording UI animations
  const waveAnims = useRef([
    new Animated.Value(0.2),
    new Animated.Value(0.5),
    new Animated.Value(0.8),
    new Animated.Value(0.4),
    new Animated.Value(0.6),
  ]).current;
  const waveLoop = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);

  // Loading/typing indicator states
  const [isThinking, setIsThinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState(null);

  // Consent states
  const [aiConsentGiven, setAiConsentGiven] = useState(false);
  const [showAIConsentModal, setShowAIConsentModal] = useState(false);

  // Pagination states
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const flatListRef = useRef(null);
  const esRef = useRef(null);
  const durationInterval = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const isLoadingHistoryRef = useRef(false);
  const inputRef = useRef(null);

  // Audio Recorder hook from expo-audio
  const audioRecorder = useAudioRecorder({
    keepConnectionAlive: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder);

  // Sounds hook
  const isScreenFocused = useRef(true);
  const {
    playMessageSentSound,
    playMessageReceivedSound,
  } = useChatSound(isScreenFocused.current);

  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      return () => {
        isScreenFocused.current = false;
      };
    }, []),
  );

  const mapHistoryRowToMessages = (row) => {
    const userMsgId = `user-${row.id}`;
    const aiMsgId = `ai-${row.id}`;
    const timestamp = row.created_at ? new Date(row.created_at) : new Date();

    const isAudioMsg = row.request_type === "audio" || (row.documents && row.documents.some(d => d.mime_type.startsWith("audio/")));
    const userMsg = {
      id: userMsgId,
      text: row.request,
      isUser: true,
      timestamp: timestamp,
      isComplete: true,
      isDocument: row.documents && row.documents.length > 0 && !isAudioMsg,
      isVoice: isAudioMsg,
      documents: row.documents || [],
    };

    const aiMsg = {
      id: aiMsgId,
      text: row.response,
      isUser: false,
      timestamp: timestamp,
      isComplete: true,
    };

    // If it's a system daily greeting, skip showing the fake user request bubble
    if (row.request === "[system_greeting]") {
      return [aiMsg];
    }

    // For inverted FlatList: AI message is newest in a turn (rendered below/closer to index 0),
    // User message is older in a turn (rendered above/closer to index length).
    return [aiMsg, userMsg];
  };

  const loadOlderMessages = async () => {
    if (isLoadingHistoryRef.current || !hasMoreHistory || !clientId) return;

    isLoadingHistoryRef.current = true;
    setIsLoadingHistory(true);
    shouldScrollToBottomRef.current = false; // Prevent auto-scrolling when older items append
    try {
      const historyData = await chatbotAPI.fetchHistory(clientId, historyOffset, 20);
      if (historyData && historyData.messages && historyData.messages.length > 0) {
        const loadedMessages = [];
        historyData.messages.forEach((row) => {
          const msgs = mapHistoryRowToMessages(row);
          loadedMessages.push(...msgs);
        });

        // For inverted FlatList, older messages are appended to the end of the array (rendered at the top of list)
        setMessages((prev) => [...prev, ...loadedMessages]);
        setHistoryOffset((prev) => prev + historyData.messages.length);
        setHasMoreHistory(historyData.has_more);
      } else {
        setHasMoreHistory(false);
      }
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setIsLoadingHistory(false);
      isLoadingHistoryRef.current = false;
    }
  };

  const getClientId = async () => {
    try {
      const id = await AsyncStorage.getItem("client_id");
      setClientId(id);
      const name = await AsyncStorage.getItem("user_name");
      if (name) setUserName(name);

      if (id) {
        isLoadingHistoryRef.current = true;
        setIsLoadingHistory(true);
        shouldScrollToBottomRef.current = true;
        try {
          const historyData = await chatbotAPI.fetchHistory(id, 0, 20);
          let initialMessages = [];
          if (historyData && historyData.messages && historyData.messages.length > 0) {
            historyData.messages.forEach((row) => {
              const msgs = mapHistoryRowToMessages(row);
              initialMessages.push(...msgs);
            });
          } else if (!historyData.generate_greeting) {
            // Display welcome message if no history exists and no greeting is to be generated
            initialMessages = [
              {
                id: "welcome",
                text: `Hey ${name || "there"}! 👋\nYou can chat or use voice messages to ask me anything about your fitness journey.`,
                isUser: false,
                timestamp: new Date(),
                isComplete: true,
              },
            ];
          }

          setMessages(initialMessages);
          setHistoryOffset(historyData.messages ? historyData.messages.length : 0);
          setHasMoreHistory(historyData.has_more);

          if (historyData.generate_greeting) {
            setIsThinking(true);
            try {
              const greetingData = await chatbotAPI.fetchDailyGreeting(id);
              if (greetingData) {
                const msgs = mapHistoryRowToMessages(greetingData);
                setMessages((prev) => [...msgs, ...prev]);
                setHistoryOffset((prev) => prev + 1);
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index: 0, animated: true });
                }, 100);
              }
            } catch (greetErr) {
              console.error("Error fetching daily greeting:", greetErr);
              if (initialMessages.length === 0) {
                setMessages([
                  {
                    id: "welcome",
                    text: `Hey ${name || "there"}! 👋\nYou can chat or use voice messages to ask me anything about your fitness journey.`,
                    isUser: false,
                    timestamp: new Date(),
                    isComplete: true,
                  },
                ]);
              }
            } finally {
              setIsThinking(false);
            }
          }
        } catch (err) {
          console.error("Error loading initial chat history:", err);
          // Fallback to welcome message on error
          setMessages([
            {
              id: "welcome",
              text: `Hey ${name || "there"}! 👋\nYou can chat or use voice messages to ask me anything about your fitness journey.`,
              isUser: false,
              timestamp: new Date(),
              isComplete: true,
            },
          ]);
          setHasMoreHistory(false);
        } finally {
          setIsLoadingHistory(false);
          isLoadingHistoryRef.current = false;
        }
      }
    } catch (err) {
      console.error("Error fetching client_id:", err);
    }
  };

  useEffect(() => {
    getClientId();
    checkAIConsent();
    requestPermissions();
  }, []);

  // ── Android keyboard handling ──
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (Platform.OS === "android") setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── WhatsApp recording UI animations loop ──
  useEffect(() => {
    if (isRecording) {
      // Start pulse animation for mic icon
      pulseAnim.setValue(1);
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();

      // Start wave animations
      const createWaveAnim = (val) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 150 + Math.random() * 150,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: Math.random() * 0.4 + 0.1,
              duration: 150 + Math.random() * 150,
              useNativeDriver: true,
            }),
          ])
        );
      };
      
      waveLoop.current = waveAnims.map((anim) => {
        const loop = createWaveAnim(anim);
        loop.start();
        return loop;
      });
    } else {
      // Stop animations
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      pulseAnim.setValue(1);

      if (waveLoop.current) {
        waveLoop.current.forEach((loop) => loop.stop());
        waveLoop.current = null;
      }
      waveAnims.forEach((anim) => anim.setValue(0.2));
    }

    return () => {
      if (pulseLoop.current) pulseLoop.current.stop();
      if (waveLoop.current) waveLoop.current.forEach((loop) => loop.stop());
    };
  }, [isRecording]);

  const requestPermissions = async () => {
    try {
      const response = await AudioModule.requestRecordingPermissionsAsync();
      setHasAudioPermission(response.granted);
    } catch (err) {
      console.error("Error requesting audio permissions:", err);
    }
  };

  const checkAIConsent = async () => {
    try {
      const id = await AsyncStorage.getItem("client_id");
      if (!id) return;
      const response = await getAIConsentAPI(id);
      if (response && response.status === 200 && response.data) {
        setAiConsentGiven(true);
      } else {
        setTimeout(() => setShowAIConsentModal(true), 1000);
      }
    } catch (err) {
      console.error("Error checking AI consent:", err);
    }
  };

  const handleAIConsentAccept = async () => {
    try {
      const payload = { client_id: clientId, consent: true };
      const response = await postAIConsentAPI(payload);
      if (response && response.status === 200) {
        setAiConsentGiven(true);
        setShowAIConsentModal(false);
      }
    } catch (err) {
      console.error("Error posting AI consent:", err);
    }
  };

  const handleAIConsentDecline = () => {
    setShowAIConsentModal(false);
    router.push("/client/home");
  };

  const handleClearChat = async () => {
    if (!clientId) return;
    try {
      await closeChatbotAPI({ user_id: clientId });
      setMessages([
        {
          id: "welcome",
          text: `Chat history cleared. How can I help you on your fitness journey today?`,
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
        },
      ]);
      setHistoryOffset(0);
      setHasMoreHistory(false);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  };

  // Safe EventSource cleanup
  const safeCloseSSE = () => {
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch (e) {
        console.error("Error closing EventSource:", e);
      }
      esRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      safeCloseSSE();
    };
  }, []);

  // Recording timer state sync
  useEffect(() => {
    if (recorderState.isRecording !== isRecording) {
      if (recorderState.isRecording && !isRecording) {
        setIsRecording(true);
        setRecordingDuration(0);
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
        }
        durationInterval.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } else if (!recorderState.isRecording && isRecording) {
        setIsRecording(false);
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
      }
    }
  }, [recorderState.isRecording, isRecording]);

  const startRecording = async () => {
    if (!hasAudioPermission) {
      await requestPermissions();
      return;
    }
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

      if (Platform.OS === "ios") {
        await new Promise((res) => setTimeout(res, 500));
      }

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorder.stop();
      const uri = recorderState.uri || audioRecorder.uri || (result && result.uri) || (result && result.url);
      if (uri) {
        await handleVoiceMessage(uri);
      }
    } catch (err) {
      console.error("Failed to stop recording:", err);
    }
  };

  const cancelRecording = async () => {
    try {
      await audioRecorder.stop();
      setRecordingDuration(0);
    } catch (err) {
      console.error("Failed to cancel recording:", err);
    }
  };

  const handleVoiceMessage = async (audioUri) => {
    const voiceId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const extension = Platform.OS === "ios" ? "m4a" : "mp4";
    const mimeType = Platform.OS === "ios" ? "audio/m4a" : "audio/mp4";
    const fileName = `voice_message_${Date.now()}.${extension}`;

    shouldScrollToBottomRef.current = true;
    setMessages((prev) => [
      {
        id: voiceId,
        text: "Voice message",
        isUser: true,
        timestamp: new Date(),
        isComplete: true,
        isVoice: true,
        duration: recordingDuration,
        documents: [],
      },
      ...prev,
    ]);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }, 50);

    const savedDuration = recordingDuration;
    setRecordingDuration(0);
    setIsThinking(true);

    try {
      // 1. Get file size
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      const size = fileInfo.exists ? fileInfo.size : 0;

      // 2. Fetch presigned upload URL and transcribe in parallel
      const [uploadResponse, transcript] = await Promise.all([
        chatbotAPI.getUploadUrl(clientId, fileName, mimeType),
        chatbotAPI.transcribeVoice(audioUri, clientId).catch((err) => {
          console.error("Transcription error (continuing with upload):", err);
          return "Voice message";
        }),
      ]);

      if (!uploadResponse || !uploadResponse.success) {
        throw new Error("Failed to get presigned upload URL for voice message");
      }

      const { upload, cdn_url, key } = uploadResponse.data;

      // 3. Upload to S3
      const uploadResult = await FileSystem.uploadAsync(upload.url, audioUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
        fieldName: "file",
        mimeType: mimeType,
        parameters: upload.fields,
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 204) {
        throw new Error(`Voice upload failed with status ${uploadResult.status}`);
      }

      // 4. Build attachment object
      const attachment = {
        file_name: fileName,
        file_size: size,
        mime_type: mimeType,
        s3_key: key,
        s3_url: cdn_url,
      };

      // 5. Update local message details
      setMessages((prev) =>
        prev.map((m) =>
          m.id === voiceId
            ? {
                ...m,
                text: transcript || "Voice message",
                documents: [attachment],
              }
            : m,
        ),
      );

      // 6. Send message to backend
      await sendStreamingMessage(transcript || "Voice message", "audio", [attachment]);

    } catch (err) {
      console.error("Voice processing error:", err);
      setIsThinking(false);
      setIsTyping(false);
      safeCloseSSE();
      setMessages((prev) => [
        {
          id: `err-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Sorry, I'm having trouble processing your voice message. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
        ...prev,
      ]);
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const handleDocumentPick = async () => {
    try {
      // 1. Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Permission required to access your photo library.");
        return;
      }

      // 2. Open the image picker (gallery)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
        exif: false,
      });

      // User cancelled
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;

      // Derive file name and mime type from the picked asset
      const fileName = uri.split("/").pop() || `image_${Date.now()}.jpg`;
      const ext = fileName.split(".").pop().toLowerCase();
      const mimeTypeMap = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        heic: "image/heic",
      };
      const mimeType = asset.mimeType || mimeTypeMap[ext] || "image/jpeg";
      const size = asset.fileSize || 0;

      // Stage the image locally and set loading
      setSelectedImage({
        uri: uri,
        name: fileName,
        mimeType: mimeType,
        size: size,
        attachment: null,
      });
      setIsUploadingImage(true);

      // 3. Get presigned upload URL from backend
      const response = await chatbotAPI.getUploadUrl(clientId, fileName, mimeType);
      if (!response || !response.success) {
        throw new Error("Failed to get presigned upload URL");
      }

      const { upload, cdn_url, key } = response.data;

      // 4. Upload the selected image to S3 via FileSystem.uploadAsync
      const uploadResult = await FileSystem.uploadAsync(upload.url, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 1,
        fieldName: "file",
        parameters: upload.fields,
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 204) {
        throw new Error(`Upload failed with status ${uploadResult.status}`);
      }

      // 5. Build attachment
      const attachment = {
        file_name: fileName,
        file_size: size,
        mime_type: mimeType,
        s3_key: key,
        s3_url: cdn_url,
      };

      // Set attachment as ready
      setSelectedImage({
        uri: uri,
        name: fileName,
        mimeType: mimeType,
        size: size,
        attachment: attachment,
      });
      setIsUploadingImage(false);

    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image. Please try again.");
      setSelectedImage(null);
      setIsUploadingImage(false);
    }
  };

  const sendStreamingMessage = async (messageText, requestType = "text", attachments = []) => {
    setIsThinking(false);
    setIsTyping(true);
    const aiId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentMessageId(aiId);

    shouldScrollToBottomRef.current = true;
    setMessages((prev) => [
      {
        id: aiId,
        text: "",
        isUser: false,
        timestamp: new Date(),
        isComplete: false,
        isStreaming: true,
      },
      ...prev,
    ]);

    safeCloseSSE();

    const finalize = () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId ? { ...m, isComplete: true, isStreaming: false } : m,
        ),
      );
      setIsTyping(false);
      setCurrentMessageId(null);
      safeCloseSSE();
    };

    let hasPlayedReceiveSound = false;

    const handleMessage = (event) => {
      const payload = event?.data;
      if (!payload) return;

      if (!hasPlayedReceiveSound) {
        hasPlayedReceiveSound = true;
        playMessageReceivedSound();
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === aiId) {
            return {
              ...m,
              text: m.text + (m.text ? "\n" : "") + payload,
              isStreaming: true,
            };
          }
          return m;
        }),
      );

      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 50);
    };

    try {
      const token = await chatbotAPI.getValidToken();
      if (!token) throw new Error("Failed to get valid token");

      let endpoint = `/api/v2/chatbot/chat/stream_test?user_id=${encodeURIComponent(clientId)}&request_type=${requestType}`;
      if (attachments && attachments.length > 0) {
        endpoint += `&attachments=${encodeURIComponent(JSON.stringify(attachments))}`;
      }
      const es = await chatbotAPI.openSSE({
        text: messageText,
        endpoint,
        onMessage: handleMessage,
        token,
      });
      esRef.current = es;

      es.onerror = (error) => {
        console.error("❌ EventSource error:", error);
      };

      es.addEventListener("message", handleMessage);
      es.addEventListener("done", finalize);
      es.addEventListener("error", () => {
        finalize();
        setMessages((prev) => [
          {
            id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: "Connection dropped. Please ask again if Kyra's response was cut short.",
            isUser: false,
            timestamp: new Date(),
            isComplete: true,
            isError: true,
          },
          ...prev,
        ]);
      });
    } catch (error) {
      console.error("SSE Connection error:", error);
      setIsTyping(false);
      setMessages((prev) => [
        {
          id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Failed to connect to Fittbot servers. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
        ...prev,
      ]);
    }
  };

  const sendMessage = async () => {
    playMessageSentSound();
    const txt = inputText.trim();
    if ((!txt && !selectedImage) || isTyping || isThinking || isRecording || isUploadingImage) return;

    const currentImage = selectedImage;
    setSelectedImage(null);
    setInputText("");
    inputRef.current?.clear();

    const msgId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const attachments = currentImage && currentImage.attachment ? [currentImage.attachment] : [];
    const messageText = txt || (currentImage ? `Sent image: ${currentImage.name}` : "");

    shouldScrollToBottomRef.current = true;
    setMessages((prev) => [
      {
        id: msgId,
        text: messageText,
        isUser: true,
        timestamp: new Date(),
        isComplete: true,
        isDocument: !!currentImage,
        documents: attachments,
      },
      ...prev,
    ]);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }, 50);
    setIsThinking(true);

    try {
      if (currentImage) {
        await sendStreamingMessage(messageText, "document", attachments);
      } else {
        await sendStreamingMessage(messageText, "text");
      }
    } catch (err) {
      console.error("SSE error:", err);
      setIsThinking(false);
      setIsTyping(false);
      safeCloseSSE();
    }
  };

  const renderAttachments = (documents, isUser) => {
    if (!documents || documents.length === 0) return null;

    return (
      <View style={styles.attachmentsContainer}>
        {documents.map((doc, idx) => {
          const isImage = doc.mime_type.startsWith("image/");
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.attachmentCard,
                isUser ? styles.userAttachmentCard : styles.aiAttachmentCard
              ]}
              onPress={() => {
                Linking.openURL(doc.s3_url).catch((err) =>
                  console.error("Failed to open document URL:", err)
                );
              }}
            >
              <View style={styles.attachmentIconWrapper}>
                <Ionicons
                  name={isImage ? "image" : "document-text"}
                  size={24}
                  color={isUser ? "#FFF" : "#006FAD"}
                />
              </View>
              <View style={styles.attachmentMeta}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.attachmentName,
                    isUser ? styles.userAttachmentText : styles.aiAttachmentText
                  ]}
                >
                  {doc.file_name}
                </Text>
                <Text
                  style={[
                    styles.attachmentSize,
                    isUser ? styles.userAttachmentSubtext : styles.aiAttachmentSubtext
                  ]}
                >
                  {formatBytes(doc.file_size)}
                </Text>
              </View>
              <Ionicons
                name="open-outline"
                size={16}
                color={isUser ? "rgba(255,255,255,0.7)" : "#666"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderMessageText = (text, isUser) => {
    if (!text) return null;

    const textStyle = isUser ? styles.userMessageText : styles.aiMessageText;
    const boldStyle = { fontWeight: "700" };

    // Convert any literal stringified "\\n" escapes to real newlines first
    const cleanText = text.replace(/\\n/g, "\n");

    // Normalize collapsed markdown (AI returns everything on one line)
    let normalized = cleanText
      // Bold list items: ANY " - **" occurrence means a new list item
      .replace(/ - \*\*/g, "\n- **")
      // Dividers
      .replace(/  ---  /g, "\n---\n")
      .replace(/---/g, "\n---\n")
      // Headers like "  ### Title" or "### Title" collapsed inline
      .replace(/\s{1,}(#{1,6} )/g, "\n$1")
      // Plain bullets after sentence end: ". - Capital" or "! - Capital"
      .replace(/([.!?]) - ([A-Z])/g, "$1\n- $2")
      // Plain bullets after colon: ": - Capital"
      .replace(/: - ([A-Z])/g, ":\n- $1")
      // 2-space and 3-space prefix bullets (fallback)
      .replace(/  - /g, "\n- ")
      .replace(/   - /g, "\n- ")
      .replace(/\t- /g, "\n- ");

    const lines = normalized.split("\n");

    return (
      <View style={{ width: "100%" }}>
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // 1. Handle horizontal divider `---`
          if (trimmed === "---") {
            return (
              <View
                key={lineIdx}
                style={{
                  height: 1,
                  backgroundColor: isUser ? "rgba(255, 255, 255, 0.25)" : "#E2E8F0",
                  marginVertical: 10,
                  width: "100%",
                }}
              />
            );
          }

          // 2. Handle lab parameter lines (e.g. - **Hemoglobin**: 15 g/dL (Normal: 14-16))
          const paramRegex = /^-\s+\*\*([^*]+)\*\*:\s*([^(]+)(?:\((.+)\))?/;
          const paramMatch = trimmed.match(paramRegex);
          if (paramMatch && !isUser) {
            const name = paramMatch[1].trim();
            const value = paramMatch[2].trim();
            const range = paramMatch[3] ? paramMatch[3].trim() : null;

            // Check if line itself mentions Low/High status before the parenthesis
            const fullLine = trimmed.toLowerCase();
            const isHighInValue = value.toLowerCase().includes("high") || value.toLowerCase().includes("elevated");
            const isLowInValue = value.toLowerCase().includes("low");
            const isHighInRange = range && (range.toLowerCase().includes("high") || range.toLowerCase().includes("elevated"));
            const isLowInRange = range && range.toLowerCase().includes("low");

            const isHigh = isHighInValue || isHighInRange;
            const isLow = isLowInValue || isLowInRange;

            let statusColor = "#10B981"; // Green = normal
            if (isHigh) statusColor = "#EF4444"; // Red
            if (isLow) statusColor = "#F59E0B";  // Amber

            // Clean the value if it contains "Low," or "High," prefix
            const cleanValue = value
              .replace(/^(low,?\s*|high,?\s*|elevated,?\s*)/i, "")
              .trim();

            return (
              <View key={lineIdx} style={styles.labRow}>
                <View style={styles.labRowLeft}>
                  <Text style={styles.labParamName}>{name}</Text>
                </View>
                <View style={styles.labRowRight}>
                  <Text style={[styles.labParamValue, { color: statusColor }]}>{cleanValue}</Text>
                  {range && <Text style={styles.labParamRange}>{range}</Text>}
                </View>
              </View>
            );
          }

          // 3. Handle header match (### Header)
          let isHeader = false;
          let cleanLine = line;
          const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
          if (headerMatch) {
            isHeader = true;
            cleanLine = headerMatch[2];
          }

          // 4. Split by bold **text**
          const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

          return (
            <Text
              key={lineIdx}
              style={[
                textStyle,
                {
                  marginVertical: 1.5,
                },
                isHeader && {
                  fontSize: 15,
                  fontWeight: "700",
                  color: isUser ? "#FFF" : "#006FAD",
                  marginTop: lineIdx > 0 ? 12 : 2,
                  marginBottom: 6,
                },
                !isHeader && trimmed.startsWith("-") && {
                  paddingLeft: 8,
                },
              ]}
            >
              {parts.map((part, partIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  const boldText = part.slice(2, -2);
                  return (
                    <Text key={partIdx} style={boldStyle}>
                      {boldText}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        })}
      </View>
    );
  };


  const renderMessage = ({ item }) => {
    const isUser = item.isUser;
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Image
              source={require("../../../assets/images/kyraAI.png")}
              style={{ width: 24, height: 24 }}
            />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {isUser ? (
            <LinearGradient
              colors={["#25ACE5", "#006FAD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.userBubbleContent}
            >
              {item.isVoice ? (
                <VoiceMessagePlayer 
                  uri={item.documents?.[0]?.s3_url || item.uri} 
                  durationSecs={item.duration}
                  transcript={item.text} 
                />
              ) : (
                <>
                  {renderAttachments(item.documents, true)}
                  {item.text && renderMessageText(item.text, true)}
                </>
              )}
            </LinearGradient>
          ) : (
            <View style={item.text ? styles.aiBubbleContent : styles.aiBubbleContentCompact}>
              {renderAttachments(item.documents, false)}
              {item.text ? (
                renderMessageText(item.text, false)
              ) : (
                <ThreeDotLoader />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderThinkingIndicator = () => {
    if (!isThinking) return null;
    return (
      <View style={styles.aiMessageContainer}>
        <View style={styles.aiAvatar}>
          <Image
            source={require("../../../assets/images/kyraAI.png")}
            style={{ width: 24, height: 24 }}
          />
        </View>
        <View style={styles.aiMessageBubble}>
          <View style={styles.aiBubbleContentCompact}>
            <ThreeDotLoader />
          </View>
        </View>
      </View>
    );
  };

  const renderCompactTypingIndicator = () => {
    if (!isTyping || currentMessageId) return null;
    return (
      <View style={styles.aiMessageContainer}>
        <View style={styles.aiAvatar}>
          <Image
            source={require("../../../assets/images/kyraAI.png")}
            style={{ width: 24, height: 24 }}
          />
        </View>
        <View style={styles.aiMessageBubble}>
          <View style={styles.aiBubbleContentCompact}>
            <ThreeDotLoader />
          </View>
        </View>
      </View>
    );
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF"]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                router.push("/client/home");
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerAvatar}>
              <Image
                source={require("../../../assets/images/kyraAI.png")}
                style={{ width: 32, height: 32 }}
              />
            </View>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                  style={{ marginLeft: 4, marginTop: -4 }}
                />
              </View>
              <Text style={styles.headerSubtitle}>Your AI Wellness Buddy</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Chat messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted={true}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}

          showsVerticalScrollIndicator={false}
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.1}
          ListHeaderComponent={() => (
            <>
              {renderThinkingIndicator()}
              {renderCompactTypingIndicator()}
            </>
          )}
          ListFooterComponent={() => {
            if (isLoadingHistory && messages.length > 0) {
              return (
                <View style={{ paddingVertical: 12, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#006FAD" />
                </View>
              );
            }
            return null;
          }}
        />

        {/* Input box */}
        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.safeInputArea,
            Platform.OS === "android" && { paddingBottom: keyboardHeight },
          ]}
        >
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <View style={styles.imagePreviewWrapper}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreviewThumbnail}
                />
                {isUploadingImage && (
                  <View style={styles.imagePreviewLoading}>
                    <ActivityIndicator size="small" color="#006FAD" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.imagePreviewCloseButton}
                  onPress={handleRemoveSelectedImage}
                >
                  <Ionicons name="close-circle" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
              <View style={styles.imagePreviewTextWrapper}>
                <Text style={styles.imagePreviewName} numberOfLines={1}>
                  {selectedImage.name}
                </Text>
                <Text style={styles.imagePreviewStatus}>
                  {isUploadingImage ? "Uploading to S3..." : "Ready to send"}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            {isRecording ? (
              <>
                <View style={styles.recordingWrapper}>
                  {/* Blinking blue mic */}
                  <Animated.View style={{ opacity: pulseAnim }}>
                    <Ionicons name="mic" size={20} color="#006FAD" />
                  </Animated.View>

                  {/* Timer */}
                  <Text style={styles.recordingTimer}>
                    {formatDuration(recordingDuration)}
                  </Text>

                  {/* Animated Waveform */}
                  <View style={styles.wavesContainer}>
                    {waveAnims.map((anim, idx) => (
                      <Animated.View
                        key={idx}
                        style={[
                          styles.waveBar,
                          {
                            transform: [{ scaleY: anim }],
                          },
                        ]}
                      />
                    ))}
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={styles.recordingCancelBtn}
                    onPress={cancelRecording}
                  >
                    <Ionicons name="trash-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Send/Stop recording button */}
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={stopRecording}
                >
                  <LinearGradient
                    colors={["#25ACE5", "#006FAD"]}
                    style={styles.sendButtonGradient}
                  >
                    <Ionicons name="send" size={18} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type your message..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    editable={!isRecording}
                    returnKeyType="send"
                    onSubmitEditing={sendMessage}
                    blurOnSubmit={false}
                  />

                  {/* Attachment button */}
                  <TouchableOpacity
                    style={styles.attachmentButton}
                    onPress={handleDocumentPick}
                    disabled={isTyping || isThinking || isRecording}
                  >
                    <Ionicons
                      name="attach"
                      size={22}
                      color="#006FAD"
                    />
                  </TouchableOpacity>

                  {/* Microphone button */}
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
                </View>

                {/* Send button */}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (inputText.trim() || (selectedImage && !isUploadingImage)) && !isTyping && !isThinking && !isRecording
                      ? styles.sendButtonActive
                      : styles.sendButtonInactive,
                  ]}
                  onPress={sendMessage}
                  disabled={(!inputText.trim() && !selectedImage) || isUploadingImage || isTyping || isThinking || isRecording}
                >
                  <LinearGradient
                    colors={
                      (inputText.trim() || (selectedImage && !isUploadingImage)) && !isTyping && !isThinking && !isRecording
                        ? ["#25ACE5", "#006FAD"]
                        : ["#E0E0E0", "#BDBDBD"]
                    }
                    style={styles.sendButtonGradient}
                  >
                    {isThinking || isTyping ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <MaterialIcons name="send" size={20} color="#FFF" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* AI Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={14} color="#888" />
            <Text style={styles.disclaimerText}>
              Always consult healthcare professionals for medical advice.
            </Text>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* AI Consent Modal
      <Modal
        visible={showAIConsentModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.consentCard}>
            <Text style={styles.consentTitle}>Kyra AI Assistant Consent</Text>
            <Text style={styles.consentBody}>
              Kyra is an AI chat assistant provided by Fymble to support your fitness and nutrition goals.
              {"\n\n"}
              By continuing, you agree that:
              {"\n"}• Kyra generates AI responses that do not constitute professional medical advice.
              {"\n"}• Your chat history is processed to provide context for responses.
            </Text>
            <View style={styles.consentActions}>
              <TouchableOpacity
                style={[styles.consentButton, styles.declineButton]}
                onPress={handleAIConsentDecline}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consentButton, styles.acceptButton]}
                onPress={handleAIConsentAccept}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      */}
    </View>
  );
}

const ThreeDotLoader = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    const animate = () => {
      if (!isMounted) return;

      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(dot2, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(dot3, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (isMounted) {
          animate();
        }
      });
    };

    animate();

    return () => {
      isMounted = false;
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.threeDotContainer}>
      <Animated.View style={[styles.threeDot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.threeDot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.threeDot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    paddingBottom: 4,
    paddingHorizontal: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  backButton: { marginRight: 8, padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  headerSubtitle: { fontSize: 10, color: "#666", marginTop: 0 },
  clearChatButton: { padding: 8 },

  chatContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  messagesList: { flex: 1, paddingHorizontal: 16 },
  messagesContent: { paddingTop: 20, paddingBottom: 10 },
  messageContainer: { marginVertical: 6, maxWidth: width * 0.8, flexDirection: "row", alignItems: "flex-end" },
  userMessageContainer: { alignSelf: "flex-end" },
  aiMessageContainer: { alignSelf: "flex-start" },
  aiAvatar: { marginRight: 8, marginBottom: 2 },

  messageBubble: { borderRadius: 18, overflow: "hidden" },
  userBubble: { borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4, backgroundColor: "#F0F0F0" },
  userBubbleContent: { paddingVertical: 10, paddingHorizontal: 16 },
  aiBubbleContent: { paddingVertical: 10, paddingHorizontal: 16 },
  userMessageText: { fontSize: 15, color: "#FFFFFF", lineHeight: 22 },
  aiMessageText: { fontSize: 15, color: "#333333", lineHeight: 22 },

  thinkingBubble: {
    backgroundColor: "#F0F0F0",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  thinkingText: { fontSize: 14, color: "#666", marginLeft: 8 },

  safeInputArea: {
    backgroundColor: "transparent",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    maxHeight: 80,
    paddingVertical: 4,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBEBEB",
    marginHorizontal: 6,
  },
  voiceButtonRecording: { backgroundColor: "#FFE5E5" },
  voiceButtonDisabled: { backgroundColor: "#F0F0F0" },
  sendButton: {
    marginLeft: 8,
    marginBottom: 6,
    elevation: 2,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {},
  sendButtonInactive: {},

  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    paddingHorizontal: 10,
  },
  disclaimerText: {
    fontSize: 10,
    color: "#999",
    marginLeft: 4,
    textAlign: "center",
  },

  recordingWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F7FF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 48,
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#006FAD",
    marginLeft: 8,
  },
  wavesContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginHorizontal: 12,
  },
  waveBar: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    backgroundColor: "#006FAD",
  },
  recordingCancelBtn: {
    padding: 4,
  },
  voicePlayerCard: {
    paddingVertical: 6,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    width: width * 0.55,
  },
  voicePlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voicePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  voiceProgressWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  voiceProgressBarBg: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 1.5,
    width: "100%",
    marginBottom: 4,
  },
  voiceProgressBarFill: {
    height: 3,
    backgroundColor: "#FFF",
    borderRadius: 1.5,
  },
  voiceTimeLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  voiceTimeLabel: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.8)",
  },
  voiceTranscriptWrapper: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 8,
  },
  voiceTranscriptToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voiceTranscriptToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFF",
  },
  voiceTranscriptText: {
    fontSize: 13,
    color: "#FFF",
    marginTop: 6,
    lineHeight: 18,
    fontStyle: "italic",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  consentCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    elevation: 5,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  consentBody: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 20,
  },
  consentActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  consentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 6,
  },
  declineButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  declineButtonText: {
    color: "#555",
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: "#006FAD",
  },
  acceptButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  attachmentButton: {
    padding: 8,
    marginRight: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentsContainer: {
    marginBottom: 8,
    width: "100%",
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    minWidth: 200,
    marginBottom: 4,
  },
  userAttachmentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  aiAttachmentCard: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#E1E8ED",
  },
  attachmentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  attachmentMeta: {
    flex: 1,
    marginRight: 8,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "600",
  },
  userAttachmentText: {
    color: "#FFF",
  },
  aiAttachmentText: {
    color: "#333",
  },
  attachmentSize: {
    fontSize: 11,
    marginTop: 2,
  },
  userAttachmentSubtext: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  aiAttachmentSubtext: {
    color: "#666",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EFEFEF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: "100%",
  },
  imagePreviewWrapper: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  imagePreviewThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  imagePreviewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  imagePreviewCloseButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFF",
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  imagePreviewTextWrapper: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  imagePreviewName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  imagePreviewStatus: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  aiBubbleContentCompact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  threeDotContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  threeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#006FAD",
  },
  labRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    alignItems: "center",
    width: "100%",
  },
  labRowLeft: {
    flex: 1.2,
    marginRight: 8,
  },
  labRowRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  labParamName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  labParamValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  labParamRange: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "right",
  },
});
