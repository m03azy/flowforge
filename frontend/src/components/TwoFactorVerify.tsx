import { API_BASE } from "../config/api";
import { useState } from "react";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, Smartphone } from "lucide-react";

type Props = {
  twoFaToken: string;
  onSuccess: (token: string) => void;
  onBack: () => void;
};

const API = `${API_BASE}`;

export default function TwoFactorVerify({ twoFaToken, onSuccess, onBack }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCodeInput = (val: string) => {
    setCode(val.replace(/\D/g, "").slice(0, 6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/2fa/login-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ two_fa_token: twoFaToken, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");
      if (data.access_token) {
        onSuccess(data.access_token);
      } else {
        throw new Error("No token received from server");
      }
    } catch (e: any) {
      setError(e.message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col items-center space-y-3 text-center">
        <div className="p-4 bg-violet-100 dark:bg-violet-950/50 rounded-2xl text-violet-600 dark:text-violet-400">
          <ShieldCheck className="h-9 w-9" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Two-Factor Verification
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Open your authenticator app and enter the 6-digit code for FlowForge.
          </p>
        </div>
      </div>

      {/* Authenticator app hint */}
      <div className="flex items-center gap-3 p-3.5 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 rounded-xl text-sm text-violet-700 dark:text-violet-300">
        <Smartphone className="h-5 w-5 shrink-0" />
        <span>Use Google Authenticator, Authy, or any TOTP app.</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP boxes */}
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-12 w-12 flex items-center justify-center rounded-xl border-2 text-xl font-bold transition-all ${
                  i < code.length
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 scale-105"
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
            autoFocus
            placeholder="000000"
            value={code}
            onChange={(e) => handleCodeInput(e.target.value)}
            maxLength={6}
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-900 dark:text-white rounded-xl outline-none text-center tracking-[0.8em] font-mono text-2xl transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" />
              <span>Verify &amp; Sign In</span>
            </>
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </button>
    </div>
  );
}
