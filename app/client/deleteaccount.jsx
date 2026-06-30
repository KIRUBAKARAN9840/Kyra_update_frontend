import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { showToast } from "../../utils/Toaster";
import { deleteAccountAPI, getDelete } from "../../services/clientApi";

// Final Confirmation Modal
const FinalConfirmationModal = ({
  isVisible,
  onClose,
  onConfirm,
  feedback,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.finalConfirmationContainer}>
          <View style={styles.dangerIconContainer}>
            <Ionicons name="warning-outline" size={48} color="#dc3545" />
          </View>

          <Text style={styles.finalConfirmationTitle}>Final Confirmation</Text>

          <Text style={styles.finalConfirmationText}>
            This action is irreversible. Once you confirm, your account and all
            data will be permanently deleted within 30 days.
          </Text>

          <View style={styles.finalConfirmationButtons}>
            <TouchableOpacity
              style={styles.cancelFinalButton}
              onPress={onClose}
            >
              <Text style={styles.cancelFinalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteFinalButton]}
              onPress={onConfirm}
            >
              <Text style={styles.deleteFinalButtonText}>Delete Forever</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const DeleteAccountPage = () => {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isFinalModalVisible, setFinalModalVisible] = useState(false);

  const handleKeepAccount = () => {
    router.back();
  };

  const handleDeleteAccount = () => {
    setFinalModalVisible(true);
  };

  const handleFinalConfirmation = async () => {
    try {
      // Get client_id from AsyncStorage
      const client_id = await AsyncStorage.getItem("client_id");

      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Client ID not found. Please try again.",
        });
        return;
      }

      // First check if account deletion is already under process
      const checkResponse = await getDelete(client_id);

      if (checkResponse?.exists) {
        setFinalModalVisible(false);
        showToast({
          type: "info",
          title: "Already In Process",
          desc: "Account deletion is already under process.",
        });
        return;
      }

      // If not already in process, proceed with deletion
      const response = await deleteAccountAPI({
        client_id,
        feedback: feedback || "",
      });

      if (response?.status === 200) {
        setFinalModalVisible(false);

        // Clear all stored data
        await AsyncStorage.clear();
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");

        showToast({
          type: "success",
          title: "Account Deletion Scheduled",
          desc: "Account deletion is already under process.",
        });

        // Navigate to login/onboarding screen
        router.push("/");
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.message || "Failed to delete account. Please try again.",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to delete account. Please try again.",
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warning Icon */}
        <View style={styles.warningSection}>
          <View style={styles.warningIconCircle}>
            <Ionicons name="warning" size={48} color="#dc3545" />
          </View>
          <Text style={styles.warningTitle}>
            This action will permanently delete your account in 30 days
          </Text>
        </View>

        {/* Data Loss Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="fitness-outline" size={20} color="#dc3545" />
            <Text style={styles.infoText}>
              Your workout tracking and progress details will be deleted
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="nutrition-outline" size={20} color="#dc3545" />
            <Text style={styles.infoText}>
              Your diet tracking and progress details will be deleted
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={20} color="#dc3545" />
            <Text style={styles.infoText}>
              Your community feed posts will be deleted
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="trophy-outline" size={20} color="#dc3545" />
            <Text style={styles.infoText}>
              Your reward points and leaderboard rankings will be deleted
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#dc3545" />
            <Text style={styles.infoText}>
              Your personal details like mobile, email, name will be deleted
            </Text>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.additionalInfo}>
          <Text style={styles.additionalInfoText}>
            You can log in at any time within the next 30 days to cancel the
            deletion of your account.
          </Text>
        </View>

        {/* Feedback Section */}
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel}>Feedback (optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Help us improve by telling us why you're leaving..."
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.keepAccountButton}
          onPress={handleKeepAccount}
        >
          <Text style={styles.keepAccountButtonText}>
            Keep your account with Fymble
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.deleteButtonText}>Delete my account</Text>
        </TouchableOpacity>
      </View>

      <FinalConfirmationModal
        isVisible={isFinalModalVisible}
        onClose={() => {
          setFinalModalVisible(false);
          setDeleteConfirmation("");
        }}
        onConfirm={handleFinalConfirmation}
        feedback={deleteConfirmation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  warningIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    lineHeight: 28,
    paddingHorizontal: 20,
  },
  infoSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginLeft: 12,
    lineHeight: 20,
  },
  additionalInfo: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  additionalInfoText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  feedbackSection: {
    marginBottom: 30,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    minHeight: 100,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
  },
  keepAccountButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  keepAccountButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  deleteButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "500",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  finalConfirmationContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    padding: 24,
    alignItems: "center",
    maxWidth: 400,
  },
  dangerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  finalConfirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 12,
  },
  finalConfirmationText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  finalConfirmationWarning: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  confirmationInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  finalConfirmationButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelFinalButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelFinalButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteFinalButton: {
    flex: 1,
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteFinalButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  deleteFinalButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default DeleteAccountPage;
