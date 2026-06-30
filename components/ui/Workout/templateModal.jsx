import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const TemplateModal = ({
  visible,
  onClose,
  onSubmit,
  initialValue = "",
  mode = "create", // or 'edit'
}) => {
  const [templateName, setTemplateName] = useState(initialValue);
  const [error, setError] = useState("");

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTemplateName(initialValue);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible, initialValue]);

  const handleSubmit = () => {
    if (!templateName.trim()) {
      setError("Template name is required.");
      return;
    }
    Keyboard.dismiss();
    setError("");
    onSubmit(templateName.trim());
  };

  const closeAll = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableWithoutFeedback onPress={closeAll}>
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
              ]}
            >
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons name="close" size={20} color="#297DB3" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>
                {mode === "edit" ? "Edit Template" : "Create a template"}
              </Text>
              <LinearGradient
                colors={["#297DB3", "#183243"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.inputWrapper}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Ex:My Monday Workout"
                  placeholderTextColor="#999"
                  value={templateName}
                  onChangeText={(text) => {
                    setTemplateName(text);
                    if (error) setError("");
                  }}
                />
              </LinearGradient>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={["#297DB3", "#183243"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.gradientButtonText}>
                    {mode === "edit" ? "Update →" : "Add →"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default TemplateModal;

const styles = {
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  closeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
    // marginBottom: 20,
    color: "#000",
  },
  inputWrapper: {
    width: "100%",
    padding: 1.5,
    borderRadius: 12,
    marginVertical: 50,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },

  gradientButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  gradientButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
};
