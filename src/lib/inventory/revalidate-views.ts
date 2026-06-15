import { revalidatePath } from "next/cache";

/** Refresca pantallas que leen inventario valorizado en tiempo real. */
export function revalidateInventoryViews() {
  revalidatePath("/valuation");
  revalidatePath("/dashboard");
  revalidatePath("/finances");
  revalidatePath("/food-cost");
  revalidatePath("/api/valuation");
}
