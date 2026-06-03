import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { languages } from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = languages.find((l) => l.code === i18n.resolvedLanguage)?.name ?? "English";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("nav.language", "Language")}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] glass">
        {languages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => i18n.changeLanguage(l.code)}
            className={l.code === i18n.resolvedLanguage ? "text-primary" : ""}
          >
            <span className="mr-2">{l.flag}</span> {l.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}