import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';
import AuthBranding from './AuthBranding';
import { debugLog } from '../utils/debugLog';

interface MFAChallengeProps {
  supabaseClient: any;
  onSuccess: () => void;
  onCancel?: () => void;
}

const MFAChallenge: React.FC<MFAChallengeProps> = ({ supabaseClient, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    debugLog('[MFAChallenge] mounted');
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    debugLog('[MFAChallenge] verifying code...');

    try {
      const { data: factorsData, error: factorsError } = await supabaseClient.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      debugLog('[MFAChallenge] factors', factorsData);

      const totpFactor = factorsData?.totp?.[0];
      if (!totpFactor) throw new Error('No TOTP factor found.');
      debugLog('[MFAChallenge] using factor', totpFactor.id);

      const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;
      debugLog('[MFAChallenge] challenge created', challengeData.id);

      const { error: verifyError } = await supabaseClient.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      debugLog('[MFAChallenge] verify success → calling onSuccess');
      onSuccess();
    } catch (err: any) {
      const msg = err?.message ?? 'Verification failed.';
      debugLog('[MFAChallenge] verify error', msg);
      setError(
        msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('token')
          ? 'Incorrect code. Check your authenticator app and try again.'
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
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="mfa-code">Authenticator Code</Label>
              <Input
                id="mfa-code"
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
              Verify
            </Button>

            {onCancel && (
              <div className="text-center">
                <Button variant="link" type="button" onClick={onCancel} disabled={loading}>
                  Back to sign in
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MFAChallenge;
