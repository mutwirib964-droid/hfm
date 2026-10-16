import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  FileCheck,
  AlertCircle,
  Lock,
  FastForward,
  Sparkles,
  Check,
  Calendar,
  MapPin,
  Mail,
  Phone,
  CreditCard,
} from 'lucide-react';
import { UserAuthProfile } from '../types/botTypes';
import {
  COUNTRY_OPTIONS,
  getCountryByCode,
  getCountryByName,
  formatLocalPhoneInput,
  validatePhoneForCountry,
  maskPhoneNumber,
} from '../utils/countryPhoneConfig';

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
}

const STORAGE_KEY = 'hfm_kyc_verification_record';

export const ProfileVerificationSection: React.FC<ProfileVerificationSectionProps> = ({
  isDarkMode,
  currentUser,
}) => {
  // Personal Details dynamically sourced from user account profile
  const initialCountryCfg = getCountryByCode(currentUser?.countryCode) || getCountryByName(currentUser?.countryName);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(initialCountryCfg.code);
  const activeCountryCfg = getCountryByCode(selectedCountryCode);

  const [fullName, setFullName] = useState(() => currentUser?.name || 'Trader');
  const [email] = useState(() => currentUser?.email || '');
  const [phone, setPhone] = useState(() => {
    const raw = currentUser?.phoneNumber || (currentUser as any)?.phone || '';
    if (!raw) return '';
    return raw;
  });
  const [address, setAddress] = useState(() =>
    currentUser?.countryName
      ? `${initialCountryCfg.defaultCity}, ${currentUser.countryName}`
      : `${initialCountryCfg.defaultCity}, ${initialCountryCfg.name}`
  );
  const [dob] = useState('14 August 1993');

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setFullName(currentUser.name);
      if (currentUser.countryCode) {
        setSelectedCountryCode(currentUser.countryCode);
      } else if (currentUser.countryName) {
        const cfg = getCountryByName(currentUser.countryName);
        setSelectedCountryCode(cfg.code);
      }
      if (currentUser.phoneNumber || (currentUser as any)?.phone) {
        setPhone(currentUser.phoneNumber || (currentUser as any)?.phone || '');
      }
    }
  }, [currentUser]);

  // Document upload selections
  const [idType, setIdType] = useState<'ID' | 'DRIVING_LICENCE'>('ID');
  const [residencyType, setResidencyType] = useState<'KRA' | 'UTILITY_BILL'>('UTILITY_BILL');
  const [idNumber, setIdNumber] = useState('');
  const [kraPin, setKraPin] = useState('');

  const [idFile, setIdFile] = useState<File | null>(null);
  const [residencyFile, setResidencyFile] = useState<File | null>(null);

  // KYC state
  const [kycRecord, setKycRecord] = useState<KycRecord>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      submitted: false,
      submittedAt: 0,
      isVerified: false,
      idType: 'ID',
      residencyType: 'UTILITY_BILL',
      idNumber: '',
      kraPin: '',
    };
  });

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (kycRecord.submitted) return; // Can only occur once

    const newRecord: KycRecord = {
      submitted: true,
      submittedAt: Date.now(),
      isVerified: false,
      idType,
      residencyType,
      idFileName: idFile ? idFile.name : `${idType === 'ID' ? 'National_ID' : 'Driving_Licence'}_Scan.pdf`,
      residencyFileName: residencyFile
        ? residencyFile.name
        : `${residencyType === 'KRA' ? 'KRA_PIN_Certificate' : 'Utility_Bill'}_Certified.pdf`,
      idNumber,
      kraPin,
    };

    setKycRecord(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecord));
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
                  : 'Upload your National ID, Passport, or Driving Licence and Proof of Residence to verify your institutional trading profile.'}
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
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Date of Birth
            </span>
            <span className={`text-xs ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>{dob}</span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isDarkMode ? 'bg-neutral-900/80 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`text-[10px] block mb-0.5 ${isDarkMode ? 'text-neutral-500' : 'text-slate-500'}`}>
              Residential Street Address
            </span>
            <span className={`text-xs truncate block ${isDarkMode ? 'text-neutral-200' : 'text-slate-800'}`}>
              {address}
            </span>
          </div>
        </div>
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
