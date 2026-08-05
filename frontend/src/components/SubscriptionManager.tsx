import { API_BASE } from "../config/api";
import { useEffect, useState } from "react";
import {
  Zap,
  CheckCircle,
  Crown,
  Sparkles,
  Building2,
  Users,
  Bot,
  ArrowRight,
  Headphones,
  BookOpen,
  Code,
  Wrench,
  Loader2,
  AlertCircle,
  Check,
  X
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  tagline: string;
  features: string[];
  limits: {
    max_users: string | number;
    max_workflows: string | number;
    ai_report_generations: string | number;
  };
};

type AddOnService = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  recurring?: string;
};

type SubscriptionData = {
  organisation_name: string;
  current_plan: Plan;
  user_count: number;
  plans_catalog: Plan[];
  addon_services: AddOnService[];
};

type Props = {
  token: string;
  userRole: string;
};

export default function SubscriptionManager({ token, userRole }: Props) {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [requestingAddon, setRequestingAddon] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState("");

  const isAdmin = userRole === "superadmin" || userRole === "admin";

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load subscription details");
      const result = await res.json();
      setData(result);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [token]);

  const handleUpgradePlan = async (planId: string) => {
    if (!isAdmin) {
      alert("Only Organisation Administrators can upgrade or change subscription plans.");
      return;
    }
    setUpgradingPlan(planId);
    setSuccessNotice("");

    try {
      const res = await fetch(`${API_BASE}/api/billing/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail ?? "Failed to upgrade plan");

      setSuccessNotice(resData.message);
      fetchSubscriptionData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleRequestAddon = async (addon: AddOnService) => {
    setRequestingAddon(addon.id);
    setSuccessNotice("");

    try {
      const res = await fetch(`${API_BASE}/api/billing/addon-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ service_id: addon.id }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail ?? "Failed to submit add-on request");

      setSuccessNotice(resData.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequestingAddon(null);
    }
  };

  const getServiceIcon = (category: string) => {
    switch (category) {
      case "Setup":
        return <Wrench className="h-5 w-5 text-violet-500" />;
      case "Automation":
        return <Zap className="h-5 w-5 text-amber-500" />;
      case "AI":
        return <Bot className="h-5 w-5 text-emerald-500" />;
      case "Integrations":
        return <Code className="h-5 w-5 text-blue-500" />;
      case "Training":
        return <BookOpen className="h-5 w-5 text-pink-500" />;
      case "Support":
        return <Headphones className="h-5 w-5 text-red-500" />;
      default:
        return <Sparkles className="h-5 w-5 text-indigo-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Billing & Subscriptions...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded-2xl border border-red-100 dark:border-red-900/50">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <span className="font-semibold">Error:</span> {error || "Unable to load billing data"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice("")} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl border border-violet-800/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Active Subscription
            </span>
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              {data.organisation_name}
            </span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            {data.current_plan.name}
          </h2>
          <p className="text-sm text-violet-200 max-w-xl">
            {data.current_plan.tagline}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 relative z-10">
          <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
            <div className="text-xs text-violet-200 uppercase font-semibold">Active Users</div>
            <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
              <Users className="h-5 w-5 text-violet-300" />
              {data.user_count} <span className="text-xs text-violet-300 font-normal">/ {data.current_plan.limits.max_users}</span>
            </div>
          </div>

          <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
            <div className="text-xs text-violet-200 uppercase font-semibold">Monthly Rate</div>
            <div className="text-2xl font-bold text-white">
              ${data.current_plan.price_monthly}<span className="text-xs text-violet-300 font-normal">/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Plans</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Scale your automation operations with flexible monthly tiers</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {data.plans_catalog.map((plan) => {
            const isCurrent = plan.id === data.current_plan.id;
            const isPro = plan.id === "professional";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 ${
                  isCurrent
                    ? "bg-violet-50/50 dark:bg-violet-950/20 border-violet-500 dark:border-violet-500/80 shadow-lg ring-1 ring-violet-500/30"
                    : isPro
                    ? "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/50 shadow-md hover:shadow-xl"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md"
                }`}
              >
                {isPro && !isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    Most Popular
                  </span>
                )}

                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                    <Check className="h-3 w-3" /> Current Plan
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">${plan.price_monthly}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ month</span>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500">Plan Features</div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    disabled={isCurrent || upgradingPlan === plan.id}
                    onClick={() => handleUpgradePlan(plan.id)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isCurrent
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow"
                    }`}
                  >
                    {upgradingPlan === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Active Subscription"
                    ) : (
                      <>
                        <span>Switch to {plan.name}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Professional Services & Add-Ons */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Professional Services & Add-On Modules</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Accelerate growth with custom onboarding, bespoke workflows, AI KB setups, and integrations</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.addon_services.map((addon) => (
            <div
              key={addon.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl">
                    {getServiceIcon(addon.category)}
                  </div>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md">
                    {addon.category}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{addon.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{addon.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">${addon.price}</span>
                  {addon.recurring && <span className="text-[10px] font-semibold text-slate-400">/{addon.recurring}</span>}
                </div>

                <button
                  disabled={requestingAddon === addon.id}
                  onClick={() => handleRequestAddon(addon)}
                  className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:hover:bg-violet-900/50 dark:text-violet-300 text-xs font-bold rounded-xl border border-violet-200 dark:border-violet-800/50 transition-all flex items-center gap-1"
                >
                  {requestingAddon === addon.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Request Service"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
