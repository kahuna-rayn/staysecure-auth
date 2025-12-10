(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("react/jsx-runtime"), require("react"), require("react-router-dom"), require("@/components/ui/button"), require("@/components/ui/input"), require("@/components/ui/label"), require("@/components/ui/card"), require("@/components/ui/alert"), require("lucide-react"), require("@/assets/rayn-logo.png"), require("@/integrations/supabase/client")) : typeof define === "function" && define.amd ? define(["exports", "react/jsx-runtime", "react", "react-router-dom", "@/components/ui/button", "@/components/ui/input", "@/components/ui/label", "@/components/ui/card", "@/components/ui/alert", "lucide-react", "@/assets/rayn-logo.png", "@/integrations/supabase/client"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.StaySecureAuth = {}, global["react/jsx-runtime"], global.React, global.reactRouterDom, global.button, global.input, global.label, global.card, global.alert, global.lucideReact, global.raynLogo, global.client));
})(this, function(exports2, jsxRuntime, react, reactRouterDom, button, input, label, card, alert, lucideReact, raynLogo, client) {
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
  const ActivateAccount = () => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const { activateUser, error: authError, loading: authLoading, signOut, supabaseClient } = useAuth();
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [confirmPassword, setConfirmPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = react.useState(false);
    const clientPathRef = react.useRef("");
    const searchParams = new URLSearchParams(location.search);
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
        const hash = location.hash || window.location.hash || backupHash;
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const type = hashParams.get("type") || searchParams.get("type");
        const access = hashParams.get("access_token");
        const refresh = hashParams.get("refresh_token");
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
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center mb-6", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: raynLogo,
            alt: "RAYN Secure Logo",
            className: "mx-auto h-12 w-auto mb-2"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-xl font-semibold text-gray-800", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-sm text-gray-600", children: "Get Secure, Stay Secure!" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold", children: "Activate Your Account" }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Set your password to complete account activation" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
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
                disabled: true,
                className: "bg-gray-50"
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
        ] }) })
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
  const ForgotPassword = () => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const [email, setEmail] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [message, setMessage] = react.useState("");
    const [isError, setIsError] = react.useState(false);
    const { resetPassword } = useAuth();
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
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: raynLogo,
            alt: "RAYN Secure Logo",
            className: "mx-auto h-20 w-auto mb-4"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-3xl font-bold text-learning-primary", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-muted-foreground mt-2", children: "Get Secure, Stay Secure!" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: "Reset Your Password" }),
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
  const LoginForm = () => {
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [showPassword, setShowPassword] = react.useState(false);
    const [showForgotPassword, setShowForgotPassword] = react.useState(false);
    const [success, setSuccess] = react.useState("");
    const { signIn, resetPassword, error, loading: authLoading } = useAuth();
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
    const handleForgotPassword = async (e) => {
      e.preventDefault();
      setLoading(true);
      setSuccess("");
      try {
        await resetPassword(email);
        setSuccess("Password reset instructions have been sent to your email.");
        setShowForgotPassword(false);
      } catch (error2) {
        console.log("Reset password error:", error2);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "w-full max-w-md mx-auto", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { children: showForgotPassword ? "Reset Password" : "Sign In" }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: showForgotPassword ? "Enter your email address to receive password reset instructions" : "Enter your email and password to access your learning dashboard" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: showForgotPassword ? handleForgotPassword : handleSubmit, className: "space-y-4", children: [
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
        !showForgotPassword && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
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
          showForgotPassword ? "Send Reset Instructions" : "Sign In"
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: showForgotPassword ? /* @__PURE__ */ jsxRuntime.jsx(
          button.Button,
          {
            variant: "link",
            type: "button",
            onClick: () => {
              setShowForgotPassword(false);
              setSuccess("");
            },
            children: "Back to Sign In"
          }
        ) : /* @__PURE__ */ jsxRuntime.jsx(
          button.Button,
          {
            variant: "link",
            type: "button",
            onClick: () => {
              setShowForgotPassword(true);
              setSuccess("");
            },
            children: "Forgot Password?"
          }
        ) })
      ] }) })
    ] });
  };
  const ResetPassword = () => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const { supabaseClient } = useAuth();
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [confirmPassword, setConfirmPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = react.useState(false);
    react.useEffect(() => {
      const run = async () => {
        var _a, _b, _c;
        console.log("ResetPassword: URL hash:", window.location.hash);
        console.log("ResetPassword: URL search:", window.location.search);
        console.log("ResetPassword: Full URL:", window.location.href);
        const hash = location.hash || window.location.hash;
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const searchParams = new URLSearchParams(location.search);
        const type = hashParams.get("type") || searchParams.get("type");
        const tokenHash = searchParams.get("token_hash");
        const hasAccessToken = hashParams.has("access_token") || hash.includes("access_token");
        console.log("ResetPassword: Parsed params:", {
          type,
          hasTokenHash: !!tokenHash,
          hasAccessToken,
          hashParams: Array.from(hashParams.entries()),
          searchParams: Array.from(searchParams.entries())
        });
        if (tokenHash && type === "recovery") {
          console.log("ResetPassword: Processing recovery token (token_hash)");
          try {
            const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery"
            });
            if (verifyError) {
              console.error("ResetPassword: verifyOtp error:", verifyError);
              setError("Invalid or expired password reset link. Please request a new one.");
            } else if (data.user) {
              console.log("ResetPassword: Recovery verified successfully for:", data.user.email);
              setEmail(data.user.email || "");
            }
          } catch (e) {
            console.error("ResetPassword: verifyOtp exception:", e);
            setError("Failed to verify password reset link. Please try again.");
          }
          return;
        }
        if (hasAccessToken && type === "recovery") {
          console.log("ResetPassword: Processing recovery token (access_token) - waiting for session");
          let session = null;
          const maxRetries = 10;
          const retryDelay = 500;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
            if ((_a = currentSession == null ? void 0 : currentSession.user) == null ? void 0 : _a.email) {
              session = currentSession;
              console.log(`ResetPassword: Session found on attempt ${attempt + 1}`);
              break;
            }
            if (attempt < maxRetries - 1) {
              console.log(`ResetPassword: No session yet (attempt ${attempt + 1}/${maxRetries}), waiting ${retryDelay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
          if ((_b = session == null ? void 0 : session.user) == null ? void 0 : _b.email) {
            console.log("ResetPassword: Recovery session found for:", session.user.email);
            setEmail(session.user.email);
          } else {
            console.error("ResetPassword: No session found after waiting");
            setError("Unable to verify password reset link. Please request a new one.");
          }
          return;
        }
        const { data: { session: existingSession } } = await supabaseClient.auth.getSession();
        if ((_c = existingSession == null ? void 0 : existingSession.user) == null ? void 0 : _c.email) {
          console.log("ResetPassword: Using existing session for:", existingSession.user.email);
          setEmail(existingSession.user.email);
          return;
        }
        console.log("ResetPassword: No valid recovery token or session found");
      };
      void run();
    }, [location.hash, location.search, supabaseClient]);
    const handleSubmit = async (e) => {
      var _a;
      e.preventDefault();
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
        const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !currentSession) {
          console.error("ResetPassword: No valid session found:", sessionError);
          throw new Error("Your password reset session has expired. Please request a new reset link.");
        }
        if (!((_a = currentSession.user) == null ? void 0 : _a.email)) {
          console.error("ResetPassword: Session exists but no user email found");
          throw new Error("Unable to verify your identity. Please request a new password reset link.");
        }
        const { error: updateError } = await supabaseClient.auth.updateUser({
          password
        });
        if (updateError) {
          const errorMsg = updateError.message;
          console.error("ResetPassword: updateUser error:", updateError);
          if (errorMsg.toLowerCase().includes("weak") || errorMsg.toLowerCase().includes("password") && errorMsg.toLowerCase().includes("strong")) {
            throw new Error("Password is too weak. Please use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.");
          } else if (errorMsg.toLowerCase().includes("same")) {
            throw new Error("New password cannot be the same as your current password. Please choose a different password.");
          } else if (errorMsg.toLowerCase().includes("session") || errorMsg.toLowerCase().includes("expired") || errorMsg.toLowerCase().includes("invalid")) {
            const { data: { session: sessionAfterError } } = await supabaseClient.auth.getSession();
            if (!sessionAfterError) {
              throw new Error("Your password reset link has expired. Please request a new one.");
            }
            throw new Error(errorMsg || "Failed to update password. Please try again.");
          } else {
            throw new Error(errorMsg);
          }
        }
        setSuccess("Password reset successfully! Redirecting to login...");
        await supabaseClient.auth.signOut();
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2e3);
      } catch (error2) {
        setError(error2.message || "Failed to reset password. Please try again or request a new reset link.");
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center mb-6", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: raynLogo,
            alt: "RAYN Secure Logo",
            className: "mx-auto h-12 w-auto mb-2"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-xl font-semibold text-gray-800", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-sm text-gray-600", children: "Get Secure, Stay Secure!" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold", children: "Reset Your Password" }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: email ? `Reset password for ${email}` : "Enter your new password below" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(card.CardContent, { children: /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          error && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: error }) }),
          success && /* @__PURE__ */ jsxRuntime.jsx(alert.Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(alert.AlertDescription, { children: success }) }),
          email && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntime.jsx(label.Label, { htmlFor: "email", children: "Email" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              input.Input,
              {
                id: "email",
                type: "email",
                value: email,
                disabled: true,
                className: "bg-gray-50"
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
                  placeholder: "Enter your new password"
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
                  placeholder: "Confirm your new password"
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
              disabled: loading,
              children: [
                loading && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
                "Reset Password"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
            button.Button,
            {
              variant: "outline",
              onClick: () => navigate("/"),
              className: "w-full",
              children: "Back to Login"
            }
          ) })
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
