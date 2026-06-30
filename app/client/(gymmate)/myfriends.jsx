import React, { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  getMyFriendsAPI,
  unfriendAPI,
  blockGymMateUserAPI,
  reportGymMateEntityAPI,
} from "../../../services/clientApi";
import { useOpenChat } from "../../../src/features/chat/hooks/useOpenChat";

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");

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

// ─── 3-dot menu ───────────────────────────────────────────────────────────────

const MENU_OPTIONS = [
  { label: "Unfriend", icon: "person-remove-outline", color: "#1A1A1A" },
  { label: "Report", icon: "flag-outline", color: "#F59E0B" },
  { label: "Block", icon: "ban-outline", color: "#DC2626" },
];

const DotsMenu = ({ onSelect }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  const open = () => {
    btnRef.current?.measureInWindow((x, y, w, h) => {
      const { width: sw } = require("react-native").Dimensions.get("window");
      setPos({ top: y + h + 4, right: sw - (x + w) });
      setVisible(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={btnRef}
        style={s.dotsBtn}
        activeOpacity={0.7}
        onPress={open}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={StyleSheet.absoluteFill}>
            <TouchableWithoutFeedback>
              <View style={[s.menuCard, { top: pos.top, right: pos.right }]}>
                {MENU_OPTIONS.map((opt, i) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      s.menuItem,
                      i < MENU_OPTIONS.length - 1 && s.menuItemBorder,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setVisible(false);
                      onSelect(opt.label);
                    }}
                  >
                    <Ionicons name={opt.icon} size={16} color={opt.color} />
                    <Text style={[s.menuLabel, { color: opt.color }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

// ─── Friend row ───────────────────────────────────────────────────────────────

const FriendRow = ({ item, onRemove }) => {
  const router = useRouter();
  const { openDirect, loading: chatLoading } = useOpenChat();
  const [unfriendConfirm, setUnfriendConfirm] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [blockSuccess, setBlockSuccess] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const busyRef = useRef(false);

  const handleUnfriend = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setUnfriendConfirm(false);
    const res = await unfriendAPI(item.client_id);
    if (res?.status === 200) onRemove(item.client_id);
    busyRef.current = false;
  };

  const handleBlock = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await blockGymMateUserAPI(item.client_id);
      setBlockConfirm(false);
      if (res?.status === 200) {
        setBlockSuccess(true);
      }
    } catch {
      setBlockConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!selectedReason || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await reportGymMateEntityAPI({
        entity_type: "user",
        entity_id: item.client_id,
        reason: selectedReason.key,
      });
      setReportModal(false);
      setSelectedReason(null);
      if (res?.status === 200) {
        setReportSuccess(true);
      }
    } catch {
      setReportModal(false);
      setSelectedReason(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelect = (opt) => {
    if (opt === "Unfriend") setUnfriendConfirm(true);
    if (opt === "Block") setBlockConfirm(true);
    if (opt === "Report") setReportModal(true);
  };

  return (
    <View style={s.row}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Image
          source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR}
          style={s.avatar}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={s.rowInfo}
        onPress={() =>
          router.push({
            pathname: "/client/(gymmate)/profilemate",
            params: { client_id: item.client_id },
          })
        }
        activeOpacity={0.8}
      >
        <Text style={s.rowName}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.msgBtn}
        activeOpacity={0.8}
        disabled={chatLoading}
        onPress={() =>
          openDirect(item.client_id, {
            name: item.name,
            avatar_url: item.avatar_url,
          })
        }
      >
        {chatLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
            <Text style={s.msgBtnText}>Message</Text>
          </>
        )}
      </TouchableOpacity>
      <DotsMenu onSelect={handleSelect} />

      {/* Unfriend confirmation modal */}
      <Modal
        visible={unfriendConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfriendConfirm(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Unfriend</Text>
            <Text style={s.modalMsg}>
              Are you sure you want to remove {item.name} from your friends?
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnOutline}
                activeOpacity={0.8}
                onPress={() => setUnfriendConfirm(false)}
              >
                <Text style={s.modalBtnOutlineText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalBtnFill}
                activeOpacity={0.8}
                onPress={handleUnfriend}
              >
                <Text style={s.modalBtnFillText}>Yes, Unfriend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Block confirmation modal */}
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
            <Text style={s.modalTitle}>Block {item.name}?</Text>
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
          onRemove(item.client_id);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text style={s.modalTitle}>User Blocked</Text>
            <Text style={s.modalMsg}>
              {item.name} has been blocked. You can unblock them anytime from
              settings.
            </Text>
            <TouchableOpacity
              style={s.modalDoneBtn}
              activeOpacity={0.8}
              onPress={() => {
                setBlockSuccess(false);
                onRemove(item.client_id);
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
              <Text style={s.reportTitle}>Report User</Text>
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
              Why are you reporting {item.name}?
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
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MyFriends() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const res = await getMyFriendsAPI();
    setFriends(res?.status === 200 ? res.data : []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [fetchFriends]),
  );

  const removeFriend = (clientId) =>
    setFriends((prev) => prev.filter((f) => f.client_id !== clientId));

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerButton}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Friends</Text>
        <View style={s.headerButton} />
      </View>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={s.section}>
            <Text style={s.sectionTitle}>{friends.length} Friends</Text>
            {friends.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={s.emptyText}>No friends yet</Text>
              </View>
            ) : (
              friends.map((item) => (
                <FriendRow
                  key={item.client_id}
                  item={item}
                  onRemove={removeFriend}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
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
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },

  // Loader / Empty
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
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
    paddingVertical: 10,
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

  // Message button
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0F172B",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 8,
  },
  msgBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // 3-dot button
  dotsBtn: {
    padding: 6,
    marginLeft: 4,
  },

  // Dropdown menu card
  menuCard: {
    position: "absolute",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Unfriend confirmation modal
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

  // Report modal
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
});
