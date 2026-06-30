const {
  withMainActivity,
  withAndroidManifest,
} = require("@expo/config-plugins");

const withHealthConnect = (config) => {
  // Patch MainActivity.kt (Expo-managed projects use Kotlin)
  config = withMainActivity(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    const isKotlin = modResults.path?.endsWith(".kt");
    if (!isKotlin) return config; // nothing to do for Java files (rare in Expo)

    // Correct import and call according to react-native-health-connect v3.x
    const delegateImport =
      "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate";
    const bundleImport = "import android.os.Bundle";
    // v3 uses setPermissionDelegate(this)
    const delegateCall =
      "HealthConnectPermissionDelegate.setPermissionDelegate(this)";

    // --- Insert imports only if missing (avoid duplicates / ambiguity)
    // Insert delegate import if not present
    if (!contents.includes("HealthConnectPermissionDelegate")) {
      contents = contents.replace(
        /(package\s+[^\n]+\n)/,
        `$1${delegateImport}\n`
      );
    }

    // Insert Bundle import only if missing
    if (!contents.includes(bundleImport)) {
      contents = contents.replace(
        /(package\s+[^\n]+\n)/,
        `$1${bundleImport}\n`
      );
    }

    // --- Avoid double-injecting the delegate call ---
    if (!contents.includes(delegateCall)) {
      // If onCreate exists, insert right after super.onCreate(...)
      if (contents.includes("override fun onCreate(")) {
        contents = contents.replace(
          /(super\.onCreate\(.*?\))/,
          `$1\n        ${delegateCall}`
        );
      }
      // Otherwise create an onCreate
      else {
        contents = contents.replace(
          /(class\s+MainActivity[^{]*\{)/,
          `$1
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ${delegateCall}
    }
`
        );
      }
    }

    modResults.contents = contents;
    return config;
  });

  // Patch AndroidManifest.xml: add queries and intent-filter if missing
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [];

    const hcQuery = {
      package: [
        { $: { "android:name": "com.google.android.apps.healthdata" } },
      ],
    };

    const exists = manifest.queries.some(
      (q) =>
        q.package?.[0]?.$["android:name"] ===
        "com.google.android.apps.healthdata"
    );

    if (!exists) manifest.queries.push(hcQuery);

    const app = manifest.application?.[0];
    if (app?.activity) {
      const main = app.activity.find((act) =>
        act["intent-filter"]?.some((f) =>
          f.action?.some(
            (a) => a.$["android:name"] === "android.intent.action.MAIN"
          )
        )
      );

      const actionName = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";

      if (main) {
        const existsIntent = main["intent-filter"]?.some((f) =>
          f.action?.some((a) => a.$["android:name"] === actionName)
        );

        if (!existsIntent) {
          main["intent-filter"].push({
            action: [{ $: { "android:name": actionName } }],
          });
        }
      }
    }

    return config;
  });

  return config;
};

module.exports = withHealthConnect;
