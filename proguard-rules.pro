# Razorpay ProGuard rules
-keep class com.razorpay.** { *; }
-keep class com.razorpay.RazorpayPlugin** { *; }
-keep interface com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Keep React Native bridge classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep JSON classes that might be used by Razorpay
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep classes with native methods
-keepclasseswithmembernames class * {
    native <methods>;
}