import { getSession, canManageCatalog } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CategoriesSettingsClient } from "@/components/settings/CategoriesSettingsClient";

export default async function CategoriesSettingsPage() {
  const session = await getSession();
  if (!session || !canManageCatalog(session.role)) {
    redirect("/settings");
  }

  return <CategoriesSettingsClient />;
}
