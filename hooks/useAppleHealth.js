import { useState, useCallback, useEffect } from "react";
import { Platform, NativeModules } from "react-native";
import AppleHealthKit from "react-native-health";

const RCTAppleHealthKit = NativeModules.RCTAppleHealthKit;

const PERMISSIONS = AppleHealthKit.Constants?.Permissions ?? {
  Steps: "Steps",
};

const permissions = {
  permissions: {
    read: [PERMISSIONS.Steps],
    write: [],
  },
};

export default function useAppleHealth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  const [stepsToday, setStepsToday] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const ensureHealthKitAvailable = useCallback(() => {
    if (Platform.OS !== "ios") return false;
    if (!RCTAppleHealthKit) return false;
    setIsAvailable(true);
    return true;
  }, []);

  const fetchTodaySteps = useCallback(() => {
    if (!ensureHealthKitAvailable()) return;
    if (!hasPermission) return;

    setIsLoading(true);

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0
    );

    RCTAppleHealthKit.getStepCount(
      { startDate: startOfDay.toISOString(), endDate: now.toISOString() },
      (err, result) => {
        setIsLoading(false);
        if (err) { setError(err); return; }
        setStepsToday(result?.value || 0);
      }
    );
  }, [hasPermission, ensureHealthKitAvailable]);

  /** Check live permission from HealthKit — no AsyncStorage, so revocation is detected */
  const checkPermissionStatus = useCallback(() => {
    if (!ensureHealthKitAvailable()) {
      setIsCheckingPermission(false);
      return;
    }

    RCTAppleHealthKit.getAuthStatus(permissions, (err, results) => {
      if (err) {
        // getAuthStatus failed — treat as not granted
        setHasPermission(false);
        setInitialized(false);
        setIsCheckingPermission(false);
        return;
      }

      const allGranted = permissions.permissions.read.every(
        (perm) => results[perm] === 2 || results[perm] === true
      );

      setHasPermission(allGranted);
      setInitialized(allGranted);
      setIsCheckingPermission(false);
    });
  }, [ensureHealthKitAvailable]);

  /** Request permission via initHealthKit */
  const setupAppleHealth = useCallback(async () => {
    if (!ensureHealthKitAvailable()) return false;

    setIsLoading(true);

    return new Promise((resolve) => {
      RCTAppleHealthKit.initHealthKit(permissions, (err) => {
        setIsLoading(false);

        if (err) {
          setHasPermission(false);
          setInitialized(false);
          resolve(false);
          return;
        }

        setHasPermission(true);
        setInitialized(true);
        fetchTodaySteps();
        resolve(true);
      });
    });
  }, [ensureHealthKitAvailable, fetchTodaySteps]);

  /** On mount: check live permission status from HealthKit */
  useEffect(() => {
    if (Platform.OS === "ios") {
      ensureHealthKitAvailable();
      checkPermissionStatus();
    } else {
      setIsCheckingPermission(false);
    }
  }, [ensureHealthKitAvailable, checkPermissionStatus]);

  /** Fetch steps once permission is confirmed */
  useEffect(() => {
    if (hasPermission) fetchTodaySteps();
  }, [hasPermission, fetchTodaySteps]);

  return {
    isAvailable,
    hasPermission,
    initialized,
    stepsToday,
    isLoading,
    isCheckingPermission,
    error,
    setupAppleHealth,
    fetchTodaySteps,
  };
}
