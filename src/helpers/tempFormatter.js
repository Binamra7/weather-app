export const tempFormatter = (temp, unit) => {
  if (unit) return Math.round((9 / 5) * temp + 32) + '°F';
  else return Math.round(temp) + '°C';
};
