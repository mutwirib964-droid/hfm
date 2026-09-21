import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Calendar,
  Filter,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  MarketArticle,
  MarketCalendarEvent,
  marketNewsService,
} from '../services/forexFactoryService';

interface NewsTabProps {
  marketAnalyses?: any;
  isDarkMode?: boolean;
}

export const NewsTab: React.FC<NewsTabProps> = ({ isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'calendar'>('news');
  const [news, setNews] = useState<MarketArticle[]>([]);
  const [calendar, setCalendar] = useState<MarketCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [newsData, calData] = await Promise.all([
        marketNewsService.getLatestNews(),
        marketNewsService.getCalendarEvents(),
      ]);
      setNews(newsData);
      setCalendar(calData);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Error fetching market news feed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 minute auto refresh
    return () => clearInterval(interval);
  }, []);

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'XAU', 'AUD', 'CAD'];

  const filteredNews = news.filter((item) => {
    const matchImpact = selectedImpact === 'ALL' || item.impact.toUpperCase() === selectedImpact;
    const matchCurrency =
      selectedCurrency === 'ALL' ||
      item.country.toUpperCase() === selectedCurrency ||
      item.title.toUpperCase().includes(selectedCurrency);
    const matchSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchImpact && matchCurrency && matchSearch;
  });

  const filteredCalendar = calendar.filter((ev) => {
    const matchImpact = selectedImpact === 'ALL' || ev.impact.toUpperCase() === selectedImpact;
    const matchCurrency =
      selectedCurrency === 'ALL' || ev.country.toUpperCase() === selectedCurrency;
    const matchSearch =
      !searchQuery || ev.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchImpact && matchCurrency && matchSearch;
  });

  const getImpactBadge = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
            <Flame className="w-3 h-3 fill-rose-500" />
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            MED
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-500">
            {impact}
          </span>
        );
    }
  };

  const timeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      id="market-news-screen"
      className={`min-h-[calc(100vh-120px)] flex flex-col pb-16 transition-colors duration-200 ${
        isDarkMode ? 'text-white' : 'text-neutral-900'
      }`}
    >
      {/* Platform Header: Unique Identity */}
      <div
        className={`px-4 pt-4 pb-3 border-b ${
          isDarkMode ? 'border-neutral-800 bg-[#121418]' : 'border-neutral-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">Market News & Insights</h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                VTM Intelligence
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Institutional real-time financial news, central bank statements & macroeconomic analysis
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDarkMode
                ? 'border-neutral-700 bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
            } ${isLoading ? 'opacity-60' : ''}`}
            title="Refresh latest news"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </div>

        {/* Tab Switcher: Latest News vs Economic Calendar */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'news'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode
                ? 'bg-neutral-800/70 text-neutral-400 hover:text-white'
                : 'bg-neutral-100 text-neutral-600 hover:text-black'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Breaking News</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {news.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode
                ? 'bg-neutral-800/70 text-neutral-400 hover:text-white'
                : 'bg-neutral-100 text-neutral-600 hover:text-black'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Economic Calendar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {calendar.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className={`px-4 py-2.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
          isDarkMode ? 'border-neutral-800 bg-[#16181E]' : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        {/* Currency Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] text-neutral-400 font-semibold mr-1">Pair:</span>
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCurrency === curr
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-white bg-neutral-800/60'
                  : 'text-neutral-600 hover:text-black bg-white border border-neutral-200'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>

        {/* Impact Selector & Search */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-200/60 dark:bg-neutral-800 p-0.5 rounded-lg">
            {['ALL', 'HIGH', 'MEDIUM'].map((imp) => (
              <button
                key={imp}
                onClick={() => setSelectedImpact(imp)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedImpact === imp
                    ? imp === 'HIGH'
                      ? 'bg-rose-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {imp === 'HIGH' ? '🔥 High' : imp}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wire..."
              className={`w-full pl-8 pr-2.5 py-1 rounded-lg text-xs border outline-none ${
                isDarkMode
                  ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500'
                  : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
        {isLoading && news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
            <p className="text-sm font-medium">Connecting to Real-Time Market Feed...</p>
          </div>
        ) : activeTab === 'news' ? (
          /* News Feed */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span>Showing {filteredNews.length} market articles</span>
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredNews.map((article) => (
                <article
                  key={article.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isDarkMode
                      ? 'bg-[#181B20] border-neutral-800 hover:border-neutral-700 shadow-sm'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-xs'
                  }`}
                >
                  <div>
                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-blue-500/15 text-blue-500 border border-blue-500/30">
                          {article.country}
                        </span>
                        {getImpactBadge(article.impact)}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo(article.timestamp)}</span>
                      </div>
                    </div>

                    <h2 className="text-[15px] font-bold leading-snug mb-2 hover:text-blue-500 transition-colors">
                      {article.title}
                    </h2>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed mb-3">
                      {article.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
                    <span className="truncate max-w-[220px] font-medium">{article.source}</span>
                    <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Real-Time Feed</span>
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {filteredNews.length === 0 && (
              <div className="text-center py-16 text-neutral-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-neutral-500" />
                <p className="text-sm font-semibold">No news matching current filter</p>
                <button
                  onClick={() => {
                    setSelectedImpact('ALL');
                    setSelectedCurrency('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs text-blue-500 underline cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Economic Calendar Feed */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span>Global High-Impact Economic Releases</span>
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {filteredCalendar.map((ev, index) => (
                <div
                  key={`${ev.title}-${index}`}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isDarkMode ? 'bg-[#181B20] hover:bg-[#1E222A]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center justify-center w-12 py-1 px-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
                      <span className="font-bold text-xs">{ev.country}</span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-neutral-400 font-mono">
                          {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {getImpactBadge(ev.impact)}
                      </div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {ev.title}
                      </h3>
                    </div>
                  </div>

                  {/* Actual, Forecast, Previous Values */}
                  <div className="flex items-center gap-4 text-xs font-mono pl-15 sm:pl-0">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block font-sans">Actual</span>
                      <span
                        className={`font-bold ${
                          ev.actual
                            ? 'text-emerald-500'
                            : 'text-neutral-400'
                        }`}
                      >
                        {ev.actual || '--'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block font-sans">Forecast</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {ev.forecast || '--'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-400 block font-sans">Previous</span>
                      <span className="text-neutral-500">{ev.previous || '--'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
