import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Verify() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, isVerified, verifyCode, sendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get pending verification data from sessionStorage (for users who just signed up)
  const pendingEmail = sessionStorage.getItem("pendingVerificationEmail");
  const pendingUserId = sessionStorage.getItem("pendingVerificationUserId");

  // Use user data if logged in, otherwise use pending data
  const displayEmail = user?.email || pendingEmail;
  const currentUserId = user?.id || pendingUserId;

  useEffect(() => {
    // If user is logged in and verified, redirect to dashboard
    if (user && isVerified) {
      sessionStorage.removeItem("pendingVerificationEmail");
      sessionStorage.removeItem("pendingVerificationUserId");
      navigate("/dashboard");
    }
    // If no user and no pending verification data, redirect to login
    if (!user && !pendingUserId) {
      navigate("/login");
    }
  }, [user, isVerified, pendingUserId, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({ title: t("common.error"), description: t("auth.verify.invalidCode"), variant: "destructive" });
      return;
    }

    if (!currentUserId) {
      toast({ title: t("common.error"), description: t("auth.verify.noUser"), variant: "destructive" });
      return;
    }

    setIsVerifying(true);

    try {
      // Call verify-code edge function directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/verify-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            userId: currentUserId,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ 
          title: t("auth.errors.verificationFailed"), 
          description: data.error || t("auth.verify.invalidCode"), 
          variant: "destructive" 
        });
        setIsVerifying(false);
        return;
      }

      // Clear pending verification data
      sessionStorage.removeItem("pendingVerificationEmail");
      sessionStorage.removeItem("pendingVerificationUserId");

      toast({ title: t("auth.verify.success"), description: t("auth.verify.successMessage") });
      
      // Redirect to login so user can sign in with their verified account
      navigate("/login");
    } catch (error: any) {
      toast({ 
        title: t("auth.errors.verificationFailed"), 
        description: error.message, 
        variant: "destructive" 
      });
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!currentUserId || !displayEmail) {
      toast({ title: t("auth.verify.resendFailed"), description: t("auth.verify.noUser"), variant: "destructive" });
      return;
    }

    setIsResending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-verification-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
          },
          body: JSON.stringify({
            userId: currentUserId,
            email: displayEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ title: t("auth.verify.resendFailed"), description: data.error, variant: "destructive" });
      } else {
        toast({ title: t("auth.verify.codeSent"), description: t("auth.verify.codeSentMessage") });
        setCountdown(60);
      }
    } catch (error: any) {
      toast({ title: t("auth.verify.resendFailed"), description: error.message, variant: "destructive" });
    }
    
    setIsResending(false);
  };

  if (!displayEmail && !currentUserId) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex justify-end">
        <LanguageSelector />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("auth.verify.title")}</CardTitle>
            <CardDescription>
              {t("auth.verify.subtitle")}<br />
              <span className="font-medium text-foreground">{displayEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerify} className="w-full" disabled={isVerifying || code.length !== 6}>
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.verify.submitting")}
                </>
              ) : (
                t("auth.verify.submit")
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center">{t("auth.verify.didntReceive")}</p>
            <Button variant="ghost" onClick={handleResend} disabled={isResending || countdown > 0} className="gap-2">
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("auth.verify.resending")}
                </>
              ) : countdown > 0 ? (
                t("auth.verify.resendIn", { seconds: countdown })
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t("auth.verify.resend")}
                </>
              )}
            </Button>
            <Link to="/login" className="text-sm text-primary hover:underline">
              {t("auth.verify.backToLogin")}
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}