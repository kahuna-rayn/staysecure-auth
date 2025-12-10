import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import raynLogo from '@/assets/rayn-logo.png'

const isStrongPassword = (pwd: string) => {
  const hasLowercase = /[a-z]/.test(pwd)
  const hasUppercase = /[A-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(pwd)
  return pwd.length >= 12 && hasLowercase && hasUppercase && hasDigit && hasSpecial
}

const ResetPassword: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { supabaseClient } = useAuth()

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
    const { data: sub } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email) {
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

        // Dev-only debug (avoid logging tokens in prod)
        if (import.meta.env.MODE === 'development') {
          // eslint-disable-next-line no-console
          console.log('ResetPassword debug:', {
            type,
            token_hash: !!tokenHash,
            access_token: hasAccessToken,
          })
        }

        // If "recovery" but no token present, likely email scanner burned the link
        if (type === 'recovery' && !tokenHash && !hasAccessToken) {
          setError('This password reset link may have been opened already by an email scanner. Please request a new link and open it only once.')
          setVerifying(false)
          return
        }

        // token_hash flow
        if (tokenHash && type === 'recovery') {
          const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (verifyError) {
            setError('Invalid or expired password reset link. Please request a new one.')
            setVerifying(false)
            return
          }
          if (data.user?.email) {
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
              setEmail(session.user.email)
              clearRecoveryParams()
              setVerifying(false)
              return
            }
            await new Promise((r) => setTimeout(r, delay))
          }
          // Timed out
          setError('Unable to verify password reset link. Please request a new link.')
          setVerifying(false)
          return
        }

        // Existing session (e.g., page refresh)
        const { data: { session: existing } } = await supabaseClient.auth.getSession()
        if (existing?.user?.email) {
          setEmail(existing.user.email)
        } else {
          // No session and no valid params — user can still enter password after manual verify, but we keep form disabled until email available
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character')
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
        throw new Error('Your password reset session has expired. Please request a new reset link.')
      }

      const { error: updateError } = await supabaseClient.auth.updateUser({ password })
      if (updateError) {
        // Handle common statuses and messages
        const msg = (updateError.message || '').toLowerCase()
        // @ts-expect-error - status exists on AuthApiError
        const status = (updateError as any)?.status as number | undefined

        if (status === 401 || status === 410 || msg.includes('expired') || msg.includes('invalid') || msg.includes('session')) {
          throw new Error('Your password reset link has expired or was already used. Please request a new link.')
        }
        if (msg.includes('weak') || (msg.includes('password') && msg.includes('strong'))) {
          throw new Error('Password is too weak. Please use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.')
        }
        if (msg.includes('same')) {
          throw new Error('New password cannot be the same as your current password. Please choose a different password.')
        }
        throw new Error(updateError.message || 'Failed to update password. Please try again.')
      }

      setSuccess('Password reset successfully! Redirecting to login...')
      await supabaseClient.auth.signOut()
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again or request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  const formDisabled = verifying || !email || loading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-6">
          <img src={raynLogo} alt="RAYN Secure Logo" className="mx-auto h-12 w-auto mb-2" />
          <h1 className="text-xl font-semibold text-gray-800">RAYN Secure</h1>
          <p className="text-sm text-gray-600">Get Secure, Stay Secure!</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
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
                    onChange={(e) => setPassword(e.target.value)}
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
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