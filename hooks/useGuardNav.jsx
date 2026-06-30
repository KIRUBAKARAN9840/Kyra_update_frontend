import { useRef, useCallback } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Prevents double-tap / multiple navigation.
 * Returns a `guardNav` wrapper — call it with a callback that performs navigation.
 * The guard resets automatically when the screen regains focus.
 */
export default function useGuardNav() {
  const navigatingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigatingRef.current = false;
    }, []),
  );

  const guardNav = useCallback((action) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    action();
  }, []);

  return guardNav;
}
