import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supportAPI } from "../../services/clientApi";
import { showToast } from "../../utils/Toaster";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Data ────────────────────────────────────────────────────────────────────

const CATEGORIES = {
  "Bookings & Payments": [
    "Booked But Gym is Closed",
    "Fitness Class Booked but Class Not Happened in Studio",
    "Personal Training Session Booked but Trainer Not Available",
    "Payment Failed but Amount Debited",
    "Refund Not Received",
    "Daily Gym Pass Purchased but Entry Denied",
    "Nutrition Consultation Paid but Not Scheduled",
    "Wrong Billing / Double Charge",
    "Account Hacked / Unauthorized Transactions",
    "OTP Failure",
  ],
  "App & Features": [
    "Gym Membership Query",
    "Nutritionist Rescheduling",
    "Gym Mate Chat Issues",
    "XP Rewards Not Credited",
    "Referral Bonus",
    "Diet Tracker Sync Problems",
    "Workout Tracking Errors",
    "Food Scanner Incorrect Results",
    "App Crashes / Login Problems",
    "Nutrition Plan Access Issues",
  ],
  General: [
    "General Information Requests",
    "Feature Suggestions",
    "New Gym Request",
    "New Fitness Class Request",
    "Reward Program Questions",
    "How to Use Gym Mate",
    "Profile Update Assistance",
    "Feedback & Reviews",
    "Promotional Offer Queries",
  ],
};

const FAQ_DATA = {
  Bookings: [
    {
      id: 1,
      q: "What are the types of Fitness Studio Bookings in Fymble?",
      a: "Fymble offers three booking types: Daily Pass (one-day gym access), Fitness Class (1-hour sessions like Yoga, Zumba, Dance, Personal Training), and Gym Memberships (long-term plans at partner studios).",
    },
    {
      id: 2,
      q: "What is a Daily Pass?",
      a: "A Daily Pass gives you one-day entry to any Fymble-partnered fitness studio. The fee is set by each studio. You can purchase it for any number of days up to 29 days.",
    },
    {
      id: 3,
      q: "Can I modify or cancel a booking?",
      a: "No, once booked, Daily Passes and Fitness Classes cannot be modified or cancelled. They are non-refundable. Please double-check the details before confirming your booking.",
    },
    {
      id: 4,
      q: "How do I find gyms near me?",
      a: "Fymble uses your location to discover nearby partner gyms and fitness studios. Head to the Gym section on the Home tab to browse available studios, view their facilities, pricing, and book directly.",
    },
    {
      id: 5,
      q: "What is Expert Nutrition Consultation?",
      a: "You can book a 1-hour personalized session with a certified nutrition expert for guidance on weight management, muscle gain, mindful eating, and sustainable lifestyle changes. Sessions are available via live video consultation.",
    },
  ],
  "AI & Trackers": [
    {
      id: 7,
      q: "What is the Food Scanner?",
      a: "The Food Scanner uses AI image recognition to identify foods from photos you take. Simply snap a picture of your meal and Fymble will detect the food items and estimate their nutritional values.",
    },
    {
      id: 8,
      q: "What trackers does Fymble offer?",
      a: "Fymble includes a Diet Tracker (log meals and macros), Water Tracker (daily water intake), Step Counter (synced with Apple Health or Google Fit), Workout Tracker (log exercises, sets, and reps), and a Manual Calorie Calculator.",
    },
    {
      id: 9,
      q: "How does step tracking work?",
      a: "Fymble integrates with Apple Health (iOS) and Health Connect (Android) to automatically track your daily steps, weekly progress, and daily goals. You need to grant health data permissions when prompted.",
    },
  ],
  Payments: [
    {
      id: 11,
      q: "What payment methods are supported?",
      a: "Fymble supports UPI (Google Pay, PhonePe, Paytm, Amazon Pay, BHIM), credit/debit cards, net banking, wallets, and EMI options through Razorpay.",
    },
    {
      id: 12,
      q: "What is Fymble Cash?",
      a: "Fymble Cash is an in-app credit you can earn through rewards and referrals. It can be used towards gym bookings and other services within the app.",
    },
    {
      id: 13,
      q: "My payment failed but the amount was debited. What do I do?",
      a: "If your payment was debited but the booking wasn't confirmed, the amount is usually refunded within 5-7 business days. If you don't receive the refund, please raise a support ticket with your transaction details.",
    },
  ],
  "Gym Mate & Social": [
    {
      id: 15,
      q: "What is Gym Mate?",
      a: "Gym Mate is Fymble's social fitness feature that helps you find workout partners. Create a profile with your workout goals, experience level, timing preferences, and vibe — then discover and connect with compatible fitness buddies near you.",
    },
    {
      id: 16,
      q: "How do I find a workout buddy?",
      a: "Go to the Gym Mate tab, set up your profile, and browse users with matching fitness interests. You can send friend requests, chat in real-time, and coordinate workouts together.",
    },
    {
      id: 17,
      q: "Can I block or report a Gym Mate user?",
      a: "Yes, you can block any user from the Gym Mate settings. Blocked users will not be able to see your profile or send you messages.",
    },
  ],
  "App & Account": [
    {
      id: 18,
      q: "Can I use Fymble offline?",
      a: "No, Fymble requires an active internet connection for all its services including AI coaching, gym bookings, tracking sync, and chat features.",
    },
    {
      id: 19,
      q: "Is Fymble a medical service?",
      a: "No, Fymble is not a medical provider and does not offer medical advice, diagnosis, or treatment. The AI coach and nutrition features are for general wellness guidance only. Always consult a healthcare professional for medical concerns.",
    },
    {
      id: 20,
      q: "Is my data secure?",
      a: "Yes, we use industry-standard encryption to protect your data. Health data from Apple Health or Google Fit is only accessed with your explicit permission. We never share your personal data with third parties without consent.",
    },
    {
      id: 21,
      q: "How do I delete my account?",
      a: "You can delete your account from Account Settings. This will permanently remove all your data including profile information, workout history, and chat messages.",
    },
    {
      id: 22,
      q: "How do I contact support?",
      a: 'You can reach us by using the "Raise a Ticket" option in this Help section, or email us directly at support@fymble.app. Our team is available 24/7 to assist you.',
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const BOT_DELAY = 400;

// ─── Component ───────────────────────────────────────────────────────────────

const HelpSupportScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const isSubmitting = useRef(false);

  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState("init");
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubIssue, setSelectedSubIssue] = useState(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Android keyboard handling
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

  // Scroll to bottom whenever messages change
  useEffect(() => {
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd?.({ animated: true }),
      100,
    );
    return () => clearTimeout(t);
  }, [messages]);

  // Back handler
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/client/account");
      return true;
    });
    return () => handler.remove();
  }, []);

  // Initial greeting
  useEffect(() => {
    const t = setTimeout(() => {
      addBotMessage("Hi! I'm here to help. What would you like to do?", [
        "Raise a Ticket",
        "Browse FAQs",
      ]);
      setStep("init");
    }, BOT_DELAY);
    return () => clearTimeout(t);
  }, []);

  const addBotMessage = useCallback(
    (text, chips = null, faqItems = null, listItems = null) => {
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text,
          chips,
          faqItems,
          listItems,
          id: Date.now() + Math.random(),
        },
      ]);
    },
    [],
  );

  const addUserMessage = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      { from: "user", text, id: Date.now() + Math.random() },
    ]);
  }, []);

  // ─── Chip tap handler ───────────────────────────────────────────────────────
  const handleChipTap = useCallback(
    (label) => {
      addUserMessage(label);

      switch (step) {
        case "init":
          if (label === "Browse FAQs") {
            setTimeout(() => {
              addBotMessage("Sure! Pick a topic.", Object.keys(FAQ_DATA));
              setStep("faq_topic");
            }, BOT_DELAY);
          } else {
            setTimeout(() => {
              addBotMessage("What's your issue about?", [
                ...Object.keys(CATEGORIES),
                "Other",
              ]);
              setStep("category");
            }, BOT_DELAY);
          }
          break;

        case "faq_topic":
          setTimeout(() => {
            const items = FAQ_DATA[label] || [];
            addBotMessage(
              `Here are some common questions about ${label}:`,
              null,
              items,
            );
            setTimeout(() => {
              addBotMessage(
                "Did that help? Or would you like to raise a ticket?",
                ["That helped!", "Raise a Ticket"],
              );
              setStep("faq_followup");
            }, BOT_DELAY);
          }, BOT_DELAY);
          break;

        case "faq_followup":
          if (label === "That helped!") {
            setTimeout(() => {
              addBotMessage(
                "Glad I could help! Feel free to come back anytime.",
              );
              setStep("done");
            }, BOT_DELAY);
          } else {
            setTimeout(() => {
              addBotMessage("What's your issue about?", [
                ...Object.keys(CATEGORIES),
                "Other",
              ]);
              setStep("category");
            }, BOT_DELAY);
          }
          break;

        case "category":
          setSelectedCategory(label);
          if (label === "Other") {
            setSelectedSubIssue("Other");
            setTimeout(() => {
              addBotMessage(
                "Please describe your issue in detail so we can help you better.",
              );
              setStep("description");
            }, BOT_DELAY);
          } else {
            setTimeout(() => {
              const subIssues = [
                ...(CATEGORIES[label] || []),
                "Something else",
              ];
              addBotMessage(
                "Got it. What specifically are you facing?",
                null,
                null,
                subIssues,
              );
              setStep("sub_issue");
            }, BOT_DELAY);
          }
          break;

        case "sub_issue":
          if (label === "Something else") {
            setTimeout(() => {
              addBotMessage("No worries! Pick a different category.", [
                ...Object.keys(CATEGORIES),
                "Other",
              ]);
              setStep("category");
            }, BOT_DELAY);
          } else {
            setSelectedSubIssue(label);
            setTimeout(() => {
              addBotMessage(
                "Please describe your issue in detail so we can help you better.",
              );
              setStep("description");
            }, BOT_DELAY);
          }
          break;

        default:
          break;
      }
    },
    [step, addBotMessage, addUserMessage],
  );

  // ─── Text send handler ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    if (step === "description") {
      setInput("");
      setIssueDescription(text);
      addUserMessage(text);
      Keyboard.dismiss();
      setTimeout(() => {
        addBotMessage("What's your email so we can follow up?");
        setStep("email");
      }, BOT_DELAY);
    } else if (step === "email") {
      if (!validateEmail(text)) {
        showToast({
          type: "error",
          title: "Invalid Email",
          desc: "Please enter a valid email address",
        });
        return;
      }
      if (isSubmitting.current) return;
      isSubmitting.current = true;

      setInput("");
      addUserMessage(text);
      Keyboard.dismiss();

      setTimeout(() => {
        addBotMessage(null); // loading indicator
        setStep("submitting");
      }, BOT_DELAY);

      try {
        const client_id = await AsyncStorage.getItem("client_id");
        if (!client_id) {
          showToast({
            type: "error",
            title: "Error",
            desc: "Something went wrong. Please try again later",
          });
          isSubmitting.current = false;
          return;
        }

        const payload = {
          client_id,
          subject: selectedSubIssue || selectedCategory || "General",
          email: text,
          issue: issueDescription,
        };

        const response = await supportAPI(payload);

        // Remove loading message
        setMessages((prev) => prev.filter((m) => m.text !== null));

        if (response?.status === 200) {
          const token = response?.data?.token || "FYMBLE-XXXXXX";
          addBotMessage(
            `Ticket raised successfully!\n\nYour Ticket ID: ${token}\n\nOur support team will get back to you shortly. You can track your ticket using this ID.`,
          );
          setStep("done");
        } else {
          addBotMessage(
            "Sorry, something went wrong while submitting your ticket. Please try again.",
            ["Try Again"],
          );
          setStep("retry");
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.text !== null));
        addBotMessage("Sorry, something went wrong. Please try again.", [
          "Try Again",
        ]);
        setStep("retry");
      } finally {
        isSubmitting.current = false;
      }
    }
  }, [
    input,
    step,
    selectedCategory,
    selectedSubIssue,
    issueDescription,
    addBotMessage,
    addUserMessage,
  ]);

  // Handle retry
  const handleRetry = useCallback(() => {
    addUserMessage("Try Again");
    setTimeout(() => {
      addBotMessage("What's your email so we can follow up?");
      setStep("email");
    }, BOT_DELAY);
  }, [addBotMessage, addUserMessage]);

  // ─── Start over ─────────────────────────────────────────────────────────────
  const handleStartOver = useCallback(() => {
    setMessages([]);
    setStep("init");
    setInput("");
    setSelectedCategory(null);
    setSelectedSubIssue(null);
    setIssueDescription("");
    setExpandedFaq(null);
    setTimeout(() => {
      addBotMessage("Hi! I'm here to help. What would you like to do?", [
        "Raise a Ticket",
        "Browse FAQs",
      ]);
    }, BOT_DELAY);
  }, [addBotMessage]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const showInput = step === "description" || step === "email";

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/client/account")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.botAvatar}>
            <Ionicons name="headset-outline" size={18} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Fymble Support</Text>
            <Text style={styles.headerSubtitle}>Always here to help</Text>
          </View>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => {
            // Only the last bot message with chips should be interactive
            let isLast = false;
            if (msg.from === "bot" && msg.chips) {
              isLast = !messages
                .slice(index + 1)
                .some((m) => m.from === "bot" && m.chips);
            }

            if (msg.from === "user") {
              return (
                <View key={msg.id} style={styles.userBubbleWrap}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{msg.text}</Text>
                  </View>
                </View>
              );
            }

            // Bot message
            return (
              <React.Fragment key={msg.id}>
                <View style={styles.botBubbleWrap}>
                  {msg.text === null ? (
                    // Loading indicator
                    <View style={styles.botBubble}>
                      <View style={styles.typingRow}>
                        <ActivityIndicator size="small" color="#9CA3AF" />
                        <Text style={styles.typingText}>Submitting...</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.botBubble}>
                      <Text style={styles.botBubbleText}>{msg.text}</Text>
                    </View>
                  )}

                  {/* FAQ Items (expandable) */}
                  {msg.faqItems && (
                    <View style={styles.faqContainer}>
                      {msg.faqItems.map((faq) => (
                        <TouchableOpacity
                          key={faq.id}
                          style={styles.faqCard}
                          onPress={() =>
                            setExpandedFaq(
                              expandedFaq === faq.id ? null : faq.id,
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <View style={styles.faqHeader}>
                            <Text style={styles.faqQuestion}>{faq.q}</Text>
                            <Ionicons
                              name={
                                expandedFaq === faq.id
                                  ? "chevron-up"
                                  : "chevron-down"
                              }
                              size={16}
                              color="#9CA3AF"
                            />
                          </View>
                          {expandedFaq === faq.id && (
                            <Text style={styles.faqAnswer}>{faq.a}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Chips */}
                  {msg.chips &&
                    isLast &&
                    !showInput &&
                    step !== "sub_issue" && (
                      <View style={styles.chipsWrap}>
                        {msg.chips.map((chip) => (
                          <TouchableOpacity
                            key={chip}
                            style={styles.chip}
                            onPress={() => {
                              if (step === "retry") {
                                handleRetry();
                              } else {
                                handleChipTap(chip);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.chipText}>{chip}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                  {/* Past chips (inert) */}
                  {msg.chips &&
                    (!isLast || showInput || step === "sub_issue") && (
                      <View style={styles.chipsWrap}>
                        {msg.chips.map((chip) => (
                          <View key={chip} style={styles.chipInert}>
                            <Text style={styles.chipInertText}>{chip}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                </View>

                {/* Numbered list items (sub-issues) — full width, outside bubble */}
                {msg.listItems &&
                  (() => {
                    const isLastList = !messages
                      .slice(index + 1)
                      .some((m) => m.from === "bot" && m.listItems);
                    return (
                      <View style={styles.listContainer}>
                        {msg.listItems.map((item, idx) => (
                          <TouchableOpacity
                            key={item}
                            style={[
                              styles.listItem,
                              idx === msg.listItems.length - 1 &&
                                styles.listItemLast,
                            ]}
                            onPress={() => {
                              if (isLastList && step === "sub_issue") {
                                handleChipTap(item);
                              }
                            }}
                            activeOpacity={isLastList ? 0.6 : 1}
                            disabled={!isLastList}
                          >
                            <View
                              style={[
                                styles.listItemNumber,
                                !isLastList && styles.listItemNumberInert,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.listItemNumberText,
                                  !isLastList && styles.listItemNumberTextInert,
                                ]}
                              >
                                {idx + 1}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.listItemText,
                                !isLastList && styles.listItemTextInert,
                              ]}
                              numberOfLines={2}
                            >
                              {item}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={isLastList ? "#007AFF" : "#D1D5DB"}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}
              </React.Fragment>
            );
          })}

          {/* Start over button when done */}
          {step === "done" && (
            <View style={styles.startOverWrap}>
              <TouchableOpacity
                style={styles.startOverBtn}
                onPress={handleStartOver}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#007AFF" />
                <Text style={styles.startOverText}>Start New Conversation</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        {showInput && (
          <View
            style={[
              styles.inputBarSafe,
              Platform.OS === "android" && { paddingBottom: keyboardHeight },
            ]}
          >
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder={
                  step === "email"
                    ? "Enter your email..."
                    : "Describe your issue..."
                }
                placeholderTextColor="#9CA3AF"
                keyboardType={step === "email" ? "email-address" : "default"}
                multiline={step === "description"}
                returnKeyType="send"
                onSubmitEditing={step === "email" ? handleSend : undefined}
                autoCapitalize={step === "email" ? "none" : "sentences"}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !input.trim() && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={!input.trim()}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172B",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "500",
    marginTop: 1,
  },

  // Chat area
  chatArea: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Bot bubble
  botBubbleWrap: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    marginBottom: 12,
  },
  botBubble: {
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botBubbleText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },

  // User bubble
  userBubbleWrap: {
    alignSelf: "flex-end",
    maxWidth: "90%",
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubbleText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // Chips
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  chipInert: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  chipInertText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // Numbered list items
  listContainer: {
    marginTop: -2,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  listItemNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  listItemNumberInert: {
    backgroundColor: "#F3F4F6",
  },
  listItemNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007AFF",
  },
  listItemNumberTextInert: {
    color: "#9CA3AF",
  },
  listItemText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    color: "#1A1A1A",
    lineHeight: 18,
  },
  listItemTextInert: {
    color: "#9CA3AF",
  },

  // FAQ items
  faqContainer: {
    marginTop: 10,
    gap: 6,
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  faqAnswer: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  // Input bar
  inputBarSafe: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#1A1A1A",
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#B0D4FF",
  },

  // Start over
  startOverWrap: {
    alignItems: "center",
    marginTop: 16,
  },
  startOverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#FFFFFF",
  },
  startOverText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
});

export default HelpSupportScreen;
