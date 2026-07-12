/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Eye, RotateCcw } from "lucide-react";
import { ROLE_LABEL, type Role, VIEW_ROLES } from "@/lib/session";
import { stopImpersonation, switchView } from "@/app/login/actions";
import { cn } from "@/lib/utils";

interface ImpersonationBarProps {
  effective: Role;
  isImpersonating: boolean;
}

export function ImpersonationBar({
  effective,
  isImpersonating,
}: ImpersonationBarProps) {
  return (
    <div className="border-b border-brand/30 bg-brand/6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          <Eye className="size-3.5" />
          Plattform-Admin · Sicht
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {VIEW_ROLES.map((role) => (
            <form key={role} action={switchView}>
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                aria-pressed={effective === role}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors",
                  effective === role
                    ? "bg-brand text-brand-fg"
                    : "border border-border bg-bg text-fg hover:border-brand"
                )}
              >
                {ROLE_LABEL[role]}
              </button>
            </form>
          ))}
        </div>

        {isImpersonating && (
          <form action={stopImpersonation} className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-fg transition-colors hover:text-fg"
            >
              <RotateCcw className="size-3" />
              Sicht zurücksetzen
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
