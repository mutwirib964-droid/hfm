import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Crosshair,
  GitFork,
  Compass,
  ArrowUpCircle,
  ArrowDownCircle,
  Ruler,
  Edit3,
  Triangle,
  MessageSquare,
  Activity,
  Zap,
  CornerUpRight,
} from 'lucide-react';
import { Instrument, Candle, Timeframe, ChartType } from '../types';
import { formatPipPrice } from '../utils/pipFormatter';
import { checkInstrumentMarketHours } from '../utils/marketHours';
import { DrawingModal, PriceAlertModal } from './ChartModals';
import { QuickOrderSheet } from './QuickOrderSheet';
import { TradingViewWidget } from './TradingViewWidget';
import { generateCandles } from '../data/initialData';

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
  tickDirection?: 'UP' | 'DOWN' | 'NEUTRAL';
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
  tickDirection = 'NEUTRAL',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [quickOrderSide, setQuickOrderSide] = useState<'BUY' | 'SELL' | null>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<'info'>('info');
  const [chartType, setChartType] = useState<ChartType>('candles');

  const effectiveCandles = useMemo(() => {
    if (candles && candles.length > 0) {
      const lastClose = candles[candles.length - 1].close;
      const maxDiff = instrument.bid > 1000 ? 5 : instrument.bid > 10 ? 1 : 0.001;
      if (Math.abs(lastClose - instrument.bid) <= maxDiff) {
        return candles;
      }
    }
    return generateCandles(instrument.bid, timeframe, 80, instrument.decimals);
  }, [candles, instrument.bid, timeframe, instrument.decimals]);

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

  const isForex = instrument.category === 'Forex';
  const bidParts = formatPipPrice(instrument.bid, instrument.decimals, isForex);
  const askParts = formatPipPrice(instrument.ask, instrument.decimals, isForex);
  const spreadDisplay = useMemo(() => {
    const s =
      instrument.spread > 0 && instrument.spread <= 1.2
        ? instrument.spread
        : Math.min(1.2, Math.max(0.18, Math.abs(instrument.ask - instrument.bid)));
    return s.toFixed(2);
  }, [instrument.ask, instrument.bid, instrument.spread]);

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

    if (activeDrawingTool === 'Horizontal' || activeDrawingTool === 'HorizontalRay' || activeDrawingTool === 'CrossLine') {
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: activeDrawingTool,
        points: [{ x, y }],
        color: drawingColor,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setDrawingNotification(`Placed ${activeDrawingTool} @ ${instrument.bid.toFixed(instrument.decimals)}`);
      setTimeout(() => setDrawingNotification(null), 2000);
      return;
    }

    if (activeDrawingTool === 'Vertical') {
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

    if (activeDrawingTool === 'Text' || activeDrawingTool === 'Callout') {
      const text = `Key Level @ ${instrument.bid.toFixed(instrument.decimals)}`;
      const newDrawing: DrawnObject = {
        id: `draw-${Date.now()}`,
        tool: activeDrawingTool,
        points: [{ x, y }],
        color: drawingColor,
        text,
      };
      setDrawings((prev) => [...prev, newDrawing]);
      setDrawingNotification(`Added ${activeDrawingTool}: ${text}`);
      setTimeout(() => setDrawingNotification(null), 2000);
      return;
    }

    // Two-point or freehand drawing tools
    setIsDrawing(true);
    setTempPoints([{ x, y }, { x, y }]);
  };

  // Pointer Move (Drag Preview)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !activeDrawingTool || tempPoints.length === 0) return;
    const { x, y } = getCanvasCoords(e);
    if (activeDrawingTool === 'Brush') {
      setTempPoints((prev) => [...prev, { x, y }]);
    } else {
      setTempPoints([tempPoints[0], { x, y }]);
    }
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

  // Render user drawings on transparent HTML5 canvas overlay over the live chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Transparent clear so live TradingView chart underneath remains 100% visible
    ctx.clearRect(0, 0, width, height);

    const visibleCandles = (effectiveCandles && effectiveCandles.length > 0 ? effectiveCandles : candles).slice(-55);
    const highs = visibleCandles.length > 0 ? visibleCandles.map((c) => c.high) : [instrument.ask * 1.002];
    const lows = visibleCandles.length > 0 ? visibleCandles.map((c) => c.low) : [instrument.bid * 0.998];
    const minPrice = Math.min(...lows, instrument.bid * 0.999);
    const maxPrice = Math.max(...highs, instrument.ask * 1.001);
    const priceRange = maxPrice - minPrice || 1;

    const paddingY = 28;
    const chartHeight = Math.max(100, height - paddingY * 2);
    const paddingRight = 64;
    const chartWidth = Math.max(100, width - paddingRight);

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
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);

      const pts = draw.points;
      if (!pts || pts.length === 0) {
        ctx.restore();
        return;
      }

      if (draw.tool === 'Horizontal') {
        const y = pts[0].y;
        ctx.beginPath();
        ctx.setLineDash([6, 4]);
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Level tag
        ctx.setLineDash([]);
        ctx.fillStyle = draw.color;
        ctx.fillRect(chartWidth - 2, y - 9, 64, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        const pVal = maxPrice - ((y - paddingY) / chartHeight) * priceRange;
        ctx.fillText(pVal.toFixed(instrument.decimals), chartWidth + 30, y + 3.5);
      } else if (draw.tool === 'HorizontalRay') {
        const { x, y } = pts[0];
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(x, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = draw.color;
        ctx.fillRect(chartWidth - 2, y - 9, 64, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        const pVal = maxPrice - ((y - paddingY) / chartHeight) * priceRange;
        ctx.fillText(pVal.toFixed(instrument.decimals), chartWidth + 30, y + 3.5);
      } else if (draw.tool === 'CrossLine') {
        const { x, y } = pts[0];
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = draw.color;
        ctx.fillRect(chartWidth - 2, y - 9, 64, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        const pVal = maxPrice - ((y - paddingY) / chartHeight) * priceRange;
        ctx.fillText(pVal.toFixed(instrument.decimals), chartWidth + 30, y + 3.5);
      } else if (draw.tool === 'Vertical') {
        const x = pts[0].x;
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(x, 36);
        ctx.lineTo(x, height - 10);
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
        const dy = p2.y - p1.y;
        const slope = dy / dx;
        const endX = dx >= 0 ? chartWidth : 0;
        const endY = p1.y + slope * (endX - p1.x);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
        ctx.arc(p2.x, p2.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (draw.tool === 'Brush' && pts.length >= 2) {
        ctx.beginPath();
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
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

        ctx.fillStyle = draw.color.includes('rgba') ? draw.color : `${draw.color}28`;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (draw.tool === 'Triangle' && pts.length >= 2) {
        const [p1, p2] = pts;
        const p3 = { x: p1.x, y: p2.y };
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, (p1.y + p2.y) / 2);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fillStyle = `${draw.color}24`;
        ctx.fill();
        ctx.stroke();
      } else if ((draw.tool === 'Retracements' || draw.tool === 'FibExtension') && pts.length >= 2) {
        const [p1, p2] = pts;
        const topY = Math.min(p1.y, p2.y);
        const botY = Math.max(p1.y, p2.y);
        const diffY = botY - topY;

        const fibLevels =
          draw.tool === 'FibExtension'
            ? [
                { ratio: 0.0, label: '0.0%', col: '#94A3B8' },
                { ratio: 0.382, label: '38.2%', col: '#FF9800' },
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
                { ratio: 0.786, label: '78.6%', col: '#2962FF' },
                { ratio: 1.0, label: '100.0%', col: '#94A3B8' },
              ];

        fibLevels.forEach((fib) => {
          const ly = topY + diffY * fib.ratio;
          ctx.beginPath();
          ctx.strokeStyle = fib.col;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.moveTo(Math.min(p1.x, p2.x), ly);
          ctx.lineTo(chartWidth, ly);
          ctx.stroke();

          ctx.fillStyle = fib.col;
          ctx.font = 'bold 9.5px monospace';
          ctx.fillText(`Fib ${fib.label}`, chartWidth - 62, ly - 3);
        });
      } else if (draw.tool === 'FibFan' && pts.length >= 2) {
        const [p1, p2] = pts;
        const ratios = [
          { r: 0.382, label: '38.2%', col: '#F59E0B' },
          { r: 0.5, label: '50.0%', col: '#10B981' },
          { r: 0.618, label: '61.8%', col: '#3B82F6' },
          { r: 0.786, label: '78.6%', col: '#A855F7' },
        ];
        ratios.forEach((f) => {
          const targetY = p1.y + (p2.y - p1.y) * f.r;
          ctx.beginPath();
          ctx.strokeStyle = f.col;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, targetY);
          ctx.stroke();
          ctx.fillStyle = f.col;
          ctx.font = 'bold 9px monospace';
          ctx.fillText(f.label, p2.x + 4, targetY + 3);
        });
      } else if (draw.tool === 'FibTimeZones' && pts.length >= 2) {
        const [p1, p2] = pts;
        const baseStep = Math.max(12, Math.abs(p2.x - p1.x));
        const fibNums = [0, 1, 2, 3, 5, 8, 13];
        fibNums.forEach((fn) => {
          const vx = p1.x + fn * (baseStep * 0.35);
          if (vx < chartWidth) {
            ctx.beginPath();
            ctx.setLineDash([3, 3]);
            ctx.moveTo(vx, 20);
            ctx.lineTo(vx, height - 12);
            ctx.stroke();
            ctx.fillStyle = draw.color;
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`TZ ${fn}`, vx + 2, 32);
          }
        });
      } else if ((draw.tool === 'LongPosition' || draw.tool === 'ShortPosition') && pts.length >= 2) {
        const [p1, p2] = pts;
        const isLong = draw.tool === 'LongPosition';
        const leftX = Math.min(p1.x, p2.x);
        const boxW = Math.max(85, Math.abs(p2.x - p1.x));
        const entryY = p1.y;
        const distY = Math.max(28, Math.abs(p2.y - p1.y));
        const tpHeight = distY;
        const slHeight = distY * 0.5;

        const tpTop = isLong ? entryY - tpHeight : entryY;
        const slTop = isLong ? entryY : entryY - slHeight;

        // Profit Box (Green)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
        ctx.strokeStyle = '#10B981';
        ctx.fillRect(leftX, tpTop, boxW, tpHeight);
        ctx.strokeRect(leftX, tpTop, boxW, tpHeight);

        // Stop Loss Box (Red)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
        ctx.strokeStyle = '#EF4444';
        ctx.fillRect(leftX, slTop, boxW, slHeight);
        ctx.strokeRect(leftX, slTop, boxW, slHeight);

        // Entry Line & Badge
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(leftX, entryY);
        ctx.lineTo(leftX + boxW, entryY);
        ctx.stroke();

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

        const price1 = maxPrice - ((p1.y - paddingY) / chartHeight) * priceRange;
        const price2 = maxPrice - ((p2.y - paddingY) / chartHeight) * priceRange;
        const delta = price2 - price1;
        const pct = price1 > 0 ? (delta / price1) * 100 : 0;
        const badgeText = `${delta >= 0 ? '+' : ''}${delta.toFixed(instrument.decimals)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(rx + rw / 2 - 58, ry + rh / 2 - 10, 116, 20);
        ctx.fillStyle = delta >= 0 ? '#34D399' : '#F87171';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, rx + rw / 2, ry + rh / 2 + 3.5);
      } else if (draw.tool === 'Ellipse' && pts.length >= 2) {
        const [p1, p2] = pts;
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const rx = Math.abs(p2.x - p1.x) / 2;
        const ry = Math.abs(p2.y - p1.y) / 2;

        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx, 4), Math.max(ry, 4), 0, 0, Math.PI * 2);
        ctx.fillStyle = `${draw.color}25`;
        ctx.fill();
        ctx.stroke();
      } else if (draw.tool === 'Equidistant' && pts.length >= 2) {
        const [p1, p2] = pts;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y + 32);
        ctx.lineTo(p2.x, p2.y + 32);
        ctx.stroke();
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(p1.x, p1.y + 16);
        ctx.lineTo(p2.x, p2.y + 16);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (draw.tool === 'Pitchfork' && pts.length >= 2) {
        const [p1, p2] = pts;
        const spreadY = 30;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x, p1.y - spreadY);
        ctx.lineTo(p2.x, p2.y - spreadY);
        ctx.moveTo(p1.x, p1.y + spreadY);
        ctx.lineTo(p2.x, p2.y + spreadY);
        ctx.moveTo(p1.x, p1.y - spreadY);
        ctx.lineTo(p1.x, p1.y + spreadY);
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
        const wavePts =
          draw.tool === 'HeadAndShoulders'
            ? [
                { x: p1.x, y: p1.y, lbl: 'L' },
                { x: p1.x + dx * 0.2, y: p1.y - Math.abs(dy) * 0.45, lbl: 'LS' },
                { x: p1.x + dx * 0.38, y: p1.y, lbl: 'N1' },
                { x: p1.x + dx * 0.52, y: p1.y - Math.abs(dy) * 0.85, lbl: 'HEAD' },
                { x: p1.x + dx * 0.68, y: p1.y, lbl: 'N2' },
                { x: p1.x + dx * 0.84, y: p1.y - Math.abs(dy) * 0.45, lbl: 'RS' },
                { x: p2.x, y: p1.y + Math.abs(dy) * 0.1, lbl: 'R' },
              ]
            : draw.tool === 'ElliottWave'
            ? [
                { x: p1.x, y: p1.y, lbl: '(0)' },
                { x: p1.x + dx * 0.2, y: p1.y + dy * 0.45, lbl: '(1)' },
                { x: p1.x + dx * 0.36, y: p1.y + dy * 0.2, lbl: '(2)' },
                { x: p1.x + dx * 0.62, y: p1.y + dy * 0.85, lbl: '(3)' },
                { x: p1.x + dx * 0.78, y: p1.y + dy * 0.55, lbl: '(4)' },
                { x: p2.x, y: p2.y, lbl: '(5)' },
              ]
            : [
                { x: p1.x, y: p1.y, lbl: 'X' },
                { x: p1.x + dx * 0.33, y: p2.y, lbl: 'A' },
                { x: p1.x + dx * 0.66, y: p1.y + dy * 0.35, lbl: 'B' },
                { x: p2.x, y: p2.y, lbl: 'C/D' },
              ];
        ctx.beginPath();
        wavePts.forEach((wp, idx) => {
          if (idx === 0) ctx.moveTo(wp.x, wp.y);
          else ctx.lineTo(wp.x, wp.y);
        });
        ctx.stroke();
        ctx.fillStyle = `${draw.color}20`;
        ctx.fill();
        wavePts.forEach((wp) => {
          ctx.fillStyle = draw.color;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(wp.lbl, wp.x - 4, wp.y - 6);
        });
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
  }, [candles, effectiveCandles, instrument, isDarkMode, drawings, isDrawing, tempPoints, activeDrawingTool, drawingColor]);

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
      {/* Market Closed Banner Notice (High Visibility in both Light & Dark modes) */}
      {!marketStatus.isOpen && (
        <div
          className={`mx-3 mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs transition-colors ${
            isDarkMode
              ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate">
              Market Closed: {marketStatus.reason} {marketStatus.nextOpenTime ? `(Reopens ${marketStatus.nextOpenTime})` : ''}
            </span>
          </div>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 border uppercase tracking-wider ${
              isDarkMode
                ? 'bg-amber-500/25 border-amber-500/40 text-amber-200'
                : 'bg-amber-200/90 border-amber-400 text-amber-950'
            }`}
          >
            Trading Suspended
          </span>
        </div>
      )}

      {closedNotice && (
        <div
          className={`mx-3 mt-2 p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-xs ${
            isDarkMode
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
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
            onClick={() => setShowDrawingToolbar((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
              showDrawingToolbar || activeDrawingTool
                ? 'border-[#0066FF] bg-[#0066FF]/15 text-[#0066FF]'
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400'
            }`}
            title="Toggle Drawing Tools"
          >
            <PenTool className="w-4 h-4" />
            <span className="text-[11px] font-bold hidden sm:inline">Draw</span>
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

      {/* Main Chart Viewport: Official TradingView Interactive Live Chart + Interactive Drawing Canvas & Left Toolbar */}
      <div
        className={`relative w-full transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#111317] h-screen'
            : 'h-[440px] sm:h-[500px] md:h-[560px]'
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
          tickDirection={tickDirection}
        />

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

        {/* Toggleable Quick Drawing Toolbar on Left Side of Chart (Only appears when Drawing Tool icon is clicked) */}
        {showDrawingToolbar && (
          <div
            className={`absolute left-2 top-11 z-30 flex flex-col gap-1 p-1.5 rounded-xl border shadow-2xl backdrop-blur-md animate-fadeIn max-h-[calc(100%-56px)] overflow-y-auto no-scrollbar ${
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
                title="Hide Drawing Toolbar"
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
                  onClick={() =>
                    setActiveDrawingTool((prev) => (prev === t.id ? null : t.id))
                  }
                  title={t.label}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#E51937] text-white shadow-sm scale-105'
                      : 'hover:bg-neutral-500/15'
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
            disabled={!marketStatus.isOpen}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-colors shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-[#C5192D]/85 border border-red-900/60 opacity-85 cursor-not-allowed'
                : 'bg-[#E51937] hover:bg-[#c9142f] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-95 mb-0.5 flex items-center gap-1">
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
            disabled={!marketStatus.isOpen}
            className={`py-2.5 px-2 rounded-2xl active:scale-[0.98] text-white flex flex-col items-center justify-center transition-colors shadow-sm min-w-0 ${
              !marketStatus.isOpen
                ? 'bg-[#007A4A]/85 border border-emerald-900/60 opacity-85 cursor-not-allowed'
                : 'bg-[#22C55E] hover:bg-[#16A34A] cursor-pointer'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-95 mb-0.5 flex items-center gap-1">
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
