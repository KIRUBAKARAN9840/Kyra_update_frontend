// Utility for height conversion
export const convertHeight = (height, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return height;

  const conversionFactors = {
    Centimeter: {
      Feet: height / 30.48,
      Inch: height / 2.54,
    },
    Feet: {
      Centimeter: height * 30.48,
      Inch: height * 12,
    },
    Inch: {
      Centimeter: height * 2.54,
      Feet: height / 12,
    },
  };

  return conversionFactors[fromUnit][toUnit];
};
