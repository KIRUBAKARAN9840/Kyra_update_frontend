import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import UserHeaderWithMenu from "../../components/ui/Header";
import { showToast } from "../../utils/Toaster";
import { toIndianISOString } from "../../utils/basicUtilFunctions";

const { width, height } = Dimensions.get("window");
const isSmallScreen = width < 375;
const isLargeScreen = width > 600;

const muscleGroups = ["Chest", "Shoulders", "Legs", "Back", "Arms", "Abs"];

const addImage = () => {
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [punchInTime, setPunchInTime] = useState(null);
  const [image, setImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const handleMuscleSelection = (muscle) => {
    setSelectedMuscle(muscle === selectedMuscle ? null : muscle);
  };

  const generateFilename = (muscle) => {
    const randomId = Math.random().toString().slice(2);
    const date = toIndianISOString(new Date()).split("T")[0];
    return `${randomId}_${muscle}_${date}.jpg`;
  };

  const setupImageDirectory = async () => {
    const dirUri = `${FileSystem.documentDirectory}FymbleImages/`;
    const dirInfo = await FileSystem.getInfoAsync(dirUri);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
    }

    return dirUri;
  };

  const handleImageUpload = async () => {
    if (!selectedMuscle) return;

    try {
      const { status } = await Camera.requestCameraPermissionsAsync();

      if (status !== "granted") {
        alert("Sorry, we need camera permissions to make this work!");
        return;
      }

      const dirUri = await setupImageDirectory();
      const newFilename = generateFilename(selectedMuscle);
      const newFileUri = `${dirUri}${newFilename}`;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await FileSystem.copyAsync({
          from: result.assets[0].uri,
          to: newFileUri,
        });

        setImage(newFileUri);
        setModalVisible(true);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to process the image. Please try again later",
      });
    }
  };

  return (
    <View style={styles.container}>
      <UserHeaderWithMenu routePath="/client/home" />

      <View style={styles.contentContainer}>
        <Text style={styles.sectionTitle}>
          Upload an image today and view your progress tomorrow!!
        </Text>

        <ScrollView contentContainerStyle={styles.muscleGroupContainer}>
          {muscleGroups.map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.muscleGroup,
                selectedMuscle === muscle && styles.selectedMuscleGroup,
                punchInTime && styles.disabledMuscleGroup,
              ]}
              onPress={() => handleMuscleSelection(muscle)}
              disabled={!!punchInTime}
            >
              <Text
                style={[
                  styles.muscleGroupText,
                  selectedMuscle === muscle && styles.selectedMuscleGroupText,
                  punchInTime && styles.disabledMuscleGroupText,
                ]}
              >
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.sectionTitle}>
            Select 🦾 Muscle group to upload the image.
          </Text>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            !selectedMuscle && styles.disabledButton,
          ]}
          onPress={handleImageUpload}
          disabled={!selectedMuscle}
        >
          <Text style={styles.uploadButtonText}>Upload Workout Image</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Image Uploaded Successfully!
              </Text>
              {image && (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    backgroundColor: "#FF5757",
    paddingVertical: height * 0.018,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  headerText: {
    fontSize: isSmallScreen ? 22 : 24,
    fontWeight: "bold",
    color: "#fff",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  muscleGroupContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  muscleGroup: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#FF5757",
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    margin: 5,
  },
  disabledMuscleGroup: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
  },
  selectedMuscleGroup: {
    backgroundColor: "#FF5757",
  },
  muscleGroupText: {
    color: "#FF5757",
    fontWeight: "bold",
  },
  selectedMuscleGroupText: {
    color: "#FFF",
  },
  disabledMuscleGroupText: {
    color: "#9E9E9E",
  },
  uploadButton: {
    backgroundColor: "#FF5757",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  uploadButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  punchInButton: {
    backgroundColor: "#FF5757",
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  successMessageContainer: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 20,
  },
  successMessageText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  bottomSpacer: {
    height: 50,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  uploadedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalCloseButton: {
    backgroundColor: "#FF5757",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalCloseButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default addImage;
