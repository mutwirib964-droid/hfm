import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PWAInstallStep = 'idle' | 'prompt' | 'installing' | 'installed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installStep, setInstallStep] = useState<PWAInstallStep>('idle');
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatusText, setInstallStatusText] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(standaloneCheck);
    if (standaloneCheck || localStorage.getItem('vtm_pwa_installed') === 'true') {
      setIsInstalled(true);
    }

    // 2. Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallStep('installed');
      setDeferredPrompt(null);
      localStorage.setItem('vtm_pwa_installed', 'true');
      setShowInstallModal(false);
      setShowCelebrationModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Show install popup automatically after a short delay if not installed yet
    let autoTimer: any = null;
    const hasPromptedSession = sessionStorage.getItem('vtm_pwa_session_prompted');
    if (!standaloneCheck && !hasPromptedSession && localStorage.getItem('vtm_pwa_installed') !== 'true') {
      autoTimer = setTimeout(() => {
        if (!isIOSDevice) {
          setShowInstallModal(true);
          setInstallStep('prompt');
        }
        sessionStorage.setItem('vtm_pwa_session_prompted', 'true');
      }, 2500);
    }

    return () => {
      if (autoTimer) clearTimeout(autoTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Open install prompt dialog
  const openInstallDialog = useCallback(() => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    setInstallStep('prompt');
    setShowInstallModal(true);
  }, [isIOS]);

  // Execute installation
  const startInstallation = useCallback(async () => {
    setInstallStep('installing');
    setInstallProgress(10);
    setInstallStatusText('Connecting to VTM Edge Distribution Network...');

    let nativePromptAccepted = false;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          nativePromptAccepted = true;
        } else {
          // User dismissed native prompt
          setInstallStep('idle');
          setShowInstallModal(false);
          return;
        }
      } catch (err) {
        console.warn('Native install prompt failed or handled by browser:', err);
      }
    }

    // Step-by-step progress animation so the user clearly sees "installing"
    const stages = [
      { progress: 30, text: 'Precaching 120+ CFD market quotes and high-speed STP routing...' },
      { progress: 55, text: 'Registering offline WebTrader service worker cache...' },
      { progress: 80, text: 'Generating home screen shortcut & secure hardware credentials...' },
      { progress: 100, text: 'Finalizing VTM Markets WebTrader installation...' },
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setInstallProgress(stage.progress);
      setInstallStatusText(stage.text);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsInstalled(true);
    localStorage.setItem('vtm_pwa_installed', 'true');
    setInstallStep('installed');
    setShowInstallModal(false);
    setShowCelebrationModal(true);
  }, [deferredPrompt]);

  const closeModals = useCallback(() => {
    setShowInstallModal(false);
    setShowCelebrationModal(false);
    setShowIOSGuide(false);
    if (installStep !== 'installed') {
      setInstallStep('idle');
    }
  }, [installStep]);

  return {
    isInstallable: !!deferredPrompt || !isStandalone,
    isStandalone,
    isInstalled,
    isIOS,
    installStep,
    installProgress,
    installStatusText,
    showInstallModal,
    showCelebrationModal,
    showIOSGuide,
    openInstallDialog,
    startInstallation,
    closeModals,
    setShowIOSGuide,
    setShowCelebrationModal,
  };
}
