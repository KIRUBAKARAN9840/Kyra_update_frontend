export default ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      package: "com.fittbot.fittbot_client",
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.VIBRATE",
        "com.android.vending.BILLING",
        "android.permission.health.READ_STEPS",
        "com.google.android.gms.permission.AD_ID"
      ],
      blockedPermissions: [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.READ_EXTERNAL_STORAGE",
      ],
    },
    extra: {
      ...config.extra,
      // backendUrl: "https://1c01-27-7-26-99.ngrok-free.app",
      backendUrl: "https://erminia-mirthful-nonpatriotically.ngrok-free.dev",
      // backendUrl: "https://app.fittbot.com",
      // backendUrl: "https://staging.fittbot.com",
      // backendUrl: "http://192.168.1.7",
      backendPort: "8000",
      eas: {
        projectId: "d83115b4-2dd1-43c9-af11-da8dc85a5966",
      },
    },
  };
};
