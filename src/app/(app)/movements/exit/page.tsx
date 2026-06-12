import { redirect } from "next/navigation";

export default function ExitRedirect() {
  redirect("/movements?tab=exit");
}
