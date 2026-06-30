/**
 * useChatSound.js
 *
 * Custom hook for managing chat sound effects (UISFX - UI Sound Effects)
 *
 * Features:
 * - Message sent sound (plays when user sends a message)
 * - Typing/thinking sound (loops while waiting for AI response)
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
const TYPING_SOUND = require("../assets/sound/typing.wav");

// Global refs to track typing sound state
let typingSoundCheckInterval = null; // Interval to check focus state
let typingSoundEnabled = false; // Flag to track if typing sound should be playing

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

/**
 * Stop the typing sound immediately
 * This pauses the player and clears the interval
 */
const stopTypingSoundGlobal = (typingPlayer) => {
  // Set flag to false FIRST - this prevents any replay attempts
  typingSoundEnabled = false;

  // Clear interval to prevent any more checks
  if (typingSoundCheckInterval) {
    clearInterval(typingSoundCheckInterval);
    typingSoundCheckInterval = null;
  }

  if (typingPlayer) {
    try {
      typingPlayer.pause();
    } catch (error) {
      // Ignore errors if player was already stopped
    }
  }

  // NOTE: Removed audio mode reset here as it was interrupting other sounds
};

export const useChatSound = (isScreenFocused = true) => {
  const soundEnabled = useRef(true);
  const isScreenFocusedRef = useRef(isScreenFocused);
  const initializedRef = useRef(false);

  // Create audio players using expo-audio hooks
  const sentPlayer = useAudioPlayer(SENT_SOUND);
  const receivedPlayer = useAudioPlayer(RECEIVED_SOUND);
  const typingPlayer = useAudioPlayer(TYPING_SOUND);

  // Configure players
  useEffect(() => {
    sentPlayer.volume = SOUND_CONFIG.volume;
    receivedPlayer.volume = SOUND_CONFIG.volume;
    typingPlayer.volume = SOUND_CONFIG.volume;
    typingPlayer.loop = true;
  }, [sentPlayer, receivedPlayer, typingPlayer]);

  useEffect(() => {
    isScreenFocusedRef.current = isScreenFocused;

    // When screen loses focus, stop typing sound immediately
    if (!isScreenFocused) {
      stopTypingSoundGlobal(typingPlayer);
    }
  }, [isScreenFocused, typingPlayer]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeAudio().catch(console.error);
    }

    // Cleanup: stop typing sound when component unmounts
    return () => {
      stopTypingSoundGlobal(typingPlayer);
    };
  }, [typingPlayer]);

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

    // NOTE: Removed isScreenFocusedRef check for sent sound
    // This ensures sent sound plays even when switching bots

    if (!globalState.audioContextUnlocked) {
      await unlockAudioContext();
    }

    try {
      // Reset to beginning and play
      sentPlayer.seekTo(0);
      sentPlayer.play();
    } catch (error) {
      console.error("[ChatSound] Error playing sent sound:", error);
    }
  }, [sentPlayer]);

  const playMessageReceivedSound = useCallback(async () => {
    // Stop typing sound first
    stopTypingSoundGlobal(typingPlayer);

    if (!soundEnabled.current || !isScreenFocusedRef.current) {
      return;
    }

    if (!globalState.audioContextUnlocked) {
      await unlockAudioContext();
    }

    try {
      // Reset to beginning and play
      receivedPlayer.seekTo(0);
      receivedPlayer.play();
    } catch (error) {
      console.error("[ChatSound] Error playing received sound:", error);
    }
  }, [receivedPlayer, typingPlayer]);

  /**
   * Start playing the typing sound in a loop
   * The sound will play repeatedly until stopTypingSound is called
   */
  const playTypingSound = useCallback(async () => {
    if (!soundEnabled.current || !isScreenFocusedRef.current) {
      return;
    }

    if (!globalState.audioContextUnlocked) {
      await unlockAudioContext();
    }

    // Stop any existing typing sound first
    stopTypingSoundGlobal(typingPlayer);

    // Set flag to true - typing sound is now enabled
    typingSoundEnabled = true;

    try {
      // Set up continuous focus check interval (checks every 100ms)
      // This ensures typing sound stops immediately when screen loses focus or is disabled
      typingSoundCheckInterval = setInterval(() => {
        // Check both focus state and typing sound enabled flag
        if (!isScreenFocusedRef.current || !typingSoundEnabled) {
          stopTypingSoundGlobal(typingPlayer);
        }
      }, 100);

      // Reset to beginning and play with loop enabled
      typingPlayer.seekTo(0);
      typingPlayer.play();
    } catch (error) {
      console.error("[ChatSound] Error playing typing sound:", error);
      typingSoundEnabled = false;
    }
  }, [typingPlayer]);

  /**
   * Stop the typing sound immediately
   * This can be called even if the typing sound is mid-play
   */
  const stopTypingSound = useCallback(() => {
    stopTypingSoundGlobal(typingPlayer);
  }, [typingPlayer]);

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
    playTypingSound,
    stopTypingSound,
    setSoundEnabled,
    getSoundEnabled,
    toggleSoundEnabled,
    soundsLoaded: globalState.audioContextUnlocked,
  };
};

export default useChatSound;
