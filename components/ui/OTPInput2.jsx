import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';

const OTPInput2 = ({ onComplete, onResendOTP }) => {
  // State for the 6-digit OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  // References to each TextInput
  const inputRefs = useRef([]);
  // Timer states
  const [timer, setTimer] = useState(30);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [canResend, setCanResend] = useState(false);
  const [showTimer, setShowTimer] = useState(true);

  // Single hidden input for web platforms to handle paste
  const [pasteInput, setPasteInput] = useState('');
  const pasteInputRef = useRef(null);

  // Timer effect
  useEffect(() => {
    let intervalId;

    const startTimer = () => {
      setShowTimer(true);
      setCanResend(false);
      setTimer(30);

      intervalId = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            clearInterval(intervalId);
            setShowTimer(false);
            setCanResend(attemptsLeft > 0);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    };

    startTimer();

    // Cleanup interval on component unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [attemptsLeft]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, []);

  // Handle paste input changes for web
  useEffect(() => {
    if (pasteInput.length > 0) {
      // Process pasted value
      const pastedCode = pasteInput.replace(/\D/g, '').slice(0, 6);

      if (pastedCode.length > 0) {
        const newOtp = [...otp];

        for (let i = 0; i < 6; i++) {
          newOtp[i] = i < pastedCode.length ? pastedCode[i] : '';
        }

        setOtp(newOtp);

        // Focus the appropriate input
        const lastIndex = Math.min(pastedCode.length - 1, 5);
        setTimeout(() => {
          if (pastedCode.length < 6) {
            inputRefs.current[pastedCode.length]?.focus();
          } else {
            inputRefs.current[5]?.focus();
          }
        }, 0);

        // Check OTP completion
        if (pastedCode.length === 6) {
          onComplete(pastedCode);
        } else {
          onComplete(null);
        }
      }

      // Clear paste input for next paste
      setPasteInput('');
    }
  }, [pasteInput]);

  const handleResendOTP = () => {
    if (attemptsLeft > 0) {
      setAttemptsLeft((prev) => prev - 1);
      onResendOTP?.();
    }
  };

  // Handle input change for individual digits
  const handleChange = (text, index) => {
    // Only accept numeric input
    if (text && !/^[0-9]$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input if current was filled
    if (text && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    }

    // Check if OTP is complete
    const otpString = newOtp.join('');
    onComplete(otpString.length === 6 ? otpString : null);
  };

  // Handle backspace and arrow keys
  const handleKeyPress = (event, index) => {
    // Handle backspace
    if (event.nativeEvent.key === 'Backspace') {
      const newOtp = [...otp];

      // If current input is empty and not the first one, move to previous
      if (otp[index] === '' && index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);

        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 0);
      }
      // If current input has value, clear it
      else if (otp[index] !== '') {
        newOtp[index] = '';
        setOtp(newOtp);
      }

      // Update OTP completion status
      const currentOtp = newOtp.join('');
      onComplete(currentOtp.length === 6 ? currentOtp : null);
    }
    // Handle arrow keys for desktop
    else if (event.nativeEvent.key === 'ArrowRight' && index < 5) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 0);
    } else if (event.nativeEvent.key === 'ArrowLeft' && index > 0) {
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 0);
    }
  };

  // Handle container click to focus on appropriate input
  const handleContainerClick = () => {
    // Find first empty input
    const firstEmptyIndex = otp.findIndex((digit) => digit === '');

    if (firstEmptyIndex !== -1) {
      inputRefs.current[firstEmptyIndex]?.focus();
    } else {
      // If all filled, focus on last input
      inputRefs.current[5]?.focus();
    }

    // For web platforms, also focus hidden paste input
    if (Platform.OS === 'web') {
      pasteInputRef.current?.focus();
    }
  };

  // Handle paste for web platforms
  const handlePaste = (pastedText) => {
    setPasteInput(pastedText);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.inputContainer}
        onPress={handleContainerClick}
      >
        {/* Hidden input for paste on web platforms */}
        {Platform.OS === 'web' && (
          <TextInput
            ref={pasteInputRef}
            style={styles.hiddenInput}
            value={pasteInput}
            onChangeText={handlePaste}
            keyboardType="numeric"
          />
        )}

        {/* Visible OTP inputs */}
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            style={styles.input}
            maxLength={1}
            keyboardType="numeric"
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            textAlign="center"
            selectionColor="#007AFF"
          />
        ))}
      </TouchableOpacity>

      {/* <View style={styles.resendContainer}>
        {showTimer ? (
          <Text style={styles.timerText}>Resend code in {timer}s</Text>
        ) : (
          <TouchableOpacity 
            onPress={handleResendOTP}
            disabled={!canResend || attemptsLeft === 0}
          >
            <Text style={[
              styles.resendText,
              (!canResend || attemptsLeft === 0) && styles.disabledResendText
            ]}>
              Resend Code {attemptsLeft > 0 ? `(${attemptsLeft} left)` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View> */}

      <View style={styles.resendContainer}>
        {/* {showTimer ? ( */}
          <Text style={styles.timerText}>Enter the OTP to verify yourself.</Text>
        {/* ) : (
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={!canResend || attemptsLeft === 0}
          >
            <Text
              style={[
                styles.resendText,
                (!canResend || attemptsLeft === 0) && styles.disabledResendText,
              ]}
            >
              Resend Code {attemptsLeft > 0 ? `(${attemptsLeft} left)` : ''}
            </Text>
          </TouchableOpacity>
        )} */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  input: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginHorizontal: 5,
    fontSize: 20,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
  },
  timerText: {
    color: '#666',
    fontSize: 14,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledResendText: {
    color: '#999',
  },
});

export default OTPInput2;
