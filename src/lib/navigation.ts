import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Receipt,
  ArrowLeftRight,
  PieChart,
  FileBarChart,
  Settings,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpFromLine,
  HandCoins,
  SlidersHorizontal,
  ClipboardList,
  History,
  DollarSign,
  TrendingUp,
  Shield,
  Store,
  MapPin,
  Truck,
  Tags,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Menú principal — orden operacional diario */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    items: [
      {
        href: "/dashboard",
        label: "Resumen",
        icon: LayoutDashboard,
        description: "Vista ejecutiva del negocio",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventario",
    items: [
      { href: "/products", label: "Productos", icon: Package },
      { href: "/adjustments", label: "Ajustes", icon: SlidersHorizontal },
      { href: "/physical-count", label: "Conteos físicos", icon: ClipboardList },
      { href: "/audit", label: "Historial", icon: History },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    items: [
      { href: "/purchases", label: "Facturas", icon: Receipt },
      { href: "/purchases/suppliers", label: "Proveedores / Distribuidores", icon: Truck },
    ],
  },
  {
    id: "movements",
    label: "Movimientos",
    items: [
      { href: "/movements", label: "Centro de movimientos", icon: ArrowLeftRight },
      { href: "/movements?tab=entry", label: "Entradas", icon: ArrowDownToLine },
      { href: "/movements?tab=exit", label: "Salidas", icon: ArrowUpFromLine },
      { href: "/movements?tab=transfer", label: "Transferencias", icon: ArrowLeftRight },
      { href: "/loans", label: "Préstamos", icon: HandCoins },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    items: [
      { href: "/finances", label: "Panel financiero", icon: PieChart },
      { href: "/food-cost", label: "Food Cost / Full Cost", icon: TrendingUp },
      { href: "/valuation", label: "Valorización", icon: DollarSign },
    ],
  },
  {
    id: "reports",
    label: "Reportes",
    items: [
      { href: "/reports", label: "Reportes", icon: FileBarChart },
    ],
  },
  {
    id: "settings",
    label: "Configuración",
    items: [
      { href: "/settings", label: "General", icon: Settings },
      { href: "/settings/users", label: "Usuarios", icon: Users },
      { href: "/settings/stores", label: "Tiendas / Franquicias", icon: Store },
      { href: "/settings/locations", label: "Localidades", icon: MapPin },
      { href: "/settings/categories", label: "Categorías", icon: Tags },
      { href: "/settings/products", label: "Normalizar catálogo", icon: Tags },
    ],
  },
];

export const QUICK_ACTIONS = [
  { href: "/purchases", label: "Registrar compra", icon: ShoppingCart },
  { href: "/movements?tab=exit", label: "Registrar salida", icon: ArrowUpFromLine },
  { href: "/movements?tab=transfer", label: "Transferir", icon: ArrowLeftRight },
  { href: "/food-cost", label: "Ver Food Cost", icon: PieChart },
] as const;

export const BOTTOM_NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/purchases", label: "Compras", icon: Receipt },
  { href: "/movements", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/products", label: "Productos", icon: Package },
  { href: "/finances", label: "Finanzas", icon: PieChart },
] as const;

/** Rutas legacy → redirigen al nuevo flujo */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/movements/entry": "/movements?tab=entry",
  "/movements/exit": "/movements?tab=exit",
  "/usage": "/dashboard",
  "/transfers": "/movements?tab=transfer",
};

export function isNavActive(pathname: string, href: string) {
  const base = href.split("?")[0];
  if (base === "/dashboard") return pathname === "/dashboard";
  return pathname === base || pathname.startsWith(`${base}/`);
}
