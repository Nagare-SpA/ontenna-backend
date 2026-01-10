import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Index() {
  const { t } = useTranslation();
  const { user, isVerified } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("common.appName")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {user ? (
              <Button asChild>
                <Link to={isVerified ? "/dashboard" : "/verify"}>{t("nav.dashboard")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">{t("landing.login")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">{t("landing.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("landing.description")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/signup">{t("landing.signup")}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">{t("landing.login")}</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
