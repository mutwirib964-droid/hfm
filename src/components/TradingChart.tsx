import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle, Timeframe, ChartType, Position } from '../types';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import {
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Radio,
  Sliders,
  TrendingUp,
  TrendingDown,
  Lock,
} from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  decimals: number;
  currentBid: number;
  currentAsk: number;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  positions?: Position[];
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  isDarkMode?: boolean;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  symbol,
  decimals,
  currentBid,
  currentAsk,
  timeframe,
  onTimeframeChange,
  positions = [],
  chartType,
  onChartTypeChange,
  isDarkMode = true,
  tickDirection = 'NEUTRAL',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Smooth Price Line Interpolation
  const animatedBidRef = useRef(currentBid);
  const animatedAskRef = useRef(currentAsk);
  const animFrameRef = useRef<number | null>(null);

  // Mouse hover state for crosshair
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  const timeframes: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  // Smoothly interpolate current price updates for TradingView-like glide
  useEffect(() => {
    let active = true;

    const animate = () => {
      if (!active) return;
      // Linear lerp (smoothing factor 0.15)
      const bidDiff = currentBid - animatedBidRef.current;
      const askDiff = currentAsk - animatedAskRef.current;

      animatedBidRef.current += bidDiff * 0.18;
      animatedAskRef.current += askDiff * 0.18;

      if (Math.abs(bidDiff) > 0.000001 || Math.abs(askDiff) > 0.000001) {
        renderCanvas();
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentBid, currentAsk]);

  // Calculations for Moving Averages - spans from index 0 across all candles end to end
  const ma20 = useMemo(() => {
    const period = 20;
    if (candles.length === 0) return [];
    return candles.map((_, i, arr) => {
      const start = Math.max(0, i - period + 1);
      const slice = arr.slice(start, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      return sum / slice.length;
    });
  }, [candles]);

  const ema50 = useMemo(() => {
    const period = 50;
    const k = 2 / (period + 1);
    if (candles.length === 0) return [];
    let prevEma = candles[0].close;
    return candles.map((c, i) => {
      if (i === 0) return prevEma;
      prevEma = c.close * k + prevEma * (1 - k);
      return prevEma;
    });
  }, [candles]);

  // RSI 14 - continuous from start to finish across all candles
  const rsiValues = useMemo(() => {
    const period = 14;
    if (candles.length === 0) return [];
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        rsi.push(50);
        continue;
      }
      const change = candles[i].close - candles[i - 1].close;
      const count = Math.min(i, period);
      if (change >= 0) gains += change;
      else losses -= change;

      if (i <= period) {
        const avgGain = gains / count;
        const avgLoss = losses / count;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      } else {
        const prevAvgGain = gains / period;
        const prevAvgLoss = losses / period;
        const currentGain = change >= 0 ? change : 0;
        const currentLoss = change < 0 ? -change : 0;
        const avgGain = (prevAvgGain * (period - 1) + currentGain) / period;
        const avgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period;
        gains = avgGain * period;
        losses = avgLoss * period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }
    return rsi;
  }, [candles]);

  // Main Canvas Render Function
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background color
    ctx.fillStyle = isDarkMode ? '#121418' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (candles.length === 0) return;

    // Layout areas
    const priceScaleWidth = 70;
    const timeScaleHeight = 24;
    const rsiHeight = showRSI ? 75 : 0;

    const chartWidth = width - priceScaleWidth;
    const mainChartHeight = height - timeScaleHeight - rsiHeight;

    // Calculate price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    candles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Also include active position prices
    positions.forEach((p) => {
      if (p.symbol === symbol) {
        if (p.openPrice < minPrice) minPrice = p.openPrice;
        if (p.openPrice > maxPrice) maxPrice = p.openPrice;
      }
    });

    // Ensure current bid and ask are strictly inside chart bounds
    if (currentBid < minPrice) minPrice = currentBid;
    if (currentBid > maxPrice) maxPrice = currentBid;
    if (currentAsk < minPrice) minPrice = currentAsk;
    if (currentAsk > maxPrice) maxPrice = currentAsk;

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;

    const priceToY = (price: number) => {
      return mainChartHeight - ((price - paddedMin) / paddedRange) * mainChartHeight;
    };

    const yToPrice = (y: number) => {
      return paddedMin + ((mainChartHeight - y) / mainChartHeight) * paddedRange;
    };

    // Draw Subtle Grid & High-Contrast Price Scale Area
    ctx.strokeStyle = isDarkMode ? '#1E232E' : '#E2E8F0';
    ctx.lineWidth = 1;

    // Dedicated right price scale column background
    ctx.fillStyle = isDarkMode ? '#11141A' : '#F1F5F9';
    ctx.fillRect(chartWidth, 0, priceScaleWidth, mainChartHeight);
    ctx.strokeStyle = isDarkMode ? '#222734' : '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, mainChartHeight);
    ctx.stroke();

    // Horizontal Price Grid lines & Bold Price Scale Labels
    const gridLines = 6;
    ctx.fillStyle = isDarkMode ? '#F1F5F9' : '#0F172A';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridLines; i++) {
      const y = (mainChartHeight / gridLines) * i;
      ctx.strokeStyle = isDarkMode ? '#1A1E27' : '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      const priceVal = yToPrice(y);
      ctx.fillStyle = isDarkMode ? '#CBD5E1' : '#334155';
      ctx.fillText(priceVal.toFixed(decimals), chartWidth + 5, y + 4);
    }

    // Candle widths and spacing
    const candleCount = candles.length;
    const candleSpacing = chartWidth / candleCount;
    const candleWidth = Math.max(2, candleSpacing * 0.72);

    // Draw Volume Bars if enabled
    if (showVolume) {
      const volumeMaxHeight = mainChartHeight * 0.22;
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const volHeight = (c.volume / (maxVolume || 1)) * volumeMaxHeight;
        const volY = mainChartHeight - volHeight;
        const isUp = c.close >= c.open;

        ctx.fillStyle = isUp
          ? isDarkMode
            ? 'rgba(0, 192, 118, 0.20)'
            : 'rgba(16, 185, 129, 0.25)'
          : isDarkMode
          ? 'rgba(239, 68, 68, 0.20)'
          : 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volHeight);
      });
    }

    // Draw Candles or Line (anchored to currentBid to match SELL button and TradingView close 1:1)
    const bullColor = '#00C076'; // HFM Emerald
    const bearColor = '#FF334B'; // HFM Red
    const currentPrice = currentBid;

    if (chartType === 'candles') {
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const isLast = i === candleCount - 1;
        const cOpen = c.open;
        const cClose = isLast ? currentPrice : c.close;
        const cHigh = isLast ? Math.max(c.high, currentPrice) : c.high;
        const cLow = isLast ? Math.min(c.low, currentPrice) : c.low;

        const openY = priceToY(cOpen);
        const closeY = priceToY(cClose);
        const highY = priceToY(cHigh);
        const lowY = priceToY(cLow);
        const isUp = cClose >= cOpen;

        ctx.strokeStyle = isUp ? bullColor : bearColor;
        ctx.fillStyle = isUp ? bullColor : bearColor;
        ctx.lineWidth = 1.2;

        // Wick
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        const bodyY = Math.min(openY, closeY);
        const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      });
    } else if (chartType === 'bars') {
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const isLast = i === candleCount - 1;
        const cOpen = c.open;
        const cClose = isLast ? currentPrice : c.close;
        const cHigh = isLast ? Math.max(c.high, currentPrice) : c.high;
        const cLow = isLast ? Math.min(c.low, currentPrice) : c.low;

        const openY = priceToY(cOpen);
        const closeY = priceToY(cClose);
        const highY = priceToY(cHigh);
        const lowY = priceToY(cLow);
        const isUp = cClose >= cOpen;
        const color = isUp ? bullColor : bearColor;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        // Vertical Bar
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Open tick (left)
        ctx.beginPath();
        ctx.moveTo(x, openY);
        ctx.lineTo(x - candleWidth / 2, openY);
        ctx.stroke();

        // Close tick (right)
        ctx.beginPath();
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + candleWidth / 2, closeY);
        ctx.stroke();
      });
    } else if (chartType === 'line' || chartType === 'area') {
      ctx.beginPath();
      candles.forEach((c, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const cClose = i === candles.length - 1 ? currentPrice : c.close;
        const y = priceToY(cClose);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (chartType === 'area') {
        const lastX = (candles.length - 1) * candleSpacing + candleSpacing / 2;
        ctx.lineTo(lastX, mainChartHeight);
        ctx.lineTo(candleSpacing / 2, mainChartHeight);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, mainChartHeight);
        gradient.addColorStop(0, 'rgba(229, 25, 55, 0.35)');
        gradient.addColorStop(1, 'rgba(229, 25, 55, 0.01)');
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        candles.forEach((c, i) => {
          const x = i * candleSpacing + candleSpacing / 2;
          const cClose = i === candles.length - 1 ? currentPrice : c.close;
          const y = priceToY(cClose);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#E51937';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Moving Averages - Running end to end from left edge to right edge of the chart
    if (showSMA && ma20.length > 0) {
      ctx.beginPath();
      const firstY = priceToY(ma20[0]);
      ctx.moveTo(0, firstY);
      ma20.forEach((val, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const y = priceToY(val);
        ctx.lineTo(x, y);
      });
      const lastSmaY = priceToY(ma20[ma20.length - 1]);
      ctx.lineTo(chartWidth, lastSmaY);
      ctx.strokeStyle = '#F59E0B'; // Amber SMA
      ctx.lineWidth = 2;
      ctx.stroke();

      // Right axis price badge for SMA
      ctx.fillStyle = '#F59E0B';
      const badgeH = 15;
      const badgeW = priceScaleWidth - 4;
      ctx.fillRect(chartWidth + 2, lastSmaY - badgeH / 2, badgeW, badgeH);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ma20[ma20.length - 1].toFixed(decimals), chartWidth + badgeW / 2 + 2, lastSmaY + 3);
    }

    if (showEMA && ema50.length > 0) {
      ctx.beginPath();
      const firstY = priceToY(ema50[0]);
      ctx.moveTo(0, firstY);
      ema50.forEach((val, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const y = priceToY(val);
        ctx.lineTo(x, y);
      });
      const lastEmaY = priceToY(ema50[ema50.length - 1]);
      ctx.lineTo(chartWidth, lastEmaY);
      ctx.strokeStyle = '#38BDF8'; // Sky blue EMA
      ctx.lineWidth = 2;
      ctx.stroke();

      // Right axis price badge for EMA
      ctx.fillStyle = '#38BDF8';
      const badgeH = 15;
      const badgeW = priceScaleWidth - 4;
      ctx.fillRect(chartWidth + 2, lastEmaY - badgeH / 2, badgeW, badgeH);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ema50[ema50.length - 1].toFixed(decimals), chartWidth + badgeW / 2 + 2, lastEmaY + 3);
    }

    // Top-left on-canvas indicator legend
    let legendX = 12;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    if (showSMA && ma20.length > 0) {
      ctx.fillStyle = '#F59E0B';
      const text = `SMA(20): ${ma20[ma20.length - 1].toFixed(decimals)}`;
      ctx.fillText(text, legendX, 18);
      legendX += ctx.measureText(text).width + 12;
    }
    if (showEMA && ema50.length > 0) {
      ctx.fillStyle = '#38BDF8';
      const text = `EMA(50): ${ema50[ema50.length - 1].toFixed(decimals)}`;
      ctx.fillText(text, legendX, 18);
    }

    // Draw Bid and Ask Lines in exact synchronization with execution buttons
    const bidY = priceToY(currentBid);
    const askY = priceToY(currentAsk);
    const spreadPoints = Math.round(Math.abs(currentAsk - currentBid) * Math.pow(10, decimals <= 3 ? 2 : 4));

    // 1. Bid Line (Sell Price - Red dashed)
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, bidY);
    ctx.lineTo(chartWidth, bidY);
    ctx.stroke();

    // 2. Ask Line (Buy Price - Green dashed)
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    ctx.moveTo(0, askY);
    ctx.lineTo(chartWidth, askY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Spread Zone between Bid and Ask
    const spreadTopY = Math.min(bidY, askY);
    const spreadH = Math.max(Math.abs(bidY - askY), 3);
    ctx.fillStyle = isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)';
    ctx.fillRect(0, spreadTopY, chartWidth, spreadH);

    // 4. Exact Currency Price Pills on Right Y-Axis (auto-separated so BUY and SELL never overlap)
    const minPillGap = 17;
    const rawGap = bidY - askY; // Usually positive since ask > bid => askY < bidY
    let displayAskY = askY;
    let displayBidY = bidY;
    if (Math.abs(rawGap) < minPillGap) {
      const midY = (bidY + askY) / 2;
      displayAskY = midY - minPillGap / 2;
      displayBidY = midY + minPillGap / 2;
    }

    // Bid Pill (Red - SELL)
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.roundRect(chartWidth + 1, displayBidY - 8, priceScaleWidth - 3, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentBid.toFixed(decimals), chartWidth + (priceScaleWidth - 3) / 2, displayBidY + 3.5);

    // Ask Pill (Green - BUY)
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(chartWidth + 1, displayAskY - 8, priceScaleWidth - 3, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(currentAsk.toFixed(decimals), chartWidth + (priceScaleWidth - 3) / 2, displayAskY + 3.5);

    // Spread Badge between Bid and Ask on axis
    const midSpreadY = (bidY + askY) / 2;
    if (Math.abs(bidY - askY) > 14) {
      ctx.fillStyle = isDarkMode ? '#1E222A' : '#F1F5F9';
      ctx.beginPath();
      ctx.roundRect(chartWidth + 3, midSpreadY - 6, priceScaleWidth - 7, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#10B981';
      ctx.font = '8px monospace';
      ctx.fillText(`SPR: ${spreadPoints} pts`, chartWidth + (priceScaleWidth - 3) / 2, midSpreadY + 3);
    }

    // Draw Open Positions Lines
    positions
      .filter((p) => p.symbol === symbol)
      .forEach((pos) => {
        const posY = priceToY(pos.openPrice);
        const isBuy = pos.side === 'BUY';
        const color = isBuy ? '#10B981' : '#EF4444';

        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, posY);
        ctx.lineTo(chartWidth, posY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Badge on left
        ctx.fillStyle = color;
        ctx.fillRect(8, posY - 9, 130, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        const pnlSign = pos.pnl >= 0 ? '+' : '';
        ctx.fillText(
          `#${pos.ticket} ${pos.side} ${pos.lots} (${pnlSign}$${pos.pnl.toFixed(2)})`,
          14,
          posY + 3
        );
      });

    // Time scale labels at bottom with high contrast
    ctx.fillStyle = isDarkMode ? '#CBD5E1' : '#334155';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    const timeStep = Math.max(1, Math.floor(candleCount / 5));

    for (let i = 0; i < candleCount; i += timeStep) {
      const c = candles[i];
      const x = i * candleSpacing + candleSpacing / 2;
      const d = new Date(c.time);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      ctx.fillText(timeStr, x, mainChartHeight + 16);
    }

    // RSI Sub-panel - runs end to end across canvas
    if (showRSI) {
      const rsiTop = height - timeScaleHeight - rsiHeight + 10;
      const rsiBottom = height - timeScaleHeight - 5;
      const rsiSpan = rsiBottom - rsiTop;

      ctx.strokeStyle = isDarkMode ? '#272B35' : '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(0, rsiTop - 10);
      ctx.lineTo(width, rsiTop - 10);
      ctx.stroke();

      ctx.fillStyle = isDarkMode ? '#E2E8F0' : '#1E293B';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      const lastRsi = rsiValues[rsiValues.length - 1] ?? 50;
      ctx.fillText(`RSI(14): ${lastRsi.toFixed(1)}`, 10, rsiTop + 10);

      const y70 = rsiBottom - 0.7 * rsiSpan;
      const y30 = rsiBottom - 0.3 * rsiSpan;

      ctx.strokeStyle = isDarkMode ? '#475569' : '#94A3B8';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartWidth, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(chartWidth, y30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#A855F7';
      ctx.fillText('70', chartWidth + 6, y70 + 3);
      ctx.fillText('30', chartWidth + 6, y30 + 3);

      ctx.beginPath();
      const firstRsiVal = rsiValues[0] ?? 50;
      ctx.moveTo(0, rsiBottom - (firstRsiVal / 100) * rsiSpan);
      rsiValues.forEach((val, i) => {
        const x = i * candleSpacing + candleSpacing / 2;
        const y = rsiBottom - (val / 100) * rsiSpan;
        ctx.lineTo(x, y);
      });
      const lastRsiY = rsiBottom - (lastRsi / 100) * rsiSpan;
      ctx.lineTo(chartWidth, lastRsiY);
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Crosshair rendering
    if (hoverPos && hoverPos.x < chartWidth && hoverPos.y < mainChartHeight) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isDarkMode ? '#9CA3AF' : '#64748B';
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.moveTo(hoverPos.x, 0);
      ctx.lineTo(hoverPos.x, mainChartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hoverPos.y);
      ctx.lineTo(chartWidth, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const hoverPrice = yToPrice(hoverPos.y);
      ctx.fillStyle = isDarkMode ? '#374151' : '#475569';
      ctx.fillRect(chartWidth, hoverPos.y - 8, priceScaleWidth, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.fillText(hoverPrice.toFixed(decimals), chartWidth + 5, hoverPos.y + 3);
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [
    candles,
    symbol,
    decimals,
    currentBid,
    currentAsk,
    timeframe,
    chartType,
    showSMA,
    showEMA,
    showRSI,
    showVolume,
    hoverPos,
    positions,
    isDarkMode,
    tickDirection,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverPos({ x, y });

    const priceScaleWidth = 70;
    const chartWidth = rect.width - priceScaleWidth;
    if (x >= 0 && x <= chartWidth && candles.length > 0) {
      const index = Math.min(
        candles.length - 1,
        Math.max(0, Math.floor((x / chartWidth) * candles.length))
      );
      setHoveredCandle(candles[index]);
    }
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
    setHoveredCandle(null);
  };

  const activeCandle = hoveredCandle
    ? hoveredCandle
    : candles.length > 0
    ? {
        ...candles[candles.length - 1],
        close: currentBid,
        high: Math.max(candles[candles.length - 1].high, currentBid),
        low: Math.min(candles[candles.length - 1].low, currentBid),
      }
    : null;

  // Render HFM Fast Canvas Chart with smooth price glide
  return (
    <div className="relative flex flex-col w-full space-y-1">
      {/* Chart Status Header */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {symbol}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono">
            {timeframe}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {(() => {
            const mStatus = checkInstrumentMarketHours(symbol);
            if (!mStatus.isOpen) {
              return (
                <span className="px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>MARKET CLOSED</span>
                </span>
              );
            }
            return (
              <span
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  tickDirection === 'UP'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : tickDirection === 'DOWN'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'text-neutral-400'
                }`}
              >
                {tickDirection === 'UP' ? '▲ BUY FLOW' : tickDirection === 'DOWN' ? '▼ SELL FLOW' : '• LIVE FEED'}
              </span>
            );
          })()}
        </div>
      </div>

      <div
        ref={containerRef}
        id="hfm-trading-chart-container"
        className={`relative flex flex-col border rounded-xl overflow-hidden shadow-lg select-none transition-colors duration-200 ${
          isDarkMode
            ? 'bg-[#121418] border-neutral-800/80 text-white'
            : 'bg-white border-neutral-200 text-neutral-900'
        } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-[380px] sm:h-[450px]'}`}
      >
        {/* Chart Control Toolbar */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b text-xs ${
            isDarkMode ? 'bg-[#181B20] border-neutral-800/70' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Timeframe Buttons - High Visibility */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                id={`tf-btn-${tf}`}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#E51937] text-white shadow-md ring-2 ring-red-500/60 font-black'
                    : isDarkMode
                    ? 'bg-[#1F232D] text-neutral-200 border border-neutral-700/80 hover:bg-neutral-700 hover:text-white'
                    : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 hover:text-black shadow-xs'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style & Indicators Controls */}
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <div
              className={`flex rounded-lg p-0.5 border ${
                isDarkMode ? 'bg-[#181B22] border-neutral-700' : 'bg-slate-200 border-slate-300'
              }`}
            >
              <button
                id="chart-type-candles"
                title="Candlesticks"
                onClick={() => onChartTypeChange('candles')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'candles'
                    ? 'bg-[#E51937] text-white shadow-xs'
                    : isDarkMode
                    ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    : 'text-slate-700 hover:text-black hover:bg-white'
                }`}
              >
                Candles
              </button>
              <button
                id="chart-type-line"
                title="Line Chart"
                onClick={() => onChartTypeChange('line')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'line'
                    ? 'bg-[#E51937] text-white shadow-xs'
                    : isDarkMode
                    ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    : 'text-slate-700 hover:text-black hover:bg-white'
                }`}
              >
                Line
              </button>
              <button
                id="chart-type-area"
                title="Area Chart"
                onClick={() => onChartTypeChange('area')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-[#E51937] text-white shadow-xs'
                    : isDarkMode
                    ? 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    : 'text-slate-700 hover:text-black hover:bg-white'
                }`}
              >
                Area
              </button>
            </div>

            {/* Indicators Toggle */}
            <div className="relative">
              <button
                id="indicators-toggle-btn"
                onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  showIndicatorMenu
                    ? 'bg-[#E51937] text-white border-[#E51937] ring-2 ring-red-500/50'
                    : isDarkMode
                    ? 'bg-[#1F232D] border-neutral-700 text-white hover:bg-neutral-700'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Indicators</span>
                {(showSMA || showEMA || showRSI) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/40 animate-pulse" />
                )}
              </button>

              {showIndicatorMenu && (
                <div
                  className={`absolute right-0 top-full mt-2 w-52 border rounded-xl p-2.5 shadow-2xl z-30 space-y-2 text-xs backdrop-blur-md ${
                    isDarkMode ? 'bg-[#1C2029] border-neutral-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 border-b pb-1">
                    Technical Indicators
                  </div>
                  <label className="flex items-center justify-between p-2 hover:bg-neutral-800/60 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                      SMA (20)
                    </span>
                    <input
                      type="checkbox"
                      checked={showSMA}
                      onChange={(e) => setShowSMA(e.target.checked)}
                      className="accent-[#E51937] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 hover:bg-neutral-800/60 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-3 h-3 rounded-full bg-sky-400 shadow-xs" />
                      EMA (50)
                    </span>
                    <input
                      type="checkbox"
                      checked={showEMA}
                      onChange={(e) => setShowEMA(e.target.checked)}
                      className="accent-[#E51937] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 hover:bg-neutral-800/60 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-3 h-3 rounded-full bg-purple-500 shadow-xs" />
                      RSI (14)
                    </span>
                    <input
                      type="checkbox"
                      checked={showRSI}
                      onChange={(e) => setShowRSI(e.target.checked)}
                      className="accent-[#E51937] w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 hover:bg-neutral-800/60 dark:hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-3 h-3 rounded-full bg-neutral-400 shadow-xs" />
                      Volume Bars
                    </span>
                    <input
                      type="checkbox"
                      checked={showVolume}
                      onChange={(e) => setShowVolume(e.target.checked)}
                      className="accent-[#E51937] w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* VTM Pro Live Chart Engine Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-800 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
              title="VTM Pro Live Engine: Ultra-low latency canvas synchronized with Buy/Sell execution"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>VTM PRO LIVE</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              id="fullscreen-chart-toggle"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* OHLCV Metric Bar with Live Execution Sync - High Visibility */}
        {activeCandle && (
          <div
            className={`flex flex-wrap items-center gap-3 px-3 py-1.5 text-xs font-mono border-b ${
              isDarkMode
                ? 'bg-[#14171E] text-neutral-300 border-neutral-800'
                : 'bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <span className={`font-black tracking-wide text-sm ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
              {symbol}
            </span>
            <span className="font-semibold">
              O: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{activeCandle.open.toFixed(decimals)}</strong>
            </span>
            <span className="font-semibold">
              H: <strong className="text-emerald-400 font-bold">{activeCandle.high.toFixed(decimals)}</strong>
            </span>
            <span className="font-semibold">
              L: <strong className="text-rose-400 font-bold">{activeCandle.low.toFixed(decimals)}</strong>
            </span>
            <span className="font-semibold">
              C: <strong className={isDarkMode ? 'text-white' : 'text-slate-900'}>{activeCandle.close.toFixed(decimals)}</strong>
            </span>

            {/* Synchronized SELL (Bid) badge */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono font-bold text-xs border transition-all ${
                tickDirection === 'DOWN'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse'
                  : 'bg-rose-950/60 text-rose-300 border-rose-700/60'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-black">
                SELL
              </span>
              <span className="font-black">{currentBid.toFixed(decimals)}</span>
              {tickDirection === 'DOWN' && <span>▼</span>}
            </div>

            {/* Synchronized BUY (Ask) badge */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono font-bold text-xs border transition-all ${
                tickDirection === 'UP'
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider font-black">
                BUY
              </span>
              <span className="font-black">{currentAsk.toFixed(decimals)}</span>
              {tickDirection === 'UP' && <span>▲</span>}
            </div>

            <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-amber-400 font-bold text-[11px]">
              Spr: {Math.round(Math.abs(currentAsk - currentBid) * Math.pow(10, decimals <= 3 ? 2 : 4))} pts
            </span>
            {showVolume && (
              <span className="hidden md:inline text-neutral-400">
                Vol: <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>{activeCandle.volume}</strong>
              </span>
            )}
          </div>
        )}

        {/* Chart Viewport: Real-Time Live VTM Pro Canvas Chart */}
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <div className="relative w-full h-full">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="w-full h-full cursor-crosshair block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
