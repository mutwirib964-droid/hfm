import React from 'react';
import {
  Download,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalsProps {
  pwa: ReturnType<typeof usePWAInstall>;
  isDarkMode?: boolean;
}

export const PWAInstallModals: React.FC<PWAInstallModalsProps> = ({ pwa }) => {
  const {
    showInstallModal,
    showCelebrationModal,
    showIOSGuide,
    installStep,
    installProgress,
    installStatusText,
    startInstallation,
    closeModals,
    setShowIOSGuide,
    setShowCelebrationModal,
  } = pwa;

  return (
    <>
      {/* 1. INSTALL PROMPT CARD (EXACTLY MATCHING PIC 2) */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-2xl p-4 sm:p-5 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {installStep === 'prompt' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* App icon styled with yellow rounded background matching Pic 2 */}
                    <div className="w-11 h-11 rounded-xl bg-[#F7B928] text-black flex items-center justify-center shrink-0 shadow-sm">
                      <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 9h2v6H4zm3-4h2v14H7zm3 2h2v10h-2zm3-5h2v20h-2zm3 6h2v8h-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                        Install VTM Markets
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 leading-snug">
                        Add VTM Markets to your home screen for faster access and a full-screen experience.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModals}
                    className="p-1 -mr-1 rounded-md text-slate-400 hover:text-slate-700 transition shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Yellow Full-width Download App Button (Pic 2) */}
                <button
                  type="button"
                  onClick={startInstallation}
                  className="w-full mt-4 py-2.5 px-4 rounded-xl bg-[#F7B928] hover:bg-[#eab020] active:scale-[0.98] text-neutral-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download App</span>
                </button>
              </>
            )}

            {/* Installing State with Progress */}
            {installStep === 'installing' && (
              <div className="py-4 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-xl bg-[#F7B928]/20 flex items-center justify-center text-[#F7B928]">
                  <Download className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Downloading VTM Markets...</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{installStatusText}</p>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#F7B928] transition-all duration-300 rounded-full"
                    style={{ width: `${installProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CELEBRATION / SUCCESS MODAL */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-2xl p-5 text-center space-y-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">VTM Markets Installed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                The application is now installed on your device. Launch it directly from your home screen anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCelebrationModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
            >
              Open Terminal
            </button>
          </div>
        </div>
      )}

      {/* 3. iOS SAFARI INSTALL GUIDE */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white text-slate-900 border border-slate-100 shadow-2xl p-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Install on iPhone / iPad</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F7B928] text-black font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>Tap the <span className="font-bold text-slate-900 inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200"><Share2 className="w-3 h-3" /> Share</span> button in Safari.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F7B928] text-black font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>Scroll down and select <span className="font-bold text-slate-900 inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200"><PlusSquare className="w-3 h-3" /> Add to Home Screen</span>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#F7B928] text-black font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <p>Tap <span className="font-bold text-slate-900">Add</span> to complete installation.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
