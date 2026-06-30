import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useSafeNav } from "../../../hooks/useSafeNav";
import {
  fetchChatInboxAPI,
  markChatRoomReadAPI,
} from "../../../services/clientApi";
import { useOpenChat } from "../../../src/features/chat/hooks/useOpenChat";
import { inboxSocket } from "../../../src/features/chat/socket";
import {
  inboxReducer,
  initialInboxState,
} from "../../../src/features/chat/state";
import InboxRow from "../../../src/features/chat/components/InboxRow";
import Avatar from "../../../src/features/chat/components/Avatar";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Chat() {
  const router = useRouter();
  const navigate = useSafeNav();
  const insets = useSafeAreaInsets();
  const { openDirect, openGroup } = useOpenChat();

  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const [recentFriends, setRecentFriends] = useState([]);
  const openRoomIdRef = useRef(null);
  const myClientIdRef = useRef(null);

  // ── Bootstrap: fetch client_id, connect WS, load inbox ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const clientId = await AsyncStorage.getItem("client_id");
      if (cancelled) return;

      myClientIdRef.current = clientId ? Number(clientId) : null;

      // Connect WebSocket — socket reads JWT from SecureStore itself,
      // and refreshes via axios's refreshToken() if it expires.
      inboxSocket.connect();

      // Fetch initial inbox
      dispatch({ type: "LOAD_START" });
      try {
        const res = await fetchChatInboxAPI();

        if (!cancelled && res?.status === 200) {
          // DEBUG: check what fields group items have
          const groupItem = res.data.items?.find(
            (i) => i.kind === "session_group",
          );
          if (groupItem)
            dispatch({ type: "LOAD_SUCCESS", page: res.data, append: false });
          if (res.data.recent_friends) {
            setRecentFriends(res.data.recent_friends);
          }
        } else if (!cancelled) {
          dispatch({ type: "LOAD_ERROR", message: "Failed to load chats" });
        }
      } catch (err) {
        if (!cancelled) dispatch({ type: "LOAD_ERROR", message: err.message });
      }
    })();

    // Do NOT disconnect on unmount. When the user taps a row, expo-router
    // mounts ChatThread on top — chat.jsx unmount would kill the live WS
    // (and trigger reconnect storms / 403s). The socket stays open across
    // the whole chat surface and is torn down by the gymmate layout when
    // the user leaves the chat area entirely.
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Inbox is focused → we're NOT viewing any specific room.
  // Clear the ref so live messages from any room properly bump unread.
  useFocusEffect(
    useCallback(() => {
      openRoomIdRef.current = null;
      return () => {};
    }, []),
  );

  // ── Live WS updates ──
  useEffect(() => {
    const unsub = inboxSocket.subscribe((frame) => {
      switch (frame.type) {
        case "message":
          dispatch({
            type: "WS_MESSAGE",
            frame,
            myClientId: myClientIdRef.current,
            openRoomId: openRoomIdRef.current,
          });
          break;
        case "edited":
          dispatch({ type: "WS_EDITED", frame });
          break;
        case "deleted":
          dispatch({ type: "WS_DELETED", frame });
          break;
      }
    });
    return unsub;
  }, []);

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    dispatch({ type: "REFRESH_START" });
    try {
      const res = await fetchChatInboxAPI();
      if (res?.status === 200) {
        dispatch({ type: "LOAD_SUCCESS", page: res.data, append: false });
        if (res.data.recent_friends) {
          setRecentFriends(res.data.recent_friends);
        }
      } else {
        dispatch({ type: "LOAD_ERROR", message: "Failed to refresh" });
      }
    } catch (err) {
      dispatch({ type: "LOAD_ERROR", message: err.message });
    }
  }, []);

  // ── Pagination ──
  const onEndReached = useCallback(async () => {
    if (!state.hasMore || state.loading || !state.nextCursor) return;
    dispatch({ type: "LOAD_START" });
    try {
      const res = await fetchChatInboxAPI({ before_at: state.nextCursor });
      if (res?.status === 200) {
        dispatch({ type: "LOAD_SUCCESS", page: res.data, append: true });
      } else {
        dispatch({ type: "LOAD_ERROR", message: "Failed to load more" });
      }
    } catch (err) {
      dispatch({ type: "LOAD_ERROR", message: err.message });
    }
  }, [state.hasMore, state.loading, state.nextCursor]);

  // ── Tap a room ──
  const openRoom = useCallback(
    (item) => {
      openRoomIdRef.current = item.room_id;
      dispatch({ type: "RESET_UNREAD", room_id: item.room_id });
      if (item.last_message) {
        markChatRoomReadAPI(item.room_id, item.last_message.message_id).catch(
          () => {},
        );
      }
      if (item.kind === "session_group" && item.session_id) {
        openGroup(item.session_id, item.title);
      } else {
        navigate("/client/(gymmate)/message", {
          room_id: item.room_id,
          kind: item.kind || "friend_direct",
          name: item.title,
          avatar_url: item.avatar_url,
          participants: JSON.stringify(item.participants ?? []),
        });
      }
    },
    [navigate, openGroup],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <InboxRow
        item={item}
        myClientId={myClientIdRef.current}
        onPress={() => openRoom(item)}
      />
    ),
    [openRoom],
  );

  const data = state.order.map((id) => state.items[id]).filter(Boolean);

  // ── Header component for FlatList (recent matches + divider) ──
  const ListHeader = useCallback(
    () => (
      <>
        {recentFriends.length > 0 && (
          <View style={s.recentSection}>
            <Text style={s.recentLabel}>Suggested Chats</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.recentRow}
            >
              {recentFriends.slice(0, 3).map((friend) => (
                <TouchableOpacity
                  key={friend.client_id}
                  style={s.recentItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    openDirect(friend.client_id, {
                      name: friend.name,
                      avatar_url: friend.avatar_url,
                    })
                  }
                >
                  <View style={s.recentRing}>
                    {friend.avatar_url ? (
                      <Image
                        source={{ uri: friend.avatar_url }}
                        style={s.recentAvatar}
                      />
                    ) : (
                      <Avatar size={60} fallback={(friend.name || "?")[0]} />
                    )}
                  </View>
                  <Text style={s.recentName} numberOfLines={1}>
                    {friend.name || "User"}
                  </Text>
                </TouchableOpacity>
              ))}
              {recentFriends.length > 3 && (
                <TouchableOpacity
                  style={s.recentItem}
                  activeOpacity={0.8}
                  onPress={() => navigate("/client/(gymmate)/myfriends")}
                >
                  <View style={s.viewAllRing}>
                    <MaterialIcons
                      name="arrow-forward"
                      size={24}
                      color="#555"
                    />
                  </View>
                  <Text style={s.recentName} numberOfLines={1}>
                    View All
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
        <View style={s.divider} />
      </>
    ),
    [navigate, recentFriends],
  );

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Chat</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(it) => String(it.room_id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          !state.loading ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No chats yet</Text>
              <Text style={s.emptyHint}>
                Start a conversation from your friends list or a session.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          state.loading && data.length ? (
            <ActivityIndicator style={{ padding: 12 }} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    marginRight: 12,
    padding: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Recent matches
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  recentLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 14,
  },
  recentRow: {
    gap: 20,
    paddingRight: 8,
  },
  recentItem: {
    alignItems: "center",
    gap: 6,
  },
  recentRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FF5757",
  },
  recentAvatar: {
    width: "100%",
    height: "100%",
  },
  recentName: {
    fontSize: 12,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  viewAllRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#555",
  },

  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },

  separator: {
    height: 0.5,
    backgroundColor: "#F3F4F6",
    marginLeft: 82,
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
});
