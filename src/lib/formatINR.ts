export const formatINR = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1000) return sign + "₹" + abs.toFixed(0);
  let s = abs.toFixed(0);
  // Indian grouping: last 3, then groups of 2
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return sign + "₹" + (grouped ? grouped + "," : "") + last3;
};
