import React from "react";
import { StyleSheet, Text } from "react-native";

function formatRelative(iso) {
  const then = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;

  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate();
  if (sameDay) {
    return then.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    then.getFullYear() === yesterday.getFullYear() &&
    then.getMonth() === yesterday.getMonth() &&
    then.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";

  if (diffSec < 7 * 24 * 3600) {
    return then.toLocaleDateString([], { weekday: "short" });
  }
  return then.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function RelativeTime({ iso }) {
  return <Text style={styles.txt}>{formatRelative(iso)}</Text>;
}

const styles = StyleSheet.create({
  txt: { fontSize: 11, color: "#9CA3AF" },
});
