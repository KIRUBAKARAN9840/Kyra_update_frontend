import { useRef } from "react";
import { useRouter } from "expo-router";

/**
 * Returns a `navigate` function that wraps router.push with a 1-second guard
 * so double-taps cannot open the same screen twice.
 */
export function useSafeNav() {
  const router = useRouter();
  const navigating = useRef(false);

  const navigate = (href, params) => {
    if (navigating.current) return;
    navigating.current = true;
    if (params !== undefined) {
      router.push({ pathname: href, params });
    } else {
      router.push(href);
    }
    setTimeout(() => { navigating.current = false; }, 1000);
  };

  return navigate;
}
