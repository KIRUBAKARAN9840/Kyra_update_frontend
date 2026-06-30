import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from "react-native";

const OTPInput = ({ onComplete, onResendOTP, resend = true }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(30);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const [showTimer, setShowTimer] = useState(true);

  useEffect(() => {
    startTimer();
  }, []);

  const startTimer = () => {
    setShowTimer(true);
    setCanResend(false);
    setTimer(30);

    const interval = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          clearInterval(interval);
          setShowTimer(false);
          setCanResend(attemptsLeft > 0);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  };

  const handleResendOTP = () => {
    if (attemptsLeft > 0) {
      setAttemptsLeft((prev) => prev - 1);
      startTimer();
      onResendOTP?.();
    }
  };

  const handleChange = (text, index) => {
    if (!/^[0-9]*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    const otpString = newOtp.join("");
    if (otpString.length === 6) {
      onComplete(otpString);
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace") {
      const newOtp = [...otp];

      if (index > 0 && otp[index] === "") {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      } else if (otp[index] !== "") {
        newOtp[index] = "";
        setOtp(newOtp);
      }

      if (newOtp.every((digit) => digit === "")) {
        onComplete(null);
      } else {
        const currentOtp = newOtp.join("");
        onComplete(currentOtp.length === 6 ? currentOtp : null);
      }
    }
  };

  return (
    <View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.input, !resend && { color: "#000" }]}
              maxLength={1}
              keyboardType="numeric"
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(event) => handleKeyPress(event, index)}
              autoComplete="off"
              selectionColor="#007AFF"
            />
          ))}
        </View>
      </TouchableWithoutFeedback>
      {resend && (
        <View style={styles.resendContainer}>
          {showTimer ? (
            <Text style={styles.timerText}>Resend code in {timer}s</Text>
          ) : (
            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend}
              style={styles.resendButton}
            >
              <Text
                style={[
                  styles.resendText,
                  !canResend && styles.resendTextDisabled,
                ]}
              >
                Resend Code
                {/* {attemptsLeft > 0 ? `(${attemptsLeft} attempts left)` : '(No attempts left)'} */}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  input: {
    width: 45,
    height: 45,
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    marginHorizontal: 5,
    textAlign: "center",
    fontSize: 20,
    color: "#000",
    // backgroundColor: '#fff',
    marginTop: 10,
  },
  resendContainer: {
    alignItems: "flex-end",
    marginBottom: 10,
  },
  timerText: {
    color: "#666",
    fontSize: 14,
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    color: "#FF5757",
    fontSize: 14,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: "#fff",
  },
});

export default OTPInput;
