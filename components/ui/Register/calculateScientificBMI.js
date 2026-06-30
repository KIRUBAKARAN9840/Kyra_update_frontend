/**
 * Advanced BMI Calculation Utility
 * Implements scientific methods for BMI calculation considering multiple factors
 */
export const calculateScientificBMI = (params) => {
  const {
    weight, // in kg
    height, // can be in cm, feet, or inches
    heightUnit, // 'Centimeter', 'Feet', or 'Inch'
    age,
    gender,
  } = params;

  // Convert height to centimeters if not already
  const heightInCm =
    heightUnit === 'Centimeter'
      ? height
      : heightUnit === 'Feet'
      ? height * 30.48
      : heightUnit === 'Inch'
      ? height * 2.54
      : height;

  // Basic BMI calculation
  const bmi = weight / Math.pow(heightInCm / 100, 2);

  // Age and gender-specific adjustments
  const calculateAgeWeightedBMI = () => {
    // Scientific considerations for BMI interpretation
    if (age < 20) {
      // For children and teens, use age and gender-specific percentiles
      // This is a simplified approximation
      return bmi * (1 + (20 - age) * 0.01);
    }

    if (age > 65) {
      // Older adults may have different BMI interpretations
      return bmi * (1 - (age - 65) * 0.005);
    }

    return bmi;
  };

  const adjustedBMI = calculateAgeWeightedBMI();

  // Detailed BMI classification
  const getBMICategory = (calculatedBMI) => {
    if (calculatedBMI < 16) return 'Severely Underweight';
    if (calculatedBMI < 18.5) return 'Underweight';
    if (calculatedBMI < 25) return 'Normal Weight';
    if (calculatedBMI < 30) return 'Overweight';
    if (calculatedBMI < 35) return 'Obese Class I';
    if (calculatedBMI < 40) return 'Obese Class II';
    return 'Obese Class III';
  };

  // Gender-specific muscle mass considerations
  const getBodyCompositionAdjustment = () => {
    // More muscle mass can affect BMI interpretation
    if (gender === 'male') {
      return adjustedBMI * 0.95; // Slight downward adjustment
    }
    if (gender === 'female') {
      return adjustedBMI * 1.05; // Slight upward adjustment
    }
    return adjustedBMI;
  };

  const finalBMI = getBodyCompositionAdjustment();

  return {
    rawBMI: bmi,
    adjustedBMI: finalBMI,
    category: getBMICategory(finalBMI),
    interpretation: {
      rawValue: bmi.toFixed(1),
      adjustedValue: finalBMI.toFixed(1),
      healthCategory: getBMICategory(finalBMI),
    },
  };
};


