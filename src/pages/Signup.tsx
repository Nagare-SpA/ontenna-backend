import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Signup() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sendVerificationCodeDirect = async (userId: string, userEmail: string, userFirstName: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-verification-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            userId,
            email: userEmail,
            firstName: userFirstName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Error sending verification code:", data.error);
        return { error: new Error(data.error || "Failed to send code") };
      }

      return { error: null };
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      return { error };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("auth.signup.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t("common.error"),
        description: t("auth.signup.passwordTooShort"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { user, error } = await signUp(email, password, firstName, lastName);

    if (error) {
      toast({
        title: t("auth.errors.signupFailed"),
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (user) {
      // Send verification code directly with user data from signup response
      const { error: codeError } = await sendVerificationCodeDirect(user.id, email, firstName);
      
      if (codeError) {
        console.error("Error sending verification code:", codeError);
        toast({
          title: t("common.error"),
          description: t("auth.verify.sendError"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("auth.signup.success"),
          description: t("auth.signup.successMessage"),
        });
      }

      // Store email in sessionStorage for verification page
      sessionStorage.setItem("pendingVerificationEmail", email);
      sessionStorage.setItem("pendingVerificationUserId", user.id);
      
      navigate("/verify");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex justify-end">
        <LanguageSelector />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{t("auth.signup.title")}</CardTitle>
            <CardDescription className="text-center">{t("auth.signup.subtitle")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("auth.signup.firstName")}</Label>
                  <Input
                    id="firstName"
                    placeholder={t("auth.signup.firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("auth.signup.lastName")}</Label>
                  <Input
                    id="lastName"
                    placeholder={t("auth.signup.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.signup.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.signup.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.signup.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.signup.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.signup.passwordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.signup.submitting")}
                  </>
                ) : (
                  t("auth.signup.submit")
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                {t("auth.signup.hasAccount")}{" "}
                <Link to="/login" className="text-primary hover:underline">
                  {t("auth.signup.login")}
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
