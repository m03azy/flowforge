import { useState, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  QrCode,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type Props = {
  token: string;
  totpEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
};

type Step = "idle" | "scanning" | "verifying" | "success";

const API = "http://localhost:8000";

export default function TwoFactorSettings({ token, totpEnabled, onStatusChange }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [secret, setSecret] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Generate QR code client-side using canvas
  const buildQrDataUrl = useCallback(async (uri: string) => {
    try {
      // Use Google Charts API to render QR (no npm dependency needed)
      const encoded = encodeURIComponent(uri);
      setQrDataUrl(
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`
      );
    } catch {
      setQrDataUrl("");
    }
  }, []);

  const startSetup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/2fa/setup`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to get setup info");
      setSecret(data.secret);
      await buildQrDataUrl(data.totp_uri);
      setStep("scanning");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async () => {
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/2fa/enable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Verification failed");
      setStep("success");
      onStatusChange(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (disableCode.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/2fa/disable`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to disable 2FA");
      setShowDisable(false);
      setDisableCode("");
      onStatusChange(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCodeInput = (val: string) => {
    // Only accept digits, max 6
    setCode(val.replace(/\D/g, "").slice(0, 6));
  };
  const handleDisableInput = (val: string) => {
    setDisableCode(val.replace(/\D/g, "").slice(0, 6));
  };

  if (totpEnabled && step !== "idle") {
    // Already enabled and showing success state
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl ${
            totpEnabled
              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          }`}
        >
          {totpEnabled ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <Shield className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-white text-base">
            Two-Factor Authentication (2FA)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {totpEnabled
              ? "Your account is protected with an authenticator app."
              : "Add an extra layer of security using Google Authenticator, Authy, or any TOTP app."}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            totpEnabled
              ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          }`}
        >
          {totpEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── SETUP FLOW ──────────────────────────────── */}
      {!totpEnabled && step === "idle" && (
        <button
          onClick={startSetup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          Set Up Two-Factor Authentication
        </button>
      )}

      {step === "scanning" && (
        <div className="space-y-5">
          {/* Step 1: Scan */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-bold">
                1
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Scan this QR code with your authenticator app
              </p>
            </div>
            <div className="flex justify-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <img
                    src={qrDataUrl}
                    alt="2FA QR Code"
                    className="h-44 w-44 block"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="h-44 w-44 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-slate-400" />
                </div>
              )}
            </div>
            {/* Manual entry secret */}
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Can't scan? Enter this secret manually in your app:
              </p>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-sm">
                <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                <span className={`flex-1 tracking-wider text-slate-700 dark:text-slate-300 ${showSecret ? "" : "blur-sm select-none"}`}>
                  {secret}
                </span>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={copySecret}
                  className="text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  {copiedSecret ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Enter code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-xs font-bold">
                2
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Enter the 6-digit code from your app
              </p>
            </div>
            {/* OTP input boxes */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-11 w-11 flex items-center justify-center rounded-xl border-2 text-lg font-bold transition-all ${
                    i < code.length
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300"
                      : "border-slate-200 dark:border-slate-700 text-transparent"
                  }`}
                >
                  {code[i] || ""}
                </div>
              ))}
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => handleCodeInput(e.target.value)}
              maxLength={6}
              className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-white rounded-xl outline-none text-center tracking-[0.5em] font-mono text-lg transition-all"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setStep("idle"); setError(""); setCode(""); }}
              className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmEnable}
              disabled={loading || code.length < 6}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Verify &amp; Enable 2FA
            </button>
          </div>
        </div>
      )}

      {/* Success state */}
      {(step === "success" || (totpEnabled && step === "idle")) && (
        <div className="space-y-4">
          {step === "success" && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm rounded-xl">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="font-medium">Two-factor authentication is now active on your account!</span>
            </div>
          )}

          {totpEnabled && !showDisable && (
            <button
              onClick={() => { setShowDisable(true); setError(""); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
            >
              <ShieldOff className="h-4 w-4" />
              Disable Two-Factor Authentication
            </button>
          )}

          {/* Disable confirmation form */}
          {showDisable && (
            <div className="space-y-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                ⚠️ Confirm disabling 2FA
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80">
                Enter your current authenticator code to confirm. This will remove 2FA protection from your account.
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={disableCode}
                  onChange={(e) => handleDisableInput(e.target.value)}
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-slate-900 dark:text-white rounded-xl outline-none font-mono text-center tracking-[0.3em] transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDisable(false); setDisableCode(""); setError(""); }}
                  className="flex-1 py-2 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDisable}
                  disabled={loading || disableCode.length < 6}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                  Disable 2FA
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
