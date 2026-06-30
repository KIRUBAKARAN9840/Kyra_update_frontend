import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

const PremiumRequiredModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {/* Premium Badge */}
          <View style={styles.badgeContainer}>
            <Image
              source={require("../../../assets/images/payment/premium.png")}
              style={styles.badgeIcon}
              tintColor={"#FF5757"}
              resizeMode="contain"
            />
            <MaskedView
              maskElement={<Text style={styles.badgeText}>PREMIUM</Text>}
            >
              <LinearGradient
                colors={["#FF5757", "#FFA6A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.badgeText, { opacity: 0 }]}>PREMIUM</Text>
              </LinearGradient>
            </MaskedView>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="lock" size={48} color="#FF5757" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Premium Required</Text>

          {/* Description */}
          <Text style={styles.description}>
            You need a premium subscription to post content and share your
            fitness journey with the community.
          </Text>

          {/* Subscribe Button (Android only) */}
          {Platform.OS === "android" && (
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => {
                onClose();
                router.push("/client/subscription");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#FF5757", "#FF8585"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Subscribe Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 87, 87, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 87, 87, 0.3)",
    marginBottom: 20,
  },
  badgeIcon: {
    width: 18,
    height: 18,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#FF5757",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 87, 87, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  subscribeButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  iosNote: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default PremiumRequiredModal;
