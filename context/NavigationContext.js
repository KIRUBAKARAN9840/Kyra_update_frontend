// NavigationContext.js
import React, { createContext, useState, useContext } from "react";

// Create a context for navigation controls
const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isSideNavVisible, setIsSideNavVisible] = useState(false);

  // Function to toggle side navigation visibility
  const toggleSideNav = () => {
    setIsSideNavVisible(!isSideNavVisible);
  };

  // Function to close side navigation
  const closeSideNav = () => {
    setIsSideNavVisible(false);
  };

  // Values to be provided to consumers
  const navigationContextValue = {
    isSideNavVisible,
    toggleSideNav,
    closeSideNav,
  };

  return (
    <NavigationContext.Provider value={navigationContextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

// Custom hook to use the navigation context
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export default NavigationContext;
