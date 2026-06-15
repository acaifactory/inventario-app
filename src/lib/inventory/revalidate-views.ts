import { revalidatePath } from "next/cache";

/** Refresca pantallas que leen inventario valorizado en tiempo real. */
export function revalidateInventoryViews() {
  const paths = [
    "/valuation",
    "/dashboard",
    "/finances",
    "/food-cost",
    "/products",
    "/movements",
    "/usage",
    "/reports",
    "/api/valuation",
    "/api/products",
    "/api/movements",
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}
