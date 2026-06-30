import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { presignStoryAPI, publishStoryAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width - 40;

export default function MyStory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [imageUri, setImageUri] = useState(null);
  const [s3Key, setS3Key] = useState(null);
  const [cdnUrl, setCdnUrl] = useState(null);
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("public");
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const openCamera = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast({
        type: "error",
        title: "Permission Required",
        desc: "Camera access is needed to take a photo.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadImage(result.assets[0]);
    }
  };

  const openGallery = async () => {
    setPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast({
        type: "error",
        title: "Permission Required",
        desc: "Gallery access is needed to select a photo.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadImage(result.assets[0]);
    }
  };

  const uploadImage = async (asset) => {
    const uri = asset.uri;
    setImageUri(uri);
    setUploading(true);

    try {
      const uriParts = uri.split(".");
      const ext = uriParts[uriParts.length - 1].toLowerCase();
      const contentType = ext === "png" ? "image/png" : "image/jpeg";

      // 1. Presign
      const presignRes = await presignStoryAPI(contentType);
      if (presignRes?.status !== 200) {
        throw new Error("Presign failed");
      }

      const { upload, cdn_url } = presignRes.data;

      // 2. Upload to S3
      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", {
        uri,
        name: upload.fields.key.split("/").pop(),
        type: contentType,
      });

      const s3Resp = await fetch(upload.url, {
        method: "POST",
        body: form,
      });

      if (!s3Resp.ok && s3Resp.status !== 204) {
        throw new Error("S3 upload failed");
      }

      setS3Key(upload.fields.key);
      setCdnUrl(cdn_url);
    } catch (err) {
      showToast({
        type: "error",
        title: "Upload Failed",
        desc: "Could not upload image. Please try again.",
      });
      setImageUri(null);
      setS3Key(null);
      setCdnUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!s3Key) return;
    setPosting(true);
    try {
      const payload = {
        s3_key: s3Key,
        media_type: "image",
        audience,
        cdn_url: cdnUrl,
      };
      if (caption.trim()) {
        payload.caption = caption.trim();
      }

      const res = await publishStoryAPI(payload);
      if (res?.status === 200) {
        router.back();
      } else {
        throw new Error(res?.message || "Failed");
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Post Failed",
        desc: "Could not publish your story. Please try again.",
      });
    } finally {
      setPosting(false);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setS3Key(null);
    setCdnUrl(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF", paddingTop: insets.top }}>
      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Add Story</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={st.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Image */}
          <Text style={st.fieldLabel}>
            Photo <Text style={st.requiredStar}>*</Text>
          </Text>
          <Text style={st.fieldHint}>
            Share a moment from your fitness journey
          </Text>

          {imageUri ? (
            <View style={st.imageWrap}>
              <Image
                source={{ uri: imageUri }}
                style={st.image}
                resizeMode="cover"
              />
              {uploading && (
                <View style={st.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#FF5757" />
                  <Text style={st.uploadingText}>Uploading...</Text>
                </View>
              )}
              {!uploading && (
                <TouchableOpacity style={st.removeBtn} onPress={removeImage}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={st.imagePlaceholder}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.8}
            >
              <View style={st.addIconWrap}>
                <Ionicons name="camera-outline" size={36} color="#FF5757" />
              </View>
              <Text style={st.addText}>Tap to add photo</Text>
              <Text style={st.addSub}>Camera or Gallery</Text>
            </TouchableOpacity>
          )}

          {/* Caption */}
          <View style={st.fieldGroup}>
            <Text style={st.fieldLabel}>
              Caption <Text style={st.optionalTag}>(Optional)</Text>
            </Text>
            <View style={st.captionWrap}>
              <TextInput
                style={st.captionInput}
                value={caption}
                onChangeText={(t) => t.length <= 200 && setCaption(t)}
                placeholder="Write a caption..."
                placeholderTextColor="#BBBBBB"
                multiline
                textAlignVertical="top"
              />
            </View>
            <Text style={st.charCount}>{caption.length}/200</Text>
          </View>

          {/* Audience */}
          <View style={st.fieldGroup}>
            <Text style={st.fieldLabel}>Who can see this?</Text>

            <TouchableOpacity
              style={st.radioRow}
              onPress={() => setAudience("public")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  st.radioOuter,
                  audience === "public" && st.radioOuterActive,
                ]}
              >
                {audience === "public" && <View style={st.radioInner} />}
              </View>
              <View style={st.radioTextWrap}>
                <Text style={st.radioLabel}>Public</Text>
                <Text style={st.radioSub}>Visible to all Gym Mate users</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.radioRow}
              onPress={() => setAudience("friends")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  st.radioOuter,
                  audience === "friends" && st.radioOuterActive,
                ]}
              >
                {audience === "friends" && <View style={st.radioInner} />}
              </View>
              <View style={st.radioTextWrap}>
                <Text style={st.radioLabel}>Friends Only</Text>
                <Text style={st.radioSub}>Only your friends can see</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Post Button */}
          <TouchableOpacity
            style={[
              st.postBtn,
              (!s3Key || uploading || posting) && { opacity: 0.45 },
            ]}
            onPress={handlePost}
            activeOpacity={0.85}
            disabled={!s3Key || uploading || posting}
          >
            {posting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={st.postBtnText}>Post Story</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Camera / Gallery Picker Sheet */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={ps.backdrop}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={[ps.sheet, { paddingBottom: insets.bottom + 36 }]}>
          <View style={ps.handle} />
          <Text style={ps.title}>Add Photo</Text>

          <TouchableOpacity
            style={ps.option}
            activeOpacity={0.7}
            onPress={openCamera}
          >
            <View style={ps.iconWrap}>
              <Ionicons name="camera-outline" size={22} color="#FF5757" />
            </View>
            <View style={ps.optionText}>
              <Text style={ps.optionLabel}>Take Photo</Text>
              <Text style={ps.optionSub}>Use your camera</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={ps.option}
            activeOpacity={0.7}
            onPress={openGallery}
          >
            <View style={ps.iconWrap}>
              <Ionicons name="image-outline" size={22} color="#FF5757" />
            </View>
            <View style={ps.optionText}>
              <Text style={ps.optionLabel}>Choose from Gallery</Text>
              <Text style={ps.optionSub}>Pick from your photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={ps.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setPickerVisible(false)}
          >
            <Text style={ps.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 100 : 100,
  },
  fieldGroup: {
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  requiredStar: {
    color: "#FF5757",
    fontWeight: "700",
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AAAAAA",
  },
  fieldHint: {
    fontSize: 12,
    color: "#AAAAAA",
    marginBottom: 12,
    marginTop: -4,
  },

  // Image placeholder
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#EEEEEE",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  addText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  addSub: {
    fontSize: 12,
    color: "#AAAAAA",
  },

  // Uploaded image
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  removeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Caption
  captionWrap: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    height: 100,
  },
  captionInput: {
    flex: 1,
    fontSize: 14,
    color: "#333333",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#AAAAAA",
    textAlign: "right",
    marginTop: 4,
  },

  // Audience radio
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#FF5757",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF5757",
  },
  radioTextWrap: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  radioSub: {
    fontSize: 12,
    color: "#AAAAAA",
  },

  // Post button
  postBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});

const ps = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: "#AAAAAA",
  },
  cancelBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888888",
  },
});
