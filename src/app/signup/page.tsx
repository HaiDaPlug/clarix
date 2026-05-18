"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useSpring, useMotionValueEvent } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { NoiseTexture } from "@/components/ui/noise-texture";
import { AuroraText } from "@/components/ui/aurora-text";

function SignupContent() {
  const { t } = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes:
          "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics https://www.googleapis.com/auth/webmasters.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(t.login.errorGeneric);
    } else {
      setSuccess(t.login.successSignup);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-dvh flex" style={{ backgroundColor: "var(--bone)" }}>

      {/* Back button */}
      <div className="fixed top-0 left-0 px-8 py-5 z-10">
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-xs transition-opacity hover:opacity-60 cursor-pointer"
          style={{ color: "var(--slate)" }}
        >
          <ArrowLeft size={14} />
          Tillbaka till inloggning
        </button>
      </div>

      {/* Form column */}
      <div className="flex flex-col justify-center px-10 lg:px-14 w-full lg:w-[35%] min-h-dvh">
        <motion.div
          className="flex flex-col gap-8 max-w-[320px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col gap-1">
            <h1
              className="font-display text-[2rem] leading-[1.15] tracking-tight"
              style={{ color: "var(--charcoal)" }}
            >
              Skapa konto.
            </h1>
            <p className="text-sm" style={{ color: "var(--slate)" }}>
              Kom igång på under en minut.
            </p>
          </div>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-3 w-full px-5 py-3 rounded-full text-sm font-medium transition-opacity hover:opacity-75 cursor-pointer"
            style={{ backgroundColor: "var(--charcoal)", color: "var(--bone)" }}
          >
            <GoogleIcon />
            Fortsätt med Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--rule)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--slate-light)" }}>
              eller
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--rule)" }} />
          </div>

          {/* Signup form */}
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-postadress"
              className="w-full text-sm px-0 py-2.5 bg-transparent outline-none border-b transition-colors"
              style={{ borderColor: "var(--rule)", color: "var(--charcoal)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--charcoal)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lösenord (minst 8 tecken)"
              className="w-full text-sm px-0 py-2.5 bg-transparent outline-none border-b transition-colors"
              style={{ borderColor: "var(--rule)", color: "var(--charcoal)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--charcoal)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
            />
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Bekräfta lösenord"
              className="w-full text-sm px-0 py-2.5 bg-transparent outline-none border-b transition-colors"
              style={{ borderColor: "var(--rule)", color: "var(--charcoal)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--charcoal)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--rule)")}
            />

            {error && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--signal-down)" }}>{error}</p>
            )}
            {success && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--signal-up)" }}>{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-sm font-medium mt-1 transition-opacity hover:opacity-75 disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: "var(--charcoal)", color: "var(--bone)" }}
            >
              {loading ? "…" : "Skapa konto"}
            </button>
          </form>

          <button
            onClick={() => router.push("/login")}
            className="text-xs text-left transition-opacity hover:opacity-60 cursor-pointer"
            style={{ color: "var(--slate)" }}
          >
            Har du redan ett konto? Logga in
          </button>
        </motion.div>
      </div>

      {/* Right panel */}
      <RightPanel />
    </main>
  );
}

const PHOTO = "url('/metaphors/cloudmind.jpg')";

function RightPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const blurredRef = useRef<HTMLDivElement>(null);

  const rawX = useSpring(-1, { stiffness: 120, damping: 20 });
  const revealed = useRef(false);

  useMotionValueEvent(rawX, "change", (px) => {
    if (revealed.current) return;

    const width = panelRef.current?.offsetWidth ?? 0;

    if (px < 0 || width === 0) {
      if (blurredRef.current) {
        blurredRef.current.style.maskImage = "none";
        blurredRef.current.style.webkitMaskImage = "none";
      }
      return;
    }

    if (px >= width * 0.97) {
      revealed.current = true;
      if (blurredRef.current) blurredRef.current.style.opacity = "0";
      return;
    }

    const mask = `linear-gradient(to right, transparent 0px, transparent ${px}px, black ${px}px, black 100%)`;
    if (blurredRef.current) {
      blurredRef.current.style.maskImage = mask;
      blurredRef.current.style.webkitMaskImage = mask;
    }
  });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (revealed.current) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set(e.clientX - rect.left);
  }, [rawX]);

  const onMouseLeave = useCallback(() => {
    if (revealed.current) return;
    rawX.set(-1);
  }, [rawX]);

  return (
    <div
      ref={panelRef}
      className="hidden lg:flex flex-1 relative overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: PHOTO }} />
      <div
        ref={blurredRef}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: PHOTO,
          filter: "blur(36px) brightness(0.9)",
          transform: "scale(1.15)",
        }}
      />
      <NoiseTexture
        className="absolute inset-0 z-10 opacity-[0.18] dark:opacity-[0.18]"
        frequency={0.75}
        octaves={4}
        slope={0.5}
        noiseOpacity={1}
      />
      <div className="absolute bottom-10 left-10 z-20 pointer-events-none">
        <p className="font-display text-[2.6rem] leading-[1.2] tracking-tight text-left text-white">
          <span>Få </span>
          <AuroraText className="font-semibold"
            colors={["#FF4D9E", "#FF6B55", "#FFB830", "#FF6B55"]}
            speed={0.5}
          >
            klarhet
          </AuroraText>
          <span> i din data,</span>
          <br />
          <span>med </span>
          <AuroraText className="font-semibold"
            colors={["#FFB830", "#FF6B55", "#FF4D9E", "#FF6B55"]}
            speed={1.4}
          >
            Clarix
          </AuroraText>
          <span>.</span>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <LocaleProvider>
      <SignupContent />
    </LocaleProvider>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
