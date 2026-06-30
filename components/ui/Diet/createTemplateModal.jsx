import React, { useState } from "react";
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const CreateTemplateModal = ({
  visible,
  value,
  onChange,
  onSubmit,
  onClose,
}) => {
  // const [input, setInput] = useState("");

  const handleInput = (text) => {
    onChange(text);
  };

  return (
    <Modal
      onRequestClose={onClose}
      transparent
      visible={visible}
      animationType="fade"
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%", alignItems: "center" }}
        >
          <TouchableOpacity style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.title}>Create Template</Text>
            {/* <Text style={styles.subtitle}>We've got you covered!</Text> */}

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={handleInput}
                placeholder="Ex:- My Monday Meal "
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity onPress={onSubmit} style={styles.buttonWrapper}>
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Add</Text>
                <Ionicons
                  name="arrow-forward-outline"
                  color={"#fff"}
                ></Ionicons>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    width: width * 0.9,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: "center",
  },
  image: {
    width: 150,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 25,
    color: "#0A0A0A",
  },
  subtitle: {
    fontSize: 12,
    color: "#777",
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "green",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 0,
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  input: {
    // paddingVertical: 8,
    // paddingHorizontal: 8,
    fontSize: 14,
    flex: 1,
    color: "#000",
    height: 40,
  },
  buttonWrapper: {
    width: "35%",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 5,
  },
});

export default CreateTemplateModal;
