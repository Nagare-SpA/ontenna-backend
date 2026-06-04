import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { OntennaLogo } from "./OntennaLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GradientButton } from "./GradientButton";

export function SiteNav() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const links = [
    { to: "/device", label: t("nav.device", "Device") },
    { to: "/app", label: t("nav.app", "App") },
    { to: "/teachers", label: t("nav.teachers", "Teachers") },
    { to: "/schools", label: t("nav.schools", "Schools") },
    { to: "/story", label: t("nav.story", "Story") },
    { to: "/support", label: t("nav.support", "Support") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full hairline-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <nav className="container-site flex h-16 items-center justify-between" aria-label="Primary">
        <Link to="/" aria-label="Ontenna home" className="flex items-center" onClick={() => setOpen(false)}>
          <OntennaLogo size={28} withWordmark />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <Link
            to={authed ? "/dashboard" : "/login"}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
            {authed ? t("nav.account", "Account") : t("nav.signIn", "Sign in")}
          </Link>
          {!authed && (
            <div className="hidden sm:block">
              <GradientButton to="/signup" size="md">{t("nav.signUp", "Sign up")}</GradientButton>
            </div>
          )}
          <button
            type="button"
            className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-[hsl(0_0%_100%/0.06)] lg:hidden"
            aria-label={open ? t("nav.close", "Close") : t("nav.menu", "Menu")}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="lg:hidden">
          <div className="container-site hairline-t py-6">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex h-12 items-center rounded-xl px-4 text-base font-medium ${
                        isActive ? "text-foreground bg-[hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground"
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              {!authed && (
                <GradientButton to="/signup" size="lg" className="w-full" onClick={() => setOpen(false)}>
                  {t("nav.signUp", "Sign up")}
                </GradientButton>
              )}
              <GradientButton
                to={authed ? "/dashboard" : "/login"}
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                {authed ? t("nav.account", "Account") : t("nav.signIn", "Sign in")}
              </GradientButton>
              <div className="sm:hidden"><LanguageSwitcher /></div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}