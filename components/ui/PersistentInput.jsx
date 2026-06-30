import React from 'react';
import { TextInput, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PersistentInput = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  showPassword,
  onTogglePassword,
  onSubmitEditing,
  inputRef,
  error,
  returnKeyType = 'next',
  blurOnSubmit = false,
}) => {
  return (
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      <Ionicons
        name="lock-closed-outline"
        size={20}
        color="#888888"
        style={styles.inputIcon}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#AAAAAA"
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        blurOnSubmit={blurOnSubmit}
        enablesReturnKeyAutomatically
      />
      {showPassword !== undefined && (
        <TouchableOpacity
          style={styles.eyeIconContainer}
          onPress={onTogglePassword}
        >
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="#888888"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  inputError: {
    borderColor: '#FF0000',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIconContainer: {
    padding: 8,
  },
});

export default PersistentInput;
