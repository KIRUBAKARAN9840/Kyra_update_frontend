import { createContext, useContext, useRef } from "react";
import { Animated } from "react-native";

const TabScrollContext = createContext(null);

export function TabScrollProvider({ children }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  return (
    <TabScrollContext.Provider value={scrollY}>
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll() {
  return useContext(TabScrollContext);
}
