import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against double submission (was a source of false "account exists" errors).
    if (isLoading) return;

    if (password !== confirmPassword) {
      toast({
        title: t("common.error"),
        description: t("auth.signup.passwordMismatch"),
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: t("common.error"),
        description: t("auth.signup.passwordTooShort", "Password must be at least 8 characters."),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Single idempotent server call: creates the account (enforcing the
      // password policy + HIBP) and sends the verification code in one step.
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.code === "already_exists") {
          toast({
            title: t("auth.signup.emailExistsTitle", "This email already has an account"),
            description: t("auth.signup.emailExistsBody", "Try signing in instead. Redirecting you to log in…"),
          });
          navigate("/login", { state: { email } });
          return;
        }
        if (data.code === "weak_password") {
          toast({
            title: t("common.error"),
            description: data.message || t("auth.signup.passwordTooShort", "Please choose a stronger password."),
            variant: "destructive",
          });
          return;
        }
        toast({
          title: t("auth.errors.signupFailed"),
          description: data.message || "Sign up failed",
          variant: "destructive",
        });
        return;
      }

      // Success — store data for the verification page (incl. password for auto-login).
      sessionStorage.setItem("pendingVerificationEmail", email);
      sessionStorage.setItem("pendingVerificationUserId", data.user_id);
      sessionStorage.setItem("pendingVerificationPassword", password);

      toast({
        title: data.code_sent ? t("auth.signup.success", "Account created") : t("common.error"),
        description: data.code_sent
          ? t("auth.signup.successMessage", "We sent a verification code to your email.")
          : t("auth.verify.sendError", "We couldn't send the code — you can resend it on the next screen."),
        variant: data.code_sent ? undefined : "destructive",
      });

      navigate("/verify");
    } catch (err) {
      toast({
        title: t("auth.errors.signupFailed"),
        description: err instanceof Error ? err.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
                {password.length > 0 && (
                  <ul className="space-y-1 pt-1 text-xs">
                    <li className={password.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                      {password.length >= 8 ? "✓" : "•"} {t("auth.signup.req8chars", "At least 8 characters")}
                    </li>
                    <li className="text-muted-foreground">
                      • {t("auth.signup.reqBreach", "Common, leaked passwords are not allowed")}
                    </li>
                  </ul>
                )}
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
