import React, {
  useState,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import * as Location from "expo-location";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { BackHandler } from "react-native";
import { getSessionsGymsAPI, getGymDetail } from "../../../services/clientApi";
import GymDetailModal from "../../../components/ui/DailyPass/GymDetailModal";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCachedLocation,
  peekPermissionStatus,
  refreshPermissionStatus,
  clearLocationCache,
} from "../../../services/locationCache";
import FitnessClassFilterModal from "../../../components/ui/FitnessClass/FitnessClassFilterModal";
import { Platform } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const SLOTS_VISIBLE = 6;

// ─── IST helpers ─────────────────────────────────────────────────────────────

const getTodayIST = () => {
  const now = new Date();
  const istOffset = 330 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utc + istOffset);
};

const buildDates = (base, count = 7) => {
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    result.push(d);
  }
  return result;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const fmtDate = (d) => ({
  day: DAY_LABELS[d.getDay()],
  date: d.getDate(),
  iso: toLocalISO(d),
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Calendar helpers (same pattern as passDateSelection)
const calTodayDate = (() => {
  // Use IST today
  const now = new Date();
  const istOffset = 330 * 60 * 1000;
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const d = new Date(utc + istOffset);
  d.setHours(0, 0, 0, 0);
  return d;
})();

const toKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const todayKey = toKey(calTodayDate);

const buildMonthGrid = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
};

// ─── Module-level cache (one-shot, same pattern as listgyms) ─────────────────

let FC_LIST_CACHE = null;
let SKIP_NEXT_FC_FOCUS_FETCH = false;

const saveFcCache = (payload) => {
  FC_LIST_CACHE = { ...(FC_LIST_CACHE || {}), ...payload };
};

const clearFcCache = () => {
  FC_LIST_CACHE = null;
};

export const resetFcListCache = () => {
  FC_LIST_CACHE = null;
  SKIP_NEXT_FC_FOCUS_FETCH = false;
};

const getInitialState = () => {
  if (FC_LIST_CACHE && SKIP_NEXT_FC_FOCUS_FETCH && FC_LIST_CACHE.gyms) {
    return FC_LIST_CACHE.gyms;
  }
  return [];
};

// ─── Normalise API gym ────────────────────────────────────────────────────────

const normalizeGym = (gym) => ({
  id: gym.gym_id,
  gym_id: gym.gym_id,
  name: gym.gym_name || "",
  area: gym.area || "",
  image:
    gym.cover_pic ||
    "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
  distance_km: gym.distance_km != null ? gym.distance_km : null,
  views: gym.views || 0,
  frequently_booked: gym.frequently_booked || false,
  session_price: gym.session_price != null ? gym.session_price : null,
  session_offer_active: gym.session_offer_active || false,
  slots: (gym.slots || []).map((s) => ({
    schedule_id: s.schedule_id,
    start_time: s.start_time,
    end_time: s.end_time,
    available_slots: s.available_slots,
  })),
});

// ─── Slot chip ────────────────────────────────────────────────────────────────

const SlotChip = ({ time, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.slotChip, selected && styles.slotChipSelected]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text
      style={[styles.slotChipText, selected && styles.slotChipTextSelected]}
    >
      {time}
    </Text>
  </TouchableOpacity>
);

// ─── Class Card ───────────────────────────────────────────────────────────────

const ClassCard = React.memo(
  ({ item, onCardPress, selectedSlot, onSlotSelect }) => {
    const [expanded, setExpanded] = useState(false);

    const visibleSlotObjects = useMemo(
      () => (expanded ? item.slots : item.slots.slice(0, SLOTS_VISIBLE)),
      [item.slots, expanded],
    );
    const hasMore = item.slots.length > SLOTS_VISIBLE;

    return (
      <View style={styles.gymCard}>
        {item.frequently_booked && (
          <View style={styles.freqBadge}>
            <Text style={styles.freqIcon}>🔥</Text>
            <Text style={styles.freqText}>Frequently Booked</Text>
          </View>
        )}

        {/* Top row: image + name/location — tappable to open detail */}
        <TouchableOpacity
          style={styles.cardTopRow}
          onPress={() => onCardPress(item)}
          activeOpacity={0.8}
        >
          <View style={styles.thumbContainer}>
            <Image
              source={{ uri: item.image }}
              style={styles.thumbImage}
              contentFit="cover"
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.gymCardName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#4A5565" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.area}
                {item.distance_km != null ? ` • ${item.distance_km} km` : ""}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Views + price */}
        <View style={styles.cardBottomRow}>
          <TouchableOpacity
            style={styles.viewsRow}
            onPress={() => onCardPress(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={13} color="#888" />
            <Text style={styles.viewsText}> {item.views} people explored</Text>
          </TouchableOpacity>
          {item.session_price != null && (
            <TouchableOpacity style={styles.priceButton} activeOpacity={0.85}>
              <Text style={styles.priceBtnRupee}>₹</Text>
              <Text style={styles.priceBtnAmount}>{item.session_price}</Text>
              <Text style={styles.priceBtnUnit}> / class</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slots grid */}
        {visibleSlotObjects.length > 0 ? (
          <View style={styles.slotsGrid}>
            {Array.from({
              length: Math.ceil(visibleSlotObjects.length / 3),
            }).map((_, rowIdx) => (
              <View key={rowIdx} style={styles.slotRow}>
                {visibleSlotObjects
                  .slice(rowIdx * 3, rowIdx * 3 + 3)
                  .map((slotObj, colIdx) => {
                    const slotKey = `${item.id}-${rowIdx * 3 + colIdx}`;
                    const isSelected = selectedSlot?.key === slotKey;
                    return (
                      <SlotChip
                        key={slotKey}
                        time={slotObj.start_time}
                        selected={isSelected}
                        onPress={() =>
                          onSlotSelect(
                            isSelected
                              ? null
                              : {
                                  key: slotKey,
                                  time: slotObj.start_time,
                                  scheduleId: slotObj.schedule_id,
                                  gymId: item.gym_id,
                                  gymName: item.name,
                                  item,
                                },
                          )
                        }
                      />
                    );
                  })}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noSlotsText}>No slots available</Text>
        )}

        {hasMore && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setExpanded((p) => !p)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={12}
              color="#FF5757"
            />
            <Text style={styles.moreBtnText}>
              {expanded
                ? "Show less"
                : `+${item.slots.length - SLOTS_VISIBLE} more slots`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ListClass = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session_id, session_name } = useLocalSearchParams();
  const sessionId = Number(session_id);

  // Dates
  const todayIST = useMemo(() => getTodayIST(), []);
  const dates = useMemo(() => buildDates(todayIST, 7), [todayIST]);
  const [selectedDates, setSelectedDates] = useState(() => [
    toLocalISO(dates[0]),
  ]);

  // State
  const [gyms, setGyms] = useState(getInitialState);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    () => FC_LIST_CACHE?.searchQuery || "",
  );
  const [activeFilters, setActiveFilters] = useState(
    () => FC_LIST_CACHE?.activeFilters || {},
  );
  const [bannerActive, setBannerActive] = useState(false);
  const bannerActiveRef = useRef(false);
  const activeFiltersRef = useRef({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [gymDetailModalVisible, setGymDetailModalVisible] = useState(false);
  const [gymDetailData, setGymDetailData] = useState(null);
  const [gymDetailLoading, setGymDetailLoading] = useState(false);
  const [gymDetailItem, setGymDetailItem] = useState(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calYear, setCalYear] = useState(calTodayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(calTodayDate.getMonth());
  // Pending selection inside the modal before Apply
  const [pendingDates, setPendingDates] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [locationArea, setLocationArea] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const locationFetchedRef = useRef(false);
  const [offerData, setOfferData] = useState({
    session_offer_eligible: false,
    session_count: 0,
    client_name: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [needsScrollRestore, setNeedsScrollRestore] = useState(false);

  // Refs
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const savedScrollOffsetRef = useRef(0);
  const gymsDataRef = useRef([]);
  const isRestoringFromCacheRef = useRef(false);
  const lastFetchParamsRef = useRef(null);
  const activeBaseParamsRef = useRef({});
  const initialFetchDoneRef = useRef(false);
  const searchDebounceRef = useRef(null);

  // Sync refs before render
  useLayoutEffect(() => {
    gymsDataRef.current = gyms;
    bannerActiveRef.current = bannerActive;
    activeFiltersRef.current = activeFilters;
  });

  // Scroll restoration
  useLayoutEffect(() => {
    if (needsScrollRestore && savedScrollOffsetRef.current > 0) {
      const savedOffset = savedScrollOffsetRef.current;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: savedOffset,
          animated: false,
        });
        setNeedsScrollRestore(false);
        isRestoringFromCacheRef.current = false;
      }, 100);
    }
  }, [needsScrollRestore]);

  const flashListKey = "fc-gyms-list";

  // Offer banner helpers
  const sessionRemaining = Math.max(0, 3 - offerData.session_count);
  const greetingName = useMemo(() => {
    const name = offerData.client_name || "";
    const first = name.trim().split(" ")[0];
    return first.length > 8 ? first.slice(0, 8) + ".." : first || "Guest";
  }, [offerData.client_name]);

  // ─── Build API params ─────────────────────────────────────────────

  const buildParams = useCallback(
    (page, overrides = {}) => {
      const params = {
        session_id: sessionId,
        dates: selectedDates,
        page,
        limit: ITEMS_PER_PAGE,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (activeFilters.city) params.city = activeFilters.city;
      if (activeFilters.area) params.area = activeFilters.area;
      if (activeFilters.pincode) params.pincode = activeFilters.pincode;
      if (activeFilters.sort_price) {
        params.sort_price = true;
        params.sort_type = activeFilters.sort_type;
      }
      return { ...params, ...overrides };
    },
    [
      sessionId,
      selectedDates,
      searchQuery,
      activeFilters,
      offerData.session_offer_eligible,
    ],
  );

  // ─── Core fetch ───────────────────────────────────────────────────

  const fetchGyms = useCallback(
    async (page = 1, loadMore = false, paramsOverride = null) => {
      if (selectedDates.length === 0) return;
      try {
        if (loadMore) setLoadingMore(true);
        else setApiLoading(true);

        const params = paramsOverride || buildParams(page);

        const paramsString = JSON.stringify(params);
        if (!loadMore && lastFetchParamsRef.current === paramsString) {
          setApiLoading(false);
          setLoadingMore(false);
          if (loading) setLoading(false);
          return;
        }
        if (!loadMore) lastFetchParamsRef.current = paramsString;

        const response = await getSessionsGymsAPI(params);
        if (response?.status === 200) {
          const normalized = response.data.map(normalizeGym);
          if (loadMore) {
            if (normalized.length > 0) {
              gymsDataRef.current = [...gymsDataRef.current, ...normalized];
              setGyms(gymsDataRef.current);
            }
          } else {
            gymsDataRef.current = normalized;
            setGyms(normalized);
            setOfferData({
              session_offer_eligible: response.session_offer_eligible || false,
              session_count: response.session_count || 0,
              client_name: response.client_name || "",
            });
          }
          setPagination({
            currentPage: response.pagination?.current_page || page,
            totalPages: response.pagination?.total_pages || 1,
            totalCount: response.pagination?.total_count || normalized.length,
            hasNext: response.pagination?.has_next || false,
            hasPrev: response.pagination?.has_prev || false,
          });
          if (!loadMore) {
            activeBaseParamsRef.current = params;
          }
        }
      } catch (err) {
        console.error("ListClass fetchGyms error:", err);
      } finally {
        setApiLoading(false);
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [buildParams, loading],
  );

  // ─── Location fetch ───────────────────────────────────────────────

  const fetchWithLocation = useCallback(async () => {
    if (selectedDates.length === 0) return;
    try {
      setLoading(true);
      const coords = await getCachedLocation();
      if (!coords) {
        const perm = peekPermissionStatus();
        if (perm && perm.status !== "granted") {
          setLocationDenied(true);
          setGyms([]);
          gymsDataRef.current = [];
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          });
          return;
        }
        await fetchGyms(1, false, buildParams(1));
        return;
      }
      setLocationDenied(false);
      const params = {
        ...buildParams(1),
        client_lat: coords.lat,
        client_lng: coords.lng,
      };
      const [response, geoResults] = await Promise.all([
        getSessionsGymsAPI(params),
        locationFetchedRef.current
          ? Promise.resolve(null)
          : Location.reverseGeocodeAsync({
              latitude: coords.lat,
              longitude: coords.lng,
            }),
      ]);

      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        gymsDataRef.current = normalized;
        setGyms(normalized);
        setOfferData({
          session_offer_eligible: response.session_offer_eligible || false,
          session_count: response.session_count || 0,
          client_name: response.client_name || "",
        });
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        activeBaseParamsRef.current = {
          ...params,
          client_lat: params.client_lat,
          client_lng: params.client_lng,
        };
      }

      if (geoResults && geoResults.length > 0) {
        locationFetchedRef.current = true;
        const r = geoResults[0];
        setLocationArea(r.district || r.subregion || r.city || r.name || "");
      }
    } catch (err) {
      console.error("ListClass location fetch error:", err);
      await fetchGyms(1, false, buildParams(1));
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  }, [fetchGyms, buildParams, selectedDates]);

  const handleEnableLocation = useCallback(async () => {
    if (requestingLocation) return;
    setRequestingLocation(true);
    try {
      const current = await refreshPermissionStatus();
      if (current && current.status !== "granted" && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      clearLocationCache();
      await fetchWithLocation();
    } finally {
      setRequestingLocation(false);
    }
  }, [requestingLocation, fetchWithLocation]);

  // ─── Hydrate from cache ───────────────────────────────────────────

  const hydrateFromCache = useCallback(() => {
    if (!SKIP_NEXT_FC_FOCUS_FETCH || !FC_LIST_CACHE) return false;

    const cachedGyms = FC_LIST_CACHE.gyms || [];
    gymsDataRef.current = cachedGyms;

    const isSameReference = gyms === cachedGyms;
    if (!isSameReference) setGyms(cachedGyms);

    savedScrollOffsetRef.current = FC_LIST_CACHE?.scrollOffset || 0;
    isRestoringFromCacheRef.current = true;
    setNeedsScrollRestore(true);

    if (FC_LIST_CACHE.pagination) setPagination(FC_LIST_CACHE.pagination);
    if (FC_LIST_CACHE.offerData) setOfferData(FC_LIST_CACHE.offerData);
    if (FC_LIST_CACHE.searchQuery != null)
      setSearchQuery(FC_LIST_CACHE.searchQuery);
    if (FC_LIST_CACHE.activeFilters)
      setActiveFilters(FC_LIST_CACHE.activeFilters);
    if (FC_LIST_CACHE.selectedDates)
      setSelectedDates(FC_LIST_CACHE.selectedDates);

    setLoading(false);
    setApiLoading(false);
    setLoadingMore(false);
    SKIP_NEXT_FC_FOCUS_FETCH = false;

    setTimeout(() => clearFcCache(), 100);
    return true;
  }, [gyms]);

  // ─── Focus effect ─────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const hydrated = hydrateFromCache();
      if (!hydrated && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        fetchWithLocation();
      }
      return () => {
        // Snapshot to cache on blur so scroll position is preserved if navigating back
        const firstVisibleIndex =
          flatListRef.current?.getFirstVisibleIndex?.() ?? 0;
        saveFcCache({
          gyms: gymsDataRef.current,
          pagination,
          offerData,
          scrollOffset: scrollOffsetRef.current,
          firstVisibleIndex,
          searchQuery,
          activeFilters,
          selectedDates,
        });
      };
    }, [
      hydrateFromCache,
      fetchWithLocation,
      pagination,
      offerData,
      searchQuery,
      activeFilters,
      selectedDates,
    ]),
  );

  // ─── Back handler ─────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  // ─── Load more ────────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (
      !pagination.hasNext ||
      loadingMore ||
      apiLoading ||
      pagination.currentPage >= pagination.totalPages
    )
      return;

    const nextPage = pagination.currentPage + 1;
    try {
      setLoadingMore(true);
      const params = {
        ...activeBaseParamsRef.current,
        page: nextPage,
        limit: ITEMS_PER_PAGE,
      };
      const response = await getSessionsGymsAPI(params);
      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        if (normalized.length > 0) {
          gymsDataRef.current = [...gymsDataRef.current, ...normalized];
          setGyms(gymsDataRef.current);
        }
        setPagination({
          currentPage: response.pagination?.current_page || nextPage,
          totalPages: response.pagination?.total_pages || pagination.totalPages,
          totalCount: response.pagination?.total_count || pagination.totalCount,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
      }
    } catch (err) {
      console.error("ListClass loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    pagination.hasNext,
    pagination.currentPage,
    pagination.totalPages,
    pagination.totalCount,
    loadingMore,
    apiLoading,
  ]);

  // ─── Scroll to top ────────────────────────────────────────────────

  const handleScrollToTop = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  // ─── Banner press — fetch offer gyms (toggle) ────────────────────

  const handleBannerPress = useCallback(async () => {
    setSelectedSlot(null);
    const hasFilters =
      activeFilters.city ||
      activeFilters.area ||
      activeFilters.pincode ||
      activeFilters.sort_price;

    if (bannerActive) {
      // Deselect banner — keep any active filters, just remove session_low
      setBannerActive(false);
      lastFetchParamsRef.current = null;
      if (hasFilters) {
        await fetchGyms(1, false, {
          ...buildParams(1),
          // session_low intentionally omitted
        });
      } else {
        await fetchWithLocation();
      }
      handleScrollToTop();
      return;
    }
    // Activate banner — include active filters + session_low
    await fetchGyms(1, false, { ...buildParams(1), session_low: true });
    setBannerActive(true);
    handleScrollToTop();
  }, [
    bannerActive,
    activeFilters,
    buildParams,
    fetchGyms,
    fetchWithLocation,
    handleScrollToTop,
  ]);

  // ─── Calendar modal ───────────────────────────────────────────────

  const isCurrentCalMonth =
    calYear === calTodayDate.getFullYear() &&
    calMonth === calTodayDate.getMonth();

  const nextMonthVal = calTodayDate.getMonth() + 1;
  const maxCalYear =
    nextMonthVal > 11
      ? calTodayDate.getFullYear() + 1
      : calTodayDate.getFullYear();
  const maxCalMonth = nextMonthVal > 11 ? nextMonthVal - 12 : nextMonthVal;
  const isAtCalMax = calYear === maxCalYear && calMonth === maxCalMonth;

  const goPrevMonth = useCallback(() => {
    if (isCurrentCalMonth) return;
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }, [isCurrentCalMonth, calMonth]);

  const goNextMonth = useCallback(() => {
    if (isAtCalMax) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }, [isAtCalMax, calMonth]);

  const calToggleDate = useCallback((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < calTodayDate) return;
    const key = toKey(d);
    setPendingDates((prev) => {
      const exists = prev.some((x) => toKey(x) === key);
      const next = exists
        ? prev.filter((x) => toKey(x) !== key)
        : [...prev, d].sort((a, b) => a - b);
      return next;
    });
  }, []);

  const openCalendar = useCallback(() => {
    // Pre-populate pending with current selectedDates as Date objects
    setPendingDates(
      selectedDates.map((iso) => {
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        return d;
      }),
    );
    setCalendarVisible(true);
  }, [selectedDates]);

  const applyCalendarDates = useCallback(() => {
    const isos = pendingDates.map((d) => toLocalISO(d));
    setSelectedSlot(null);
    // If no dates selected, deactivate offer banner to avoid 422
    if (isos.length === 0) {
      setBannerActive(false);
      bannerActiveRef.current = false;
    }
    setSelectedDates(isos);
    setCalendarVisible(false);
    lastFetchParamsRef.current = null;
    setLoading(true);
  }, [pendingDates]);

  const calCells = buildMonthGrid(calYear, calMonth);

  // ─── Date toggle — refetch on change ─────────────────────────────

  const toggleDate = useCallback((iso) => {
    lastFetchParamsRef.current = null;
    setSelectedSlot(null);
    setSelectedDates((prev) => {
      const next = prev.includes(iso)
        ? prev.filter((d) => d !== iso)
        : [...prev, iso];
      // If no dates remain, deactivate the offer banner to avoid 422
      if (next.length === 0) {
        setBannerActive(false);
        bannerActiveRef.current = false;
      }
      return next;
    });
  }, []);

  // Dates selected from calendar that are outside the 7-day strip
  const strip7Isos = useMemo(() => dates.map((d) => toLocalISO(d)), [dates]);
  const extraSelectedDates = useMemo(
    () => selectedDates.filter((iso) => !strip7Isos.includes(iso)),
    [selectedDates, strip7Isos],
  );

  // When selectedDates changes, trigger a fresh fetch
  const selectedDatesRef = useRef(selectedDates);
  useLayoutEffect(() => {
    if (selectedDatesRef.current !== selectedDates) {
      selectedDatesRef.current = selectedDates;
      // Only fetch if initial fetch already done (don't double fetch on mount)
      if (initialFetchDoneRef.current) {
        if (bannerActiveRef.current) {
          // Banner is active — refetch with session_low + new dates + active filters
          lastFetchParamsRef.current = null;
          setLoading(true);
          setApiLoading(true);
          const params = {
            session_id: sessionId,
            dates: selectedDates,
            page: 1,
            limit: ITEMS_PER_PAGE,
            session_low: true,
            ...(activeFiltersRef.current?.city && {
              city: activeFiltersRef.current.city,
            }),
            ...(activeFiltersRef.current?.area && {
              area: activeFiltersRef.current.area,
            }),
            ...(activeFiltersRef.current?.pincode && {
              pincode: activeFiltersRef.current.pincode,
            }),
            ...(activeFiltersRef.current?.sort_price && {
              sort_price: true,
              sort_type: activeFiltersRef.current.sort_type,
            }),
          };
          (async () => {
            try {
              const response = await getSessionsGymsAPI(params);
              if (response?.status === 200) {
                const normalized = response.data.map(normalizeGym);
                gymsDataRef.current = normalized;
                setGyms(normalized);
                setOfferData({
                  session_offer_eligible:
                    response.session_offer_eligible || false,
                  session_count: response.session_count || 0,
                  client_name: response.client_name || "",
                });
                setPagination({
                  currentPage: response.pagination?.current_page || 1,
                  totalPages: response.pagination?.total_pages || 1,
                  totalCount:
                    response.pagination?.total_count || normalized.length,
                  hasNext: response.pagination?.has_next || false,
                  hasPrev: response.pagination?.has_prev || false,
                });
                activeBaseParamsRef.current = params;
              }
            } catch (err) {
              console.error("ListClass banner date-change fetch error:", err);
            } finally {
              setLoading(false);
              setApiLoading(false);
            }
          })();
        } else {
          fetchWithLocation();
        }
      }
    }
  }, [selectedDates]);

  // ─── Inline search with debounce ─────────────────────────────────

  const handleSearchChange = useCallback(
    (text) => {
      setSearchQuery(text);
      setSelectedSlot(null);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        lastFetchParamsRef.current = null;
        setLoading(true);
        const params = {
          session_id: sessionId,
          dates: selectedDates,
          page: 1,
          limit: ITEMS_PER_PAGE,
          ...(text.trim() && { search: text.trim() }),
          ...(activeFilters.city && { city: activeFilters.city }),
          ...(activeFilters.area && { area: activeFilters.area }),
          ...(activeFilters.pincode && { pincode: activeFilters.pincode }),
          ...(activeFilters.sort_price && {
            sort_price: true,
            sort_type: activeFilters.sort_type,
          }),
          ...(activeBaseParamsRef.current.client_lat && {
            client_lat: activeBaseParamsRef.current.client_lat,
            client_lng: activeBaseParamsRef.current.client_lng,
          }),
          ...(bannerActiveRef.current && { session_low: true }),
        };
        fetchGyms(1, false, params);
      }, 400);
    },
    [sessionId, selectedDates, activeFilters, fetchGyms],
  );

  // ─── Filter ───────────────────────────────────────────────────────

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.city) count++;
    if (activeFilters.area) count++;
    if (activeFilters.pincode) count++;
    if (activeFilters.sort_price) count++;
    return count;
  }, [activeFilters]);

  const handleFilterApply = useCallback(
    async (filters) => {
      setActiveFilters(filters);
      setSelectedSlot(null);
      lastFetchParamsRef.current = null;
      setLoading(true);
      const params = {
        session_id: sessionId,
        dates: selectedDates,
        page: 1,
        limit: ITEMS_PER_PAGE,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        ...(filters.city && { city: filters.city }),
        ...(filters.area && { area: filters.area }),
        ...(filters.pincode && { pincode: filters.pincode }),
        ...(filters.sort_price && {
          sort_price: true,
          sort_type: filters.sort_type,
        }),
        ...(activeBaseParamsRef.current.client_lat && {
          client_lat: activeBaseParamsRef.current.client_lat,
          client_lng: activeBaseParamsRef.current.client_lng,
        }),
        ...(bannerActive && { session_low: true }),
      };
      activeBaseParamsRef.current = params;
      await fetchGyms(1, false, params);
      handleScrollToTop();
    },
    [
      sessionId,
      selectedDates,
      searchQuery,
      bannerActive,
      fetchGyms,
      handleScrollToTop,
    ],
  );

  const handleFilterReset = useCallback(async () => {
    setActiveFilters({});
    setSelectedSlot(null);
    lastFetchParamsRef.current = null;
    // Build params manually with cleared filters (can't rely on buildParams
    // since setActiveFilters above won't have updated state yet)
    const baseParams = {
      session_id: sessionId,
      dates: selectedDates,
      page: 1,
      limit: ITEMS_PER_PAGE,
      ...(activeBaseParamsRef.current.client_lat && {
        client_lat: activeBaseParamsRef.current.client_lat,
        client_lng: activeBaseParamsRef.current.client_lng,
      }),
      ...(bannerActive && { session_low: true }),
    };
    activeBaseParamsRef.current = baseParams;
    await fetchGyms(1, false, baseParams);
    handleScrollToTop();
  }, [bannerActive, sessionId, selectedDates, fetchGyms, handleScrollToTop]);

  // ─── Gym detail modal ─────────────────────────────────────────────

  const handleCardPress = useCallback(async (item) => {
    setGymDetailItem(item);
    setGymDetailData(null);
    setGymDetailLoading(true);
    setGymDetailModalVisible(true);
    try {
      const response = await getGymDetail(item.gym_id);
      if (response?.status === 200 || response?.data) {
        setGymDetailData(response.data || response);
      }
    } catch (err) {
      console.error("GymDetailModal fetch error:", err);
    } finally {
      setGymDetailLoading(false);
    }
  }, []);

  // ─── Render card ──────────────────────────────────────────────────

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const renderGymCard = useCallback(
    ({ item }) => (
      <ClassCard
        item={item}
        onCardPress={handleCardPress}
        selectedSlot={selectedSlot}
        onSlotSelect={handleSlotSelect}
      />
    ),
    [handleCardPress, selectedSlot, handleSlotSelect],
  );

  // ─── List header ──────────────────────────────────────────────────

  const renderListHeader = useMemo(() => {
    const showBanner =
      bannerActive ||
      (offerData.session_offer_eligible && sessionRemaining > 0);
    return (
      <View>
        {showBanner && (
          <View style={styles.pricingCardsContainer}>
            <View style={{ paddingHorizontal: 16, alignItems: "center" }}>
              <TouchableOpacity
                style={[
                  styles.gymPassBanner,
                  bannerActive && styles.gymPassBannerActive,
                ]}
                onPress={handleBannerPress}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerEmoji}>🎉</Text>
                <Text style={styles.bannerGreeting} numberOfLines={1}>
                  Hi <Text style={styles.bannerBold}>{greetingName}</Text>
                  {", You've unlocked "}
                  <Text style={styles.bannerBold}>
                    {sessionRemaining} Session
                    {sessionRemaining !== 1 ? "s" : ""}
                    {" at ₹99"}
                  </Text>
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#454545"
                  style={styles.bannerArrow}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.locationBanner}>
          <Ionicons name="location" size={14} color="#263E82" />
          <Text style={styles.locationBannerText}>
            <Text style={styles.locationBannerBold}>
              {pagination.totalCount} Fitness Classes
            </Text>
            {Object.keys(activeFilters).length === 0 && locationArea
              ? ` in ${locationArea}`
              : " Available"}
          </Text>
        </View>
      </View>
    );
  }, [
    offerData,
    sessionRemaining,
    greetingName,
    pagination.totalCount,
    handleBannerPress,
    bannerActive,
    locationArea,
    activeFilters,
  ]);

  // ─── List footer ──────────────────────────────────────────────────

  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#FF5757" />
        <Text style={styles.loadMoreText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {session_name ? String(session_name) : "Fitness Classes"}
        </Text>

        <TouchableOpacity
          style={styles.earnButton}
          activeOpacity={0.8}
          onPress={() => router.push("/client/referral")}
        >
          <View style={styles.coinGifContainer}>
            <Image
              source={require("../../../assets/gif/coin.gif")}
              style={styles.coinGif}
              contentFit="cover"
            />
          </View>
          <View>
            <Text style={styles.earnLabel}>Earn</Text>
            <Text style={styles.earnAmount}>₹100</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Date strip ──────────────────────────────────────────── */}
      <View style={styles.dateSection}>
        <View style={styles.dateSectionHeader}>
          <Text style={styles.dateSectionTitle}>Select Multiple Dates</Text>
          <TouchableOpacity
            style={styles.calendarHint}
            activeOpacity={0.7}
            onPress={openCalendar}
          >
            <Ionicons name="calendar-outline" size={16} color="#FF5757" />
            <Text style={styles.calendarHintText}>More dates</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {dates.map((d) => {
            const { day, date, iso } = fmtDate(d);
            const active = selectedDates.includes(iso);
            return (
              <TouchableOpacity
                key={iso}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => toggleDate(iso)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    active && styles.dateChipDayActive,
                  ]}
                >
                  {day}
                </Text>
                <Text
                  style={[
                    styles.dateChipDate,
                    active && styles.dateChipDateActive,
                  ]}
                >
                  {date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Extra dates from calendar picker */}
        {extraSelectedDates.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.extraDatesScroll}
          >
            {extraSelectedDates.map((iso) => {
              const [year, month, day] = iso.split("-").map(Number);
              const d = new Date(year, month - 1, day);
              const label = d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              });
              return (
                <View key={iso} style={styles.extraDateChip}>
                  <Text style={styles.extraDateChipText}>{label}</Text>
                  <TouchableOpacity
                    onPress={() => toggleDate(iso)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={13} color="#FF5757" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Search bar + filter ─────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={20}
            color="#FF5757"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Fitness Studios..."
            placeholderTextColor="#AAAAAA"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#AAAAAA" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.filterButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options" size={20} color="#FFFFFF" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Content ─────────────────────────────────────────────── */}
      {selectedDates.length === 0 ? (
        <View style={styles.noDateContainer}>
          <Ionicons name="calendar-outline" size={48} color="#E0E0E0" />
          <Text style={styles.noDateTitle}>Choose at least one date</Text>
          <Text style={styles.noDateSubtitle}>
            Tap a date above or use "More dates" to select from the calendar
          </Text>
        </View>
      ) : loading || (apiLoading && gyms.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5757" />
          <Text style={styles.loadingText}>Finding classes...</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.locationDeniedContainer}>
          <View style={styles.locationDeniedIconWrap}>
            <Ionicons name="location-outline" size={44} color="#FF5757" />
          </View>
          <Text style={styles.locationDeniedTitle}>Location access is off</Text>
          <Text style={styles.locationDeniedSubtitle}>
            We need your location to show fitness classes near you. Your
            location is only used to find nearby gyms.
          </Text>
          <TouchableOpacity
            style={[
              styles.locationDeniedButton,
              requestingLocation && { opacity: 0.7 },
            ]}
            activeOpacity={0.85}
            onPress={handleEnableLocation}
            disabled={requestingLocation}
          >
            {requestingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.locationDeniedButtonText}>
                  Enable Location
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={flatListRef}
          key={flashListKey}
          data={gyms}
          renderItem={renderGymCard}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={300}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            scrollOffsetRef.current = offsetY;
            setShowScrollTop(offsetY > 400);
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No fitness classes found.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.8}
                onPress={() => {
                  const sorted = [...selectedDates].sort();
                  const lastIso = sorted[sorted.length - 1];
                  if (!lastIso) return;
                  const [y, m, d] = lastIso.split("-").map(Number);
                  const next = new Date(y, m - 1, d);
                  next.setDate(next.getDate() + 1);
                  const nextIso = toLocalISO(next);
                  lastFetchParamsRef.current = null;
                  setSelectedSlot(null);
                  setSelectedDates([nextIso]);
                }}
              >
                <Text style={styles.emptyTextBtn}>
                  View Classes on Next day.
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Scroll to top */}
      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollToTopButton, { bottom: insets.bottom + 20 }]}
          onPress={handleScrollToTop}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ── Confirm Bar ─────────────────────────────────────────── */}
      {selectedSlot && (
        <View
          style={[
            styles.checkoutWrapper,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <View style={styles.checkoutRow}>
            <View style={styles.checkoutPriceBox}>
              <Text style={styles.checkoutPayLabel}>Selected Slot</Text>
              <Text style={styles.checkoutPayAmount} numberOfLines={1}>
                {selectedSlot.time}
              </Text>
              <Text style={styles.checkoutGymName} numberOfLines={1}>
                {selectedSlot.gymName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtnWrap}
              activeOpacity={0.85}
              onPress={() => {
                SKIP_NEXT_FC_FOCUS_FETCH = true;
                router.push({
                  pathname: "/client/(fitnessclass)/sessionCheckout",
                  params: {
                    gymId: String(selectedSlot.gymId),
                    gymName: selectedSlot.gymName,
                    sessionId: String(sessionId),
                    sessionName: session_name || "",
                    scheduleId: String(selectedSlot.scheduleId),
                    slotTime: selectedSlot.time,
                    selectedDates: JSON.stringify(selectedDates),
                  },
                });
              }}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Gym Detail Modal */}
      <GymDetailModal
        visible={gymDetailModalVisible}
        onClose={() => {
          setGymDetailModalVisible(false);
          setGymDetailData(null);
          setGymDetailItem(null);
        }}
        gymData={gymDetailData}
        gymName={gymDetailItem?.name}
        loading={gymDetailLoading}
        hideBookNow
      />

      {/* Filter Modal */}
      <FitnessClassFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        filters={activeFilters}
      />

      {/* ── Calendar Modal ───────────────────────────────────────── */}
      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.calModalOverlay}>
          <View
            style={[
              styles.calModalSheet,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            {/* Header */}
            <View style={styles.calModalHeader}>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                style={styles.calModalClose}
              >
                <Ionicons name="close" size={22} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.calModalTitle}>Select Dates</Text>
              <TouchableOpacity
                onPress={() => setPendingDates([])}
                disabled={pendingDates.length === 0}
              >
                <Text
                  style={[
                    styles.calModalReset,
                    pendingDates.length === 0 && styles.calModalResetDisabled,
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month navigation */}
            <View style={styles.calMonthNav}>
              <TouchableOpacity
                onPress={goPrevMonth}
                style={styles.calNavBtn}
                disabled={isCurrentCalMonth}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={isCurrentCalMonth ? "#D1D5DB" : "#1F2937"}
                />
              </TouchableOpacity>
              <Text style={styles.calMonthLabel}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity
                onPress={goNextMonth}
                style={styles.calNavBtn}
                disabled={isAtCalMax}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={isAtCalMax ? "#D1D5DB" : "#1F2937"}
                />
              </TouchableOpacity>
            </View>

            {/* Week headers */}
            <View style={styles.calWeekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text key={d} style={styles.calWeekLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Date grid */}
            <View style={styles.calGrid}>
              {Array.from(
                { length: Math.ceil(calCells.length / 7) },
                (_, wi) => (
                  <View key={wi} style={styles.calWeekRowDates}>
                    {calCells.slice(wi * 7, wi * 7 + 7).map((date, di) => {
                      if (!date)
                        return <View key={di} style={styles.calEmptyCell} />;
                      const d = new Date(date);
                      d.setHours(0, 0, 0, 0);
                      const isPast = d < calTodayDate;
                      const isToday = toKey(d) === todayKey;
                      const isSel = pendingDates.some(
                        (x) => toKey(x) === toKey(d),
                      );
                      return (
                        <TouchableOpacity
                          key={di}
                          style={[
                            styles.calDateCell,
                            isSel && styles.calDateCellSelected,
                            isToday && !isSel && styles.calDateCellToday,
                            isPast && styles.calDateCellDisabled,
                          ]}
                          onPress={() => calToggleDate(date)}
                          disabled={isPast}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.calDateText,
                              isSel && styles.calDateTextSelected,
                              isToday && !isSel && styles.calDateTextToday,
                              isPast && styles.calDateTextDisabled,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ),
              )}
            </View>

            {/* Selected chips */}
            {pendingDates.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calChipsRow}
              >
                {pendingDates.map((d) => (
                  <View key={toKey(d)} style={styles.calChip}>
                    <Text style={styles.calChipText}>
                      {d.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Apply */}
            <TouchableOpacity
              style={[
                styles.calApplyBtn,
                pendingDates.length === 0 && styles.calApplyBtnDisabled,
              ]}
              onPress={applyCalendarDates}
              disabled={pendingDates.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.calApplyText}>
                Apply
                {pendingDates.length > 0 ? ` (${pendingDates.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ListClass;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

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
  headerButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  earnButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD580",
  },
  coinGifContainer: { width: 28, height: 28 },
  coinGif: {
    position: "absolute",
    width: 50,
    height: 50,
    top: -14,
    left: -14,
  },
  earnLabel: { fontSize: 11, color: "#FF5757", fontWeight: "600" },
  earnAmount: { fontSize: 14, color: "#FF5757", fontWeight: "700" },

  // Date strip
  dateSection: {
    paddingTop: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  dateSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dateSectionTitle: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  calendarHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF5757",
    backgroundColor: "#FFF5F5",
  },
  calendarHintText: { fontSize: 11, color: "#FF5757", fontWeight: "600" },
  dateScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  dateChip: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  dateChipActive: { backgroundColor: "#22C55E" },
  dateChipDay: {
    fontSize: 11,
    fontWeight: "500",
    color: "#888",
    marginBottom: 2,
  },
  dateChipDayActive: { color: "#FFFFFF" },
  dateChipDate: { fontSize: 18, fontWeight: "500", color: "#1A1A1A" },
  dateChipDateActive: { color: "#FFFFFF" },
  extraDatesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },
  extraDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  extraDateChipText: { fontSize: 12, fontWeight: "600", color: "#FF5757" },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    minHeight: Platform.OS === "ios" ? 40 : 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FF5757",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: "#CC3333" },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFF",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: "#FF5757" },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#888" },

  // Location banner
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#EEF1F9",
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    marginTop: 8,
  },
  locationBannerText: { fontSize: 13, color: "#263E82", fontWeight: "700" },
  locationBannerBold: { fontWeight: "700", color: "#263E82" },

  // Empty
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyTextBtn: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: "#FF5757",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },

  // ── Location Denied ─────────────────────────────────────────────
  locationDeniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  locationDeniedIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  locationDeniedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  locationDeniedSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  locationDeniedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 180,
    elevation: 2,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locationDeniedButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Load more
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: { fontSize: 13, color: "#888" },

  // Scroll to top
  scrollToTopButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FF5757",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Gym Card
  gymCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "visible",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  freqBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFEDED",
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  freqIcon: { fontSize: 11 },
  freqText: { fontSize: 11, fontWeight: "500", color: "#EE1717" },
  cardTopRow: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    alignItems: "center",
    marginTop: 6,
  },
  thumbContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  thumbImage: { width: "100%", height: "100%" },
  cardInfo: { flex: 1 },
  gymCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 4,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationText: { fontSize: 13, color: "#4A5565" },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  viewsText: { fontSize: 12, color: "#888" },
  priceButton: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FF5757",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  priceBtnRupee: { fontSize: 12, color: "#FFFFFF", fontWeight: "700" },
  priceBtnAmount: { fontSize: 16, color: "#FFFFFF", fontWeight: "800" },
  priceBtnUnit: { fontSize: 10, color: "#FFD5D5", fontWeight: "500" },

  // Slots
  slotsGrid: { paddingHorizontal: 12, gap: 8 },
  slotRow: { flexDirection: "row", gap: 8 },
  slotChip: {
    width: (SCREEN_WIDTH - 72) / 3,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(17,175,75,0.74)",
    backgroundColor: "#FFFFFF",
  },
  slotChipSelected: { backgroundColor: "rgba(17,175,75,0.74)" },
  slotChipDisabled: { opacity: 0.3 },
  slotChipText: { fontSize: 12, fontWeight: "400", color: "#11AF4B" },
  slotChipTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  slotChipTextDisabled: { color: "#AAAAAA" },
  noSlotsText: {
    fontSize: 12,
    color: "#AAAAAA",
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontStyle: "italic",
  },
  // No-date selected state
  noDateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  noDateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  noDateSubtitle: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  noDateCalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#FF5757",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  noDateCalBtnText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  // No-date chip in strip
  noDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FF5757",
  },
  noDateChipText: {
    fontSize: 12,
    color: "#FF5757",
    fontWeight: "500",
  },

  // Calendar modal
  calModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  calModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  calModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  calModalClose: {
    padding: 4,
  },
  calModalTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  calModalReset: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
    minWidth: 40,
    textAlign: "right",
  },
  calModalResetDisabled: {
    color: "#D1D5DB",
  },
  calMonthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  calNavBtn: {
    padding: 6,
  },
  calMonthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  calWeekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  calGrid: {
    gap: 6,
  },
  calWeekRowDates: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-start",
  },
  calDateCell: {
    // fixed size: (sheet width - 6 gaps of 4px) / 7
    width: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    height: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  calDateCellSelected: {
    backgroundColor: "#22C55E",
  },
  calDateCellToday: {
    borderWidth: 2,
    borderColor: "#FF5757",
  },
  calDateCellDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.4,
  },
  calEmptyCell: {
    width: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    height: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
  },
  calDateText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  calDateTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  calDateTextToday: {
    color: "#FF5757",
    fontWeight: "700",
  },
  calDateTextDisabled: {
    color: "#9CA3AF",
  },
  calChipsRow: {
    paddingVertical: 12,
    gap: 8,
  },
  calChip: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#22C55E",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  calChipText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  calApplyBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  calApplyBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  calApplyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Offer banner
  pricingCardsContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  gymPassBanner: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  gymPassBannerActive: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FF5757",
    borderWidth: 1.5,
  },
  bannerEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  bannerGreeting: {
    flex: 1,
    fontSize: 12,
    color: "#454545",
    fontWeight: "400",
  },
  bannerBold: {
    fontSize: 12,
    color: "#454545",
    fontWeight: "700",
  },
  bannerArrow: {
    marginLeft: 4,
  },

  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-end",
    marginTop: 6,
    marginRight: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FF5757",
    backgroundColor: "#FFF5F5",
  },
  moreBtnText: { fontSize: 11, color: "#FF5757", fontWeight: "600" },

  // Checkout bar
  checkoutWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  checkoutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkoutPriceBox: { flex: 1, marginRight: 12 },
  checkoutPayLabel: { fontSize: 11, color: "#888", fontWeight: "400" },
  checkoutPayAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 1,
  },
  checkoutGymName: { fontSize: 11, color: "#888", marginTop: 2 },
  checkoutBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  checkoutText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
