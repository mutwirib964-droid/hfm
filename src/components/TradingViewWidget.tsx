import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Timeframe, ChartType } from '../types';
import { TradingViewPriceService } from '../services/tradingViewService';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { DrawingModal } from './ChartModals';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  Lock,
  PenTool,
  X,
  Trash2,
  Check,
  TrendingUp,
  Minus,
  MoveVertical,
  Sliders,
  Square,
  Circle,
  Type,
  Crosshair,
  GitFork,
  Compass,
  ArrowUpCircle,
  ArrowDownCircle,
  Ruler,
  Edit3,
  Triangle,
  Activity,
  Zap,
  CornerUpRight,
} from 'lucide-react';

interface TradingViewWidgetProps {
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  chartType?: ChartType;
  isDarkMode: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  bid?: number;
  ask?: number;
  spread?: number;
  decimals?: number;
  pipMultiplier?: number;
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol,
  timeframe,
  onTimeframeChange,
  isDarkMode,
  isFullscreen = false,
  onToggleFullscreen,
  bid,
  ask,
  spread,
  decimals = 2,
  pipMultiplier = 10000,
  tickDirection = 'NEUTRAL',
}) => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const marketStatus = checkInstrumentMarketHours(symbol);

  // Interactive Drawing Toolbar & Canvas State (Hidden by default; appears ONLY when user clicks Drawing Tool icon)
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState<string>('#3B82F6');
  const [drawings, setDrawings] = useState<
    Array<{ id: string; tool: string; points: { x: number; y: number }[]; color: string; text?: string }>
  >([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live real-time tick detection for top badges (disabled when market is closed)
  const prevBidRef = React.useRef(bid);
  const prevAskRef = React.useRef(ask);
  const [bidTick, setBidTick] = useState<'UP' | 'DOWN' | null>(null);
  const [askTick, setAskTick] = useState<'UP' | 'DOWN' | null>(null);

  React.useEffect(() => {
    if (!marketStatus.isOpen) {
      prevBidRef.current = bid;
      setBidTick(null);
      return;
    }
    if (bid !== undefined && prevBidRef.current !== undefined && bid !== prevBidRef.current) {
      setBidTick(bid > prevBidRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setBidTick(null), 650);
      prevBidRef.current = bid;
      return () => clearTimeout(t);
    }
    prevBidRef.current = bid;
  }, [bid, marketStatus.isOpen]);

  React.useEffect(() => {
    if (!marketStatus.isOpen) {
      prevAskRef.current = ask;
      setAskTick(null);
      return;
    }
    if (ask !== undefined && prevAskRef.current !== undefined && ask !== prevAskRef.current) {
      setAskTick(ask > prevAskRef.current ? 'UP' : 'DOWN');
      const t = setTimeout(() => setAskTick(null), 650);
      prevAskRef.current = ask;
      return () => clearTimeout(t);
    }
    prevAskRef.current = ask;
  }, [ask, marketStatus.isOpen]);

  // Map timeframe to TradingView interval string
  const tvInterval = useMemo(() => {
    switch (timeframe) {
      case '1M':
        return '1';
      case '5M':
        return '5';
      case '15M':
        return '15';
      case '1H':
        return '60';
      case '4H':
        return '240';
      case '1D':
        return 'D';
      case '1W':
        return 'W';
      default:
        return '15';
    }
  }, [timeframe]);

  const tvSymbol = useMemo(() => {
    return TradingViewPriceService.getTVSymbolForEmbed(symbol);
  }, [symbol]);

  // Construct official Widget Embed URL with full interactive drawing tools, indicators,
  // and native Bid/Ask scale labels + lines rendered directly at exact price coordinates
  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams({
      frameElementId: `tv_widget_${symbol}`,
      symbol: tvSymbol,
      interval: tvInterval,
      hidesidetoolbar: '1',
      symboledit: '1',
      saveimage: '0',
      toolbarbg: isDarkMode ? '181B20' : 'F8FAFC',
      studies: JSON.stringify(['RSI@tv-basicstudies', 'MASimple@tv-basicstudies']),
      theme: isDarkMode ? 'dark' : 'light',
      style: '1', // Candlesticks
      timezone: 'Etc/UTC',
      withdateranges: '1',
      showintervals: '1',
      enablepublishing: 'false',
      locale: 'en',
      overrides: JSON.stringify({
        'mainSeriesProperties.bidAsk.visible': true,
        'mainSeriesProperties.bidAsk.lineStyle': 2,
        'mainSeriesProperties.bidAsk.lineWidth': 1,
        'mainSeriesProperties.bidAsk.bidLineColor': '#E51937', // Red for Sell/Bid
        'mainSeriesProperties.bidAsk.askLineColor': '#00C076', // Green for Buy/Ask
        'scalesProperties.showBidAskLabels': true,
        'scalesProperties.showSymbolLabels': true,
        'scalesProperties.showCountdown': true,
      }),
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [tvSymbol, tvInterval, isDarkMode]);

  const timeframes: Timeframe[] = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDrawingTool) return;
    const { x, y } = getCanvasCoords(e);
    if (
      activeDrawingTool === 'Horizontal' ||
      activeDrawingTool === 'HorizontalRay' ||
      activeDrawingTool === 'CrossLine' ||
      activeDrawingTool === 'Vertical' ||
      activeDrawingTool === 'Text' ||
      activeDrawingTool === 'Callout'
    ) {
      setDrawings((prev) => [
        ...prev,
        {
          id: `draw-${Date.now()}`,
          tool: activeDrawingTool,
          points: [{ x, y }],
          color: drawingColor,
          text:
            activeDrawingTool === 'Text' || activeDrawingTool === 'Callout'
              ? `Level @ ${(bid || 0).toFixed(decimals)}`
              : undefined,
        },
      ]);
      return;
    }
    setIsDrawing(true);
    setTempPoints([{ x, y }, { x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeDrawingTool || tempPoints.length === 0) return;
    const { x, y } = getCanvasCoords(e);
    if (activeDrawingTool === 'Brush') {
      setTempPoints((prev) => [...prev, { x, y }]);
    } else {
      setTempPoints([tempPoints[0], { x, y }]);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !activeDrawingTool || tempPoints.length < 2) {
      setIsDrawing(false);
      setTempPoints([]);
      return;
    }
    const [p1, p2] = tempPoints;
    if (Math.hypot(p2.x - p1.x, p2.y - p1.y) > 4 || activeDrawingTool === 'Brush') {
      setDrawings((prev) => [
        ...prev,
        { id: `draw-${Date.now()}`, tool: activeDrawingTool, points: tempPoints, color: drawingColor },
      ]);
    }
    setIsDrawing(false);
    setTempPoints([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const chartWidth = Math.max(100, width - 64);
    const basePrice = bid || 1;
    const maxPrice = basePrice * 1.005;
    const minPrice = basePrice * 0.995;
    const priceRange = maxPrice - minPrice || 1;

    const allDrawings = [...drawings];
    if (isDrawing && tempPoints.length >= 2 && activeDrawingTool) {
      allDrawings.push({ id: 'preview', tool: activeDrawingTool, points: tempPoints, color: drawingColor });
    }

    allDrawings.forEach((draw) => {
      const pts = draw.points;
      if (!pts || pts.length === 0) return;
      ctx.save();
      ctx.strokeStyle = draw.color;
      ctx.fillStyle = draw.color;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);

      if (draw.tool === 'Horizontal') {
        const y = pts[0].y;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillRect(chartWidth - 2, y - 9, 64, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        const pVal = maxPrice - (y / height) * priceRange;
        ctx.fillText(pVal.toFixed(decimals), chartWidth + 30, y + 3.5);
      } else if (draw.tool === 'HorizontalRay') {
        const { x, y } = pts[0];
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (draw.tool === 'CrossLine') {
        const { x, y } = pts[0];
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      } else if (draw.tool === 'Vertical') {
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, 0);
        ctx.lineTo(pts[0].x, height);
        ctx.stroke();
      } else if (draw.tool === 'Trendline' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
        ctx.arc(pts[1].x, pts[1].y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (draw.tool === 'Ray' && pts.length >= 2) {
        const [p1, p2] = pts;
        const dx = p2.x - p1.x || 1;
        const slope = (p2.y - p1.y) / dx;
        const endX = dx >= 0 ? chartWidth : 0;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(endX, p1.y + slope * (endX - p1.x));
        ctx.stroke();
      } else if (draw.tool === 'Brush' && pts.length >= 2) {
        ctx.beginPath();
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      } else if (draw.tool === 'Arrowed' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - 12 * Math.cos(angle - Math.PI / 6), p2.y - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(p2.x - 12 * Math.cos(angle + Math.PI / 6), p2.y - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (draw.tool === 'Rectangle' && pts.length >= 2) {
        const [p1, p2] = pts;
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.abs(p2.x - p1.x);
        const rh = Math.abs(p2.y - p1.y);
        ctx.fillStyle = `${draw.color}28`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (draw.tool === 'Triangle' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, (p1.y + p2.y) / 2);
        ctx.lineTo(p1.x, p2.y);
        ctx.closePath();
        ctx.fillStyle = `${draw.color}24`;
        ctx.fill();
        ctx.stroke();
      } else if ((draw.tool === 'Retracements' || draw.tool === 'FibExtension') && pts.length >= 2) {
        const [p1, p2] = pts;
        const topY = Math.min(p1.y, p2.y);
        const diffY = Math.max(p1.y, p2.y) - topY;
        const levels =
          draw.tool === 'FibExtension'
            ? [
                { ratio: 0.0, label: '0.0%', col: '#94A3B8' },
                { ratio: 0.618, label: '61.8%', col: '#089981' },
                { ratio: 1.0, label: '100.0%', col: '#2962FF' },
                { ratio: 1.272, label: '127.2%', col: '#A855F7' },
                { ratio: 1.618, label: '161.8%', col: '#E51937' },
              ]
            : [
                { ratio: 0.0, label: '0.0%', col: '#94A3B8' },
                { ratio: 0.236, label: '23.6%', col: '#F23645' },
                { ratio: 0.382, label: '38.2%', col: '#FF9800' },
                { ratio: 0.5, label: '50.0%', col: '#4CAF50' },
                { ratio: 0.618, label: '61.8%', col: '#089981' },
                { ratio: 1.0, label: '100.0%', col: '#94A3B8' },
              ];
        levels.forEach((fib) => {
          const ly = topY + diffY * fib.ratio;
          ctx.beginPath();
          ctx.strokeStyle = fib.col;
          ctx.setLineDash([4, 3]);
          ctx.moveTo(Math.min(p1.x, p2.x), ly);
          ctx.lineTo(chartWidth, ly);
          ctx.stroke();
          ctx.fillStyle = fib.col;
          ctx.font = 'bold 9.5px monospace';
          ctx.fillText(`Fib ${fib.label}`, chartWidth - 60, ly - 3);
        });
      } else if (draw.tool === 'FibFan' && pts.length >= 2) {
        const [p1, p2] = pts;
        [0.382, 0.5, 0.618].forEach((r, idx) => {
          const targetY = p1.y + (p2.y - p1.y) * r;
          ctx.beginPath();
          ctx.strokeStyle = ['#F59E0B', '#10B981', '#3B82F6'][idx];
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, targetY);
          ctx.stroke();
        });
      } else if (draw.tool === 'FibTimeZones' && pts.length >= 2) {
        const [p1, p2] = pts;
        const baseStep = Math.max(12, Math.abs(p2.x - p1.x));
        [0, 1, 2, 3, 5, 8].forEach((fn) => {
          const vx = p1.x + fn * (baseStep * 0.35);
          if (vx < chartWidth) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(vx, 0);
            ctx.lineTo(vx, height);
            ctx.stroke();
          }
        });
      } else if ((draw.tool === 'LongPosition' || draw.tool === 'ShortPosition') && pts.length >= 2) {
        const [p1, p2] = pts;
        const isLong = draw.tool === 'LongPosition';
        const leftX = Math.min(p1.x, p2.x);
        const boxW = Math.max(85, Math.abs(p2.x - p1.x));
        const entryY = p1.y;
        const tpHeight = Math.max(28, Math.abs(p2.y - p1.y));
        const slHeight = tpHeight * 0.5;
        const tpTop = isLong ? entryY - tpHeight : entryY;
        const slTop = isLong ? entryY : entryY - slHeight;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
        ctx.strokeStyle = '#10B981';
        ctx.fillRect(leftX, tpTop, boxW, tpHeight);
        ctx.strokeRect(leftX, tpTop, boxW, tpHeight);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
        ctx.strokeStyle = '#EF4444';
        ctx.fillRect(leftX, slTop, boxW, slHeight);
        ctx.strokeRect(leftX, slTop, boxW, slHeight);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(leftX + 4, entryY - 9, 86, 17);
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 9.5px monospace';
        ctx.fillText(`${isLong ? 'LONG' : 'SHORT'} R:R 2.0`, leftX + 8, entryY + 3);
      } else if (draw.tool === 'PriceRange' && pts.length >= 2) {
        const [p1, p2] = pts;
        const rx = Math.min(p1.x, p2.x);
        const ry = Math.min(p1.y, p2.y);
        const rw = Math.max(40, Math.abs(p2.x - p1.x));
        const rh = Math.max(18, Math.abs(p2.y - p1.y));
        ctx.fillStyle = 'rgba(59, 130, 246, 0.18)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (draw.tool === 'Ellipse' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.ellipse(
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2,
          Math.max(4, Math.abs(p2.x - p1.x) / 2),
          Math.max(4, Math.abs(p2.y - p1.y) / 2),
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `${draw.color}25`;
        ctx.fill();
        ctx.stroke();
      } else if (draw.tool === 'Equidistant' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y + 30);
        ctx.lineTo(p2.x, p2.y + 30);
        ctx.stroke();
      } else if (draw.tool === 'Pitchfork' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y - 26);
        ctx.lineTo(p2.x, p2.y - 26);
        ctx.moveTo(p1.x, p1.y + 26);
        ctx.lineTo(p2.x, p2.y + 26);
        ctx.moveTo(p1.x, p1.y - 26);
        ctx.lineTo(p1.x, p1.y + 26);
        ctx.stroke();
      } else if (
        (draw.tool === 'XABCD' ||
          draw.tool === 'ABCD' ||
          draw.tool === 'HeadAndShoulders' ||
          draw.tool === 'ElliottWave') &&
        pts.length >= 2
      ) {
        const [p1, p2] = pts;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const wavePts = [
          { x: p1.x, y: p1.y },
          { x: p1.x + dx * 0.25, y: p1.y - Math.abs(dy) * 0.5 },
          { x: p1.x + dx * 0.5, y: p1.y },
          { x: p1.x + dx * 0.75, y: p1.y - Math.abs(dy) * 0.85 },
          { x: p2.x, y: p2.y },
        ];
        ctx.beginPath();
        wavePts.forEach((wp, i) => (i === 0 ? ctx.moveTo(wp.x, wp.y) : ctx.lineTo(wp.x, wp.y)));
        ctx.stroke();
      } else if ((draw.tool === 'Text' || draw.tool === 'Callout') && pts.length >= 1) {
        const p = pts[0];
        const label = draw.text || 'Key Level';
        ctx.fillStyle = draw.color;
        ctx.fillRect(p.x - 2, p.y - 18, label.length * 6.5 + 14, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(label, p.x + 4, p.y - 4);
      }

      ctx.restore();
    });
  }, [drawings, isDrawing, tempPoints, activeDrawingTool, drawingColor, bid, decimals]);

  return (
    <div
      id="tradingview-live-widget-container"
      className={`relative flex flex-col w-full overflow-hidden transition-all duration-200 border rounded-xl shadow-lg select-none ${
        isDarkMode
          ? 'bg-[#121418] border-neutral-800/90 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-full min-h-[380px] sm:min-h-[440px]'}`}
    >
      {/* Top Chart Bar with status and controls */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs ${
          isDarkMode
            ? 'bg-[#181B20] border-neutral-800/80 text-neutral-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {/* Left: Live Feed indicator + Symbol + Timeframes */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {marketStatus.isOpen ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-500 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Quote</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold text-[10px]">
              <Lock className="w-2.5 h-2.5" />
              <span>Market Closed</span>
            </div>
          )}

          <span className="font-mono font-bold text-xs">{symbol}</span>

          {/* Quick Timeframe pills */}
          {onTimeframeChange && (
            <div className="flex items-center gap-1 ml-1">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    timeframe === tf
                      ? 'bg-[#E51937] text-white shadow-sm'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Real-time SELL (Bid) and BUY (Ask) badges synchronized with execution buttons */}
          {bid !== undefined && ask !== undefined && (() => {
            const marketStatus = checkInstrumentMarketHours(symbol);
            return (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                {/* Closed Indicator */}
                {!marketStatus.isOpen && (
                  <span className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-extrabold tracking-wider uppercase">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Closed</span>
                  </span>
                )}

                {/* SELL / Bid Badge (Red) - Animated reaction on price change */}
                <div
                  title="SELL (Bid) Price - Synchronized with SELL button"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-all ${
                    bidTick === 'UP'
                      ? 'border-emerald-400 ring-1 ring-emerald-400 scale-105'
                      : bidTick === 'DOWN'
                      ? 'border-rose-400 ring-1 ring-rose-400 scale-105'
                      : 'border-red-800/80'
                  } bg-[#1A1215]`}
                >
                  <span className="bg-[#990F20] text-red-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                    SELL
                    {bidTick === 'UP' && <span className="text-emerald-300 text-[10px]">▲</span>}
                    {bidTick === 'DOWN' && <span className="text-rose-300 text-[10px]">▼</span>}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white transition-all ${
                    bidTick === 'UP' ? 'bg-[#00C076]' : bidTick === 'DOWN' ? 'bg-[#FF2E4D]' : 'bg-[#E51937]'
                  }`}>
                    {bid.toFixed(decimals)}
                  </span>
                </div>

                {/* Spread Points Pill */}
                <div className="hidden sm:flex items-center px-1.5 py-0.5 rounded bg-neutral-800/80 text-amber-300 text-[10px] font-semibold border border-neutral-700/60">
                  <span>
                    {`${(spread !== undefined && spread > 0 && spread <= 1.2 ? spread : 0.42).toFixed(2)} pts`}
                  </span>
                </div>

                {/* BUY / Ask Badge (Green) - Animated reaction on price change */}
                <div
                  title="BUY (Ask) Price - Synchronized with BUY button"
                  className={`flex items-center rounded overflow-hidden shadow-xs border transition-all ${
                    askTick === 'UP'
                      ? 'border-emerald-400 ring-1 ring-emerald-400 scale-105'
                      : askTick === 'DOWN'
                      ? 'border-rose-400 ring-1 ring-rose-400 scale-105'
                      : 'border-emerald-800/80'
                  } bg-[#121A15]`}
                >
                  <span className="bg-[#007A4A] text-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                    BUY
                    {askTick === 'UP' && <span className="text-emerald-300 text-[10px]">▲</span>}
                    {askTick === 'DOWN' && <span className="text-rose-300 text-[10px]">▼</span>}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold text-white transition-all ${
                    askTick === 'UP' ? 'bg-[#00E58D] text-black font-extrabold' : askTick === 'DOWN' ? 'bg-[#FF2E4D]' : 'bg-[#00C076]'
                  }`}>
                    {ask.toFixed(decimals)}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Drawing Tools Toggle Button (Shows/hides drawing tools on click) */}
          <button
            type="button"
            onClick={() => setShowDrawingToolbar((prev) => !prev)}
            title="Drawing Tools"
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer border ${
              showDrawingToolbar || activeDrawingTool
                ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-xs'
                : isDarkMode
                ? 'border-neutral-700/80 hover:bg-neutral-800 text-neutral-300 hover:text-white'
                : 'border-slate-300 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Draw</span>
            {drawings.length > 0 && (
              <span className="px-1 rounded-full bg-amber-500 text-black text-[9px] font-black">
                {drawings.length}
              </span>
            )}
          </button>

          {/* Reload Chart */}
          <button
            onClick={() => {
              setIsLoading(true);
              setIframeKey((prev) => prev + 1);
            }}
            title="Refresh Live Chart"
            className={`p-1 rounded transition-colors ${
              isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className={`p-1 rounded transition-colors ${
                isDarkMode ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div
          className={`absolute inset-0 top-9 flex flex-col items-center justify-center z-10 ${
            isDarkMode ? 'bg-[#121418]' : 'bg-white'
          }`}
        >
          <div className="w-6 h-6 border-2 border-[#E51937] border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs text-neutral-400 font-mono">
            Loading Real-Time Market Chart...
          </span>
        </div>
      )}

      {/* Active Drawing Tool Banner */}
      {activeDrawingTool && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 text-white flex items-center justify-between text-[11px] border-b border-blue-700/50 z-30">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
              <PenTool className="w-3 h-3" />
              {activeDrawingTool}
            </span>
            <span className="text-blue-200 hidden sm:inline">Click or drag on chart to draw</span>
          </div>
          <div className="flex items-center gap-1.5">
            {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#A855F7', '#FFFFFF'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawingColor(c)}
                style={{ backgroundColor: c }}
                className={`w-3.5 h-3.5 rounded-full cursor-pointer ${
                  drawingColor === c ? 'ring-2 ring-white scale-110' : 'opacity-75'
                }`}
              />
            ))}
            {drawings.length > 0 && (
              <button
                type="button"
                onClick={() => setDrawings([])}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1 cursor-pointer ml-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveDrawingTool(null)}
              className="p-0.5 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              title="Done Drawing"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toggleable Floating Drawing Tools Palette (Appears ONLY when user clicks the Draw icon) */}
      {showDrawingToolbar && (
        <div
          className={`absolute left-2 top-11 z-30 flex flex-col gap-1 p-1.5 rounded-xl border shadow-2xl backdrop-blur-md max-h-[calc(100%-56px)] overflow-y-auto no-scrollbar ${
            isDarkMode
              ? 'bg-[#151821]/95 border-neutral-700/80 text-neutral-200'
              : 'bg-white/95 border-slate-300 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-500/20">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0066FF]">
              Tools
            </span>
            <button
              type="button"
              onClick={() => setShowDrawingToolbar(false)}
              title="Close Drawing Tools"
              className="text-neutral-400 hover:text-rose-500 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {[
            { id: 'Trendline', label: 'Trendline', icon: TrendingUp },
            { id: 'Ray', label: 'Trend Ray', icon: CornerUpRight },
            { id: 'Horizontal', label: 'Horizontal Line', icon: Minus },
            { id: 'Vertical', label: 'Vertical Line', icon: MoveVertical },
            { id: 'CrossLine', label: 'Crosshair Line', icon: Crosshair },
            { id: 'Pitchfork', label: "Andrews' Pitchfork", icon: GitFork },
            { id: 'Retracements', label: 'Fibonacci Retracement', icon: Sliders },
            { id: 'FibExtension', label: 'Fibonacci Extension', icon: Compass },
            { id: 'LongPosition', label: 'Long Risk/Reward', icon: ArrowUpCircle },
            { id: 'ShortPosition', label: 'Short Risk/Reward', icon: ArrowDownCircle },
            { id: 'PriceRange', label: 'Price Range Ruler', icon: Ruler },
            { id: 'Brush', label: 'Freehand Brush', icon: Edit3 },
            { id: 'Rectangle', label: 'Rectangle Zone', icon: Square },
            { id: 'Ellipse', label: 'Circle / Zone', icon: Circle },
            { id: 'Triangle', label: 'Triangle Pattern', icon: Triangle },
            { id: 'HeadAndShoulders', label: 'Head & Shoulders', icon: Activity },
            { id: 'ElliottWave', label: 'Elliott Wave 1-5', icon: Zap },
            { id: 'Text', label: 'Price Label', icon: Type },
          ].map((t) => {
            const IconComp = t.icon;
            const isSelected = activeDrawingTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveDrawingTool((prev) => (prev === t.id ? null : t.id))}
                title={t.label}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isSelected ? 'bg-[#E51937] text-white shadow-sm scale-105' : 'hover:bg-neutral-500/15'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className="h-px bg-neutral-500/20 my-0.5" />

          <button
            type="button"
            onClick={() => setShowDrawingModal(true)}
            title="All 26 Drawing Tools & Categories"
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-500/15 text-[#0066FF] cursor-pointer shrink-0"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>

          {drawings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDrawings([]);
                setActiveDrawingTool(null);
              }}
              title="Clear All Drawings"
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 text-rose-500 cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Interactive Drawing Canvas Overlay */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`absolute inset-0 top-9 w-full h-[calc(100%-36px)] z-20 ${
          activeDrawingTool ? 'pointer-events-auto cursor-crosshair touch-none' : 'pointer-events-none'
        }`}
      />

      {/* TradingView Widget Iframe with Native Real-Time Scale Bid/Ask Lines */}
      <iframe
        key={iframeKey}
        src={widgetUrl}
        onLoad={() => setIsLoading(false)}
        className="w-full h-full flex-1 border-0"
        title={`TradingView Chart - ${symbol}`}
        allowFullScreen
        referrerPolicy="no-referrer"
      />

      {/* Full Categorized Drawing Tools Modal */}
      <DrawingModal
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        onSelectTool={(tool) => {
          if (tool === 'clear') {
            setDrawings([]);
            setActiveDrawingTool(null);
          } else {
            setActiveDrawingTool(tool);
          }
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
