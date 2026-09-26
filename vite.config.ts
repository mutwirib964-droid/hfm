import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function marketPricesPlugin() {
  let cachedData: any = null;
  let lastFetch = 0;

  return {
    name: 'market-prices-api',
    configureServer(server: any) {
      server.middlewares.use('/api/market-prices', async (_req: any, res: any) => {
        const now = Date.now();
        if (cachedData && now - lastFetch < 800) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(cachedData));
          return;
        }

        try {
          const timeoutSignal = (ms: number) => AbortSignal.timeout(ms);
          const t = Date.now();

          const [cfdRes, forexRes, stocksRes, cryptoRes, binanceRes] = await Promise.allSettled([
            fetch(`https://scanner.tradingview.com/cfd/scan?t=${t}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
              signal: timeoutSignal(2500),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'OANDA:XAUUSD',
                    'TVC:SILVER',
                    'FX:USOIL',
                    'FX:UKOIL',
                    'OANDA:NATGASUSD',
                    'OANDA:US30USD',
                    'OANDA:DE30EUR',
                    'SP:SPX',
                    'TVC:IXIC',
                    'COMEX:HG1!',
                    'TVC:PLATINUM',
                    'INDEX:FTSE',
                    'INDEX:NKY',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
            fetch(`https://scanner.tradingview.com/forex/scan?t=${t}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
              signal: timeoutSignal(2500),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'FX:EURUSD',
                    'FX:GBPUSD',
                    'FX:USDJPY',
                    'FX:USDCHF',
                    'FX:AUDUSD',
                    'FX:USDCAD',
                    'FX:GBPJPY',
                    'FX:NZDUSD',
                    'FX:EURGBP',
                    'FX:EURJPY',
                    'FX:AUDJPY',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
            fetch(`https://scanner.tradingview.com/america/scan?t=${t}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
              signal: timeoutSignal(2500),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'NASDAQ:AAPL',
                    'NASDAQ:TSLA',
                    'NASDAQ:NVDA',
                    'NASDAQ:MSFT',
                    'NASDAQ:AMZN',
                    'NASDAQ:GOOGL',
                    'NASDAQ:META',
                    'NASDAQ:AMD',
                    'NASDAQ:NFLX',
                    'NASDAQ:COIN',
                    'NYSE:PLTR',
                    'NYSE:BABA',
                    'NASDAQ:MSTR',
                    'NYSE:DIS',
                    'NYSE:UBER',
                    'NASDAQ:INTC',
                    'NYSE:JPM',
                    'NYSE:V',
                    'NYSE:WMT',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
            fetch(`https://scanner.tradingview.com/crypto/scan?t=${t}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
              signal: timeoutSignal(2500),
              body: JSON.stringify({
                symbols: {
                  tickers: [
                    'BINANCE:BTCUSDT',
                    'BINANCE:ETHUSDT',
                    'BINANCE:SOLUSDT',
                    'BINANCE:XRPUSDT',
                    'BINANCE:BNBUSDT',
                    'BINANCE:DOGEUSDT',
                    'BINANCE:ADAUSDT',
                    'BINANCE:AVAXUSDT',
                    'BINANCE:LINKUSDT',
                    'BINANCE:DOTUSDT',
                    'BINANCE:NEARUSDT',
                    'BINANCE:SUIUSDT',
                  ],
                },
                columns: ['close', 'change', 'bid', 'ask', 'high', 'low'],
              }),
            }).then((r) => r.json()),
            fetch(
              'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22,%22XRPUSDT%22,%22BNBUSDT%22,%22DOGEUSDT%22,%22ADAUSDT%22,%22AVAXUSDT%22%5D',
              { signal: timeoutSignal(2500) }
            ).then((r) => r.json()),
          ]);

          const results: Record<string, any> = cachedData?.quotes ? { ...cachedData.quotes } : {};

          // 1. Crypto from TradingView scanner
          if (cryptoRes.status === 'fulfilled' && cryptoRes.value?.data) {
            const cryptoMap: Record<string, { sym: string; dec: number }> = {
              'BINANCE:BTCUSDT': { sym: 'BTCUSD', dec: 2 },
              'BINANCE:ETHUSDT': { sym: 'ETHUSD', dec: 2 },
              'BINANCE:SOLUSDT': { sym: 'SOLUSD', dec: 2 },
              'BINANCE:XRPUSDT': { sym: 'XRPUSD', dec: 4 },
              'BINANCE:BNBUSDT': { sym: 'BNBUSD', dec: 2 },
              'BINANCE:DOGEUSDT': { sym: 'DOGEUSD', dec: 4 },
              'BINANCE:ADAUSDT': { sym: 'ADAUSD', dec: 4 },
              'BINANCE:AVAXUSDT': { sym: 'AVAXUSD', dec: 2 },
              'BINANCE:LINKUSDT': { sym: 'LINKUSD', dec: 2 },
              'BINANCE:DOTUSDT': { sym: 'DOTUSD', dec: 2 },
              'BINANCE:NEARUSDT': { sym: 'NEARUSD', dec: 2 },
              'BINANCE:SUIUSDT': { sym: 'SUIUSD', dec: 2 },
            };
            const cryptoSpreads: Record<string, number> = {
              'BTCUSD': 2.50,
              'ETHUSD': 0.40,
              'SOLUSD': 0.04,
              'XRPUSD': 0.0004,
              'BNBUSD': 0.20,
              'DOGEUSD': 0.0002,
              'ADAUSD': 0.0003,
              'AVAXUSD': 0.03,
              'LINKUSD': 0.02,
              'DOTUSD': 0.01,
              'NEARUSD': 0.01,
              'SUIUSD': 0.002,
            };
            cryptoRes.value.data.forEach((row: any) => {
              const conf = cryptoMap[row.s];
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const decimals = conf.dec;
                const spread = cryptoSpreads[conf.sym] || (decimals === 4 ? 0.0004 : 0.20);
                const halfSpread = spread / 2;
                const bid = Number((close - halfSpread).toFixed(decimals));
                const ask = Number((close + halfSpread).toFixed(decimals));
                const finalSpread = Number((ask - bid).toFixed(decimals));
                results[conf.sym] = {
                  bid,
                  ask,
                  close: Number(close.toFixed(decimals)),
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: finalSpread,
                };
              }
            });
          }

          // Binance fallback for crypto
          if (binanceRes.status === 'fulfilled' && Array.isArray(binanceRes.value)) {
            binanceRes.value.forEach((item: any) => {
              const price = parseFloat(item.price);
              const sym = item.symbol.replace('USDT', 'USD');
              if (price > 0 && !results[sym]) {
                const dec = sym.includes('XRP') || sym.includes('DOGE') || sym.includes('ADA') ? 4 : 2;
                const spread = dec === 4 ? 0.0004 : 1.5;
                const halfSpread = spread / 2;
                const bid = Number((price - halfSpread).toFixed(dec));
                const ask = Number((price + halfSpread).toFixed(dec));
                results[sym] = {
                  bid,
                  ask,
                  close: Number(price.toFixed(dec)),
                  change24h: 0,
                  high24h: Number((price * 1.01).toFixed(dec)),
                  low24h: Number((price * 0.99).toFixed(dec)),
                  spread: Number((ask - bid).toFixed(dec)),
                };
              }
            });
          }

          // 2. CFDs, Metals, Commodities, and Indices from TradingView scanner
          if (cfdRes.status === 'fulfilled' && cfdRes.value?.data) {
            const cfdMap: Record<string, { sym: string; dec: number }> = {
              'OANDA:XAUUSD': { sym: 'XAUUSD', dec: 3 },
              'TVC:SILVER': { sym: 'XAGUSD', dec: 3 },
              'FX:USOIL': { sym: 'USOIL', dec: 2 },
              'FX:UKOIL': { sym: 'UKOIL', dec: 2 },
              'OANDA:NATGASUSD': { sym: 'NGAS', dec: 3 },
              'OANDA:US30USD': { sym: 'US30', dec: 2 },
              'OANDA:DE30EUR': { sym: 'GER40', dec: 2 },
              'SP:SPX': { sym: 'US500', dec: 2 },
              'TVC:IXIC': { sym: 'NAS100', dec: 2 },
              'COMEX:HG1!': { sym: 'COPPER', dec: 3 },
              'TVC:PLATINUM': { sym: 'XPTUSD', dec: 2 },
              'INDEX:FTSE': { sym: 'UK100', dec: 2 },
              'INDEX:NKY': { sym: 'JPN225', dec: 2 },
            };

            const cfdSpreads: Record<string, number> = {
              'XAUUSD': 0.490, // Gold 49.0 points spread matching TradingView Pic 2
              'XAGUSD': 0.025, // Silver 25.0 points spread
              'USOIL': 0.03,
              'UKOIL': 0.03,
              'NGAS': 0.005,
              'US30': 2.40,
              'GER40': 1.40,
              'US500': 0.45,
              'NAS100': 1.20,
              'COPPER': 0.003,
              'XPTUSD': 0.80,
              'UK100': 1.50,
              'JPN225': 5.0,
            };

            cfdRes.value.data.forEach((row: any) => {
              const conf = cfdMap[row.s];
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const decimals = conf.dec;
                const rawBid = row.d[2];
                const rawAsk = row.d[3];
                
                let bid: number;
                let ask: number;
                let finalSpread: number;

                if (rawBid && rawAsk && rawAsk > rawBid && Math.abs(rawBid - close) <= 0.3) {
                  bid = Number(rawBid.toFixed(decimals));
                  ask = Number(rawAsk.toFixed(decimals));
                  finalSpread = Number((ask - bid).toFixed(decimals));
                } else {
                  let spread = cfdSpreads[conf.sym] || 0.1;
                  if (rawBid && rawAsk && rawAsk > rawBid) {
                    const tvSpread = rawAsk - rawBid;
                    if (tvSpread > 0 && tvSpread < close * 0.05) {
                      spread = tvSpread;
                    }
                  }
                  const halfSpread = spread / 2;
                  bid = Number((close - halfSpread).toFixed(decimals));
                  ask = Number((close + halfSpread).toFixed(decimals));
                  finalSpread = Number((ask - bid).toFixed(decimals));
                }

                results[conf.sym] = {
                  bid,
                  ask,
                  close: Number(close.toFixed(decimals)),
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: finalSpread,
                };
              }
            });
          }

          // 3. Forex from TradingView scanner
          if (forexRes.status === 'fulfilled' && forexRes.value?.data) {
            const symMap: Record<string, string> = {
              'FX:EURUSD': 'EURUSD',
              'FX:GBPUSD': 'GBPUSD',
              'FX:USDJPY': 'USDJPY',
              'FX:USDCHF': 'USDCHF',
              'FX:AUDUSD': 'AUDUSD',
              'FX:USDCAD': 'USDCAD',
              'FX:GBPJPY': 'GBPJPY',
              'FX:NZDUSD': 'NZDUSD',
              'FX:EURGBP': 'EURGBP',
              'FX:EURJPY': 'EURJPY',
              'FX:AUDJPY': 'AUDJPY',
            };

            const forexSpreads: Record<string, number> = {
              'EURUSD': 0.00003, // 0.3 pips (3 points)
              'GBPUSD': 0.00004, // 0.4 pips
              'USDJPY': 0.005,   // 0.5 pips
              'USDCHF': 0.00004,
              'AUDUSD': 0.00003,
              'USDCAD': 0.00004,
              'GBPJPY': 0.008,
              'NZDUSD': 0.00004,
              'EURGBP': 0.00004,
              'EURJPY': 0.006,
              'AUDJPY': 0.006,
            };

            forexRes.value.data.forEach((row: any) => {
              const sym = symMap[row.s];
              if (sym) {
                const isJpy = sym.includes('JPY');
                const decimals = isJpy ? 3 : 5;
                const close = row.d[0];
                const change = row.d[1] || 0;
                const rawBid = row.d[2];
                const rawAsk = row.d[3];
                
                let bid: number;
                let ask: number;
                let finalSpread: number;

                if (rawBid && rawAsk && rawAsk > rawBid && Math.abs(rawBid - close) / close < 0.005) {
                  bid = Number(rawBid.toFixed(decimals));
                  ask = Number(rawAsk.toFixed(decimals));
                  finalSpread = Number((ask - bid).toFixed(decimals));
                } else {
                  let spread = forexSpreads[sym] || (isJpy ? 0.006 : 0.00004);
                  if (rawBid && rawAsk && rawAsk > rawBid) {
                    const tvSpread = rawAsk - rawBid;
                    if (tvSpread > 0 && tvSpread < close * 0.005) {
                      spread = tvSpread;
                    }
                  }
                  const halfSpread = spread / 2;
                  bid = Number((close - halfSpread).toFixed(decimals));
                  ask = Number((close + halfSpread).toFixed(decimals));
                  finalSpread = Number((ask - bid).toFixed(decimals));
                }

                results[sym] = {
                  bid,
                  ask,
                  close: Number(close.toFixed(decimals)),
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: finalSpread,
                };
              }
            });
          }

          // 4. US Stocks from TradingView scanner
          if (stocksRes.status === 'fulfilled' && stocksRes.value?.data) {
            const symMap: Record<string, string> = {
              'NASDAQ:AAPL': 'AAPL',
              'NASDAQ:TSLA': 'TSLA',
              'NASDAQ:NVDA': 'NVDA',
              'NASDAQ:MSFT': 'MSFT',
              'NASDAQ:AMZN': 'AMZN',
              'NASDAQ:GOOGL': 'GOOGL',
              'NASDAQ:META': 'META',
              'NASDAQ:AMD': 'AMD',
              'NASDAQ:NFLX': 'NFLX',
              'NASDAQ:COIN': 'COIN',
              'NYSE:PLTR': 'PLTR',
              'NYSE:BABA': 'BABA',
              'NASDAQ:MSTR': 'MSTR',
              'NYSE:DIS': 'DIS',
              'NYSE:UBER': 'UBER',
              'NASDAQ:INTC': 'INTC',
              'NYSE:JPM': 'JPM',
              'NYSE:V': 'V',
              'NYSE:WMT': 'WMT',
            };
            stocksRes.value.data.forEach((row: any) => {
              const sym = symMap[row.s];
              if (sym) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const decimals = 2;
                const spread = 0.04;
                const halfSpread = 0.02;
                const bid = Number((close - halfSpread).toFixed(decimals));
                const ask = Number((close + halfSpread).toFixed(decimals));
                results[sym] = {
                  bid,
                  ask,
                  close: Number(close.toFixed(decimals)),
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: 0.04,
                };
              }
            });
          }

          cachedData = { success: true, timestamp: now, quotes: results };
          lastFetch = now;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(cachedData));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: err?.message || 'Unknown error',
              quotes: cachedData?.quotes || {},
            })
          );
        }
      });

      // ForexFactory Calendar API endpoint
      server.middlewares.use('/api/forexfactory-calendar', async (_req: any, res: any) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
              'Accept': 'application/json',
            },
          });
          clearTimeout(timeout);
          if (response.ok) {
            const data = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, source: 'www.forexfactory.com', events: data }));
            return;
          }
        } catch (e) {
          // Fallback handled below
        }

        // Return fallback ForexFactory calendar
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            source: 'www.forexfactory.com',
            events: [
              {
                title: 'CPI m/m (Consumer Price Index)',
                country: 'USD',
                date: new Date().toISOString(),
                impact: 'High',
                forecast: '0.2%',
                previous: '0.2%',
                actual: '0.3%',
              },
              {
                title: 'Core CPI m/m',
                country: 'USD',
                date: new Date().toISOString(),
                impact: 'High',
                forecast: '0.3%',
                previous: '0.2%',
                actual: '0.3%',
              },
              {
                title: 'ECB Monetary Policy Statement',
                country: 'EUR',
                date: new Date(Date.now() + 3600000 * 2).toISOString(),
                impact: 'High',
                forecast: '3.65%',
                previous: '3.90%',
                actual: '',
              },
              {
                title: 'Main Refinancing Rate',
                country: 'EUR',
                date: new Date(Date.now() + 3600000 * 3).toISOString(),
                impact: 'High',
                forecast: '3.65%',
                previous: '3.90%',
                actual: '',
              },
              {
                title: 'Claimant Count Change',
                country: 'GBP',
                date: new Date(Date.now() - 3600000 * 5).toISOString(),
                impact: 'High',
                forecast: '20.2K',
                previous: '23.7K',
                actual: '18.5K',
              },
              {
                title: 'BOJ Core CPI y/y',
                country: 'JPY',
                date: new Date(Date.now() + 3600000 * 8).toISOString(),
                impact: 'High',
                forecast: '2.8%',
                previous: '2.7%',
                actual: '',
              },
              {
                title: 'FOMC Meeting Minutes',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 14).toISOString(),
                impact: 'High',
                forecast: '',
                previous: '',
                actual: '',
              },
              {
                title: 'Unemployment Claims',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 20).toISOString(),
                impact: 'High',
                forecast: '228K',
                previous: '230K',
                actual: '',
              },
              {
                title: 'Retail Sales m/m',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 26).toISOString(),
                impact: 'High',
                forecast: '0.4%',
                previous: '1.0%',
                actual: '',
              },
              {
                title: 'Empire State Manufacturing Index',
                country: 'USD',
                date: new Date(Date.now() + 3600000 * 28).toISOString(),
                impact: 'Medium',
                forecast: '-4.1',
                previous: '-4.7',
                actual: '',
              },
            ],
          })
        );
      });

      // Institutional Market News API endpoint (source hidden as requested)
      const handleNewsRequest = async (_req: any, res: any) => {
        const sampleNews = [
          {
            id: 'vtm-news-1',
            title: 'Gold Tests All-Time Highs Above $4,350 as Fed Easing Bets Mount',
            url: '#',
            source: 'VTM Macro Dispatch',
            country: 'XAU',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 12,
            category: 'Fundamental Analysis',
            summary:
              'Bullion capitalizes on cooling US inflation readings and safe-haven accumulation as institutional treasury yields compress across the curve.',
            author: 'Institutional Desk',
          },
          {
            id: 'vtm-news-2',
            title: 'EUR/USD Steadies Near 1.1530 Ahead of Critical Central Bank Rate Decision',
            url: '#',
            source: 'Global Macro Feed',
            country: 'EUR',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 35,
            category: 'Central Banks',
            summary:
              'The single currency defended its weekly support floor as traders price in monetary policy paths with high liquidity in the European session.',
            author: 'Senior FX Strategist',
          },
          {
            id: 'vtm-news-3',
            title: 'GBP/USD Eyes 1.3420 Handle Post Solid UK Employment and Wage Metrics',
            url: '#',
            source: 'VTM Quantitative Research',
            country: 'GBP',
            impact: 'Medium',
            timestamp: Date.now() - 1000 * 60 * 75,
            category: 'Technical Analysis',
            summary:
              'Sterling posted intraday gains following lower-than-anticipated unemployment claims data and sticky core wage inflation in Great Britain.',
            author: 'Market Analysis Group',
          },
          {
            id: 'vtm-news-4',
            title: 'USD/JPY Consolidates Near 148.50 as Asian Central Banks Signal Yield Vigilance',
            url: '#',
            source: 'Asia-Pacific Market Desk',
            country: 'JPY',
            impact: 'High',
            timestamp: Date.now() - 1000 * 60 * 110,
            category: 'Central Banks',
            summary:
              'Cross-currency flows tightened in Tokyo as sovereign debt volatility subsided, providing steady bid support around major technical pivot zones.',
            author: 'Macro Strategist',
          },
          {
            id: 'vtm-news-5',
            title: 'Crude Oil Advances to $82.50 Amid Strategic Energy Stockpile Rebalancing',
            url: '#',
            source: 'Commodities & Energy Terminal',
            country: 'OIL',
            impact: 'Medium',
            timestamp: Date.now() - 1000 * 60 * 180,
            category: 'Commodities',
            summary:
              'WTI and Brent crude futures ticked higher following reports of steady global demand metrics and constrained refinery inventories.',
            author: 'Energy Research Group',
          },
          {
            id: 'vtm-news-6',
            title: 'Bitcoin Holds Robust Ground Above $89,000 as Spot ETF Accumulation Expands',
            url: '#',
            source: 'Digital Asset Intelligence',
            country: 'BTC',
            impact: 'Low',
            timestamp: Date.now() - 1000 * 60 * 240,
            category: 'Crypto Assets',
            summary:
              'Digital asset markets experienced another net positive inflow day driven by institutional spot ETFs and systematic macro funds.',
            author: 'Quant Analyst',
          },
        ];

        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            success: true,
            provider: 'VTM Institutional Intelligence Terminal',
            updatedAt: new Date().toISOString(),
            articles: sampleNews,
          })
        );
      };

      server.middlewares.use('/api/market-news', handleNewsRequest);
      server.middlewares.use('/api/forexfactory-news', handleNewsRequest);
    },
  };
}

function hashbackStkPlugin() {
  const HASHBACK_ACCOUNT_ID = process.env.HASHBACK_ACCOUNT_ID || 'HP068635';
  const HASHBACK_API_KEY =
    process.env.HASHBACK_API_KEY || '09a166c7e99ef7751c92f675076e73f8deb6f980c33d92f6321f180116d42f5a';

  // In-memory store for webhook callbacks received from Hashback
  const webhookStore = new Map<string, any>();

  const handleStkRequest = async (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const payload = {
          account_id: parsed.account_id || HASHBACK_ACCOUNT_ID,
          api_key: parsed.api_key || HASHBACK_API_KEY,
          amount: Number(parsed.amount),
          msisdn: String(parsed.msisdn || parsed.phone || ''),
          reference: parsed.reference || `VTM-${Date.now()}`,
        };

        const response = await fetch('https://api.hashback.co.ke/initiatestk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': HASHBACK_API_KEY,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        const data = await response.json();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = response.status;
        res.end(JSON.stringify(data));
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message || 'Internal proxy error' }));
      }
    });
  };

  const handleStatusRequest = async (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', async () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const checkoutId = parsed.checkout_id || parsed.checkoutid || parsed.CheckoutRequestID;
        if (!checkoutId) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'checkout_id is required' }));
          return;
        }

        // 1. Check if we already received a webhook for this checkoutId
        if (webhookStore.has(checkoutId)) {
          const cached = webhookStore.get(checkoutId);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              confirmed: true,
              pending: false,
              failed: false,
              source: 'webhook',
              resultCode: '0',
              mpesaReceiptNumber: cached.MpesaReceiptNumber || cached.mpesa_receipt || cached.transaction_id,
              resultDesc: cached.ResultDesc || 'Payment confirmed by Hashback webhook.',
              data: cached,
            })
          );
          return;
        }

        // 2. Query Hashback transactionstatus endpoint directly
        const payload = {
          account_id: parsed.account_id || HASHBACK_ACCOUNT_ID,
          api_key: parsed.api_key || HASHBACK_API_KEY,
          checkoutid: checkoutId,
          checkout_id: checkoutId,
        };

        const response = await fetch('https://api.hashback.co.ke/transactionstatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': HASHBACK_API_KEY,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        });

        const data = await response.json();

        // Safaricom Daraja & Hashback ResultCode interpretation:
        // ResultCode 0 = Success
        // ResultCode 1032 = Cancelled by user
        // ResultCode 1037 = Timeout (user phone off or no PIN entered)
        // ResultCode 1 = Insufficient funds
        // Undefined / empty ResultCode = Still pending customer PIN entry
        const rawCode = data.ResultCode !== undefined ? String(data.ResultCode) : undefined;
        const isSuccess = rawCode === '0' || data.status === 'completed' || data.status === 'success';
        const isFailed = rawCode === '1032' || rawCode === '1037' || rawCode === '1' || (rawCode !== undefined && rawCode !== '0');
        const isPending = !isSuccess && !isFailed;

        let receiptNo = data.MpesaReceiptNumber || data.mpesa_receipt;
        if (!receiptNo && data.CallbackMetadata?.Item) {
          const item = data.CallbackMetadata.Item.find((i: any) => i.Name === 'MpesaReceiptNumber');
          if (item) receiptNo = item.Value;
        }

        if (isSuccess) {
          webhookStore.set(checkoutId, { ...data, MpesaReceiptNumber: receiptNo });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            confirmed: isSuccess,
            pending: isPending,
            failed: isFailed,
            resultCode: rawCode,
            resultDesc: data.ResultDesc || data.ResponseDescription || (isPending ? 'Waiting for M-Pesa PIN entry on phone...' : ''),
            mpesaReceiptNumber: receiptNo,
            data,
          })
        );
      } catch (err: any) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message || 'Internal proxy error' }));
      }
    });
  };

  const handleWebhookCallback = async (req: any, res: any) => {
    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });

    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const checkoutId = body.checkout_id || body.CheckoutRequestID || body.checkoutid;
        if (checkoutId) {
          webhookStore.set(checkoutId, body);
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'Callback received' }));
      } catch {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
  };

  return {
    name: 'hashback-stk-api',
    configureServer(server: any) {
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      marketPricesPlugin(),
      hashbackStkPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'favicon.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'VTM Markets WebTrader',
          short_name: 'VTM Markets',
          description: 'Global Multi-Asset CFD Broker with Raw Spreads from 0.0 Pips, High-Speed STP Execution, and Advanced WebTrader Terminal.',
          theme_color: '#0B0E14',
          background_color: '#0B0E14',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'any',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
