import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
      setIsChecking(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsValidSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("auth.resetPassword.passwordMismatch"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("common.error"), description: t("auth.resetPassword.passwordTooShort"), variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
  };

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="p-4 flex justify-end"><LanguageSelector /></header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">{t("auth.resetPassword.invalidLink")}</CardTitle>
              <CardDescription>{t("auth.resetPassword.invalidLinkMessage")}</CardDescription>
            </CardHeader>
            <CardFooter><Button className="w-full" onClick={() => navigate("/forgot-password")}>{t("auth.resetPassword.requestNewLink")}</Button></CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="p-4 flex justify-end"><LanguageSelector /></header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-500" /></div>
              <CardTitle className="text-2xl font-bold">{t("auth.resetPassword.success")}</CardTitle>
              <CardDescription>{t("auth.resetPassword.successMessage")}</CardDescription>
            </CardHeader>
            <CardFooter><Button className="w-full" onClick={() => navigate("/dashboard")}>{t("auth.resetPassword.continueToApp")}</Button></CardFooter>
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
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><Lock className="w-6 h-6 text-primary" /></div>
            <CardTitle className="text-2xl font-bold">{t("auth.resetPassword.title")}</CardTitle>
            <CardDescription>{t("auth.resetPassword.subtitle")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.resetPassword.newPassword")}</Label>
                <Input id="password" type="password" placeholder={t("auth.resetPassword.passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.resetPassword.confirmPassword")}</Label>
                <Input id="confirmPassword" type="password" placeholder={t("auth.resetPassword.passwordPlaceholder")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("auth.resetPassword.submitting")}</> : t("auth.resetPassword.submit")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
