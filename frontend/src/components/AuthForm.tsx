import { useState } from "react";
import { Mail, Lock, User, Loader2, Sparkles, AlertCircle, Stethoscope, GraduationCap, Hotel, Building2, ShoppingCart } from "lucide-react";
import { InstitutionType } from "../config/InstitutionTheme";

type Props = {
  mode: "login" | "register";
  onSuccess: (token: string) => void;
  onToggleMode: () => void;
};

export default function AuthForm({ mode, onSuccess, onToggleMode }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institutionType, setInstitutionType] = useState<InstitutionType>("business");
  const [organisationName, setOrganisationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email, password }
            : {
                email,
                password,
                full_name: fullName,
                institution_type: institutionType,
                organisation_name: organisationName,
              }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = "An unexpected error occurred";
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            msg = data.detail.map((err: any) => err.msg || err.message).join(". ");
          } else {
            msg = data.detail;
          }
        }
        throw new Error(msg);
      }

      if (mode === "register") {
        // Automatically login after successful registration
        const loginRes = await fetch("http://localhost:8000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.access_token) {
          onSuccess(loginData.access_token);
        } else {
          onToggleMode(); // Fallback to manual login
        }
      } else {
        if (data.access_token) {
          onSuccess(data.access_token);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const institutions = [
    {
      id: "business" as InstitutionType,
      title: "Enterprise Business",
      desc: "Sales Leads & Financials",
      icon: Building2,
      border: "border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400",
    },
    {
      id: "ecommerce" as InstitutionType,
      title: "E-Commerce / Online Store",
      desc: "Orders, Products & Delivery",
      icon: ShoppingCart,
      border: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "hospital" as InstitutionType,
      title: "Hospital / Medical",
      desc: "Doctors, Patients & Checkups",
      icon: Stethoscope,
      border: "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400",
    },
    {
      id: "school" as InstitutionType,
      title: "School / Academy",
      desc: "Teachers, Students & Meetings",
      icon: GraduationCap,
      border: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400",
    },
    {
      id: "hotel" as InstitutionType,
      title: "Hotel / Hospitality",
      desc: "Staff, Guests & Rooms",
      icon: Hotel,
      border: "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl transition-all duration-300">
      <div className="flex flex-col items-center space-y-2 text-center">
        <div className="p-3 bg-violet-100 dark:bg-violet-950/50 rounded-xl text-violet-600 dark:text-violet-400">
          <Sparkles className="h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {mode === "login" ? "Welcome back" : "Register Organisation"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {mode === "login"
            ? "Enter your credentials to sign in to your workspace"
            : "Select your institution type and set up your admin workspace"}
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <div className="space-y-4">
            {/* Institution Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                1. Select Institution Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {institutions.map((inst) => {
                  const Icon = inst.icon;
                  const isSelected = institutionType === inst.id;
                  return (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => setInstitutionType(inst.id)}
                      className={`flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? inst.border + " ring-2 ring-violet-500/30 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="text-xs font-bold">{inst.title.split(" / ")[0]}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {inst.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Organisation Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                2. Organisation / Institution Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <Building2 className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. City General Hospital / Greenwood Academy"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all"
                />
              </div>
            </div>

            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                3. Admin Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <User className="h-5 w-5" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {mode === "register" ? "4. Email address" : "Email address"}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Mail className="h-5 w-5" />
            </span>
            <input
              type="email"
              placeholder="name@organisation.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {mode === "register" ? "5. Password (Uppercase, number & symbol e.g. Pass123!)" : "Password"}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Lock className="h-5 w-5" />
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Please wait...</span>
            </>
          ) : (
            <span>{mode === "login" ? "Sign in" : "Create Account & Register Institution"}</span>
          )}
        </button>
      </form>

      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
        <span className="absolute bg-white dark:bg-slate-900 px-3 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
          Or
        </span>
      </div>

      <button
        onClick={onToggleMode}
        className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-800 rounded-xl transition-all"
      >
        {mode === "login" ? "Register new institution" : "Sign in to existing account"}
      </button>
    </div>
  );
}
