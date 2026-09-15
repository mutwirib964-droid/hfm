// Pip formatter for authentic HFM market pricing display with guaranteed mobile responsiveness
export interface PipPriceParts {
  base: string;
  bigPips: string;
  fractional: string;
  fullFormatted: string;
  isForex: boolean;
}

export function formatPipPrice(price: number, decimals: number): PipPriceParts {
  if (price === undefined || price === null || isNaN(price)) {
    return { base: '0.00', bigPips: '', fractional: '', fullFormatted: '0.00', isForex: false };
  }

  const str = price.toFixed(decimals);

  if (decimals >= 4) {
    // Forex (e.g. 1.15462 -> base: "1.15", bigPips: "46", fractional: "2")
    const fractional = str.slice(-1);
    const bigPips = str.slice(-3, -1);
    const base = str.slice(0, -3);
    return { base, bigPips, fractional, fullFormatted: str, isForex: true };
  } else if (decimals === 3) {
    // Forex JPY pairs (e.g. 155.031 -> base: "155.", bigPips: "03", fractional: "1")
    const fractional = str.slice(-1);
    const bigPips = str.slice(-3, -1);
    const base = str.slice(0, -3);
    return { base, bigPips, fractional, fullFormatted: str, isForex: true };
  } else {
    // Commodities, Metals, Crypto, Stocks, Indices (e.g. 4280.15, 75892.00)
    const parts = str.split('.');
    return {
      base: parts[0],
      bigPips: parts[1] ? `.${parts[1]}` : '',
      fractional: '',
      fullFormatted: str,
      isForex: false,
    };
  }
}
