import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useReducer,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  fetchChatHistoryAPI,
  sendChatMessageAPI,
  markChatRoomReadAPI,
  deleteChatMessagesAPI,
  blockGymMateUserAPI,
  reportGymMateEntityAPI,
  leaveChatRoomAPI,
  reportChatRoomAPI,
  getSessionParticipantsAPI,
} from "../../../services/clientApi";
import { inboxSocket } from "../../../src/features/chat/socket";
import {
  threadReducer,
  initialThreadState,
  generateMsgId,
} from "../../../src/features/chat/threadState";
import Avatar from "../../../src/features/chat/components/Avatar";
import { EmojiKeyboard } from "rn-emoji-keyboard";

const REPORT_REASONS = [
  { label: "Inappropriate or offensive content", key: "inappropriate_content" },
  { label: "Spam or misleading", key: "spam" },
  { label: "Harassment or bullying", key: "harassment" },
  { label: "Violence or dangerous acts", key: "violence" },
  { label: "False information", key: "false_information" },
  { label: "Suicide or self-injury", key: "self_injury" },
  { label: "Scams or fraud", key: "scam" },
  { label: "Nudity & Sexual Content", key: "nudity" },
  { label: "Intellectual Property Infringement", key: "ip_infringement" },
  { label: "Promoting Restricted Items", key: "restricted_items" },
];

// ─── Date pill ────────────────────────────────────────────────────────────────

function datePillLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

const DatePill = ({ label }) => (
  <View style={s.datePillWrap}>
    <View style={s.datePill}>
      <Text style={s.datePillText}>{label}</Text>
    </View>
  </View>
);

// ─── Time formatter ─────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Message bubble ─────────────────────────────────────────────────────────

const Bubble = React.memo(
  ({
    item,
    isMe,
    senderName,
    senderAvatar,
    isGroupContinuation,
    showTime = true,
    selecting,
    selected,
    onLongPress,
    onToggle,
  }) => {
    if (item.is_deleted) {
      return (
        <View style={[s.bubbleWrap, isMe ? s.bubbleWrapMe : s.bubbleWrapThem]}>
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
            <Text
              style={[s.bubbleText, { fontStyle: "italic", color: "#999" }]}
            >
              Message deleted
            </Text>
          </View>
        </View>
      );
    }

    const msgId = item.message_id || item._clientMsgId;

    // For other people's messages with an avatar, wrap in a row
    const showAvatar = !isMe && senderAvatar;

    const bubbleContent = (
      <>
        {selecting && isMe && (
          <View style={[s.selectCircle, selected && s.selectCircleActive]}>
            {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
        )}
        {senderName && !isMe && <Text style={s.senderName}>{senderName}</Text>}
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={s.bubbleText}>{item.body}</Text>
        </View>
        {(showTime || item.is_edited || item._pending || item._failed) && (
          <View style={[s.timeRow, isMe ? s.timeRowMe : s.timeRowThem]}>
            {showTime && (
              <Text style={[s.timeText, isMe ? s.timeMe : s.timeThem]}>
                {formatTime(item.created_at)}
              </Text>
            )}
            {item.is_edited && <Text style={s.editedLabel}> edited</Text>}
            {item._pending && (
              <Ionicons
                name="time-outline"
                size={12}
                color="#9CA3AF"
                style={{ marginLeft: 4 }}
              />
            )}
            {item._failed && (
              <Ionicons
                name="alert-circle"
                size={12}
                color="#FF5757"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
      </>
    );

    if (showAvatar) {
      return (
        <View style={s.bubbleRowThem}>
          <Image source={{ uri: senderAvatar }} style={s.bubbleAvatar} />
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => isMe && !item._pending && onLongPress?.(msgId)}
            onPress={() =>
              selecting && isMe && !item._pending && onToggle?.(msgId)
            }
            delayLongPress={400}
            style={[
              s.bubbleWrap,
              s.bubbleWrapThem,
              { flex: 1, marginBottom: 0 },
              selected && s.bubbleSelected,
            ]}
          >
            {bubbleContent}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => isMe && !item._pending && onLongPress?.(msgId)}
        onPress={() => selecting && isMe && !item._pending && onToggle?.(msgId)}
        delayLongPress={400}
        style={[
          s.bubbleWrap,
          isMe ? s.bubbleWrapMe : s.bubbleWrapThem,
          isGroupContinuation && { marginLeft: 36, marginBottom: 2 },
          selected && s.bubbleSelected,
        ]}
      >
        {bubbleContent}
      </TouchableOpacity>
    );
  },
);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Message() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const roomId = params.room_id ? Number(params.room_id) : null;
  const name = params.name || "User";
  const avatarUrl = params.avatar_url || null;
  const kind = params.kind || "friend_direct";
  const isGroup = kind === "session_group";
  const sessionId = params.session_id || null;
  const sessionDate = params.session_date || null;
  const sessionTime = params.session_time || null;
  const participants = (() => {
    try {
      return params.participants ? JSON.parse(params.participants) : [];
    } catch {
      return [];
    }
  })();

  const [state, dispatch] = useReducer(threadReducer, initialThreadState);
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const selecting = selectedIds.size > 0;
  const listRef = useRef(null);
  const myClientIdRef = useRef(null);
  const peerClientIdRef = useRef(null);

  // ── Bootstrap: load client_id, connect WS, fetch history ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const clientId = await AsyncStorage.getItem("client_id");
      if (cancelled) return;

      myClientIdRef.current = clientId ? Number(clientId) : null;

      // Connect WS if not already connected — connect() is idempotent.
      inboxSocket.connect();

      // Fetch initial history
      if (!roomId) return;
      dispatch({ type: "LOAD_START" });
      try {
        const res = await fetchChatHistoryAPI(roomId);

        if (cancelled) return;
        if (res?.status === 200) {
          // Backend returns data: MessageDTO[] directly (newest first)
          const msgs = Array.isArray(res.data) ? res.data : [];
          if (res.peer_client_id) peerClientIdRef.current = res.peer_client_id;
          dispatch({
            type: "LOAD_SUCCESS",
            page: msgs,
            append: false,
            limit: 40,
          });
          if (msgs.length > 0) {
            markChatRoomReadAPI(roomId, msgs[0].message_id).catch(() => {});
          }
        } else {
          dispatch({
            type: "LOAD_ERROR",
            message: "Failed to load messages",
          });
        }
      } catch (err) {
        if (!cancelled) dispatch({ type: "LOAD_ERROR", message: err.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // ── Live WS updates (filtered to this room) ──
  useEffect(() => {
    if (!roomId) return;
    const unsub = inboxSocket.subscribe((frame) => {
      if (frame.room_id !== roomId) return;
      switch (frame.type) {
        case "message": {
          dispatch({
            type: "WS_MESSAGE",
            frame,
            myClientId: myClientIdRef.current,
          });
          // Backend frame shape: { type, room_id, message: { sender_client_id, message_id, ... } }
          const msg = frame.message;
          if (msg && msg.sender_client_id !== myClientIdRef.current) {
            markChatRoomReadAPI(roomId, msg.message_id).catch(() => {});
          }
          break;
        }
        case "edited":
          dispatch({ type: "WS_EDITED", frame });
          break;
        case "deleted":
          dispatch({ type: "WS_DELETED", frame });
          break;
      }
    });
    return unsub;
  }, [roomId]);

  // ── Android keyboard handling ──
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      if (Platform.OS === "android") setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ── Load older messages (pagination) ──
  const loadOlder = useCallback(async () => {
    if (!state.hasMore || state.loading || !state.nextCursor || !roomId) return;
    dispatch({ type: "LOAD_START" });
    try {
      const res = await fetchChatHistoryAPI(roomId, {
        before: state.nextCursor,
      });
      if (res?.status === 200) {
        const msgs = Array.isArray(res.data) ? res.data : [];
        dispatch({
          type: "LOAD_SUCCESS",
          page: msgs,
          append: true,
          limit: 40,
        });
      } else {
        dispatch({ type: "LOAD_ERROR", message: "Failed to load more" });
      }
    } catch (err) {
      dispatch({ type: "LOAD_ERROR", message: err.message });
    }
  }, [roomId, state.hasMore, state.loading, state.nextCursor]);

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    const text = input.trim();

    if (!text || !roomId) return;

    const clientMsgId = generateMsgId();
    setInput("");

    // Optimistic insert
    dispatch({
      type: "OPTIMISTIC_SEND",
      client_msg_id: clientMsgId,
      body: text,
      myClientId: myClientIdRef.current,
    });

    // POST to API. Backend returns 200, not 201.
    try {
      const res = await sendChatMessageAPI(roomId, text, clientMsgId);
      if (res?.status === 200 && res.data) {
        dispatch({ type: "SEND_CONFIRMED", serverMsg: res.data });
      } else {
        dispatch({ type: "SEND_FAILED", client_msg_id: clientMsgId });
      }
    } catch {
      dispatch({ type: "SEND_FAILED", client_msg_id: clientMsgId });
    }
  }, [input, roomId]);

  // ── Selection handlers ──
  const onLongPress = useCallback((msgId) => {
    setSelectedIds(new Set([msgId]));
  }, []);

  const onToggle = useCallback((msgId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    Alert.alert(
      "Delete",
      `Delete ${ids.length === 1 ? "this message" : `${ids.length} messages`}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await deleteChatMessagesAPI(ids);
              if (res?.status === 200 && res.data?.deleted?.length > 0) {
                res.data.deleted.forEach((id) => {
                  dispatch({
                    type: "WS_DELETED",
                    frame: { message_id: id },
                  });
                });
              }
            } catch {}
            setDeleting(false);
            setSelectedIds(new Set());
          },
        },
      ],
    );
  }, [selectedIds]);

  // ── Report handler ──
  const handleReport = useCallback(async () => {
    if (!selectedReason || actionLoading) return;
    setActionLoading(true);
    try {
      let res;
      if (isGroup) {
        res = await reportChatRoomAPI(roomId, selectedReason.key);
      } else {
        res = await reportGymMateEntityAPI({
          entity_type: "user",
          entity_id: peerClientIdRef.current,
          reason: selectedReason.key,
        });
      }
      setReportModal(false);
      setSelectedReason(null);
      if (res?.status === 200) setReportSuccess(true);
    } catch {
      setReportModal(false);
      setSelectedReason(null);
    } finally {
      setActionLoading(false);
    }
  }, [selectedReason, actionLoading, isGroup, roomId]);

  // ── Block handler (individual only) ──
  const handleBlock = useCallback(async () => {
    const peerId = peerClientIdRef.current;
    if (actionLoading || !peerId) return;
    setActionLoading(true);
    try {
      const res = await blockGymMateUserAPI(peerId);
      setBlockConfirm(false);
      if (res?.status === 200) setBlockSuccess(true);
    } catch {
      setBlockConfirm(false);
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading]);

  // ── Leave group handler ──
  const handleLeaveGroup = useCallback(async () => {
    if (actionLoading || !roomId) return;
    setActionLoading(true);
    try {
      const res = await leaveChatRoomAPI(roomId);
      setLeaveConfirm(false);
      if (res?.status === 200) setLeaveSuccess(true);
      else {
        const msg = res?.detail ?? res?.message ?? "Couldn't leave group.";
        Alert.alert("Leave Group", msg);
      }
    } catch {
      setLeaveConfirm(false);
      Alert.alert("Leave Group", "Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, roomId]);

  // ── Open members modal (group only) ──
  const openMembers = useCallback(async () => {
    if (!isGroup || !sessionId) return;
    setMembersVisible(true);
    setMembersLoading(true);
    try {
      const res = await getSessionParticipantsAPI(sessionId);
      if (res?.status === 200) setMembersList(res.data || []);
    } catch {}
    setMembersLoading(false);
  }, [isGroup, sessionId]);

  // ── Participant lookup for group sender names ──
  const participantMap = React.useMemo(() => {
    const map = {};
    participants.forEach((p) => {
      map[p.client_id] = {
        name: p.name || "User",
        avatar_url: p.avatar_url || null,
      };
    });
    return map;
  }, [participants]);

  // ── Build display data (inverted: newest first) ──
  const data = [...state.messages].reverse();

  // ── Insert date separators + compute showTime + showSenderInfo ──
  const dataWithDates = [];
  for (let i = 0; i < data.length; i++) {
    const msg = data[i];
    const prevMsg = i > 0 ? data[i - 1] : null;
    // Hide time if the message below (prevMsg) is from the same sender
    // and has the same formatted time — only the bottom-most shows it.
    const sameTimeAsBelow =
      prevMsg &&
      prevMsg.sender_client_id === msg.sender_client_id &&
      formatTime(prevMsg.created_at) === formatTime(msg.created_at);
    // In inverted list, higher index = visually above.
    // Show sender info (avatar + name) only for the first message in a
    // consecutive run by the same sender (i.e. the topmost in the group).
    const nextMsg = i < data.length - 1 ? data[i + 1] : null;
    const sameSenderAbove =
      nextMsg &&
      nextMsg.sender_client_id === msg.sender_client_id &&
      isSameDay(msg.created_at, nextMsg.created_at);
    dataWithDates.push({
      ...msg,
      _showTime: !sameTimeAsBelow,
      _showSenderInfo: !sameSenderAbove,
    });
    // Push date separator after the message so it renders on top of the group.
    if (!nextMsg || !isSameDay(msg.created_at, nextMsg.created_at)) {
      dataWithDates.push({
        _type: "date",
        _id: `date-${msg.created_at}`,
        label: datePillLabel(msg.created_at),
      });
    }
  }

  const renderItem = useCallback(
    ({ item }) => {
      if (item._type === "date") {
        return <DatePill label={item.label} />;
      }
      const isMe = item.sender_client_id === myClientIdRef.current;
      const participant = isGroup
        ? participantMap[item.sender_client_id]
        : null;
      const showSenderInfo = isGroup && item._showSenderInfo !== false;
      const senderName = showSenderInfo ? participant?.name || null : null;
      const senderAvatar = showSenderInfo
        ? participant?.avatar_url || null
        : null;
      const isGroupContinuation = isGroup && !isMe && !showSenderInfo;
      const msgId = item.message_id || item._clientMsgId;
      return (
        <Bubble
          item={item}
          isMe={isMe}
          senderName={senderName}
          senderAvatar={senderAvatar}
          isGroupContinuation={isGroupContinuation}
          showTime={item._showTime !== false}
          selecting={selecting}
          selected={selectedIds.has(msgId)}
          onLongPress={onLongPress}
          onToggle={onToggle}
        />
      );
    },
    [isGroup, participantMap, selecting, selectedIds, onLongPress, onToggle],
  );

  const keyExtractor = useCallback(
    (item) =>
      item._type === "date"
        ? item._id
        : String(item.message_id || item._clientMsgId),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <SafeAreaView edges={["top"]} style={s.safeHeader}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>

          {isGroup ? (
            <TouchableOpacity
              style={s.headerTouchable}
              activeOpacity={0.7}
              onPress={openMembers}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
              ) : (
                <Avatar size={42} fallback={(name || "?")[0]} />
              )}
              <View style={s.headerInfo}>
                <Text style={s.headerName}>Session Chat</Text>
                <Text style={s.headerGymName}>{name}</Text>
                <Text style={s.memberCount}>
                  {participants.length} members
                  {sessionDate
                    ? ` | ${new Date(sessionDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}`
                    : ""}
                  {sessionTime
                    ? ` | ${new Date("2000-01-01T" + sessionTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}`
                    : ""}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/client/(gymmate)/profilemate",
                  params: { client_id: peerClientIdRef.current },
                })
              }
              style={s.headerTouchable}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.headerAvatar} />
              ) : (
                <Avatar size={42} fallback={(name || "?")[0]} />
              )}
              <View style={s.headerInfo}>
                <Text style={s.headerName}>{name}</Text>
                <View style={s.onlineRow}></View>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={s.actionBtn}
            activeOpacity={0.7}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Participant avatar rings (fixed, group only, 2+ members) */}
        {isGroup && participants.length >= 2 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openMembers}
            style={s.chatAvatarBanner}
          >
            <View style={s.chatAvatarStack}>
              {participants.slice(0, 3).map((p, i) => (
                <View
                  key={p.client_id}
                  style={[
                    s.chatStackRing,
                    { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -14 },
                  ]}
                >
                  {p.avatar_url ? (
                    <Image
                      source={{ uri: p.avatar_url }}
                      style={s.chatStackAvatar}
                    />
                  ) : (
                    <View style={s.chatStackFallback}>
                      <Text style={s.chatStackFallbackText}>
                        {(p.name || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {participants.length > 3 && (
                <View
                  style={[
                    s.chatStackRing,
                    s.chatStackCountBadge,
                    { zIndex: 0, marginLeft: -14 },
                  ]}
                >
                  <Text style={s.chatStackCountText}>
                    +{participants.length - 3}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={dataWithDates}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          onScrollBeginDrag={() => setEmojiOpen(false)}
          onTouchStart={() => setEmojiOpen(false)}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            state.loading ? <ActivityIndicator style={{ padding: 12 }} /> : null
          }
          ListEmptyComponent={
            !state.loading ? (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>No messages yet</Text>
                <Text style={s.emptyHint}>
                  Send a message to start chatting
                </Text>
              </View>
            ) : null
          }
        />

        {/* Input bar / Selection bar */}
        <SafeAreaView
          edges={["bottom"]}
          style={[
            s.inputSafe,
            Platform.OS === "android" && { paddingBottom: keyboardHeight },
          ]}
        >
          {selecting ? (
            <View style={s.selectBar}>
              <TouchableOpacity
                onPress={cancelSelection}
                style={s.selectBarBtn}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
              <Text style={s.selectBarText}>{selectedIds.size} selected</Text>
              <TouchableOpacity
                onPress={deleteSelected}
                disabled={deleting}
                style={s.selectBarDeleteBtn}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.inputBar}>
              <TouchableOpacity
                style={s.emojiBtn}
                activeOpacity={0.7}
                onPress={() => {
                  Keyboard.dismiss();
                  setEmojiOpen(true);
                }}
              >
                <Ionicons name="happy-outline" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                multiline
                onFocus={() => setEmojiOpen(false)}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />

              <TouchableOpacity
                style={s.sendBtn}
                onPress={sendMessage}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>

        {emojiOpen && (
          <View style={{ height: 350 }}>
            <EmojiKeyboard
              onEmojiSelected={(e) => setInput((prev) => prev + e.emoji)}
              enableSearchBar
              enableRecentlyUsed
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 3-dot menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={s.menuBackdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
        <View style={s.menuSheet}>
          {isGroup ? (
            <>
              <TouchableOpacity
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  setReportModal(true);
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                <Text style={[s.menuItemText, { color: "#F59E0B" }]}>
                  Report Group
                </Text>
              </TouchableOpacity>
              <View style={s.menuDivider} />
              <TouchableOpacity
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  setLeaveConfirm(true);
                }}
              >
                <Ionicons name="exit-outline" size={20} color="#DC2626" />
                <Text style={[s.menuItemText, { color: "#DC2626" }]}>
                  Leave Group
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  setReportModal(true);
                }}
              >
                <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                <Text style={[s.menuItemText, { color: "#F59E0B" }]}>
                  Report
                </Text>
              </TouchableOpacity>
              <View style={s.menuDivider} />
              <TouchableOpacity
                style={s.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  setMenuVisible(false);
                  setBlockConfirm(true);
                }}
              >
                <Ionicons name="ban-outline" size={20} color="#DC2626" />
                <Text style={[s.menuItemText, { color: "#DC2626" }]}>
                  Block
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Block confirmation modal (individual only) */}
      <Modal
        visible={blockConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockConfirm(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Ionicons name="ban" size={32} color="#FF5757" />
            </View>
            <Text style={s.modalTitle}>Block {name}?</Text>
            <Text style={s.modalMsg}>
              They won't be able to see your profile, stories, or send you
              messages. You can unblock them anytime from settings.
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnOutline}
                activeOpacity={0.8}
                onPress={() => setBlockConfirm(false)}
              >
                <Text style={s.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnFill, actionLoading && { opacity: 0.6 }]}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={handleBlock}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={s.modalBtnFillText}>Block</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Block success modal */}
      <Modal
        visible={blockSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setBlockSuccess(false);
          router.back();
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text style={s.modalTitle}>User Blocked</Text>
            <Text style={s.modalMsg}>
              {name} has been blocked. You can unblock them anytime from
              settings.
            </Text>
            <TouchableOpacity
              style={s.modalDoneBtn}
              activeOpacity={0.8}
              onPress={() => {
                setBlockSuccess(false);
                router.back();
              }}
            >
              <Text style={s.modalBtnFillText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report modal — reason selection */}
      <Modal
        visible={reportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReportModal(false);
          setSelectedReason(null);
        }}
      >
        <View style={s.reportBackdrop}>
          <View style={s.reportCard}>
            <View style={s.reportHeader}>
              <Text style={s.reportTitle}>
                {isGroup ? "Report Group" : "Report User"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setReportModal(false);
                  setSelectedReason(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={s.reportSubtitle}>
              Why are you reporting {isGroup ? "this group" : name}?
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 340 }}
            >
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  style={[
                    s.reportOption,
                    selectedReason?.key === reason.key &&
                      s.reportOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View
                    style={[
                      s.reportRadio,
                      selectedReason?.key === reason.key &&
                        s.reportRadioSelected,
                    ]}
                  >
                    {selectedReason?.key === reason.key && (
                      <View style={s.reportRadioDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      s.reportOptionText,
                      selectedReason?.key === reason.key &&
                        s.reportOptionTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[
                s.reportSubmitBtn,
                (!selectedReason || actionLoading) && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
              disabled={!selectedReason || actionLoading}
              onPress={handleReport}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={s.reportSubmitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report success modal */}
      <Modal
        visible={reportSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setReportSuccess(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text style={s.modalTitle}>Report Submitted</Text>
            <Text style={s.modalMsg}>
              Thank you for letting us know. Our team will review this report
              and take appropriate action.
            </Text>
            <TouchableOpacity
              style={s.modalDoneBtn}
              activeOpacity={0.8}
              onPress={() => setReportSuccess(false)}
            >
              <Text style={s.modalBtnFillText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Leave group confirmation modal */}
      <Modal
        visible={leaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveConfirm(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Ionicons name="exit-outline" size={32} color="#FF5757" />
            </View>
            <Text style={s.modalTitle}>Leave Group?</Text>
            <Text style={s.modalMsg}>
              You will no longer receive messages from this group. To rejoin,
              you'll need to send a fresh request.
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnOutline}
                activeOpacity={0.8}
                onPress={() => setLeaveConfirm(false)}
              >
                <Text style={s.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtnFill, actionLoading && { opacity: 0.6 }]}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={handleLeaveGroup}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={s.modalBtnFillText}>Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Leave group success modal */}
      <Modal
        visible={leaveSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setLeaveSuccess(false);
          router.back();
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text style={s.modalTitle}>Left Group</Text>
            <Text style={s.modalMsg}>
              You have left this group. You can rejoin by sending a fresh
              request.
            </Text>
            <TouchableOpacity
              style={s.modalDoneBtn}
              activeOpacity={0.8}
              onPress={() => {
                setLeaveSuccess(false);
                router.back();
              }}
            >
              <Text style={s.modalBtnFillText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Participants modal (group only) */}
      <Modal
        visible={membersVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setMembersVisible(false)}
      >
        <View style={s.membersOverlay}>
          <View style={[s.membersSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={s.membersHandle} />
            <View style={s.membersHeader}>
              <Text style={s.membersTitle}>Participants</Text>
              <TouchableOpacity
                onPress={() => setMembersVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {membersLoading ? (
              <View style={s.membersLoader}>
                <ActivityIndicator size="large" color="#FF5757" />
              </View>
            ) : membersList.length === 0 ? (
              <View style={s.membersEmpty}>
                <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
                  No participants yet
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.membersList}
              >
                {membersList.map((p) => (
                  <TouchableOpacity
                    key={p.client_id}
                    style={s.memberRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setMembersVisible(false);
                      router.push({
                        pathname: "/client/(gymmate)/profilemate",
                        params: { client_id: p.client_id },
                      });
                    }}
                  >
                    {p.avatar_url ? (
                      <Image
                        source={{ uri: p.avatar_url }}
                        style={s.memberAvatar}
                      />
                    ) : (
                      <Avatar size={42} fallback={(p.name || "?")[0]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>
                        {p.name}
                        {p.is_viewer ? " (You)" : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D1D5DB"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  safeHeader: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E5E7EB",
  },
  headerTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172B",
  },
  headerGymName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 1,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  onlineText: {
    fontSize: 11,
    color: "#22C55E",
    fontWeight: "500",
  },
  memberCount: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // Participant avatar banner (top of chat, group only)
  chatAvatarBanner: {
    alignItems: "center",
    paddingVertical: 10,
  },
  chatAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatStackRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chatStackAvatar: {
    width: 39,
    height: 39,
    borderRadius: 20,
  },
  chatStackFallback: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#0F172B",
    alignItems: "center",
    justifyContent: "center",
  },
  chatStackFallbackText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chatStackCountBadge: {
    backgroundColor: "#F1F5F9",
  },
  chatStackCountText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172B",
  },

  // Messages list
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  // Date pill
  datePillWrap: {
    alignItems: "center",
    marginVertical: 14,
  },
  datePill: {
    backgroundColor: "#0F172B",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Sender avatar row (group chats)
  bubbleRowThem: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "flex-start",
    maxWidth: "82%",
    marginBottom: 10,
    gap: 8,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    marginTop: 20,
  },

  // Sender name (group chats)
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },

  // Bubble
  bubbleWrap: {
    marginBottom: 10,
    maxWidth: "78%",
  },
  bubbleWrapMe: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubbleWrapThem: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: "#F1F5F9",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  timeRowMe: {
    justifyContent: "flex-end",
  },
  timeRowThem: {
    justifyContent: "flex-start",
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  timeMe: {
    textAlign: "right",
  },
  timeThem: {
    textAlign: "left",
  },
  editedLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Empty state
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1A1A1A" },
  emptyHint: { color: "#9CA3AF", marginTop: 8, textAlign: "center" },

  // Input bar
  inputSafe: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  emojiBtn: {
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    maxHeight: 100,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0F172B",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#0F172B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // 3-dot menu
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  menuSheet: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 4,
    minWidth: 160,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },

  // Selection mode
  bubbleSelected: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  selectCircleActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  selectBarBtn: {
    padding: 4,
  },
  selectBarText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  selectBarDeleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  // Report / Block modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtnOutline: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalBtnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalBtnFill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  modalBtnFillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  modalDoneBtn: {
    width: "100%",
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#0F172B",
    alignItems: "center",
  },

  // Report reason sheet
  reportBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reportCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  reportSubtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  reportOptionSelected: {
    backgroundColor: "#FFF0F0",
  },
  reportRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
  },
  reportRadioSelected: {
    borderColor: "#FF5757",
  },
  reportRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5757",
  },
  reportOptionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  reportOptionTextSelected: {
    color: "#FF5757",
    fontWeight: "600",
  },
  reportSubmitBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  reportSubmitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Members modal
  membersOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  membersSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  membersHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  membersLoader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  membersEmpty: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  membersList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});
