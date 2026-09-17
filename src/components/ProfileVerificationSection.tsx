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

interface ProfileVerificationSectionProps {
  isDarkMode: boolean;
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
}) => {
  // Personal Details
  const [fullName, setFullName] = useState('Josphat Ndungu');
  const [email] = useState('mutwirib964@gmail.com');
  const [phone, setPhone] = useState('+254 712 345 678');
  const [country] = useState('Kenya 🇰🇪');
  const [address, setAddress] = useState('Kimathi Street, Nairobi Central, Kenya');
  const [dob] = useState('14 August 1993');

  // Document upload selections
  const [idType, setIdType] = useState<'ID' | 'DRIVING_LICENCE'>('ID');
  const [residencyType, setResidencyType] = useState<'KRA' | 'UTILITY_BILL'>('KRA');
  const [idNumber, setIdNumber] = useState('31849201');
  const [kraPin, setKraPin] = useState('A009284192P');

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
      residencyType: 'KRA',
      idNumber: '31849201',
      kraPin: 'A009284192P',
    };
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // 15-Minute Auto-Verification Timer (15 min = 900 seconds)
  const AUTO_VERIFY_DURATION_MS = 15 * 60 * 1000;

  useEffect(() => {
    if (!kycRecord.submitted || kycRecord.isVerified) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - kycRecord.submittedAt;
      const remainingMs = AUTO_VERIFY_DURATION_MS - elapsed;

      if (remainingMs <= 0) {
        // Automatically verify after 15 minutes!
        const updated: KycRecord = {
          ...kycRecord,
          isVerified: true,
          verifiedAt: Date.now(),
        };
        setKycRecord(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setSecondsRemaining(0);
        clearInterval(interval);
      } else {
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      }
    }, 1000);

    // Initial check
    const elapsed = Date.now() - kycRecord.submittedAt;
    const remainingMs = AUTO_VERIFY_DURATION_MS - elapsed;
    if (remainingMs <= 0) {
      const updated: KycRecord = {
        ...kycRecord,
        isVerified: true,
        verifiedAt: Date.now(),
      };
      setKycRecord(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSecondsRemaining(0);
    } else {
      setSecondsRemaining(Math.ceil(remainingMs / 1000));
    }

    return () => clearInterval(interval);
  }, [kycRecord.submitted, kycRecord.submittedAt, kycRecord.isVerified]);

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
    setSecondsRemaining(15 * 60);
  };

  // Fast forward helper for user testing so they don't have to wait 15 real-time minutes
  const handleSimulate15Minutes = () => {
    const updated: KycRecord = {
      ...kycRecord,
      submitted: true,
      submittedAt: Date.now() - AUTO_VERIFY_DURATION_MS - 1000,
      isVerified: true,
      verifiedAt: Date.now(),
    };
    setKycRecord(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSecondsRemaining(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
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
                <h3 className="text-sm font-bold text-white">
                  {kycRecord.isVerified
                    ? 'Account Fully Verified & Approved'
                    : kycRecord.submitted
                    ? 'Documents Uploaded — Verification in Progress'
                    : 'Profile & Document Verification Required'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    kycRecord.isVerified
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : kycRecord.submitted
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {kycRecord.isVerified
                    ? 'VERIFIED'
                    : kycRecord.submitted
                    ? 'AUTO-VERIFYING (15m)'
                    : 'PENDING UPLOAD'}
                </span>
              </div>

              <p className="text-[11px] text-neutral-400 mt-0.5">
                {kycRecord.isVerified
                  ? 'Identity (ID/Licence) and Proof of Residence (KRA/Utility) verified and locked. Unlimited trading & withdrawal limits active.'
                  : kycRecord.submitted
                  ? `Your documents were submitted. Under automatic security verification policy, your account will be auto-verified automatically in ${formatTime(
                      secondsRemaining
                    )}.`
                  : 'Upload your National ID or Driving Licence and KRA PIN or Utility Bill to verify residency and identity.'}
              </p>
            </div>
          </div>

          {kycRecord.submitted && !kycRecord.isVerified && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleSimulate15Minutes}
                title="Fast-forward the 15-minute verification process"
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Simulate 15m Clearance</span>
              </button>
            </div>
          )}
        </div>

        {kycRecord.submitted && !kycRecord.isVerified && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Time until automatic verification clearance:</span>
            </span>
            <span className="font-mono font-bold text-white text-sm bg-neutral-900 px-2.5 py-0.5 rounded-lg border border-neutral-700">
              {formatTime(secondsRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* User Personal Details Section */}
      <div className="bg-[#161920] border border-neutral-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#E51937]" />
            <h3 className="font-bold text-white text-sm">Personal Profile Details</h3>
          </div>
          <span className="text-[10px] text-neutral-500">Official Account Holder</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Full Legal Name</span>
            <span className="font-bold text-white text-xs">{fullName}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Email Address</span>
            <span className="font-mono text-neutral-200 text-xs">{email}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Phone Number</span>
            <span className="font-mono text-neutral-200 text-xs">{phone}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Country of Residence</span>
            <span className="font-bold text-white text-xs">{country}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Date of Birth</span>
            <span className="text-neutral-200 text-xs">{dob}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block mb-0.5">Residential Street Address</span>
            <span className="text-neutral-200 text-xs truncate block">{address}</span>
          </div>
        </div>
      </div>

      {/* Document Upload & KYC Verification Form (Occurs ONLY ONCE) */}
      <div className="bg-[#161920] border border-neutral-800 rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Document Verification (One-Time Submission)</h3>
          </div>
          <span className="text-[10px] text-neutral-400">
            {kycRecord.submitted ? 'Submission Locked' : 'One-Time Submission'}
          </span>
        </div>

        {kycRecord.submitted ? (
          /* Locked State After One-Time Submission */
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Submitted Verification Documents</span>
                </span>
                <span className="text-[10px] text-neutral-500">
                  {new Date(kycRecord.submittedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* ID Doc */}
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold">
                        Proof of Identity ({kycRecord.idType === 'ID' ? 'National ID' : 'Driving Licence'})
                      </span>
                      <span className="font-mono text-white text-xs">
                        No: {kycRecord.idNumber}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>

                {/* Residency Doc */}
                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-semibold">
                        Proof of Residence ({kycRecord.residencyType === 'KRA' ? 'KRA PIN' : 'Utility Bill'})
                      </span>
                      <span className="font-mono text-white text-xs">
                        PIN: {kycRecord.kraPin}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 italic text-center">
              Verification submission occurs only once per regulatory account holder.
              {kycRecord.isVerified
                ? ' Status: Permanently Approved.'
                : ' Automatic verification will finalize within 15 minutes of upload.'}
            </p>
          </div>
        ) : (
          /* One-Time Upload Form */
          <form onSubmit={handleSubmitVerification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document 1: Proof of Identity (ID or Driving Licence) */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white block">
                    1. Proof of Identity (POI)
                  </label>
                  <span className="text-[10px] text-neutral-400">Government Issued</span>
                </div>

                {/* Toggle ID vs Driving Licence */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIdType('ID')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                      idType === 'ID'
                        ? 'bg-[#E51937] text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    National ID Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdType('DRIVING_LICENCE')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                      idType === 'DRIVING_LICENCE'
                        ? 'bg-[#E51937] text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Driving Licence
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">
                    {idType === 'ID' ? 'National ID Number' : 'Driving Licence Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. 31849201"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E51937]"
                  />
                </div>

                {/* Upload box */}
                <div className="border-2 border-dashed border-neutral-700 hover:border-[#E51937] rounded-xl p-3 text-center transition-colors">
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
                    <Upload className="w-5 h-5 text-neutral-400" />
                    <span className="font-bold text-neutral-300 text-xs">
                      {idFile ? idFile.name : `Upload ${idType === 'ID' ? 'National ID' : 'Driving Licence'} (Front & Back)`}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      PNG, JPG, or PDF (Max 15MB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Document 2: Proof of Residency (KRA or Utility Bill) */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white block">
                    2. Proof of Residency (POR)
                  </label>
                  <span className="text-[10px] text-neutral-400">Residency Verification</span>
                </div>

                {/* Toggle KRA vs Utility Bill */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResidencyType('KRA')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                      residencyType === 'KRA'
                        ? 'bg-[#E51937] text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    KRA Certificate / PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setResidencyType('UTILITY_BILL')}
                    className={`py-1.5 px-2 rounded-lg font-bold transition-all text-xs ${
                      residencyType === 'UTILITY_BILL'
                        ? 'bg-[#E51937] text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Utility Bill / Statement
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 block mb-1">
                    {residencyType === 'KRA' ? 'KRA PIN Number' : 'Utility Account / Reference No'}
                  </label>
                  <input
                    type="text"
                    required
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value)}
                    placeholder={residencyType === 'KRA' ? 'e.g. A009284192P' : 'e.g. KPLC-8491029'}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E51937]"
                  />
                </div>

                {/* Upload box */}
                <div className="border-2 border-dashed border-neutral-700 hover:border-[#E51937] rounded-xl p-3 text-center transition-colors">
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
                    <Upload className="w-5 h-5 text-neutral-400" />
                    <span className="font-bold text-neutral-300 text-xs">
                      {residencyFile
                        ? residencyFile.name
                        : `Upload ${residencyType === 'KRA' ? 'KRA PIN Certificate' : 'Utility Bill / Bank Statement'}`}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      PNG, JPG, or PDF (Issued within last 3 months)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Terms notice & Submit button */}
            <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>One-Time Verification Rule:</strong> Once uploaded, your documents are submitted
                  directly to the auto-verification gateway and locked. Verification clears automatically
                  after <strong>15 minutes</strong>.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#E51937] hover:bg-[#c9142f] text-white font-bold text-xs rounded-xl shadow-lg transition-all shadow-red-950/40 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Submit for Automated 15-Minute Verification</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
