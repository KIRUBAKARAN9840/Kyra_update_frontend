import React, {
  useState,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
  Platform,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { BackHandler } from "react-native";
import {
  getPTGymsAPI,
  getPTTrainersAPI,
  getPTTrainerSlotsAPI,
  getGymDetail,
} from "../../../services/clientApi";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;
const SLOTS_VISIBLE = 6;

// ─── IST helpers ──────────────────────────────────────────────────────────────

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

const calTodayDate = (() => {
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

// ─── Module-level cache ───────────────────────────────────────────────────────

let PT_LIST_CACHE = null;
let SKIP_NEXT_PT_FOCUS_FETCH = false;

const savePtCache = (payload) => {
  PT_LIST_CACHE = { ...(PT_LIST_CACHE || {}), ...payload };
};

const clearPtCache = () => {
  PT_LIST_CACHE = null;
};

export const resetPtListCache = () => {
  PT_LIST_CACHE = null;
  SKIP_NEXT_PT_FOCUS_FETCH = false;
};

const getInitialState = () => {
  if (PT_LIST_CACHE && SKIP_NEXT_PT_FOCUS_FETCH && PT_LIST_CACHE.gyms) {
    return PT_LIST_CACHE.gyms;
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
  trainer: gym.trainer || null,
  extra_trainers_count: gym.extra_trainers_count || 0,
});

// ─── Slot chip ─────────────────────────────────────────────────────────────

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

// ─── PT Card ──────────────────────────────────────────────────────────────────

const PTCard = React.memo(
  ({ item, onCardPress, selectedSlot, onSlotSelect, onMoreTrainers }) => {
    const [expanded, setExpanded] = useState(false);

    const slots = item.trainer?.slots || [];
    const visibleSlots = useMemo(
      () => (expanded ? slots : slots.slice(0, SLOTS_VISIBLE)),
      [slots, expanded],
    );
    const hasMore = slots.length > SLOTS_VISIBLE;

    return (
      <View style={styles.gymCard}>
        {item.frequently_booked && (
          <View style={styles.freqBadge}>
            <Text style={styles.freqIcon}>🔥</Text>
            <Text style={styles.freqText}>Frequently Booked</Text>
          </View>
        )}

        {/* Cover image — full width, tappable */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => onCardPress(item)}>
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: item.image }}
              style={styles.coverImage}
              contentFit="cover"
            />
            {/* Gradient-style bottom overlay for gym name */}
            <View style={styles.coverOverlay}>
              <Text style={styles.coverGymName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.coverLocationRow}>
                <Ionicons name="location-outline" size={12} color="#FFFFFF" />
                <Text style={styles.coverLocationText} numberOfLines={1}>
                  {item.area}
                  {item.distance_km != null ? ` • ${item.distance_km} km` : ""}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Trainer row + price */}
        <TouchableOpacity
          style={styles.trainerRow}
          onPress={() => onCardPress(item)}
          activeOpacity={0.85}
        >
          {/* Trainer avatar */}
          <View style={styles.trainerAvatarWrap}>
            {item.trainer?.profile_image ? (
              <Image
                source={{ uri: item.trainer.profile_image }}
                style={styles.trainerAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.trainerAvatarFallback}>
                <Ionicons name="person" size={22} color="#AAAAAA" />
              </View>
            )}
          </View>

          {/* Trainer details */}
          <View style={styles.trainerInfo}>
            <Text style={styles.trainerName} numberOfLines={1}>
              {item.trainer?.name || "Trainer"}
            </Text>
            {item.trainer?.experience != null && (
              <Text style={styles.trainerExp}>
                {item.trainer.experience} Years Experience
              </Text>
            )}
            {item.extra_trainers_count > 0 && (
              <TouchableOpacity
                style={styles.moreTrainersRow}
                onPress={() => onMoreTrainers(item)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.moreTrainersText}>
                  +{item.extra_trainers_count} more trainer
                  {item.extra_trainers_count !== 1 ? "s" : ""}
                </Text>
                <Ionicons name="chevron-down" size={12} color="#22C55E" />
              </TouchableOpacity>
            )}
          </View>

          {/* Price */}
          {item.session_price != null && (
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>₹{item.session_price}</Text>
              <Text style={styles.priceUnit}>per session</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Slots label */}
        <Text style={styles.slotsLabel}>Available Time Slots</Text>

        {/* Slots grid */}
        {visibleSlots.length > 0 ? (
          <View style={styles.slotsGrid}>
            {Array.from({ length: Math.ceil(visibleSlots.length / 3) }).map(
              (_, rowIdx) => (
                <View key={rowIdx} style={styles.slotRow}>
                  {visibleSlots
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
                                    trainerName: item.trainer?.name || "",
                                    item,
                                  },
                            )
                          }
                        />
                      );
                    })}
                </View>
              ),
            )}
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
                : `+${slots.length - SLOTS_VISIBLE} more slots`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ListTrainers = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    () => PT_LIST_CACHE?.searchQuery || "",
  );
  const [activeFilters, setActiveFilters] = useState(
    () => PT_LIST_CACHE?.activeFilters || {},
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
  // Trainer picker modal
  const [trainerPickerItem, setTrainerPickerItem] = useState(null); // the gym item
  const [trainerList, setTrainerList] = useState([]);
  const [trainerListLoading, setTrainerListLoading] = useState(false);
  const [selectedPickerTrainerId, setSelectedPickerTrainerId] = useState(null);
  const [trainerSlotLoading, setTrainerSlotLoading] = useState(false);

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calYear, setCalYear] = useState(calTodayDate.getFullYear());
  const [calMonth, setCalMonth] = useState(calTodayDate.getMonth());
  const [pendingDates, setPendingDates] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
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

  const flashListKey = "pt-gyms-list";

  const sessionRemaining = Math.max(0, 3 - offerData.session_count);
  const greetingName = useMemo(() => {
    const name = offerData.client_name || "";
    const first = name.trim().split(" ")[0];
    return first.length > 8 ? first.slice(0, 8) + ".." : first || "Guest";
  }, [offerData.client_name]);

  // ─── Build API params ──────────────────────────────────────────────

  const buildParams = useCallback(
    (page, overrides = {}) => {
      const params = {
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
    [selectedDates, searchQuery, activeFilters],
  );

  // ─── Core fetch ────────────────────────────────────────────────────

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

        const response = await getPTGymsAPI(params);
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
          if (!loadMore) activeBaseParamsRef.current = params;
        }
      } catch (err) {
        console.error("ListTrainers fetchGyms error:", err);
      } finally {
        setApiLoading(false);
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [buildParams, loading],
  );

  // ─── Location fetch ────────────────────────────────────────────────

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
      const response = await getPTGymsAPI(params);
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
    } catch (err) {
      console.error("ListTrainers location fetch error:", err);
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

  // ─── Hydrate from cache ────────────────────────────────────────────

  const hydrateFromCache = useCallback(() => {
    if (!SKIP_NEXT_PT_FOCUS_FETCH || !PT_LIST_CACHE) return false;

    const cachedGyms = PT_LIST_CACHE.gyms || [];
    gymsDataRef.current = cachedGyms;

    const isSameReference = gyms === cachedGyms;
    if (!isSameReference) setGyms(cachedGyms);

    savedScrollOffsetRef.current = PT_LIST_CACHE?.scrollOffset || 0;
    isRestoringFromCacheRef.current = true;
    setNeedsScrollRestore(true);

    if (PT_LIST_CACHE.pagination) setPagination(PT_LIST_CACHE.pagination);
    if (PT_LIST_CACHE.offerData) setOfferData(PT_LIST_CACHE.offerData);
    if (PT_LIST_CACHE.searchQuery != null)
      setSearchQuery(PT_LIST_CACHE.searchQuery);
    if (PT_LIST_CACHE.activeFilters)
      setActiveFilters(PT_LIST_CACHE.activeFilters);
    if (PT_LIST_CACHE.selectedDates)
      setSelectedDates(PT_LIST_CACHE.selectedDates);

    setLoading(false);
    setApiLoading(false);
    setLoadingMore(false);
    SKIP_NEXT_PT_FOCUS_FETCH = false;

    setTimeout(() => clearPtCache(), 100);
    return true;
  }, [gyms]);

  // ─── Focus effect ──────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const hydrated = hydrateFromCache();
      if (!hydrated && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        fetchWithLocation();
      }
      return () => {
        savePtCache({
          gyms: gymsDataRef.current,
          pagination,
          offerData,
          scrollOffset: scrollOffsetRef.current,
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

  // ─── Back handler ──────────────────────────────────────────────────

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

  // ─── Load more ─────────────────────────────────────────────────────

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
      const response = await getPTGymsAPI(params);
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
      console.error("ListTrainers loadMore error:", err);
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

  // ─── Scroll to top ─────────────────────────────────────────────────

  const handleScrollToTop = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  // ─── Banner press ──────────────────────────────────────────────────

  const handleBannerPress = useCallback(async () => {
    setSelectedSlot(null);
    const hasFilters =
      activeFilters.city ||
      activeFilters.area ||
      activeFilters.pincode ||
      activeFilters.sort_price;

    if (bannerActive) {
      setBannerActive(false);
      lastFetchParamsRef.current = null;
      if (hasFilters) {
        await fetchGyms(1, false, { ...buildParams(1) });
      } else {
        await fetchWithLocation();
      }
      handleScrollToTop();
      return;
    }
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

  // ─── Calendar modal ────────────────────────────────────────────────

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
    } else setCalMonth((m) => m - 1);
  }, [isCurrentCalMonth, calMonth]);

  const goNextMonth = useCallback(() => {
    if (isAtCalMax) return;
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  }, [isAtCalMax, calMonth]);

  const calToggleDate = useCallback((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < calTodayDate) return;
    const key = toKey(d);
    setPendingDates((prev) => {
      const exists = prev.some((x) => toKey(x) === key);
      return exists
        ? prev.filter((x) => toKey(x) !== key)
        : [...prev, d].sort((a, b) => a - b);
    });
  }, []);

  const openCalendar = useCallback(() => {
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

  // ─── Date toggle ───────────────────────────────────────────────────

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

  const strip7Isos = useMemo(() => dates.map((d) => toLocalISO(d)), [dates]);
  const extraSelectedDates = useMemo(
    () => selectedDates.filter((iso) => !strip7Isos.includes(iso)),
    [selectedDates, strip7Isos],
  );

  // Re-fetch when selectedDates changes
  const selectedDatesRef = useRef(selectedDates);
  useLayoutEffect(() => {
    if (selectedDatesRef.current !== selectedDates) {
      selectedDatesRef.current = selectedDates;
      if (initialFetchDoneRef.current) {
        if (bannerActiveRef.current) {
          lastFetchParamsRef.current = null;
          setLoading(true);
          setApiLoading(true);
          const params = {
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
              const response = await getPTGymsAPI(params);
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
              console.error(
                "ListTrainers banner date-change fetch error:",
                err,
              );
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

  // ─── Search ────────────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (text) => {
      setSearchQuery(text);
      setSelectedSlot(null);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        lastFetchParamsRef.current = null;
        setLoading(true);
        const params = {
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
    [selectedDates, activeFilters, fetchGyms],
  );

  // ─── Filter ────────────────────────────────────────────────────────

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
    [selectedDates, searchQuery, bannerActive, fetchGyms, handleScrollToTop],
  );

  const handleFilterReset = useCallback(async () => {
    setActiveFilters({});
    setSelectedSlot(null);
    lastFetchParamsRef.current = null;
    const baseParams = {
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
  }, [bannerActive, selectedDates, fetchGyms, handleScrollToTop]);

  // ─── Trainer picker ────────────────────────────────────────────────

  const handleMoreTrainers = useCallback(async (item) => {
    setTrainerPickerItem(item);
    setTrainerList([]);
    setSelectedPickerTrainerId(null);
    setTrainerListLoading(true);
    try {
      const res = await getPTTrainersAPI({
        gym_id: item.gym_id,
        exclude_trainer_id: item.trainer?.trainer_id,
      });
      if (res?.status === 200) {
        setTrainerList(res.trainers || []);
      }
    } catch (err) {
      console.error("getPTTrainersAPI error:", err);
    } finally {
      setTrainerListLoading(false);
    }
  }, []);

  const handlePickerTrainerSelect = useCallback(
    async (trainer) => {
      if (!trainerPickerItem) return;
      if (selectedPickerTrainerId === trainer.trainer_id) return;
      setSelectedSlot(null);
      setSelectedPickerTrainerId(trainer.trainer_id);
      setTrainerSlotLoading(true);
      try {
        const res = await getPTTrainerSlotsAPI({
          gym_id: trainerPickerItem.gym_id,
          trainer_id: trainer.trainer_id,
          dates: selectedDates,
        });
        if (res?.status === 200) {
          const updatedTrainer = {
            ...trainer,
            slots: res.trainer?.slots || [],
          };
          const price =
            res.session_price != null
              ? res.session_price
              : trainerPickerItem.session_price;
          // Patch the item in gymsDataRef without changing scroll position
          const idx = gymsDataRef.current.findIndex(
            (g) => g.gym_id === trainerPickerItem.gym_id,
          );
          if (idx !== -1) {
            gymsDataRef.current = gymsDataRef.current.map((g, i) =>
              i === idx
                ? { ...g, trainer: updatedTrainer, session_price: price }
                : g,
            );
            setGyms([...gymsDataRef.current]);
          }
          // Update the picker item so the price shown reflects new trainer
          setTrainerPickerItem((prev) =>
            prev
              ? { ...prev, trainer: updatedTrainer, session_price: price }
              : prev,
          );
          setTrainerPickerItem(null); // close modal after swap
        }
      } catch (err) {
        console.error("getPTTrainerSlotsAPI error:", err);
      } finally {
        setTrainerSlotLoading(false);
      }
    },
    [trainerPickerItem, selectedPickerTrainerId, selectedDates],
  );

  // ─── Gym detail modal ──────────────────────────────────────────────

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
      console.error("PT GymDetailModal fetch error:", err);
    } finally {
      setGymDetailLoading(false);
    }
  }, []);

  // ─── Render card ───────────────────────────────────────────────────

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const renderGymCard = useCallback(
    ({ item }) => (
      <PTCard
        item={item}
        onCardPress={handleCardPress}
        selectedSlot={selectedSlot}
        onSlotSelect={handleSlotSelect}
        onMoreTrainers={handleMoreTrainers}
      />
    ),
    [handleCardPress, selectedSlot, handleSlotSelect, handleMoreTrainers],
  );

  // ─── List header ───────────────────────────────────────────────────

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
                    {sessionRemaining} Class
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
              {pagination.totalCount} Personal Trainers
            </Text>
            {" Available"}
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
  ]);

  // ─── List footer ───────────────────────────────────────────────────

  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#FF5757" />
        <Text style={styles.loadMoreText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Personal Trainer</Text>

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

      {/* ── Date strip ──────────────────────────────────────────────── */}
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

      {/* ── Search bar + filter ──────────────────────────────────────── */}
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
            placeholder="Search by Fitness Studio..."
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

      {/* ── Content ─────────────────────────────────────────────────── */}
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
          <Text style={styles.loadingText}>Finding trainers...</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.locationDeniedContainer}>
          <View style={styles.locationDeniedIconWrap}>
            <Ionicons name="location-outline" size={44} color="#FF5757" />
          </View>
          <Text style={styles.locationDeniedTitle}>
            Location access is off
          </Text>
          <Text style={styles.locationDeniedSubtitle}>
            We need your location to show personal trainers near you. Your
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
          estimatedItemSize={380}
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
              <Text style={styles.emptyText}>
                No personal trainers found. Try adjusting dates or filters.
              </Text>
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
                  View Trainers on Next day.
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

      {/* ── Confirm Bar ─────────────────────────────────────────────── */}
      {selectedSlot && (
        <View
          style={[
            styles.checkoutWrapper,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <View style={styles.checkoutRow}>
            <TouchableOpacity
              style={styles.checkoutClearBtn}
              onPress={() => setSelectedSlot(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#888" />
            </TouchableOpacity>
            <View style={styles.checkoutPriceBox}>
              <Text style={styles.checkoutPayLabel}>Selected Slot</Text>
              <Text style={styles.checkoutPayAmount} numberOfLines={1}>
                {selectedSlot.time}
              </Text>
              <Text style={styles.checkoutGymName} numberOfLines={1}>
                {selectedSlot.gymName}
                {selectedSlot.trainerName
                  ? ` · ${selectedSlot.trainerName}`
                  : ""}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtnWrap}
              activeOpacity={0.85}
              onPress={() => {
                SKIP_NEXT_PT_FOCUS_FETCH = true;
                router.push({
                  pathname: "/client/(pt)/ptCheckout",
                  params: {
                    gymId: String(selectedSlot.gymId),
                    gymName: selectedSlot.gymName,
                    trainerId: String(
                      selectedSlot.item?.trainer?.trainer_id ?? "",
                    ),
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

      {/* ── Trainer Picker Modal ────────────────────────────────────── */}
      <Modal
        visible={trainerPickerItem !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setTrainerPickerItem(null)}
        statusBarTranslucent
      >
        <View style={styles.tpOverlay}>
          <View style={[styles.tpSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Header */}
            <View style={styles.tpHeader}>
              <Text style={styles.tpTitle}>Choose Trainer</Text>
              <TouchableOpacity
                onPress={() => setTrainerPickerItem(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.tpSubtitle} numberOfLines={1}>
              {trainerPickerItem?.name}
            </Text>

            {trainerListLoading ? (
              <View style={styles.tpLoader}>
                <ActivityIndicator size="small" color="#FF5757" />
                <Text style={styles.tpLoaderText}>Loading trainers...</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {trainerList.map((trainer) => {
                  const isSelected =
                    selectedPickerTrainerId === trainer.trainer_id;
                  const isLoading = trainerSlotLoading && isSelected;
                  return (
                    <TouchableOpacity
                      key={trainer.trainer_id}
                      style={[styles.tpRow, isSelected && styles.tpRowSelected]}
                      onPress={() => handlePickerTrainerSelect(trainer)}
                      activeOpacity={0.75}
                      disabled={trainerSlotLoading}
                    >
                      {/* Avatar */}
                      <View style={styles.tpAvatar}>
                        {trainer.profile_image ? (
                          <Image
                            source={{ uri: trainer.profile_image }}
                            style={styles.tpAvatarImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.tpAvatarFallback}>
                            <Ionicons name="person" size={20} color="#AAAAAA" />
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View style={styles.tpInfo}>
                        <Text style={styles.tpName} numberOfLines={1}>
                          {trainer.name}
                        </Text>
                        {trainer.experience != null && (
                          <Text style={styles.tpExp}>
                            {trainer.experience} yrs experience
                          </Text>
                        )}
                      </View>

                      {/* Radio / loader */}
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#FF5757" />
                      ) : (
                        <View
                          style={[
                            styles.tpRadio,
                            isSelected && styles.tpRadioSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.tpRadioFill} />}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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

      {/* ── Calendar Modal ─────────────────────────────────────────── */}
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
                (_, wi) => {
                  const rowCells = calCells.slice(wi * 7, wi * 7 + 7);
                  // Pad row to always have 7 cells so last row aligns correctly
                  while (rowCells.length < 7) rowCells.push(null);
                  return (
                    <View key={wi} style={styles.calWeekRowDates}>
                      {rowCells.map((date, di) => {
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
                  );
                },
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

export default ListTrainers;

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
  coinGif: { position: "absolute", width: 50, height: 50, top: -14, left: -14 },
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

  // Offer banner
  pricingCardsContainer: { paddingTop: 10 },
  gymPassBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "100%",
    gap: 8,
  },
  gymPassBannerActive: { backgroundColor: "#FFF0F0", borderColor: "#FF5757" },
  bannerEmoji: { fontSize: 14 },
  bannerGreeting: { flex: 1, fontSize: 13, color: "#454545" },
  bannerBold: { fontWeight: "700", color: "#1A1A1A" },
  bannerArrow: { marginLeft: 4 },

  // Empty / no-date
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

  // PT Card
  gymCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 12,
  },
  freqBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFEDED",
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  freqIcon: { fontSize: 11 },
  freqText: { fontSize: 11, fontWeight: "500", color: "#EE1717" },

  // Cover image
  coverContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  coverImage: { width: "100%", height: "100%" },
  coverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  coverGymName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  coverLocationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  coverLocationText: { fontSize: 12, color: "#E5E5E5" },

  // Trainer row
  trainerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  trainerAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E5E5E5",
  },
  trainerAvatar: { width: "100%", height: "100%" },
  trainerAvatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerInfo: { flex: 1 },
  trainerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 2,
  },
  trainerExp: { fontSize: 12, color: "#6B7280" },
  moreTrainersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  moreTrainersText: { fontSize: 12, color: "#22C55E", fontWeight: "600" },
  priceBox: { alignItems: "flex-end" },
  priceAmount: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  priceUnit: { fontSize: 11, color: "#888", fontWeight: "400" },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 12,
    marginVertical: 10,
  },

  // Slots
  slotsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
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
  slotChipText: { fontSize: 12, fontWeight: "400", color: "#11AF4B" },
  slotChipTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  noSlotsText: {
    fontSize: 12,
    color: "#AAAAAA",
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontStyle: "italic",
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
  },
  moreBtnText: { fontSize: 12, color: "#FF5757", fontWeight: "600" },

  // Checkout bar
  checkoutWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingTop: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  checkoutRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkoutClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkoutPriceBox: { flex: 1 },
  checkoutPayLabel: { fontSize: 11, color: "#888", fontWeight: "500" },
  checkoutPayAmount: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  checkoutGymName: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  checkoutBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF5757",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  checkoutText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Calendar modal
  calModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  calModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  calModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  calModalClose: { padding: 4 },
  calModalTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  calModalReset: { fontSize: 14, color: "#FF5757", fontWeight: "600" },
  calModalResetDisabled: { color: "#D1D5DB" },
  calMonthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calNavBtn: { padding: 6 },
  calMonthLabel: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
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
  calGrid: { gap: 6, marginBottom: 10 },
  calWeekRowDates: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-start",
  },
  calEmptyCell: {
    width: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    height: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
  },
  calDateCell: {
    width: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    height: Math.floor((SCREEN_WIDTH - 32 - 6 * 4) / 7),
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  calDateCellSelected: { backgroundColor: "#22C55E" },
  calDateCellToday: { borderWidth: 2, borderColor: "#FF5757" },
  calDateCellDisabled: { backgroundColor: "#F3F4F6", opacity: 0.4 },
  calDateText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  calDateTextSelected: { color: "#fff", fontWeight: "700" },
  calDateTextToday: { color: "#FF5757", fontWeight: "700" },
  calDateTextDisabled: { color: "#9CA3AF" },
  calChipsRow: { paddingVertical: 8, gap: 6, paddingHorizontal: 2 },
  calChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  calChipText: { fontSize: 12, color: "#22C55E", fontWeight: "600" },
  calApplyBtn: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  calApplyBtnDisabled: { backgroundColor: "#E5E7EB" },
  calApplyText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  // Trainer Picker Modal
  tpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  tpSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "70%",
  },
  tpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  tpTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  tpSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  tpLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 32,
  },
  tpLoaderText: { fontSize: 14, color: "#888" },
  tpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    borderRadius: 10,
  },
  tpRowSelected: { backgroundColor: "#F0FDF4" },
  tpAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  tpAvatarImg: { width: "100%", height: "100%" },
  tpAvatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  tpInfo: { flex: 1 },
  tpName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  tpExp: { fontSize: 12, color: "#6B7280" },
  tpRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  tpRadioSelected: { borderColor: "#22C55E" },
  tpRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
});
