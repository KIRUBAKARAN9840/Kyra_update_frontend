import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  openDirectRoomAPI,
  openSessionGroupRoomAPI,
} from "../../../../services/clientApi";

const ERROR_MESSAGES = {
  GYMMATE_CHAT_SELF: "You cannot chat with yourself.",
  GYMMATE_CHAT_BLOCKED: "You cannot message this user.",
  GYMMATE_CHAT_NOT_FRIENDS: "Add as friend to start a chat.",
  GYMMATE_CHAT_SESSION_CLOSED: "This session has ended.",
  GYMMATE_CHAT_SESSION_NOT_FOUND: "Session not found.",
  GYMMATE_CHAT_NOT_SESSION_MEMBER: "Only session members can chat.",
  GYMMATE_CHAT_PEER_NOT_SESSION_MEMBER: "That user isn't in this session.",
};

function handleError(res) {
  const msg =
    ERROR_MESSAGES[res?.error_code] ??
    res?.detail ??
    res?.message ??
    "Couldn't open chat.";
  Alert.alert("Chat", msg);
}

function navigateToRoom(router, room, myClientId, titleOverride) {
  const isGroup = room.kind === "session_group";
  const other = isGroup
    ? null
    : room.participants?.find((p) => p.client_id !== myClientId);

  const title =
    titleOverride ??
    (isGroup ? room.gym_name || "Group chat" : other?.name ?? "Chat");

  const avatarUrl = isGroup ? room.gym_cover_pic || "" : other?.avatar_url ?? "";

  router.push({
    pathname: "/client/(gymmate)/message",
    params: {
      room_id: room.room_id,
      kind: room.kind,
      session_id: room.session_id ?? "",
      name: title,
      avatar_url: avatarUrl,
      participants: JSON.stringify(room.participants ?? []),
      session_date: room.session_date ?? "",
      session_time: room.session_time ?? "",
    },
  });
}

export function useOpenChat() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  /** Friend-direct (no session_id) or session-direct (with session_id). */
  const openDirect = useCallback(
    async (peerClientId, { name, avatar_url, session_id } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const myClientId = Number(
          (await AsyncStorage.getItem("client_id")) ?? 0,
        );
        const res = await openDirectRoomAPI(peerClientId, session_id ?? null);
        if (res?.status === 200 || res?.status === 201) {
          // Backend wraps response as { status, data: room }, unwrap it
          const room = res.data?.data ?? res.data;
          navigateToRoom(router, room, myClientId, name);
        } else {
          handleError(res);
        }
      } catch {
        Alert.alert("Chat", "Couldn't open chat. Please try again.");
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [router],
  );

  /** Session group room. */
  const openGroup = useCallback(
    async (sessionId, titleOverride) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const myClientId = Number(
          (await AsyncStorage.getItem("client_id")) ?? 0,
        );
        const res = await openSessionGroupRoomAPI(sessionId);

        if (res?.status === 200) {

          navigateToRoom(router, res.data, myClientId, titleOverride);
        } else {
          handleError(res);
        }
      } catch {
        Alert.alert("Chat", "Couldn't open group chat. Please try again.");
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [router],
  );

  return { openDirect, openGroup, loading };
}
