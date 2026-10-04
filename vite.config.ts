import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
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
        if (cachedData && now - lastFetch < 300) {
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
              'BTCUSD': 0.58,
              'ETHUSD': 0.35,
              'SOLUSD': 0.24,
              'XRPUSD': 0.32,
              'BNBUSD': 0.28,
              'DOGEUSD': 0.25,
              'ADAUSD': 0.30,
              'AVAXUSD': 0.26,
              'LINKUSD': 0.22,
              'DOTUSD': 0.24,
              'NEARUSD': 0.22,
              'SUIUSD': 0.25,
            };
            cryptoRes.value.data.forEach((row: any) => {
              const conf = cryptoMap[row.s];
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const decimals = conf.dec;
                const baseSpr = cryptoSpreads[conf.sym] || 0.38;
                const dynamicSpread = Number(Math.max(0.16, Math.min(1.18, baseSpr + (Math.random() - 0.5) * 0.26)).toFixed(2));
                const priceDiff = decimals >= 4 ? dynamicSpread * 0.0001 : dynamicSpread;
                const bid = Number(close.toFixed(decimals));
                const ask = Number((bid + priceDiff).toFixed(decimals));
                results[conf.sym] = {
                  bid,
                  ask,
                  close: bid,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: dynamicSpread,
                };
              }
            });
          }

          // Binance live ticker for crypto (real-time price updates)
          if (binanceRes.status === 'fulfilled' && Array.isArray(binanceRes.value)) {
            binanceRes.value.forEach((item: any) => {
              const price = parseFloat(item.price);
              const sym = item.symbol.replace('USDT', 'USD');
              if (price > 0) {
                const dec = sym.includes('XRP') || sym.includes('DOGE') || sym.includes('ADA') ? 4 : 2;
                const existing = results[sym];
                const baseSpr = existing?.spread && existing.spread <= 1.2 ? existing.spread : 0.52;
                const dynamicSpread = Number(Math.max(0.16, Math.min(1.18, baseSpr + (Math.random() - 0.5) * 0.22)).toFixed(2));
                const priceDiff = dec >= 4 ? dynamicSpread * 0.0001 : dynamicSpread;
                const bid = Number(price.toFixed(dec));
                const ask = Number((bid + priceDiff).toFixed(dec));
                results[sym] = {
                  bid,
                  ask,
                  close: bid,
                  change24h: existing?.change24h !== undefined ? existing.change24h : 0,
                  high24h: existing?.high24h || Number((price * 1.01).toFixed(dec)),
                  low24h: existing?.low24h || Number((price * 0.99).toFixed(dec)),
                  spread: dynamicSpread,
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
              'XAUUSD': 0.49,
              'XAGUSD': 0.25,
              'USOIL': 0.32,
              'UKOIL': 0.34,
              'NGAS': 0.28,
              'US30': 0.85,
              'GER40': 0.72,
              'US500': 0.45,
              'NAS100': 0.78,
              'COPPER': 0.30,
              'XPTUSD': 0.65,
              'UK100': 0.74,
              'JPN225': 0.88,
            };

            const utcDay = new Date().getUTCDay();
            const utcHour = new Date().getUTCHours();
            const isCfdClosed =
              utcDay === 6 ||
              (utcDay === 0 && utcHour < 22) ||
              (utcDay === 5 && utcHour >= 21) ||
              (utcDay >= 1 && utcDay <= 4 && utcHour === 21);

            cfdRes.value.data.forEach((row: any) => {
              const conf = cfdMap[row.s];
              if (conf) {
                const close = row.d[0];
                const change = row.d[1] || 0;
                const decimals = conf.dec;
                const baseSpr = cfdSpreads[conf.sym] || 0.45;
                const dynamicSpread = isCfdClosed
                  ? Number(baseSpr.toFixed(2))
                  : Number(Math.max(0.16, Math.min(1.18, baseSpr + (Math.random() - 0.5) * 0.24)).toFixed(2));
                const priceDiff = decimals === 3 ? dynamicSpread * 0.01 : dynamicSpread;
                const bid = Number(close.toFixed(decimals));
                const ask = Number((bid + priceDiff).toFixed(decimals));

                results[conf.sym] = {
                  bid,
                  ask,
                  close: bid,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: dynamicSpread,
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
                const spread = forexSpreads[sym] || (isJpy ? 0.006 : 0.00004);
                const bid = Number(close.toFixed(decimals));
                const ask = Number((bid + spread).toFixed(decimals));
                const pipMultiplier = isJpy ? 100 : 10000;
                const finalSpread = Number((Math.abs(ask - bid) * pipMultiplier).toFixed(1));

                results[sym] = {
                  bid,
                  ask,
                  close: bid,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: finalSpread > 0 ? finalSpread : 0.3,
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
                const bid = Number(close.toFixed(decimals));
                const ask = Number((bid + spread).toFixed(decimals));
                results[sym] = {
                  bid,
                  ask,
                  close: bid,
                  change24h: Number(change.toFixed(2)),
                  high24h: Number((row.d[4] || close).toFixed(decimals)),
                  low24h: Number((row.d[5] || close).toFixed(decimals)),
                  spread: 0.04,
                };
              }
            });
          }

          // Fallback to high-speed Yahoo Finance chart API for any Forex, CFD, or Stock symbol not returned by scanner
          const fallbackList = [
            { sym: 'EURUSD', ticker: 'EURUSD=X', dec: 5, mult: 10000, spread: 0.00008 },
            { sym: 'GBPUSD', ticker: 'GBPUSD=X', dec: 5, mult: 10000, spread: 0.00009 },
            { sym: 'USDJPY', ticker: 'JPY=X', dec: 3, mult: 100, spread: 0.009 },
            { sym: 'AUDUSD', ticker: 'AUDUSD=X', dec: 5, mult: 10000, spread: 0.00009 },
            { sym: 'USDCAD', ticker: 'CAD=X', dec: 5, mult: 10000, spread: 0.00011 },
            { sym: 'USDCHF', ticker: 'CHF=X', dec: 5, mult: 10000, spread: 0.00012 },
            { sym: 'GBPJPY', ticker: 'GBPJPY=X', dec: 3, mult: 100, spread: 0.015 },
            { sym: 'NZDUSD', ticker: 'NZDUSD=X', dec: 5, mult: 10000, spread: 0.00012 },
            { sym: 'EURGBP', ticker: 'EURGBP=X', dec: 5, mult: 10000, spread: 0.0001 },
            { sym: 'EURJPY', ticker: 'EURJPY=X', dec: 3, mult: 100, spread: 0.013 },
            { sym: 'AUDJPY', ticker: 'AUDJPY=X', dec: 3, mult: 100, spread: 0.014 },
            { sym: 'XAUUSD', ticker: 'GC=F', dec: 2, mult: 10, spread: 0.49 },
            { sym: 'XAGUSD', ticker: 'SI=F', dec: 3, mult: 100, spread: 0.025 },
            { sym: 'XPTUSD', ticker: 'PL=F', dec: 2, mult: 10, spread: 0.8 },
            { sym: 'USOIL', ticker: 'CL=F', dec: 2, mult: 100, spread: 0.03 },
            { sym: 'UKOIL', ticker: 'BZ=F', dec: 2, mult: 100, spread: 0.03 },
            { sym: 'NGAS', ticker: 'NG=F', dec: 3, mult: 1000, spread: 0.005 },
            { sym: 'US500', ticker: '%5EGSPC', dec: 2, mult: 10, spread: 0.45 },
            { sym: 'NAS100', ticker: '%5EIXIC', dec: 2, mult: 1, spread: 1.2 },
            { sym: 'US30', ticker: '%5EDJI', dec: 2, mult: 1, spread: 2.4 },
            { sym: 'GER40', ticker: '%5EGDAXI', dec: 2, mult: 1, spread: 1.4 },
            { sym: 'UK100', ticker: '%5EFTSE', dec: 2, mult: 1, spread: 1.5 },
            { sym: 'JPN225', ticker: '%5EN225', dec: 2, mult: 1, spread: 5.0 },
            { sym: 'COPPER', ticker: 'HG=F', dec: 3, mult: 1000, spread: 0.003 },
            { sym: 'AAPL', ticker: 'AAPL', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'TSLA', ticker: 'TSLA', dec: 2, mult: 100, spread: 0.06 },
            { sym: 'NVDA', ticker: 'NVDA', dec: 2, mult: 100, spread: 0.05 },
            { sym: 'MSFT', ticker: 'MSFT', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'AMZN', ticker: 'AMZN', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'GOOGL', ticker: 'GOOGL', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'META', ticker: 'META', dec: 2, mult: 100, spread: 0.05 },
            { sym: 'AMD', ticker: 'AMD', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'NFLX', ticker: 'NFLX', dec: 2, mult: 100, spread: 0.08 },
            { sym: 'COIN', ticker: 'COIN', dec: 2, mult: 100, spread: 0.06 },
            { sym: 'PLTR', ticker: 'PLTR', dec: 2, mult: 100, spread: 0.03 },
            { sym: 'BABA', ticker: 'BABA', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'MSTR', ticker: 'MSTR', dec: 2, mult: 100, spread: 0.12 },
            { sym: 'DIS', ticker: 'DIS', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'UBER', ticker: 'UBER', dec: 2, mult: 100, spread: 0.04 },
            { sym: 'INTC', ticker: 'INTC', dec: 2, mult: 100, spread: 0.03 },
            { sym: 'JPM', ticker: 'JPM', dec: 2, mult: 100, spread: 0.05 },
            { sym: 'V', ticker: 'V', dec: 2, mult: 100, spread: 0.05 },
            { sym: 'WMT', ticker: 'WMT', dec: 2, mult: 100, spread: 0.04 },
          ];

          const missingItems = fallbackList.filter((item) => !results[item.sym]);
          if (missingItems.length > 0) {
            await Promise.allSettled(
              missingItems.map(async (item) => {
                try {
                  const yRes = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${item.ticker}?interval=1m&range=1d`,
                    {
                      signal: timeoutSignal(2000),
                      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    }
                  );
                  if (yRes.ok) {
                    const json = await yRes.json();
                    const meta = json?.chart?.result?.[0]?.meta;
                    if (meta && meta.regularMarketPrice) {
                      const price = meta.regularMarketPrice;
                      const prevClose = meta.chartPreviousClose || price;
                      const change24h = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
                      const dec = item.dec;
                      const spread = item.spread;
                      const halfSpread = spread / 2;
                      const bid = Number((price - halfSpread).toFixed(dec));
                      const ask = Number((price + halfSpread).toFixed(dec));
                      const spreadPips = Number((spread * item.mult).toFixed(1));
                      results[item.sym] = {
                        bid,
                        ask,
                        close: Number(price.toFixed(dec)),
                        change24h,
                        high24h: Number((meta.regularMarketDayHigh || price * 1.005).toFixed(dec)),
                        low24h: Number((meta.regularMarketDayLow || price * 0.995).toFixed(dec)),
                        spread: spreadPips > 0 ? spreadPips : 0.8,
                      };
                    }
                  }
                } catch (e) {
                  // Ignore individual fetch failure
                }
              })
            );
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
  const hashbackConfigFile = path.resolve(__dirname, '.hashback-config.json');
  let cachedMerchantLookup: { accountId: string; merchantName: string; fetchedAt: number } = {
    accountId: '',
    merchantName: '',
    fetchedAt: 0,
  };

  const getRuntimeHashbackConfig = () => {
    let savedConfig: { accountId?: string; apiKey?: string; usdKesRate?: number; merchantName?: string } = {};
    try {
      if (fs.existsSync(hashbackConfigFile)) {
        savedConfig = JSON.parse(fs.readFileSync(hashbackConfigFile, 'utf-8') || '{}');
      }
    } catch {
      // ignore read error
    }

    const accountId = (
      process.env.HASHBACK_ACCOUNT_ID ||
      process.env.VITE_HASHBACK_ACCOUNT_ID ||
      savedConfig.accountId ||
      ''
    ).trim();

    const apiKey = (
      process.env.HASHBACK_API_KEY ||
      process.env.VITE_HASHBACK_API_KEY ||
      savedConfig.apiKey ||
      ''
    ).trim();

    const rawRate = Number(
      process.env.USD_KES_RATE ||
      process.env.VITE_USD_KES_RATE ||
      savedConfig.usdKesRate ||
      0
    );
    const usdKesRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 0;

    return {
      accountId,
      apiKey,
      usdKesRate,
      merchantName: savedConfig.merchantName || '',
      configured: Boolean(accountId && apiKey),
    };
  };

  const resolveMerchantAccountName = async (accountId: string, fallbackName?: string): Promise<string> => {
    const cleanAcc = (accountId || '').trim();
    if (!cleanAcc) return fallbackName || 'HASHBACK PAYMENT';

    // Use cached merchant name if same accountId and fetched within last 5 minutes
    if (
      cachedMerchantLookup.accountId === cleanAcc &&
      cachedMerchantLookup.merchantName &&
      Date.now() - cachedMerchantLookup.fetchedAt < 300000
    ) {
      return cachedMerchantLookup.merchantName;
    }

    try {
      const res = await fetch(
        `https://pay.hashback.co.ke/account?account_id=${encodeURIComponent(cleanAcc)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const resolved = String(data?.merchant || data?.account_name || data?.name || '').trim();
        if (resolved) {
          cachedMerchantLookup = {
            accountId: cleanAcc,
            merchantName: resolved,
            fetchedAt: Date.now(),
          };
          return resolved;
        }
      }
    } catch {
      // ignore network error and fall back to cached or saved name
    }

    return cachedMerchantLookup.merchantName || fallbackName || 'HASHBACK PAYMENT';
  };

  // In-memory store for webhook callbacks received from Hashback
  const webhookStore = new Map<string, any>();

  const handleConfigRequest = (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let bodyStr = '';
      req.on('data', (chunk: any) => {
        bodyStr += chunk;
      });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(bodyStr || '{}');
          const current = getRuntimeHashbackConfig();
          const nextAccountId = (parsed.accountId ?? parsed.account_id ?? current.accountId ?? '').trim();
          const nextApiKey = (parsed.apiKey ?? parsed.api_key ?? current.apiKey ?? '').trim();
          const nextUsdKesRate = Number(parsed.usdKesRate ?? parsed.usd_kes_rate ?? current.usdKesRate ?? 0);
          const resolvedMerchant = await resolveMerchantAccountName(nextAccountId, current.merchantName);

          const next = {
            accountId: nextAccountId,
            apiKey: nextApiKey,
            usdKesRate: nextUsdKesRate,
            merchantName: resolvedMerchant,
            updatedAt: new Date().toISOString(),
          };
          fs.writeFileSync(hashbackConfigFile, JSON.stringify(next, null, 2), 'utf-8');
          if (next.accountId) {
            process.env.HASHBACK_ACCOUNT_ID = next.accountId;
            process.env.VITE_HASHBACK_ACCOUNT_ID = next.accountId;
          }
          if (next.apiKey) {
            process.env.HASHBACK_API_KEY = next.apiKey;
            process.env.VITE_HASHBACK_API_KEY = next.apiKey;
          }
          if (next.usdKesRate > 0) {
            process.env.USD_KES_RATE = String(next.usdKesRate);
            process.env.VITE_USD_KES_RATE = String(next.usdKesRate);
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          // Never expose accountId or apiKey in the HTTP response
          res.end(
            JSON.stringify({
              success: true,
              usdKesRate: next.usdKesRate,
              merchantName: resolvedMerchant,
              configured: Boolean(next.accountId && next.apiKey),
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save HashBack config' }));
        }
      });
      return;
    }

    (async () => {
      const cfg = getRuntimeHashbackConfig();
      const merchantName = await resolveMerchantAccountName(cfg.accountId, cfg.merchantName);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.statusCode = 200;
      // Never expose sensitive accountId or apiKey to client
      res.end(
        JSON.stringify({
          usdKesRate: cfg.usdKesRate,
          merchantName,
          configured: cfg.configured,
        })
      );
    })();
  };

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
        const runtimeCfg = getRuntimeHashbackConfig();
        const payload = {
          account_id: parsed.account_id || runtimeCfg.accountId,
          api_key: parsed.api_key || runtimeCfg.apiKey,
          amount: Math.max(1, Math.round(Number(parsed.amount))),
          msisdn: String(parsed.msisdn || parsed.phone || ''),
          reference: parsed.reference || `VTM-${Date.now()}`,
        };

        const response = await fetch('https://api.hashback.co.ke/initiatestk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000),
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
        const runtimeCfg = getRuntimeHashbackConfig();
        const payload = {
          account_id: parsed.account_id || runtimeCfg.accountId,
          api_key: parsed.api_key || runtimeCfg.apiKey,
          checkoutid: checkoutId,
          checkout_id: checkoutId,
        };

        const response = await fetch('https://api.hashback.co.ke/transactionstatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(6500),
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
      server.middlewares.use('/api/hashback-config', handleConfigRequest);
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/hashback-config', handleConfigRequest);
      server.middlewares.use('/api/hashback-stk', handleStkRequest);
      server.middlewares.use('/api/hashback-status', handleStatusRequest);
      server.middlewares.use('/api/hashback-callback', handleWebhookCallback);
      server.middlewares.use('/api/hashback-webhook', handleWebhookCallback);
    },
  };
}

function supabaseConfigPlugin() {
  const configFile = path.resolve(__dirname, '.supabase-config.json');

  const getConfig = () => {
    // 1. Process environment
    if (
      process.env.VITE_SUPABASE_URL &&
      process.env.VITE_SUPABASE_ANON_KEY &&
      !process.env.VITE_SUPABASE_URL.includes('your-project.supabase.co')
    ) {
      return {
        configured: true,
        url: process.env.VITE_SUPABASE_URL,
        anonKey: process.env.VITE_SUPABASE_ANON_KEY,
      };
    }
    // 2. Persistent file .supabase-config.json
    try {
      if (fs.existsSync(configFile)) {
        const raw = fs.readFileSync(configFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey) {
          process.env.VITE_SUPABASE_URL = parsed.url;
          process.env.VITE_SUPABASE_ANON_KEY = parsed.anonKey;
          return { configured: true, url: parsed.url, anonKey: parsed.anonKey };
        }
      }
    } catch {
      // ignore
    }
    return { configured: false };
  };

  const handleGetConfig = (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cfg = getConfig();
    res.end(JSON.stringify(cfg));
  };

  const handleSaveConfig = (req: any, res: any) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    req.on('end', () => {
      try {
        const parsed = JSON.parse(bodyStr || '{}');
        const url = (parsed.url || '').trim().replace(/\/+$/, '');
        const anonKey = (parsed.anonKey || '').trim();

        if (!url || !anonKey) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'url and anonKey are required' }));
          return;
        }

        fs.writeFileSync(
          configFile,
          JSON.stringify({ url, anonKey, updatedAt: new Date().toISOString() }, null, 2),
          'utf-8'
        );
        process.env.VITE_SUPABASE_URL = url;
        process.env.VITE_SUPABASE_ANON_KEY = anonKey;

        // Also update .env file if present
        try {
          const envFile = path.resolve(__dirname, '.env');
          let envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf-8') : '';
          if (envContent.includes('VITE_SUPABASE_URL=')) {
            envContent = envContent.replace(/VITE_SUPABASE_URL=.*/g, `VITE_SUPABASE_URL="${url}"`);
          } else {
            envContent += `\nVITE_SUPABASE_URL="${url}"\n`;
          }
          if (envContent.includes('VITE_SUPABASE_ANON_KEY=')) {
            envContent = envContent.replace(/VITE_SUPABASE_ANON_KEY=.*/g, `VITE_SUPABASE_ANON_KEY="${anonKey}"`);
          } else {
            envContent += `VITE_SUPABASE_ANON_KEY="${anonKey}"\n`;
          }
          fs.writeFileSync(envFile, envContent, 'utf-8');
        } catch {
          // ignore env write error
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            success: true,
            message: 'Supabase configuration saved on server for all devices',
            url,
            anonKey,
          })
        );
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message || 'Failed to save config' }));
      }
    });
  };

  return {
    name: 'supabase-config-api',
    configureServer(server: any) {
      server.middlewares.use('/api/supabase-config', (req: any, res: any) => {
        if (req.method === 'POST') {
          handleSaveConfig(req, res);
        } else {
          handleGetConfig(req, res);
        }
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/supabase-config', (req: any, res: any) => {
        if (req.method === 'POST') {
          handleSaveConfig(req, res);
        } else {
          handleGetConfig(req, res);
        }
      });
    },
  };
}

function safeWsPlugin() {
  return {
    name: 'safe-ws-shim',
    enforce: 'pre' as const,
    configureServer(server: any) {
      if (!server.ws) {
        server.ws = {
          send: () => {},
          on: () => {},
          off: () => {},
          close: () => {},
          clients: new Set(),
        };
      } else if (!server.ws.send) {
        server.ws.send = () => {};
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      safeWsPlugin(),
      react(),
      tailwindcss(),
      marketPricesPlugin(),
      hashbackStkPlugin(),
      supabaseConfigPlugin(),
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
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'import.meta.env.VITE_USD_KES_RATE': JSON.stringify(
        process.env.USD_KES_RATE || process.env.VITE_USD_KES_RATE || ''
      ),
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
