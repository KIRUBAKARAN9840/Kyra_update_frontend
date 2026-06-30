import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Keyboard,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from "react-native-confirmation-code-field";

const CELL_COUNT = 6;
const { width } = Dimensions.get("window");

const OTPInput = ({ onComplete, onResendOTP, clearOTP }) => {
  const [value, setValue] = useState("");
  const [timer, setTimer] = useState(30);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);

  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  // Clear OTP input when verification fails
  useEffect(() => {
    if (clearOTP) {
      setValue("");
      if (ref && ref.current) {
        ref.current.focus();
      }
    }
  }, [clearOTP]);

  // Handle OTP change and auto-verification
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (value.length === CELL_COUNT) {
      onCompleteRef.current(value);
      Keyboard.dismiss();
    } else {
      onCompleteRef.current(null);
    }
  }, [value]);

  // Auto-focus on first render to show keyboard
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (ref && ref.current) {
        ref.current.focus();
        setIsAutoDetecting(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  // Timer for resend functionality
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(timerInterval);
          setShowTimer(false);
          setCanResend(attemptsLeft > 0);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [attemptsLeft]);

  const handleResendOTP = () => {
    if (attemptsLeft > 0) {
      setAttemptsLeft((prev) => prev - 1);
      setShowTimer(true);
      setTimer(30);
      setValue("");

      // Set auto-detect message
      setIsAutoDetecting(true);
      setTimeout(() => {
        setIsAutoDetecting(false);
      }, 5000);

      // Focus input again
      if (ref && ref.current) {
        ref.current.focus();
      }

      // Call parent resend function
      onResendOTP?.();
    }
  };

  return (
    <View>
      {isAutoDetecting && (
        <Text style={styles.autoDetectText}>
          Automatically detecting OTP...
        </Text>
      )}

      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode" // iOS OTP suggestion
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"} // Android/iOS OTP auto-fill
        renderCell={({ index, symbol, isFocused }) => (
          <View
            key={index}
            style={[
              styles.cellContainer,
              isFocused && styles.focusedCellContainer,
            ]}
            onLayout={getCellOnLayoutHandler(index)}
          >
            <Text style={[styles.cellText, symbol && styles.filledCellText]}>
              {symbol || (isFocused ? <Cursor /> : null)}
            </Text>
          </View>
        )}
      />

      <View style={styles.resendContainer}>
        {showTimer ? (
          <Text style={styles.timerText}>Resend code in {timer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleResendOTP} disabled={!canResend}>
            <Text style={{ color: "#888" }}>
              Didn't received the code{" "}
              <Text
                style={[
                  styles.resendText,
                  !canResend && styles.resendTextDisabled,
                ]}
              >
                Resend OTP
              </Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  codeFieldRoot: {
    marginVertical: 30,
    width: "100%",
    // paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  cellContainer: {
    width: 40,
    height: 50,
    borderBottomWidth: 2,
    borderBottomColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  focusedCellContainer: {
    borderBottomColor: "#FF5757",
  },
  cellText: {
    fontSize: 24,
    color: "#FF5757",
    textAlign: "center",
  },
  filledCellText: {
    color: "#FF5757",
    fontWeight: "600",
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  timerText: {
    color: "#888",
    fontSize: 14,
  },
  resendText: {
    color: "#FF5757",
    fontSize: 14,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: "#666",
  },
  autoDetectText: {
    color: "#FF5757",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
});

export default OTPInput;
