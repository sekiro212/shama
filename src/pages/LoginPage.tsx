import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Mail, Lock, LogIn, UserPlus, Loader2, ArrowLeft,
  KeyRound, ShieldCheck, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type PageMode = "signin" | "signup" | "verify-otp" | "forgot-password" | "reset-otp" | "new-password";

export default function LoginPage() {
  const [mode, setMode] = useState<PageMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { user, signIn, signUp, signInWithGoogle, verifyOtp, resetPassword, updatePassword } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  useEffect(() => {
    if (user && mode !== "verify-otp" && mode !== "reset-otp" && mode !== "new-password") {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from, mode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const resetOtpFields = () => setOtp(["", "", "", "", "", ""]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const otpCode = otp.join("");

  // Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error(t("auth.fillAllFields")); return; }
    setLoading(true);
    const result = await signIn(email, password);
    if (result.success) {
      toast.success(t("auth.welcomeBackToast"));
    } else {
      toast.error(result.error || t("auth.signInFailed"));
    }
    setLoading(false);
  };

  // Sign Up → go to OTP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error(t("auth.fillAllFields")); return; }
    if (password.length < 6) { toast.error(t("auth.passwordMinLength")); return; }
    if (password !== confirmPassword) { toast.error(t("auth.passwordsNoMatch")); return; }
    setLoading(true);
    const result = await signUp(email, password);
    if (result.success) {
      toast.success(t("auth.otpSent"));
      resetOtpFields();
      setMode("verify-otp");
      setResendCooldown(60);
    } else {
      toast.error(result.error || t("auth.signUpFailed"));
    }
    setLoading(false);
  };

  // Verify signup OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { toast.error(t("auth.otpIncomplete")); return; }
    setLoading(true);
    const result = await verifyOtp(email, otpCode, "signup");
    if (result.success) {
      toast.success(t("auth.emailVerified"));
    } else {
      toast.error(result.error || t("auth.otpInvalid"));
      resetOtpFields();
    }
    setLoading(false);
  };

  // Forgot password → send code
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error(t("auth.enterEmail")); return; }
    setLoading(true);
    const result = await resetPassword(email);
    if (result.success) {
      toast.success(t("auth.resetOtpSent"));
      resetOtpFields();
      setMode("reset-otp");
      setResendCooldown(60);
    } else {
      toast.error(result.error || t("auth.resetFailed"));
    }
    setLoading(false);
  };

  // Verify reset OTP → go to new password
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { toast.error(t("auth.otpIncomplete")); return; }
    setLoading(true);
    const result = await verifyOtp(email, otpCode, "recovery");
    if (result.success) {
      toast.success(t("auth.otpVerifiedReset"));
      setMode("new-password");
    } else {
      toast.error(result.error || t("auth.otpInvalid"));
      resetOtpFields();
    }
    setLoading(false);
  };

  // Set new password
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { toast.error(t("auth.fillAllFields")); return; }
    if (newPassword.length < 6) { toast.error(t("auth.passwordMinLength")); return; }
    if (newPassword !== confirmNewPassword) { toast.error(t("auth.passwordsNoMatch")); return; }
    setLoading(true);
    const result = await updatePassword(newPassword);
    if (result.success) {
      toast.success(t("auth.passwordResetSuccess"));
      navigate(from, { replace: true });
    } else {
      toast.error(result.error || t("auth.resetFailed"));
    }
    setLoading(false);
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    if (mode === "verify-otp") {
      await signUp(email, password);
    } else {
      await resetPassword(email);
    }
    toast.success(t("auth.otpResent"));
    resetOtpFields();
    setResendCooldown(60);
    setLoading(false);
  };

  if (user && mode !== "verify-otp" && mode !== "reset-otp" && mode !== "new-password") return null;

  // Determine form handler
  const formHandlers: Record<PageMode, (e: React.FormEvent) => Promise<void>> = {
    signin: handleSignIn,
    signup: handleSignUp,
    "verify-otp": handleVerifyOtp,
    "forgot-password": handleForgotPassword,
    "reset-otp": handleVerifyResetOtp,
    "new-password": handleNewPassword,
  };

  const getTitle = () => {
    switch (mode) {
      case "signin": return t("auth.welcomeBack");
      case "signup": return t("auth.createAccount");
      case "verify-otp": return t("auth.verifyEmail");
      case "forgot-password": return t("auth.forgotPassword");
      case "reset-otp": return t("auth.enterCode");
      case "new-password": return t("auth.newPassword");
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "signin": return t("auth.signInDesc");
      case "signup": return t("auth.signUpDesc");
      case "verify-otp": return `${t("auth.otpSentTo")} ${email}`;
      case "forgot-password": return t("auth.forgotPasswordDesc");
      case "reset-otp": return `${t("auth.resetOtpSentTo")} ${email}`;
      case "new-password": return t("auth.newPasswordDesc");
    }
  };

  const getIcon = () => {
    switch (mode) {
      case "signin": return <LogIn className="w-8 h-8 text-white" />;
      case "signup": return <UserPlus className="w-8 h-8 text-white" />;
      case "verify-otp":
      case "reset-otp": return <KeyRound className="w-8 h-8 text-white" />;
      case "forgot-password": return <Mail className="w-8 h-8 text-white" />;
      case "new-password": return <ShieldCheck className="w-8 h-8 text-white" />;
    }
  };

  // OTP input component
  const OtpInputs = () => (
    <div className="flex justify-center gap-2 sm:gap-3" dir="ltr">
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { otpRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpChange(i, e.target.value)}
          onKeyDown={(e) => handleOtpKeyDown(i, e)}
          onPaste={i === 0 ? handleOtpPaste : undefined}
          className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] focus:ring-2 focus:ring-[#5B8DD9]/50 focus:outline-none transition-all border"
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-3 sm:px-4 pt-20 md:pt-24 pb-8 sm:pb-12" dir={isRTL ? "rtl" : "ltr"}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5B8DD9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#3E6BB5]/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back link */}
        {(mode === "signin" || mode === "signup") ? (
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-6 transition-colors dark:text-white/60 text-[#6B7B8D] dark:hover:text-white hover:text-[#323D50]"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            {t("auth.backToHome")}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (mode === "verify-otp") setMode("signup");
              else if (mode === "forgot-password") setMode("signin");
              else if (mode === "reset-otp") setMode("forgot-password");
              else if (mode === "new-password") setMode("signin");
              resetOtpFields();
            }}
            className="inline-flex items-center gap-2 mb-6 transition-colors dark:text-white/60 text-[#6B7B8D] dark:hover:text-white hover:text-[#323D50]"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            {t("common.back")}
          </button>
        )}

        <div className="glass-card dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-2xl p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 glass rounded-2xl bg-gradient-to-br from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center shadow-lg shadow-[#5B8DD9]/25">
              {getIcon()}
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2">{getTitle()}</h1>
            <p className="dark:text-white/60 text-[#6B7B8D] text-sm">{getDescription()}</p>
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={formHandlers[mode]}
              className="space-y-5"
            >
              {/* ===== SIGN IN ===== */}
              {mode === "signin" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Mail className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.email")}
                    </Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Lock className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.password")}
                    </Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                  <div className="text-end">
                    <button type="button" onClick={() => setMode("forgot-password")}
                      className="text-[#5B8DD9] hover:text-[#3E6BB5] text-sm font-medium transition-colors">
                      {t("auth.forgotPasswordLink")}
                    </button>
                  </div>
                </>
              )}

              {/* ===== SIGN UP ===== */}
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Mail className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.email")}
                    </Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.emailPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Lock className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.password")}
                    </Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Lock className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.confirmPassword")}
                    </Label>
                    <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                </>
              )}

              {/* ===== VERIFY OTP (signup) ===== */}
              {mode === "verify-otp" && (
                <>
                  <OtpInputs />
                  <div className="text-center">
                    <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                      className="inline-flex items-center gap-1.5 text-[#5B8DD9] hover:text-[#3E6BB5] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {resendCooldown > 0
                        ? `${t("auth.resendIn")} ${resendCooldown}s`
                        : t("auth.resendCode")}
                    </button>
                  </div>
                </>
              )}

              {/* ===== FORGOT PASSWORD ===== */}
              {mode === "forgot-password" && (
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                    <Mail className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                    {t("auth.email")}
                  </Label>
                  <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                </div>
              )}

              {/* ===== RESET OTP ===== */}
              {mode === "reset-otp" && (
                <>
                  <OtpInputs />
                  <div className="text-center">
                    <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
                      className="inline-flex items-center gap-1.5 text-[#5B8DD9] hover:text-[#3E6BB5] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {resendCooldown > 0
                        ? `${t("auth.resendIn")} ${resendCooldown}s`
                        : t("auth.resendCode")}
                    </button>
                  </div>
                </>
              )}

              {/* ===== NEW PASSWORD ===== */}
              {mode === "new-password" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Lock className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.newPassword")}
                    </Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword" className="dark:text-white/90 text-[#6B7B8D] font-medium">
                      <Lock className={`w-4 h-4 inline ${isRTL ? "ml-2" : "mr-2"}`} />
                      {t("auth.confirmPassword")}
                    </Label>
                    <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder")}
                      className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-xl dark:placeholder:text-white/30 placeholder:text-[#6B7B8D] focus:ring-2 focus:ring-[#5B8DD9]/50" />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button type="submit" disabled={loading}
                className="w-full glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl py-3 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#5B8DD9]/25 disabled:opacity-50 disabled:hover:scale-100">
                {loading && <Loader2 className={`w-5 h-5 animate-spin ${isRTL ? "ml-2" : "mr-2"}`} />}
                {loading ? t("auth.pleaseWait") : (
                  <>
                    {mode === "signin" && <><LogIn className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.signInButton")}</>}
                    {mode === "signup" && <><UserPlus className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.signUpButton")}</>}
                    {mode === "verify-otp" && <><ShieldCheck className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.verifyButton")}</>}
                    {mode === "forgot-password" && <><Mail className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.sendCodeButton")}</>}
                    {mode === "reset-otp" && <><ShieldCheck className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.verifyButton")}</>}
                    {mode === "new-password" && <><ShieldCheck className={`w-5 h-5 ${isRTL ? "ml-2" : "mr-2"}`} />{t("auth.resetPasswordButton")}</>}
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          {/* Google Sign In (only on signin/signup) */}
          {(mode === "signin" || mode === "signup") && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px dark:bg-white/10 bg-[#323D50]/10" />
                <span className="dark:text-white/40 text-[#6B7B8D] text-sm">{t("auth.orContinueWith")}</span>
                <div className="flex-1 h-px dark:bg-white/10 bg-[#323D50]/10" />
              </div>

              {/* Google Button */}
              <Button
                type="button"
                disabled={googleLoading}
                onClick={async () => {
                  setGoogleLoading(true);
                  const result = await signInWithGoogle();
                  if (!result.success) {
                    toast.error(result.error || t("auth.googleFailed"));
                    setGoogleLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#f0f0f0] border rounded-xl py-3 font-semibold text-base transition-all duration-300 hover:scale-105"
                variant="outline"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {t("auth.continueWithGoogle")}
              </Button>
            </>
          )}

          {/* Toggle mode (only on signin/signup) */}
          {(mode === "signin" || mode === "signup") && (
            <div className="mt-6 text-center">
              <p className="dark:text-white/60 text-[#6B7B8D] text-sm">
                {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                <button type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setConfirmPassword("");
                  }}
                  className="text-[#5B8DD9] hover:text-[#3E6BB5] font-semibold transition-colors">
                  {mode === "signin" ? t("auth.signUpLink") : t("auth.signInLink")}
                </button>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
