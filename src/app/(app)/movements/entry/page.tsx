import { redirect } from "next/navigation";

export default function EntryRedirect() {
  redirect("/movements?tab=entry");
}
