import React from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

// Image is 328×574 → maintain that ratio
const IMG_WIDTH = width * 0.82;
const IMG_HEIGHT = IMG_WIDTH * (574 / 328);

const GYMMATE_IMAGES = {
  gymmate1: require("../../../assets/images/modal/modal_gymmate_1.webp"),
  gymmate2: require("../../../assets/images/modal/modal_gymmate_2.webp"),
};

const CenterModal = ({ visible, modalType, onClose, onImagePress }) => {
  if (!visible || !GYMMATE_IMAGES[modalType]) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Close button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Image — tappable */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              onClose();
              onImagePress?.();
            }}
          >
            <Image
              source={GYMMATE_IMAGES[modalType]}
              style={s.image}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
  },
  closeBtn: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 20,
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  image: {
    width: IMG_WIDTH,
    height: IMG_HEIGHT,
    borderRadius: 16,
  },
});

export default CenterModal;
