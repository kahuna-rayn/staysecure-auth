import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { debugLog } from '../utils/debugLog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import AuthBranding from './AuthBranding'

interface ResetPasswordProps {
  /** Optional displayName badge text. If not provided, badge won't show. */
  displayName?: string | null;
}

const isStrongPassword = (pwd: string) => {
  const hasLowercase = /[a-z]/.test(pwd)
  const hasUppercase = /[A-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(pwd)
  return pwd.length >= 12 && hasLowercase && hasUppercase && hasDigit && hasSpecial
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ displayName }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { supabaseClient, resetPassword } = useAuth()
  
  // Use displayName from props (passed by consuming app)
  const badgeText = displayName || null

  // Preserve client path segment (e.g. /rayn) when navigating back to forgot-password
  const reserved = ['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications'];
  const pathParts = location.pathname.split('/').filter(Boolean);
  const clientPrefix = pathParts[0] && !reserved.includes(pathParts[0]) ? `/${pathParts[0]}` : '';

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const initializedRef = useRef(false)

  // If we arrive here with an expired link state, redirect to forgot-password
  useEffect(() => {
    if (location.state?.authError && location.state?.expiredLink) {
      navigate(`${clientPrefix}/forgot-password`, {
        replace: true,
        state: {
          authError: location.state.authError
        }
      })
    }
  }, [location.state, navigate])

  const clearRecoveryParams = () => {
    const url = new URL(window.location.href)
    url.hash = ''
    url.searchParams.delete('type')
    url.searchParams.delete('token_hash')
    window.history.replaceState({}, document.title, url.toString())
  }


  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

     // Session listener for access_token flow
     const { data: sub } = supabaseClient.auth.onAuthStateChange((event: string, session: any) => {
       if (event === 'SIGNED_IN' && session?.user?.email) {
         debugLog('[ResetPassword] session signed in', session.user.email)
         setEmail(session.user.email)
         clearRecoveryParams()
         setVerifying(false)
       }
     })

     const run = async () => {
       try {
         // Parse params
         const hash = location.hash || window.location.hash || ''
         const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
         const searchParams = new URLSearchParams(location.search || window.location.search || '')
         const type = hashParams.get('type') || searchParams.get('type')
         const tokenHash = searchParams.get('token_hash')
         const hasAccessToken = hashParams.has('access_token') || hash.includes('access_token')

        // If "recovery" but no token present, likely email scanner burned the link
        if (type === 'recovery' && !tokenHash && !hasAccessToken) {
          setError('This password reset link may have been opened already by an email scanner. Please request a new link and open it only once.')
          setVerifying(false)
          return
        }

        // Check for expired link error in hash - redirect to forgot-password
        const errorCode = hashParams.get('error_code')
        if (errorCode === 'otp_expired' || hash.includes('error_code=otp_expired')) {
          debugLog('[ResetPassword] OTP expired, redirecting')
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: 'This password reset link has expired. Please enter your email address below to request a new one.'
            }
          })
          return
        }

        // token_hash flow
        if (tokenHash && type === 'recovery') {
          const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (verifyError) {
            console.error('[ResetPassword] ❌ verifyOtp error:', verifyError.message)
            // Check if it's an expired link - redirect to forgot-password
            if (verifyError.message?.includes('expired') || verifyError.message?.includes('otp_expired')) {
              navigate(`${clientPrefix}/forgot-password`, {
                replace: true,
                state: {
                  authError: 'This password reset link has expired. Please enter your email address below to request a new one.'
                }
              })
            } else {
              setError('Invalid password reset link. Please request a new one.')
            }
            setVerifying(false)
            return
          }
           if (data.user?.email) {
             debugLog('[ResetPassword] ✅ token verified', data.user.email)
             setEmail(data.user.email)
             clearRecoveryParams()
             setVerifying(false)
             return
           }
         }

         // access_token flow (session should be created by the client automatically)
         if (hasAccessToken && type === 'recovery') {
           // Short fallback polling (most handled by onAuthStateChange)
           const maxAttempts = 10
           const delay = 300
           for (let i = 0; i < maxAttempts; i++) {
             const { data: { session } } = await supabaseClient.auth.getSession()
             if (session?.user?.email) {
               debugLog('[ResetPassword] ✅ session found', session.user.email)
               setEmail(session.user.email)
               clearRecoveryParams()
               setVerifying(false)
               return
             }
             await new Promise((r) => setTimeout(r, delay))
           }
           // Timed out
           console.error('[ResetPassword] ❌ No session found after polling')
           setError('Unable to verify password reset link. Please request a new link.')
           setVerifying(false)
           return
         }

         // Existing session (e.g., page refresh)
         const { data: { session: existing }, error: existingErr } = await supabaseClient.auth.getSession()
         if (existing?.user?.email) {
           debugLog('[ResetPassword] ✅ existing session', existing.user.email)
           setEmail(existing.user.email)
         } else {
           // No session and no valid params — user can still enter password after manual verify, but we keep form disabled until email available
           console.warn('[ResetPassword] ⚠️ No session found and no valid recovery params')
           setError((prev) => prev || 'No active password reset session found. Please request a new reset link.')
         }
         setVerifying(false)
      } catch {
        setError('Failed to verify password reset link. Please try again.')
        setVerifying(false)
      }
    }

    void run()
    return () => sub.subscription.unsubscribe()
  }, [location.hash, location.search, supabaseClient])

  // Clear password-related errors when the condition is rectified
  useEffect(() => {
    if (!error) return;
    
    // Clear password policy error when password becomes valid
    if (error.includes('Password must be at least 12 characters')) {
      if (password && isStrongPassword(password)) {
        setError('');
        return;
      }
    }
    
    // Clear password mismatch error when passwords match
    if (error === 'Passwords do not match' || error.includes('Passwords do not match')) {
      if (password && confirmPassword && password === confirmPassword) {
        setError('');
        return;
      }
    }
  }, [password, confirmPassword, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    debugLog('[ResetPassword] handleSubmit', email)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character. Note spaces do not count toward the special characters');
      setLoading(false)
      return
    }

    try {
      let { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession()

      if (sessionErr || !session) {
        // quick retry
        await new Promise((r) => setTimeout(r, 300))
        const res = await supabaseClient.auth.getSession()
        session = res.data.session
      }

      if (!session?.user?.email) {
        console.error('[ResetPassword] ❌ No valid session found - cannot proceed')
        throw new Error('Your password reset session has expired. Please request a new reset link.')
      }

      // Use the update-user-password Edge Function to also activate account and update status
      const { data, error: updateError } = await supabaseClient.functions.invoke('update-user-password', {
        body: {
          email: session.user.email,
          password: password,
          user_id: session.user.id
        }
      });

      // Check for Edge Function invocation error first
      if (updateError) {
        console.error('[ResetPassword] ❌ Edge Function error:', updateError.message)
        
        // Check session after error to determine if we can retry
        const { data: { session: sessionAfterError } } = await supabaseClient.auth.getSession()
        
        // Handle common error statuses and messages
        // Try multiple ways to extract status code from Supabase functions.invoke error
        const errorAny = updateError as any
        const status = errorAny?.status || errorAny?.context?.status || errorAny?.context?.statusCode || errorAny?.statusCode || errorAny?.response?.status
        const msg = (updateError.message || '').toLowerCase()
        
        // Also check if error message contains status code (e.g., "422" or "non-2xx")
        // Supabase returns "Edge Function returned a non-2xx status code" for HTTP errors
        const statusFromMessage = msg.match(/\b422\b/) ? 422 : undefined
        const finalStatus = status || statusFromMessage
        
        // Check if error message contains "same password" text (from both error message and data.error if available)
        const dataErrorMsg = data?.error ? String(data.error).toLowerCase() : ''
        const hasSamePasswordError = msg.includes('same') || 
          msg.includes('cannot be the same') || 
          dataErrorMsg.includes('same') || 
          dataErrorMsg.includes('cannot be the same') ||
          finalStatus === 422  // 422 status typically means "same password" from our Edge Function
        
        // Handle "same password" error - CRITICAL: Do not proceed to success, do not redirect
        // Check for 422 status OR "same password" in error message OR in data.error
        if (finalStatus === 422 || hasSamePasswordError) {
          const sessionStillValid = !!sessionAfterError?.user?.email
          debugLog('[ResetPassword] same password error')
          
          // If session is still valid, just show error (allows user to retry)
          // CRITICAL: Return early to prevent any success/redirect logic
          if (sessionStillValid) {
            setError('New password cannot be the same as your current password. Please choose a different password.')
            setLoading(false)
            return // Exit early - do not proceed to success
          } else {
            // Session was invalidated - redirect to forgot-password
            navigate(`${clientPrefix}/forgot-password`, {
              replace: true,
              state: {
                authError: 'Your password reset session has expired. Please enter your email address below to request a new one.'
              }
            })
            return
          }
        }

        // Handle expired/invalid session errors - redirect to forgot-password
        if (status === 401 || status === 410 || msg.includes('expired') || msg.includes('invalid') || msg.includes('session')) {
          if (!sessionAfterError) {
            console.error('[ResetPassword] ❌ Session lost after updateUser error')
          }
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: 'Your password reset link has expired or was already used. Please enter your email address below to request a new one.'
            }
          })
          return
        }
        
        // Handle weak password errors
        if (msg.includes('weak') || (msg.includes('password') && msg.includes('strong'))) {
          setError('Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character. Note spaces do not count toward the special characters');
          setLoading(false)
          return // Exit early - do not proceed to success
        }
        
        // For other errors, check if session is still valid for retry
        const sessionStillValid = !!sessionAfterError?.user?.email
        if (!sessionStillValid) {
          navigate(`${clientPrefix}/forgot-password`, {
            replace: true,
            state: {
              authError: 'Your password reset session has expired. Please enter your email address below to request a new one.'
            }
          })
          return
        }
        
        setError(updateError.message || 'Failed to update password. Please try again.')
        setLoading(false)
        return // Exit early - do not proceed to success
      }

      // Check if Edge Function returned an error in the response data
      if (data?.error) {
        console.error('[ResetPassword] ❌ Edge Function returned error in data:', data.error)
        
        // Check session after data error to determine if we can retry
        const { data: { session: sessionAfterDataError } } = await supabaseClient.auth.getSession()
        const msg = (data.error || '').toLowerCase()
        
        // Handle "same password" error in data response - CRITICAL: Do not proceed to success
        if (msg.includes('same')) {
          const sessionStillValid = !!sessionAfterDataError?.user?.email
          if (!sessionStillValid) {
            navigate(`${clientPrefix}/forgot-password`, {
              replace: true,
              state: {
                authError: 'Your password reset session has expired. Please enter your email address below to request a new one.'
              }
            })
          } else {
            setError('New password cannot be the same as your current password. Please choose a different password.')
          }
          setLoading(false)
          return // Exit early - do not proceed to success
        }
        
        setError(data.error)
        setLoading(false)
        return // Exit early - do not proceed to success
      }

      // Only proceed to success if we have explicit success confirmation
      if (!data?.success) {
        console.error('[ResetPassword] ❌ No success flag in response, treating as error')
        setError('Failed to update password. Please try again.')
        setLoading(false)
        return // Exit early - do not proceed to success
      }

      // Success - password updated and account activated
      debugLog('[ResetPassword] ✅ password reset complete')
      setSuccess('Password reset successfully! Your account has been activated. Redirecting to login...')
      await supabaseClient.auth.signOut()
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: any) {
      console.error('[ResetPassword] ❌ Exception caught:', {
        message: err?.message,
        error: err
      })
      setError(err?.message || 'Failed to reset password. Please try again or request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  const formDisabled = verifying || !email || loading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <AuthBranding size="large" className="mb-6" />

        <Card className="shadow-lg">
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
              {badgeText && (
                <Badge variant="outline" className="text-xs">
                  {badgeText}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {verifying && (
                <Alert>
                  <AlertDescription>Verifying your reset link…</AlertDescription>
                </Alert>
              )}
              {error && !verifying && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {email && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled className="bg-gray-50" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    className="pr-10"
                    placeholder="Enter your new password"
                    disabled={formDisabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={formDisabled}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    className="pr-10"
                    placeholder="Confirm your new password"
                    disabled={formDisabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    disabled={formDisabled}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={formDisabled}>
                {(loading || verifying) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>

              <div className="text-center">
                <Button variant="outline" onClick={() => navigate('/')} className="w-full" disabled={loading}>
                  Back to Login
                </Button>
              </div>
            </form>
            
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ResetPassword