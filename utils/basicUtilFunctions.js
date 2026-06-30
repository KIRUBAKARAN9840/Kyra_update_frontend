export const capitalizer = (str) => {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Python-style banker's rounding (round half to even)
// This matches Python's round() behavior for consistent pricing calculations
export const pythonRound = (num) => {
  const floor = Math.floor(num);
  const decimal = num - floor;
  // Check if exactly .5 (with small epsilon for floating point)
  if (Math.abs(decimal - 0.5) < 0.0001) {
    // Round to nearest even number
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(num);
};

// Convert date to Indian Standard Time (IST) in ISO format
export const toIndianISOString = (date) => {
  // Get the time in IST by adjusting the UTC time
  // IST is UTC+5:30
  const utcTime = date.getTime();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istTime = new Date(utcTime + istOffset);

  // Get ISO string and adjust for IST offset
  const isoString = istTime.toISOString();
  return isoString;
};
