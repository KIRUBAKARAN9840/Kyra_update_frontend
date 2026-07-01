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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { MaskedText } from "../../../components/ui/MaskedText";
import { useAudioRecorder, useAudioRecorderState } from "expo-audio";
import axios from "axios";
import axiosInstance from "../../../services/axiosInstance";
import * as SecureStore from "expo-secure-store";
import EventSource from "react-native-sse";
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
};

export default function KyraAI() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [clientId, setClientId] = useState(null);
  const [userName, setUserName] = useState("there");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const flatListRef = useRef(null);
  const esRef = useRef(null);
  const durationInterval = useRef(null);

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

  const getClientId = async () => {
    try {
      const id = await AsyncStorage.getItem("client_id");
      setClientId(id);
      const name = await AsyncStorage.getItem("user_name");
      if (name) setUserName(name);

      setMessages([
        {
          id: "welcome",
          text: `Hey ${name || "there"}! 👋\nYou can chat or use voice messages to ask me anything about your fitness journey.`,
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
        },
      ]);
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
      await audioRecorder.prepare(RecordingPresets.HIGH_QUALITY);
      await audioRecorder.record();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      const uri = recorderState.uri;
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
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    } catch (err) {
      console.error("Failed to cancel recording:", err);
    }
  };

  const handleVoiceMessage = async (audioUri) => {
    const voiceId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    setIsThinking(true);

    try {
      const transcript = await chatbotAPI.transcribeVoice(audioUri, clientId);
      if (!transcript) throw new Error("Empty transcript");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === voiceId ? { ...m, text: transcript } : m,
        ),
      );

      await sendStreamingMessage(transcript);
    } catch (err) {
      console.error("Voice processing error:", err);
      setIsThinking(false);
      setIsTyping(false);
      safeCloseSSE();
      setMessages((prev) => [
        ...prev,
        {
          id: `err-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Sorry, I'm having trouble processing your voice message. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
      ]);
    }
  };

  const sendStreamingMessage = async (messageText) => {
    setIsThinking(false);
    setIsTyping(true);
    const aiId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentMessageId(aiId);

    setMessages((prev) => [
      ...prev,
      {
        id: aiId,
        text: "",
        isUser: false,
        timestamp: new Date(),
        isComplete: false,
        isStreaming: true,
      },
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
              text: m.text + payload,
              isStreaming: true,
            };
          }
          return m;
        }),
      );

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    };

    try {
      const token = await chatbotAPI.getValidToken();
      if (!token) throw new Error("Failed to get valid token");

      const endpoint = `/api/v2/chatbot/chat/stream_test?user_id=${encodeURIComponent(clientId)}`;
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
          ...prev,
          {
            id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: "Connection dropped. Please ask again if Kyra's response was cut short.",
            isUser: false,
            timestamp: new Date(),
            isComplete: true,
            isError: true,
          },
        ]);
      });
    } catch (error) {
      console.error("SSE Connection error:", error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: "Failed to connect to Fittbot servers. Please try again.",
          isUser: false,
          timestamp: new Date(),
          isComplete: true,
          isError: true,
        },
      ]);
    }
  };

  const sendMessage = async () => {
    playMessageSentSound();
    const txt = inputText.trim();
    if (!txt || isTyping || isThinking || isRecording) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: txt,
        isUser: true,
        timestamp: new Date(),
        isComplete: true,
      },
    ]);
    setInputText("");
    setIsThinking(true);

    try {
      await sendStreamingMessage(txt);
    } catch (err) {
      console.error("SSE error:", err);
      setIsThinking(false);
      setIsTyping(false);
      safeCloseSSE();
    }
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
              <Text style={styles.userMessageText}>{item.text}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.aiBubbleContent}>
              <Text style={styles.aiMessageText}>{item.text}</Text>
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
        <View style={styles.thinkingBubble}>
          <ActivityIndicator size="small" color="#006FAD" />
          <Text style={styles.thinkingText}>Thinking...</Text>
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
        <View style={styles.thinkingBubble}>
          <ActivityIndicator size="small" color="#25ACE5" />
          <Text style={styles.thinkingText}>Responding...</Text>
        </View>
      </View>
    );
  };

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderRecordingIndicator = () => {
    if (!isRecording) return null;
    return (
      <Modal transparent={true} visible={isRecording} animationType="fade">
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingContainer}>
            <View style={styles.recordingPulse}>
              <Ionicons name="mic" size={40} color="#FF4444" />
            </View>
            <Text style={styles.recordingText}>Recording Voice Message</Text>
            <Text style={styles.recordingDuration}>
              {formatDuration(recordingDuration)}
            </Text>
            <View style={styles.recordingActions}>
              <TouchableOpacity
                style={[styles.recordingButton, styles.cancelButton]}
                onPress={cancelRecording}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recordingButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <Ionicons name="checkmark" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
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
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => {
            if (messages && messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <>
              {renderThinkingIndicator()}
              {renderCompactTypingIndicator()}
            </>
          )}
        />

        {/* Input box */}
        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.safeInputArea,
            Platform.OS === "android" && { paddingBottom: keyboardHeight },
          ]}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  hasAudioPermission
                    ? "Type or hold mic to record..."
                    : "Type your message..."
                }
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                editable={!isRecording}
              />

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
                inputText.trim() && !isTyping && !isThinking && !isRecording
                  ? styles.sendButtonActive
                  : styles.sendButtonInactive,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isTyping || isThinking || isRecording}
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
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#FFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
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

      {/* Recording overlay modal */}
      {renderRecordingIndicator()}

      {/* AI Consent Modal */}
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
    </View>
  );
}

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

  recordingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingContainer: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.8,
  },
  recordingPulse: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  recordingDuration: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF4444",
    marginBottom: 20,
  },
  recordingActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 140,
  },
  recordingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  cancelButton: { backgroundColor: "#FF5E5E" },
  stopButton: { backgroundColor: "#4CAF50" },

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
});
