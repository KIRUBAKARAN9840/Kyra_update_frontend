import { useMemo } from "react";
import {
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fittbotLogo = require("../assets/images/logo_pay.png");
const googlePlayBadge = require("../assets/images/googleplay_version.png");
const appStoreBadge = require("../assets/images/appstore_version.png");

const ForceUpdateModal = ({ visible, info, onUpdate }) => {
  const insets = useSafeAreaInsets();

  const appName = "Fymble";
  const primaryLabel = info?.button_label || "Update Now";

  const storeBadge =
    Platform.OS === "android" ? googlePlayBadge : appStoreBadge;

  const handlePress = async () => {
    if (typeof onUpdate === "function") {
      await onUpdate();
      return;
    }

    const url = info?.update_url;

    if (!url) {
      console.error("No update URL provided");
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.error("Cannot open URL:", url);
      }
    } catch (error) {
      console.error("Failed to open store URL:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        // Prevent modal from closing
      }}
    >
      <View style={[styles.backdrop, { paddingTop: insets.top }]}>
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.content}>
            {/* App Logo */}
            <View style={styles.logoContainer}>
              <Image source={fittbotLogo} style={styles.appIcon} />
            </View>

            {/* App Name */}
            <Text style={styles.appTitle}>{appName}</Text>

            {/* Message */}
            <Text style={styles.message}>
              A new version is available. Please update to continue using the
              app.
            </Text>

            {/* Store Badge */}
            <Image source={storeBadge} style={styles.storeBadge} />
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  content: {
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    resizeMode: "contain",
  },
  appTitle: {
    color: "#333",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    color: "#666",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  storeBadge: {
    width: Platform.OS === "android" ? 160 : 140,
    height: Platform.OS === "android" ? 60 : 50,
    resizeMode: "contain",
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    marginBottom: 16,
    shadowColor: "#FF5757",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default ForceUpdateModal;
