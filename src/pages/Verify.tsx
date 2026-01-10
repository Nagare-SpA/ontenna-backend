import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, RefreshCw } from "lucide-react";

export default function Verify() {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, isVerified, verifyCode, sendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else if (isVerified) {
      navigate("/");
    }
  }, [user, isVerified, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    const { error } = await verifyCode(code);

    if (error) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      setIsVerifying(false);
      return;
    }

    toast({
      title: "Email verified!",
      description: "Your account has been verified successfully.",
    });

    navigate("/");
  };

  const handleResend = async () => {
    setIsResending(true);

    const { error } = await sendVerificationCode();

    if (error) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Code sent",
        description: "A new verification code has been sent to your email.",
      });
      setCountdown(60);
    }

    setIsResending(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            We sent a verification code to<br />
            <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
            >
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
          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={isVerifying || code.length !== 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify email"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground text-center">
            Didn't receive the code?
          </p>
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={isResending || countdown > 0}
            className="gap-2"
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Resend code
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
