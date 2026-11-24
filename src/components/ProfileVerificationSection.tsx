import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Upload,
  CheckCircle2,
  FileText,
  FileCheck,
  Lock,
  AlertCircle,
  Save,
} from 'lucide-react';
import { UserAuthProfile } from '../types/botTypes';
import {
  getCountryByCode,
  getCountryByName,
  maskPhoneNumber,
} from '../utils/countryPhoneConfig';
import { supabaseService } from '../services/supabaseService';

interface ProfileVerificationSectionProps {
  isDarkMode: boolean;
  currentUser?: UserAuthProfile | null;
}

interface KycRecord {
  submitted: boolean;
  submittedAt: number; // timestamp
  isVerified: boolean;
  verifiedAt?: number;
  idType: 'ID' | 'DRIVING_LICENCE';
  residencyType: 'KRA' | 'UTILITY_BILL';
  idFileName?: string;
  residencyFileName?: string;
  idNumber: string;
  kraPin: string;
  dateOfBirth?: string;
  residentialAddress?: string;
  profileUpdatedAt?: number;
}

function getKycStorageKey(email?: string | null): string {
  const clean = String(email || '').trim().toLowerCase();
  return clean ? `vtm_kyc_verification_${clean}` : 'vtm_kyc_verification_guest';
}

function createEmptyKycRecord(dob = '', address = ''): KycRecord {
  return {
    submitted: false,
    submittedAt: 0,
    isVerified: false,
    idType: 'ID',
    residencyType: 'UTILITY_BILL',
    idNumber: '',
    kraPin: '',
    dateOfBirth: dob,
    residentialAddress: address,
  };
}

function loadLocalUserKycRecord(email?: string | null): KycRecord | null {
  if (!email) return null;
  try {
    const saved = localStorage.getItem(getKycStorageKey(email));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...createEmptyKycRecord(),
          ...parsed,
        };
      }
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

function saveLocalUserKycRecord(email: string | undefined | null, record: KycRecord): void {
  if (!email) return;
  try {
    localStorage.setItem(getKycStorageKey(email), JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

function formatDobDisplay(rawDob?: string): string {
  const trimmed = String(rawDob || '').trim();
  if (!trimmed) return 'Not provided';
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    if (monthIndex >= 0 && monthIndex < 12 && day >= 1 && day <= 31) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return trimmed;
}

export const ProfileVerificationSection: React.FC<ProfileVerificationSectionProps> = ({
  isDarkMode,
  currentUser,
}) => {
  // Remove legacy shared non-user-scoped key so one user's KYC never bleeds into another account
  useEffect(() => {
    try {
      localStorage.removeItem('hfm_kyc_verification_record');
    } catch {
      // ignore
    }
  }, []);

  const initialCountryCfg =
    getCountryByCode(currentUser?.countryCode) || getCountryByName(currentUser?.countryName);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initialCountryCfg.code);
  const activeCountryCfg = getCountryByCode(selectedCountryCode);

  const [fullName, setFullName] = useState(() => currentUser?.name || 'Trader');
  const [email, setEmail] = useState(() => currentUser?.email || '');
  const [phone, setPhone] = useState(() => {
    const raw = currentUser?.phoneNumber || (currentUser as any)?.phone || '';
    return raw ? String(raw) : '';
  });

  const initialLocalKyc = loadLocalUserKycRecord(currentUser?.email);
  const [dob, setDob] = useState<string>(
    () => initialLocalKyc?.dateOfBirth || currentUser?.dateOfBirth || ''
  );
  const [address, setAddress] = useState<string>(
    () => initialLocalKyc?.residentialAddress || currentUser?.residentialAddress || ''
  );

  const [profileNotice, setProfileNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Document upload selections
  const [idType, setIdType] = useState<'ID' | 'DRIVING_LICENCE'>(
    initialLocalKyc?.idType || 'ID'
  );
  const [residencyType, setResidencyType] = useState<'KRA' | 'UTILITY_BILL'>(
    initialLocalKyc?.residencyType || 'UTILITY_BILL'
  );
  const [idNumber, setIdNumber] = useState(initialLocalKyc?.idNumber || '');
  const [kraPin, setKraPin] = useState(initialLocalKyc?.kraPin || '');

  const [idFile, setIdFile] = useState<File | null>(null);
  const [residencyFile, setResidencyFile] = useState<File | null>(null);

  // Per-user KYC state
  const [kycRecord, setKycRecord] = useState<KycRecord>(
    () =>
      initialLocalKyc ||
      createEmptyKycRecord(currentUser?.dateOfBirth || '', currentUser?.residentialAddress || '')
  );

  // Max DOB for 18+ account holders
  const maxAdultDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  })();

  // Keep basic identity fields in sync with currentUser updates (e.g. after Supabase hydration)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.name) setFullName(currentUser.name);
    if (currentUser.email) setEmail(currentUser.email);
    if (currentUser.countryCode) {
      setSelectedCountryCode(currentUser.countryCode);
    } else if (currentUser.countryName) {
      const cfg = getCountryByName(currentUser.countryName);
      setSelectedCountryCode(cfg.code);
    }
    const nextPhone = currentUser.phoneNumber || (currentUser as any)?.phone || '';
    if (nextPhone) {
      setPhone(String(nextPhone));
    }
  }, [
    currentUser?.email,
    currentUser?.name,
    currentUser?.countryCode,
    currentUser?.countryName,
    currentUser?.phoneNumber,
    (currentUser as any)?.phone,
  ]);

  // Hydrate strictly per-user KYC record (DOB, residential street address, documents) when email changes
  useEffect(() => {
    const userEmail = currentUser?.email?.trim().toLowerCase();
    if (!userEmail) return;

    let cancelled = false;
    const localRec = loadLocalUserKycRecord(userEmail);
    if (localRec) {
      setKycRecord(localRec);
      setDob(localRec.dateOfBirth || currentUser?.dateOfBirth || '');
      setAddress(localRec.residentialAddress || currentUser?.residentialAddress || '');
      if (localRec.idType) setIdType(localRec.idType);
      if (localRec.residencyType) setResidencyType(localRec.residencyType);
      if (localRec.idNumber) setIdNumber(localRec.idNumber);
      if (localRec.kraPin) setKraPin(localRec.kraPin);
    } else {
      const fresh = createEmptyKycRecord(
        currentUser?.dateOfBirth || '',
        currentUser?.residentialAddress || ''
      );
      setKycRecord(fresh);
      setDob(currentUser?.dateOfBirth || '');
      setAddress(currentUser?.residentialAddress || '');
      setIdNumber('');
      setKraPin('');
    }
    setProfileNotice(null);

    if (supabaseService.isConfigured()) {
      supabaseService
        .fetchUserKycRecord<KycRecord>(userEmail)
        .then((remoteRec) => {
          if (cancelled || !remoteRec || typeof remoteRec !== 'object') return;
          const localTime = localRec?.submittedAt || localRec?.profileUpdatedAt || 0;
          const remoteTime = remoteRec.submittedAt || remoteRec.profileUpdatedAt || 0;
          const useRemote =
            !localRec ||
            (remoteRec.submitted && !localRec.submitted) ||
            remoteTime >= localTime;

          const mergedRec: KycRecord = {
            ...createEmptyKycRecord(),
            ...(useRemote ? localRec : remoteRec),
            ...(useRemote ? remoteRec : localRec),
            dateOfBirth: useRemote
              ? remoteRec.dateOfBirth || localRec?.dateOfBirth || ''
              : localRec?.dateOfBirth || remoteRec.dateOfBirth || '',
            residentialAddress: useRemote
              ? remoteRec.residentialAddress || localRec?.residentialAddress || ''
              : localRec?.residentialAddress || remoteRec.residentialAddress || '',
          };

          saveLocalUserKycRecord(userEmail, mergedRec);
          setKycRecord(mergedRec);
          if (mergedRec.dateOfBirth !== undefined) setDob(mergedRec.dateOfBirth);
          if (mergedRec.residentialAddress !== undefined) setAddress(mergedRec.residentialAddress);
          if (mergedRec.idType) setIdType(mergedRec.idType);
          if (mergedRec.residencyType) setResidencyType(mergedRec.residencyType);
          if (mergedRec.idNumber) setIdNumber(mergedRec.idNumber);
          if (mergedRec.kraPin) setKraPin(mergedRec.kraPin);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const persistPersonalDetailsToStorage = (nextDob: string, nextAddress: string, updatedRecord: KycRecord) => {
    const userEmail = currentUser?.email?.trim().toLowerCase();
    if (!userEmail) return;
    saveLocalUserKycRecord(userEmail, updatedRecord);
    try {
      const rawAuth = localStorage.getItem('vtm_auth_user');
      if (rawAuth) {
        const parsedAuth = JSON.parse(rawAuth);
        if (parsedAuth && String(parsedAuth.email || '').trim().toLowerCase() === userEmail) {
          parsedAuth.dateOfBirth = nextDob;
          parsedAuth.residentialAddress = nextAddress;
          localStorage.setItem('vtm_auth_user', JSON.stringify(parsedAuth));
        }
      }
    } catch {
      // ignore
    }
    if (supabaseService.isConfigured()) {
      supabaseService.saveUserKycRecord(userEmail, updatedRecord).catch(() => {});
    }
  };

  const handleSavePersonalDetails = () => {
    if (kycRecord.submitted) return;
    const cleanDob = dob.trim();
    const cleanAddress = address.trim();

    if (!cleanDob) {
      setProfileNotice({ type: 'error', text: 'Please enter your Date of Birth.' });
      return;
    }
    if (!cleanAddress || cleanAddress.length < 4) {
      setProfileNotice({
        type: 'error',
        text: 'Please enter your full residential street address.',
      });
      return;
    }

    const updatedRecord: KycRecord = {
      ...kycRecord,
      dateOfBirth: cleanDob,
      residentialAddress: cleanAddress,
      profileUpdatedAt: Date.now(),
    };
    setKycRecord(updatedRecord);
    persistPersonalDetailsToStorage(cleanDob, cleanAddress, updatedRecord);
    setProfileNotice({
      type: 'success',
      text: 'Your personal Date of Birth and Residential Street Address have been saved.',
    });
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (kycRecord.submitted) return; // Can only occur once

    const cleanDob = dob.trim();
    const cleanAddress = address.trim();
    if (!cleanDob || !cleanAddress || cleanAddress.length < 4) {
      setProfileNotice({
        type: 'error',
        text: 'Please enter your own Date of Birth and Residential Street Address above before submitting KYC documents.',
      });
      return;
    }

    const now = Date.now();
    const newRecord: KycRecord = {
      submitted: true,
      submittedAt: now,
      isVerified: false,
      idType,
      residencyType,
      idFileName: idFile
        ? idFile.name
        : `${idType === 'ID' ? 'National_ID' : 'Driving_Licence'}_Scan.pdf`,
      residencyFileName: residencyFile
        ? residencyFile.name
        : `${residencyType === 'KRA' ? 'KRA_PIN_Certificate' : 'Utility_Bill'}_Certified.pdf`,
      idNumber: idNumber.trim(),
      kraPin: kraPin.trim(),
      dateOfBirth: cleanDob,
      residentialAddress: cleanAddress,
      profileUpdatedAt: now,
    };

    setKycRecord(newRecord);
    persistPersonalDetailsToStorage(cleanDob, cleanAddress, newRecord);
    setProfileNotice({
      type: 'success',
      text: 'Personal details and compliance verification documents submitted.',
    });
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Verification Status Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          kycRecord.isVerified
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : kycRecord.submitted
            ? 'bg-amber-500/10 border-amber-500/30'
            : isDarkMode
            ? 'bg-[#181B22] border-neutral-800'
            : 'bg-neutral-50 border-neutral-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                kycRecord.isVerified
                  ? 'bg-emerald-500 text-white'
                  : kycRecord.submitted
                  ? 'bg-amber-500 text-black'
                  : 'bg-neutral-700 text-white'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {kycRecord.isVerified
                    ? 'Account Fully Verified & Approved'
                    : kycRecord.submitted
                    ? 'Documents Submitted — Under Compliance Review'
                    : 'Profile & Document Verification Required'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    kycRecord.isVerified
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : kycRecord.submitted
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      : isDarkMode
                      ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                  }`}
                >
                  {kycRecord.isVerified
                    ? 'VERIFIED'
                    : kycRecord.submitted
                    ? 'UNDER REVIEW'
                    : 'PENDING UPLOAD'}
                </span>
              </div>

              <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                {kycRecord.isVerified
                  ? 'Identity (ID/Passport/Licence) and Proof of Residence verified and locked. Unlimited trading & withdrawal limits active.'
                  : kycRecord.submitted
                  ? 'Your documents have been securely received and are currently being reviewed by the compliance desk.'
                  : 'Enter your real Date of Birth and Residential Street Address, then upload your Government ID and Proof of Residence.'}
              </p>
            </div>
          </div>
        </div>

        {/* KYC Guidelines Card (Clean Institutional Standards) */}
        <div
          className={`mt-3.5 p-3 rounded-xl border text-[11px] space-y-1.5 ${
            isDarkMode ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5 text-sky-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Document Quality & Upload Guidelines</span>
          </div>
          <ul className="space-y-1 text-[11px] list-disc list-inside opacity-90 pl-1">
            <li><strong>Full Legal Names:</strong> The name on your uploaded ID must exactly match your registered account name.</li>
            <li><strong>Clear &amp; Unblurred:</strong> Do not submit blurry, shadowed, or cropped images. All text must be sharp and legible.</li>
            <li><strong>All 4 Corners Visible:</strong> Ensure the entire document with all four edges is visible in the frame.</li>
            <li><strong>Valid Government ID:</strong> National ID Card, Valid Passport, or Driving Licence (front &amp; back).</li>
            <li><strong>Recent Proof of Residence:</strong> Utility bill or bank statement issued within the last 90 days.</li>
          </ul>
        </div>
      </div>

      {/* User Personal Details Section */}
      <div
        className={`border rounded-2xl p-4 shadow-md space-y-3 transition-colors ${
          isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b pb-2 ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#E51937]" />
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Personal Profile Details
            </h3>
          </div>
          <span className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
            Official Account Holder
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Full Legal Name
            </span>
            <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fullName}</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Email Address
            </span>
            <span className={`font-mono text-xs ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>{email}</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Phone Number ({activeCountryCfg.flag} {activeCountryCfg.code})
            </span>
            <span className={`font-mono text-xs font-bold ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              {maskPhoneNumber(phone || currentUser?.phoneNumber || (currentUser as any)?.phone || 'Not linked')}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Country of Residence
            </span>
            <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {activeCountryCfg.flag} {activeCountryCfg.name} ({activeCountryCfg.code})
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Date of Birth
            </span>
            {kycRecord.submitted ? (
              <span className={`text-xs font-medium ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                {formatDobDisplay(dob)}
              </span>
            ) : (
              <input
                type="date"
                max={maxAdultDob}
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (profileNotice) setProfileNotice(null);
                }}
                aria-label="Date of Birth"
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E51937] ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            )}
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-1 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Residential Street Address
            </span>
            {kycRecord.submitted ? (
              <span className={`text-xs truncate block font-medium ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
                {address || 'Not provided'}
              </span>
            ) : (
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (profileNotice) setProfileNotice(null);
                }}
                placeholder="Enter your street, estate/town & city"
                aria-label="Residential Street Address"
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E51937] ${
                  isDarkMode
                    ? 'bg-neutral-950 border-neutral-700 text-white placeholder:text-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            )}
          </div>
        </div>

        {profileNotice && (
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 text-[11px] font-medium ${
              profileNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-red-500/10 border-red-500/30 text-red-500'
            }`}
          >
            {profileNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{profileNotice.text}</span>
          </div>
        )}

        {!kycRecord.submitted && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className={`text-[11px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
              Your Date of Birth and Residential Street Address must match your government ID &amp; proof of residence.
            </span>
            <button
              type="button"
              onClick={handleSavePersonalDetails}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Personal Details</span>
            </button>
          </div>
        )}
      </div>

      {/* Document Upload & KYC Verification Form (Occurs ONLY ONCE) */}
      <div
        className={`border rounded-2xl p-4 shadow-md space-y-4 transition-colors ${
          isDarkMode ? 'bg-[#161920] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b pb-2 ${
            isDarkMode ? 'border-neutral-800' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Document Verification (One-Time Submission)
            </h3>
          </div>
          <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
            {kycRecord.submitted ? 'Submission Locked' : 'One-Time Submission'}
          </span>
        </div>

        {kycRecord.submitted ? (
          /* Locked State After One-Time Submission */
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isDarkMode ? 'bg-neutral-900/90 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  <Lock className={`w-3.5 h-3.5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`} />
                  <span>Submitted Verification Documents</span>
                </span>
                <span className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                  {new Date(kycRecord.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* ID Doc */}
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className={`text-[10px] block font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Proof of Identity ({kycRecord.idType === 'ID' ? 'National ID' : 'Driving Licence'})
                      </span>
                      <span className={`font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        No: {kycRecord.idNumber}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>

                {/* Residency Doc */}
                <div
                  className={`p-2.5 rounded-lg border flex items-center justify-between ${
                    isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className={`text-[10px] block font-semibold ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                        Proof of Residence ({kycRecord.residencyType === 'KRA' ? 'Tax Certificate / PIN' : 'Utility Bill'})
                      </span>
                      <span className={`font-mono text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Ref: {kycRecord.kraPin}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </div>

            <p className={`text-[11px] text-center ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
              Verification Guidelines: Ensure photos are clear with no blur, full legal names match government ID, and all document corners are fully visible.
            </p>
          </div>
        ) : (
          /* One-Time Upload Form */
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document 1: Proof of Identity (ID or Driving Licence) */}
              <div
                className={`p-3.5 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    1. Proof of Identity (POI)
                  </label>
                  <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Government Issued
                  </span>
                </div>

                {/* Toggle ID vs Driving Licence */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIdType('ID')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      idType === 'ID'
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    National ID Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdType('DRIVING_LICENCE')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      idType === 'DRIVING_LICENCE'
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Driving Licence
                  </button>
                </div>

                <div>
                  <label className={`text-[10px] block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    {idType === 'ID' ? 'National ID Number' : 'Driving Licence Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. 31849201"
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#E51937] ${
                      isDarkMode
                        ? 'bg-neutral-950 border-neutral-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Upload box */}
                <div
                  className={`border-2 border-dashed hover:border-[#E51937] rounded-xl p-3 text-center transition-colors ${
                    isDarkMode ? 'border-neutral-700' : 'border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="file"
                    id="id-upload-input"
                    accept="image/*,.pdf"
                    onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="id-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                  >
                    <Upload className={`w-5 h-5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-400'}`} />
                    <span className={`font-bold text-xs ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {idFile ? idFile.name : `Upload ${idType === 'ID' ? 'National ID' : 'Driving Licence'} (Front & Back)`}
                    </span>
                    <span className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                      PNG, JPG, or PDF (Max 15MB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Document 2: Proof of Residency (KRA or Utility Bill) */}
              <div
                className={`p-3.5 rounded-xl border space-y-3 ${
                  isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    2. Proof of Residency (POR)
                  </label>
                  <span className={`text-[10px] ${isDarkMode ? 'text-neutral-400' : 'text-slate-500'}`}>
                    Residency Verification
                  </span>
                </div>

                {/* Toggle KRA vs Utility Bill */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResidencyType('KRA')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      residencyType === 'KRA'
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Tax ID / Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => setResidencyType('UTILITY_BILL')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      residencyType === 'UTILITY_BILL'
                        ? 'bg-[#E51937] text-white'
                        : isDarkMode
                        ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Utility Bill / Statement
                  </button>
                </div>

                <div>
                  <label className={`text-[10px] block mb-1 ${isDarkMode ? 'text-neutral-400' : 'text-slate-600'}`}>
                    {residencyType === 'KRA' ? 'Tax Identification Number (TIN / PIN)' : 'Utility Account / Reference No'}
                  </label>
                  <input
                    type="text"
                    required
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value)}
                    placeholder={residencyType === 'KRA' ? 'e.g. TIN-90284192' : 'e.g. UTIL-8491029'}
                    className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#E51937] ${
                      isDarkMode
                        ? 'bg-neutral-950 border-neutral-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Upload box */}
                <div
                  className={`border-2 border-dashed hover:border-[#E51937] rounded-xl p-3 text-center transition-colors ${
                    isDarkMode ? 'border-neutral-700' : 'border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="file"
                    id="residency-upload-input"
                    accept="image/*,.pdf"
                    onChange={(e) => setResidencyFile(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="residency-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                  >
                    <Upload className={`w-5 h-5 ${isDarkMode ? 'text-neutral-400' : 'text-slate-400'}`} />
                    <span className={`font-bold text-xs ${isDarkMode ? 'text-neutral-300' : 'text-slate-700'}`}>
                      {residencyFile
                        ? residencyFile.name
                        : `Upload ${residencyType === 'KRA' ? 'KRA PIN Certificate' : 'Utility Bill / Bank Statement'}`}
                    </span>
                    <span className={`text-[10px] ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
                      PNG, JPG, or PDF (Issued within last 3 months)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Terms notice & Submit button */}
            <div
              className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                isDarkMode
                  ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Compliance Guarantee:</strong> Your documents are encrypted end-to-end and stored
                  in accordance with international regulatory KYC/AML standards. Please ensure the names match your profile.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all shadow-red-950/40 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Submit Documents for Compliance Verification</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

