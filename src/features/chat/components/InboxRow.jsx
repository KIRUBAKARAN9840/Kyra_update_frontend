import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "./Avatar";
import UnreadBadge from "./UnreadBadge";
import RelativeTime from "./RelativeTime";

function previewLine(item, myClientId) {
  if (!item.last_message) return "";
  const { body, sender_client_id, kind, is_deleted } = item.last_message;
  if (is_deleted) return "Message deleted";
  if (kind === "system") return body;
  const prefix = sender_client_id === myClientId ? "You: " : "";
  return prefix + body;
}

function InboxRow({ item, myClientId, onPress }) {
  const preview = previewLine(item, myClientId);
  const isGroup = item.kind === "session_group";
  const hasUnread = item.unread_count > 0;
  const avatarUri = isGroup
    ? item.group?.gym_cover_pic || item.gym_cover_pic || item.avatar_url
    : item.avatar_url;
  const sessionDate = item.group?.session_date || item.session_date;
  const sessionTime = item.group?.session_time || item.session_time;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar
        uri={avatarUri}
        size={54}
        fallback={(item.title || "?")[0]}
        isGroup={isGroup}
      />
      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.last_message_at ? (
            <RelativeTime iso={item.last_message_at} />
          ) : null}
        </View>
        <View style={styles.bottomLine}>
          {!hasUnread && !item.last_message?.is_deleted && (
            <Ionicons
              name="sync-circle-outline"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            style={[
              styles.preview,
              item.last_message?.is_deleted && styles.previewDeleted,
              hasUnread && styles.previewBold,
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread ? <UnreadBadge count={item.unread_count} /> : null}
        </View>
        {isGroup && (sessionDate || sessionTime) ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {sessionDate
              ? new Date(sessionDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
              : ""}
            {sessionDate && sessionTime ? " | " : ""}
            {sessionTime
              ? new Date("2000-01-01T" + sessionTime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
              : ""}
          </Text>
        ) : item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(InboxRow);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: "#F2F2F2" },
  body: { flex: 1, marginLeft: 12 },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  preview: { flex: 1, fontSize: 13, color: "#9CA3AF", marginRight: 8 },
  previewBold: { color: "#111", fontWeight: "500" },
  previewDeleted: { fontStyle: "italic", color: "#999" },
  subtitle: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
});
