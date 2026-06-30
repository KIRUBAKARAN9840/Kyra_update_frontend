/*
 * iOS Configuration Required:
 * Add these to your app.json or Info.plist:
 *
 * "ios": {
 *   "infoPlist": {
 *     "NSMicrophoneUsageDescription": "This app needs access to microphone to record audio messages.",
 *     "UIBackgroundModes": ["audio"] // Optional: if you want background recording
 *   }
 * }
 *
 * For expo-audio to work properly on iOS, ensure you have:
 * - Microphone permission in Info.plist
 * - Proper audio session handling (handled by this component)
 * - Background audio mode if needed for your use case
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
} from "expo-audio";
import { Camera } from "expo-camera";
import { FlatList } from "react-native";
import { showToast } from "../utils/Toaster";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const MAX_MEDIA_ITEMS = 5;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MIN_INPUT_HEIGHT = 60;
const MAX_INPUT_HEIGHT = 150;

const MediaInputComponent = ({
  onMediaSubmit,
  isPremium = true,
  onPremiumRequired = () => {},
}) => {
  const [text, setText] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [isMediaOptionsVisible, setMediaOptionsVisible] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [selectedMediaUris, setSelectedMediaUris] = useState([]);
  const timerIntervalRef = useRef(null);
  const [inputContentHeight, setInputContentHeight] =
    useState(MIN_INPUT_HEIGHT);
  const inputHeight = useRef(new Animated.Value(MIN_INPUT_HEIGHT)).current;
  const textInputRef = useRef(null);

  // Initialize audio recorder with platform-specific settings
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    // iOS-specific settings
    ...(Platform.OS === "ios" && {
      extension: ".m4a",
      audioQuality: "MAX",
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    }),
    // Android-specific settings
    ...(Platform.OS === "android" && {
      extension: ".aac",
      audioQuality: "HIGH",
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      outputFormat: "aac_adts",
      audioEncoder: "aac",
    }),
  });
  const recorderState = useAudioRecorderState(audioRecorder);

  const hasContent = text.trim() !== "" || mediaItems.length > 0;
  const isMaxMediaReached = mediaItems.length >= MAX_MEDIA_ITEMS;

  // Configure audio mode on mount (without permissions)
  useEffect(() => {
    const configureAudioMode = async () => {
      try {
        // Configure audio mode for iOS and Android
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          ...(Platform.OS === "ios" && {
            // iOS-specific configurations
            staysActiveInBackground: false,
            interruptionMode: "mixWithOthers",
          }),
        });
      } catch (error) {
        console.error("Failed to configure audio mode:", error);
      }
    };

    configureAudioMode();
  }, []);

  // Handle recording state changes and cleanup
  useEffect(() => {
    if (recorderState.isRecording) {
      // Start timer when recording begins
      setRecordingTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } else {
      // Clear timer when recording stops
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [recorderState.isRecording]);

  // Cleanup audio recorder on unmount (important for iOS)
  useEffect(() => {
    return () => {
      if (recorderState.isRecording) {
        audioRecorder.stop().catch(console.error);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const isMediaUnique = useCallback(
    (newItem) => {
      return !mediaItems.some(
        (existingItem) =>
          existingItem.uri === newItem.uri ||
          (existingItem.type === newItem.type &&
            (existingItem.fileName === newItem.fileName ||
              existingItem.uri === newItem.uri)),
      );
    },
    [mediaItems],
  );

  useEffect(() => {
    Animated.timing(inputHeight, {
      toValue: Math.min(
        Math.max(inputContentHeight, MIN_INPUT_HEIGHT),
        MAX_INPUT_HEIGHT,
      ),
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [inputContentHeight]);

  const pickMediaFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showToast({
          type: "error",
          title: "Error",
          desc: "Sorry, we need camera roll permissions to make this work!",
        });
        return;
      }

      if (mediaItems.length >= MAX_MEDIA_ITEMS) {
        showToast({
          type: "error",
          title: "Media Limit Exceed",
          desc: `You can only add up to ${MAX_MEDIA_ITEMS} media items.`,
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_MEDIA_ITEMS - mediaItems.length,
        allowsEditing: false,
        exif: false,
        base64: false,
      });

      if (!result.canceled) {
        const newMediaItems = result.assets
          .filter((asset) => {
            const newItem = {
              type: asset.type === "image" ? "image" : "video",
              uri: asset.uri,
              fileSize: asset.fileSize || 0,
              fileName: asset.fileName || "unknown",
            };
            return isMediaUnique(newItem) && newItem.fileSize <= MAX_FILE_SIZE;
          })
          .map((asset) => ({
            type: asset.type === "image" ? "image" : "video",
            uri: asset.uri,
            fileSize: asset.fileSize || 0,
            fileName: asset.fileName || "unknown",
          }));

        const updatedMediaItems = [...mediaItems, ...newMediaItems].slice(
          0,
          MAX_MEDIA_ITEMS,
        );
        setMediaItems(updatedMediaItems);

        const newUris = newMediaItems.map((item) => item.uri);
        const combinedUris = [...selectedMediaUris, ...newUris];
        const uniqueUris = [...new Set(combinedUris)].slice(0, MAX_MEDIA_ITEMS);
        setSelectedMediaUris(uniqueUris);

        if (newMediaItems.length === 0) {
          showToast({
            type: "error",
            title: "Duplicate Media",
            desc: "The selected media is already added or exceeds file size limit.",
          });
        }

        setMediaOptionsVisible(false);
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to pick media from gallery",
      });
    }
  };

  const takePhotoFromCamera = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();

      if (status !== "granted") {
        showToast({
          type: "info",
          title: "Permission needed",
          desc: "Sorry, we need camera permissions to make this work!",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
        base64: false,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        const newMediaItem = {
          type: "image",
          uri: asset.uri,
          fileSize: asset.fileSize || 0,
          fileName: asset.fileName || `camera_capture_${Date.now()}.jpg`,
        };

        if (
          isMediaUnique(newMediaItem) &&
          newMediaItem.fileSize <= MAX_FILE_SIZE
        ) {
          const updatedMediaItems = [...mediaItems, newMediaItem].slice(
            0,
            MAX_MEDIA_ITEMS,
          );
          setMediaItems(updatedMediaItems);

          setMediaOptionsVisible(false);
        } else {
          showToast({
            type: "error",
            title: "Duplicate Media",
            desc: "This media is already added or exceeds file size limit.",
          });
        }
      }
    } catch (error) {
      console.error("Camera photo error:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to take photo",
      });
    }
  };

  const removeMediaItem = useCallback(
    (indexToRemove) => {
      if (indexToRemove < 0 || indexToRemove >= mediaItems.length) {
        console.error("Invalid index for media removal", {
          index: indexToRemove,
          mediaItemsLength: mediaItems.length,
        });
        return;
      }

      const removedItem = mediaItems[indexToRemove];

      if (!removedItem) {
        console.error("Media item at specified index is undefined", {
          index: indexToRemove,
          mediaItems: mediaItems,
        });
        return;
      }

      const updatedMediaItems = mediaItems.filter(
        (_, index) => index !== indexToRemove,
      );

      setMediaItems(updatedMediaItems);
      if (removedItem.uri) {
        setSelectedMediaUris((prev) =>
          prev.filter((uri) => uri !== removedItem.uri),
        );
      }
    },
    [mediaItems],
  );

  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const startRecording = async () => {
    try {
      if (mediaItems.length >= MAX_MEDIA_ITEMS) {
        showToast({
          type: "error",
          title: "Media Limit Exceed",
          desc: `You can only add up to ${MAX_MEDIA_ITEMS} media items.`,
        });
        return;
      }

      // Request permissions when starting recording
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        showToast({
          type: "info",
          title: "Permission needed",
          desc: "Sorry, we need audio recording permissions!",
        });
        return;
      }

      // Re-configure audio mode before recording (especially important for iOS)
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        ...(Platform.OS === "ios" && {
          staysActiveInBackground: false,
          interruptionMode: "mixWithOthers",
        }),
      });

      // Give iOS time to finalize AVAudioSession state
      if (Platform.OS === "ios") {
        await wait(500);
      }

      // Attempt recording with retry for iOS
      await attemptRecordingWithRetry();
    } catch (err) {
      console.error("Failed to start recording:", err);
      showToast({
        type: "error",
        title: "Recording Error",
        desc: "Could not start audio recording. Please try again.",
      });
    }
  };

  const attemptRecordingWithRetry = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
    } catch (err) {
      console.error("First recording attempt failed:", err);

      // Retry once for iOS (common issue with audio session)
      if (Platform.OS === "ios") {
        await wait(500);
        try {
          await audioRecorder.prepareToRecordAsync();
          await audioRecorder.record();
        } catch (retryErr) {
          console.error("Recording retry failed:", retryErr);
          throw retryErr;
        }
      } else {
        throw err;
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (!recorderState.isRecording) {
        console.warn("Attempted to stop recording when not recording");
        return;
      }

      const result = await audioRecorder.stop();

      // Extract the URL from the result object
      let uri = null;

      // IMPORTANT: On Android, result.url might be a relative path without file://
      // but audioRecorder.uri has the proper file:// URI, so prefer that first
      if (audioRecorder.uri && typeof audioRecorder.uri === "string") {
        // Prefer the recorder's uri property (has proper file:// prefix)
        uri = audioRecorder.uri;
      } else if (typeof result === "string") {
        // Sometimes the result is the URI string directly
        uri = result;
      } else if (result?.uri) {
        uri = result.uri;
      } else if (result?.url) {
        // Android might return relative path here, add file:// if missing
        uri = result.url;
        if (
          uri &&
          !uri.startsWith("file://") &&
          !uri.startsWith("content://")
        ) {
          uri = `file://${uri}`;
        }
      }

      if (uri && typeof uri === "string") {
        const extension = Platform.OS === "ios" ? "m4a" : "mp4";
        const newAudioItem = {
          type: "audio",
          uri: uri,
          duration: recordingTimer,
          extension: extension,
          fileName: `recording_${Date.now()}.${extension}`,
        };

        setMediaItems((prev) =>
          [...prev, newAudioItem].slice(0, MAX_MEDIA_ITEMS),
        );

        showToast({
          type: "success",
          title: "Recording Saved",
          desc: `Audio recorded successfully (${recordingTimer}s)`,
        });

        setRecordingTimer(0);
      } else {
        throw new Error(
          `No valid recording URI found. Result: ${JSON.stringify(result)}`,
        );
      }
    } catch (err) {
      console.error("Failed to stop recording", err);

      // Try to get the URI even if stop failed
      let uri = null;

      try {
        const recUri = audioRecorder.uri;

        if (typeof recUri === "string") {
          uri = recUri;
        } else if (recUri?.uri) {
          uri = recUri.uri;
        } else if (recUri?.url) {
          uri = recUri.url;
        }
      } catch (uriErr) {
        console.error("Failed to get fallback URI:", uriErr);
      }

      if (uri && typeof uri === "string") {
        const extension = Platform.OS === "ios" ? "m4a" : "mp4";
        const newAudioItem = {
          type: "audio",
          uri: uri,
          duration: recordingTimer,
          extension: extension,
          fileName: `recording_${Date.now()}.${extension}`,
        };

        setMediaItems((prev) =>
          [...prev, newAudioItem].slice(0, MAX_MEDIA_ITEMS),
        );

        showToast({
          type: "success",
          title: "Recording Saved",
          desc: `Audio recorded successfully (${recordingTimer}s)`,
        });
      } else {
        showToast({
          type: "error",
          title: "Recording Error",
          desc: "Could not find the recording file. Please try again.",
        });
      }

      // Reset state even if stopping failed
      setRecordingTimer(0);
    }
  };

  const renderMediaIcon = (type) => {
    switch (type) {
      case "image":
        return <MaterialIcons name="image" size={20} color="#42A5F5" />;
      case "video":
        return <MaterialIcons name="video-library" size={20} color="#42A5F5" />;
      case "audio":
        return <MaterialIcons name="audiotrack" size={20} color="#42A5F5" />;
      default:
        return null;
    }
  };

  const renderMediaPreview = ({ item, index }) => {
    if (!item) {
      console.error("Attempting to render undefined media item", {
        index,
        mediaItems: mediaItems,
        fullItemList: JSON.stringify(mediaItems, null, 2),
      });
      return null;
    }

    const safeIndex =
      typeof index === "number"
        ? index
        : mediaItems.findIndex((mediaItem) => mediaItem === item);

    return (
      <View style={styles.mediaPreviewItem}>
        {item.type === "image" || item.type === "video" ? (
          <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
        ) : item.type === "audio" ? (
          <View style={styles.audioPreview}>
            <MaterialIcons name="audiotrack" size={30} color="#42A5F5" />
            <Text>{`${item.duration}s`}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.removeMediaButton}
          onPress={() => {
            removeMediaItem(safeIndex);
          }}
        >
          <MaterialIcons name="close" size={18} color="white" />
        </TouchableOpacity>

        <View style={styles.mediaTypeIndicator}>
          {renderMediaIcon(item.type)}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {mediaItems.length > 0 && (
        <View style={styles.mediaPreviewContainer}>
          <FlatList
            data={mediaItems}
            renderItem={renderMediaPreview}
            keyExtractor={(item, index) => {
              return item?.uri || `media-item-${index}`;
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaPreviewList}
          />
        </View>
      )}

      <View style={styles.inputSection}>
        <View style={styles.inputContainer}>
          <Animated.View
            style={[styles.textInputWrapper, { height: inputHeight }]}
          >
            <TextInput
              style={styles.textInput}
              placeholder="Share your thoughts..."
              placeholderTextColor="#999"
              multiline
              value={text}
              onChangeText={(newText) => {
                if (!isPremium) {
                  onPremiumRequired();
                  return;
                }
                setText(newText);
              }}
              onContentSizeChange={(event) => {
                const { contentSize } = event.nativeEvent;
                setInputContentHeight(contentSize.height);
              }}
              scrollEnabled
            />
            <TouchableOpacity
              style={[
                styles.attachButton,
                isMaxMediaReached && styles.disabledButton,
              ]}
              onPress={() => {
                if (!isPremium) {
                  onPremiumRequired();
                  return;
                }
                setMediaOptionsVisible(!isMediaOptionsVisible);
              }}
              disabled={isMaxMediaReached}
            >
              <MaterialIcons
                name="attach-file"
                size={30}
                color={isMaxMediaReached ? "#ccc" : "#FF5757"}
              />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.voiceRecordButton,
                isMaxMediaReached && styles.disabledButton,
              ]}
              onPress={() => {
                if (!isPremium) {
                  onPremiumRequired();
                  return;
                }
                recorderState.isRecording ? stopRecording() : startRecording();
              }}
              disabled={isMaxMediaReached && !recorderState.isRecording}
            >
              {recorderState.isRecording ? (
                <View style={styles.recordingContainer}>
                  <Ionicons name="stop-circle" size={36} color="#FF757" />
                  <Text style={styles.recordingTimer}>{recordingTimer}s</Text>
                </View>
              ) : (
                <Ionicons
                  name="mic"
                  size={25}
                  color={isMaxMediaReached ? "#ccc" : "#FF5757"}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[!hasContent && styles.disabledSubmitButton]}
              onPress={() => {
                if (!isPremium) {
                  onPremiumRequired();
                  return;
                }
                if (hasContent) {
                  onMediaSubmit({
                    text,
                    mediaItems,
                  });
                  setText("");
                  setMediaItems([]);
                }
              }}
              disabled={!hasContent}
            >
              {hasContent ? (
                <LinearGradient
                  colors={["#ffffff", "#ffffff"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButton}
                >
                  <MaterialIcons name="send" size={24} color="#FF5757" />
                </LinearGradient>
              ) : (
                <View style={styles.submitButton}>
                  <MaterialIcons name="send" size={24} color="#FF5757" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isMediaOptionsVisible && (
          <View style={styles.mediaOptionsContainer}>
            <TouchableOpacity
              style={styles.mediaOption}
              onPress={pickMediaFromGallery}
            >
              <MaterialIcons name="photo-library" size={24} color="#FF5757" />
              <Text style={styles.mediaOptionText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaOption}
              onPress={takePhotoFromCamera}
            >
              <MaterialIcons name="camera-alt" size={24} color="#FF5757" />
              <Text style={styles.mediaOptionText}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginTop: 10,
  },
  mediaPreviewContainer: {
    marginBottom: 10,
  },
  mediaPreviewList: {
    paddingBottom: 10,
  },
  inputSection: {
    flexDirection: "column",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0.5, height: 0.5 },
    shadowOpacity: 2,
    shadowRadius: 1,
    elevation: 5,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(255, 87, 87, 0.04)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  textInput: {
    flex: 1,
    minHeight: 60,
    maxHeight: 150,
    fontSize: 16,
    color: "#333",
    paddingTop: Platform.OS === "ios" ? 20 : 10,
  },
  attachButton: {
    marginLeft: 10,
    transform: [{ rotate: "45deg" }],
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginLeft: 5,
    alignItems: "center",
    gap: 5,
  },
  voiceRecordButton: {
    alignItems: "center",
  },
  recordingContainer: {
    alignItems: "center",
  },
  recordingTimer: {
    fontSize: 12,
    color: "#42A5F5",
  },
  submitButton: {
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF5757",
    backgroundColor: "rgba(255, 87, 87, 0.04)",
  },
  disabledSubmitButton: {
    opacity: 0.5,
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  mediaOptionsContainer: {
    marginTop: 10,
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  mediaOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  mediaOptionText: {
    marginLeft: 10,
    color: "#FF5757",
  },
  mediaPreviewItem: {
    position: "relative",
    marginRight: 10,
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  mediaPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  audioPreview: {
    width: 100,
    height: 100,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 15,
    width: 25,
    height: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaTypeIndicator: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 15,
    padding: 5,
  },
});

export default MediaInputComponent;
