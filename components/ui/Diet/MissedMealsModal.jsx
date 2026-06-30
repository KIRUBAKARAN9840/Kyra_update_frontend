import React, { useState } from "react";
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";

const { width, height } = Dimensions.get("window");

const MissedMealsModal = ({
  visible,
  date,
  onChangeDate,
  onSubmit,
  onClose,
}) => {
  const [addDatePicker, setAddDatePicker] = useState(false);
  const [dateAdd, setDateAdd] = useState(new Date());

  const handleDateChange = (event, date) => {
    if (date) {
      setAddDatePicker(false);
      onChangeDate(date);
      setDateAdd(date);
      onSubmit(date);
    }
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
            <Text style={styles.title}>Catch Up on Missed Meals</Text>
            <Text style={styles.subtitle}>We've got you covered!</Text>

            <TouchableOpacity
              //   style={styles.dateSelector}
              onPress={() => setAddDatePicker(true)}
            >
              <View style={styles.inputWrapper}>
                <View style={styles.input}>
                  {format(dateAdd, "MMMM dd, yyyy") ? (
                    <Text style={{ color: "#000000" }}>
                      {format(dateAdd, "MMMM dd, yyyy")}
                    </Text>
                  ) : (
                    <Text style={{ color: "#999" }}>DD-MM-YYYY</Text>
                  )}
                </View>
                <Ionicons name="calendar" size={24} color="green" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.buttonWrapper}>
              <LinearGradient
                colors={["#28A745", "#007BFF"]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Enter</Text>
              </LinearGradient>
            </TouchableOpacity>

            {addDatePicker && (
              <DateTimePicker
                value={dateAdd}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
                textColor="#000000"
                maximumDate={new Date()} // 👈 disables future dates
                onChange={(event, date) => {
                  handleDateChange(event, date);
                }}
              />
            )}
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
    marginBottom: 4,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    flex: 1,
    color: "#000",
  },
  buttonWrapper: {
    width: "35%",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default MissedMealsModal;
