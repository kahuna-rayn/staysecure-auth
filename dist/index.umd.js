(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("react/jsx-runtime"), require("react"), require("react-router-dom"), require("@/components/ui/button"), require("@/components/ui/input"), require("@/components/ui/label"), require("@/components/ui/card"), require("@/components/ui/alert"), require("@/components/ui/badge"), require("lucide-react"), require("@/assets/rayn-logo.png"), require("@/integrations/supabase/client")) : typeof define === "function" && define.amd ? define(["exports", "react/jsx-runtime", "react", "react-router-dom", "@/components/ui/button", "@/components/ui/input", "@/components/ui/label", "@/components/ui/card", "@/components/ui/alert", "@/components/ui/badge", "lucide-react", "@/assets/rayn-logo.png", "@/integrations/supabase/client"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.StaySecureAuth = {}, global["react/jsx-runtime"], global.React, global.reactRouterDom, global.button, global.input, global.label, global.card, global.alert, global.badge, global.lucideReact, global.raynLogo, global.client));
})(this, function(exports2, jsxRuntime, react, reactRouterDom, button, input, label, card, alert, badge, lucideReact, raynLogo, client) {
  "use strict";
  const AuthContext = react.createContext(null);
  const defaultAuthContext = {
    user: null,
    loading: true,
    error: null,
    supabaseClient: null,
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
    }
  };
  const AuthProvider = ({ config, children }) => {
    const { supabaseClient } = config;
    const [user, setUser] = react.useState(null);
    const [loading, setLoading] = react.useState(true);
    const [error, setError] = react.useState(null);
    react.useEffect(() => {
      const getInitialSession = async () => {
        try {
          const { data: { session }, error: error2 } = await supabaseClient.auth.getSession();
          if (error2) {
            throw error2;
          }
          setUser((session == null ? void 0 : session.user) || null);
        } catch (error2) {
          setError(error2.message);
        } finally {
          setLoading(false);
        }
      };
      getInitialSession();
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          setUser((session == null ? void 0 : session.user) || null);
          setLoading(false);
        }
      );
      return () => subscription.unsubscribe();
    }, [supabaseClient]);
    const signIn = async (email, password) => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: error2 } = await supabaseClient.auth.signInWithPassword({
          email,
          password
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
        setError(error2.message);
      } finally {
        setLoading(false);
      }
    };
    const resetPassword = async (email) => {
      setLoading(true);
      setError(null);
      try {
        const redirectUrl = `${window.location.origin}/reset-password`;
        console.log("🚨🚨🚨 NUCLEAR DEBUG - resetPassword called 🚨🚨🚨");
        console.log("🔐 [AuthProvider.tsx] resetPassword called");
        console.log("📧 Sending password reset to:", email);
        console.log("🔗 Redirect URL:", redirectUrl);
        console.log("🔗 About to call send-password-reset Edge Function");
        const { data, error: resetError } = await supabaseClient.functions.invoke("send-password-reset", {
          body: {
            email,
            redirectTo: redirectUrl
          }
        });
        console.log("📧 Edge Function response:", { data, error: resetError });
        if (resetError) throw resetError;
        if (data == null ? void 0 : data.error) {
          console.error("Edge Function returned error:", data.error);
          throw new Error(data.error);
        }
        console.log("✅ [AuthProvider.tsx] Password reset email sent successfully via Edge Function");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    const sendActivationEmail = async (email) => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/activate-account`;
        console.log("🎯 [AuthProvider.tsx] sendActivationEmail called");
        console.log("📧 Sending activation email to:", email);
        console.log("🔗 Redirect URL:", redirectUrl);
        const { data: profile, error: profileError } = await supabaseClient.from("profiles").select("id, username, full_name").eq("username", email).maybeSingle();
        console.log("Profile check:", { profile, profileError });
        console.log("Profile error details:", profileError);
        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile query failed:", profileError);
          throw profileError;
        }
        if (profile) {
          console.log("User found in profiles table, proceeding with activation");
          const baseUrl2 = window.location.origin;
          const redirectUrl2 = `${baseUrl2}/activate-account`;
          console.log("Using deployment-friendly client-side approach");
          console.log("Redirect URL:", redirectUrl2);
          const { data, error: error2 } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl2
          });
          if (error2) {
            throw error2;
          }
          console.log("✅ [AuthProvider.tsx] Activation email sent successfully via Supabase:", data);
        } else {
          console.log("User not found in profiles table");
          setError("This email address is not registered in our system. Please contact your administrator to request access.");
          return;
        }
      } catch (error2) {
        console.error("Activation email error:", error2);
        setError(error2.message);
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
        console.log("🎯 [AuthProvider.tsx] activateUser called");
        console.log("📧 Email:", email);
        console.log("🆔 User ID:", userId);
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
        console.log("✅ Edge Function response:", data);
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) {
          throw signInError;
        }
        if (signInData.user) {
          console.log("🔍 Checking if profile status needs to be updated...");
          const { error: profileError } = await supabaseClient.from("profiles").update({ status: "Active" }).eq("id", signInData.user.id);
          if (profileError) {
            console.error("❌ Profile update error:", profileError);
          } else {
            console.log("✅ Profile status updated to Active for user:", signInData.user.email);
          }
        }
        console.log("✅ User activated and signed in successfully:", (_a = signInData.user) == null ? void 0 : _a.email);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    const value = {
      user,
      loading,
      error,
      supabaseClient,
      signIn,
      signUp,
      signOut,
      resetPassword,
      sendActivationEmail,
      activateUser
    };
    return /* @__PURE__ */ jsxRuntime.jsx(AuthContext.Provider, { value, children });
  };
  const useAuth = () => {
    const context = react.useContext(AuthContext);
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
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `text-center ${className}`, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        "img",
        {
          src: raynLogo,
          alt: "RAYN Secure Logo",
          className: `mx-auto ${logoSize} w-auto mb-4`
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx("h1", { className: `${headingSize} font-bold text-learning-primary`, children: "RAYN Secure" }),
      /* @__PURE__ */ jsxRuntime.jsx("p", { className: `text-muted-foreground ${textSize}`, children: "Get Secure, Stay Secure!" })
    ] });
  };
  const ActivateAccount = ({ displayName }) => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const { activateUser, error: authError, loading: authLoading, signOut, supabaseClient, sendActivationEmail } = useAuth();
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [confirmPassword, setConfirmPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = react.useState(false);
    const clientPathRef = react.useRef("");
    const [requestingNewLink, setRequestingNewLink] = react.useState(false);
    const [newLinkRequested, setNewLinkRequested] = react.useState(false);
    const [isExpiredLink, setIsExpiredLink] = react.useState(false);
    const searchParams = new URLSearchParams(location.search);
    const badgeText = displayName || null;
    react.useEffect(() => {
      if (typeof window !== "undefined") {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const clientId = pathParts[0];
        console.log("[ActivateAccount] Extracting client path:", {
          pathname: window.location.pathname,
          pathParts,
          clientId,
          validClientId: clientId && !["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"].includes(clientId)
        });
        const validClientId = clientId && !["admin", "activate-account", "reset-password", "forgot-password", "email-notifications"].includes(clientId);
        if (validClientId) {
          clientPathRef.current = `/${clientId}`;
          console.log("[ActivateAccount] Set clientPathRef to:", clientPathRef.current);
        } else {
          const storedClientId = sessionStorage.getItem("currentClientId");
          if (storedClientId) {
            clientPathRef.current = `/${storedClientId}`;
            console.log("[ActivateAccount] Using stored client ID from sessionStorage:", clientPathRef.current);
          }
        }
      }
    }, []);
    react.useEffect(() => {
      var _a;
      if ((_a = location.state) == null ? void 0 : _a.authError) {
        setError(location.state.authError);
        if (location.state.expiredLink) {
          setIsExpiredLink(true);
        }
      }
    }, [location.state]);
    react.useEffect(() => {
      const run = async () => {
        var _a, _b;
        console.log("ActivateAccount: URL hash:", window.location.hash);
        console.log("ActivateAccount: URL search:", window.location.search);
        console.log("ActivateAccount: Full URL:", window.location.href);
        console.log("ActivateAccount: Location hash:", location.hash);
        const backupHash = typeof window !== "undefined" ? sessionStorage.getItem("activation_hash_backup") : null;
        if (backupHash && !location.hash && !window.location.hash) {
          console.log("ActivateAccount: Hash was cleared, restoring from sessionStorage backup");
          window.location.hash = backupHash;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const hash = location.hash || window.location.hash || backupHash || "";
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const type = hashParams.get("type") || searchParams.get("type");
        const access = hashParams.get("access_token");
        const refresh = hashParams.get("refresh_token");
        const errorCode = hashParams.get("error_code");
        const error2 = hashParams.get("error");
        console.log("ActivateAccount: Parsed errorCode from hashParams:", errorCode);
        console.log("ActivateAccount: Parsed error from hashParams:", error2);
        console.log("ActivateAccount: Full hash string:", hash);
        if (errorCode === "otp_expired" || error2 === "access_denied" && hash.includes("error_code=otp_expired")) {
          console.log("ActivateAccount: OTP expired");
          setError("This activation link has expired. Please request a new activation link using the button below.");
          setIsExpiredLink(true);
          return;
        }
        console.log("ActivateAccount: Parsed URL params:", {
          type,
          hasAccessToken: !!access,
          hasRefreshToken: !!refresh
        });
        const hasAccessToken = !!access || hash.includes("access_token");
        const isRecoveryType = type === "recovery" || hash.includes("type=recovery");
        if (hasAccessToken && isRecoveryType) {
          console.log("ActivateAccount: Found recovery activation tokens in hash - this is an activation flow");
          console.log("ActivateAccount: Type:", type, "Has access_token:", !!access);
          if (hash && typeof window !== "undefined") {
            sessionStorage.setItem("activation_hash_backup", hash);
            console.log("ActivateAccount: Stored hash in sessionStorage as backup");
          }
          console.log("ActivateAccount: Waiting for Supabase to process hash and create session...");
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
                console.log(`ActivateAccount: Session found on attempt ${attempt + 1}`);
                break;
              }
            } else {
              console.log(`ActivateAccount: [TEST MODE] Simulating slow connection - Supabase not ready yet (attempt ${attempt + 1})`);
            }
            if (attempt < maxRetries - 1) {
              const waitTime = simulateSlowConnection && attempt === 0 ? testDelay : retryDelay;
              console.log(`ActivateAccount: No session yet (attempt ${attempt + 1}/${maxRetries}), waiting ${waitTime}ms...`);
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
          }
          if ((_b = session == null ? void 0 : session.user) == null ? void 0 : _b.email) {
            console.log("ActivateAccount: Found email from session (created from activation token):", session.user.email);
            setEmail(session.user.email);
            console.log("ActivateAccount: Keeping session for activation flow");
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("activation_hash_backup");
            }
          } else {
            console.log("ActivateAccount: No session found after waiting - Supabase may not have processed the hash yet");
            console.log("ActivateAccount: This could be a race condition - hash may have been cleared too early");
            const backupHash2 = typeof window !== "undefined" ? sessionStorage.getItem("activation_hash_backup") : null;
            if (backupHash2 && !hash) {
              console.log("ActivateAccount: Hash was cleared, restoring from backup...");
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
        console.log("ActivateAccount: No activation tokens found in hash");
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
      console.log("🚀 [ActivateAccount] Form submitted");
      console.log("📧 Email:", email);
      console.log("🔑 Password length:", password.length);
      setLoading(true);
      setError("");
      setSuccess("");
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(password);
      if (password.length < 12 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
        setError("Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character");
        setLoading(false);
        return;
      }
      try {
        const clientPath = clientPathRef.current || "";
        const loginPath = clientPath || "/";
        console.log("[ActivateAccount] Preparing redirect:", {
          clientPathRef: clientPathRef.current,
          clientPath,
          loginPath,
          currentPathname: window.location.pathname
        });
        console.log("📞 [ActivateAccount] Calling activateUser");
        await activateUser(email, password, confirmPassword);
        setSuccess("Account activated successfully! Redirecting to login...");
        await signOut();
        setTimeout(() => {
          console.log("[ActivateAccount] Redirecting to:", loginPath);
          navigate(loginPath, { replace: true });
        }, 2e3);
      } catch (error2) {
        setError(error2.message);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "small", className: "mb-6" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "relative", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold", children: "Activate Your Account" }),
            badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Set your password to complete account activation" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardContent, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
            (error || authError) && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error || authError }) }),
            success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                input.Input,
                {
                  id: "email",
                  type: "email",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true,
                  disabled: !!email && !isExpiredLink,
                  className: "bg-gray-50",
                  placeholder: "Enter your email address"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "password", children: "Password" }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  input.Input,
                  {
                    id: "password",
                    type: showPassword ? "text" : "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    required: true,
                    minLength: 6,
                    className: "pr-10",
                    placeholder: "Enter your password"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  button.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowPassword(!showPassword),
                    children: showPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "confirmPassword", children: "Confirm Password" }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  input.Input,
                  {
                    id: "confirmPassword",
                    type: showConfirmPassword ? "text" : "password",
                    value: confirmPassword,
                    onChange: (e) => setConfirmPassword(e.target.value),
                    required: true,
                    minLength: 6,
                    className: "pr-10",
                    placeholder: "Confirm your password"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  button.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowConfirmPassword(!showConfirmPassword),
                    children: showConfirmPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(
              button.Button,
              {
                type: "submit",
                className: "w-full",
                disabled: loading || authLoading,
                children: [
                  (loading || authLoading) && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                  "Activate Account"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
              button.Button,
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
          ] }),
          error && isExpiredLink && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-4 pt-4 border-t", children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-sm text-muted-foreground", children: newLinkRequested ? "Check your email for the new activation link." : "Enter your email address and click the button below to request a new activation link." }),
            /* @__PURE__ */ jsxRuntime.jsx(
              button.Button,
              {
                type: "button",
                variant: "outline",
                onClick: handleRequestNewLink,
                disabled: requestingNewLink || !email || authLoading,
                className: "w-full",
                children: requestingNewLink ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
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
    const navigate = reactRouterDom.useNavigate();
    react.useEffect(() => {
      const { data: { subscription } } = client.supabase.auth.onAuthStateChange((event) => {
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
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const [email, setEmail] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [message, setMessage] = react.useState("");
    const [isError, setIsError] = react.useState(false);
    const { resetPassword } = useAuth();
    const badgeText = displayName || null;
    react.useEffect(() => {
      if (location.hash && (location.hash.includes("access_token") || location.hash.includes("refresh_token"))) {
        const newUrl = window.location.pathname + (location.search || "");
        window.history.replaceState({}, "", newUrl);
      }
    }, [location.hash, location.search]);
    const handleSubmit = async (e) => {
      e.preventDefault();
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
      } catch (error) {
        setIsError(true);
        setMessage(error.message || "Failed to send reset email. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen bg-learning-background flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "w-full max-w-md space-y-6", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "large" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "relative", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: "Reset Your Password" }),
            badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Enter your email address and we'll send you a link to reset your password" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardContent, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                input.Input,
                {
                  id: "email",
                  type: "email",
                  placeholder: "Enter your email",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true
                }
              )
            ] }),
            message && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: isError ? "destructive" : "default", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: message }) }),
            /* @__PURE__ */ jsxRuntime.jsxs(button.Button, { type: "submit", className: "w-full", disabled: loading, children: [
              loading && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" }),
              "Send Reset Link"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
            button.Button,
            {
              variant: "link",
              className: "p-0 h-auto text-teal-600",
              onClick: () => navigate("/"),
              children: "← Back to Sign In"
            }
          ) })
        ] })
      ] })
    ] }) });
  };
  const LoginForm = ({ displayName }) => {
    const navigate = reactRouterDom.useNavigate();
    reactRouterDom.useLocation();
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [showPassword, setShowPassword] = react.useState(false);
    const [success, setSuccess] = react.useState("");
    const { signIn, error, loading: authLoading } = useAuth();
    const badgeText = displayName || null;
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setSuccess("");
      try {
        await signIn(email, password);
      } catch (error2) {
        console.log("Login error caught:", error2);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "w-full max-w-md mx-auto space-y-6", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "large" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "relative", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: "Sign In" }),
            badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Enter your email and password to access your learning dashboard" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          error && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error }) }),
          success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              input.Input,
              {
                id: "email",
                type: "email",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "password", children: "Password" }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                input.Input,
                {
                  id: "password",
                  type: showPassword ? "text" : "password",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  required: true,
                  className: "pr-10"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                button.Button,
                {
                  type: "button",
                  variant: "ghost",
                  size: "sm",
                  className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                  onClick: () => setShowPassword(!showPassword),
                  children: showPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4 text-muted-foreground" })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(button.Button, { type: "submit", className: "w-full", disabled: loading || authLoading, children: [
            (loading || authLoading) && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
            "Sign In"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
            button.Button,
            {
              variant: "link",
              type: "button",
              onClick: () => {
                navigate("/forgot-password");
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
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const { supabaseClient, resetPassword } = useAuth();
    const badgeText = displayName || null;
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [confirmPassword, setConfirmPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [verifying, setVerifying] = react.useState(true);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = react.useState(false);
    const [requestingNewLink, setRequestingNewLink] = react.useState(false);
    const [newLinkRequested, setNewLinkRequested] = react.useState(false);
    const [isExpiredLink, setIsExpiredLink] = react.useState(false);
    const initializedRef = react.useRef(false);
    react.useEffect(() => {
      var _a;
      if ((_a = location.state) == null ? void 0 : _a.authError) {
        setError(location.state.authError);
        if (location.state.expiredLink) {
          setIsExpiredLink(true);
        }
      }
    }, [location.state]);
    const clearRecoveryParams = () => {
      const url = new URL(window.location.href);
      url.hash = "";
      url.searchParams.delete("type");
      url.searchParams.delete("token_hash");
      window.history.replaceState({}, document.title, url.toString());
    };
    const handleRequestNewLink = async () => {
      if (!email) {
        setError("Please enter your email address");
        return;
      }
      setRequestingNewLink(true);
      setError("");
      setNewLinkRequested(false);
      try {
        await resetPassword(email);
        setNewLinkRequested(true);
        setSuccess("A new password reset link has been sent to your email address. Please check your inbox.");
      } catch (error2) {
        setError(error2.message || "Failed to send password reset email. Please try again.");
      } finally {
        setRequestingNewLink(false);
      }
    };
    react.useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;
      console.log("[ResetPassword] Setting up auth state change listener...");
      const { data: sub } = supabaseClient.auth.onAuthStateChange((event, session) => {
        var _a, _b;
        console.log("[ResetPassword] Auth state change:", {
          event,
          hasSession: !!session,
          userEmail: (_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email
        });
        if (event === "SIGNED_IN" && ((_b = session == null ? void 0 : session.user) == null ? void 0 : _b.email)) {
          console.log("[ResetPassword] ✅ Session signed in, setting email:", session.user.email);
          setEmail(session.user.email);
          clearRecoveryParams();
          setVerifying(false);
        }
      });
      const run = async () => {
        var _a, _b, _c, _d, _e, _f;
        console.log("[ResetPassword] useEffect run() starting");
        console.log("[ResetPassword] Location:", {
          pathname: location.pathname,
          hashLength: (location.hash || "").length,
          searchLength: (location.search || "").length
        });
        try {
          const hash = location.hash || window.location.hash || "";
          const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
          const searchParams = new URLSearchParams(location.search || window.location.search || "");
          const type = hashParams.get("type") || searchParams.get("type");
          const tokenHash = searchParams.get("token_hash");
          const hasAccessToken = hashParams.has("access_token") || hash.includes("access_token");
          console.log("[ResetPassword] Parsed URL params:", {
            type,
            hasTokenHash: !!tokenHash,
            hasAccessToken,
            hashLength: hash.length
          });
          if (type === "recovery" && !tokenHash && !hasAccessToken) {
            setError("This password reset link may have been opened already by an email scanner. Please request a new link and open it only once.");
            setVerifying(false);
            return;
          }
          const errorCode = hashParams.get("error_code");
          if (errorCode === "otp_expired" || hash.includes("error_code=otp_expired")) {
            console.log("[ResetPassword] OTP expired");
            setError('This password reset link has expired. Please enter your email address below and click "Request New Password Reset Link" to receive a new one.');
            setIsExpiredLink(true);
            setVerifying(false);
            return;
          }
          if (tokenHash && type === "recovery") {
            console.log("[ResetPassword] Processing token_hash flow...");
            const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery"
            });
            if (verifyError) {
              console.error("[ResetPassword] ❌ verifyOtp error:", verifyError.message);
              if (((_a = verifyError.message) == null ? void 0 : _a.includes("expired")) || ((_b = verifyError.message) == null ? void 0 : _b.includes("otp_expired"))) {
                setError('This password reset link has expired. Please enter your email address below and click "Request New Password Reset Link" to receive a new one.');
                setIsExpiredLink(true);
              } else {
                setError("Invalid or expired password reset link. Please request a new one.");
              }
              setVerifying(false);
              return;
            }
            if ((_c = data.user) == null ? void 0 : _c.email) {
              console.log("[ResetPassword] ✅ verifyOtp success, email:", data.user.email);
              setEmail(data.user.email);
              clearRecoveryParams();
              setVerifying(false);
              return;
            }
          }
          if (hasAccessToken && type === "recovery") {
            console.log("[ResetPassword] Processing access_token flow, waiting for session...");
            const maxAttempts = 10;
            const delay = 300;
            for (let i = 0; i < maxAttempts; i++) {
              const { data: { session } } = await supabaseClient.auth.getSession();
              if ((_d = session == null ? void 0 : session.user) == null ? void 0 : _d.email) {
                console.log(`[ResetPassword] ✅ Session found on attempt ${i + 1}, email:`, session.user.email);
                setEmail(session.user.email);
                clearRecoveryParams();
                setVerifying(false);
                return;
              }
              if (i < maxAttempts - 1) {
                console.log(`[ResetPassword] No session yet (attempt ${i + 1}/${maxAttempts}), waiting...`);
              }
              await new Promise((r) => setTimeout(r, delay));
            }
            console.error("[ResetPassword] ❌ No session found after polling");
            setError("Unable to verify password reset link. Please request a new link.");
            setVerifying(false);
            return;
          }
          console.log("[ResetPassword] Checking for existing session...");
          const { data: { session: existing }, error: existingErr } = await supabaseClient.auth.getSession();
          console.log("[ResetPassword] Existing session check:", {
            hasSession: !!existing,
            hasError: !!existingErr,
            userEmail: (_e = existing == null ? void 0 : existing.user) == null ? void 0 : _e.email,
            expiresAt: existing == null ? void 0 : existing.expires_at
          });
          if ((_f = existing == null ? void 0 : existing.user) == null ? void 0 : _f.email) {
            console.log("[ResetPassword] ✅ Using existing session, email:", existing.user.email);
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
    const handleSubmit = async (e) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      e.preventDefault();
      setLoading(true);
      setError("");
      setSuccess("");
      console.log("[ResetPassword] handleSubmit called");
      console.log("[ResetPassword] Email:", email);
      console.log("[ResetPassword] Password length:", password.length);
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      if (!isStrongPassword(password)) {
        setError("Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character");
        setLoading(false);
        return;
      }
      try {
        console.log("[ResetPassword] Step 1: Checking session before updateUser...");
        let { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession();
        console.log("[ResetPassword] Initial session check:", {
          hasSession: !!session,
          hasError: !!sessionErr,
          sessionError: sessionErr == null ? void 0 : sessionErr.message,
          userEmail: (_a = session == null ? void 0 : session.user) == null ? void 0 : _a.email,
          sessionExpiresAt: session == null ? void 0 : session.expires_at
        });
        if (sessionErr || !session) {
          console.log("[ResetPassword] No session initially, retrying after 300ms...");
          await new Promise((r) => setTimeout(r, 300));
          const res = await supabaseClient.auth.getSession();
          session = res.data.session;
          console.log("[ResetPassword] Retry session check:", {
            hasSession: !!session,
            userEmail: (_b = session == null ? void 0 : session.user) == null ? void 0 : _b.email,
            sessionExpiresAt: session == null ? void 0 : session.expires_at
          });
        }
        if (!((_c = session == null ? void 0 : session.user) == null ? void 0 : _c.email)) {
          console.error("[ResetPassword] ❌ No valid session found - cannot proceed");
          throw new Error("Your password reset session has expired. Please request a new reset link.");
        }
        console.log("[ResetPassword] ✅ Session valid, proceeding with updateUser...");
        console.log("[ResetPassword] Session details:", {
          email: session.user.email,
          expiresAt: session.expires_at,
          accessTokenLength: ((_d = session.access_token) == null ? void 0 : _d.length) || 0
        });
        const { data, error: updateError } = await supabaseClient.functions.invoke("update-user-password", {
          body: {
            email: session.user.email,
            password,
            user_id: session.user.id
          }
        });
        console.log("[ResetPassword] update-user-password Edge Function call completed");
        if (updateError) {
          console.error("[ResetPassword] ❌ Edge Function error:", {
            message: updateError.message,
            error: updateError
          });
          const { data: { session: sessionAfterError }, error: sessionCheckErr } = await supabaseClient.auth.getSession();
          console.log("[ResetPassword] Session check after error:", {
            hasSession: !!sessionAfterError,
            hasError: !!sessionCheckErr,
            userEmail: (_e = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _e.email,
            sessionStillValid: !!((_f = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _f.email)
          });
          const msg = (updateError.message || "").toLowerCase();
          const status = updateError == null ? void 0 : updateError.status;
          if (status === 422 || msg.includes("same")) {
            const sessionStillValid2 = !!((_g = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _g.email);
            console.log("[ResetPassword] Same password error detected - preventing success flow:", {
              status,
              message: msg,
              sessionStillValid: sessionStillValid2,
              canRetry: sessionStillValid2
            });
            if (sessionStillValid2) {
              setError("New password cannot be the same as your current password. Please choose a different password.");
              setLoading(false);
              return;
            } else {
              setError("Your password reset session has expired. Please request a new reset link.");
              setIsExpiredLink(true);
              setLoading(false);
              return;
            }
          }
          if (status === 401 || status === 410 || msg.includes("expired") || msg.includes("invalid") || msg.includes("session")) {
            if (!sessionAfterError) {
              console.error("[ResetPassword] ❌ Session lost after updateUser error");
            }
            setError("Your password reset link has expired or was already used. Please request a new link.");
            setIsExpiredLink(true);
            setLoading(false);
            return;
          }
          if (msg.includes("weak") || msg.includes("password") && msg.includes("strong")) {
            setError("Password is too weak. Please use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.");
            setLoading(false);
            return;
          }
          const sessionStillValid = !!((_h = sessionAfterError == null ? void 0 : sessionAfterError.user) == null ? void 0 : _h.email);
          if (!sessionStillValid) {
            setError("Your password reset session has expired. Please request a new reset link.");
            setIsExpiredLink(true);
            setLoading(false);
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
            const sessionStillValid = !!((_i = sessionAfterDataError == null ? void 0 : sessionAfterDataError.user) == null ? void 0 : _i.email);
            console.log("[ResetPassword] Same password error in data response - preventing success flow");
            if (!sessionStillValid) {
              setError("Your password reset session has expired. Please request a new reset link.");
              setIsExpiredLink(true);
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
        console.log("[ResetPassword] ✅ Password updated successfully and account activated!");
        setSuccess("Password reset successfully! Your account has been activated. Redirecting to login...");
        await supabaseClient.auth.signOut();
        setTimeout(() => navigate("/", { replace: true }), 1500);
      } catch (err) {
        console.error("[ResetPassword] ❌ Exception caught:", {
          message: err == null ? void 0 : err.message,
          error: err
        });
        setError((err == null ? void 0 : err.message) || "Failed to reset password. Please try again or request a new reset link.");
      } finally {
        setLoading(false);
        console.log("[ResetPassword] handleSubmit completed (loading set to false)");
      }
    };
    const formDisabled = verifying || !email && !isExpiredLink || loading;
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "large", className: "mb-6" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsx(card.CardHeader, { className: "relative", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold", children: "Reset Your Password" }),
          badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardContent, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
            verifying && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: "Verifying your reset link…" }) }),
            error && !verifying && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error }) }),
            success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                input.Input,
                {
                  id: "email",
                  type: "email",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  disabled: !isExpiredLink && !!email,
                  className: !isExpiredLink && !!email ? "bg-gray-50" : "",
                  placeholder: isExpiredLink ? "Enter your email address" : ""
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "password", children: "New Password" }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  input.Input,
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
                /* @__PURE__ */ jsxRuntime.jsx(
                  button.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowPassword((s) => !s),
                    disabled: formDisabled,
                    children: showPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "confirmPassword", children: "Confirm New Password" }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  input.Input,
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
                /* @__PURE__ */ jsxRuntime.jsx(
                  button.Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowConfirmPassword((s) => !s),
                    disabled: formDisabled,
                    children: showConfirmPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4 text-muted-foreground" })
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(button.Button, { type: "submit", className: "w-full", disabled: formDisabled, children: [
              (loading || verifying) && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              "Reset Password"
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntime.jsx(button.Button, { variant: "outline", onClick: () => navigate("/"), className: "w-full", disabled: loading, children: "Back to Login" }) })
          ] }),
          isExpiredLink && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-4 pt-4 border-t", children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-sm text-muted-foreground", children: newLinkRequested ? "Check your email for the new password reset link." : "Enter your email address above and click the button below to request a new password reset link." }),
            /* @__PURE__ */ jsxRuntime.jsx(
              button.Button,
              {
                type: "button",
                variant: "outline",
                onClick: handleRequestNewLink,
                disabled: requestingNewLink || !email || loading,
                className: "w-full",
                children: requestingNewLink ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                  "Sending..."
                ] }) : "Request New Password Reset Link"
              }
            )
          ] })
        ] })
      ] })
    ] }) });
  };
  const SignUpForm = ({ onSwitchToLogin }) => {
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [fullName, setFullName] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
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
    return /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "w-full max-w-md mx-auto", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: "Sign Up" }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Create a new account to start your learning journey" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        error && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error }) }),
        success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "fullName", children: "Full Name" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            input.Input,
            {
              id: "fullName",
              type: "text",
              value: fullName,
              onChange: (e) => setFullName(e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            input.Input,
            {
              id: "email",
              type: "email",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "password", children: "Password" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            input.Input,
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
        /* @__PURE__ */ jsxRuntime.jsxs(button.Button, { type: "submit", className: "w-full", disabled: loading, children: [
          loading && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
          "Sign Up"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntime.jsx(button.Button, { variant: "link", onClick: onSwitchToLogin, children: "Already have an account? Sign in" }) })
      ] }) })
    ] });
  };
  const createUseAuth = (dependencies) => {
    return () => {
      const { supabaseClient } = dependencies;
      const [authState, setAuthState] = react.useState({
        user: null,
        loading: true,
        error: null
      });
      const signIn = react.useCallback(async (email, password) => {
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
      const signUp = react.useCallback(async (email, password, fullName) => {
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
      const signOut = react.useCallback(async () => {
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
      const resetPassword = react.useCallback(async (email) => {
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
      const activateUser = react.useCallback(async (password) => {
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
      react.useEffect(() => {
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
  exports2.ActivateAccount = ActivateAccount;
  exports2.AuthBranding = AuthBranding;
  exports2.AuthEventRedirect = AuthEventRedirect;
  exports2.AuthProvider = AuthProvider;
  exports2.ForgotPassword = ForgotPassword;
  exports2.LoginForm = LoginForm;
  exports2.ResetPassword = ResetPassword;
  exports2.SignUpForm = SignUpForm;
  exports2.createUseAuth = createUseAuth;
  exports2.useAuth = useAuth;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
//# sourceMappingURL=index.umd.js.map
