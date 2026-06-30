import { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getHostedSessionsAPI,
  getSessionParticipantsAPI,
} from "../../../services/clientApi";
import { useOpenChat } from "../../../src/features/chat/hooks/useOpenChat";

const formatDate = (dateStr) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((d - today) / 86400000);
    const dayNum = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    if (diff === 0) return `Today, ${dayNum} ${month}`;
    if (diff === 1) return `Tomorrow, ${dayNum} ${month}`;
    return `${dayNum} ${month}`;
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr) => {
  try {
    const [h, m] = timeStr.split(":");
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? "PM" : "AM";
    const h12 = hr % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");

const SessionCard = ({ session, onShowParticipants, onChatPress }) => {
  const gym = session.gym || {};
  const dateLabel = `${formatDate(session.session_date)}, ${formatTime(session.session_time)}`;

  const rows = [
    { icon: "calendar-outline", label: "Date & Time", value: dateLabel },
    {
      icon: "location-outline",
      label: "Gym",
      value: `${gym.name || ""}${gym.area ? " • " + gym.area : ""}`,
    },
    {
      icon: "person-outline",
      label: "Mate Preference",
      value: session.mate_preference || "—",
    },
    {
      icon: "flash-outline",
      label: "Fitness Level",
      value: session.fitness_level || "—",
    },
  ];

  const vibes = session.workout_vibes || [];

  const createdLabel = (() => {
    try {
      const d = new Date(session.created_at);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const created = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((today - created) / 86400000);
      const time = `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
      if (diff === 0) return `Today, ${time}`;
      if (diff === 1) return `Yesterday, ${time}`;
      return `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}, ${time}`;
    } catch {
      return "";
    }
  })();

  return (
    <>
      {/* Status pill */}
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            session.status !== "open" && { backgroundColor: "#9CA3AF" },
          ]}
        />
        <Text style={styles.statusText}>
          {session.status === "open" ? "Active" : session.status}
          {createdLabel ? ` · Created ${createdLabel}` : ""}
        </Text>
        {session.joiner_count > 0 && (
          <TouchableOpacity
            style={styles.joinerBadge}
            activeOpacity={0.7}
            onPress={() => onShowParticipants?.(session.session_id)}
          >
            <Ionicons name="people" size={20} color="#00BC7D" />
            <Text style={styles.joinerText}>{session.joiner_count}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Gym cover */}
      {gym.cover_pic && (
        <View style={styles.coverWrap}>
          <Image
            source={{ uri: gym.cover_pic }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Details card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Details</Text>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.detailRow,
              i < rows.length - 1 && styles.detailRowBorder,
            ]}
          >
            <View style={styles.detailIconWrap}>
              <Ionicons name={row.icon} size={18} color="#101828" />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Workout Vibes */}
      {vibes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workout Vibes</Text>
          <View style={styles.vibesRow}>
            {vibes.map((v) => (
              <View key={v} style={styles.vibePill}>
                <Text style={styles.vibePillText}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Chat button */}
      <TouchableOpacity
        style={styles.chatBtn}
        activeOpacity={0.85}
        onPress={() => onChatPress?.(session.session_id, gym.name)}
      >
        <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
        <Text style={styles.chatBtnText}>Chat with your Gym Mates</Text>
      </TouchableOpacity>

      {/* Info note */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
        <Text style={styles.infoText}>
          We're scanning nearby gym mates that match your preferences. You'll be
          notified when someone responds.
        </Text>
      </View>
    </>
  );
};

export default function MyRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openGroup } = useOpenChat();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [participantsVisible, setParticipantsVisible] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHostedSessionsAPI();

      if (res?.status === 200) {
        setSessions(res.data || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openParticipants = useCallback(async (sessionId) => {
    setParticipantsVisible(true);
    setParticipantsLoading(true);
    try {
      const res = await getSessionParticipantsAPI(sessionId);
      if (res?.status === 200) setParticipants(res.data || []);
    } catch {}
    setParticipantsLoading(false);
  }, []);

  const activeSession = sessions[activeTab];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Gym Mate Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No hosted sessions</Text>
        </View>
      ) : (
        <>
          {/* Date tabs — only if more than one session */}
          {sessions.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {sessions.map((s, i) => {
                const isActive = i === activeTab;
                return (
                  <TouchableOpacity
                    key={s.session_id}
                    style={[styles.dateTab, isActive && styles.dateTabActive]}
                    activeOpacity={0.8}
                    onPress={() => setActiveTab(i)}
                  >
                    <Text
                      style={[
                        styles.dateTabText,
                        isActive && styles.dateTabTextActive,
                      ]}
                    >
                      {formatDate(s.session_date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
            <SessionCard
              session={activeSession}
              onShowParticipants={openParticipants}
              onChatPress={openGroup}
            />
          </ScrollView>
        </>
      )}

      {/* Participants Modal */}
      <Modal
        visible={participantsVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setParticipantsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participants</Text>
              <TouchableOpacity
                onPress={() => setParticipantsVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            {participantsLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#FF5757" />
              </View>
            ) : participants.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                <Text style={styles.emptyText}>No participants yet</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalList}
              >
                {participants.map((p) => (
                  <TouchableOpacity
                    key={p.client_id}
                    style={styles.participantRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setParticipantsVisible(false);
                      router.push({
                        pathname: "/client/(gymmate)/profilemate",
                        params: { client_id: p.client_id },
                      });
                    }}
                  >
                    <Image
                      source={
                        p.avatar_url ? { uri: p.avatar_url } : DEFAULT_AVATAR
                      }
                      style={styles.participantAvatar}
                    />
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dateTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 38,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
  },
  dateTabActive: {
    backgroundColor: "#111827",
  },
  dateTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  dateTabTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  joinerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 30,
    paddingVertical: 6,
    borderRadius: 10,
  },
  joinerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#00BC7D",
  },
  coverWrap: {
    borderRadius: 14,
    overflow: "hidden",
    height: 140,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  vibesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vibePill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: "#101828",
  },
  vibePillText: {
    fontSize: 13,
    color: "#101828",
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 15,
  },
  chatBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalLoader: {
    paddingVertical: 40,
    alignItems: "center",
  },
  modalEmpty: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  participantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  participantRole: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 2,
  },
});
