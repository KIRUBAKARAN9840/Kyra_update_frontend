import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  getIncomingFriendRequestsAPI,
  getOutgoingFriendRequestsAPI,
  acceptFriendRequestAPI,
  rejectFriendRequestAPI,
  cancelFriendRequestAPI,
} from "../../../services/clientApi";

const TABS = ["Received", "Sent"];

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");

// ─── Received row (Accept / Decline) ─────────────────────────────────────────

const ReceivedRow = ({ item, onUpdate }) => {
  const router = useRouter();
  const [status, setStatus] = useState(null); // null | "accepted" | "declined"
  const busyRef = useRef(false);

  const handleAccept = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const res = await acceptFriendRequestAPI(item.request_id);
    if (res?.status === 200) {
      setStatus("accepted");
      setTimeout(() => onUpdate(item.request_id), 600);
    }
    busyRef.current = false;
  };

  const handleDecline = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const res = await rejectFriendRequestAPI(item.request_id);
    if (res?.status === 200) {
      setStatus("declined");
      setTimeout(() => onUpdate(item.request_id), 600);
    }
    busyRef.current = false;
  };

  return (
    <View style={s.row}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.other_client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Image
          source={
            item.other_avatar_url
              ? { uri: item.other_avatar_url }
              : DEFAULT_AVATAR
          }
          style={s.avatar}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.rowInfo}
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.other_client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Text style={s.rowName}>{item.other_name}</Text>
      </TouchableOpacity>
      {status === null ? (
        <View style={s.actionCol}>
          <TouchableOpacity
            style={s.acceptBtn}
            activeOpacity={0.8}
            onPress={handleAccept}
          >
            <Text style={s.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.declineBtn}
            activeOpacity={0.8}
            onPress={handleDecline}
          >
            <Text style={s.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text
          style={[
            s.statusText,
            status === "accepted" ? s.statusAccepted : s.statusDeclined,
          ]}
        >
          {status === "accepted" ? "Accepted" : "Declined"}
        </Text>
      )}
    </View>
  );
};

// ─── Sent row (Cancel) ───────────────────────────────────────────────────────

const SentRow = ({ item, onUpdate }) => {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const busyRef = useRef(false);

  const handleCancel = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setConfirmVisible(false);
    const res = await cancelFriendRequestAPI(item.request_id);
    if (res?.status === 200) {
      setCancelled(true);
      setTimeout(() => onUpdate(item.request_id), 600);
    }
    busyRef.current = false;
  };

  return (
    <View style={s.row}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.other_client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Image
          source={
            item.other_avatar_url
              ? { uri: item.other_avatar_url }
              : DEFAULT_AVATAR
          }
          style={s.avatar}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.rowInfo}
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.other_client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Text style={s.rowName}>{item.other_name}</Text>
      </TouchableOpacity>
      {cancelled ? (
        <Text style={[s.statusText, s.statusDeclined]}>Cancelled</Text>
      ) : (
        <TouchableOpacity
          style={s.cancelBtn}
          activeOpacity={0.8}
          onPress={() => setConfirmVisible(true)}
        >
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Cancel Request</Text>
            <Text style={s.modalMsg}>
              Are you sure you want to cancel the friend request to{" "}
              {item.other_name}?
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnOutline}
                activeOpacity={0.8}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={s.modalBtnOutlineText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalBtnFill}
                activeOpacity={0.8}
                onPress={handleCancel}
              >
                <Text style={s.modalBtnFillText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function FriendRequests() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [inRes, outRes] = await Promise.all([
      getIncomingFriendRequestsAPI(),
      getOutgoingFriendRequestsAPI(),
    ]);
    setIncoming(inRes?.status === 200 ? inRes.data : []);
    setOutgoing(outRes?.status === 200 ? outRes.data : []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const removeIncoming = (requestId) =>
    setIncoming((prev) => prev.filter((r) => r.request_id !== requestId));

  const removeOutgoing = (requestId) =>
    setOutgoing((prev) => prev.filter((r) => r.request_id !== requestId));

  const list = activeTab === 0 ? incoming : outgoing;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Friend Requests</Text>
        <View style={s.headerBtn} />
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === i && s.tabActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      ) : list.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>
            {activeTab === 0 ? "No pending requests" : "No sent requests"}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        >
          {list.map((item) =>
            activeTab === 0 ? (
              <ReceivedRow
                key={item.request_id}
                item={item}
                onUpdate={removeIncoming}
              />
            ) : (
              <SentRow
                key={item.request_id}
                item={item}
                onUpdate={removeOutgoing}
              />
            ),
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerBtn: {
    padding: 4,
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },

  // Tabs — same as ConnectionsModal
  tabsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  tabTextActive: {
    color: "#1A1A1A",
  },

  // Loader / Empty
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

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  rowGoal: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  // Accept / Decline
  actionCol: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  acceptBtn: {
    backgroundColor: "#0F172B",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  acceptText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  declineBtn: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  declineText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  // Cancel (sent tab)
  cancelBtn: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginLeft: 8,
  },
  cancelText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  // Status feedback
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  statusAccepted: {
    color: "#16A34A",
  },
  statusDeclined: {
    color: "#DC2626",
  },

  // Cancel confirmation modal
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
});
