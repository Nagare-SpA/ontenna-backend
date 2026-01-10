import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Shield, Users } from "lucide-react";

export default function AdminHome() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("admin.title")}</h1>
          <LanguageSelector />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="font-medium">{t("admin.accessEnabled")}</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{t("admin.usersTitle")}</CardTitle>
            <CardDescription>{t("admin.usersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t("admin.placeholder")}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
