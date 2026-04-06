import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Copy, Check } from 'lucide-react';
import AuthBranding from './AuthBranding';
import { debugLog } from '../utils/debugLog';

interface MFAEnrollmentProps {
  supabaseClient: any;
  /** Called when enrollment + first verification succeed — user is now aal2. */
  onSuccess: () => void;
  /** If provided, show a "Skip for now" link (for optional enrollment). */
  onSkip?: () => void;
  /** Whether enrollment is mandatory (hides skip, shows blocking message). */
  required?: boolean;
}

type Step = 'qr' | 'verify';

const MFAEnrollment: React.FC<MFAEnrollmentProps> = ({
  supabaseClient,
  onSuccess,
  onSkip,
  required = false,
}) => {
  const [step, setStep] = useState<Step>('qr');
  const [factorId, setFactorId] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enroll a new TOTP factor on mount — reuse any existing unverified factor
  // rather than calling enroll() again (Supabase rejects a second pending factor).
  useEffect(() => {
    debugLog('[MFAEnrollment] mounted', { required });
    let cancelled = false;
    const enroll = async () => {
      setLoading(true);
      setError(null);
      try {
        // Check for an existing unverified (pending) TOTP factor first.
        const { data: factorsData } = await supabaseClient.auth.mfa.listFactors();
        debugLog('[MFAEnrollment] existing factors', factorsData);
        const pending = factorsData?.totp?.find((f: any) => f.status === 'unverified');

        if (pending) {
          // Reuse the pending factor — but we can't retrieve the QR code again
          // from Supabase after initial enroll(), so unenroll and re-enroll.
          debugLog('[MFAEnrollment] unverified factor found, unenrolling to get fresh QR', pending.id);
          await supabaseClient.auth.mfa.unenroll({ factorId: pending.id });
        }

        debugLog('[MFAEnrollment] calling mfa.enroll...');
        const { data, error: enrollError } = await supabaseClient.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Authenticator App',
        });
        if (enrollError) throw enrollError;
        debugLog('[MFAEnrollment] enroll success, factorId:', data.id);
        if (!cancelled) {
          setFactorId(data.id);
          setQrCode(data.totp.qr_code);
          setSecret(data.totp.secret);
        }
      } catch (err: any) {
        debugLog('[MFAEnrollment] enroll error', err?.message);
        if (!cancelled) setError(err?.message ?? 'Could not start enrollment. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    enroll();
    return () => { cancelled = true; };
  }, [supabaseClient]);

  useEffect(() => {
    if (step === 'verify') inputRef.current?.focus();
  }, [step]);

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    debugLog('[MFAEnrollment] verifying enrollment code for factorId', factorId);

    try {
      const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;
      debugLog('[MFAEnrollment] challenge created', challengeData.id);

      const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      // Sync the legacy profiles flag so the UI can reflect MFA status.
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user?.id) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ two_factor_enabled: true })
          .eq('id', user.id);
        if (profileError) {
          debugLog('[MFAEnrollment] warning: could not set two_factor_enabled on profile', profileError.message);
        } else {
          debugLog('[MFAEnrollment] profiles.two_factor_enabled set to true');
        }
      }

      debugLog('[MFAEnrollment] enrollment verified → calling onSuccess');
      onSuccess();
    } catch (err: any) {
      const msg = err?.message ?? 'Verification failed.';
      debugLog('[MFAEnrollment] verify error', msg);
      setError(
        msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('token')
          ? 'Incorrect code. Make sure your device clock is accurate and try again.'
          : msg
      );
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <AuthBranding size="large" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            {required
              ? 'Your account requires two-factor authentication. Set it up to continue.'
              : 'Add an extra layer of security to your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'qr' && (
            <div className="space-y-5">
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Install an authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
                <li>Scan the QR code below, or enter the secret key manually</li>
                <li>Click <strong>Next</strong> to verify the setup</li>
              </ol>

              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {qrCode && !loading && (
                <div className="flex flex-col items-center gap-4">
                  <div className="border rounded-lg p-3 bg-white">
                    <img src={qrCode} alt="MFA QR code" className="w-48 h-48" />
                  </div>

                  {secret && (
                    <div className="w-full space-y-1">
                      <Label className="text-xs text-muted-foreground">Or enter the key manually:</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono tracking-wider break-all">
                          {secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copySecret}
                          className="shrink-0"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={!qrCode || loading}
                  onClick={() => setStep('verify')}
                >
                  Next — Enter Code
                </Button>
                {!required && onSkip && (
                  <Button variant="outline" type="button" onClick={onSkip} disabled={loading}>
                    Skip for now
                  </Button>
                )}
              </div>
            </div>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>

              <div className="space-y-2">
                <Label htmlFor="enroll-code">Authenticator Code</Label>
                <Input
                  id="enroll-code"
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest font-mono"
                  autoComplete="one-time-code"
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Enable 2FA
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  type="button"
                  onClick={() => { setStep('qr'); setCode(''); setError(null); }}
                  disabled={loading}
                >
                  Back to QR code
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAEnrollment;
