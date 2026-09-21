import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Star,
  Maximize2,
  Minimize2,
  PenTool,
  Bell,
  ChevronDown,
  Info,
  Check,
  X,
  Trash2,
  Sliders,
  TrendingUp,
  Minus,
  MoveVertical,
  Type,
  Square,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { Instrument, Candle, Timeframe } from '../types';
import { formatPipPrice } from '../utils/pipFormatter';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { DrawingModal, PriceAlertModal } from './ChartModals';
import { QuickOrderSheet } from './QuickOrderSheet';
import { TradingViewWidget } from './TradingViewWidget';

export interface DrawnObject {
  id: string;
  tool: string;
  points: { x: number; y: number; price?: number }[];
  color: string;
  text?: string;
}

interface InstrumentDetailViewProps {
  instrument: Instrument;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onBack: () => void;
  onToggleFavorite: (symbol: string) => void;
  onExecuteTrade: (params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    lots: number;
    sl: number | null;
    tp: number | null;
  }) => void;
  isDarkMode?: boolean;
}

export const InstrumentDetailView: React.FC<InstrumentDetailViewProps> = ({
  instrument,
  candles,
  timeframe,
  onTimeframeChange,
  onBack,
  onToggleFavorite,
  onExecuteTrade,
  isDarkMode = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [quickOrderSide, setQuickOrderSide] = useState<'BUY' | 'SELL' | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<'info'>('info');

  // Interactive Drawing Engine State
  const [drawings, setDrawings] = useState<DrawnObject[]>([]);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState<string>('#3B82F6');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [tempPoints, setTempPoints] = useState<{ x: number; y: number }[]>([]);
  const [drawingNotification, setDrawingNotification] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Timeframe chips matching HFM video: 1D, 5D, 2W, 3M, 6M, M30
  const timeframes = ['1D', '5D', '2W', '3M', '6M'];

  const bidParts = formatPipPrice(instrument.bid, instrument.decimals);
  const askParts = formatPipPrice(instrument.ask, instrument.decimals);
  const spreadDisplay = Math.round(instrument.spread * 10) || Math.round(instrument.spread) || 21;

  // Handle pointer coordinate extraction
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer Down (Start Drawing)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeDrawingTool) return;
    const { x, y } = getCanvasCoords(e);

    if (activeDrawingTool === 'Horizontal') {
      // Direct single click horizontal ray
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: 'Horizontal',
        points: [{ x, y }],
        color: drawingColor,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setDrawingNotification(`Placed Horizontal Line @ ${instrument.bid.toFixed(instrument.decimals)}`);
      setTimeout(() => setDrawingNotification(null), 2000);
      return;
    }

    if (activeDrawingTool === 'Vertical') {
      // Direct single click vertical line
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: 'Vertical',
        points: [{ x, y }],
        color: drawingColor,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setDrawingNotification('Placed Vertical Time Marker');
      setTimeout(() => setDrawingNotification(null), 2000);
      return;
    }

    if (activeDrawingTool === 'Text') {
      const text = prompt('Enter annotation text:', 'Key Level') || 'Key Level';
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: 'Text',
        points: [{ x, y }],
        color: drawingColor,
        text,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      return;
    }

    // Two-point drawing tools (Trendline, Arrowed, Rectangle, Fibonacci, Ellipse, Equidistant, Harmonics)
    setIsDrawing(true);
    setTempPoints([{ x, y }, { x, y }]);
  };

  // Pointer Move (Drag Preview)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeDrawingTool || tempPoints.length === 0) return;
    const { x, y } = getCanvasCoords(e);
    setTempPoints([tempPoints[0], { x, y }]);
  };

  // Pointer Up (Finalize Drawing)
  const handlePointerUp = () => {
    if (!isDrawing || !activeDrawingTool || tempPoints.length < 2) {
      setIsDrawing(false);
      setTempPoints([]);
      return;
    }

    const [p1, p2] = tempPoints;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    if (dist > 5) {
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: activeDrawingTool,
        points: [p1, p2],
        color: drawingColor,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setDrawingNotification(`Added ${activeDrawingTool} drawing`);
      setTimeout(() => setDrawingNotification(null), 2000);
    }

    setIsDrawing(false);
    setTempPoints([]);
  };

  // Select tool handler from modal
  const handleSelectDrawingTool = (tool: string) => {
    if (tool === 'clear') {
      setDrawings([]);
      setActiveDrawingTool(null);
      setDrawingNotification('Cleared all drawings');
      setTimeout(() => setDrawingNotification(null), 2000);
    } else {
      setActiveDrawingTool(tool);
      setDrawingNotification(`Selected ${tool}: Drag or click on chart to place`);
      setTimeout(() => setDrawingNotification(null), 3000);
    }
  };

  // Render high performance candlestick chart on HTML5 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = isDarkMode ? '#111317' : '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (!candles || candles.length === 0) return;

    // Price scale boundaries
    const visibleCandles = candles.slice(-55);
    const highs = visibleCandles.map((c) => c.high);
    const lows = visibleCandles.map((c) => c.low);
    const minPrice = Math.min(...lows, instrument.bid * 0.999);
    const maxPrice = Math.max(...highs, instrument.ask * 1.001);
    const priceRange = maxPrice - minPrice || 1;

    const paddingY = 28;
    const chartHeight = height - paddingY * 2;
    const paddingRight = 72; // Wide enough for exact currency digits & spread badge
    const chartWidth = width - paddingRight;

    // Helper to map price to Y coordinate
    const priceToY = (price: number) => paddingY + chartHeight * (1 - (price - minPrice) / priceRange);

    // Draw horizontal dashed gridlines & price axis labels
    const gridLines = 5;
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, system-ui, sans-serif';

    for (let i = 0; i <= gridLines; i++) {
      const y = paddingY + (chartHeight / gridLines) * i;
      const price = maxPrice - (priceRange / gridLines) * i;

      // Dashed grid line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Right axis price text
      ctx.setLineDash([]);
      ctx.fillStyle = isDarkMode ? '#9CA3AF' : '#6B7280';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(instrument.decimals), chartWidth + 6, y + 3);
    }

    // Draw Candlesticks
    const candleWidth = Math.max(3, (chartWidth / visibleCandles.length) * 0.65);
    const candleSpacing = chartWidth / visibleCandles.length;

    visibleCandles.forEach((c, idx) => {
      const x = idx * candleSpacing + candleSpacing / 2;
      const isBullish = c.close >= c.open;

      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);
      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);

      const color = isBullish ? '#22C55E' : '#E51937';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Candle Wick
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Candle Body
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);
    });

    // RENDER USER DRAWINGS (Persistent overlay)
    const allDrawings = [...drawings];
    if (isDrawing && tempPoints.length === 2 && activeDrawingTool) {
      allDrawings.push({
        id: 'preview',
        tool: activeDrawingTool,
        points: tempPoints,
        color: drawingColor,
      });
    }

    allDrawings.forEach((draw) => {
      ctx.save();
      ctx.strokeStyle = draw.color;
      ctx.fillStyle = draw.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      const pts = draw.points;
      if (!pts || pts.length === 0) {
        ctx.restore();
        return;
      }

      if (draw.tool === 'Horizontal') {
        const y = pts[0].y;
        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Level tag
        ctx.fillStyle = draw.color;
        ctx.fillRect(chartWidth + 2, y - 8, 68, 16);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        const pVal = maxPrice - ((y - paddingY) / chartHeight) * priceRange;
        ctx.fillText(pVal.toFixed(instrument.decimals), chartWidth + 36, y + 3.5);
      } else if (draw.tool === 'Vertical') {
        const x = pts[0].x;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(x, paddingY);
        ctx.lineTo(x, height - paddingY);
        ctx.stroke();
      } else if (draw.tool === 'Trendline' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        // End circles
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 3.5, 0, Math.PI * 2);
        ctx.arc(pts[1].x, pts[1].y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (draw.tool === 'Arrowed' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Arrow head
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

        ctx.fillStyle = draw.color.includes('rgba') ? draw.color : `${draw.color}25`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (draw.tool === 'Retracements' && pts.length >= 2) {
        // Fibonacci Retracements (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%)
        const [p1, p2] = pts;
        const topY = Math.min(p1.y, p2.y);
        const botY = Math.max(p1.y, p2.y);
        const diffY = botY - topY;

        const fibLevels = [
          { ratio: 0.0, label: '0.0%', col: '#787B86' },
          { ratio: 0.236, label: '23.6%', col: '#F23645' },
          { ratio: 0.382, label: '38.2%', col: '#FF9800' },
          { ratio: 0.5, label: '50.0%', col: '#4CAF50' },
          { ratio: 0.618, label: '61.8%', col: '#089981' },
          { ratio: 0.786, label: '78.6%', col: '#2962FF' },
          { ratio: 1.0, label: '100.0%', col: '#787B86' },
        ];

        fibLevels.forEach((fib) => {
          const ly = topY + diffY * fib.ratio;
          ctx.beginPath();
          ctx.strokeStyle = fib.col;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.moveTo(Math.min(p1.x, p2.x), ly);
          ctx.lineTo(chartWidth, ly);
          ctx.stroke();

          ctx.fillStyle = fib.col;
          ctx.font = '9px monospace';
          ctx.fillText(`Fib ${fib.label}`, chartWidth - 55, ly - 2);
        });
      } else if (draw.tool === 'Ellipse' && pts.length >= 2) {
        const [p1, p2] = pts;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;

        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx, 4), Math.max(ry, 4), 0, 0, Math.PI * 2);
        ctx.fillStyle = `${draw.color}20`;
        ctx.fill();
        ctx.stroke();
      } else if (draw.tool === 'Equidistant' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y + 24);
        ctx.lineTo(p2.x, p2.y + 24);
        ctx.stroke();
      } else if (draw.tool === 'Text' && pts.length >= 1) {
        const p = pts[0];
        ctx.fillStyle = draw.color;
        ctx.fillRect(p.x - 2, p.y - 12, (draw.text?.length || 4) * 7 + 10, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(draw.text || 'Label', p.x + 3, p.y + 1);
      }

      ctx.restore();
    });

    // DRAW LIVE EXACT BID & ASK PRICES AND SPREAD (TRADINGVIEW FIDELITY)
    const liveBid = instrument.bid;
    const liveAsk = instrument.ask;
    const bidY = priceToY(liveBid);
    const askY = priceToY(liveAsk);
    const spreadInPoints = Math.round(
      instrument.spread > 5 ? instrument.spread : (liveAsk - liveBid) * instrument.pipMultiplier
    );

    // 1. Draw Bid Line (Red / Sell Price)
    if (bidY >= paddingY && bidY <= paddingY + chartHeight) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#E51937';
      ctx.lineWidth = 1.25;
      ctx.moveTo(0, bidY);
      ctx.lineTo(chartWidth, bidY);
      ctx.stroke();

      // Right price tag badge (SELL / BID)
      ctx.setLineDash([]);
      ctx.fillStyle = '#E51937';
      ctx.beginPath();
      ctx.roundRect(chartWidth + 2, bidY - 8, 68, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(liveBid.toFixed(instrument.decimals), chartWidth + 36, bidY + 3.5);
    }

    // 2. Draw Ask Line (Blue / Buy Price)
    if (askY >= paddingY && askY <= paddingY + chartHeight) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.25;
      ctx.moveTo(0, askY);
      ctx.lineTo(chartWidth, askY);
      ctx.stroke();

      // Right price tag badge (BUY / ASK)
      ctx.setLineDash([]);
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.roundRect(chartWidth + 2, askY - 8, 68, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(liveAsk.toFixed(instrument.decimals), chartWidth + 36, askY + 3.5);
    }

    // 3. Draw Visual Spread Zone between Bid and Ask on Chart
    const spreadTopY = Math.min(bidY, askY);
    const spreadHeight = Math.max(Math.abs(bidY - askY), 3);
    ctx.fillStyle = isDarkMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(0, spreadTopY, chartWidth, spreadHeight);

    // Spread bracket tag on right axis
    const spreadMidY = (bidY + askY) / 2;
    if (spreadMidY >= paddingY && spreadMidY <= paddingY + chartHeight) {
      ctx.fillStyle = isDarkMode ? '#1E222B' : '#F1F5F9';
      ctx.strokeStyle = isDarkMode ? '#374151' : '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chartWidth + 4, spreadMidY - 7, 64, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDarkMode ? '#F87171' : '#DC2626';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`SPR: ${spreadInPoints} pts`, chartWidth + 36, spreadMidY + 3);
    }
  }, [candles, instrument, isDarkMode, drawings, isDrawing, tempPoints, activeDrawingTool, drawingColor]);

  // Market Specs
  const specs = [
    { label: 'Trading Hours', value: '00:02-24:00' },
    { label: 'Pip Size', value: `0.00010 (${instrument.decimals} digits)` },
    { label: 'Lot Size', value: instrument.category === 'Forex' ? '100,000' : '100' },
    { label: 'Minimum price change', value: (1 / instrument.pipMultiplier).toFixed(5) },
    { label: 'Minimum trade volume', value: '0.01' },
    { label: 'Maximum trade volume', value: '60' },
    { label: 'Maximum total trade volume', value: '200' },
    { label: 'Stop levels', value: '0 points' },
    { label: 'Swap long', value: '-3.5' },
    { label: 'Swap short', value: '-4.1' },
    { label: '3 Days swaps', value: 'Wednesday' },
  ];

  const marketStatus = checkInstrumentMarketHours(instrument.symbol, instrument.category);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const handleOpenTrade = (side: 'BUY' | 'SELL') => {
    if (!marketStatus.isOpen) {
      setClosedNotice(`Market is CLOSED for ${instrument.symbol}: ${marketStatus.reason}. (Crypto trades 24/7 unbroken).`);
      setTimeout(() => setClosedNotice(null), 4500);
      return;
    }
    setQuickOrderSide(side);
  };

  return (
    <div
      id="instrument-detail-screen"
      ref={containerRef}
      className={`min-h-[calc(100vh-100px)] flex flex-col pb-12 transition-colors duration-200 select-none ${
        isDarkMode ? 'bg-[#111317] text-white' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Market Closed Banner Notice */}
      {!marketStatus.isOpen && (
        <div className="mx-3 mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Market Closed: {marketStatus.reason} {marketStatus.nextOpenTime ? `(Reopens ${marketStatus.nextOpenTime})` : ''}</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-200 font-bold">Trading Suspended</span>
        </div>
      )}

      {closedNotice && (
        <div className="mx-3 mt-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-md">
          <span>⚠️ {closedNotice}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div
        className={`px-4 py-2.5 flex items-center justify-between border-b ${
          isDarkMode ? 'border-neutral-800' : 'border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Back to Markets"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight">{instrument.symbol}</h1>
              <button
                onClick={() => onToggleFavorite(instrument.symbol)}
                className="cursor-pointer"
                title="Favorite"
              >
                <Star
                  className={`w-4 h-4 ${
                    instrument.isFavorite
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-400'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">
              {instrument.name}
            </p>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setDrawingNotification(
                'Drawing toolbar is active on the left side of the chart! Click any tool to draw directly on candles.'
              );
              setTimeout(() => setDrawingNotification(null), 4000);
            }}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
            title="Drawing Tools (Available on left toolbar)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Price Alerts */}
          <button
            onClick={() => setShowPriceAlertModal(true)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-400 text-[#E51937] hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Floating Active Drawing Toolbar (When a tool is active) */}
      {activeDrawingTool && (
        <div className="px-3 py-2 bg-gradient-to-r from-blue-900/90 to-indigo-900/90 text-white flex items-center justify-between text-xs shadow-md border-b border-blue-700/50 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-bold bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
              <PenTool className="w-3 h-3" />
              {activeDrawingTool}
            </span>
            <span className="text-[11px] text-blue-200 hidden sm:inline">
              Click or drag on chart canvas to place
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Color Picker */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-md">
              {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#FFFFFF'].map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawingColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                    drawingColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            {drawings.length > 0 && (
              <button
                onClick={() => setDrawings([])}
                className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[11px] font-medium flex items-center gap-1"
                title="Clear all drawings"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear ({drawings.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveDrawingTool(null)}
              className="p-1 rounded bg-white/20 hover:bg-white/30 text-white"
              title="Exit Drawing Mode"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification */}
      {drawingNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-neutral-700 pointer-events-none flex items-center gap-1.5 animate-fadeIn">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>{drawingNotification}</span>
        </div>
      )}

      {/* Main Chart Viewport: Real-Time Live Chart */}
      <div
        className={`relative w-full transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#111317] h-screen'
            : 'h-[380px] sm:h-[440px] md:h-[480px]'
        } bg-transparent`}
      >
        <TradingViewWidget
          symbol={instrument.symbol}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          isDarkMode={isDarkMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          bid={instrument.bid}
          ask={instrument.ask}
          spread={instrument.spread}
          decimals={instrument.decimals}
          pipMultiplier={instrument.pipMultiplier}
        />
      </div>

      {/* Timeframe Chips Bar */}
      <div
        className={`px-3 py-2 border-y flex items-center justify-between text-xs font-semibold ${
          isDarkMode ? 'border-neutral-800 bg-neutral-900/40' : 'border-neutral-200 bg-neutral-50/60'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf as Timeframe)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                timeframe === tf || (tf === '1D' && timeframe === '15M')
                  ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-bold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-neutral-400">
          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">
            M30
          </span>
          <Maximize2
            className="w-4 h-4 cursor-pointer"
            onClick={() => setIsFullscreen(!isFullscreen)}
          />
        </div>
      </div>

      {/* Sticky Dual Trading Bar: SELL | SPREAD | BUY with exact TradingView quotes & big pips */}
      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Red Sell Button */}
          <button
            onClick={() => handleOpenTrade('SELL')}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-all shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-neutral-700/80 cursor-not-allowed opacity-75'
                : 'bg-[#E51937] hover:bg-[#c9142f] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-90 mb-0.5">
              {!marketStatus.isOpen ? '🔒 Closed' : 'Sell'}
            </span>
            <div className="flex items-baseline justify-center leading-none whitespace-nowrap overflow-hidden max-w-full">
              {bidParts.isForex ? (
                <>
                  <span className="text-xs sm:text-sm font-medium">{bidParts.base}</span>
                  <span className="text-lg sm:text-xl font-black">{bidParts.bigPips}</span>
                  <span className="text-[10px] sm:text-xs font-medium align-super">{bidParts.fractional}</span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight">
                  {bidParts.fullFormatted}
                </span>
              )}
            </div>
          </button>

          {/* Center Spread Badge */}
          <div
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-center border shadow-xs min-w-[54px] ${
              isDarkMode
                ? 'bg-neutral-800/90 border-neutral-700 text-neutral-300'
                : 'bg-white border-neutral-300 text-neutral-700'
            }`}
          >
            <span className="text-[9px] block text-neutral-400 font-normal">
              Spread
            </span>
            <span className="font-mono text-emerald-500 font-extrabold">{spreadDisplay}</span>
          </div>

          {/* Green Buy Button */}
          <button
            onClick={() => handleOpenTrade('BUY')}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-all shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-neutral-700/80 cursor-not-allowed opacity-75'
                : 'bg-[#22C55E] hover:bg-[#16A34A] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-90 mb-0.5">
              {!marketStatus.isOpen ? '🔒 Closed' : 'Buy'}
            </span>
            <div className="flex items-baseline justify-center leading-none whitespace-nowrap overflow-hidden max-w-full">
              {askParts.isForex ? (
                <>
                  <span className="text-xs sm:text-sm font-medium">{askParts.base}</span>
                  <span className="text-lg sm:text-xl font-black">{askParts.bigPips}</span>
                  <span className="text-[10px] sm:text-xs font-medium align-super">{askParts.fractional}</span>
                </>
              ) : (
                <span className="text-sm sm:text-base font-bold font-mono tracking-tight">
                  {askParts.fullFormatted}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Market Info Tab & Specs */}
      <div className="px-4 pt-1">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
          <button className="text-sm font-bold pb-2 relative text-neutral-900 dark:text-white">
            <span>Market Info & Specifications</span>
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E51937] rounded-full" />
          </button>
        </div>

        {/* Specs Table */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 text-[13px]">
          {specs.map((item) => (
            <div key={item.label} className="py-2.5 flex items-center justify-between">
              <span className="text-neutral-500">{item.label}:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <DrawingModal
        isOpen={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        onSelectTool={handleSelectDrawingTool}
        isDarkMode={isDarkMode}
      />

      <PriceAlertModal
        isOpen={showPriceAlertModal}
        onClose={() => setShowPriceAlertModal(false)}
        instrument={instrument}
        onSetAlert={() => {}}
        isDarkMode={isDarkMode}
      />

      {quickOrderSide && (
        <QuickOrderSheet
          isOpen={true}
          onClose={() => setQuickOrderSide(null)}
          instrument={instrument}
          side={quickOrderSide}
          onExecute={onExecuteTrade}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
