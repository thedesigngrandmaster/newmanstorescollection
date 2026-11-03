import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/site/Icon";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Admin" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/admin" });
  }, [session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-card border border-border p-8 shadow-xl"
      >
        <Link to="/" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
          <Icon name="chevron-back-outline" size={14} /> Back to shop
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold">
          {mode === "signin" ? "Admin sign in" : "Create admin account"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {mode === "signin"
            ? "For admins and staff of the shop."
            : "First user gets an admin role automatically."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:ring-2 ring-primary/30"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
}