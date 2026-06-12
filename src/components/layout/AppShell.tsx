import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userName={userName} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar />
        <main className="flex-1 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}