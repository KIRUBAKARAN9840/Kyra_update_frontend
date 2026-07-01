/**
 * useChatSound.js
 *
 * Custom hook for managing chat sound effects (UISFX - UI Sound Effects)
 *
 * Features:
 * - Message sent sound (plays when user sends a message)
 * - Message received sound (plays when AI responds)
 */

import { useRef, useEffect, useCallback } from "react";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_SOUNDS_ENABLED = "chat_sounds_enabled";

const SOUND_CONFIG = {
  volume: 0.5,
};

const globalState = {
  audioContextUnlocked: false,
};

const SENT_SOUND = require("../assets/sound/message_sent.wav");
const RECEIVED_SOUND = require("../assets/sound/message_received.wav");

const unlockAudioContext = async () => {
  if (globalState.audioContextUnlocked) {
    return true;
  }

  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
    });

    globalState.audioContextUnlocked = true;
    return true;
  } catch (error) {
    return false;
  }
};

const initializeAudio = async () => {
  if (!globalState.audioContextUnlocked) {
    await unlockAudioContext();
  }
};

export const useChatSound = (isScreenFocused = true) => {
  const soundEnabled = useRef(true);
  const isScreenFocusedRef = useRef(isScreenFocused);
  const initializedRef = useRef(false);

  // Create audio players using expo-audio hooks
  const sentPlayer = useAudioPlayer(SENT_SOUND);
  const receivedPlayer = useAudioPlayer(RECEIVED_SOUND);

  // Configure players
  useEffect(() => {
    sentPlayer.volume = SOUND_CONFIG.volume;
    receivedPlayer.volume = SOUND_CONFIG.volume;
  }, [sentPlayer, receivedPlayer]);

  useEffect(() => {
    isScreenFocusedRef.current = isScreenFocused;
  }, [isScreenFocused]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeAudio().catch(console.error);
    }
  }, []);

  const toggleSoundEnabled = useCallback(async () => {
    try {
      const newState = !soundEnabled.current;
      soundEnabled.current = newState;
      await AsyncStorage.setItem(CHAT_SOUNDS_ENABLED, String(newState));
      return newState;
    } catch (error) {
      return soundEnabled.current;
    }
  }, []);

  const playMessageSentSound = useCallback(async () => {
    if (!soundEnabled.current) {
      return;
    }

    if (!globalState.audioContextUnlocked) {
      await unlockAudioContext();
    }

    try {
      sentPlayer.seekTo(0);
      sentPlayer.play();
    } catch (error) {
      console.error("[ChatSound] Error playing sent sound:", error);
    }
  }, [sentPlayer]);

  const playMessageReceivedSound = useCallback(async () => {
    if (!soundEnabled.current || !isScreenFocusedRef.current) {
      return;
    }

    if (!globalState.audioContextUnlocked) {
      await unlockAudioContext();
    }

    try {
      receivedPlayer.seekTo(0);
      receivedPlayer.play();
    } catch (error) {
      console.error("[ChatSound] Error playing received sound:", error);
    }
  }, [receivedPlayer]);

  const setSoundEnabled = useCallback((enabled) => {
    soundEnabled.current = enabled;
    AsyncStorage.setItem(CHAT_SOUNDS_ENABLED, String(enabled)).catch();
  }, []);

  const getSoundEnabled = useCallback(() => {
    return soundEnabled.current;
  }, []);

  return {
    playMessageSentSound,
    playMessageReceivedSound,
    setSoundEnabled,
    getSoundEnabled,
    toggleSoundEnabled,
    soundsLoaded: globalState.audioContextUnlocked,
  };
};

export default useChatSound;
