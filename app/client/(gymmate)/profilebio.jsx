import React, { useState, useCallback, useEffect } from "react";
import {
  BackHandler,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import axiosInstance from "../../../services/axiosInstance";
import { showToast } from "../../../utils/Toaster";

const { width } = Dimensions.get("window");

// ─── Default Bios ───────────────────────────────────────────────────────────

const DEFAULT_BIOS = {
  male: [
    "Gym is my happy place honestly. Looking for someone who's just as consistent and doesn't flake.",
    "Trying to stay fit and have fun doing it. Would be great to have a gym buddy to vibe with.",
    "Been going solo for a while now. Need a partner who keeps things fun and shows up regularly.",
    "Fitness is a lifestyle for me not just a phase. Hit me up if you're on the same page.",
    "Just want someone to train with and keep each other motivated. Let's make the gym less boring lol.",
  ],
  female: [
    "Gym girl who just wants a consistent workout buddy. Let's keep each other accountable and have fun.",
    "Fitness keeps me sane honestly. Looking for someone positive to train with and push each other.",
    "Morning person who loves the gym. Would be nice to have a buddy who actually shows up on time haha.",
    "Working on myself one day at a time. Need a gym partner who's chill and keeps things fun.",
    "Love staying active and trying new things. Looking for someone who's down to train together regularly.",
  ],
};

// ─── Photo Box ──────────────────────────────────────────────────────────────

const PhotoBox = ({ uri, onPress, uploading, onRemove, isMain }) => (
  <View style={{ flex: 1 }}>
    <TouchableOpacity
      style={styles.photoBox}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={uploading}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <>
          <View style={styles.photoBoxIconWrap}>
            <Ionicons name="camera-outline" size={24} color="#FF5757" />
          </View>
          <Text style={styles.photoBoxLabel}>
            {isMain ? "Default photo" : "Add photo"}
          </Text>
        </>
      )}
      {uploading && (
        <View style={styles.photoUploadingOverlay}>
          <ActivityIndicator size="small" color="#FF5757" />
        </View>
      )}
    </TouchableOpacity>
    {uri && !uploading && onRemove && (
      <TouchableOpacity style={styles.photoRemoveBtn} onPress={onRemove}>
        <Ionicons name="close" size={14} color="#FFF" />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Completion Bar ─────────────────────────────────────────────────────────

const STEP_COUNT = 4;

const CompletionBar = ({ photos, bio }) => {
  const photoCount = photos.filter((p) => p !== null).length;
  // 3 photo slots + 1 bio = 4 steps
  const filledSteps = photoCount + (bio.trim().length > 0 ? 1 : 0);
  const percent = 60 + Math.round((filledSteps / STEP_COUNT) * 40);

  return (
    <View style={styles.completionContainer}>
      <View style={styles.completionHeader}>
        <View>
          <Text style={styles.completionLabel}>Profile Completion</Text>
          <Text style={styles.completionHint}>
            Add photos to unlock more matches
          </Text>
        </View>
        <Text style={styles.completionPercent}>{percent}%</Text>
      </View>
      <View style={styles.stepRow}>
        <View style={styles.stepBars}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View key={i} style={styles.stepBarWrap}>
              {i < filledSteps ? (
                <LinearGradient
                  colors={["#FF5757", "#FF8C57"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.stepBarFilled}
                />
              ) : (
                <View style={styles.stepBarEmpty} />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.stepText}>
          {filledSteps} of {STEP_COUNT} STEPS
        </Text>
      </View>
    </View>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const ProfileBio = () => {
  const router = useRouter();
  const { default_avatars: defaultAvatarsParam, gender: genderParam } =
    useLocalSearchParams();

  const defaultAvatars = defaultAvatarsParam
    ? JSON.parse(defaultAvatarsParam)
    : [];
  const gender = genderParam || "male";

  // Photos
  const [photos, setPhotos] = useState([null, null, null]);
  const [photoUploading, setPhotoUploading] = useState([false, false, false]);
  const [bio, setBio] = useState("");

  // Photo picker sheet
  const [photoPickerIndex, setPhotoPickerIndex] = useState(null);

  // Avatar picker
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarPickerTargetIndex, setAvatarPickerTargetIndex] = useState(0);

  // Bio picker
  const [bioPickerVisible, setBioPickerVisible] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);

  const handleSkip = useCallback(async () => {
    if (skipping) return;
    setSkipping(true);
    try {
      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/onboarding/step2",
        { photo_paths: [], bio: null },
      );
      if (data?.data?.onboarding_completed || data?.status === 200) {
        router.replace("/client/(tabs)/gymmate");
      }
    } catch {
      router.replace("/client/(tabs)/gymmate");
    } finally {
      setSkipping(false);
    }
  }, [skipping, router]);

  // Hardware back → skip with API call
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleSkip();
      return true;
    });
    return () => sub.remove();
  }, [handleSkip]);

  const getDefaultBios = () => DEFAULT_BIOS[gender] || DEFAULT_BIOS.male;

  const getPhotoUri = (p) => {
    if (!p) return null;
    if (typeof p === "string") return p;
    return p.localUri;
  };

  const openCamera = async (index) => {
    setPhotoPickerIndex(null);
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadPhoto(index, result.assets[0]);
    }
  };

  const openGallery = async (index) => {
    setPhotoPickerIndex(null);
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
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadPhoto(index, result.assets[0]);
    }
  };

  const uploadPhoto = async (index, asset) => {
    const uri = asset.uri;
    const uriParts = uri.split(".");
    const ext = uriParts[uriParts.length - 1].toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    const updatedPhotos = [...photos];
    updatedPhotos[index] = uri;
    setPhotos(updatedPhotos);

    const updatedUploading = [...photoUploading];
    updatedUploading[index] = true;
    setPhotoUploading(updatedUploading);

    try {
      const { data: presignResp } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/photos/presign",
        { slots: [{ display_order: index, content_type: contentType }] },
      );

      const slot = presignResp.data[0];
      const { upload, cdn_url } = slot;

      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", {
        uri,
        name: upload.fields.key.split("/").pop(),
        type: contentType,
      });

      const s3Resp = await fetch(upload.url, { method: "POST", body: form });
      if (!s3Resp.ok && s3Resp.status !== 204) {
        throw new Error("S3 upload failed");
      }

      const finalPhotos = [...photos];
      finalPhotos[index] = {
        localUri: uri,
        cdnUrl: cdn_url,
        key: upload.fields.key,
      };
      setPhotos(finalPhotos);
    } catch {
      showToast({
        type: "error",
        title: "Upload Failed",
        desc: "Could not upload photo. Please try again.",
      });
      const revert = [...photos];
      revert[index] = null;
      setPhotos(revert);
    } finally {
      const done = [...photoUploading];
      done[index] = false;
      setPhotoUploading(done);
    }
  };

  const removePhoto = (index) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  };

  const selectAvatar = (avatarUrl) => {
    const updated = [...photos];
    updated[avatarPickerTargetIndex] = { localUri: avatarUrl, avatarUrl };
    setPhotos(updated);
    setAvatarPickerVisible(false);
  };

  const handleSubmit = async () => {
    const photoPaths = photos
      .filter((p) => p && typeof p === "object")
      .map((p) => p.avatarUrl || p.key)
      .filter(Boolean);

    setSubmitting(true);
    try {
      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/onboarding/step2",
        { photo_paths: photoPaths, bio: bio.trim() || null },
      );

      if (data?.data?.onboarding_completed || data?.status === 200) {
        router.replace("/client/(tabs)/gymmate");
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not complete your profile. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#FFF" }}>
        <View style={styles.header}>
          <View style={styles.stepLabelRow}>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={skipping}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Photos & Bio</Text>
            <TouchableOpacity
              onPress={handleSkip}
              disabled={skipping}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>{skipping ? "..." : "Skip"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Completion Bar */}
            <CompletionBar photos={photos} bio={bio} />

            {/* Photos */}
            <View style={styles.photosCard}>
              <View style={styles.photosHeaderRow}>
                <Text style={styles.photosTitle}>Your Photos</Text>
                <Text style={styles.photosCounter}>
                  {photos.filter((p) => p !== null).length}/3 added
                </Text>
              </View>

              <View style={styles.photoGrid}>
                <PhotoBox
                  uri={getPhotoUri(photos[0])}
                  onPress={() => setPhotoPickerIndex(0)}
                  uploading={photoUploading[0]}
                  onRemove={() => removePhoto(0)}
                  isMain
                />
                <PhotoBox
                  uri={getPhotoUri(photos[1])}
                  onPress={() => setPhotoPickerIndex(1)}
                  uploading={photoUploading[1]}
                  onRemove={() => removePhoto(1)}
                />
                <PhotoBox
                  uri={getPhotoUri(photos[2])}
                  onPress={() => setPhotoPickerIndex(2)}
                  uploading={photoUploading[2]}
                  onRemove={() => removePhoto(2)}
                />
              </View>
              {/* <View style={styles.photoTip}>
                <Ionicons
                  name="alert-circle-outline"
                  size={10}
                  color="#9CA3AF"
                />
                <Text style={styles.photoTipText}>
                  Profiles with real photos have a higher chance of finding a
                  gym mate
                </Text>
              </View> */}
            </View>

            <View style={styles.photoChipsRow}>
              <View style={styles.photoChip}>
                <Ionicons name="eye-outline" size={14} color="#FF5757" />
                <Text style={styles.photoChipText}>3x More Views</Text>
              </View>
              <View style={styles.photoChip}>
                <Ionicons name="heart-outline" size={14} color="#FF5757" />
                <Text style={styles.photoChipText}>Better Matches</Text>
              </View>
              <View style={styles.photoChip}>
                <Ionicons name="star-outline" size={14} color="#FF5757" />
                <Text style={styles.photoChipText}>Top Discovery</Text>
              </View>
              <View style={styles.photoChip}>
                <Ionicons name="people-outline" size={14} color="#FF5757" />
                <Text style={styles.photoChipText}>More Connections</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioCard}>
              <View style={styles.bioHeaderRow}>
                <View>
                  <Text style={styles.bioTitle}>Fitness Bio</Text>
                </View>
                <TouchableOpacity
                  style={styles.defaultBioBtn}
                  activeOpacity={0.7}
                  onPress={() => setBioPickerVisible(true)}
                >
                  <Text style={styles.defaultBioBtnText}>Use default</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FF5757" />
                </TouchableOpacity>
              </View>
              <View style={styles.bioWrapper}>
                <TextInput
                  style={styles.bioInput}
                  value={bio}
                  onChangeText={(t) => t.length <= 160 && setBio(t)}
                  placeholder="Tell about yourself..."
                  placeholderTextColor="#BBBBBB"
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.charCount}>{bio.length}/160</Text>
            </View>

            <TouchableOpacity
              style={[styles.redButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.redButtonText}>Start Connecting</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Photo Picker Sheet */}
      <Modal
        visible={photoPickerIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoPickerIndex(null)}
      >
        <TouchableOpacity
          style={ps.backdrop}
          activeOpacity={1}
          onPress={() => setPhotoPickerIndex(null)}
        />
        <SafeAreaView edges={["bottom"]} style={ps.sheet}>
          <View style={ps.handle} />
          <Text style={ps.title}>Add Photo</Text>

          <TouchableOpacity
            style={ps.option}
            activeOpacity={0.7}
            onPress={() => openCamera(photoPickerIndex)}
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
            onPress={() => openGallery(photoPickerIndex)}
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

          {defaultAvatars.length > 0 && (
            <TouchableOpacity
              style={ps.option}
              activeOpacity={0.7}
              onPress={() => {
                setAvatarPickerTargetIndex(photoPickerIndex);
                setPhotoPickerIndex(null);
                setAvatarPickerVisible(true);
              }}
            >
              <View style={ps.iconWrap}>
                <Ionicons name="sparkles-outline" size={22} color="#FF5757" />
              </View>
              <View style={ps.optionText}>
                <Text style={ps.optionLabel}>Use AI Generated Images</Text>
                <Text style={ps.optionSub}>Pick from curated avatars</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={ps.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setPhotoPickerIndex(null)}
          >
            <Text style={ps.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Avatar Picker Modal */}
      <Modal
        visible={avatarPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <TouchableOpacity
          style={avs.backdrop}
          activeOpacity={1}
          onPress={() => setAvatarPickerVisible(false)}
        />
        <SafeAreaView edges={["bottom"]} style={avs.sheet}>
          <View style={avs.handle} />
          <Text style={avs.title}>Choose an Avatar</Text>
          <Text style={avs.subtitle}>Select an AI generated profile image</Text>
          <FlatList
            data={defaultAvatars}
            keyExtractor={(item) => String(item.sno)}
            numColumns={4}
            contentContainerStyle={avs.grid}
            columnWrapperStyle={avs.gridRow}
            renderItem={({ item }) => {
              const isSelected = photos.some(
                (p) =>
                  p &&
                  typeof p === "object" &&
                  p.avatarUrl === item.profile_url,
              );
              return (
                <TouchableOpacity
                  style={[avs.avatarBox, isSelected && avs.avatarBoxSelected]}
                  activeOpacity={0.7}
                  onPress={() => selectAvatar(item.profile_url)}
                >
                  <Image
                    source={{ uri: item.profile_url }}
                    style={avs.avatarImage}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={avs.avatarCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#FF5757"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={avs.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setAvatarPickerVisible(false)}
          >
            <Text style={avs.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Default Bio Picker Modal */}
      <Modal
        visible={bioPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBioPickerVisible(false)}
      >
        <TouchableOpacity
          style={bps.backdrop}
          activeOpacity={1}
          onPress={() => setBioPickerVisible(false)}
        />
        <SafeAreaView edges={["bottom"]} style={bps.sheet}>
          <View style={bps.handle} />
          <Text style={bps.title}>Pick a Bio</Text>
          <Text style={bps.subtitle}>Tap to use — you can edit it later</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getDefaultBios().map((text, idx) => (
              <TouchableOpacity
                key={idx}
                style={[bps.bioOption, bio === text && bps.bioOptionSelected]}
                activeOpacity={0.7}
                onPress={() => {
                  setBio(text);
                  setBioPickerVisible(false);
                }}
              >
                <Text style={bps.bioOptionText}>{text}</Text>
                {bio === text && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#FF5757"
                    style={{ marginTop: 6 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={bps.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setBioPickerVisible(false)}
          >
            <Text style={bps.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default ProfileBio;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: "center",
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#AAAAAA",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 100 : 300,
  },

  // Completion bar
  completionContainer: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  completionPercent: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FF5757",
  },
  completionHint: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  // Step indicator bars
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  stepBars: {
    flexDirection: "row",
    gap: 6,
  },
  stepBarWrap: {
    width: 32,
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  stepBarFilled: {
    flex: 1,
    borderRadius: 3,
  },
  stepBarEmpty: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
  },
  stepText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },

  // Photos card
  photosCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photosHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  photosCounter: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },

  // Photo grid
  photoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoBoxEmpty: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFE0E0",
    borderStyle: "dashed",
  },
  photoBoxIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFE0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBoxLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF5757",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
  },
  photoTipText: {
    flex: 1,
    fontSize: 10,
    color: "#9CA3AF",
    lineHeight: 12,
  },
  photoChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  photoChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    width: (width - 50) / 2,
  },
  photoChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Bio card
  bioCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bioHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bioTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  bioSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  defaultBioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  defaultBioBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
  },
  bioWrapper: {
    backgroundColor: "#F8F8FC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    height: 140,
  },
  bioInput: {
    flex: 1,
    fontSize: 14,
    color: "#333333",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 8,
  },

  // Button
  redButton: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  redButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});

// ─── Photo Picker Sheet Styles ──────────────────────────────────────────────

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
    paddingBottom: 36,
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

// ─── Avatar Picker Sheet Styles ─────────────────────────────────────────────

const avs = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "65%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  grid: {
    paddingBottom: 8,
  },
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
  avatarBox: {
    width: (width - 40 - 30) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F0F0F0",
  },
  avatarBoxSelected: {
    borderColor: "#FF5757",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 10,
  },
  cancelBtn: {
    marginTop: 12,
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

// ─── Bio Picker Sheet Styles ────────────────────────────────────────────────

const bps = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  bioOption: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  bioOptionSelected: {
    borderColor: "#FF5757",
    backgroundColor: "#FFF5F5",
  },
  bioOptionText: {
    fontSize: 14,
    color: "#333333",
    lineHeight: 20,
  },
  cancelBtn: {
    marginTop: 12,
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
