import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { logout } from "@/app/login/actions";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import type { Role } from "@/lib/session";

interface RoleStubProps {
  role: string;
  user: { name: string; subtitle: string };
  features: string[];
  shipsIn: string;
  showImpersonationBar?: boolean;
  effective?: Role;
  isImpersonating?: boolean;
}

export function RoleStub({
  role,
  user,
  features,
  shipsIn,
  showImpersonationBar = false,
  effective,
  isImpersonating = false,
}: RoleStubProps) {
  return (
    <main className="flex min-h-screen flex-col">
      {showImpersonationBar && effective && (
        <ImpersonationBar
          effective={effective}
          isImpersonating={isImpersonating}
        />
      )}

      <div className="grid flex-1 place-items-center bg-surface px-6 py-10">
        <div className="w-full max-w-xl border border-border bg-bg p-10">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold tracking-tight"
            >
              <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
                MM
              </span>
              <span>MasterMind</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-fg">
              Eingeloggt als {role}
            </span>
          </div>

          <div className="mt-10 flex items-center gap-3 border-l-2 border-brand pl-4">
            <Construction className="size-5 text-brand" strokeWidth={1.75} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              In Entwicklung · {shipsIn}
            </p>
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Hi {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 text-sm text-muted-fg">
            Dein {role}-Dashboard wird gerade gebaut. Diese Module sind geplant:
          </p>

          <ul className="mt-6 space-y-2 border-y border-border py-5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="size-1.5 shrink-0 bg-brand" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className={`${buttonVariants({ variant: "outline", size: "md" })} flex-1`}
            >
              <ArrowLeft className="size-4" />
              Zur Startseite
            </Link>
            <form action={logout} className="flex-1">
              <Button type="submit" variant="ghost" size="md" className="w-full">
                Abmelden
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
