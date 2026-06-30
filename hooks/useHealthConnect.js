import { useState, useEffect, useCallback } from "react";
import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { toIndianISOString } from "../utils/basicUtilFunctions";

let HealthConnect = null;

if (Constants.executionEnvironment !== "storeClient") {
  try {
    HealthConnect = require("react-native-health-connect");
  } catch (e) {}
} else {
}

const useHealthConnect = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [stepsData, setStepsData] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const [needsDataSource, setNeedsDataSource] = useState(false);
  const [weeklyStepsData, setWeeklyStepsData] = useState([]);
  const [hourlyStepsData, setHourlyStepsData] = useState([]);

  // 1️⃣ Initialize
  const initHC = useCallback(async () => {
    if (!HealthConnect) {
      return;
    }

    try {
      const status = await HealthConnect.getSdkStatus();
      const available =
        status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;

      setIsAvailable(available);

      if (available) {
        const init = await HealthConnect.initialize();
        setInitialized(init);
      }
    } catch (err) {}
  }, []);

  // 2️⃣ Request permission or navigate to install
  const setupHealthConnect = useCallback(async () => {
    if (!HealthConnect) {
      return false;
    }

    setIsLoading(true);

    try {
      // Check if HC is available first
      const status = await HealthConnect.getSdkStatus();
      const available =
        status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;

      if (!available) {
        // HC not installed - navigate to Play Store
        const playStoreUrl =
          "market://details?id=com.google.android.apps.healthdata";
        const playStoreWebUrl =
          "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";

        try {
          const canOpen = await Linking.canOpenURL(playStoreUrl);
          if (canOpen) {
            await Linking.openURL(playStoreUrl);
          } else {
            await Linking.openURL(playStoreWebUrl);
          }
        } catch (error) {
          // Fallback to HC settings
          await HealthConnect.openHealthConnectSettings();
        }

        setIsLoading(false);
        return "install"; // Return special value to indicate installation needed
      }

      // HC is available - request permissions
      if (!initialized) {
        await initHC();
      }

      const granted = await HealthConnect.requestPermission([
        { accessType: "read", recordType: "Steps" },
      ]);

      if (granted && granted.length > 0) {
        setHasPermission(true);
        fetchTodaySteps();
        return true;
      }
      await HealthConnect.openHealthConnectSettings();
      return false;
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [initialized, isAvailable, initHC, fetchTodaySteps]);

  // 3️⃣ Read steps
  const fetchTodaySteps = useCallback(async () => {
    if (!HealthConnect || !hasPermission) return;

    try {
      setIsLoading(true);

      const now = new Date();

      // Calculate start of today in IST (00:00 IST)
      const year = now.getFullYear();
      const month = now.getMonth();
      const date = now.getDate();

      // Create date at local midnight, then convert to UTC
      const localMidnight = new Date(year, month, date, 0, 0, 0, 0);
      const startOfDayUTC = localMidnight;

      const result = await HealthConnect.readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: startOfDayUTC.toISOString(),
          endTime: now.toISOString(),
        },
      });

      // Group records by dataOrigin to see which apps are writing data
      const recordsByApp = {};
      result?.records?.forEach((record) => {
        const app = record.metadata?.dataOrigin || "unknown";
        if (!recordsByApp[app]) {
          recordsByApp[app] = [];
        }
        recordsByApp[app].push(record);
      });

      // Check for overlapping time periods from DIFFERENT apps (true duplicates)
      const crossAppOverlaps = [];
      const records = result?.records || [];
      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const r1 = records[i];
          const r2 = records[j];
          const app1 = r1.metadata?.dataOrigin;
          const app2 = r2.metadata?.dataOrigin;

          // Only check overlaps from different apps
          if (app1 === app2) continue;

          const r1Start = new Date(r1.startTime).getTime();
          const r1End = new Date(r1.endTime).getTime();
          const r2Start = new Date(r2.startTime).getTime();
          const r2End = new Date(r2.endTime).getTime();

          // Check if time ranges overlap (with 1-second buffer for timing precision)
          if (r1Start < r2End + 1000 && r2Start < r1End + 1000) {
            crossAppOverlaps.push({
              record1: { app: app1, count: r1.count, start: r1.startTime, end: r1.endTime },
              record2: { app: app2, count: r2.count, start: r2.startTime, end: r2.endTime },
            });
          }
        }
      }

      if (crossAppOverlaps.length > 0) {
        // Merge overlapping records from different apps
        // Strategy: Take the MAX count for overlapping periods to avoid double-counting
        const mergedRecords = [];
        const processedIndices = new Set();

        for (let i = 0; i < records.length; i++) {
          if (processedIndices.has(i)) continue;

          const currentRecord = records[i];
          const currentApp = currentRecord.metadata?.dataOrigin;
          let maxCount = currentRecord.count || 0;

          // Check if this record overlaps with any from other apps
          for (let j = i + 1; j < records.length; j++) {
            if (processedIndices.has(j)) continue;

            const otherRecord = records[j];
            const otherApp = otherRecord.metadata?.dataOrigin;

            if (currentApp === otherApp) continue;

            const r1Start = new Date(currentRecord.startTime).getTime();
            const r1End = new Date(currentRecord.endTime).getTime();
            const r2Start = new Date(otherRecord.startTime).getTime();
            const r2End = new Date(otherRecord.endTime).getTime();

            // Check overlap with 1-second buffer
            if (r1Start < r2End + 1000 && r2Start < r1End + 1000) {
              maxCount = Math.max(maxCount, otherRecord.count || 0);
              processedIndices.add(j);
            }
          }

          mergedRecords.push({
            ...currentRecord,
            count: maxCount
          });
          processedIndices.add(i);
        }

        const total = mergedRecords.reduce((sum, r) => sum + (r.count || 0), 0);
        setStepsData(total);
      } else {
        // Use all records directly
        const recordsToUse = result?.records || [];
        const total = recordsToUse.reduce((sum, r) => sum + (r.count || 0), 0);
        setStepsData(total);
      }

      // Check if ANY historical data exists (last 7 days) to determine if data source is synced
      // This helps distinguish between "0 steps today" vs "no data source connected"
      if (!result?.records || result.records.length === 0) {
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);

        const historicalResult = await HealthConnect.readRecords("Steps", {
          timeRangeFilter: {
            operator: "between",
            startTime: last7Days.toISOString(),
            endTime: now.toISOString(),
          },
        });

        if (
          !historicalResult?.records ||
          historicalResult.records.length === 0
        ) {
          // Check if user clicked "Install Google Fit" recently
          const installTimestamp = await AsyncStorage.getItem(
            "googleFitInstallTimestamp",
          );

          if (installTimestamp) {
            const installDate = new Date(installTimestamp);
            const daysSinceInstall =
              (now - installDate) / (1000 * 60 * 60 * 24);

            if (daysSinceInstall < 1) {
              // Less than 1 day since install - assume user just installed it

              setNeedsDataSource(false);
            } else {
              // More than 1 day and still no data - show install prompt again

              setNeedsDataSource(true);
              // Clear the old timestamp
              await AsyncStorage.removeItem("googleFitInstallTimestamp");
            }
          } else {
            // No install timestamp - user hasn't clicked install yet
            setNeedsDataSource(true);
          }
        } else {
          setNeedsDataSource(false);
          // Clear timestamp if data is now available
          await AsyncStorage.removeItem("googleFitInstallTimestamp");
        }
      } else {
        // Records exist for today, data source is definitely synced
        setNeedsDataSource(false);
        // Clear timestamp if data is now available
        await AsyncStorage.removeItem("googleFitInstallTimestamp");
      }
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  // 4️⃣ Check if permission exists
  const checkPermission = useCallback(async () => {
    if (!HealthConnect) return false;

    try {
      await HealthConnect.readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: new Date(Date.now() - 1000).toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      setHasPermission(true);
      return true;
    } catch (e) {
      setHasPermission(false);
      return false;
    }
  }, []);

  // 5️⃣ Open Google Fit to install/sync
  const openGoogleFit = useCallback(async () => {
    const googleFitUrl = "market://details?id=com.google.android.apps.fitness";
    const googleFitWebUrl =
      "https://play.google.com/store/apps/details?id=com.google.android.apps.fitness";

    try {
      const canOpen = await Linking.canOpenURL(googleFitUrl);
      if (canOpen) {
        await Linking.openURL(googleFitUrl);
      } else {
        await Linking.openURL(googleFitWebUrl);
      }

      // Store timestamp when user clicks install Google Fit
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem("googleFitInstallTimestamp", timestamp);
    } catch (error) {}
  }, []);

  // 6️⃣ Fetch 7-day step data
  const fetchWeeklySteps = useCallback(async () => {
    if (!HealthConnect || !hasPermission) return;

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const result = await HealthConnect.readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: sevenDaysAgo.toISOString(),
          endTime: now.toISOString(),
        },
      });

      // Group by dataOrigin
      const recordsByApp = {};
      result?.records?.forEach((record) => {
        const app = record.metadata?.dataOrigin || "unknown";
        if (!recordsByApp[app]) {
          recordsByApp[app] = { count: 0, steps: 0 };
        }
        recordsByApp[app].count += 1;
        recordsByApp[app].steps += record.count || 0;
      });

      // Check if we have multiple data sources
      const uniqueApps = Object.keys(recordsByApp);
      let recordsToUse = result?.records || [];

      if (uniqueApps.length > 1) {
        // Merge overlapping records from different apps
        const mergedRecords = [];
        const processedIndices = new Set();

        for (let i = 0; i < recordsToUse.length; i++) {
          if (processedIndices.has(i)) continue;

          const currentRecord = recordsToUse[i];
          const currentApp = currentRecord.metadata?.dataOrigin;
          let maxCount = currentRecord.count || 0;

          for (let j = i + 1; j < recordsToUse.length; j++) {
            if (processedIndices.has(j)) continue;

            const otherRecord = recordsToUse[j];
            const otherApp = otherRecord.metadata?.dataOrigin;

            if (currentApp === otherApp) continue;

            const r1Start = new Date(currentRecord.startTime).getTime();
            const r1End = new Date(currentRecord.endTime).getTime();
            const r2Start = new Date(otherRecord.startTime).getTime();
            const r2End = new Date(otherRecord.endTime).getTime();

            if (r1Start < r2End + 1000 && r2Start < r1End + 1000) {
              maxCount = Math.max(maxCount, otherRecord.count || 0);
              processedIndices.add(j);
            }
          }

          mergedRecords.push({ ...currentRecord, count: maxCount });
          processedIndices.add(i);
        }

        recordsToUse = mergedRecords;
      }

      // Group by day
      const daySteps = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(sevenDaysAgo.getDate() + i);
        const dateKey = date.toDateString();
        daySteps[dateKey] = 0;
      }

      if (recordsToUse) {
        recordsToUse.forEach((record) => {
          const recordDate = new Date(record.startTime);
          const dateKey = recordDate.toDateString();
          if (daySteps[dateKey] !== undefined) {
            daySteps[dateKey] += record.count || 0;
          }
        });
      }

      const stepsArray = Object.values(daySteps);
      setWeeklyStepsData(stepsArray || []);
    } catch (error) {
      console.error("Error fetching weekly steps:", error);
      setWeeklyStepsData([]); // Set empty array on error
    }
  }, [hasPermission]);

  // 7️⃣ Fetch hourly step data
  const fetchHourlySteps = useCallback(async () => {
    if (!HealthConnect || !hasPermission) return;

    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const result = await HealthConnect.readRecords("Steps", {
        timeRangeFilter: {
          operator: "between",
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      });

      // Group by dataOrigin
      const recordsByApp = {};
      result?.records?.forEach((record) => {
        const app = record.metadata?.dataOrigin || "unknown";
        if (!recordsByApp[app]) {
          recordsByApp[app] = { count: 0, steps: 0 };
        }
        recordsByApp[app].count += 1;
        recordsByApp[app].steps += record.count || 0;
      });

      // Check if we have multiple data sources
      const uniqueApps = Object.keys(recordsByApp);
      let recordsToUse = result?.records || [];

      if (uniqueApps.length > 1) {
        // Merge overlapping records from different apps
        const mergedRecords = [];
        const processedIndices = new Set();

        for (let i = 0; i < recordsToUse.length; i++) {
          if (processedIndices.has(i)) continue;

          const currentRecord = recordsToUse[i];
          const currentApp = currentRecord.metadata?.dataOrigin;
          let maxCount = currentRecord.count || 0;

          for (let j = i + 1; j < recordsToUse.length; j++) {
            if (processedIndices.has(j)) continue;

            const otherRecord = recordsToUse[j];
            const otherApp = otherRecord.metadata?.dataOrigin;

            if (currentApp === otherApp) continue;

            const r1Start = new Date(currentRecord.startTime).getTime();
            const r1End = new Date(currentRecord.endTime).getTime();
            const r2Start = new Date(otherRecord.startTime).getTime();
            const r2End = new Date(otherRecord.endTime).getTime();

            if (r1Start < r2End + 1000 && r2Start < r1End + 1000) {
              maxCount = Math.max(maxCount, otherRecord.count || 0);
              processedIndices.add(j);
            }
          }

          mergedRecords.push({ ...currentRecord, count: maxCount });
          processedIndices.add(i);
        }

        recordsToUse = mergedRecords;
      }

      // Group by hour (0-23)
      const hourSteps = Array(24).fill(0);

      if (recordsToUse) {
        recordsToUse.forEach((record) => {
          const recordDate = new Date(record.startTime);
          const hour = recordDate.getHours();
          hourSteps[hour] += record.count || 0;
        });
      }

      setHourlyStepsData(hourSteps || Array(24).fill(0));
    } catch (error) {
      console.error("Error fetching hourly steps:", error);
      setHourlyStepsData(Array(24).fill(0)); // Set empty array on error
    }
  }, [hasPermission]);

  // 8️⃣ Auto-run flows
  useEffect(() => {
    if (!HealthConnect) {
      setIsCheckingPermission(false);
      return;
    }
    initHC();
  }, [initHC]);

  useEffect(() => {
    if (initialized && isAvailable) {
      checkPermission().finally(() => setIsCheckingPermission(false));
    } else if (initialized && !isAvailable) {
      setIsCheckingPermission(false);
    }
  }, [initialized, isAvailable, checkPermission]);

  useEffect(() => {
    if (hasPermission) {
      fetchTodaySteps();
      fetchWeeklySteps();
      fetchHourlySteps();
    }
  }, [hasPermission, fetchTodaySteps, fetchWeeklySteps, fetchHourlySteps]);

  return {
    isAvailable,
    initialized,
    hasPermission,
    stepsData,
    isLoading,
    isCheckingPermission,
    needsDataSource,
    weeklyStepsData,
    hourlyStepsData,
    setupHealthConnect,
    checkPermission,
    fetchTodaySteps,
    fetchWeeklySteps,
    fetchHourlySteps,
    initHC,
    openGoogleFit,
  };
};

export default useHealthConnect;
