const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const { resolve } = require('path');
const fs = require('fs');

const withRazorpay = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = resolve(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if razorpay-pod is already added
        if (!podfileContent.includes("pod 'razorpay-pod'")) {
          // Add razorpay-pod after the use_expo_modules! line
          podfileContent = podfileContent.replace(
            /use_expo_modules!/,
            "use_expo_modules!\n  pod 'razorpay-pod'"
          );

          fs.writeFileSync(podfilePath, podfileContent);
        }
      }

      return config;
    },
  ]);
};

module.exports = withRazorpay;