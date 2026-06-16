import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, AudioLines, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { OntennaLogo } from "./OntennaLogo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { GradientButton } from "./GradientButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Teachers + Schools grouped under a "School" menu.
  const schoolItems = [
    { to: "/teachers", label: t("nav.teachers", "Teachers") },
    { to: "/schools", label: t("nav.schools", "Schools") },
  ];
  const linksBefore = [
    { to: "/device", label: t("nav.device", "Device") },
    { to: "/app", label: t("nav.app", "App") },
  ];
  const linksAfter = [
    { to: "/story", label: t("nav.story", "Story") },
    { to: "/support", label: t("nav.support", "Support") },
  ];
  const schoolActive = schoolItems.some((s) => location.pathname.startsWith(s.to));

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors ${
      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full hairline-b bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <nav className="container-site flex h-16 items-center justify-between gap-2" aria-label="Primary">
        <Link to="/" aria-label="Ontenna home" className="flex shrink-0 items-center" onClick={() => setOpen(false)}>
          <OntennaLogo size={28} withWordmark />
        </Link>

        <ul className="hidden items-center gap-0.5 xl:flex">
          <li>
            <NavLink
              to="/symphony"
              className={({ isActive }) =>
                `inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-primary/60 bg-gradient-brand-soft text-foreground"
                    : "border-[hsl(0_0%_100%/0.12)] text-foreground hover:border-primary/60"
                }`
              }
            >
              <AudioLines className="h-4 w-4 text-primary" />
              <span className="text-gradient">Symphony</span>
            </NavLink>
          </li>
          {linksBefore.map((l) => (
            <li key={l.to}><NavLink to={l.to} className={linkClass}>{l.label}</NavLink></li>
          ))}
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-full px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  schoolActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("nav.school", "School")}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px] glass">
                {schoolItems.map((s) => (
                  <DropdownMenuItem key={s.to} onSelect={() => navigate(s.to)}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
          {linksAfter.map((l) => (
            <li key={l.to}><NavLink to={l.to} className={linkClass}>{l.label}</NavLink></li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1">
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <Link
            to={authed ? "/dashboard" : "/login"}
            className="hidden sm:inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
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
            className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-[hsl(0_0%_100%/0.06)] xl:hidden"
            aria-label={open ? t("nav.close", "Close") : t("nav.menu", "Menu")}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="xl:hidden">
          <div className="container-site hairline-t py-6">
            <ul className="flex flex-col gap-1">
              <li>
                <NavLink
                  to="/symphony"
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center gap-2 rounded-xl border border-primary/40 bg-gradient-brand-soft px-4 text-base font-semibold"
                >
                  <AudioLines className="h-5 w-5 text-primary" />
                  <span className="text-gradient">Symphony</span>
                </NavLink>
              </li>
              {linksBefore.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} onClick={() => setOpen(false)} className={mobileLinkClass}>{l.label}</NavLink>
                </li>
              ))}
              {/* School group */}
              <li className="mt-2 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--tertiary-foreground))]">
                {t("nav.school", "School")}
              </li>
              {schoolItems.map((s) => (
                <li key={s.to}>
                  <NavLink to={s.to} onClick={() => setOpen(false)} className={mobileLinkClass}>{s.label}</NavLink>
                </li>
              ))}
              <li className="mt-2 h-px bg-[hsl(var(--border))]" aria-hidden="true" />
              {linksAfter.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} onClick={() => setOpen(false)} className={mobileLinkClass}>{l.label}</NavLink>
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

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-12 items-center rounded-xl px-4 text-base font-medium ${
    isActive ? "text-foreground bg-[hsl(0_0%_100%/0.05)]" : "text-muted-foreground hover:text-foreground"
  }`;
