import React, { useRef, useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Text,
  TouchableOpacity,
} from 'react-native';

const OTPInput3 = React.forwardRef(({ onComplete, onResendOTP }, ref) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);
  const [timer, setTimer] = useState(30);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const [showTimer, setShowTimer] = useState(true);

  useEffect(() => {
    const timerInterval = startTimer();
    return () => clearInterval(timerInterval);
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

    return interval;
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
      inputRefs.current[index + 1]?.focus();
    }

    const otpString = newOtp.join('');
    if (otpString.length === 6) {
      onComplete?.(otpString);
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e, index) => {
    // Fix: Check if e and e.nativeEvent exist before accessing e.nativeEvent.key
    if (!e || !e.nativeEvent) return;

    if (e.nativeEvent.key === 'Backspace') {
      const newOtp = [...otp];

      if (index > 0 && otp[index] === '') {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      } else if (otp[index] !== '') {
        newOtp[index] = '';
        setOtp(newOtp);
      }

      if (newOtp.every((digit) => digit === '')) {
        onComplete?.(null);
      } else {
        const currentOtp = newOtp.join('');
        onComplete?.(currentOtp.length === 6 ? currentOtp : null);
      }
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      setOtp: (newOtp) => {
        if (!Array.isArray(newOtp) || newOtp.length !== 6) {
          console.error('Invalid OTP format. Expected array of length 6.');
          return;
        }

        setOtp(newOtp);
        const otpString = newOtp.join('');
        if (otpString.length === 6) {
          onComplete?.(otpString);
        }
      },
      clearOtp: () => {
        setOtp(['', '', '', '', '', '']);
        onComplete?.(null);
      },
      focusFirstInput: () => {
        inputRefs.current[0]?.focus();
      },
    }),
    [onComplete]
  );

  return (
    <View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {otp.map((digit, index) => (
            <TextInput
              key={`otp-input-${index}`}
              ref={(el) => (inputRefs.current[index] = el)}
              style={styles.input}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              selectionColor="#FF5757"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
            />
          ))}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.resendContainer}>
        {showTimer ? (
          <Text style={styles.timerText}>
            Resend OTP in {String(timer).padStart(2, '0')}s
          </Text>
        ) : (
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOTP}
            disabled={!canResend}
          >
            <Text
              style={[
                styles.resendText,
                !canResend && styles.resendTextDisabled,
              ]}
            >
              Resend OTP
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: 45,
    height: 45,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    marginHorizontal: 5,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
  },
  resendContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  timerText: {
    color: '#666',
    fontSize: 14,
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    color: '#FF5757',
    fontSize: 14,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: '#fff',
  },
});

OTPInput3.displayName = 'OTPInput3';

export default OTPInput3;
