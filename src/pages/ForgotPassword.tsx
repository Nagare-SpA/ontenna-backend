import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/send-password-reset",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, redirectUrl: `${window.location.origin}/reset-password` }),
        }
      );

      if (!response.ok) throw new Error("Failed");
      setIsSubmitted(true);
    } catch {
      toast({ title: t("common.error"), description: t("auth.forgotPassword.sendFailed"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="p-4 flex justify-end"><LanguageSelector /></header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">{t("auth.forgotPassword.checkEmail")}</CardTitle>
              <CardDescription>{t("auth.forgotPassword.emailSent")}<br /><span className="font-medium text-foreground">{email}</span></CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              <p>{t("auth.forgotPassword.didntReceive")}</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>{t("auth.forgotPassword.tryAnother")}</Button>
              <Link to="/login" className="text-sm text-primary hover:underline">{t("auth.forgotPassword.backToLogin")}</Link>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex justify-end"><LanguageSelector /></header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{t("auth.forgotPassword.title")}</CardTitle>
            <CardDescription className="text-center">{t("auth.forgotPassword.subtitle")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.forgotPassword.email")}</Label>
                <Input id="email" type="email" placeholder={t("auth.forgotPassword.emailPlaceholder")} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("auth.forgotPassword.submitting")}</> : t("auth.forgotPassword.submit")}
              </Button>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />{t("auth.forgotPassword.backToLogin")}
              </Link>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
