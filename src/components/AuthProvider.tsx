import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { debugLog } from '../utils/debugLog';

/** What the app knows about the current user's role — passed in so the auth
 *  module stays decoupled from app-specific role logic. */
export interface MFAConfig {
  /**
   * Return true if this user must enroll MFA before entering the app.
   * Receives the Supabase auth user and the supabase client so it can query
   * profiles (e.g. check access_level) if needed. May be async.
   */
  requireEnrollment?: (user: any, supabaseClient: any) => boolean | Promise<boolean>;
}

export interface AuthConfig {
  supabaseClient: any;
  redirectTo?: string;
  mfa?: MFAConfig;
}

/** Possible MFA states surfaced to consuming components. */
export type MFAState =
  | 'none'      // No MFA action needed — proceed normally
  | 'challenge' // User has a factor enrolled; must verify before entering app
  | 'enroll'    // User must enroll (mandatory per requireEnrollment rule)
  | 'prompt';   // User has no factor but enrollment is optional — show nudge

export interface AuthContextValue {
  user: any | null;
  loading: boolean;
  error: string | null;
  supabaseClient: any;
  mfaState: MFAState;
  clearMfaState: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendActivationEmail: (email: string) => Promise<void>;
  activateUser: (email: string, password: string, confirmPassword: string, userId?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Default context value to prevent errors during initialization
const defaultAuthContext: AuthContextValue = {
  user: null,
  loading: true,
  error: null,
  supabaseClient: null,
  mfaState: 'none',
  clearMfaState: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  sendActivationEmail: async () => {},
  activateUser: async () => {},
  changePassword: async () => ({ success: false, error: 'Not configured' }),
};

export const AuthProvider: React.FC<{
  config: AuthConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const { supabaseClient, mfa: mfaConfig } = config;
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaState, setMfaState] = useState<MFAState>('none');
  // True while either the initial session restore OR a signIn is running its
  // MFA check — prevents onAuthStateChange from setting user prematurely.
  // Initialized to true so that SIGNED_IN / INITIAL_SESSION events fired
  // before getInitialSession completes are suppressed.
  const mfaCheckInProgress = React.useRef(true);

  // Service role client removed - using Supabase's built-in validation instead

  useEffect(() => {
    // Get initial session — also checks AAL so that a persisted aal1 session
    // for a user with an enrolled factor can't bypass MFA via page refresh.
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (!session) {
          debugLog('[AuthProvider] getInitialSession: no session');
          setUser(null);
          return;
        }

        // Check assurance level of the restored session.
        const { data: aalData } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        const { currentLevel, nextLevel } = aalData ?? {};
        debugLog('[AuthProvider] getInitialSession AAL', { currentLevel, nextLevel, email: session.user?.email });

        if (currentLevel === 'aal1' && nextLevel === 'aal2') {
          // For OAuth/SSO users (e.g. Entra), the IdP already handled MFA —
          // don't stack our TOTP challenge on top of it.
          // Check identities array rather than app_metadata.provider, because
          // for accounts originally created via email/password and later linked
          // to Azure, provider stays 'email' but identities includes 'azure'.
          const identities: any[] = session.user.identities ?? [];
          const providers: string[] = session.user.app_metadata?.providers ?? [];
          const primaryProvider: string = session.user.app_metadata?.provider ?? 'email';
          debugLog('[AuthProvider] getInitialSession AAL challenge check', {
            primaryProvider,
            providers,
            identityProviders: identities.map((i: any) => i.provider),
          });
          const hasOAuthIdentity = identities.some((i: any) => i.provider !== 'email')
            || providers.some((p: string) => p !== 'email');
          if (hasOAuthIdentity) {
            debugLog('[AuthProvider] getInitialSession: OAuth identity detected — skipping TOTP challenge');
            setUser(session.user);
            return;
          }
          // Password-only user with enrolled factor — require TOTP challenge.
          debugLog('[AuthProvider] getInitialSession: aal1 session with enrolled factor → mfaState: challenge');
          setMfaState('challenge');
          return;
        }

        // Session is either already aal2, or user has no factor — set user normally.
        setUser(session.user);
      } catch (error: any) {
        debugLog('[AuthProvider] getInitialSession error', error.message);
        setError(error.message);
      } finally {
        // Release the gate so subsequent onAuthStateChange events (e.g.
        // TOKEN_REFRESHED after mfa.verify(), or sign-out) are handled normally.
        mfaCheckInProgress.current = false;
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: any) => {
        debugLog('[AuthProvider] onAuthStateChange', event, session?.user?.email ?? 'no user');

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && mfaCheckInProgress.current) {
          // Either getInitialSession or signIn is running its async MFA/AAL check.
          // Suppress setting user until that check completes — otherwise the app
          // navigates to the dashboard before MFA is verified.
          // TOKEN_REFRESHED (fired after mfa.verify()) is intentionally NOT
          // suppressed here so successful MFA verification sets the user normally.
          debugLog('[AuthProvider]', event, 'suppressed — MFA/session check in progress');
          setLoading(false);
          return;
        }

        // ── OAuth JIT provisioning + inactive gate ────────────────────────────
        // signIn() handles this for password-based logins. For OAuth (Entra SSO)
        // the SIGNED_IN event fires here without going through signIn(), so we
        // must run the same checks on this path.
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata?.provider;
          const isOAuth = provider && provider !== 'email';
          debugLog('[AuthProvider] SIGNED_IN provider:', provider, 'isOAuth:', isOAuth);

          if (isOAuth) {
            try {
              const userId = session.user.id;
              const email = session.user.email ?? '';
              const fullName = session.user.user_metadata?.full_name
                ?? session.user.user_metadata?.name
                ?? '';
              // Entra object ID for stable identity linking
              const entraOid = session.user.user_metadata?.sub
                ?? session.user.user_metadata?.provider_id
                ?? null;

              // JIT: ensure a profiles row exists for this user
              const { data: existing } = await supabaseClient
                .from('profiles')
                .select('id, status, entra_oid')
                .eq('id', userId)
                .maybeSingle();

              if (!existing) {
                debugLog('[AuthProvider] JIT creating profile for', email);
                await supabaseClient.from('profiles').insert({
                  id: userId,
                  email,
                  full_name: fullName,
                  status: 'Active',
                  entra_oid: entraOid,
                });
              } else {
                // Update entra_oid if not yet stored
                if (entraOid && !existing.entra_oid) {
                  await supabaseClient
                    .from('profiles')
                    .update({ entra_oid: entraOid })
                    .eq('id', userId);
                }

                // Inactive gate — same as password path
                if (existing.status === 'Inactive') {
                  debugLog('[AuthProvider] OAuth user is Inactive → signing out');
                  await supabaseClient.auth.signOut();
                  setError('Your account has been deactivated. Please contact your administrator.');
                  setLoading(false);
                  return;
                }
              }
            } catch (err: any) {
              debugLog('[AuthProvider] OAuth JIT error', err.message);
            }
          }
        }
        // ── end OAuth JIT ─────────────────────────────────────────────────────

        setUser(session?.user || null);
        setLoading(false);

        if (event === 'SIGNED_OUT') {
          debugLog('[AuthProvider] SIGNED_OUT → clearing mfaState');
          setMfaState('none');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      setMfaState('none');
      mfaCheckInProgress.current = true;

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      debugLog('[AuthProvider] signIn success', data.user?.email);

      // ── Inactive account gate ─────────────────────────────────────────────
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (profileData?.status === 'Inactive') {
        await supabaseClient.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact your administrator.');
      }
      // ── end Inactive gate ─────────────────────────────────────────────────

      // ── MFA check ────────────────────────────────────────────────────────
      const { data: aalData, error: aalError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        debugLog('[AuthProvider] AAL check error', aalError.message);
      }
      const { currentLevel, nextLevel } = aalData ?? {};
      debugLog('[AuthProvider] AAL levels', { currentLevel, nextLevel });

      if (currentLevel === 'aal1' && nextLevel === 'aal2') {
        // User has an enrolled factor but hasn't verified this session yet.
        // Keep user null — LoginForm will show MFAChallenge.
        // TOKEN_REFRESHED fires after mfa.verify() and sets user.
        debugLog('[AuthProvider] → mfaState: challenge (factor enrolled, not yet verified)');
        setMfaState('challenge');
        return;
      }

      if (nextLevel === 'aal1') {
        // No factors enrolled — check if enrollment should be forced
        debugLog('[AuthProvider] No factor enrolled; checking requireEnrollment...');
        const shouldForce = mfaConfig?.requireEnrollment
          ? await mfaConfig.requireEnrollment(data.user, supabaseClient)
          : false;
        debugLog('[AuthProvider] requireEnrollment →', shouldForce);
        if (shouldForce) {
          // Keep user null — LoginForm will show MFAEnrollment.
          // TOKEN_REFRESHED fires after mfa.verify() and sets user.
          debugLog('[AuthProvider] → mfaState: enroll (mandatory)');
          setMfaState('enroll');
          return;
        }
        // Optional nudge — user can skip, so set user immediately.
        debugLog('[AuthProvider] → mfaState: prompt (optional nudge)');
        setMfaState('prompt');
      }

      // No MFA action required — set user now (onAuthStateChange was suppressed).
      debugLog('[AuthProvider] → no MFA gate; setting user now');
      setUser(data.user);
      // ── end MFA check ─────────────────────────────────────────────────────
    } catch (error: any) {
      debugLog('[AuthProvider] signIn error', error.message);
      setError(error.message);
    } finally {
      mfaCheckInProgress.current = false;
      setLoading(false);
    }
  };

  const clearMfaState = () => setMfaState('none');

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/activate-account`;
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error: any) {
      // Session may already be invalid (e.g. after password change). Clear local state
      // so the user is logged out in the app; otherwise they stay "stuck" logged in.
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build redirect URL with client segment (e.g. /nexus/reset-password)
      // mirrors sendActivationEmail pattern
      const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
      const reserved = ['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications'];
      const clientSegment = pathParts[0] && !reserved.includes(pathParts[0]) ? pathParts[0] : '';
      const redirectUrl = typeof window !== 'undefined'
        ? clientSegment
          ? `${window.location.origin}/${clientSegment}/reset-password`
          : `${window.location.origin}/reset-password`
        : undefined;
      
      debugLog('[AuthProvider] resetPassword', email);
      
      const { data, error: resetError } = await supabaseClient.functions.invoke('send-password-reset', {
        body: {
          email,
          redirectUrl,
        }
      });
      
      if (resetError) throw resetError;
      
      // Check if Edge Function returned an error
      if (data?.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      debugLog('[AuthProvider] ✅ password reset email sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  const sendActivationEmail = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      debugLog('[AuthProvider] sendActivationEmail', email);

      // Build redirect URL the same way as resetPassword: origin + client path + /activate-account.
      // Derive client path from current pathname so the activation link lands on the correct client route.
      const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
      const reserved = ['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications'];
      const clientSegment = pathParts[0] && !reserved.includes(pathParts[0]) ? pathParts[0] : '';
      const redirectUrl =
        typeof window !== 'undefined'
          ? clientSegment
            ? `${window.location.origin}/${clientSegment}/activate-account`
            : `${window.location.origin}/activate-account`
          : undefined;

      // Use Edge Function (service role) to check profiles and send activation email.
      const { data, error } = await supabaseClient.functions.invoke('request-activation-link', {
        body: { email, redirectUrl },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      debugLog('[AuthProvider] ✅ activation email sent');
    } catch (error: any) {
      console.error('Activation email error:', error);
      // When Edge Function returns 404/500, invoke() throws and response body is in error.context
      let message = error?.message ?? 'An error occurred';
      if (error?.context && typeof error.context?.json === 'function') {
        try {
          const body = await error.context.json();
          if (body?.error && typeof body.error === 'string') message = body.error;
        } catch {
          // ignore parse failure
        }
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (email: string, password: string, confirmPassword: string, userId?: string) => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      debugLog('[AuthProvider] activateUser', email);
      
      // Use the update-user-password edge function to set the password
      const { data, error: updateError } = await supabaseClient.functions.invoke('update-user-password', {
        body: {
          email,
          password,
          user_id: userId
        }
      });
      
      if (updateError) {
        console.error('Edge Function error:', updateError);
        throw updateError;
      }
      
      // Check if Edge Function returned an error
      if (data?.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      // Now try to sign in with the new password
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Update user status to Active in profiles table (fallback if Edge Function didn't do it)
      if (signInData.user) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ status: 'Active' })
          .eq('id', signInData.user.id);
          
        if (profileError) {
          console.error('❌ Profile update error:', profileError);
          // Don't throw - activation was successful
        }
      }
      
      debugLog('[AuthProvider] ✅ user activated', signInData.user?.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'You must be signed in to change your password.' };
    }
    try {
      const { data, error: fnError } = await supabaseClient.functions.invoke('change-password', {
        body: {
          currentPassword,
          newPassword,
          userId: user.id,
          timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
        },
      });
      if (fnError) {
        return { success: false, error: fnError.message || 'Failed to update password.' };
      }
      if (data?.success === false && data?.error) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return { success: false, error: message };
    }
  };

  const value: AuthContextValue = {
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
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn("useAuth called outside AuthProvider, using default context");
    return defaultAuthContext;
  }
  return context;
};