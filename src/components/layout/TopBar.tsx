import { GlobalSearch } from "./GlobalSearch";
import { QUICK_ACTIONS } from "@/lib/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <GlobalSearch />
        <div className="hidden items-center gap-2 lg:flex">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button variant="outline" size="sm">
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
