import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  BellRing,
  X,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  History,
  Trash2,
  Volume2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Clock,
  Sparkles,
  Tag,
  Zap,
} from 'lucide-react';
import { Instrument, PriceAlert } from '../types';
import { playAlertChime, calculateAlertDistance } from '../utils/priceAlertStorage';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: Instrument[];
  selectedSymbol?: string;
  alerts: PriceAlert[];
  onCreateAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  onDeleteAlert: (id: string) => void;
  onClearTriggeredAlerts: () => void;
  onReArmAlert: (id: string) => void;
  onTestTriggerAlert?: (alert: PriceAlert) => void;
  isDarkMode: boolean;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  instruments,
  selectedSymbol = 'EURUSD',
  alerts,
  onCreateAlert,
  onDeleteAlert,
  onClearTriggeredAlerts,
  onReArmAlert,
  onTestTriggerAlert,
  isDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'history'>('create');
  const [symbol, setSymbol] = useState<string>(selectedSymbol);
  const [targetType, setTargetType] = useState<'BID' | 'ASK'>('BID');
  const [priceInput, setPriceInput] = useState<string>('');
  const [condition, setCondition] = useState<'ABOVE_OR_EQUAL' | 'BELOW_OR_EQUAL'>('ABOVE_OR_EQUAL');
  const [note, setNote] = useState<string>('');
  const [recurring, setRecurring] = useState<boolean>(false);
  const [soundTested, setSoundTested] = useState<boolean>(false);
  const [autoCondition, setAutoCondition] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Update selected instrument whenever symbol or prop changes
  useEffect(() => {
    if (selectedSymbol && instruments.some((i) => i.symbol === selectedSymbol)) {
      setSymbol(selectedSymbol);
    }
  }, [selectedSymbol, instruments]);

  const currentInst = useMemo(() => {
    return instruments.find((i) => i.symbol === symbol) || instruments[0];
  }, [instruments, symbol]);

  // Set default price when symbol or targetType changes
  useEffect(() => {
    if (!currentInst) return;
    const basePrice = targetType === 'BID' ? currentInst.bid : currentInst.ask;
    setPriceInput(basePrice.toFixed(currentInst.decimals));
  }, [currentInst.symbol, targetType]);

  // Auto-detect whether condition should be >= or <= based on target vs current price
  useEffect(() => {
    if (!autoCondition || !currentInst) return;
    const numPrice = parseFloat(priceInput);
    if (isNaN(numPrice)) return;

    const basePrice = targetType === 'BID' ? currentInst.bid : currentInst.ask;
    if (numPrice >= basePrice) {
      setCondition('ABOVE_OR_EQUAL');
    } else {
      setCondition('BELOW_OR_EQUAL');
    }
  }, [priceInput, currentInst, targetType, autoCondition]);

  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const triggeredAlerts = alerts.filter((a) => a.status === 'TRIGGERED');

  const basePrice = targetType === 'BID' ? currentInst.bid : currentInst.ask;
  const numTargetPrice = parseFloat(priceInput) || basePrice;
  const priceDiff = numTargetPrice - basePrice;
  const pipMultiplier = currentInst.decimals >= 4 ? 10000 : currentInst.decimals === 3 ? 100 : currentInst.decimals === 2 ? 10 : 1;
  const pipsDiff = Math.abs(priceDiff) * pipMultiplier;
  const percentDiff = basePrice > 0 ? (priceDiff / basePrice) * 100 : 0;

  // Handle setting preset pips/percentage
  const handleApplyOffset = (pipsOrPercent: number, isPercent = false) => {
    if (!currentInst) return;
    setAutoCondition(true);
    let newPrice: number;
    if (isPercent) {
      newPrice = basePrice * (1 + pipsOrPercent / 100);
    } else {
      const step = 1 / pipMultiplier;
      newPrice = basePrice + pipsOrPercent * step;
    }
    setPriceInput(newPrice.toFixed(currentInst.decimals));
  };

  const handleStepPrice = (direction: 'UP' | 'DOWN') => {
    if (!currentInst) return;
    const step = 1 / pipMultiplier;
    const current = parseFloat(priceInput) || basePrice;
    const nextVal = direction === 'UP' ? current + step : current - step;
    setPriceInput(nextVal.toFixed(currentInst.decimals));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPrice = parseFloat(priceInput);
    if (isNaN(finalPrice) || finalPrice <= 0) return;

    onCreateAlert({
      symbol: currentInst.symbol,
      targetPrice: finalPrice,
      targetType,
      condition,
      note: note.trim() || undefined,
      initialPrice: basePrice,
      recurring,
    });

    // Reset note and switch to active alerts tab to show the new alert
    setNote('');
    setActiveTab('active');
  };

  const handleTestSound = () => {
    playAlertChime();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  // Filter instruments for quick selector
  const filteredInstruments = searchQuery.trim()
    ? instruments.filter(
        (i) =>
          i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : instruments;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl transition-all flex flex-col max-h-[92vh] overflow-hidden ${
          isDarkMode
            ? 'bg-[#12151D] border-neutral-800 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
            isDarkMode ? 'bg-[#161A24] border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E51937]/15 border border-[#E51937]/30 text-[#E51937] flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">Price Alerts &amp; Targets</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                  Live Engine
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Audio, toast &amp; notification triggers when market reaches your target level
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className={`px-5 pt-3 pb-0 border-b flex items-center gap-2 shrink-0 ${
            isDarkMode ? 'border-neutral-800 bg-[#12151D]' : 'border-slate-200 bg-white'
          }`}
        >
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-[#E51937] text-[#E51937]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Alert</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'active'
                ? 'border-[#E51937] text-[#E51937]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Active Alerts</span>
            {activeAlerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#E51937] text-white">
                {activeAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'history'
                ? 'border-[#E51937] text-[#E51937]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Triggered History</span>
            {triggeredAlerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-700 text-neutral-300">
                {triggeredAlerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
          {/* TAB 1: CREATE ALERT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Instrument Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-300">Select Instrument</label>
                  <span className="text-[11px] text-neutral-400">
                    {instruments.length} Tradable Assets
                  </span>
                </div>

                {/* Popular Quick Symbols */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar mb-2">
                  {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'ETHUSD', 'US30', 'NAS100'].map(
                    (sym) => {
                      const isSelected = sym === currentInst.symbol;
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => {
                            setSymbol(sym);
                            setAutoCondition(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-[#E51937] text-white shadow-xs'
                              : isDarkMode
                              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {sym}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Dropdown for All Instruments */}
                <div className="relative">
                  <select
                    value={currentInst.symbol}
                    onChange={(e) => {
                      setSymbol(e.target.value);
                      setAutoCondition(true);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {instruments.map((i) => (
                      <option key={i.symbol} value={i.symbol}>
                        {i.symbol} — {i.name} ({i.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Market Price Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  isDarkMode
                    ? 'bg-neutral-900/80 border-neutral-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">{currentInst.symbol}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-700/60 font-mono text-neutral-300">
                      {currentInst.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block">{currentInst.name}</span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-mono">LIVE BID</span>
                    <span className="text-sm font-bold font-mono text-rose-400">
                      {currentInst.bid.toFixed(currentInst.decimals)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-neutral-700/50" />
                  <div>
                    <span className="text-[10px] text-neutral-400 block font-mono">LIVE ASK</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {currentInst.ask.toFixed(currentInst.decimals)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Type Selector: BID vs ASK */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Target Price Level To Monitor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('BID')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      targetType === 'BID'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400 ring-1 ring-rose-500/30'
                        : isDarkMode
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-black">BID Price</div>
                      <div className="text-[10px] opacity-75">Used for Short / Sell &amp; Liquidity</div>
                    </div>
                    <span className="font-mono text-xs">{currentInst.bid.toFixed(currentInst.decimals)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('ASK')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      targetType === 'ASK'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/30'
                        : isDarkMode
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-black">ASK Price</div>
                      <div className="text-[10px] opacity-75">Used for Long / Buy &amp; Entry</div>
                    </div>
                    <span className="font-mono text-xs">{currentInst.ask.toFixed(currentInst.decimals)}</span>
                  </button>
                </div>
              </div>

              {/* Target Price Input & Stepper */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-300">
                    Target Price Level ({currentInst.symbol})
                  </label>
                  <button
                    type="button"
                    onClick={() => setPriceInput(basePrice.toFixed(currentInst.decimals))}
                    className="text-[11px] text-[#E51937] hover:underline font-bold"
                  >
                    Reset to Market ({basePrice.toFixed(currentInst.decimals)})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepPrice('DOWN')}
                    className={`w-11 h-11 rounded-xl border font-bold text-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
                        : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    step="any"
                    required
                    value={priceInput}
                    onChange={(e) => {
                      setAutoCondition(true);
                      setPriceInput(e.target.value);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl border font-mono font-bold text-base text-center focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => handleStepPrice('UP')}
                    className={`w-11 h-11 rounded-xl border font-bold text-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white'
                        : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets (+/- 10, 25, 50 pips, 0.5%, 1.0%) */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase mr-1">Quick:</span>
                  {[
                    { label: '-50 pips', val: -50, isPct: false },
                    { label: '-20 pips', val: -20, isPct: false },
                    { label: '-10 pips', val: -10, isPct: false },
                    { label: '+10 pips', val: 10, isPct: false },
                    { label: '+20 pips', val: 20, isPct: false },
                    { label: '+50 pips', val: 50, isPct: false },
                    { label: '+1.0%', val: 1, isPct: true },
                    { label: '-1.0%', val: -1, isPct: true },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyOffset(p.val, p.isPct)}
                      className={`text-[10.5px] px-2 py-1 rounded-lg border font-mono font-semibold transition-colors cursor-pointer ${
                        p.val > 0
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15'
                          : 'border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/15'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition Mode Selector: >= vs <= */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Trigger Condition
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoCondition(false);
                      setCondition('ABOVE_OR_EQUAL');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      condition === 'ABOVE_OR_EQUAL'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500/30'
                        : isDarkMode
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" />
                    <div className="text-left">
                      <div>Rises to or above (≥)</div>
                      <div className="text-[10px] opacity-75">Triggers on upside breakout / hit</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAutoCondition(false);
                      setCondition('BELOW_OR_EQUAL');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                      condition === 'BELOW_OR_EQUAL'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400 ring-1 ring-rose-500/30'
                        : isDarkMode
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 shrink-0 text-rose-400" />
                    <div className="text-left">
                      <div>Drops to or below (≤)</div>
                      <div className="text-[10px] opacity-75">Triggers on downside dip / hit</div>
                    </div>
                  </button>
                </div>

                {/* Distance Helper Notice */}
                <div className="mt-2 text-xs flex items-center justify-between p-2.5 rounded-lg bg-neutral-800/40 border border-neutral-700/50">
                  <span className="text-neutral-400">Distance to Target:</span>
                  <span
                    className={`font-mono font-bold ${
                      priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {priceDiff >= 0 ? '+' : ''}
                    {pipsDiff.toFixed(1)} pips ({percentDiff >= 0 ? '+' : ''}
                    {percentDiff.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Note / Label Tag */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Alert Label / Note (Optional)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Resistance Breakout, Take Profit watch, Support bounce"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] ${
                      isDarkMode
                        ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Quick tags */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {['Resistance', 'Support', 'Breakout', 'Take Profit', 'Stop Level', 'News Volatility'].map(
                    (tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNote(tag)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          note === tag
                            ? 'bg-[#E51937] text-white border-[#E51937]'
                            : isDarkMode
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                            : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Sound Test & Options */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-neutral-800 bg-neutral-900/50">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      soundTested
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{soundTested ? 'Playing Chime...' : 'Test Sound'}</span>
                  </button>
                  <span className="text-[11px] text-neutral-400">Audio chime rings on trigger</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-300 select-none">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="rounded text-[#E51937] focus:ring-[#E51937]"
                  />
                  <span>Keep active (Recurring)</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-black text-sm shadow-xl hover:shadow-[#E51937]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <BellRing className="w-4 h-4" />
                <span>
                  Set Alert for {currentInst.symbol} @ {numTargetPrice.toFixed(currentInst.decimals)}
                </span>
              </button>
            </form>
          )}

          {/* TAB 2: ACTIVE ALERTS */}
          {activeTab === 'active' && (
            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-300">No Active Price Alerts</h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    You haven't set any price alerts yet. Set target levels to receive instant notifications when bid or ask levels are hit.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#E51937] text-white text-xs font-bold hover:bg-[#C0102A] transition-colors cursor-pointer"
                  >
                    Create First Alert
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-neutral-400 pb-1">
                    <span>
                      {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''} Monitored
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Delete all active price alerts?')) {
                          activeAlerts.forEach((a) => onDeleteAlert(a.id));
                        }
                      }}
                      className="text-neutral-400 hover:text-rose-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  {activeAlerts.map((alert) => {
                    const inst = instruments.find((i) => i.symbol === alert.symbol);
                    const dist = calculateAlertDistance(inst, alert);

                    return (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                          isDarkMode
                            ? 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm">{alert.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-neutral-800 text-neutral-300">
                              {alert.targetType}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-bold flex items-center gap-1 ${
                                alert.condition === 'ABOVE_OR_EQUAL'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {alert.condition === 'ABOVE_OR_EQUAL' ? (
                                <>
                                  <TrendingUp className="w-3 h-3" />
                                  <span>≥ Target</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="w-3 h-3" />
                                  <span>≤ Target</span>
                                </>
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {onTestTriggerAlert && (
                              <button
                                type="button"
                                onClick={() => onTestTriggerAlert(alert)}
                                title="Test firing this alert toast and notification right now"
                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Test Trigger</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onDeleteAlert(alert.id)}
                              title="Delete alert"
                              className="p-1 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Price details */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-500 block">TARGET LEVEL</span>
                            <span className="font-mono font-bold text-sm text-white">
                              {alert.targetPrice.toFixed(inst?.decimals || 4)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-neutral-500 block">CURRENT {alert.targetType}</span>
                            <span className="font-mono font-bold text-sm text-neutral-300">
                              {dist.currentPrice.toFixed(inst?.decimals || 4)}
                            </span>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-neutral-500 block">DISTANCE</span>
                            <span
                              className={`font-mono font-bold text-xs ${
                                dist.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {dist.pips.toFixed(1)} pips ({Math.abs(dist.percent).toFixed(2)}%)
                            </span>
                          </div>
                        </div>

                        {/* Note badge */}
                        {alert.note && (
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1 pt-1 border-t border-neutral-800">
                            <Tag className="w-3 h-3 text-neutral-500" />
                            <span>{alert.note}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* TAB 3: TRIGGERED HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {triggeredAlerts.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-neutral-300">No Triggered Alerts</h4>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    When the market price hits any of your defined targets, the event log and notification history will appear here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-neutral-400 pb-1">
                    <span>{triggeredAlerts.length} Triggered Event{triggeredAlerts.length > 1 ? 's' : ''}</span>
                    <button
                      onClick={onClearTriggeredAlerts}
                      className="text-neutral-400 hover:text-rose-400 transition-colors"
                    >
                      Clear History
                    </button>
                  </div>

                  {triggeredAlerts.map((alert) => {
                    const inst = instruments.find((i) => i.symbol === alert.symbol);
                    const dateStr = alert.triggeredAt
                      ? new Date(alert.triggeredAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Recently';

                    return (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                          isDarkMode
                            ? 'bg-neutral-900/60 border-neutral-800'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-black text-sm">{alert.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-neutral-800 text-neutral-300">
                              {alert.targetType}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">TRIGGERED</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-500 font-mono">{dateStr}</span>
                            <button
                              onClick={() => onReArmAlert(alert.id)}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#E51937]/15 text-[#E51937] hover:bg-[#E51937]/25 transition-colors cursor-pointer"
                            >
                              Re-arm
                            </button>
                            <button
                              onClick={() => onDeleteAlert(alert.id)}
                              className="p-1 rounded-md text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-500 block">TARGET</span>
                            <span className="font-mono font-bold">
                              {alert.targetPrice.toFixed(inst?.decimals || 4)}
                            </span>
                          </div>

                          {alert.triggeredPrice && (
                            <div>
                              <span className="text-[10px] text-neutral-500 block">HIT AT</span>
                              <span className="font-mono font-bold text-emerald-400">
                                {alert.triggeredPrice.toFixed(inst?.decimals || 4)}
                              </span>
                            </div>
                          )}

                          {alert.note && (
                            <div className="truncate">
                              <span className="text-[10px] text-neutral-500 block">NOTE</span>
                              <span className="text-neutral-300 truncate">{alert.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs shrink-0 ${
            isDarkMode ? 'bg-[#161A24] border-neutral-800 text-neutral-400' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time price feed monitor active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-neutral-200 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
