"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlowButton } from "@/components/GlowButton";
import { DeveloperBadge } from "@/components/DeveloperBadge";
import { Shield, Zap, Users, TrendingUp, KeyRound } from "lucide-react";

const DEMO_ROLL = "DM136";
const DEMO_PASSWORD = "demo1234";

export default function LoginPage() {
  const router = useRouter();
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) router.replace("/dashboard");
      })
      .finally(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rollNumber, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    router.push(`/welcome?name=${encodeURIComponent(data.user.name)}`);
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col lg:flex-row">
      {checkingSession && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <p className="text-sm text-slate-500">Checking session…</p>
        </div>
      )}
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative z-10 max-w-lg"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-700">TAPMI · MSM</p>
              <p className="text-sm text-slate-500">MBA-MKT Batch 2025-27</p>
            </div>
          </div>

          <h1 className="text-4xl font-black text-slate-900 lg:text-5xl">
            MSM{" "}
            <span className="bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Control Center
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Login with your roll number. Track leaves, stay on top of attendance, survive Term 5.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: Zap, text: "Smart leave tracking" },
              { icon: Users, text: "Class social feed" },
              { icon: TrendingUp, text: "Risk alerts & memes" },
              { icon: Shield, text: "Cohort-only access" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <Icon className="h-4 w-4 text-cyan-600" />
                <span className="text-xs text-slate-600">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white px-4 py-8 pb-16 sm:px-6 sm:py-12 lg:border-l lg:border-slate-200 lg:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your MSM roll number</p>

          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-700" />
              <p className="text-sm font-semibold text-amber-900">Demo login</p>
              <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                Fictional data
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-amber-800">Username (roll number)</dt>
              <dd>
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-900">{DEMO_ROLL}</code>
              </dd>
              <dt className="text-amber-800">Password</dt>
              <dd>
                <code className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold text-slate-900">{DEMO_PASSWORD}</code>
              </dd>
            </dl>
            <p className="mt-2 text-xs text-amber-800">
              {DEMO_ROLL} is the admin view (includes Analytics). Any roll number from DM101 to DM150 works with the same password.
            </p>
            <button
              type="button"
              onClick={() => {
                setRollNumber(DEMO_ROLL);
                setPassword(DEMO_PASSWORD);
                setError("");
              }}
              className="mt-3 w-full rounded-xl border border-amber-400 bg-white py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Fill demo login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field
              label="Roll Number"
              value={rollNumber}
              onChange={setRollNumber}
              placeholder="DM101"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
            />
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <GlowButton type="submit" className="w-full py-3 text-base" disabled={loading}>
              {loading ? "Signing in..." : "Launch Control Center →"}
            </GlowButton>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Public demo of the real app. All students, subjects and stats are fictional.
          </p>
        </motion.div>
      </div>
      <DeveloperBadge />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-200"
      />
    </label>
  );
}
