import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex justify-end">
        <LanguageSelector />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-bold">{t("errors.notFound")}</h2>
          <p className="text-muted-foreground">{t("errors.notFoundMessage")}</p>
          <Button asChild>
            <Link to="/">{t("errors.goHome")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
