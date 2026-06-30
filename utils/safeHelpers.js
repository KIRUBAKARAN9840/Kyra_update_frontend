/**
 * Safe helper functions to prevent crashes from parsing and type conversion errors
 */

/**
 * Safely parse JSON with fallback value
 * @param {string} jsonString - The JSON string to parse
 * @param {*} fallback - The fallback value if parsing fails (default: null)
 * @returns {*} Parsed JSON or fallback value
 */
export const safeParseJSON = (jsonString, fallback = null) => {
  try {
    if (!jsonString || jsonString === 'undefined' || jsonString === 'null') {
      return fallback;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return fallback;
  }
};

/**
 * Safely parse integer with NaN check
 * @param {*} value - The value to parse
 * @param {number} fallback - The fallback value if parsing fails (default: 0)
 * @returns {number} Parsed integer or fallback value
 */
export const safeParseInt = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely parse float with NaN check
 * @param {*} value - The value to parse
 * @param {number} fallback - The fallback value if parsing fails (default: 0)
 * @returns {number} Parsed float or fallback value
 */
export const safeParseFloat = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely get value from AsyncStorage with error handling
 * @param {string} key - The AsyncStorage key
 * @param {*} fallback - The fallback value if retrieval fails (default: null)
 * @returns {Promise<*>} Retrieved value or fallback
 */
export const safeGetAsyncStorage = async (key, fallback = null) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const value = await AsyncStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    console.warn(`AsyncStorage get error for key "${key}":`, error.message);
    return fallback;
  }
};

/**
 * Safely set value to AsyncStorage with error handling
 * @param {string} key - The AsyncStorage key
 * @param {string} value - The value to store
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export const safeSetAsyncStorage = async (key, value) => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`AsyncStorage set error for key "${key}":`, error.message);
    return false;
  }
};

/**
 * Ensure value is an array
 * @param {*} value - The value to check
 * @param {Array} fallback - The fallback array (default: [])
 * @returns {Array} The value if it's an array, otherwise fallback array
 */
export const ensureArray = (value, fallback = []) => {
  return Array.isArray(value) ? value : fallback;
};

/**
 * Safely map over an array
 * @param {*} arr - The array to map
 * @param {Function} callback - The mapping function
 * @returns {Array} Mapped array or empty array
 */
export const safeMap = (arr, callback) => {
  return ensureArray(arr).map(callback);
};

/**
 * Safely filter an array
 * @param {*} arr - The array to filter
 * @param {Function} callback - The filter function
 * @returns {Array} Filtered array or empty array
 */
export const safeFilter = (arr, callback) => {
  return ensureArray(arr).filter(callback);
};

/**
 * Safely access nested object properties
 * @param {Object} obj - The object to access
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
 * @param {*} fallback - The fallback value if path doesn't exist
 * @returns {*} The value at path or fallback
 */
export const safeGet = (obj, path, fallback = undefined) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) {
        return fallback;
      }
      result = result[key];
    }
    return result !== undefined ? result : fallback;
  } catch (error) {
    return fallback;
  }
};
