import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Keyboard,
} from "react-native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { showToast } from "../../utils/Toaster";

const { width, height } = Dimensions.get("window");

const MessageForm = ({ client, onSubmit, onClose }) => {
  const [messageState, setMessageState] = useState({
    title: "",
    description: "",
    isSubmitting: false,
  });

  const slideAnim = useState(new Animated.Value(height))[0];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    const { title, description } = messageState;

    if (!title.trim() || !description.trim()) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please fill in all fields",
      });
      return;
    }

    setMessageState((prev) => ({ ...prev, isSubmitting: true }));
    Keyboard.dismiss();

    try {
      // Wait a brief moment for keyboard to dismiss
      await new Promise((resolve) => setTimeout(resolve, 100));

      await onSubmit({
        recipientName: client.name,
        title,
        description,
      });

      setMessageState({
        title: "",
        description: "",
        isSubmitting: false,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to send message",
      });
      setMessageState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleInputChange = (field) => (text) => {
    setMessageState((prev) => ({
      ...prev,
      [field]: text,
    }));
  };

  const { title, description, isSubmitting } = messageState;

  return (
    <Animated.View
      style={[
        styles.fullScreen,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.safeArea}>
        <View style={styles.messageHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome5 name="times" size={width * 0.06} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Message</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.messageContainer}>
          <View style={styles.recipientContainer}>
            <Text style={styles.recipientText}>To: {client.name}</Text>
          </View>

          <TextInput
            style={styles.messageInput}
            placeholder="Message Title"
            value={title}
            onChangeText={handleInputChange("title")}
            placeholderTextColor="#666"
          />

          <TextInput
            style={[styles.messageInput, styles.messageDescription]}
            placeholder="Type your message here..."
            value={description}
            onChangeText={handleInputChange("description")}
            multiline
            numberOfLines={4}
            placeholderTextColor="#666"
          />

          <TouchableOpacity
            style={styles.messageSubmitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.messageSubmitText}>
              {isSubmitting ? "Sending..." : "Send Message"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: width * 0.04,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  closeButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    fontSize: width * 0.045,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: width * 0.1,
  },
  messageContainer: {
    flex: 1,
    padding: width * 0.04,
  },
  recipientContainer: {
    marginBottom: width * 0.03,
  },
  recipientText: {
    fontSize: width * 0.04,
    fontWeight: "500",
    color: "#333",
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: width * 0.03,
    marginBottom: width * 0.03,
    fontSize: width * 0.035,
    color: "#333",
  },
  messageDescription: {
    height: width * 0.4,
    textAlignVertical: "top",
  },
  messageSubmitButton: {
    backgroundColor: "#FF5757",
    padding: width * 0.03,
    borderRadius: 4,
    alignItems: "center",
  },
  messageSubmitText: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "600",
  },
});

export default MessageForm;
