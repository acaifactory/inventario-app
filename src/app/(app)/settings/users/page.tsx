import { getSession, canManageUsers } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersSettingsClient } from "@/components/settings/UsersSettingsClient";

export default async function UsersSettingsPage() {
  const session = await getSession();
  if (!session || !canManageUsers(session.role)) {
    redirect("/settings");
  }

  return <UsersSettingsClient />;
}
