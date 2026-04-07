import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Eye, Loader2, ShieldCheck, Check, Copy } from "lucide-react";
import raynLogo from "@/assets/rayn-logo.png";
import { supabase } from "@/integrations/supabase/client";
const debugLog = (...args) => {
  if (typeof window !== "undefined" && window.__DEBUG__) {
    console.log("[AUTH]", ...args);
  }
};
const AuthContext = createContext(null);
const defaultAuthContext = {
  user: null,
  loading: true,
  error: null,
  supabaseClient: null,
  mfaState: "none",
  clearMfaState: () => {
  },
  signIn: async () => {
  },
  signUp: async () => {
  },
  signOut: async () => {
  },
  resetPassword: async () => {
  },
  sendActivationEmail: async () => {
  },
  activateUser: async () => {
  },
  changePassword: async () => ({ success: false, error: "Not configured" })
};
const AuthProvider = ({ config, children }) => {
  const { supabaseClient, mfa: mfaConfig } = config;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mfaState, setMfaState] = useState("none");
  const mfaCheckInProgress = React.useRef(true);
  useEffect(() => {
    const getInitialSession = async () => {
      var _a, _b;
      try {
        const { data: { session }, error: error2 } = await supabaseClient.auth.getSession();
        if (error2) throw error2;
        if (!session) {
          debugLog("[AuthProvider] getInitialSession: no session");
          setUser(null);
          return;
        }
        const { data: aalData } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        const { currentLevel, nextLevel } = aalData ?? {};
        debugLog("[AuthProvider] getInitialSession AAL", { currentLevel, nextLevel, email: (_a = session.user) == null ? void 0 : _a.email });
        if (currentLevel === "aal1" && nextLevel === "aal2") {
          const provider = (_b = session.user.app_metadata) == null ? void 0 : _b.provider;
          const isOAuth = provider && provider !== "email";
          if (isOAuth) {
            debugLog("[AuthProvider] getInitialSession: OAuth session (provider:", provider, ") — skipping TOTP challenge");
            setUser(session.user);
            return;
          }
          debugLog("[AuthProvider] getInitialSession: aal1 session with enrolled factor → mfaState: challenge");
          setMfaState("challenge");
          return;
        }
        setUser(session.user);
      } catch (error2) {
        debugLog("[AuthProvider] getInitialSession error", error2.message);
        setError(error2.message);
      } finally {
        mfaCheckInProgress.current = false;
        setLoading(false);
      }
    };
    getInitialSession();
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        var _a, _b, _c, _d, _e, _f;
        debugLog("[AuthProvider] onAuthStateChange", event, ((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email) ?? "no user");
        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && mfaCheckInProgress.current) {
          debugLog("[AuthProvider]", event, "suppressed — MFA/session check in progress");
          setLoading(false);
          return;
        }
        if (event === "SIGNED_IN" && (session == null ? void 0 : session.user)) {
          const provider = (_b = session.user.app_metadata) == null ? void 0 : _b.provider;
          const isOAuth = provider && provider !== "email";
          debugLog("[AuthProvider] SIGNED_IN provider:", provider, "isOAuth:", isOAuth);
          if (isOAuth) {
            try {
              const userId = session.user.id;
              const email = session.user.email ?? "";
              const fullName = ((_c = session.user.user_metadata) == null ? void 0 : _c.full_name) ?? ((_d = session.user.user_metadata) == null ? void 0 : _d.name) ?? "";
              const entraOid = ((_e = session.user.user_metadata) == null ? void 0 : _e.sub) ?? ((_f = session.user.user_metadata) == null ? void 0 : _f.provider_id) ?? null;
              const { data: existing } = await supabaseClient.from("profiles").select("id, status, entra_oid").eq("id", userId).maybeSingle();
              if (!existing) {
                debugLog("[AuthProvider] JIT creating profile for", email);
                await supabaseClient.from("profiles").insert({
                  id: userId,
                  email,
                  full_name: fullName,
                  status: "Active",
                  entra_oid: entraOid
                });
              } else {
                if (entraOid && !existing.entra_oid) {
                  await supabaseClient.from("profiles").update({ entra_oid: entraOid }).eq("id", userId);
                }
                if (existing.status === "Inactive") {
                  debugLog("[AuthProvider] OAuth user is Inactive → signing out");
                  await supabaseClient.auth.signOut();
                  setError("Your account has been deactivated. Please contact your administrator.");
                  setLoading(false);
                  return;
                }
              }
            } catch (err) {
              debugLog("[AuthProvider] OAuth JIT error", err.message);
            }
          }
        }
        setUser((session == null ? void 0 : session.user) || null);
        setLoading(false);
        if (event === "SIGNED_OUT") {
          debugLog("[AuthProvider] SIGNED_OUT → clearing mfaState");
          setMfaState("none");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [supabaseClient]);
  const signIn = async (email, password) => {
    var _a;
    try {
      setLoading(true);
      setError(null);
      setMfaState("none");
      mfaCheckInProgress.current = true;
      const { data, error: error2 } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (error2) throw error2;
      debugLog("[AuthProvider] signIn success", (_a = data.user) == null ? void 0 : _a.email);
      const { data: profileData } = await supabaseClient.from("profiles").select("status").eq("id", data.user.id).single();
      if ((profileData == null ? void 0 : profileData.status) === "Inactive") {
        await supabaseClient.auth.signOut();
        throw new Error("Your account has been deactivated. Please contact your administrator.");
      }
      const { data: aalData, error: aalError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        debugLog("[AuthProvider] AAL check error", aalError.message);
      }
      const { currentLevel, nextLevel } = aalData ?? {};
      debugLog("[AuthProvider] AAL levels", { currentLevel, nextLevel });
      if (currentLevel === "aal1" && nextLevel === "aal2") {
        debugLog("[AuthProvider] → mfaState: challenge (factor enrolled, not yet verified)");
        setMfaState("challenge");
        return;
      }
      if (nextLevel === "aal1") {
        debugLog("[AuthProvider] No factor enrolled; checking requireEnrollment...");
        const shouldForce = (mfaConfig == null ? void 0 : mfaConfig.requireEnrollment) ? await mfaConfig.requireEnrollment(data.user, supabaseClient) : false;
        debugLog("[AuthProvider] requireEnrollment →", shouldForce);
        if (shouldForce) {
          debugLog("[AuthProvider] → mfaState: enroll (mandatory)");
          setMfaState("enroll");
          return;
        }
        debugLog("[AuthProvider] → mfaState: prompt (optional nudge)");
        setMfaState("prompt");
      }
      debugLog("[AuthProvider] → no MFA gate; setting user now");
      setUser(data.user);
    } catch (error2) {
      debugLog("[AuthProvider] signIn error", error2.message);
      setError(error2.message);
    } finally {
      mfaCheckInProgress.current = false;
      setLoading(false);
    }
  };
  const clearMfaState = () => setMfaState("none");
  const signUp = async (email, password, fullName) => {
    try {
      setLoading(true);
      setError(null);
      const redirectUrl = `${window.location.origin}/activate-account`;
      const { data, error: error2 } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName
          }
        }
      });
      if (error2) {
        throw error2;
      }
    } catch (error2) {
      setError(error2.message);
    } finally {
      setLoading(false);
    }
  };
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error: error2 } = await supabaseClient.auth.signOut();
      if (error2) {
        throw error2;
      }
    } catch (error2) {
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };
  const resetPassword = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const pathParts = typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean) : [];
      const reserved = ["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"];
      const clientSegment = pathParts[0] && !reserved.includes(pathParts[0]) ? pathParts[0] : "";
      const redirectUrl = typeof window !== "undefined" ? clientSegment ? `${window.location.origin}/${clientSegment}/reset-password` : `${window.location.origin}/reset-password` : void 0;
      debugLog("[AuthProvider] resetPassword", email);
      const { data, error: resetError } = await supabaseClient.functions.invoke("send-password-reset", {
        body: {
          email,
          redirectUrl
        }
      });
      if (resetError) throw resetError;
      if (data == null ? void 0 : data.error) {
        console.error("Edge Function returned error:", data.error);
        throw new Error(data.error);
      }
      debugLog("[AuthProvider] ✅ password reset email sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const sendActivationEmail = async (email) => {
    var _a;
    try {
      setLoading(true);
      setError(null);
      debugLog("[AuthProvider] sendActivationEmail", email);
      const pathParts = typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean) : [];
      const reserved = ["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"];
      const clientSegment = pathParts[0] && !reserved.includes(pathParts[0]) ? pathParts[0] : "";
      const redirectUrl = typeof window !== "undefined" ? clientSegment ? `${window.location.origin}/${clientSegment}/activate-account` : `${window.location.origin}/activate-account` : void 0;
      const { data, error: error2 } = await supabaseClient.functions.invoke("request-activation-link", {
        body: { email, redirectUrl }
      });
      if (error2) {
        throw error2;
      }
      if (data == null ? void 0 : data.error) {
        throw new Error(data.error);
      }
      debugLog("[AuthProvider] ✅ activation email sent");
    } catch (error2) {
      console.error("Activation email error:", error2);
      let message = (error2 == null ? void 0 : error2.message) ?? "An error occurred";
      if ((error2 == null ? void 0 : error2.context) && typeof ((_a = error2.context) == null ? void 0 : _a.json) === "function") {
        try {
          const body = await error2.context.json();
          if ((body == null ? void 0 : body.error) && typeof body.error === "string") message = body.error;
        } catch {
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };
  const activateUser = async (email, password, confirmPassword, userId) => {
    var _a;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      debugLog("[AuthProvider] activateUser", email);
      const { data, error: updateError } = await supabaseClient.functions.invoke("update-user-password", {
        body: {
          email,
          password,
          user_id: userId
        }
      });
      if (updateError) {
        console.error("Edge Function error:", updateError);
        throw updateError;
      }
      if (data == null ? void 0 : data.error) {
        console.error("Edge Function returned error:", data.error);
        throw new Error(data.error);
      }
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      if (signInError) {
        throw signInError;
      }
      if (signInData.user) {
        const { error: profileError } = await supabaseClient.from("profiles").update({ status: "Active" }).eq("id", signInData.user.id);
        if (profileError) {
          console.error("❌ Profile update error:", profileError);
        }
      }
      debugLog("[AuthProvider] ✅ user activated", (_a = signInData.user) == null ? void 0 : _a.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const changePassword = async (currentPassword, newPassword) => {
    if (!(user == null ? void 0 : user.id)) {
      return { success: false, error: "You must be signed in to change your password." };
    }
    try {
      const { data, error: fnError } = await supabaseClient.functions.invoke("change-password", {
        body: {
          currentPassword,
          newPassword,
          userId: user.id,
          timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : void 0
        }
      });
      if (fnError) {
        return { success: false, error: fnError.message || "Failed to update password." };
      }
      if ((data == null ? void 0 : data.success) === false && (data == null ? void 0 : data.error)) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update password.";
      return { success: false, error: message };
    }
  };
  const value = {
    user,
    loading,
    error,
    supabaseClient,
    mfaState,
    clearMfaState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    sendActivationEmail,
    activateUser,
    changePassword
  };
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
};
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn("useAuth called outside AuthProvider, using default context");
    return defaultAuthContext;
  }
  return context;
};
const AuthBranding = ({ size = "large", className = "" }) => {
  const logoSize = size === "large" ? "h-20" : "h-12";
  const headingSize = size === "large" ? "text-3xl" : "text-xl";
  const textSize = size === "large" ? "mt-2" : "text-sm";
  return /* @__PURE__ */ jsxs("div", { className: `text-center ${className}`, children: [
    /* @__PURE__ */ jsx(
      "img",
      {
        src: raynLogo,
        alt: "RAYN Secure Logo",
        className: `mx-auto ${logoSize} w-auto mb-4`
      }
    ),
    /* @__PURE__ */ jsx("h1", { className: `${headingSize} font-bold text-learning-primary`, children: "RAYN Secure" }),
    /* @__PURE__ */ jsx("p", { className: `text-muted-foreground ${textSize}`, children: "Get Secure, Stay Secure!" })
  ] });
};
const isStrongPassword$1 = (pwd) => {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(pwd);
  return pwd.length >= 12 && hasLowercase && hasUppercase && hasDigit && hasSpecial;
};
const ActivateAccount = ({ displayName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activateUser, error: authError, loading: authLoading, signOut, supabaseClient, sendActivationEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const clientPathRef = useRef("");
  const [requestingNewLink, setRequestingNewLink] = useState(false);
  const [newLinkRequested, setNewLinkRequested] = useState(false);
  const [isExpiredLink, setIsExpiredLink] = useState(false);
  const searchParams = new URLSearchParams(location.search);
  const badgeText = displayName || null;
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const clientId = pathParts[0];
      const validClientId = clientId && !["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"].includes(clientId);
      if (validClientId) {
        clientPathRef.current = `/${clientId}`;
      } else {
        const storedClientId = sessionStorage.getItem("currentClientId");
        if (storedClientId) {
          clientPathRef.current = `/${storedClientId}`;
        }
      }
    }
  }, []);
  useEffect(() => {
    var _a;
    if ((_a = location.state) == null ? void 0 : _a.authError) {
      setError(location.state.authError);
      if (location.state.expiredLink) {
        setIsExpiredLink(true);
      }
    }
  }, [location.state]);
  useEffect(() => {
    if (!error) return;
    if (error.includes("Password must be at least 12 characters")) {
      if (password && isStrongPassword$1(password)) {
        setError("");
        return;
      }
    }
    if (error === "Passwords do not match" || error.includes("Passwords do not match")) {
      if (password && confirmPassword && password === confirmPassword) {
        setError("");
        return;
      }
    }
  }, [password, confirmPassword, error]);
  useEffect(() => {
    const run = async () => {
      var _a, _b;
      const backupHash = typeof window !== "undefined" ? sessionStorage.getItem("activation_hash_backup") : null;
      if (backupHash && !location.hash && !window.location.hash) {
        window.location.hash = backupHash;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const hash = location.hash || window.location.hash || backupHash || "";
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const type = hashParams.get("type") || searchParams.get("type");
      const access = hashParams.get("access_token");
      hashParams.get("refresh_token");
      const errorCode = hashParams.get("error_code");
      const error2 = hashParams.get("error");
      if (errorCode === "otp_expired" || error2 === "access_denied" && hash.includes("error_code=otp_expired")) {
        debugLog("[ActivateAccount] OTP expired");
        setError("This activation link has expired. Please enter your email address below to request a new activation link.");
        setIsExpiredLink(true);
        return;
      }
      const hasAccessToken = !!access || hash.includes("access_token");
      const isRecoveryType = type === "recovery" || hash.includes("type=recovery");
      if (hasAccessToken && isRecoveryType) {
        debugLog("[ActivateAccount] processing activation tokens");
        if (hash && typeof window !== "undefined") {
          sessionStorage.setItem("activation_hash_backup", hash);
        }
        let isDevOrStaging = false;
        if (typeof window !== "undefined") {
          const hostname = window.location.hostname;
          const pathParts = window.location.pathname.split("/").filter(Boolean);
          const clientId = pathParts[0];
          try {
            const clientConfigs = void 0;
            if (clientConfigs) ;
          } catch (e) {
          }
          if (!isDevOrStaging && (clientId === "dev" || clientId === "staging")) {
            isDevOrStaging = true;
          }
          if (!isDevOrStaging && (hostname.includes("dev.staysecure-learn") || hostname.includes("staging.staysecure-learn") || hostname.includes("localhost") || hostname.includes("127.0.0.1"))) {
            isDevOrStaging = true;
          }
        }
        let session = null;
        const maxRetries = 10;
        const retryDelay = 500;
        const simulateSlowConnection = isDevOrStaging;
        const testDelay = 2e3;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const shouldCheckSession = !simulateSlowConnection || attempt > 0;
          if (shouldCheckSession) {
            const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
            if ((_a = currentSession == null ? void 0 : currentSession.user) == null ? void 0 : _a.email) {
              session = currentSession;
              break;
            }
          }
          if (attempt < maxRetries - 1) {
            const waitTime = simulateSlowConnection && attempt === 0 ? testDelay : retryDelay;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
        if ((_b = session == null ? void 0 : session.user) == null ? void 0 : _b.email) {
          debugLog("[ActivateAccount] ✅ session found", session.user.email);
          setEmail(session.user.email);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("activation_hash_backup");
          }
        } else {
          debugLog("[ActivateAccount] no session found");
          const backupHash2 = typeof window !== "undefined" ? sessionStorage.getItem("activation_hash_backup") : null;
          if (backupHash2 && !hash) {
            window.location.hash = backupHash2;
            setTimeout(() => {
              window.location.reload();
            }, 1e3);
            return;
          }
          setError("Unable to retrieve user information. Please wait a moment and try again, or contact your administrator.");
        }
        return;
      }
      setError("Invalid or expired activation link. Please contact your administrator.");
    };
    void run();
  }, [location.hash, supabaseClient]);
  const handleRequestNewLink = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setRequestingNewLink(true);
    setError("");
    setNewLinkRequested(false);
    try {
      await sendActivationEmail(email);
      setNewLinkRequested(true);
      setSuccess("A new activation link has been sent to your email address. Please check your inbox.");
    } catch (error2) {
      setError(error2.message || "Failed to send activation email. Please try again.");
    } finally {
      setRequestingNewLink(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    debugLog("[ActivateAccount] form submitted", email);
    setLoading(true);
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (!isStrongPassword$1(password)) {
      setError("Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character. Note spaces do not count toward the special characters");
      setLoading(false);
      return;
    }
    try {
      const clientPath = clientPathRef.current || "";
      const loginPath = clientPath || "/";
      await activateUser(email, password, confirmPassword);
      setSuccess("Account activated successfully! Redirecting to login...");
      await signOut();
      setTimeout(() => {
        debugLog("[ActivateAccount] ✅ activated, redirecting");
        navigate(loginPath, { replace: true });
      }, 2e3);
    } catch (error2) {
      setError(error2.message);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md w-full space-y-8", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "small", className: "mb-6" }),
    /* @__PURE__ */ jsxs(Card, { className: "shadow-lg", children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl font-bold", children: "Activate Your Account" }),
          badgeText && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: badgeText })
        ] }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Set your password to complete account activation" })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          (error || authError) && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error || authError }) }),
          success && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: success }) }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "email",
                type: "email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                required: true,
                disabled: isExpiredLink ? false : !!email,
                className: "bg-gray-50",
                placeholder: "Enter your email address"
              }
            )
          ] }),
          !isExpiredLink && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
              /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: "password",
                    type: showPassword ? "text" : "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    required: true,
                    minLength: 12,
                    className: "pr-10",
                    placeholder: "Enter your password"
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowPassword(!showPassword),
                    children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "confirmPassword", children: "Confirm Password" }),
              /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsx(
                  Input,
                  {
                    id: "confirmPassword",
                    type: showConfirmPassword ? "text" : "password",
                    value: confirmPassword,
                    onChange: (e) => setConfirmPassword(e.target.value),
                    required: true,
                    minLength: 12,
                    className: "pr-10",
                    placeholder: "Confirm your password"
                  }
                ),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowConfirmPassword(!showConfirmPassword),
                    children: showConfirmPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              Button,
              {
                type: "submit",
                className: "w-full",
                disabled: loading || authLoading,
                children: [
                  (loading || authLoading) && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                  "Activate Account"
                ]
              }
            ),
            /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outline",
                onClick: () => {
                  const clientPath = clientPathRef.current || "";
                  navigate(clientPath || "/");
                },
                className: "w-full",
                children: "Back to Login"
              }
            ) })
          ] })
        ] }),
        isExpiredLink && /* @__PURE__ */ jsxs("div", { className: "space-y-4 pt-4 border-t", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: newLinkRequested ? "Check your email for the new activation link." : "Enter your email address above and click the button below to request a new activation link." }),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              variant: "outline",
              onClick: handleRequestNewLink,
              disabled: requestingNewLink || !email || authLoading,
              className: "w-full",
              children: requestingNewLink ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                "Sending..."
              ] }) : "Request New Activation Link"
            }
          )
        ] })
      ] })
    ] })
  ] }) });
};
const AuthEventRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        const hash = window.location.hash || "";
        navigate("/reset-password" + hash, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
};
const ForgotPassword = ({ displayName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const { resetPassword } = useAuth();
  const badgeText = displayName || null;
  const reserved = ["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"];
  const pathParts = location.pathname.split("/").filter(Boolean);
  const clientPrefix = pathParts[0] && !reserved.includes(pathParts[0]) ? `/${pathParts[0]}` : "";
  useEffect(() => {
    var _a;
    if ((_a = location.state) == null ? void 0 : _a.authError) {
      setMessage(location.state.authError);
      setIsError(true);
      setResetLinkSent(false);
    }
  }, [location.state]);
  useEffect(() => {
    if (location.hash && (location.hash.includes("access_token") || location.hash.includes("refresh_token"))) {
      const newUrl = window.location.pathname + (location.search || "");
      window.history.replaceState({}, "", newUrl);
    }
  }, [location.hash, location.search]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (resetLinkSent) {
      return;
    }
    if (!email) {
      setIsError(true);
      setMessage("Please enter your email address");
      return;
    }
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      await resetPassword(email);
      setIsError(false);
      setMessage("Password reset email sent! Please check your inbox and follow the instructions.");
      setResetLinkSent(true);
    } catch (error) {
      setIsError(true);
      setMessage(error.message || "Failed to send reset email. Please try again.");
      setResetLinkSent(false);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-learning-background flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md space-y-6", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "large" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Reset Your Password" }),
          badgeText && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: badgeText })
        ] }),
        message && /* @__PURE__ */ jsx(Alert, { variant: isError ? "destructive" : "default", children: /* @__PURE__ */ jsx(AlertDescription, { children: message }) }),
        /* @__PURE__ */ jsx(CardDescription, { children: resetLinkSent ? "Check your email for the password reset link. If you don't see it, check your spam folder." : "Enter your email address and we'll send you a link to reset your password" })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "email",
                type: "email",
                placeholder: "Enter your email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                required: true,
                disabled: resetLinkSent,
                className: resetLinkSent ? "bg-gray-50" : ""
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading || resetLinkSent, children: [
            loading && /* @__PURE__ */ jsx("div", { className: "mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" }),
            resetLinkSent ? "Reset Link Sent" : "Send Reset Link"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "link",
            className: "p-0 h-auto text-teal-600",
            onClick: () => navigate(clientPrefix || "/"),
            children: "← Back to Sign In"
          }
        ) })
      ] })
    ] })
  ] }) });
};
const MFAChallenge = ({ supabaseClient, onSuccess, onCancel }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  useEffect(() => {
    var _a;
    debugLog("[MFAChallenge] mounted");
    (_a = inputRef.current) == null ? void 0 : _a.focus();
  }, []);
  const handleVerify = async (e) => {
    var _a, _b;
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    debugLog("[MFAChallenge] verifying code...");
    try {
      const { data: factorsData, error: factorsError } = await supabaseClient.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      debugLog("[MFAChallenge] factors", factorsData);
      ((factorsData == null ? void 0 : factorsData.totp) ?? []).forEach((f, i) => {
        debugLog(`[MFAChallenge] totp[${i}]`, { id: f.id, status: f.status, friendlyName: f.friendly_name, createdAt: f.created_at });
      });
      const totpFactor = (_a = factorsData == null ? void 0 : factorsData.totp) == null ? void 0 : _a.find((f) => f.status === "verified");
      if (!totpFactor) {
        debugLog("[MFAChallenge] no verified factor found — cannot challenge");
        throw new Error("NO_VERIFIED_FACTOR");
      }
      debugLog("[MFAChallenge] using factor", { id: totpFactor.id, status: totpFactor.status });
      const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: totpFactor.id
      });
      if (challengeError) {
        debugLog("[MFAChallenge] challenge error", { message: challengeError.message, status: challengeError.status, code: challengeError.code });
        throw challengeError;
      }
      debugLog("[MFAChallenge] challenge created", challengeData.id);
      const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) {
        debugLog("[MFAChallenge] verify error (raw)", { message: verifyError.message, status: verifyError.status, code: verifyError.code, details: verifyError });
        throw verifyError;
      }
      debugLog("[MFAChallenge] verify success → calling onSuccess");
      onSuccess();
    } catch (err) {
      const msg = (err == null ? void 0 : err.message) ?? "Verification failed.";
      debugLog("[MFAChallenge] caught error", { message: msg, status: err == null ? void 0 : err.status, code: err == null ? void 0 : err.code });
      if (msg === "NO_VERIFIED_FACTOR") {
        setError("Your two-factor setup is incomplete. Please sign out and log in again to re-enroll.");
        return;
      }
      setError(
        msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("token") || msg.toLowerCase().includes("totp") ? "Incorrect code. Check your authenticator app and try again." : msg
      );
      setCode("");
      (_b = inputRef.current) == null ? void 0 : _b.focus();
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md mx-auto space-y-6", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "large" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-primary" }),
          /* @__PURE__ */ jsx(CardTitle, { children: "Two-Factor Authentication" })
        ] }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Enter the 6-digit code from your authenticator app to continue." })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleVerify, className: "space-y-4", children: [
        error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "mfa-code", children: "Authenticator Code" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "mfa-code",
              ref: inputRef,
              type: "text",
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 6,
              value: code,
              onChange: (e) => setCode(e.target.value.replace(/\D/g, "")),
              placeholder: "000000",
              className: "text-center text-2xl tracking-widest font-mono",
              autoComplete: "one-time-code",
              disabled: loading
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading || code.length !== 6, children: [
          loading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Verify"
        ] }),
        onCancel && /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(Button, { variant: "link", type: "button", onClick: onCancel, disabled: loading, children: "Back to sign in" }) })
      ] }) })
    ] })
  ] });
};
const MFAEnrollment = ({
  supabaseClient,
  onSuccess,
  onSkip,
  required = false
}) => {
  const [step, setStep] = useState("qr");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => {
    debugLog("[MFAEnrollment] mounted", { required });
    let cancelled = false;
    const enroll = async () => {
      var _a;
      setLoading(true);
      setError(null);
      try {
        const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
        debugLog("[MFAEnrollment] existing factors", factorsData);
        const pending = (_a = factorsData == null ? void 0 : factorsData.totp) == null ? void 0 : _a.find((f) => f.status === "unverified");
        if (pending) {
          debugLog("[MFAEnrollment] unverified factor found, unenrolling to get fresh QR", pending.id);
          await supabaseClient.auth.mfa.unenroll({ factorId: pending.id });
        }
        debugLog("[MFAEnrollment] calling mfa.enroll...");
        const { data, error: enrollError } = await supabaseClient.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Authenticator App"
        });
        if (enrollError) throw enrollError;
        debugLog("[MFAEnrollment] enroll success, factorId:", data.id);
        if (!cancelled) {
          setFactorId(data.id);
          setQrCode(data.totp.qr_code);
          setSecret(data.totp.secret);
        }
      } catch (err) {
        debugLog("[MFAEnrollment] enroll error", err == null ? void 0 : err.message);
        if (!cancelled) setError((err == null ? void 0 : err.message) ?? "Could not start enrollment. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    enroll();
    return () => {
      cancelled = true;
    };
  }, [supabaseClient]);
  useEffect(() => {
    var _a;
    if (step === "verify") (_a = inputRef.current) == null ? void 0 : _a.focus();
  }, [step]);
  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const handleVerify = async (e) => {
    var _a;
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter a 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    debugLog("[MFAEnrollment] verifying enrollment code for factorId", factorId);
    try {
      const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId
      });
      if (challengeError) throw challengeError;
      debugLog("[MFAEnrollment] challenge created", challengeData.id);
      const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });
      if (verifyError) throw verifyError;
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user == null ? void 0 : user.id) {
        const { error: profileError } = await supabaseClient.from("profiles").update({ two_factor_enabled: true }).eq("id", user.id);
        if (profileError) {
          debugLog("[MFAEnrollment] warning: could not set two_factor_enabled on profile", profileError.message);
        } else {
          debugLog("[MFAEnrollment] profiles.two_factor_enabled set to true");
        }
      }
      debugLog("[MFAEnrollment] enrollment verified → calling onSuccess");
      onSuccess();
    } catch (err) {
      const msg = (err == null ? void 0 : err.message) ?? "Verification failed.";
      debugLog("[MFAEnrollment] verify error", msg);
      setError(
        msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("token") ? "Incorrect code. Make sure your device clock is accurate and try again." : msg
      );
      setCode("");
      (_a = inputRef.current) == null ? void 0 : _a.focus();
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md mx-auto space-y-6", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "large" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-primary" }),
          /* @__PURE__ */ jsx(CardTitle, { children: "Set Up Two-Factor Authentication" })
        ] }),
        /* @__PURE__ */ jsx(CardDescription, { children: required ? "Your account requires two-factor authentication. Set it up to continue." : "Add an extra layer of security to your account." })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", className: "mb-4", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
        step === "qr" && /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
          /* @__PURE__ */ jsxs("ol", { className: "text-sm text-muted-foreground space-y-1 list-decimal list-inside", children: [
            /* @__PURE__ */ jsx("li", { children: "Install an authenticator app (Google Authenticator, Authy, 1Password, etc.)" }),
            /* @__PURE__ */ jsx("li", { children: "Scan the QR code below, or enter the secret key manually" }),
            /* @__PURE__ */ jsxs("li", { children: [
              "Click ",
              /* @__PURE__ */ jsx("strong", { children: "Next" }),
              " to verify the setup"
            ] })
          ] }),
          loading && /* @__PURE__ */ jsx("div", { className: "flex justify-center py-8", children: /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }) }),
          qrCode && !loading && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4", children: [
            /* @__PURE__ */ jsx("div", { className: "border rounded-lg p-3 bg-white", children: /* @__PURE__ */ jsx("img", { src: qrCode, alt: "MFA QR code", className: "w-48 h-48" }) }),
            secret && /* @__PURE__ */ jsxs("div", { className: "w-full space-y-1", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs text-muted-foreground", children: "Or enter the key manually:" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("code", { className: "flex-1 rounded bg-muted px-3 py-2 text-xs font-mono tracking-wider break-all", children: secret }),
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: copySecret,
                    className: "shrink-0",
                    children: copied ? /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" })
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsx(
              Button,
              {
                className: "flex-1",
                disabled: !qrCode || loading,
                onClick: () => setStep("verify"),
                children: "Next — Enter Code"
              }
            ),
            !required && onSkip && /* @__PURE__ */ jsx(Button, { variant: "outline", type: "button", onClick: onSkip, disabled: loading, children: "Skip for now" })
          ] })
        ] }),
        step === "verify" && /* @__PURE__ */ jsxs("form", { onSubmit: handleVerify, className: "space-y-4", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Enter the 6-digit code from your authenticator app to confirm setup." }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "enroll-code", children: "Authenticator Code" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "enroll-code",
                ref: inputRef,
                type: "text",
                inputMode: "numeric",
                pattern: "[0-9]*",
                maxLength: 6,
                value: code,
                onChange: (e) => setCode(e.target.value.replace(/\D/g, "")),
                placeholder: "000000",
                className: "text-center text-2xl tracking-widest font-mono",
                autoComplete: "one-time-code",
                disabled: loading
              }
            )
          ] }),
          /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading || code.length !== 6, children: [
            loading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
            "Confirm & Enable 2FA"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(
            Button,
            {
              variant: "link",
              type: "button",
              onClick: () => {
                setStep("qr");
                setCode("");
                setError(null);
              },
              disabled: loading,
              children: "Back to QR code"
            }
          ) })
        ] })
      ] })
    ] })
  ] });
};
const LoginForm = ({ displayName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);
  const { signIn, error, loading: authLoading, mfaState, clearMfaState, supabaseClient } = useAuth();
  const badgeText = displayName || null;
  const reserved = ["admin", "activate-account", "reset-password", "forgot-password", "email-notifications", "auth"];
  const pathParts = location.pathname.split("/").filter(Boolean);
  const clientPrefix = pathParts[0] && !reserved.includes(pathParts[0]) ? `/${pathParts[0]}` : "";
  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.rpc("get_org_sso_config").then(({ data, error: error2 }) => {
      if (error2) {
        debugLog("[LoginForm] get_org_sso_config error", error2.message);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      debugLog("[LoginForm] sso config", row);
      setEntraEnabled(!!(row == null ? void 0 : row.entra_enabled));
    });
  }, [supabaseClient]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    try {
      await signIn(email, password);
    } catch (error2) {
      debugLog("[LoginForm] login failed", error2.message);
    } finally {
      setLoading(false);
    }
  };
  const handleMicrosoftSignIn = async () => {
    if (!supabaseClient) return;
    setSsoLoading(true);
    try {
      const redirectTo = `${window.location.origin}${clientPrefix}/auth/callback`;
      debugLog("[LoginForm] signInWithOAuth azure → redirectTo", redirectTo);
      const { error: error2 } = await supabaseClient.auth.signInWithOAuth({
        provider: "azure",
        options: {
          redirectTo,
          scopes: "openid email profile",
          queryParams: { prompt: "select_account" }
        }
      });
      if (error2) throw error2;
    } catch (err) {
      debugLog("[LoginForm] Microsoft sign-in error", err.message);
      setSsoLoading(false);
    }
  };
  const handleMfaSuccess = () => {
    clearMfaState();
  };
  const handleMfaCancel = () => {
    supabaseClient == null ? void 0 : supabaseClient.auth.signOut();
    clearMfaState();
    setPassword("");
  };
  if (mfaState === "challenge") {
    return /* @__PURE__ */ jsx(
      MFAChallenge,
      {
        supabaseClient,
        onSuccess: handleMfaSuccess,
        onCancel: handleMfaCancel
      }
    );
  }
  if (mfaState === "enroll") {
    return /* @__PURE__ */ jsx(
      MFAEnrollment,
      {
        supabaseClient,
        onSuccess: handleMfaSuccess,
        required: true
      }
    );
  }
  if (mfaState === "prompt") {
    return /* @__PURE__ */ jsx(
      MFAEnrollment,
      {
        supabaseClient,
        onSuccess: handleMfaSuccess,
        onSkip: handleMfaSuccess,
        required: false
      }
    );
  }
  return /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md mx-auto space-y-6", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "large" }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "relative", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(CardTitle, { children: "Sign In" }),
          badgeText && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: badgeText })
        ] }),
        /* @__PURE__ */ jsx(CardDescription, { children: "Enter your email and password to access your learning dashboard" })
      ] }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
        success && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: success }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "email",
              type: "email",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password",
                type: showPassword ? "text" : "password",
                value: password,
                onChange: (e) => setPassword(e.target.value),
                required: true,
                className: "pr-10"
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                onClick: () => setShowPassword(!showPassword),
                children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading || authLoading, children: [
          (loading || authLoading) && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Sign In"
        ] }),
        entraEnabled && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "relative my-2", children: [
            /* @__PURE__ */ jsx("div", { className: "absolute inset-0 flex items-center", children: /* @__PURE__ */ jsx("span", { className: "w-full border-t" }) }),
            /* @__PURE__ */ jsx("div", { className: "relative flex justify-center text-xs uppercase", children: /* @__PURE__ */ jsx("span", { className: "bg-background px-2 text-muted-foreground", children: "or" }) })
          ] }),
          /* @__PURE__ */ jsxs(
            Button,
            {
              type: "button",
              variant: "outline",
              className: "w-full gap-2",
              disabled: ssoLoading,
              onClick: handleMicrosoftSignIn,
              children: [
                ssoLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 21 21", className: "h-4 w-4", children: [
                  /* @__PURE__ */ jsx("rect", { x: "1", y: "1", width: "9", height: "9", fill: "#f25022" }),
                  /* @__PURE__ */ jsx("rect", { x: "11", y: "1", width: "9", height: "9", fill: "#00a4ef" }),
                  /* @__PURE__ */ jsx("rect", { x: "1", y: "11", width: "9", height: "9", fill: "#7fba00" }),
                  /* @__PURE__ */ jsx("rect", { x: "11", y: "11", width: "9", height: "9", fill: "#ffb900" })
                ] }),
                "Sign in with Microsoft"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(
          Button,
          {
            variant: "link",
            type: "button",
            onClick: () => {
              navigate(`${clientPrefix}/forgot-password`);
            },
            children: "Forgot Password?"
          }
        ) })
      ] }) })
    ] })
  ] });
};
const isStrongPassword = (pwd) => {
  const hasLowercase = /[a-z]/.test(pwd);
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(pwd);
  return pwd.length >= 12 && hasLowercase && hasUppercase && hasDigit && hasSpecial;
};
const ResetPassword = ({ displayName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { supabaseClient, resetPassword } = useAuth();
  const badgeText = displayName || null;
  const reserved = ["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"];
  const pathParts = location.pathname.split("/").filter(Boolean);
  const clientPrefix = pathParts[0] && !reserved.includes(pathParts[0]) ? `/${pathParts[0]}` : "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const initializedRef = useRef(false);
  useEffect(() => {
    var _a, _b;
    if (((_a = location.state) == null ? void 0 : _a.authError) && ((_b = location.state) == null ? void 0 : _b.expiredLink)) {
      navigate(`${clientPrefix}/forgot-password`, {
        replace: true,
        state: {
          authError: location.state.authError
        }
      });
    }
  }, [location.state, navigate]);
  const clearRecoveryParams = () => {
    const url = new URL(window.location.href);
    url.hash = "";
    url.searchParams.delete("type");
    url.searchParams.delete("token_hash");
    window.history.replaceState({}, document.title, url.toString());
  };
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const { data: sub } = supabaseClient.auth.onAuthStateChange((event, session) => {
      var _a;
      if (event === "SIGNED_IN" && ((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email)) {
        debugLog("[ResetPassword] session signed in", session.user.email);
        setEmail(session.user.email);
        clearRecoveryParams();
        setVerifying(false);
      }
    });
    const run = async () => {
      var _a, _b, _c, _d, _e;
      try {
        const hash = location.hash || window.location.hash || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const searchParams = new URLSearchParams(location.search || window.location.search || "");
        const type = hashParams.get("type") || searchParams.get("type");
        const tokenHash = searchParams.get("token_hash");
        const hasAccessToken = hashParams.has("access_token") || hash.includes("access_token");
        if (type === "recovery" && !tokenHash && !hasAccessToken) {
          setError("This password reset link may have been opened already by an email scanner. Please request a new link and open it only once.");
          setVerifying(false);
          return;
        }
        const errorCode = hashParams.get("error_code");
        if (errorCode === "otp_expired" || hash.includes("error_code=otp_expired")) {
          debugLog("[ResetPassword] OTP expired, redirecting");
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: "This password reset link has expired. Please enter your email address below to request a new one."
            }
          });
          return;
        }
        if (tokenHash && type === "recovery") {
          const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery"
          });
          if (verifyError) {
            console.error("[ResetPassword] ❌ verifyOtp error:", verifyError.message);
            if (((_a = verifyError.message) == null ? void 0 : _a.includes("expired")) || ((_b = verifyError.message) == null ? void 0 : _b.includes("otp_expired"))) {
              navigate(`${clientPrefix}/forgot-password`, {
                replace: true,
                state: {
                  authError: "This password reset link has expired. Please enter your email address below to request a new one."
                }
              });
            } else {
              setError("Invalid password reset link. Please request a new one.");
            }
            setVerifying(false);
            return;
          }
          if ((_c = data.user) == null ? void 0 : _c.email) {
            debugLog("[ResetPassword] ✅ token verified", data.user.email);
            setEmail(data.user.email);
            clearRecoveryParams();
            setVerifying(false);
            return;
          }
        }
        if (hasAccessToken && type === "recovery") {
          const maxAttempts = 10;
          const delay = 300;
          for (let i = 0; i < maxAttempts; i++) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if ((_d = session == null ? void 0 : session.user) == null ? void 0 : _d.email) {
              debugLog("[ResetPassword] ✅ session found", session.user.email);
              setEmail(session.user.email);
              clearRecoveryParams();
              setVerifying(false);
              return;
            }
            await new Promise((r) => setTimeout(r, delay));
          }
          console.error("[ResetPassword] ❌ No session found after polling");
          setError("Unable to verify password reset link. Please request a new link.");
          setVerifying(false);
          return;
        }
        const { data: { session: existing }, error: existingErr } = await supabaseClient.auth.getSession();
        if ((_e = existing == null ? void 0 : existing.user) == null ? void 0 : _e.email) {
          debugLog("[ResetPassword] ✅ existing session", existing.user.email);
          setEmail(existing.user.email);
        } else {
          console.warn("[ResetPassword] ⚠️ No session found and no valid recovery params");
          setError((prev) => prev || "No active password reset session found. Please request a new reset link.");
        }
        setVerifying(false);
      } catch {
        setError("Failed to verify password reset link. Please try again.");
        setVerifying(false);
      }
    };
    void run();
    return () => sub.subscription.unsubscribe();
  }, [location.hash, location.search, supabaseClient]);
  useEffect(() => {
    if (!error) return;
    if (error.includes("Password must be at least 12 characters")) {
      if (password && isStrongPassword(password)) {
        setError("");
        return;
      }
    }
    if (error === "Passwords do not match" || error.includes("Passwords do not match")) {
      if (password && confirmPassword && password === confirmPassword) {
        setError("");
        return;
      }
    }
  }, [password, confirmPassword, error]);
  const handleSubmit = async (e) => {
    var _a, _b, _c, _d, _e, _f, _g;
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    debugLog("[ResetPassword] handleSubmit", email);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character. Note spaces do not count toward the special characters");
      setLoading(false);
      return;
    }
    try {
      let { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession();
      if (sessionErr || !session) {
        await new Promise((r) => setTimeout(r, 300));
        const res = await supabaseClient.auth.getSession();
        session = res.data.session;
      }
      if (!((_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email)) {
        console.error("[ResetPassword] ❌ No valid session found - cannot proceed");
        throw new Error("Your password reset session has expired. Please request a new reset link.");
      }
      const { data, error: updateError } = await supabaseClient.functions.invoke("update-user-password", {
        body: {
          email: session.user.email,
          password,
          user_id: session.user.id
        }
      });
      if (updateError) {
        console.error("[ResetPassword] ❌ Edge Function error:", updateError.message);
        const { data: { session: sessionAfterError } } = await supabaseClient.auth.getSession();
        const errorAny = updateError;
        const status = (errorAny == null ? void 0 : errorAny.status) || ((_b = errorAny == null ? void 0 : errorAny.context) == null ? void 0 : _b.status) || ((_c = errorAny == null ? void 0 : errorAny.context) == null ? void 0 : _c.statusCode) || (errorAny == null ? void 0 : errorAny.statusCode) || ((_d = errorAny == null ? void 0 : errorAny.response) == null ? void 0 : _d.status);
        const msg = (updateError.message || "").toLowerCase();
        const statusFromMessage = msg.match(/\b422\b/) ? 422 : void 0;
        const finalStatus = status || statusFromMessage;
        const dataErrorMsg = (data == null ? void 0 : data.error) ? String(data.error).toLowerCase() : "";
        const hasSamePasswordError = msg.includes("same") || msg.includes("cannot be the same") || dataErrorMsg.includes("same") || dataErrorMsg.includes("cannot be the same") || finalStatus === 422;
        if (finalStatus === 422 || hasSamePasswordError) {
          const sessionStillValid2 = !!((_e = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _e.email);
          debugLog("[ResetPassword] same password error");
          if (sessionStillValid2) {
            setError("New password cannot be the same as your current password. Please choose a different password.");
            setLoading(false);
            return;
          } else {
            navigate(`${clientPrefix}/forgot-password`, {
              replace: true,
              state: {
                authError: "Your password reset session has expired. Please enter your email address below to request a new one."
              }
            });
            return;
          }
        }
        if (status === 401 || status === 410 || msg.includes("expired") || msg.includes("invalid") || msg.includes("session")) {
          if (!sessionAfterError) {
            console.error("[ResetPassword] ❌ Session lost after updateUser error");
          }
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: "Your password reset link has expired or was already used. Please enter your email address below to request a new one."
            }
          });
          return;
        }
        if (msg.includes("weak") || msg.includes("password") && msg.includes("strong")) {
          setError("Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character. Note spaces do not count toward the special characters");
          setLoading(false);
          return;
        }
        const sessionStillValid = !!((_f = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _f.email);
        if (!sessionStillValid) {
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: "Your password reset session has expired. Please enter your email address below to request a new one."
            }
          });
          return;
        }
        setError(updateError.message || "Failed to update password. Please try again.");
        setLoading(false);
        return;
      }
      if (data == null ? void 0 : data.error) {
        console.error("[ResetPassword] ❌ Edge Function returned error in data:", data.error);
        const { data: { session: sessionAfterDataError } } = await supabaseClient.auth.getSession();
        const msg = (data.error || "").toLowerCase();
        if (msg.includes("same")) {
          const sessionStillValid = !!((_g = sessionAfterDataError == null ? void 0 : sessionAfterDataError.user) == null ? void 0 : _g.email);
          if (!sessionStillValid) {
            navigate(`${clientPrefix}/forgot-password`, {
              replace: true,
              state: {
                authError: "Your password reset session has expired. Please enter your email address below to request a new one."
              }
            });
          } else {
            setError("New password cannot be the same as your current password. Please choose a different password.");
          }
          setLoading(false);
          return;
        }
        setError(data.error);
        setLoading(false);
        return;
      }
      if (!(data == null ? void 0 : data.success)) {
        console.error("[ResetPassword] ❌ No success flag in response, treating as error");
        setError("Failed to update password. Please try again.");
        setLoading(false);
        return;
      }
      debugLog("[ResetPassword] ✅ password reset complete");
      setSuccess("Password reset successfully! Your account has been activated. Redirecting to login...");
      await supabaseClient.auth.signOut();
      setTimeout(() => navigate(clientPrefix || "/", { replace: true }), 1500);
    } catch (err) {
      console.error("[ResetPassword] ❌ Exception caught:", {
        message: err == null ? void 0 : err.message,
        error: err
      });
      setError((err == null ? void 0 : err.message) || "Failed to reset password. Please try again or request a new reset link.");
    } finally {
      setLoading(false);
    }
  };
  const formDisabled = verifying || !email || loading;
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md w-full space-y-8", children: [
    /* @__PURE__ */ jsx(AuthBranding, { size: "large", className: "mb-6" }),
    /* @__PURE__ */ jsxs(Card, { className: "shadow-lg", children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "relative", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(CardTitle, { className: "text-2xl font-bold", children: "Reset Your Password" }),
        badgeText && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: badgeText })
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        verifying && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: "Verifying your reset link…" }) }),
        error && !verifying && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
        success && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: success }) }),
        email && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
          /* @__PURE__ */ jsx(Input, { id: "email", type: "email", value: email, disabled: true, className: "bg-gray-50" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "New Password" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "password",
                type: showPassword ? "text" : "password",
                value: password,
                onChange: (e) => setPassword(e.target.value),
                required: true,
                minLength: 12,
                className: "pr-10",
                placeholder: "Enter your new password",
                disabled: formDisabled
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                onClick: () => setShowPassword((s) => !s),
                disabled: formDisabled,
                children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "confirmPassword", children: "Confirm New Password" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                id: "confirmPassword",
                type: showConfirmPassword ? "text" : "password",
                value: confirmPassword,
                onChange: (e) => setConfirmPassword(e.target.value),
                required: true,
                minLength: 12,
                className: "pr-10",
                placeholder: "Confirm your new password",
                disabled: formDisabled
              }
            ),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                variant: "ghost",
                size: "sm",
                className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                onClick: () => setShowConfirmPassword((s) => !s),
                disabled: formDisabled,
                children: showConfirmPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-muted-foreground" })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: formDisabled, children: [
          (loading || verifying) && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Reset Password"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => navigate(clientPrefix || "/"), className: "w-full", disabled: loading, children: "Back to Login" }) })
      ] }) })
    ] })
  ] }) });
};
const SignUpForm = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { signUp } = useAuth();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { error: error2 } = await signUp(email, password, fullName);
      if (error2) throw error2;
      setSuccess("Please check your email to confirm your account!");
    } catch (error2) {
      setError(error2.message);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs(Card, { className: "w-full max-w-md mx-auto", children: [
    /* @__PURE__ */ jsxs(CardHeader, { children: [
      /* @__PURE__ */ jsx(CardTitle, { children: "Sign Up" }),
      /* @__PURE__ */ jsx(CardDescription, { children: "Create a new account to start your learning journey" })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
      success && /* @__PURE__ */ jsx(Alert, { children: /* @__PURE__ */ jsx(AlertDescription, { children: success }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "fullName", children: "Full Name" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "fullName",
            type: "text",
            value: fullName,
            onChange: (e) => setFullName(e.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "email",
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            id: "password",
            type: "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            minLength: 6
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading, children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Sign Up"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-center", children: /* @__PURE__ */ jsx(Button, { variant: "link", onClick: onSwitchToLogin, children: "Already have an account? Sign in" }) })
    ] }) })
  ] });
};
const createUseAuth = (dependencies) => {
  return () => {
    const { supabaseClient } = dependencies;
    const [authState, setAuthState] = useState({
      user: null,
      loading: true,
      error: null
    });
    const signIn = useCallback(async (email, password) => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          throw error;
        }
        setAuthState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, [supabaseClient]);
    const signUp = useCallback(async (email, password, fullName) => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) {
          throw error;
        }
        setAuthState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, [supabaseClient]);
    const signOut = useCallback(async () => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          throw error;
        }
        setAuthState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, [supabaseClient]);
    const resetPassword = useCallback(async (email) => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) {
          throw error;
        }
        setAuthState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, [supabaseClient]);
    const activateUser = useCallback(async (password) => {
      try {
        setAuthState((prev) => ({ ...prev, loading: true, error: null }));
        const { error } = await supabaseClient.auth.updateUser({
          password
        });
        if (error) {
          throw error;
        }
        setAuthState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    }, [supabaseClient]);
    useEffect(() => {
      const getInitialSession = async () => {
        try {
          const { data: { session }, error } = await supabaseClient.auth.getSession();
          if (error) {
            throw error;
          }
          setAuthState((prev) => ({
            ...prev,
            user: (session == null ? void 0 : session.user) || null,
            loading: false
          }));
        } catch (error) {
          setAuthState((prev) => ({
            ...prev,
            loading: false,
            error: error.message
          }));
        }
      };
      getInitialSession();
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          setAuthState((prev) => ({
            ...prev,
            user: (session == null ? void 0 : session.user) || null,
            loading: false
          }));
        }
      );
      return () => subscription.unsubscribe();
    }, [supabaseClient]);
    return {
      ...authState,
      signIn,
      signUp,
      signOut,
      resetPassword,
      activateUser
    };
  };
};
export {
  ActivateAccount,
  AuthBranding,
  AuthEventRedirect,
  AuthProvider,
  ForgotPassword,
  LoginForm,
  MFAChallenge,
  MFAEnrollment,
  ResetPassword,
  SignUpForm,
  createUseAuth,
  useAuth
};
//# sourceMappingURL=index.esm.js.map
