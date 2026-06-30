import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  FlatList,
  Share,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getBlockedGymMateUsersAPI,
  unblockGymMateUserAPI,
} from "../../../services/clientApi";

// ── Avatar placeholder ─────────────────────────────────────────────────────────
const Avatar = ({ name, size = 44 }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View
      style={[
        styles.avatarCircle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
};

// ── Section header ─────────────────────────────────────────────────────────────
const SectionLabel = ({ title }) => (
  <Text style={styles.sectionLabel}>{title}</Text>
);

// ── Divider ────────────────────────────────────────────────────────────────────
const Divider = () => <View style={styles.divider} />;

// ── Row: toggle ────────────────────────────────────────────────────────────────
const ToggleRow = ({ icon, label, sublabel, value, onValueChange }) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color="#1A1A1A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#E5E5E5", true: "#FF5757" }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#E5E5E5"
    />
  </View>
);

// ── Row: chevron ───────────────────────────────────────────────────────────────
const ChevronRow = ({ icon, label, sublabel, onPress, badge }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.rowLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color="#1A1A1A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
    </View>
    <View style={styles.rowRight}>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color="#AAAAAA" />
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
//  BLOCKED USERS MODAL
// ─────────────────────────────────────────────────────────────────────────────
const BlockedUsersModal = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unblocking, setUnblocking] = useState(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBlockedGymMateUsersAPI();
      if (res?.status === 200 && Array.isArray(res.data)) {
        setBlocked(res.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchBlocked();
  }, [visible]);

  const unblock = (user) => {
    Alert.alert(
      "Unblock user?",
      `${user.name} will be able to find your profile and send you requests.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: async () => {
            setUnblocking(user.client_id);
            try {
              const res = await unblockGymMateUserAPI(user.client_id);
              if (res?.status === 200) {
                setBlocked((prev) =>
                  prev.filter((u) => u.client_id !== user.client_id),
                );
              }
            } catch {
            } finally {
              setUnblocking(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[
          styles.modalContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalBack}>
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Blocked Users</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#FF5757" />
          </View>
        ) : blocked.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-remove-outline" size={54} color="#E5E5E5" />
            <Text style={styles.emptyText}>No blocked users</Text>
          </View>
        ) : (
          <FlatList
            data={blocked}
            keyExtractor={(item) => String(item.block_id)}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
            ItemSeparatorComponent={() => <View style={styles.listDivider} />}
            renderItem={({ item }) => (
              <View style={styles.blockedRow}>
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#F0F0F0",
                    }}
                  />
                ) : (
                  <Avatar name={item.name} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.blockedName}>{item.name}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.unblockBtn,
                    unblocking === item.client_id && { opacity: 0.5 },
                  ]}
                  disabled={unblocking === item.client_id}
                  onPress={() => unblock(item)}
                >
                  {unblocking === item.client_id ? (
                    <ActivityIndicator size="small" color="#FF5757" />
                  ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  INFO MODAL (Terms / Privacy / How it Works)
// ─────────────────────────────────────────────────────────────────────────────
const INFO_CONTENT = {
  terms: {
    title: "Terms of Use",
    icon: "document-text-outline",
    body: `Last updated: June 2026\n\nWelcome to Fymble GymMate. By accessing or using GymMate, you agree to be bound by these Terms of Use. If you do not agree, please do not use the service.\n\n1. Eligibility\nYou must be at least 18 years of age to use GymMate. By creating an account, you confirm that you meet this requirement and that all information you provide is accurate and complete.\n\n2. Account & Profile\n• You are responsible for maintaining the security of your account credentials.\n• Your profile information — including your name, photos, fitness bio, preferences, and workout goals — must be truthful and not misleading.\n• You may upload up to 3 profile photos and post stories. All uploaded content must be yours or used with permission.\n• Fymble reserves the right to remove content or suspend accounts that violate these terms.\n\n3. Gym Mate Sessions\n• You may create workout sessions by selecting a Fymble-partnered gym, date, time, fitness level, mate preference, and workout type.\n• Your session will be visible to nearby users who may send you a join request.\n• You may accept or decline incoming requests at your discretion.\n• Accepted connections open a group chat for coordinating your workout.\n• Sessions are intended for genuine fitness meetups. Misuse of sessions for solicitation, advertising, or any non-fitness purpose is prohibited.\n\n4. Daily Pass & Payments\n• GymMate allows you to book daily gym passes at partnered facilities.\n• All purchases are processed through the app and are subject to the pricing and refund policies displayed at the time of booking.\n• Fymble does not guarantee gym availability and is not responsible for facility conditions or third-party service quality.\n\n5. Messaging & Communication\n• You may send direct messages to friends and participate in session group chats.\n• Messages may be deleted. Deleted messages will show a placeholder and cannot be recovered.\n• All communication must be respectful. Harassment, threats, hate speech, sexually explicit content, spam, or unsolicited promotions are strictly prohibited.\n\n6. Social Features\n• You may send and receive friend requests, view mutual connections, and build your fitness network.\n• Stories you post may be set to Public (all GymMate users) or Friends Only. You are responsible for the content you share.\n• Unfriending or blocking a user will restrict their access to your profile, stories, and messaging.\n\n7. Prohibited Conduct\nYou agree not to:\n• Impersonate another person or misrepresent your identity\n• Post content that is violent, abusive, defamatory, obscene, or promotes illegal activity\n• Use the platform for commercial solicitation, scams, or fraud\n• Collect or harvest other users' personal information\n• Interfere with or disrupt the service, servers, or networks\n• Circumvent any safety, moderation, or security features\n• Create multiple accounts or use automated tools to access the service\n\n8. Reporting & Safety\n• You may report users or content that violates these terms. Reports are reviewed by our team and appropriate action will be taken.\n• You may block any user at any time. Blocked users cannot view your profile, stories, or send you messages.\n• Fymble cooperates with law enforcement where required by applicable law.\n\n9. Content Ownership & Licence\n• You retain ownership of content you create and upload.\n• By posting content on GymMate, you grant Fymble a non-exclusive, royalty-free, worldwide licence to use, display, and distribute that content within the service.\n• Fymble may remove any content that violates these terms or applicable law without prior notice.\n\n10. Location Services\n• GymMate uses your device location to show nearby sessions, gyms, and users.\n• Location data is collected only with your permission and is used solely for providing relevant matches and distance information.\n• You may revoke location access at any time through your device settings.\n\n11. Termination\n• Fymble may suspend or terminate your account without notice if you violate these terms, engage in harmful behaviour, or misuse the platform.\n• Upon termination, your right to use the service ceases immediately.\n\n12. Disclaimers\n• GymMate is a platform for connecting fitness enthusiasts. Fymble does not verify the identity, background, or fitness qualifications of users.\n• You meet and interact with other users at your own risk. Fymble is not liable for any harm, injury, or loss resulting from in-person meetups.\n• The service is provided "as is" without warranties of any kind.\n\n13. Limitation of Liability\nTo the maximum extent permitted by law, Fymble shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of GymMate.\n\n14. Changes to Terms\nWe may update these terms from time to time. Continued use of GymMate after changes are posted constitutes your acceptance of the revised terms. We encourage you to review these terms periodically.\n\n15. Contact\nFor questions, concerns, or feedback regarding these terms, contact us at support@fymble.app.\n\nFor the complete legal terms, visit fymble.app/terms.`,
  },
  privacy: {
    title: "Privacy Policy",
    icon: "shield-checkmark-outline",
    body: `Last updated: June 2026\n\nFymble ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use GymMate. By using the service, you consent to the practices described below.\n\n1. Information We Collect\n\nInformation you provide:\n• Account details — name, phone number, and email address used during registration\n• Profile information — photos (up to 3), fitness bio, fitness goals, activity interests, preferred workout timing, gym personality, fitness level, and mate preference\n• Session data — gym selection, workout date and time, workout type, and session preferences\n• Stories — photos and captions you post\n• Messages — text content sent in direct and group chats\n• Reports — details you submit when reporting a user or content\n\nInformation collected automatically:\n• Device information — device model, operating system, unique device identifiers, and app version\n• Location data — your device's geographic location, collected only when you grant permission, used to show nearby sessions, gyms, and users\n• Usage data — features accessed, interactions performed, session frequency, and timestamps\n• Push notification tokens — used to deliver notifications about matches, requests, messages, and other activity\n\n2. How We Use Your Information\n\nWe use the information we collect to:\n• Create and manage your GymMate profile\n• Match you with compatible workout partners based on location, goals, and preferences\n• Display nearby Gym Mate sessions and daily pass gyms\n• Enable direct messaging and session group chats\n• Deliver push notifications for matches, friend requests, messages, and session updates\n• Process daily pass bookings and payments\n• Calculate match compatibility percentages and suggest friends based on mutual connections\n• Enforce our Terms of Use and investigate reports of abuse, spam, or harmful behaviour\n• Improve the service through aggregated, anonymised usage analytics\n\n3. How We Share Your Information\n\nWe do not sell your personal data. We may share information in the following circumstances:\n• With other users — your profile information (name, photos, bio, fitness preferences) is visible to other GymMate users based on your privacy settings. Your location is displayed as an approximate distance, not an exact address.\n• With service providers — trusted third-party services that help us operate (cloud storage, payment processing, push notification delivery, analytics). These providers are contractually bound to protect your data.\n• For legal compliance — when required by law, regulation, legal process, or enforceable government request.\n• For safety — when we believe disclosure is necessary to prevent fraud, protect the safety of our users, or defend our legal rights.\n\n4. Data Storage & Security\n• Your data is stored on secure cloud servers with encryption in transit and at rest.\n• Profile photos and story images are stored on Amazon S3 with access-controlled URLs.\n• Authentication tokens are stored securely on your device using encrypted storage.\n• We implement industry-standard security measures to protect against unauthorised access, alteration, or destruction of your data.\n\n5. Data Retention\n• Your account data is retained for as long as your account remains active.\n• Deleted messages are replaced with a placeholder and the original content is removed from our servers.\n• Stories are retained for the one day duration and are automatically removed after expiry.\n• If you deactivate or delete your account, we will remove your personal data within 30 days, except where retention is required by law.\n\n6. Your Rights & Choices\n\nYou have the right to:\n• Access & update your profile information at any time through the Edit Profile screen\n• Delete your photos individually\n• Control story visibility — choose Public or Friends Only for each story\n• Manage location access — grant or revoke location permission through your device settings at any time\n• Block users — blocked users cannot see your profile, stories, or send you messages\n• Manage notifications — enable or disable push notifications from your device settings\n• Request data deletion — contact us to request complete deletion of your account and associated data\n\n7. Children's Privacy\nGymMate is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we become aware that a user is under 18, we will promptly delete their account and associated data.\n\n8. Third-Party Services\nGymMate may contain links to third-party services such as partnered gyms or payment providers. We are not responsible for the privacy practices of these external services. We encourage you to review their privacy policies.\n\n9. Push Notifications\nWe send push notifications for matches, friend requests, messages, session updates, and nearby activity. You can manage notification preferences through your device settings at any time.\n\n10. Changes to This Policy\nWe may update this Privacy Policy from time to time. When we make changes, we will update the "Last updated" date at the top. Continued use of GymMate after changes are posted constitutes your acceptance of the revised policy.\n\n11. Contact Us\nIf you have questions, concerns, or requests regarding your privacy or this policy, contact us at:\n\nEmail: support@fymble.app\n\nFor the complete privacy policy, visit fymble.app/privacy.`,
  },
  howItWorks: {
    title: "How It Works",
    icon: "information-circle-outline",
    body: `GymMate connects you with like-minded fitness enthusiasts near you. Here's how it works:\n\nCreate a Session\nSet your workout preferences and create a Gym Mate session at any Fymble-partnered gym. Choose your fitness goals, preferred time, and workout style to find the right match.\n\nGet Matched\nYour session is visible to nearby users who share similar interests. They can send you a join request — review their profile and accept the ones that fit.\n\nPlan Your Workout\nOnce you accept a request, a chat opens between you and your gym mate. Coordinate your workout plan, set a time, and get ready to train together.\n\nBook a Daily Pass\nNeed access to the gym? Book a daily pass directly through Fymble for the partnered gym where your session is scheduled. No membership required.\n\nBuild Your Network\nSend friend requests to people you train with and grow your fitness circle. Stay connected, track each other's progress, and keep the motivation going.\n\nShare Your Journey\nPost stories of your workouts, milestones, and fitness activities. Inspire others in the community and celebrate your progress.\n\nStay Safe\nYour safety is our priority. Report or block any user engaging in harmful, abusive, or inappropriate behaviour. Our team reviews every report to keep the community welcoming for everyone.`,
  },
};

const InfoModal = ({ type, onClose }) => {
  const insets = useSafeAreaInsets();
  const content = INFO_CONTENT[type];
  if (!content) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View
        style={[
          styles.modalContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalBack}>
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{content.title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoIconWrap}>
            <Ionicons name={content.icon} size={40} color="#FF5757" />
          </View>
          <Text style={styles.infoBody}>{content.body}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const GymMateSettings = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Privacy
  const [isPrivate, setIsPrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Notifications
  const [notifyRequests, setNotifyRequests] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyNearby, setNotifyNearby] = useState(false);

  // Modals
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // 'terms' | 'privacy' | 'howItWorks'

  const handleInvite = async () => {
    router.push({ pathname: "/client/referral", params: { source: "gymmate" } });
  };

  const handleDeactivate = () => {
    Alert.alert(
      "Deactivate GymMate Profile?",
      "Your profile will be hidden from discovery. You can reactivate anytime.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => Alert.alert("Profile deactivated."),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.safe,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GymMate Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/*  INTERACTIONS  */}
        <SectionLabel title="INTERACTIONS" />
        <View style={styles.card}>
          <ChevronRow
            icon="person-remove-outline"
            label="Blocked Users"
            sublabel="Manage people you've blocked"
            onPress={() => setBlockedOpen(true)}
          />
        </View>

        {/* ABOUT  */}
        <SectionLabel title="ABOUT" />
        <View style={styles.card}>
          <ChevronRow
            icon="information-circle-outline"
            label="How It Works"
            onPress={() => setInfoModal("howItWorks")}
          />
          <Divider />
          <ChevronRow
            icon="document-text-outline"
            label="Terms of Use"
            onPress={() => setInfoModal("terms")}
          />
          <Divider />
          <ChevronRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => setInfoModal("privacy")}
          />
        </View>

        {/* ══ SHARE ════════════════════════════════════════════════════════ */}
        <SectionLabel title="SHARE" />
        <View style={styles.card}>
          <ChevronRow
            icon="person-add-outline"
            label="Invite a Friend"
            sublabel="Share Fymble with someone you know"
            onPress={handleInvite}
          />
        </View>

        <Text style={styles.versionText}>Fymble</Text>
      </ScrollView>

      {/* ── Modals ── */}
      <BlockedUsersModal
        visible={blockedOpen}
        onClose={() => setBlockedOpen(false)}
      />
      {infoModal && (
        <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />
      )}
    </View>
  );
};

export default GymMateSettings;

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#AAAAAA",
    letterSpacing: 1.1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Card
  card: {
    marginHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 60,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  rowSublabel: {
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginLeft: 62,
  },

  // Radio
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#FF5757",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5757",
  },

  // Badge
  badge: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Version
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#CCCCCC",
    marginTop: 28,
    marginBottom: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Blocked users
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listDivider: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginLeft: 72,
  },
  blockedName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  blockedBio: {
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
  },
  unblockBtn: {
    borderWidth: 1.5,
    borderColor: "#FF5757",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  unblockText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5757",
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#AAAAAA",
    fontWeight: "500",
  },

  // Avatar
  avatarCircle: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontWeight: "700",
    color: "#6B7280",
  },

  // Info modal
  infoIconWrap: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  infoBody: {
    fontSize: 15,
    lineHeight: 26,
    color: "#3A3A3A",
  },
});
