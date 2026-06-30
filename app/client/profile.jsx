import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  clientAvatarsAPI,
  editAvatarAPI,
  editClientProfileAPI,
  getClientProfileDetailsAPI,
  initiateContactChangeAPI,
  verifyContactChangeAPI,
} from "../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomPicker from "../../components/ui/CustomPicker";
import { Image, ImageBackground } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { showToast } from "../../utils/Toaster";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import axiosInstance from "../../services/axiosInstance";
import SkeletonProfile from "../../components/ui/Home/skeletonProfile";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { useUser } from "../../context/UserContext";
const { width, height } = Dimensions.get("window");

const AvatarSelectionModal = ({
  isVisible,
  onClose,
  onSelect,
  selectedAvatar,
  avatarOptions,
  onSubmit,
  onUploadAvatar,
}) => {
  const [isImagePickerVisible, setImagePickerVisible] = useState(false);

  const pickImage = async (sourceType) => {
    if (sourceType === "gallery") {
      const galleryStatus =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryStatus.status !== "granted") {
        showToast({
          type: "error",
          title: "Permission Denied",
          desc: "Sorry, we need gallery permissions to make this work!",
        });
        return;
      }
    } else {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== "granted") {
        showToast({
          type: "error",
          title: "Permission Denied",
          desc: "Sorry, we need camera permissions to make this work!",
        });
        return;
      }
    }

    try {
      let result;

      if (sourceType === "gallery") {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        });
      } else {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        });
      }

      if (!result.canceled) {
        onUploadAvatar(result.assets[0].uri);
        setImagePickerVisible(false);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to pick image. Please try again.",
      });
    }
  };

  // Component for image source selection (Camera or Gallery)
  const ImagePickerOptions = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isImagePickerVisible}
      onRequestClose={() => setImagePickerVisible(false)}
    >
      <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
        <View style={styles.imagePickerContainer}>
          <View style={styles.imagePickerHeader}>
            <Text style={styles.imagePickerTitle}>Choose Image Source</Text>
            <TouchableOpacity onPress={() => setImagePickerVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              pickImage("camera");
            }}
          >
            <Ionicons name="camera" size={24} color="#3498db" />
            <Text style={styles.imagePickerOptionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imagePickerOption}
            onPress={() => {
              pickImage("gallery");
            }}
          >
            <Ionicons name="images" size={24} color="#3498db" />
            <Text style={styles.imagePickerOptionText}>
              Choose from Gallery
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
        <View style={styles.avatarModalContainer}>
          <View style={styles.passwordModalHeader}>
            <Text style={styles.passwordModalTitle}>
              Choose Your Profile Image
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ width: "100%" }}>
            <View style={styles.avatarGrid}>
              {avatarOptions?.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === avatar.avatarurl &&
                      styles.selectedAvatarOption,
                  ]}
                  onPress={() => onSelect(avatar.avatarurl)}
                >
                  <Image source={avatar.avatarurl} style={styles.avatarImage} />
                  {selectedAvatar === avatar.avatarurl && (
                    <View style={styles.selectedCheckmark}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#fff"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addAvatarOption}
                onPress={() => setImagePickerVisible(true)}
              >
                <View style={styles.addAvatarGradient}>
                  <Ionicons name="add-circle" size={36} color="#3498db" />
                  <Text
                    style={{
                      color: "#3498db",
                      fontSize: 12,
                      fontWeight: "600",
                      marginTop: 4,
                      textAlign: "center",
                    }}
                  >
                    Upload
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View>
            <Text style={styles.passwordModalSubTitle}>
              Choose from the list of avatars/Upload from your gallery or Camera
              using +.
            </Text>
          </View>
          <TouchableOpacity style={styles.saveChangesButton} onPress={onSubmit}>
            <Text style={styles.saveChangesText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ImagePickerOptions />
    </Modal>
  );
};
const FullImageModal = ({ isVisible, imageSource, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.fullImageModalOverlay}>
        <View style={styles.fullImageModalContent}>
          <TouchableOpacity
            style={styles.fullImageCloseButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Image
            source={imageSource}
            style={styles.fullImage}
            contentFit="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

const DeleteConfirmationModal = ({ isVisible, onClose, onConfirm }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.deleteConfirmationContainer}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={48} color="#e74c3c" />
          </View>

          <Text style={styles.deleteConfirmationTitle}>
            Are you absolutely sure?
          </Text>

          <Text style={styles.deleteConfirmationText}>
            This action cannot be undone. Your account and all associated data
            will be permanently deleted.
          </Text>

          <View style={styles.deleteConfirmationButtons}>
            <TouchableOpacity
              style={styles.cancelDeleteButton}
              onPress={onClose}
            >
              <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={onConfirm}
            >
              <Text style={styles.confirmDeleteButtonText}>Yes, Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ProfileScreen = () => {
  const [profileData, setProfileData] = useState(null);
  useLocalSearchParams();
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [isAvatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dob, setDob] = useState(null);
  const [tempDob, setTempDob] = useState(null);
  const [isFullImageModalVisible, setFullImageModalVisible] = useState(false);
  const [fullImageSource, setFullImageSource] = useState(null);
  const [customAvatarUri, setCustomAvatarUri] = useState(null);
  const [isDeleteConfirmationVisible, setDeleteConfirmationVisible] =
    useState(false);
  const [load, setLoad] = useState(false);
  const [changeMobileVisible, setChangeMobileVisible] = useState(false);
  const [changeMobileStep, setChangeMobileStep] = useState(1);
  const [newContact, setNewContact] = useState("");
  const [oldOtp, setOldOtp] = useState("");
  const [newOtp, setNewOtp] = useState("");
  const [changeMobileLoading, setChangeMobileLoading] = useState(false);
  const { clearUserData } = useUser();
  const handleImageClick = (imageSource) => {
    setFullImageSource(imageSource);
    setFullImageModalVisible(true);
  };

  const insets = useSafeAreaInsets();

  const router = useRouter();
  const [editData, setEditData] = useState({
    name: "",
    dob: "",
    height: "",
    heightUnit: "cm",
    heightFeet: "",
    heightInches: "",
    lifestyle: "",
    goal: "",
    gender: "",
  });

  const handleDeleteConfirmation = () => {
    setDeleteConfirmationVisible(false);
    showToast({
      type: "success",
      title: "Account Deleted",
      desc: "Your account has been scheduled for deletion",
    });
    router.replace("/login");
  };

  const renderGoalText = (goal) => {
    switch (goal) {
      case "weight_loss":
        return "Weight Loss";
      case "weight_gain":
        return "Weight Gain";
      case "muscle_gain":
        return "Muscle Gain";
      case "maintain":
        return "Body Recomposition";
      default:
        return goal;
    }
  };

  const renderLifestyleText = (lifestyle) => {
    switch (lifestyle) {
      case "sedentary":
        return "Sedentary";
      case "lightly_active":
        return "Lightly Active";
      case "moderately_active":
        return "Moderately Active";
      case "very_active":
        return "Very Active";
      case "extremely_active":
        return "Extremely Active";
      default:
        return lifestyle;
    }
  };

  const handleEditPress = () => {
    const currentHeight = profileData?.height
      ? parseFloat(profileData.height)
      : 0;
    const heightInFeet = Math.floor(currentHeight / 30.48);
    const heightInInches = Math.round((currentHeight % 30.48) / 2.54);

    // Set initial dob state from profileData
    if (profileData?.dob) {
      const dobDate = new Date(profileData.dob);
      setDob(dobDate);
      setTempDob(dobDate);
    }

    setEditData({
      name: profileData?.name || "",
      dob: profileData?.dob || "",
      height: profileData?.height || "",
      heightUnit: "cm",
      heightFeet: heightInFeet.toString() || "",
      heightInches: heightInInches.toString() || "",
      lifestyle: profileData?.lifestyle || "",
      goal: profileData?.goal || "",
      gender: profileData?.gender?.toLowerCase() || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditSubmit = async () => {
    try {
      let heightInCm = editData.height;
      if (editData.heightUnit === "feet") {
        const feet = parseFloat(editData.heightFeet) || 0;
        const inches = parseFloat(editData.heightInches) || 0;
        heightInCm = (feet * 12 + inches) * 2.54;
        heightInCm = parseFloat(heightInCm.toFixed(1));
      } else {
        heightInCm = parseFloat(heightInCm) || undefined;
      }

      // Format date to SQL format
      let formattedDob = editData.dob;
      if (editData.dob && editData.dob.includes("/")) {
        const [day, month, year] = editData.dob.split("/");
        formattedDob = `${year}-${month.padStart(2, "0")}-${day.padStart(
          2,
          "0",
        )}`;
      }

      const payload = {
        name: editData.name || undefined,
        gender: editData.gender || undefined,
        dob: formattedDob || undefined,
        height: heightInCm,
        lifestyle: editData.lifestyle || undefined,
        goal: editData.goal || undefined,
      };

      // Remove undefined keys
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      const response = await editClientProfileAPI(payload);
      if (response?.status === 200) {
        if (payload.gender) {
          await AsyncStorage.setItem("gender", payload.gender);
        }
        showToast({
          type: "success",
          title: "Success",
          desc: "Profile Updated Successfully",
        });
        setIsEditing(false);
        await getProfileData();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to update profile",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to update profile",
      });
    }
  };

  const handleOpenChangeMobile = () => {
    setChangeMobileStep(1);
    setNewContact("");
    setOldOtp("");
    setNewOtp("");
    setChangeMobileVisible(true);
  };

  const handleInitiateContactChange = async () => {
    if (!newContact || newContact.length < 10) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter a valid mobile number",
      });
      return;
    }
    setChangeMobileLoading(true);
    try {
      const response = await initiateContactChangeAPI({
        new_contact: newContact,
      });
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "OTP Sent",
          desc: "OTP sent to both old and new mobile numbers",
        });
        setChangeMobileStep(2);
      } else {
        Alert.alert(
          "Error",
          response?.detail || "Failed to initiate contact change",
        );
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    } finally {
      setChangeMobileLoading(false);
    }
  };

  const handleVerifyContactChange = async () => {
    setChangeMobileLoading(true);
    try {
      const response = await verifyContactChangeAPI({
        old_otp: oldOtp,
        new_otp: newOtp,
      });
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: "Mobile number changed successfully. Please login again.",
        });
        setChangeMobileVisible(false);
        // Logout - same as settings.jsx
        await AsyncStorage.removeItem("gym_id");
        await AsyncStorage.removeItem("client_id");
        await AsyncStorage.removeItem("gym_name");
        await AsyncStorage.removeItem("gender");
        await AsyncStorage.removeItem("role");
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        clearUserData();
        router.replace("/");
      } else {
        Alert.alert("Error", response?.detail || "OTP verification failed");
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong",
      });
    } finally {
      setChangeMobileLoading(false);
    }
  };

  const getProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await getClientProfileDetailsAPI();

      if (response?.status === 200) {
        setProfileData(response?.data);
        setSelectedAvatar(response?.data?.profile);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Failed to fetch profile data",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something Went Wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
  };

  const avatarSelect = async () => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something Went Wrong. Please try again later",
        });
      }
      const response = await clientAvatarsAPI(client_id);
      if (response?.status === 200) {
        setAvatarModalVisible(true);
        setAvatarOptions(response?.data);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error Fetching Avatars",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something Went Wrong. Please try again later",
      });
    }
  };

  const handleAvatarSubmit = async () => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something Went Wrong. Please try again later",
        });
      }
      const payload = {
        client_id,
        profile: selectedAvatar,
      };
      const response = await editAvatarAPI(payload);
      if (response?.status === 200) {
        setAvatarModalVisible(false);

        await getProfileData();
        showToast({
          type: "success",
          title: "Success",
          desc: "Avatar Updated Successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Avatar Update Failed",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something Went Wrong. Please try again later",
      });
    }
  };

  const handleAvatarUpload = async (imageUri) => {
    setLoad(true);
    try {
      setSelectedAvatar(imageUri);
      setCustomAvatarUri(imageUri);
      setAvatarModalVisible(false);

      const uriParts = imageUri?.split("/");
      const fileName = uriParts[uriParts.length - 1];
      const fileNameParts = fileName.split(".");
      const extension =
        fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : "";

      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something Went Wrong. Please try again later",
        });
        return;
      }
      const { data: uploadResp } = await axiosInstance.get(
        "/profile/upload-url",
        {
          params: { client_id: clientId, extension },
        },
      );
      const { upload, cdn_url } = uploadResp.data;
      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v));

      const contentType = upload.fields["Content-Type"];

      form.append("file", {
        uri: imageUri,
        name: upload.fields.key.split("/").pop(),
        type: contentType,
      });

      const s3Resp = await fetch(upload.url, {
        method: "POST",
        body: form,
      });
      if (s3Resp.status !== 204 && s3Resp.status !== 201) {
        setLoad(false);
        showToast({
          type: "error",
          title: "Error",
          desc: "Failed to upload Image. Please try again.",
        });
        return;
      }

      const res = await axiosInstance.post("/profile/confirm", {
        cdn_url,
        client_id: clientId,
      });
      if (res?.status === 200) {
        getProfileData();
        setLoad(false);
        showToast({
          type: "success",
          title: "Success",
          desc: "Profile Updated Successfully",
        });
      }
    } catch (error) {
      setLoad(false);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to upload Image. Please try again.",
      });
    } finally {
      setAvatarModalVisible(false);
    }
  };

  useEffect(() => {
    getProfileData();

    const backAction = () => {
      router.replace("/client/account");
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  const renderProfileContent = () => {
    if (isEditing) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.pickerContainer}>
              <CustomPicker
                value={editData.gender}
                onValueChange={(value) =>
                  setEditData({ ...editData, gender: value })
                }
                items={[
                  { label: "Male", value: "male" },
                  { label: "Female", value: "female" },
                ]}
                placeholder="Select your gender"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                setTempDob(dob || new Date());
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateText}>
                {editData.dob || "Select Date of Birth"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#777" />
            </TouchableOpacity>

            {Platform.OS === "ios" && showDatePicker && (
              <Modal
                animationType="slide"
                transparent={true}
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.pickerModalContainer}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.pickerCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.pickerTitle}>Select Date</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (tempDob) {
                            const year = tempDob.getFullYear();
                            const month = String(
                              tempDob.getMonth() + 1,
                            ).padStart(2, "0");
                            const day = String(tempDob.getDate()).padStart(
                              2,
                              "0",
                            );
                            const formattedDate = `${year}-${month}-${day}`;
                            setDob(tempDob);
                            setEditData({ ...editData, dob: formattedDate });
                          }
                          setShowDatePicker(false);
                        }}
                      >
                        <Text style={styles.pickerConfirmText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDob || dob || new Date()}
                      mode="date"
                      display="spinner"
                      themeVariant="light"
                      textColor="#000000"
                      maximumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (selectedDate && event.type !== "dismissed") {
                          setTempDob(selectedDate);
                        }
                      }}
                      style={styles.iosPickerStyle}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === "android" && showDatePicker && (
              <DateTimePicker
                value={dob || new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate && event.type !== "dismissed") {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(
                      2,
                      "0",
                    );
                    const day = String(selectedDate.getDate()).padStart(2, "0");
                    const formattedDate = `${year}-${month}-${day}`;
                    setDob(selectedDate);
                    setEditData({ ...editData, dob: formattedDate });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  editData.heightUnit === "cm" && styles.radioSelected,
                ]}
                onPress={() => setEditData({ ...editData, heightUnit: "cm" })}
              >
                <Text
                  style={[
                    styles.radioText,
                    editData.heightUnit === "cm" && styles.radioTextSelected,
                  ]}
                >
                  cm
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  editData.heightUnit === "feet" && styles.radioSelected,
                ]}
                onPress={() => setEditData({ ...editData, heightUnit: "feet" })}
              >
                <Text
                  style={[
                    styles.radioText,
                    editData.heightUnit === "feet" && styles.radioTextSelected,
                  ]}
                >
                  feet
                </Text>
              </TouchableOpacity>
            </View>

            {editData.heightUnit === "cm" ? (
              <TextInput
                style={[styles.input, { marginTop: 10 }]}
                value={editData.height?.toString()}
                onChangeText={(text) =>
                  setEditData({ ...editData, height: text })
                }
                keyboardType="numeric"
                placeholder="Enter height in cm"
                placeholderTextColor="#999"
              />
            ) : (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    value={editData.heightFeet}
                    onChangeText={(text) =>
                      setEditData({ ...editData, heightFeet: text })
                    }
                    keyboardType="numeric"
                    placeholder="Feet"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.input}
                    value={editData.heightInches}
                    onChangeText={(text) =>
                      setEditData({ ...editData, heightInches: text })
                    }
                    keyboardType="numeric"
                    placeholder="Inches"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Goal</Text>
            <View style={styles.pickerContainer}>
              <CustomPicker
                value={editData.goal}
                onValueChange={(value) =>
                  setEditData({ ...editData, goal: value })
                }
                items={[
                  { label: "Weight Loss", value: "weight_loss" },
                  { label: "Weight Gain", value: "weight_gain" },
                  { label: "Body Recomp", value: "maintain" },
                ]}
                placeholder="Select your goal"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lifestyle</Text>
            <View style={styles.pickerContainer}>
              <CustomPicker
                value={editData.lifestyle}
                onValueChange={(value) =>
                  setEditData({ ...editData, lifestyle: value })
                }
                items={[
                  { label: "Sedentary", value: "sedentary" },
                  { label: "Lightly Active", value: "lightly_active" },
                  { label: "Moderately Active", value: "moderately_active" },
                  { label: "Very Active", value: "very_active" },
                  { label: "Super Active", value: "super_active" },
                ]}
                placeholder="Select your lifestyle"
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="transgender" size={20} color="#3498db" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Gender</Text>
            <Text style={styles.detailValue}>{profileData?.gender}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="calendar" size={20} color="#3498db" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>{profileData?.dob}</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="resize" size={20} color="#3498db" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Height</Text>
            <Text style={styles.detailValue}>{profileData?.height} cm</Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="trending-up" size={20} color="#3498db" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Goal</Text>
            <Text style={styles.detailValue}>
              {renderGoalText(profileData?.goal)}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <View style={styles.detailIconContainer}>
            <Ionicons name="walk" size={20} color="#3498db" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Lifestyle</Text>
            <Text style={styles.detailValue}>
              {renderLifestyleText(profileData?.lifestyle)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.compactButtonsRow}>
            <TouchableOpacity
              style={styles.compactActionButton}
              onPress={handleEditPress}
            >
              <Ionicons name="create-outline" size={16} color="#3498db" />
              <Text style={styles.compactActionButtonText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <SkeletonProfile type="profile" />;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/client/account")}
        >
          <Ionicons name="arrow-back" size={20} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.profileHeader}>
        {!load ? (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => handleImageClick(profileData?.profile)}
          >
            <Image
              source={profileData?.profile}
              style={styles.avatarImageProfile}
            />
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={avatarSelect}
            >
              <View style={styles.editAvatarIconBackground}>
                <Ionicons name="pencil" size={15} color="white" />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <Text style={{ paddingVertical: 30 }}>Uploading...</Text>
        )}
        <Text style={styles.profileName}>{profileData?.name}</Text>
        <View style={styles.phoneRow}>
          <Ionicons name="call" size={14} color="#777" />
          <Text style={styles.phoneText}>{profileData?.contact}</Text>
          <TouchableOpacity
            style={styles.editMobileButton}
            onPress={handleOpenChangeMobile}
          >
            <Ionicons name="create-outline" size={12} color="#3498db" />
            <Text style={styles.editMobileButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isEditing && (
        <View style={styles.editingHeaderContainer}>
          <Text style={styles.editingHeaderText}>Edit Profile Details</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView style={styles.contentContainer}>
          {renderProfileContent()}
        </ScrollView>

        {isEditing && (
          <View style={styles.editActionsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleEditSubmit}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <AvatarSelectionModal
        isVisible={isAvatarModalVisible}
        onClose={() => {
          setAvatarModalVisible(false);
          setSelectedAvatar(null);
        }}
        onSelect={handleAvatarChange}
        selectedAvatar={selectedAvatar}
        avatarOptions={avatarOptions}
        onSubmit={handleAvatarSubmit}
        onUploadAvatar={handleAvatarUpload}
      />

      <FullImageModal
        isVisible={isFullImageModalVisible}
        imageSource={fullImageSource}
        onClose={() => setFullImageModalVisible(false)}
      />

      <DeleteConfirmationModal
        isVisible={isDeleteConfirmationVisible}
        onClose={() => setDeleteConfirmationVisible(false)}
        onConfirm={handleDeleteConfirmation}
      />

      {/* Change Mobile Number Modal */}
      <Modal
        visible={changeMobileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeMobileVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.changeMobileOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.changeMobileContainer}
            >
              <View style={styles.changeMobileHeader}>
                <Text style={styles.changeMobileTitle}>
                  {changeMobileStep === 1
                    ? "Change Mobile Number"
                    : "Verify OTP"}
                </Text>
                <TouchableOpacity onPress={() => setChangeMobileVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {changeMobileStep === 1 ? (
                <View style={styles.changeMobileBody}>
                  <Text style={styles.changeMobileLabel}>
                    Enter new mobile number
                  </Text>
                  <TextInput
                    style={styles.changeMobileInput}
                    placeholder="New mobile number"
                    keyboardType="phone-pad"
                    value={newContact}
                    onChangeText={setNewContact}
                    maxLength={15}
                  />
                  <TouchableOpacity
                    style={[
                      styles.changeMobileButton,
                      (!newContact || newContact.length < 10) &&
                        styles.changeMobileButtonDisabled,
                    ]}
                    onPress={handleInitiateContactChange}
                    disabled={
                      !newContact ||
                      newContact.length < 10 ||
                      changeMobileLoading
                    }
                  >
                    <Text style={styles.changeMobileButtonText}>
                      {changeMobileLoading ? "Sending..." : "Send OTP"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.changeMobileBody}>
                  <Text style={styles.changeMobileLabel}>
                    OTP sent to old number ({profileData?.contact})
                  </Text>
                  <TextInput
                    style={styles.changeMobileInput}
                    placeholder="Enter OTP for old number"
                    keyboardType="number-pad"
                    value={oldOtp}
                    onChangeText={setOldOtp}
                    maxLength={6}
                  />
                  <Text style={[styles.changeMobileLabel, { marginTop: 16 }]}>
                    OTP sent to new number ({newContact})
                  </Text>
                  <TextInput
                    style={styles.changeMobileInput}
                    placeholder="Enter OTP for new number"
                    keyboardType="number-pad"
                    value={newOtp}
                    onChangeText={setNewOtp}
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[
                      styles.changeMobileButton,
                      (!oldOtp || !newOtp) && styles.changeMobileButtonDisabled,
                    ]}
                    onPress={handleVerifyContactChange}
                    disabled={!oldOtp || !newOtp || changeMobileLoading}
                  >
                    <Text style={styles.changeMobileButtonText}>
                      {changeMobileLoading ? "Verifying..." : "Verify"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  profileHeader: {
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
    overflow: "hidden",
  },
  coverPhoto: {
    width: "100%",
    height: 200,
    justifyContent: "flex-end",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: "#e1e1e1",
  },
  avatarImageProfile: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e1e1e1",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  editAvatarIconBackground: {
    backgroundColor: "#3498db",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  phoneText: {
    fontSize: 14,
    color: "#777",
  },
  profileEmail: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#3498db",
  },
  tabButtonText: {
    fontSize: 14,
    color: "#777",
  },
  activeTabText: {
    color: "#3498db",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  tabContent: {
    padding: 15,
  },
  detailItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  detailContent: {
    flex: 1,
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#777",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
  },
  editMobileButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3498db",
    gap: 4,
  },
  editMobileButtonText: {
    fontSize: 12,
    color: "#3498db",
    fontWeight: "500",
  },
  actionsContainer: {
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#3498db",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  passwordModalWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  passwordModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    padding: 20,
    paddingBottom: 24,
  },
  passwordModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  passwordModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  passwordModalSubTitle: {
    textAlign: "center",
    fontSize: 12,
    color: "#ccc",
  },
  passwordInputContainer: {
    marginBottom: 15,
  },
  passwordInputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  eyeIcon: {
    padding: 8,
  },
  saveChangesButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  saveChangesText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    padding: 20,
    maxHeight: "80%",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 20,
    paddingHorizontal: 10,
    gap: 15,
  },
  avatarOption: {
    width: (width - 100) / 4, // Dynamic width based on screen size
    height: (width - 100) / 4,
    borderRadius: 12,
    marginBottom: 15,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "#fff",
    padding: 0, // Remove any padding
  },
  selectedAvatarOption: {
    borderColor: "#3498db",
    shadowColor: "#3498db",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  selectedCheckmark: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#3498db",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  radioGroup: {
    flexDirection: "row",
    marginTop: 5,
  },
  radioButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  radioSelected: {
    backgroundColor: "#3498db",
  },
  radioText: {
    color: "#555",
  },
  radioTextSelected: {
    color: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    overflow: "hidden",
  },
  editingHeaderContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
    alignItems: "center",
  },
  editingHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  editActionsContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eaeaea",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#777",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  headerRight: {
    width: 30,
  },
  compactButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  compactActionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#eee",
  },
  compactActionButtonText: {
    color: "#707070",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  editActionsContainer: {
    flexDirection: "row",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eaeaea",
    justifyContent: "space-between",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#3498db",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#777",
    fontSize: 12,
    fontWeight: "500",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  coverPhoto: {
    width: "100%",
    height: 150,
    justifyContent: "flex-end",
  },

  gymProfileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 15,
  },

  gymAvatarContainer: {
    position: "relative",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  gymAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
    backgroundColor: "#fff",
  },

  gymProfileName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "center",
    paddingVertical: 10,
  },
  fullImageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "80%",
  },
  fullImageCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  addAvatarOption: {
    width: 45,
    height: 45,
    borderRadius: 30, // Make it fully rounded
    // marginBottom: 15,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
  },
  imagePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    padding: 20,
  },
  imagePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  imagePickerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  imagePickerOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  imagePickerOptionText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#333",
  },
  addAvatarOption: {
    width: (width - 100) / 4,
    height: (width - 100) / 4,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    shadowColor: "#3498db",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  // Add a gradient-like effect for the + button
  addAvatarGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "rgba(52, 152, 219, 0.05)",
  },

  // Enhanced modal container
  avatarModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "95%",
    padding: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 9,
  },
  deleteAccountButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FF5757",
    shadowColor: "#e74c3c",
  },
  deleteAccountButtonText: {
    color: "#FF5757",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Delete Confirmation Modal Styles
  deleteConfirmationContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffeaea",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  deleteConfirmationTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  deleteConfirmationText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteConfirmationButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelDeleteButtonText: {
    color: "#6c757d",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmDeleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  pickerCancelText: {
    fontSize: 16,
    color: "#666",
  },
  pickerConfirmText: {
    fontSize: 16,
    color: "#3498db",
    fontWeight: "600",
  },
  iosPickerStyle: {
    height: 200,
    marginTop: 10,
  },
  changeMobileOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  changeMobileContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 100,
  },
  changeMobileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eaeaea",
  },
  changeMobileTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  changeMobileBody: {
    padding: 20,
  },
  changeMobileLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  changeMobileInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  changeMobileButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  changeMobileButtonDisabled: {
    backgroundColor: "#a0c4e8",
  },
  changeMobileButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ProfileScreen;
