export const PLAN_TYPES = {
  FREEMIUM: "freemium",
  PREMIUM_WITH_GYM: "premium_with_gym",
  PREMIUM_WITHOUT_GYM: "premium_without_gym",
};

export const PLAN_FEATURES = {
  [PLAN_TYPES.FREEMIUM]: {
    maxWorkouts: 3,
    maxDietEntries: 5,
    hasGymAccess: false,
    hasPersonalTrainer: false,
    hasAnalytics: false,
    tabs: ["home", "feed", "workout", "diet", "marketplace"],
    homeTabsVisible: ["My Progress", "Water", "Analysis"],
    features: [
      "basic_tracking",
      "water_tracker",
      "basic_analysis",
      "marketplace",
    ],
  },
  [PLAN_TYPES.PREMIUM_WITH_GYM]: {
    maxWorkouts: -1, // unlimited
    maxDietEntries: -1,
    hasGymAccess: true,
    hasPersonalTrainer: true,
    hasAnalytics: true,
    tabs: ["home", "feed", "workout", "diet", "marketplace"],
    homeTabsVisible: [
      "My Progress",
      "My Gym",
      "Fitness Studios",
      "Gym Buddy",
      "Water",
      "Reminders",
      "Analysis",
      "Leaderboard",
      "My Rewards",
    ],
    features: [
      "unlimited_tracking",
      "gym_access",
      "personal_trainer",
      "advanced_analytics",
      "leaderboard",
      "rewards",
      "gym_buddy",
      "reminders",
      "marketplace",
    ],
  },
  [PLAN_TYPES.PREMIUM_WITHOUT_GYM]: {
    maxWorkouts: -1,
    maxDietEntries: -1,
    hasGymAccess: false,
    hasPersonalTrainer: false,
    hasAnalytics: true,
    tabs: ["home", "feed", "workout", "diet", "marketplace"],
    homeTabsVisible: [
      "My Progress",
      "Water",
      "Reminders",
      "Analysis",
      "My Rewards",
    ],
    features: [
      "unlimited_tracking",
      "advanced_analytics",
      "rewards",
      "reminders",
      "marketplace",
    ],
  },
};

// Helper function to check if user has a specific feature
export const hasFeature = (planType, feature) => {
  return PLAN_FEATURES[planType]?.features?.includes(feature) ?? false;
};

// Helper function to get visible home tabs for a plan
export const getVisibleHomeTabs = (planType) => {
  return PLAN_FEATURES[planType]?.homeTabsVisible ?? [];
};

// Helper function to get available tabs for a plan
export const getAvailableTabs = (planType) => {
  return PLAN_FEATURES[planType]?.tabs ?? [];
};

// Helper function to check plan limits
export const getPlanLimits = (planType) => {
  const plan = PLAN_FEATURES[planType];
  return {
    maxWorkouts: plan?.maxWorkouts ?? 0,
    maxDietEntries: plan?.maxDietEntries ?? 0,
    hasGymAccess: plan?.hasGymAccess ?? false,
    hasPersonalTrainer: plan?.hasPersonalTrainer ?? false,
    hasAnalytics: plan?.hasAnalytics ?? false,
  };
};
