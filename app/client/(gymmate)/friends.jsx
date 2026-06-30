import React, { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  getFriendSuggestionsAPI,
  sendFriendRequestAPI,
} from "../../../services/clientApi";

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");
const PAGE_SIZE = 30;


const PersonRow = React.memo(({ item, onSent }) => {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const handleConnect = async () => {
    if (sendingRef.current || sent) return;
    sendingRef.current = true;
    try {
      const res = await sendFriendRequestAPI(item.client_id);
      if (res?.status === 200) {
        setSent(true);
        setTimeout(() => onSent(item.client_id), 600);
      }
    } catch {
      // silently fail
    } finally {
      sendingRef.current = false;
    }
  };

  const openProfile = () =>
    router.push({
      pathname: "/client/(gymmate)/profilemate",
      params: { client_id: item.client_id },
    });

  return (
    <View style={s.row}>
      <TouchableOpacity onPress={openProfile} activeOpacity={0.8}>
        <Image
          source={item.avatar_url ? { uri: item.avatar_url } : DEFAULT_AVATAR}
          style={s.avatar}
        />
      </TouchableOpacity>
      <TouchableOpacity style={s.rowInfo} onPress={openProfile} activeOpacity={0.8}>
        <Text style={s.rowName}>{item.name}</Text>
      </TouchableOpacity>
      {sent ? (
        <View style={[s.connectBtn, s.connectBtnDone]}>
          <Text style={s.connectBtnText}>Sent</Text>
        </View>
      ) : (
        <TouchableOpacity style={s.connectBtn} activeOpacity={0.8} onPress={handleConnect}>
          <Text style={s.connectBtnText}>Add Friend</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const ListHeader = () => <Text style={s.sectionTitle}>Suggested for you</Text>;

const ListFooter = ({ loadingMore, hasMore }) => {
  if (loadingMore)
    return (
      <View style={s.footerLoader}>
        <ActivityIndicator size="small" color="#FF5757" />
      </View>
    );
  if (!hasMore)
    return <Text style={s.footerEnd}>No more suggestions</Text>;
  return null;
};

export default function Friends() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nextOffsetRef = useRef(0);
  const fetchingRef = useRef(false);

  const loadPage = useCallback(async (offset) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await getFriendSuggestionsAPI(PAGE_SIZE, offset);
      if (res?.status === 200) {
        const newItems = res.data || [];
        setSuggestions((prev) =>
          offset === 0 ? newItems : [...prev, ...newItems],
        );
        setHasMore(res.pagination?.has_more ?? false);
        nextOffsetRef.current = res.pagination?.next_offset ?? offset + PAGE_SIZE;
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        setLoading(true);
        nextOffsetRef.current = 0;
        await loadPage(0);
        if (active) setLoading(false);
      };
      init();
      return () => {
        active = false;
      };
    }, [loadPage]),
  );

  const handleEndReached = useCallback(async () => {
    if (!hasMore || loadingMore || fetchingRef.current) return;
    setLoadingMore(true);
    await loadPage(nextOffsetRef.current);
    setLoadingMore(false);
  }, [hasMore, loadingMore, loadPage]);

  const handleRefresh = useCallback(async () => {
    nextOffsetRef.current = 0;
    setLoading(true);
    await loadPage(0);
    setLoading(false);
  }, [loadPage]);

  const removeSuggestion = useCallback(
    (clientId) =>
      setSuggestions((prev) => prev.filter((s) => s.client_id !== clientId)),
    [],
  );

  const renderItem = useCallback(
    ({ item }) => <PersonRow item={item} onSent={removeSuggestion} />,
    [removeSuggestion],
  );

  const keyExtractor = useCallback((item) => String(item.client_id), []);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerButton}>
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Find Friends</Text>
        <View style={s.headerButton} />
      </View>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      ) : suggestions.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyText}>No suggestions right now</Text>
        </View>
      ) : (
        <FlashList
          data={suggestions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          estimatedItemSize={72}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            <ListFooter loadingMore={loadingMore} hasMore={hasMore} />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          onRefresh={handleRefresh}
          refreshing={loading}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 12,
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
  connectBtn: {
    backgroundColor: "#0F172B",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginLeft: 8,
  },
  connectBtnDone: {
    backgroundColor: "#4CAF50",
  },
  connectBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  // Footer
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerEnd: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    paddingVertical: 16,
  },
});
