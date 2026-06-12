import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROLES } from "@/lib/constants";
import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { Settings, Store, MapPin, Tags, Users } from "lucide-react";

const LINKS = [
  { href: "/settings/users", label: "Usuarios", icon: Users },
  { href: "/settings/stores", label: "Tiendas / Franquicias", icon: Store },
  { href: "/settings/locations", label: "Localidades", icon: MapPin },
  { href: "/settings/categories", label: "Categorías", icon: Tags },
  { href: "/purchases/suppliers", label: "Proveedores / Distribuidores", icon: Tags },
  { href: "/settings/products", label: "Normalizar catálogo", icon: Tags },
];

export default async function SettingsPage() {
  const session = await getSession();
  const roleLabel =
    ROLES.find((r) => r.value === session?.role)?.label ?? session?.role;

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Usuarios, tiendas, localidades y parámetros"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="flex items-center gap-3 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-slate-900">
                  {link.label}
                </span>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mi cuenta
            </CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-slate-500">Nombre: </span>
              {session?.name}
            </p>
            <p>
              <span className="text-slate-500">Correo: </span>
              {session?.email}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-slate-500">Rol: </span>
              <Badge variant="info">{roleLabel}</Badge>
            </p>
            <p className="pt-2">
              <Link
                href="/login/forgot"
                className="text-sm text-violet-600 hover:text-violet-700"
              >
                ¿Olvidaste tu contraseña? Recuperar por correo
              </Link>
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Roles
            </CardTitle>
          </CardHeader>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <strong>Admin:</strong> acceso completo
            </li>
            <li>
              <strong>Manager:</strong> movimientos y reportes
            </li>
            <li>
              <strong>Empleado:</strong> conteo y movimientos básicos
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-6 max-w-lg">
        <ChangePasswordCard />
      </div>
    </div>
  );
}
