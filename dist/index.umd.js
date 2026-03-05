(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("react/jsx-runtime"), require("react"), require("react-router-dom"), require("@/components/ui/button"), require("@/components/ui/input"), require("@/components/ui/label"), require("@/components/ui/card"), require("@/components/ui/alert"), require("@/components/ui/badge"), require("lucide-react"), require("@/assets/rayn-logo.png"), require("@/integrations/supabase/client")) : typeof define === "function" && define.amd ? define(["exports", "react/jsx-runtime", "react", "react-router-dom", "@/components/ui/button", "@/components/ui/input", "@/components/ui/label", "@/components/ui/card", "@/components/ui/alert", "@/components/ui/badge", "lucide-react", "@/assets/rayn-logo.png", "@/integrations/supabase/client"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.StaySecureAuth = {}, global["react/jsx-runtime"], global.React, global.reactRouterDom, global.button, global.input, global.label, global.card, global.alert, global.badge, global.lucideReact, global.raynLogo, global.client));
})(this, function(exports2, jsxRuntime, react, reactRouterDom, button, input, label, card, alert, badge, lucideReact, raynLogo, client) {
  "use strict";
  const debugLog = (...args) => {
    if (typeof window !== "undefined" && window.__DEBUG__) {
      console.log("[AUTH]", ...args);
    }
  };
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
    },
    changePassword: async () => ({ success: false, error: "Not configured" })
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
        const redirectUrl = `${window.location.origin}/reset-password`;
        debugLog("[AuthProvider] resetPassword", email);
        const { data, error: resetError } = await supabaseClient.functions.invoke("send-password-reset", {
          body: {
            email,
            redirectTo: redirectUrl
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
      signIn,
      signUp,
      signOut,
      resetPassword,
      sendActivationEmail,
      activateUser,
      changePassword
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
  const isStrongPassword$1 = (pwd) => {
    const hasLowercase = /[a-z]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(pwd);
    return pwd.length >= 12 && hasLowercase && hasUppercase && hasDigit && hasSpecial;
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
    react.useEffect(() => {
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
                  disabled: isExpiredLink ? false : !!email,
                  className: "bg-gray-50",
                  placeholder: "Enter your email address"
                }
              )
            ] }),
            !isExpiredLink && /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
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
                      minLength: 12,
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
                      minLength: 12,
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
            ] })
          ] }),
          isExpiredLink && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-4 pt-4 border-t", children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-sm text-muted-foreground", children: newLinkRequested ? "Check your email for the new activation link." : "Enter your email address above and click the button below to request a new activation link." }),
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
    const [resetLinkSent, setResetLinkSent] = react.useState(false);
    const { resetPassword } = useAuth();
    const badgeText = displayName || null;
    react.useEffect(() => {
      var _a;
      if ((_a = location.state) == null ? void 0 : _a.authError) {
        setMessage(location.state.authError);
        setIsError(true);
        setResetLinkSent(false);
      }
    }, [location.state]);
    react.useEffect(() => {
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
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen bg-learning-background flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "w-full max-w-md space-y-6", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "large" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "relative", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: "Reset Your Password" }),
            badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
          ] }),
          message && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: isError ? "destructive" : "default", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: message }) }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: resetLinkSent ? "Check your email for the password reset link. If you don't see it, check your spam folder." : "Enter your email address and we'll send you a link to reset your password" })
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
                  required: true,
                  disabled: resetLinkSent,
                  className: resetLinkSent ? "bg-gray-50" : ""
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(button.Button, { type: "submit", className: "w-full", disabled: loading || resetLinkSent, children: [
              loading && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" }),
              resetLinkSent ? "Reset Link Sent" : "Send Reset Link"
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
        debugLog("[LoginForm] login failed", error2.message);
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
    const initializedRef = react.useRef(false);
    react.useEffect(() => {
      var _a, _b;
      if (((_a = location.state) == null ? void 0 : _a.authError) && ((_b = location.state) == null ? void 0 : _b.expiredLink)) {
        navigate("/forgot-password", {
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
    react.useEffect(() => {
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
            navigate("/forgot-password", {
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
                navigate("/forgot-password", {
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
    react.useEffect(() => {
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
              navigate("/forgot-password", {
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
            navigate("/forgot-password", {
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
            navigate("/forgot-password", {
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
              navigate("/forgot-password", {
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
        setTimeout(() => navigate("/", { replace: true }), 1500);
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
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsx(AuthBranding, { size: "large", className: "mb-6" }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsx(card.CardHeader, { className: "relative", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold", children: "Reset Your Password" }),
          badgeText && /* @__PURE__ */ jsxRuntime.jsx(badge.Badge, { variant: "outline", className: "text-xs", children: badgeText })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          verifying && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: "Verifying your reset link…" }) }),
          error && !verifying && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error }) }),
          success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
          email && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsxRuntime.jsx(input.Input, { id: "email", type: "email", value: email, disabled: true, className: "bg-gray-50" })
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
        ] }) })
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
