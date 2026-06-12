import { redirect } from "next/navigation";

export default function TransfersRedirect() {
  redirect("/movements?tab=transfer");
}
