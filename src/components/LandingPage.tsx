import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Lock,
  User,
  Mail,
  BarChart3,
  Award,
  Clock,
  Sun,
  Moon,
  Wallet,
  Activity,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Phone,
  ShieldAlert,
  ChevronDown,
  Building2,
  RefreshCw,
  Server,
  LockKeyhole,
  UserPlus,
  LogIn,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { VTMLogo } from './VTMLogo';
import { Instrument } from '../types';
import { UserAuthProfile } from '../types/botTypes';
import {
  getOrCreateUserProfile,
  findRegisteredUser,
  verifyUserCredentials,
  registerNewUser,
  initializeUserFinancials,
  saveUserFinancials,
  MASTER_ADMIN_EMAIL,
  MASTER_ADMIN_UID,
  isMasterAdminEmail,
  isValidUserUid,
  generateSupabaseUuid,
} from '../utils/financialStorage';
import { supabaseService } from '../services/supabaseService';

interface LandingPageProps {
  instruments: Instrument[];
  onSignIn: (profile: UserAuthProfile) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export interface CountryOption {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { name: 'United States', code: 'US', dialCode: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
  { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'South Africa', code: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'India', code: 'IN', dialCode: '+91', flag: '🇮🇳' },
  { name: 'Germany', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dialCode: '+61', flag: '🇦🇺' },
  { name: 'Uganda', code: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Tanzania', code: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Egypt', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'Singapore', code: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Switzerland', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Netherlands', code: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { name: 'Brazil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
  { name: 'Japan', code: 'JP', dialCode: '+81', flag: '🇯🇵' },
];

export function detectUserCountry(): CountryOption {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const match = COUNTRY_OPTIONS.find((c) => {
      if (c.code === 'US' && (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Denver'))) return true;
      if (c.code === 'GB' && tz.includes('London')) return true;
      if (c.code === 'KE' && (tz.includes('Nairobi') || tz.includes('Kenya'))) return true;
      if (c.code === 'NG' && tz.includes('Lagos')) return true;
      if (c.code === 'ZA' && tz.includes('Johannesburg')) return true;
      if (c.code === 'AE' && tz.includes('Dubai')) return true;
      if (c.code === 'IN' && (tz.includes('Kolkata') || tz.includes('Calcutta'))) return true;
      if (c.code === 'DE' && tz.includes('Berlin')) return true;
      if (c.code === 'FR' && tz.includes('Paris')) return true;
      if (c.code === 'CA' && (tz.includes('Toronto') || tz.includes('Vancouver'))) return true;
      if (c.code === 'AU' && (tz.includes('Sydney') || tz.includes('Melbourne'))) return true;
      return false;
    });
    if (match) return match;
  } catch (e) {
    // fallback
  }
  return COUNTRY_OPTIONS[0];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  instruments,
  onSignIn,
  isDarkMode = false,
  onToggleTheme,
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('register');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'FOREX' | 'METALS' | 'INDICES' | 'CRYPTO'>('ALL');

  // Registration & Sign In form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(detectUserCountry());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Native Full Screen state and handler for Desktop PC
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Automatically detect user location and fetch server Supabase config on mount
  useEffect(() => {
    const detected = detectUserCountry();
    setSelectedCountry(detected);

    // Load server-backed Supabase configuration silently in the background
    supabaseService.initServerConfig();
  }, []);

  const filteredInstruments = instruments.filter((inst) => {
    if (marketFilter === 'ALL') return true;
    if (marketFilter === 'FOREX') return ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF'].includes(inst.symbol);
    if (marketFilter === 'METALS') return ['XAUUSD', 'XAGUSD', 'BRENT', 'WTI'].includes(inst.symbol);
    if (marketFilter === 'INDICES') return ['US500', 'NAS100', 'GER40', 'UK100', 'DJ30'].includes(inst.symbol);
    if (marketFilter === 'CRYPTO') return ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'].includes(inst.symbol);
    return true;
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (authMode === 'register') {
      if (!name.trim()) {
        setValidationError('Please enter your full legal name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setValidationError('Please provide a valid email address.');
        return;
      }
      if (!phoneLocal.trim()) {
        setValidationError('Please enter your phone number.');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match. Please re-enter.');
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      setIsSubmitting(true);

      if (!supabaseService.isConfigured()) {
        await supabaseService.initServerConfig();
      }

      // Check if user is already registered in Supabase database
      const existingDb = await supabaseService.findUserInDatabase(cleanEmail);
      if (existingDb && existingDb.hasVerifiedUid) {
        setIsSubmitting(false);
        setValidationError('An account with this email is already registered in Supabase. Please sign in instead.');
        return;
      }

      // Clean up local phone number (strip leading 0 if Kenyan / international format)
      let cleanLocal = phoneLocal.trim();
      if (selectedCountry.dialCode === '+254' && cleanLocal.startsWith('0')) {
        cleanLocal = cleanLocal.substring(1);
      }
      const fullPhoneNumber = `${selectedCountry.dialCode} ${cleanLocal}`;

      const newUserProfile: UserAuthProfile = {
        id: isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_UID : '',
        name: name.trim(),
        email: isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_EMAIL : cleanEmail,
        phoneNumber: fullPhoneNumber,
        phone: fullPhoneNumber,
        countryCode: selectedCountry.dialCode,
        countryName: selectedCountry.name,
        accountNumber: `${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: isMasterAdminEmail(cleanEmail) ? 'admin' : 'normal',
        isLoggedIn: true,
        isNewRegistration: true,
        createdAt: Date.now(),
      };

      // 1. Register in Supabase Auth service first so user is created in Supabase Authentication -> Users with a real UID
      const authRes = await supabaseService.signUpWithSupabaseAuth(newUserProfile, password);
      if (!authRes.success) {
        const errLower = (authRes.error || '').toLowerCase();
        if (
          errLower.includes('already registered') ||
          errLower.includes('already exists') ||
          errLower.includes('unique') ||
          errLower.includes('duplicate')
        ) {
          // If already in Supabase Auth, sign in to retrieve their real Supabase Auth UID
          const signInRes = await supabaseService.signInWithSupabaseAuth(cleanEmail, password);
          const existingAuthUid = signInRes.data?.user?.id || signInRes.data?.id;
          if (signInRes.success && isValidUserUid(existingAuthUid)) {
            newUserProfile.id = isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_UID : existingAuthUid;
          } else {
            setIsSubmitting(false);
            setValidationError('An account with this email already exists in Supabase. Please sign in instead.');
            return;
          }
        } else if (!isMasterAdminEmail(cleanEmail)) {
          setIsSubmitting(false);
          setValidationError(
            authRes.error || 'Unable to create user in Supabase Authentication. Please check your details and try again.'
          );
          return;
        }
      } else {
        const authUid = authRes.data?.user?.id || authRes.data?.id;
        if (authUid && isValidUserUid(authUid) && !isMasterAdminEmail(cleanEmail)) {
          newUserProfile.id = authUid;
        }
      }

      // 2. STRICT DATABASE-FIRST: Persist user + verified Supabase Auth UID directly to Supabase cloud database
      const saveDbResult = await supabaseService.registerUserInDatabase(newUserProfile, password);
      if (!saveDbResult || !isValidUserUid(newUserProfile.id)) {
        setIsSubmitting(false);
        setValidationError(
          'Access Denied: Unable to verify UID and save your account to Supabase. Please check your connection and try again.'
        );
        return;
      }

      // 3. Initialize financials in Supabase database
      await supabaseService.syncUserFinancials(newUserProfile, {
        walletBalance: 0.0,
        accounts: [],
        lastUpdated: Date.now(),
      });

      // 4. Save to local device cache only AFTER cloud DB & UID confirmation
      registerNewUser(newUserProfile, password);
      initializeUserFinancials(newUserProfile, true);

      await supabaseService.syncActivity(newUserProfile, {
        type: 'REGISTRATION',
        description: `New user registration for ${newUserProfile.email} (UID: ${newUserProfile.id}) stored in Supabase`,
      });
      await supabaseService.syncDevice(newUserProfile);

      setIsSubmitting(false);
      onSignIn(newUserProfile);
    } else {
      // SIGN IN MODE - STRICT SUPABASE UID & CLOUD AUTHENTICATION
      if (!email.trim()) {
        setValidationError('Please enter your email.');
        return;
      }
      if (!password) {
        setValidationError('Please enter your password.');
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      setIsSubmitting(true);

      // Ensure server-persisted Supabase config is loaded on this device/browser
      if (!supabaseService.isConfigured()) {
        await supabaseService.initServerConfig();
      }

      // Master Admin Exclusive Login (Email: mutwirib964@gmail.com, Confirmed UID: 84a1e1db-f302-4dac-a077-291128ae0cea)
      if (isMasterAdminEmail(cleanEmail)) {
        const verifyRes = verifyUserCredentials(MASTER_ADMIN_EMAIL, password);
        if (verifyRes.success && verifyRes.user) {
          const confirmedAdmin: UserAuthProfile = {
            ...verifyRes.user,
            id: MASTER_ADMIN_UID,
            email: MASTER_ADMIN_EMAIL,
            name: 'mutwiri',
            role: 'admin',
            isLoggedIn: true,
          };
          await supabaseService.registerUserInDatabase(confirmedAdmin, password);
          await supabaseService.updateUserLastLoginInDatabase(MASTER_ADMIN_EMAIL);
          setIsSubmitting(false);
          onSignIn(confirmedAdmin);
          return;
        }
      }

      // Strict Requirement: Any non-admin user MUST be saved in Supabase AND have a valid UID
      if (!supabaseService.isConfigured()) {
        setIsSubmitting(false);
        setValidationError(
          'Access Denied: Supabase cloud verification is required to sign in.'
        );
        return;
      }

      try {
        const [remoteUser, sbAuth] = await Promise.all([
          supabaseService.findUserInDatabase(cleanEmail),
          supabaseService.signInWithSupabaseAuth(cleanEmail, password),
        ]);

        // Determine if user has a verified UID from either vtm_registered_users or Supabase Auth
        const sbAuthUid = sbAuth.success ? sbAuth.data?.user?.id : undefined;
        const resolvedUid = isValidUserUid(remoteUser?.profile?.id)
          ? remoteUser!.profile.id
          : isValidUserUid(sbAuthUid)
          ? sbAuthUid!
          : '';

        // CASE 1: User found in Supabase vtm_registered_users table
        if (remoteUser) {
          // Verify password (either matches stored password in vtm_registered_users OR authenticated via Supabase Auth)
          if (remoteUser.password && remoteUser.password !== password && !sbAuth.success) {
            setIsSubmitting(false);
            setValidationError('Incorrect password. Please verify your credentials and try again.');
            return;
          }

          // Strict UID Check: User without a valid UID saved in Supabase can NEVER sign in
          if (!isValidUserUid(resolvedUid)) {
            setIsSubmitting(false);
            setValidationError(
              'Access Denied: Your account does not have a verified UID saved in Supabase. Sign-in is strictly blocked.'
            );
            return;
          }

          // Strictly forbid any non-admin email from having 'admin' role
          const verifiedProfile: UserAuthProfile = {
            ...remoteUser.profile,
            id: resolvedUid,
            role: remoteUser.profile.role === 'marketer' ? 'marketer' : 'normal',
            isLoggedIn: true,
          };

          // Ensure UID and password are persisted in Supabase
          await supabaseService.registerUserInDatabase(verifiedProfile, password);
          registerNewUser({ ...verifiedProfile, isNewRegistration: false }, password);

          const localFinances = loadUserFinancials(verifiedProfile);
          const remoteFinances = await supabaseService.fetchUserFinancials(verifiedProfile);
          if (localFinances && remoteFinances) {
            if ((localFinances.lastUpdated || 0) > (remoteFinances.lastUpdated || 0)) {
              saveUserFinancials(verifiedProfile, localFinances);
            } else {
              saveUserFinancials(verifiedProfile, remoteFinances);
            }
          } else if (remoteFinances) {
            saveUserFinancials(verifiedProfile, remoteFinances);
          } else if (localFinances) {
            saveUserFinancials(verifiedProfile, localFinances);
          } else {
            initializeUserFinancials(verifiedProfile, false);
          }

          setIsSubmitting(false);
          await supabaseService.updateUserLastLoginInDatabase(cleanEmail);
          await supabaseService.syncActivity(verifiedProfile, {
            type: 'LOGIN',
            description: `User ${verifiedProfile.email} (UID: ${verifiedProfile.id}) logged in successfully`,
          });
          await supabaseService.syncDevice(verifiedProfile);
          onSignIn({ ...verifiedProfile, isNewRegistration: false });
          return;
        }

        // CASE 2: Authenticated via Supabase Auth service with valid UUID
        if (sbAuth.success && sbAuth.data?.user && isValidUserUid(sbAuth.data.user.id)) {
          const authUser = sbAuth.data.user;
          const meta = authUser.user_metadata || {};
          const safeRole = meta.role === 'marketer' ? 'marketer' : 'normal';
          const profile: UserAuthProfile = {
            id: authUser.id,
            name: meta.display_name || meta.name || 'Trader',
            email: cleanEmail,
            phoneNumber: meta.phone || '',
            phone: meta.phone || '',
            countryCode: meta.country_code || '+254',
            countryName: meta.country_name || 'Kenya',
            accountNumber: meta.account_number || String(Math.floor(10000000 + Math.random() * 90000000)),
            role: safeRole,
            isLoggedIn: true,
            isNewRegistration: false,
            createdAt: authUser.created_at ? new Date(authUser.created_at).getTime() : Date.now(),
          };

          const savedToSupabase = await supabaseService.registerUserInDatabase(profile, password);
          if (!savedToSupabase) {
            setIsSubmitting(false);
            setValidationError(
              'Access Denied: Account could not be verified in Supabase database.'
            );
            return;
          }

          registerNewUser(profile, password);
          const localFinances = loadUserFinancials(profile);
          const remoteFinances = await supabaseService.fetchUserFinancials(profile);
          if (localFinances && remoteFinances) {
            if ((localFinances.lastUpdated || 0) > (remoteFinances.lastUpdated || 0)) {
              saveUserFinancials(profile, localFinances);
            } else {
              saveUserFinancials(profile, remoteFinances);
            }
          } else if (remoteFinances) {
            saveUserFinancials(profile, remoteFinances);
          } else if (localFinances) {
            saveUserFinancials(profile, localFinances);
          } else {
            initializeUserFinancials(profile, false);
          }

          setIsSubmitting(false);
          await supabaseService.updateUserLastLoginInDatabase(cleanEmail);
          await supabaseService.syncActivity(profile, {
            type: 'LOGIN',
            description: `User ${profile.email} (UID: ${profile.id}) logged in via Supabase Auth`,
          });
          await supabaseService.syncDevice(profile);
          onSignIn(profile);
          return;
        }

        // Strict block: User is not saved in Supabase or has no UID
        setIsSubmitting(false);
        setValidationError(
          'Access Denied: No verified account with a valid UID found in Supabase for this email. Please register an account first.'
        );
        return;
      } catch (err: any) {
        setIsSubmitting(false);
        setValidationError(
          'Unable to verify account with Supabase server. Please check your internet connection and try again.'
        );
        return;
      }
    }
  };

  return (
    <div
      id="vtm-broker-landing"
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#E51937] selection:text-white transition-colors duration-200 ${
        isDarkMode ? 'bg-[#0A0C10] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* MAIN HEADER NAVIGATION */}
      <header
        className={`sticky top-0 z-40 w-full max-w-full border-b backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between transition-colors overflow-hidden ${
          isDarkMode ? 'bg-[#0A0C10]/95 border-neutral-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <VTMLogo size="sm" isDarkMode={isDarkMode} className="sm:hidden shrink-0" />
          <VTMLogo size="md" isDarkMode={isDarkMode} className="hidden sm:flex shrink-0" />

          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold">
            <a
              href="#markets"
              className={`transition-colors ${
                isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Live Markets
            </a>
            <a
              href="#why-vtm"
              className={`transition-colors ${
                isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              The VTM Edge
            </a>
            <a
              href="#platform"
              className={`transition-colors ${
                isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              WebTrader Terminal
            </a>
            <a
              href="#how-it-works"
              className={`transition-colors ${
                isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              How It Works
            </a>
            <a
              href="#company"
              className={`transition-colors ${
                isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Regulation & Safety
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Native Fullscreen Button for Desktop PC */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer hidden md:flex items-center justify-center ${
              isDarkMode
                ? 'border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen WebTrader'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'border-neutral-800 text-amber-400 hover:bg-neutral-800/80'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          )}

          {/* Client Portal Login & Register CTA */}
          <button
            id="header-signin-btn"
            onClick={() => {
              setAuthMode('signin');
              setValidationError(null);
              setShowAuthModal(true);
            }}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isDarkMode
                ? 'text-neutral-200 hover:text-white hover:bg-neutral-800/70 border border-neutral-700'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 shadow-xs'
            }`}
          >
            <span className="sm:hidden">Login</span>
            <span className="hidden sm:inline">Client Portal Login</span>
          </button>

          <button
            id="header-register-btn"
            onClick={() => {
              setAuthMode('register');
              setValidationError(null);
              setShowAuthModal(true);
            }}
            className="px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">Join</span>
            <span className="hidden sm:inline">Create Account</span>
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
          </button>
        </div>
      </header>

      {/* 3. LIVE TICKER STRIP */}
      <div
        className={`border-b py-2 px-3 sm:px-6 w-full max-w-full overflow-hidden font-mono text-xs transition-colors shrink-0 select-none ${
          isDarkMode ? 'bg-[#0E1117] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center overflow-hidden w-full max-w-full">
          <div className="flex items-center gap-1.5 pr-3 text-[11px] font-bold font-sans shrink-0 border-r border-neutral-700/50 dark:border-neutral-800 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`uppercase tracking-wider hidden xs:inline ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Live Feeds
            </span>
          </div>

          <div className="overflow-hidden flex-1 relative ml-3">
            <div className="animate-ticker-marquee flex items-center gap-6 sm:gap-8">
              {[...instruments, ...instruments].map((inst, idx) => (
                <div key={`${inst.symbol}-${idx}`} className="flex items-center gap-2 font-bold shrink-0">
                  <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-800 font-extrabold'}>{inst.symbol}</span>
                  <span className={`font-mono ${isDarkMode ? 'text-white' : 'text-slate-900 font-extrabold'}`}>
                    {inst.bid.toFixed(inst.decimals)}
                  </span>
                  <span className={`text-[11px] ${inst.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {inst.change24h >= 0 ? '+' : ''}
                    {inst.change24h.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. HERO SECTION */}
      <section className="relative px-3 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 pt-10 sm:pt-14 pb-16 sm:pb-20 w-full max-w-full overflow-hidden mx-auto text-center flex flex-col items-center">
        {/* Glow effect */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[320px] sm:w-[600px] h-[260px] sm:h-[350px] bg-[#E51937]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />

        <h1
          className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-[1.12] ${
            isDarkMode ? 'text-white' : 'text-slate-950'
          }`}
        >
          Trade the World's Financial Markets with a{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E51937] via-[#FF3355] to-amber-500">
            Trusted Global Leader
          </span>
        </h1>

        <p
          className={`mt-5 text-sm sm:text-base max-w-2xl leading-relaxed font-medium ${
            isDarkMode ? 'text-neutral-400' : 'text-slate-600'
          }`}
        >
          Access 500+ CFDs across Forex, Gold, Oil, Global Indices, Stocks, and Crypto. Enjoy raw interbank spreads from 0.0 pips,
          ultra-fast Equinix execution, and tier-1 bank fund segregation.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => {
              setAuthMode('register');
              setValidationError(null);
              setShowAuthModal(true);
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setAuthMode('signin');
              setValidationError(null);
              setShowAuthModal(true);
            }}
            className={`w-full sm:w-auto px-8 py-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isDarkMode
                ? 'border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-xs'
            }`}
          >
            <span>Client Portal Login</span>
          </button>
        </div>

        {/* Account reassurance */}
        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Open your account to access Central Wallet, Live, and Demo trading</span>
          </span>
          <span className={`hidden sm:inline ${isDarkMode ? 'text-neutral-600' : 'text-slate-300'}`}>•</span>
          <span className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            Zero fees • Instant setup
          </span>
        </div>

        {/* Institutional Benchmarks Banner */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-16 w-full pt-10 border-t ${
            isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'
          }`}
        >
          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              isDarkMode ? 'border-neutral-800 bg-[#12151C]' : 'border-slate-200 bg-white shadow-xs'
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#E51937]">0.0 Pips</div>
            <div className={`text-xs mt-1.5 font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Raw Interbank Pool Spreads
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              isDarkMode ? 'border-neutral-800 bg-[#12151C]' : 'border-slate-200 bg-white shadow-xs'
            }`}
          >
            <div className={`text-2xl sm:text-3xl font-black font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              1:2000
            </div>
            <div className={`text-xs mt-1.5 font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Flexible Dynamic Leverage
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              isDarkMode ? 'border-neutral-800 bg-[#12151C]' : 'border-slate-200 bg-white shadow-xs'
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              &lt; 9.8 ms
            </div>
            <div className={`text-xs mt-1.5 font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Equinix NY4 / LD4 Execution
            </div>
          </div>

          <div
            className={`p-5 rounded-2xl border text-center transition-all ${
              isDarkMode ? 'border-neutral-800 bg-[#12151C]' : 'border-slate-200 bg-white shadow-xs'
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-500">
              $0 Fee
            </div>
            <div className={`text-xs mt-1.5 font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Zero Commission on Deposits
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIVE MARKETS TABLE */}
      <section
        id="markets"
        className={`py-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 border-t transition-colors ${
          isDarkMode ? 'bg-[#0E1117] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="w-full max-w-[1920px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-xs font-bold text-[#E51937] uppercase tracking-wider mb-1.5">
                Global Financial Instruments
              </div>
              <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Real-Time Pricing & Interbank Spreads
              </h2>
            </div>

            {/* Category Filter Tabs - Wrapped and fitted so no horizontal scroll */}
            <div
              className={`flex flex-wrap items-center gap-1 sm:gap-1.5 p-1 rounded-xl border max-w-full ${
                isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              {(['ALL', 'FOREX', 'METALS', 'INDICES', 'CRYPTO'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMarketFilter(cat)}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    marketFilter === cat
                      ? 'bg-[#E51937] text-white shadow-xs'
                      : isDarkMode
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container - Responsive: Cards on Mobile (No Horizontal Scrolling Ever), Table on Desktop */}
          <div
            className={`rounded-2xl border overflow-hidden shadow-sm w-full max-w-full ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Mobile View: High-density cards that fit 100% screen width without right-to-left scrolling */}
            <div className="block md:hidden divide-y divide-neutral-800/60 dark:divide-neutral-800/60 w-full max-w-full">
              {filteredInstruments.map((inst) => {
                const spreadPips = ((inst.ask - inst.bid) * (inst.symbol.includes('JPY') ? 100 : 10000)).toFixed(1);
                return (
                  <div
                    key={inst.symbol}
                    className={`p-3.5 space-y-2.5 w-full max-w-full ${
                      isDarkMode ? 'bg-[#141820]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-sm font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {inst.symbol}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                          isDarkMode ? 'bg-neutral-800 text-neutral-400' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inst.category}
                        </span>
                        <span className={`text-[11px] truncate hidden xs:inline ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                          {inst.name}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-mono font-bold shrink-0 ${
                          inst.change24h >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {inst.change24h >= 0 ? '+' : ''}
                        {inst.change24h.toFixed(2)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 rounded-xl bg-neutral-900/40 dark:bg-neutral-900/60 border border-neutral-800/60">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Bid</div>
                        <div className={`font-mono text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {inst.bid.toFixed(inst.decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Ask</div>
                        <div className={`font-mono text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {inst.ask.toFixed(inst.decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-neutral-400">Spread</div>
                        <div className="font-mono text-xs font-bold text-sky-400">
                          {Math.max(0.1, Math.abs(parseFloat(spreadPips)) || 0.2).toFixed(1)} pips
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setValidationError(null);
                        setShowAuthModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white text-xs font-black transition-all cursor-pointer text-center"
                    >
                      Trade Live {inst.symbol}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full tabular layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead
                  className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDarkMode
                      ? 'bg-neutral-900/90 text-neutral-400 border-neutral-800'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="p-3.5 pl-5">Instrument</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 font-mono">Bid Price</th>
                    <th className="p-3.5 font-mono">Ask Price</th>
                    <th className="p-3.5 font-mono">Spread (Pips)</th>
                    <th className="p-3.5 font-mono">24h Change</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y font-sans ${
                    isDarkMode ? 'divide-neutral-800/60' : 'divide-slate-200'
                  }`}
                >
                  {filteredInstruments.map((inst) => {
                    const spreadPips = ((inst.ask - inst.bid) * (inst.symbol.includes('JPY') ? 100 : 10000)).toFixed(1);
                    return (
                      <tr
                        key={inst.symbol}
                        className={`transition-colors ${
                          isDarkMode ? 'hover:bg-neutral-800/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-bold">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {inst.symbol}
                            </span>
                            <span className={`text-[11px] hidden sm:inline ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                              {inst.name}
                            </span>
                          </div>
                        </td>
                        <td className={`p-3.5 font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                          {inst.category}
                        </td>
                        <td className={`p-3.5 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {inst.bid.toFixed(inst.decimals)}
                        </td>
                        <td className={`p-3.5 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {inst.ask.toFixed(inst.decimals)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sky-500 dark:text-sky-400">
                          {Math.max(0.1, Math.abs(parseFloat(spreadPips)) || 0.2).toFixed(1)}
                        </td>
                        <td className="p-3.5 font-mono font-bold">
                          <span
                            className={
                              inst.change24h >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {inst.change24h >= 0 ? '+' : ''}
                            {inst.change24h.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => {
                              setAuthMode('register');
                              setValidationError(null);
                              setShowAuthModal(true);
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isDarkMode
                                ? 'bg-neutral-800 hover:bg-[#E51937] text-neutral-200 hover:text-white'
                                : 'bg-slate-100 hover:bg-[#E51937] text-slate-700 hover:text-white border border-slate-200'
                            }`}
                          >
                            Trade Live
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY TRADE WITH VTM (Bento Grid) */}
      <section
        id="why-vtm"
        className={`py-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full max-w-[1920px] mx-auto transition-colors`}
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-[#E51937] uppercase tracking-wider mb-2">
            The VTM Advantage
          </div>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Built for Serious Institutional & Retail Traders
          </h2>
          <p className={`text-xs sm:text-sm mt-3 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
            Experience uncompromised execution reliability, bank-grade fund custody, and comprehensive risk management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Tier-1 Segregated Custody
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Client funds are held in segregated bank accounts with international credit institutions, completely isolated
              from corporate capital.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 flex items-center justify-center mb-4 border border-sky-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Equinix Ultra-Low Latency
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Direct cross-connects in London (LD4) and New York (NY4) ensure lightning order routing under 10ms with minimal
              slippage.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Instant Wallet & Crypto
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Deposit instantly with Zero Fees via Credit Card, TRC20 USDT, Bitcoin, or Wire Transfer. All withdrawals are
              protected by anti-fraud phone verification.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#E51937]/10 text-[#E51937] flex items-center justify-center mb-4 border border-[#E51937]/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Negative Balance Protection
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Trade volatile economic news with total confidence. Automated risk safeguards guarantee you can never lose more
              than your deposited capital.
            </p>
          </div>
        </div>
      </section>

      {/* 7. WEBTRADER PLATFORM TERMINAL SHOWCASE */}
      <section
        id="platform"
        className={`py-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 border-y transition-colors ${
          isDarkMode ? 'bg-[#0E1117] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="w-full max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-bold text-[#E51937] uppercase tracking-wider mb-2">
              Next-Generation Browser Terminal
            </div>
            <h2 className={`text-2xl sm:text-4xl font-black tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Trade Anywhere with VTM WebTrader
            </h2>
            <p className={`text-xs sm:text-sm mt-4 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              No bulky software downloads required. Launch our responsive web workstation across desktop, tablet, and mobile
              browsers with real-time TradingView price charts.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E51937]/15 text-[#E51937] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Professional TradingView Candlestick Engine
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Over 50+ technical indicators, multiple chart timeframes (M1 to W1), and high-contrast candlestick modes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E51937]/15 text-[#E51937] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    1-Click Order Execution with SL/TP Protection
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Instant Buy/Sell market orders with visual price flash alerts and integrated pending limit orders.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#E51937]/15 text-[#E51937] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    Central VTM Wallet & Separate Account Segregation
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    Keep your core funds in your central wallet, and open tailored Live or Demo accounts whenever you're ready.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => {
                  setAuthMode('register');
                  setValidationError(null);
                  setShowAuthModal(true);
                }}
                className="px-6 py-3 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Launch WebTrader Now
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setValidationError(null);
                  setShowAuthModal(true);
                }}
                className={`px-6 py-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                    : 'border-slate-300 hover:bg-slate-100 text-slate-800 bg-white shadow-xs'
                }`}
              >
                <span>Client Portal Login</span>
              </button>
            </div>
          </div>

          {/* Terminal Mockup Card */}
          <div
            className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-300'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b text-xs ${
                isDarkMode ? 'border-neutral-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className={`font-mono text-[11px] ml-2 font-bold ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                  VTM WebTrader • XAUUSD Gold M15
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Connected • 9.8ms
              </span>
            </div>

            <div className="py-6 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Gold vs US Dollar (Spot)
                  </div>
                  <div className={`text-3xl font-black font-mono mt-1 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                    $2,748.60
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    24h Spread
                  </div>
                  <div className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    +1.24% (+33.80)
                  </div>
                </div>
              </div>

              {/* Graphical Candlestick Simulation */}
              <div
                className={`h-32 w-full rounded-xl border p-3 flex items-end gap-1.5 justify-between ${
                  isDarkMode ? 'bg-neutral-900/60 border-neutral-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {[45, 52, 48, 60, 58, 65, 72, 68, 75, 82, 79, 88, 92, 85, 96].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div
                      style={{ height: `${val}%` }}
                      className={`w-full rounded-xs transition-all ${
                        idx % 3 === 0 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Order Execution Bar */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setValidationError(null);
                    setShowAuthModal(true);
                  }}
                  className="py-3 rounded-xl bg-rose-600/15 border border-rose-500/40 hover:bg-rose-600/25 text-rose-600 dark:text-rose-400 font-black text-xs transition-all cursor-pointer text-center"
                >
                  SELL 2,748.40
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setValidationError(null);
                    setShowAuthModal(true);
                  }}
                  className="py-3 rounded-xl bg-emerald-600/15 border border-emerald-500/40 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 font-black text-xs transition-all cursor-pointer text-center"
                >
                  BUY 2,748.60
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW TO START TRADING IN 3 STEPS */}
      <section
        id="how-it-works"
        className={`py-16 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full max-w-[1920px] mx-auto`}
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold text-[#E51937] uppercase tracking-wider mb-2">
            Seamless Onboarding
          </div>
          <h2 className={`text-2xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Start Trading in 3 Simple Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#E51937] text-white font-black text-sm flex items-center justify-center mb-4">
              1
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Create Your Account & Central Wallet
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Register in under 2 minutes with your legal name, email, and security-locked phone number. Your central VTM
              Wallet activates instantly.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#E51937] text-white font-black text-sm flex items-center justify-center mb-4">
              2
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Fund Wallet or Open Demo Practice
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Deposit funds safely with zero fees via Cards, Wire, or Crypto, or open a risk-free Demo Account credited with
              $100,000 in virtual funds.
            </p>
          </div>

          <div
            className={`p-6 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#141820] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#E51937] text-white font-black text-sm flex items-center justify-center mb-4">
              3
            </div>
            <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Open Live Trading Accounts & Execute
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Choose your leverage up to 1:2000, launch the WebTrader terminal, and execute trades with institutional STP/ECN
              pricing.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => {
              setAuthMode('register');
              setValidationError(null);
              setShowAuthModal(true);
            }}
            className="px-8 py-3.5 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Open Your Free Account Today
          </button>
        </div>
      </section>

      {/* 9. REGULATORY & RISK WARNING FOOTER */}
      <footer
        id="company"
        className={`mt-auto border-t py-12 px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 text-xs transition-colors ${
          isDarkMode ? 'bg-[#08090D] border-neutral-800 text-neutral-400' : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="w-full max-w-[1920px] mx-auto space-y-8">
          {/* Top footer row */}
          <div
            className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b ${
              isDarkMode ? 'border-neutral-800/80' : 'border-slate-200'
            }`}
          >
            <VTMLogo size="md" variant="full" isDarkMode={isDarkMode} />

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
              <a href="#markets" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                Markets
              </a>
              <a href="#why-vtm" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                Trading Edge
              </a>
              <a href="#platform" className={`transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-slate-900'}`}>
                WebTrader Terminal
              </a>
              <button
                onClick={() => {
                  setAuthMode('signin');
                  setValidationError(null);
                  setShowAuthModal(true);
                }}
                className={`transition-colors cursor-pointer font-bold ${
                  isDarkMode ? 'text-neutral-300 hover:text-white' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                Client Portal
              </button>
            </div>
          </div>

          {/* Legal Entity Information */}
          <div className="space-y-3 text-[11px] leading-relaxed">
            <p>
              <strong className={isDarkMode ? 'text-neutral-200' : 'text-slate-800'}>VTM Markets Global Ltd</strong> is authorized
              and regulated by international financial services authorities. Registered address: Global Financial Centre,
              Victoria, Seychelles. VTM Markets adheres strictly to international anti-money laundering (AML) and
              counter-terrorism financing (CTF) mandates.
            </p>
            <p>
              Client funds are held in segregated bank accounts with tier-1 international credit institutions, strictly isolated
              from corporate operational capital.
            </p>
          </div>

          {/* PROMINENT RISK WARNING BOX */}
          <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-slate-700 dark:text-neutral-300 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Risk Warning & Regulatory Disclosure</span>
            </div>

            <p className="text-[11px] leading-relaxed">
              <strong>Risk Warning:</strong> Trading leveraged derivative products such as Contracts for Difference (CFDs) and
              foreign exchange (Forex) on margin carries a high level of risk and may not be suitable for all investors. The
              high degree of leverage can work against you as well as for you. Before deciding to trade Forex or CFDs, you should
              carefully consider your investment objectives, level of experience, and risk appetite.
            </p>

            <p className="text-[11px] leading-relaxed font-semibold text-rose-700 dark:text-rose-300/90">
              Between 74% and 89% of retail investor accounts lose money when trading CFDs with this provider. You should consider
              whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.
            </p>
          </div>

          {/* Copyright */}
          <div
            className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] ${
              isDarkMode ? 'border-neutral-800/80 text-neutral-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <div>© {new Date().getFullYear()} VTM Markets Global Ltd. All rights reserved.</div>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="hover:underline cursor-pointer">Terms of Business</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Anti-Fraud & Withdrawal Security Policy</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 10. AUTH MODAL (CREATE ACCOUNT / CLIENT PORTAL SIGN IN) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden">
          <div
            className={`w-full max-w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-lg lg:max-w-5xl rounded-none sm:rounded-3xl border-0 sm:border shadow-2xl transition-all flex flex-col lg:flex-row overflow-x-hidden overflow-y-hidden ${
              isDarkMode
                ? 'bg-[#11141C] border-neutral-700/70 text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]'
                : 'bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)]'
            }`}
          >
            {/* Desktop Institutional Information Sidebar (Hidden on mobile for maximum form clarity) */}
            <div
              className={`w-[38%] shrink-0 hidden lg:flex flex-col justify-between p-8 border-r ${
                isDarkMode
                  ? 'bg-gradient-to-b from-[#141822] via-[#0E1118] to-[#0A0C10] border-neutral-800'
                  : 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 border-slate-200 text-white'
              }`}
            >
              <div>
                <VTMLogo size="md" isDarkMode={true} />
                <div className="mt-8 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E51937]/15 border border-[#E51937]/30 text-rose-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Institutional CFD Brokerage</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-snug">
                    {authMode === 'register'
                      ? 'Direct Interbank Liquidity & Ultra-Low Spreads'
                      : 'Welcome Back to Your Central VTM Terminal'}
                  </h3>
                  <p className="text-xs text-neutral-300 leading-relaxed mt-2">
                    {authMode === 'register'
                      ? 'Create your multi-asset profile in 60 seconds. Instant central wallet setup with zero fees.'
                      : 'Access your unified balances, active positions, copy trading, and institutional analytical tools.'}
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                      0.0
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Raw Interbank Spreads</div>
                      <div className="text-[11px] text-neutral-400">From 0.0 pips on EURUSD &amp; Gold</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Equinix Ultra-Low Latency</div>
                      <div className="text-[11px] text-neutral-400">&lt; 9.8ms execution via NY4 &amp; LD4</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Instant Kenyan &amp; Global Rail</div>
                      <div className="text-[11px] text-neutral-400">Safaricom M-PESA STK &amp; Web3 Crypto</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>London LD4 Online</span>
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>256-Bit SSL</span>
                </span>
              </div>
            </div>

            {/* Modal Right Column / Full Mobile Screen Container */}
            <div className="flex-1 flex flex-col min-w-0 w-full max-w-full h-full sm:h-auto sm:max-h-[94vh] overflow-x-hidden overflow-y-hidden">
              {/* Header - Sticky top on mobile for instant close/navigation */}
              <div
                className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between shrink-0 w-full max-w-full ${
                  isDarkMode ? 'bg-[#161B26] border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <VTMLogo size="sm" isDarkMode={isDarkMode} />
                  <span className="lg:hidden text-xs font-black tracking-tight text-neutral-400 truncate">
                    {authMode === 'register' ? '• Registration' : '• Portal Sign In'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setValidationError(null);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer transition-all shrink-0 ${
                    isDarkMode
                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200'
                  }`}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Body - Strictly prevented from horizontal scrolling & iOS auto-zoom */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 sm:p-7 space-y-4 overscroll-contain pb-12 sm:pb-7 w-full max-w-full">
                {/* Title & Subtitle */}
                <div className="text-center sm:text-left w-full max-w-full">
                  <h3 className={`text-lg sm:text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {authMode === 'register' ? 'Open Institutional Trading Account' : 'Client Portal Authentication'}
                  </h3>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    {authMode === 'register'
                      ? 'Instant VTM One central wallet • 0.0 pip raw interbank spreads'
                      : 'Access your Central VTM One Wallet, open accounts, and active positions'}
                  </p>
                </div>

                {/* Mode Switch Tabs with Icons */}
                <div
                  className={`grid grid-cols-2 p-1 rounded-xl border w-full max-w-full ${
                    isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setValidationError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-[#E51937] text-white shadow-xs'
                        : isDarkMode
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setValidationError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-[#E51937] text-white shadow-xs'
                        : isDarkMode
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Client Login</span>
                  </button>
                </div>

                {/* Validation Error Message */}
                {validationError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex flex-col gap-1.5 animate-in slide-in-from-top-1 w-full max-w-full break-words">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-snug break-words">{validationError}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-3 sm:space-y-3.5 w-full max-w-full">
                  {/* Full Legal Name (Register only) */}
                  {authMode === 'register' && (
                    <div className="w-full max-w-full">
                      <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                        Full Legal Name
                      </label>
                      <div className="relative w-full max-w-full">
                        <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alexander Mercer"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] transition-all box-border ${
                            isDarkMode
                              ? 'bg-neutral-900/90 border-neutral-700 text-white placeholder-neutral-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="w-full max-w-full">
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                      Email Address
                    </label>
                    <div className="relative w-full max-w-full">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        required
                        placeholder="trader@vtmmarket.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] transition-all box-border ${
                          isDarkMode
                            ? 'bg-neutral-900/90 border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Phone Number with Auto-Detected Country Code (Register only) */}
                  {authMode === 'register' && (
                    <div className="w-full max-w-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                          Mobile Phone Number
                        </label>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <LockKeyhole className="w-3 h-3" />
                          <span>Security Bound</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full max-w-full">
                        {/* Country code selector */}
                        <div className="relative w-24 sm:w-28 shrink-0">
                          <select
                            value={selectedCountry.code}
                            onChange={(e) => {
                              const found = COUNTRY_OPTIONS.find((c) => c.code === e.target.value);
                              if (found) setSelectedCountry(found);
                            }}
                            className={`w-full py-2.5 pl-2 sm:pl-3 pr-6 sm:pr-7 rounded-xl border text-base sm:text-xs font-bold appearance-none focus:outline-none focus:border-[#E51937] focus:ring-2 focus:ring-[#E51937]/30 cursor-pointer box-border ${
                              isDarkMode
                                ? 'bg-neutral-900/90 border-neutral-700 text-white'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          >
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c.code} value={c.code} className={isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-slate-900'}>
                                {c.flag} {c.dialCode}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                        </div>

                        {/* Local number input */}
                        <div className="relative flex-1 min-w-0">
                          <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="tel"
                            required
                            placeholder="712 345 678"
                            value={phoneLocal}
                            onChange={(e) => setPhoneLocal(e.target.value.replace(/[^0-9\s-]/g, ''))}
                            className={`w-full pl-8 sm:pl-9 pr-3 py-2.5 rounded-xl border text-base sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] box-border ${
                              isDarkMode
                                ? 'bg-neutral-900/90 border-neutral-700 text-white placeholder-neutral-500'
                                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Anti-fraud withdrawal rule notice */}
                      <div className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span className="break-words">Locked to profile for withdrawal safety (cannot be altered later)</span>
                      </div>
                    </div>
                  )}

                  {/* Password with Show/Hide Toggle */}
                  <div className="w-full max-w-full">
                    <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                      Password
                    </label>
                    <div className="relative w-full max-w-full">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] box-border ${
                          isDarkMode
                            ? 'bg-neutral-900/90 border-neutral-700 text-white placeholder-neutral-500'
                            : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                          isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                        }`}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password with Show/Hide Toggle (Register only) */}
                  {authMode === 'register' && (
                    <div className="w-full max-w-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-slate-700'}`}>
                          Confirm Password
                        </label>
                        {confirmPassword && (
                          <span
                            className={`text-[10px] font-bold ${
                              password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {password === confirmPassword ? '✓ Passwords match' : '✗ Must match'}
                          </span>
                        )}
                      </div>
                      <div className="relative w-full max-w-full">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#E51937]/30 focus:border-[#E51937] box-border ${
                            isDarkMode
                              ? 'bg-neutral-900/90 border-neutral-700 text-white placeholder-neutral-500'
                              : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                            isDarkMode ? 'text-neutral-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                          }`}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Informative Note: Onboarding note */}
                  {authMode === 'register' && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-full max-w-full break-words">
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span className="break-words">Initializes with Central Wallet ($0.00). Open Live/Demo accounts inside anytime.</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="submit-auth-btn"
                    disabled={isSubmitting}
                    className={`w-full max-w-full mt-2 py-3.5 px-4 rounded-xl bg-[#E51937] hover:bg-[#C0102A] text-white font-black text-sm shadow-xl hover:shadow-[#E51937]/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                      isSubmitting ? 'opacity-70 cursor-wait' : 'cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{authMode === 'register' ? 'Creating Live Account...' : 'Signing in to Terminal...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{authMode === 'register' ? 'Open Account & Access Central Wallet' : 'Log In to Client Portal'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch between Register and Login */}
                <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 text-center w-full max-w-full">
                  {authMode === 'register' ? (
                    <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setValidationError(null);
                        }}
                        className="font-bold text-[#E51937] hover:underline cursor-pointer ml-1"
                      >
                        Log In to Client Portal
                      </button>
                    </p>
                  ) : (
                    <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                      Need a new VTM Markets trading profile?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setValidationError(null);
                        }}
                        className="font-bold text-[#E51937] hover:underline cursor-pointer ml-1"
                      >
                        Create Free Account
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
