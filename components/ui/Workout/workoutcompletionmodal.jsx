import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { MaskedText } from "../MaskedText";

const { width, height } = Dimensions.get("window");

const WorkoutCompletionModal = ({
  visible,
  onClose,
  onAddImage,
  image,
  type,
  caloriesBurned,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isNewImage, setIsNewImage] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedImage(image);
      setIsNewImage(!!image);
    }
  }, [visible, image]);

  const handleClose = () => {
    onClose();
  };

  const handleChangeImage = () => {
    onAddImage();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={["#297DB3", "#183243"]}
          style={styles.modalContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.confettiContainer}>
            <Ionicons
              name="star"
              size={24}
              color="#FFD700"
              style={styles.star1}
            />
            <Ionicons
              name="star"
              size={20}
              color="#FFD700"
              style={styles.star2}
            />
            <Ionicons
              name="star"
              size={16}
              color="#FFD700"
              style={styles.star3}
            />
          </View>

          <Text style={styles.congratsText}>
            {type == "workout"
              ? isNewImage
                ? "Image Uploaded"
                : "Congratulations!"
              : isNewImage
                ? "Image Uploaded"
                : "Upload Image"}
          </Text>
          <Text style={styles.subText}>
            {type == "workout"
              ? isNewImage
                ? "You can view this image in report section"
                : "You've completed your workout"
              : isNewImage
                ? "You can view this image in report section"
                : "Please attach your Image here"}
          </Text>

          <View style={styles.imageContainer}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.progressImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                {caloriesBurned ? (
                  <View style={styles.caloriesDisplay}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        gap: 4,
                      }}
                    >
                      <MaskedText
                        bg1="#fb2703"
                        bg2="#fced81"
                        text={caloriesBurned}
                        textStyle={styles.headerText}
                      >
                        {caloriesBurned}
                      </MaskedText>
                      <MaskedText
                        bg1="#fb2703"
                        bg2="#fced81"
                        text="kcal"
                        textStyle={styles.headerTextSmall}
                      >
                        kcal
                      </MaskedText>
                    </View>
                    <Image
                      source={require("../../../assets/images/calories.png")}
                      style={{ width: 38, height: 50 }}
                    />
                    <Text style={styles.caloriesLabel}>Calories Burned</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="image-outline" size={40} color="#FFF" />
                    <Text style={styles.placeholderText}>
                      Add progress photo
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <FontAwesome name="star" size={16} color="#FFD700" />
            <Text style={styles.infoText}>
              Track your fitness journey by adding progress photos
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.addPhotoButton]}
              onPress={handleChangeImage}
            >
              <Ionicons
                name="camera"
                size={20}
                color="#FFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>
                {selectedImage ? "Change Photo" : "Add Photo"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={handleClose}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="#FFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              View your progress photos anytime in Workout Reports
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.85,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  confettiContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  star1: {
    position: "absolute",
    top: "10%",
    left: "15%",
  },
  star2: {
    position: "absolute",
    top: "20%",
    right: "20%",
  },
  star3: {
    position: "absolute",
    bottom: "15%",
    left: "20%",
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
    textAlign: "center",
  },
  imageContainer: {
    width: width * 0.7,
    height: height * 0.25,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  progressImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 10,
    color: "#FFF",
    fontSize: 14,
  },
  caloriesDisplay: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    width: "100%",
    height: "100%",
  },
  caloriesNumber: {
    fontSize: 45,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerText: {
    fontSize: 45,
    fontWeight: "bold",
  },
  headerTextSmall: {
    fontSize: 16,
  },
  caloriesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    textTransform: "uppercase",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 10,
  },
  flameIcon: {
    marginTop: 12,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  infoText: {
    color: "#FFF",
    fontSize: 12,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 0.48,
  },
  addPhotoButton: {
    backgroundColor: "#297DB3",
  },
  closeButton: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  noteContainer: {
    width: "100%",
    alignItems: "center",
  },
  noteText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default WorkoutCompletionModal;
