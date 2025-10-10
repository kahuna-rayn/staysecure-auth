(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("react/jsx-runtime"), require("react"), require("react-router-dom"), require("lucide-react"), require("@/components/ui/button"), require("@/components/ui/input"), require("@/components/ui/label"), require("@/components/ui/card"), require("@/components/ui/alert"), require("@/assets/rayn-logo.png")) : typeof define === "function" && define.amd ? define(["exports", "react/jsx-runtime", "react", "react-router-dom", "lucide-react", "@/components/ui/button", "@/components/ui/input", "@/components/ui/label", "@/components/ui/card", "@/components/ui/alert", "@/assets/rayn-logo.png"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.StaySecureAuth = {}, global["react/jsx-runtime"], global.React, global.reactRouterDom, global.lucideReact, global.button, global.input, global.label, global.card, global.alert, global.raynLogo));
})(this, function(exports2, jsxRuntime, react, reactRouterDom, lucideReact, button, input, label, card, alert, raynLogo) {
  "use strict";
  const AuthContext = react.createContext(null);
  const defaultAuthContext = {
    user: null,
    loading: true,
    error: null,
    signIn: async () => {
    },
    signUp: async () => {
    },
    signOut: async () => {
    },
    resetPassword: async () => {
    },
    activateUser: async () => {
    },
    sendActivationEmail: async () => {
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
        const baseUrl = window.location.origin;
        const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}`;
        console.log("Sending password reset to:", email);
        console.log("Reset URL:", resetUrl);
        const { error: error2 } = await supabaseClient.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "Reset Your Password",
            html: `
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>If the link doesn't work, copy and paste this URL into your browser:</p>
            <p>${resetUrl}</p>
          `
          }
        });
        if (error2) {
          throw new Error("Failed to send reset email");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    const activateUser = async (password) => {
      try {
        setLoading(true);
        setError(null);
        const { error: error2 } = await supabaseClient.auth.updateUser({
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
    const sendActivationEmail = async (email) => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/activate-account`;
        console.log("Sending activation email to:", email);
        console.log("Redirect URL:", redirectUrl);
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
          console.log("Activation email sent successfully:", data);
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
    const value = {
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resetPassword,
      activateUser,
      sendActivationEmail
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
  const AuthPage = ({
    authError,
    Button,
    Input,
    Label,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    logoUrl
  }) => {
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [resetMessage, setResetMessage] = react.useState("");
    const [activationMessage, setActivationMessage] = react.useState("");
    const { signIn, signOut, user, loading, error, resetPassword } = useAuth();
    const location = reactRouterDom.useLocation();
    console.log("[AuthPage] src/components rendered", { href: window.location.href, ts: (/* @__PURE__ */ new Date()).toISOString(), state: location.state });
    react.useEffect(() => {
      var _a;
      if ((_a = location.state) == null ? void 0 : _a.message) {
        setActivationMessage(location.state.message);
        window.history.replaceState({}, document.title);
      }
    }, [location.state]);
    const handleSubmit = async (e) => {
      e.preventDefault();
      await signIn(email, password);
    };
    const handleForgotPassword = async () => {
      if (!email) {
        setResetMessage("Please enter your email address first");
        return;
      }
      try {
        setResetMessage("");
        await resetPassword(email);
        setResetMessage("Password reset email sent! Check your inbox.");
      } catch (error2) {
        setResetMessage(`Error: ${error2.message}`);
      }
    };
    if (user) {
      return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen bg-learning-background flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntime.jsxs(Card, { className: "w-full max-w-md", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(CardTitle, { children: "Welcome!" }),
          /* @__PURE__ */ jsxRuntime.jsxs(CardDescription, { children: [
            "You are logged in as ",
            user.email
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(CardContent, { children: /* @__PURE__ */ jsxRuntime.jsx(Button, { onClick: signOut, variant: "outline", className: "w-full", children: "Sign Out" }) })
      ] }) });
    }
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen bg-learning-background flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "w-full max-w-md space-y-6", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: logoUrl || "/rayn-logo.png",
            alt: "RAYN Secure Logo",
            className: "mx-auto h-20 w-auto mb-4"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-3xl font-bold text-learning-primary", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-muted-foreground mt-2", children: "Behavioural Science Based Cybersecurity Learning" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(CardTitle, { children: "Sign In" }),
          /* @__PURE__ */ jsxRuntime.jsx(CardDescription, { children: "Enter your credentials to access your account" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                Input,
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
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(Label, { htmlFor: "password", children: "Password" }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  Input,
                  {
                    id: "password",
                    type: showPassword ? "text" : "password",
                    placeholder: "Enter your password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    required: true
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  Button,
                  {
                    type: "button",
                    variant: "ghost",
                    size: "sm",
                    className: "absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent",
                    onClick: () => setShowPassword(!showPassword),
                    children: showPassword ? /* @__PURE__ */ jsxRuntime.jsx(lucideReact.EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Eye, { className: "h-4 w-4" })
                  }
                )
              ] })
            ] }),
            activationMessage && /* @__PURE__ */ jsxRuntime.jsx(Alert, { children: /* @__PURE__ */ jsxRuntime.jsx(AlertDescription, { children: activationMessage }) }),
            (error || authError) && /* @__PURE__ */ jsxRuntime.jsx(Alert, { variant: "destructive", children: /* @__PURE__ */ jsxRuntime.jsx(AlertDescription, { children: authError || error }) }),
            resetMessage && /* @__PURE__ */ jsxRuntime.jsx(Alert, { variant: resetMessage.includes("Error") ? "destructive" : "default", children: /* @__PURE__ */ jsxRuntime.jsx(AlertDescription, { children: resetMessage }) }),
            /* @__PURE__ */ jsxRuntime.jsxs(Button, { type: "submit", className: "w-full", disabled: loading, children: [
              loading && /* @__PURE__ */ jsxRuntime.jsx(lucideReact.Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
              "Sign In"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
            Button,
            {
              variant: "link",
              className: "p-0 h-auto text-teal-600",
              onClick: handleForgotPassword,
              children: "Forgot Password?"
            }
          ) })
        ] })
      ] })
    ] }) });
  };
  const ActivateAccount = ({ supabaseClient }) => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
    const { activateUser, error: authError, loading: authLoading, signOut } = useAuth();
    const [email, setEmail] = react.useState("");
    const [password, setPassword] = react.useState("");
    const [confirmPassword, setConfirmPassword] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [error, setError] = react.useState("");
    const [success, setSuccess] = react.useState("");
    const [showPassword, setShowPassword] = react.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = react.useState(false);
    const [accessToken, setAccessToken] = react.useState(null);
    const [refreshToken, setRefreshToken] = react.useState(null);
    const searchParams = new URLSearchParams(location.search);
    react.useEffect(() => {
      const run = async () => {
        var _a, _b;
        console.log("ActivateAccount: URL hash:", window.location.hash);
        console.log("ActivateAccount: URL search:", window.location.search);
        console.log("ActivateAccount: Full URL:", window.location.href);
        console.log("ActivateAccount: Location hash:", location.hash);
        const hash = location.hash || window.location.hash;
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const type = hashParams.get("type") || searchParams.get("type");
        const access = hashParams.get("access_token");
        const refresh = hashParams.get("refresh_token");
        const token = searchParams.get("token");
        const tokenHash = searchParams.get("token_hash");
        console.log("ActivateAccount: Parsed URL params:", {
          type,
          hasAccessToken: !!access,
          hasRefreshToken: !!refresh,
          hasToken: !!token,
          hasTokenHash: !!tokenHash
        });
        if (tokenHash && type === "invite") {
          console.log("ActivateAccount: Processing invite token");
          try {
            const { data, error: error2 } = await supabaseClient.auth.verifyOtp({
              token_hash: tokenHash,
              type: "invite"
            });
            if (error2) {
              console.error("ActivateAccount: verifyOtp error:", error2);
              setError("Invalid or expired activation link. Please contact your administrator.");
            } else if (data.user) {
              console.log("ActivateAccount: Invite verified successfully for:", data.user.email);
              setEmail(data.user.email || "");
            }
          } catch (e) {
            console.error("ActivateAccount: verifyOtp exception:", e);
            setError("Failed to verify activation link. Please try again.");
          }
          return;
        }
        const emailParam = searchParams.get("email");
        const userIdParam = searchParams.get("user_id");
        if (emailParam && userIdParam) {
          console.log("ActivateAccount: Processing simple activation for:", emailParam);
          setEmail(emailParam);
          return;
        }
        if ((type === "signup" || type === "invite") && access && refresh) {
          console.log("ActivateAccount: Setting session for", type, "flow");
          setAccessToken(access);
          setRefreshToken(refresh);
          try {
            const { data, error: error2 } = await supabaseClient.auth.setSession({
              access_token: access,
              refresh_token: refresh
            });
            if (error2) {
              console.error("ActivateAccount: setSession error:", error2);
              setError("Invalid activation link. Please try again.");
            } else if (data.user) {
              console.log("ActivateAccount: Session set successfully for:", data.user.email);
              setEmail(data.user.email || "");
            }
          } catch (e) {
            console.error("ActivateAccount: setSession exception:", e);
            setError("Failed to activate session. Please try again.");
          }
          return;
        }
        console.log("ActivateAccount: Checking for existing session");
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
          console.log("ActivateAccount: Found existing session for:", (_a = session.user) == null ? void 0 : _a.email);
          setEmail(((_b = session.user) == null ? void 0 : _b.email) || "");
          return;
        }
        console.log("ActivateAccount: No session or tokens found");
        setError("Invalid or expired activation link. Please contact your administrator.");
        console.log("ActivateAccount: No valid session found - this is expected when testing directly");
      };
      void run();
    }, [location.hash]);
    const handleSubmit = async (e) => {
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
        const userIdParam = searchParams.get("user_id");
        if (userIdParam) {
          await activateUser(email, password, confirmPassword, userIdParam);
          setSuccess("Account activated successfully! Redirecting to login...");
          setTimeout(() => {
            navigate("/");
          }, 2e3);
        } else {
          await activateUser(email, password, confirmPassword);
          setSuccess("Account activated successfully! Redirecting to login...");
          await signOut();
          setTimeout(() => {
            navigate("/");
          }, 2e3);
        }
      } catch (error2) {
        setError(error2.message);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: raynLogo,
            alt: "RAYN Secure Logo",
            className: "mx-auto h-20 w-auto mb-4"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-3xl font-bold text-primary", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-muted-foreground mt-2", children: "Cybersecurity Training Platform" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "border-primary/20 shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold text-primary", children: "Activate Your Account" }),
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
              className: "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
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
              onClick: () => navigate("/"),
              className: "w-full border-primary/20 text-primary hover:bg-primary/10",
              children: "Back to Login"
            }
          ) })
        ] }) })
      ] })
    ] }) });
  };
  const ResetPassword = ({ supabaseClient }) => {
    const location = reactRouterDom.useLocation();
    const navigate = reactRouterDom.useNavigate();
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
        console.log("ResetPassword: URL hash:", window.location.hash);
        console.log("ResetPassword: URL search:", window.location.search);
        console.log("ResetPassword: Full URL:", window.location.href);
        console.log("ResetPassword: URL hash:", window.location.hash);
        console.log("ResetPassword: URL search:", window.location.search);
        console.log("ResetPassword: Full URL:", window.location.href);
        const hash = location.hash || window.location.hash;
        const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
        const searchParams = new URLSearchParams(location.search);
        const type = hashParams.get("type") || searchParams.get("type");
        const tokenHash = searchParams.get("token_hash");
        console.log("ResetPassword: Parsed params:", {
          type,
          hasTokenHash: !!tokenHash,
          hashParams: Array.from(hashParams.entries()),
          searchParams: Array.from(searchParams.entries())
        });
        if (tokenHash && type === "recovery") {
          console.log("ResetPassword: Processing recovery token");
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
        console.log("ResetPassword: No valid recovery token found");
      };
      void run();
    }, [location.hash, location.search, supabaseClient]);
    const handleSubmit = async (e) => {
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
        const { error: updateError } = await supabaseClient.auth.updateUser({
          password
        });
        if (updateError) {
          const errorMsg = updateError.message;
          if (errorMsg.toLowerCase().includes("weak") || errorMsg.toLowerCase().includes("password") && errorMsg.toLowerCase().includes("strong")) {
            throw new Error("Password is too weak. Please use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.");
          } else if (errorMsg.toLowerCase().includes("same")) {
            throw new Error("New password cannot be the same as your current password. Please choose a different password.");
          } else if (errorMsg.toLowerCase().includes("session") || errorMsg.toLowerCase().includes("expired")) {
            throw new Error("Your password reset link has expired. Please request a new one.");
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
    return /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "max-w-md w-full space-y-8", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "img",
          {
            src: raynLogo,
            alt: "RAYN Secure Logo",
            className: "mx-auto h-20 w-auto mb-4"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-3xl font-bold text-primary", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-muted-foreground mt-2", children: "Cybersecurity Training Platform" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(card.Card, { className: "border-primary/20 shadow-lg", children: [
        /* @__PURE__ */ jsxRuntime.jsxs(card.CardHeader, { className: "text-center", children: [
          /* @__PURE__ */ jsxRuntime.jsx(card.CardTitle, { className: "text-2xl font-bold text-primary", children: "Reset Your Password" }),
          /* @__PURE__ */ jsxRuntime.jsx(card.CardDescription, { children: "Enter your new password below" })
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
              className: "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
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
              className: "w-full border-primary/20 text-primary hover:bg-primary/10",
              children: "Back to Login"
            }
          ) })
        ] }) })
      ] })
    ] }) });
  };
  const AuthModuleWrapper = ({
    supabase,
    Button,
    Input,
    Label,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    logoUrl,
    component,
    authError
  }) => {
    const commonProps = {
      Button,
      Input,
      Label,
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
      Alert,
      AlertDescription,
      logoUrl
    };
    switch (component) {
      case "AuthPage":
        return /* @__PURE__ */ jsxRuntime.jsx(AuthPage, { ...commonProps, authError });
      case "ActivateAccount":
        return /* @__PURE__ */ jsxRuntime.jsx(ActivateAccount, { ...commonProps, supabase });
      case "ResetPassword":
        return /* @__PURE__ */ jsxRuntime.jsx(ResetPassword, { ...commonProps, supabase });
      default:
        return null;
    }
  };
  const ForgotPassword = ({
    Button,
    Input,
    Label,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    logoUrl
  }) => {
    const [email, setEmail] = react.useState("");
    const [loading, setLoading] = react.useState(false);
    const [message, setMessage] = react.useState("");
    const [isError, setIsError] = react.useState(false);
    const { resetPassword } = useAuth();
    const navigate = reactRouterDom.useNavigate();
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
            src: logoUrl || "/rayn-logo.png",
            alt: "RAYN Secure Logo",
            className: "mx-auto h-20 w-auto mb-4"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx("h1", { className: "text-3xl font-bold text-learning-primary", children: "RAYN Secure" }),
        /* @__PURE__ */ jsxRuntime.jsx("p", { className: "text-muted-foreground mt-2", children: "Behavioural Science Based Cybersecurity Learning" })
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(Card, { children: [
        /* @__PURE__ */ jsxRuntime.jsxs(CardHeader, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(CardTitle, { children: "Reset Your Password" }),
          /* @__PURE__ */ jsxRuntime.jsx(CardDescription, { children: "Enter your email address and we'll send you a link to reset your password" })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsxs(CardContent, { children: [
          /* @__PURE__ */ jsxRuntime.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx(Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsxRuntime.jsx(
                Input,
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
            message && /* @__PURE__ */ jsxRuntime.jsx(Alert, { variant: isError ? "destructive" : "default", children: /* @__PURE__ */ jsxRuntime.jsx(AlertDescription, { children: message }) }),
            /* @__PURE__ */ jsxRuntime.jsxs(Button, { type: "submit", className: "w-full", disabled: loading, children: [
              loading && /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" }),
              "Send Reset Link"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "mt-4 text-center", children: /* @__PURE__ */ jsxRuntime.jsx(
            Button,
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
  exports2.ActivateAccount = ActivateAccount;
  exports2.AuthModuleWrapper = AuthModuleWrapper;
  exports2.AuthPage = AuthPage;
  exports2.AuthProvider = AuthProvider;
  exports2.ForgotPassword = ForgotPassword;
  exports2.ResetPassword = ResetPassword;
  exports2.useAuth = useAuth;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
//# sourceMappingURL=index.umd.js.map
