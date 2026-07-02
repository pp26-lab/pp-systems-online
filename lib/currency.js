export function formatCurrency(amount, currencyCode = 'LAK') {
  const formats = {
    LAK: { symbol: '₭', decimals: 0, position: 'after', separator: ',' },
    THB: { symbol: '฿', decimals: 2, position: 'before', separator: ',' },
    USD: { symbol: '$', decimals: 2, position: 'before', separator: ',' },
    CNY: { symbol: '¥', decimals: 2, position: 'before', separator: ',' },
  };

  const fmt = formats[currencyCode] || formats.LAK;
  const num = Number(amount).toFixed(fmt.decimals);
  const parts = num.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, fmt.separator);
  const formatted = parts.join('.');

  return fmt.position === 'before' ? `${fmt.symbol}${formatted}` : `${formatted}${fmt.symbol}`;
}

export function convertCurrency(amount, fromRate, toRate) {
  if (!fromRate || !toRate) return amount;
  return (amount * fromRate) / toRate;
}

export function calculateLandedCost(costPrice, freightCost, customsDuty, proxyFee, transferFee, exchangeRate) {
  const totalForeignCost = costPrice + freightCost + customsDuty + proxyFee + transferFee;
  return totalForeignCost * exchangeRate;
}

export function calculateMargin(sellingPrice, landedCost) {
  if (!sellingPrice || sellingPrice === 0) return 0;
  return ((sellingPrice - landedCost) / sellingPrice) * 100;
}
