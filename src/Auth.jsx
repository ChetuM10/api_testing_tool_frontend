import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  CheckCircle,
  AlertCircle,
  Lock,
} from "lucide-react";

// Initialize Supabase Client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function Auth({ onLogin, initialView = "login" }) {
  // <--- Accept prop
  // Views: 'login' | 'signup' | 'forgot' | 'update'
  const [view, setView] = useState(initialView); // <--- Use prop
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sync state if prop changes
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  // Detect Password Recovery Flow (Internal listener)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("update");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- HANDLERS ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.includes("Email not confirmed"))
          throw new Error("NOT_CONFIRMED");
        throw error;
      }
      if (data.user) onLogin(data.user);
    } catch (err) {
      setError(
        err.message === "NOT_CONFIRMED"
          ? "Your email is not verified yet."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMessage("Account created! Check your email to verify.");
      setView("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage("Password reset link sent! Check your email.");
      setView("login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;

      alert(
        "Password updated successfully! Please log in with your new password."
      );

      // Sign out to force a fresh login
      await supabase.auth.signOut();

      // IMPORTANT: Tell App.jsx to clear 'isPasswordRecovery' state
      if (onLogin) onLogin(null);

      setView("login");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setMessage("Verification email resent! Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ToggleIcon = () => (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  // --- RENDER ---
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F172A] text-slate-200 p-4">
      <div className="w-full max-w-md p-8 bg-[#1E293B] rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          {view === "login" && "Welcome Back"}
          {view === "signup" && "Create Account"}
          {view === "forgot" && "Reset Password"}
          {view === "update" && "Set New Password"}
        </h2>
        <p className="text-center text-slate-500 text-sm mb-6">
          {view === "login" &&
            "Enter your credentials to access your workspace"}
          {view === "signup" && "Start building your API collections today"}
          {view === "forgot" && "Enter your email to receive a reset link"}
          {view === "update" && "Please enter your new password below"}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{error}</p>
              {error === "Your email is not verified yet." && (
                <button
                  onClick={handleResendVerification}
                  className="mt-2 text-xs font-bold underline hover:text-rose-300"
                >
                  Resend Verification Email
                </button>
              )}
            </div>
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle size={16} />
            {message}
          </div>
        )}

        <form
          onSubmit={
            view === "login"
              ? handleLogin
              : view === "signup"
              ? handleSignup
              : view === "forgot"
              ? handleForgotPassword
              : handleUpdatePassword
          }
          className="space-y-4"
        >
          {view !== "update" && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg pl-10 pr-4 py-3 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-600"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
          )}

          {view !== "forgot" && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {view === "update" ? "New Password" : "Password"}
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg pl-10 pr-10 py-3 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
                <ToggleIcon />
              </div>
            </div>
          )}

          {view === "update" && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg pl-10 pr-10 py-3 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {view === "login" && "Log In"}
            {view === "signup" && "Sign Up"}
            {view === "forgot" && "Send Reset Link"}
            {view === "update" && "Update Password"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          {view === "login" && (
            <>
              <button
                onClick={() => setView("forgot")}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                Forgot Password?
              </button>
              <button
                onClick={() => setView("signup")}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign Up
              </button>
            </>
          )}

          {(view === "signup" || view === "forgot") && (
            <button
              onClick={() => setView("login")}
              className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors mx-auto"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
