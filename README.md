# Inventario Açaí Factory

Aplicación web/mobile para control de inventario, movimientos, valorización y reportes — pensada para negocios de alimentos y bebidas (Açaí Factory, frutas, bases, toppings, empaques).

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma** + **SQLite** (fácil de migrar a PostgreSQL)
- **Tailwind CSS** — UI responsive (móvil, tablet, escritorio)
- **JWT** — autenticación con roles (Admin, Manager, Empleado)

## Funciones

- Dashboard con KPIs, alertas y movimientos recientes
- Catálogo de productos por categoría y localidad
- Entradas, salidas, transferencias y ajustes
- Toma de inventario físico con diferencias
- Valorización por costo promedio ponderado
- Reportes filtrables con exportación Excel
- Historial de movimientos (sin borrado, solo reversión)

## Inicio rápido

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Usuarios demo

| Rol      | Correo                    | Contraseña   |
|----------|---------------------------|--------------|
| Admin    | admin@acaifactory.com     | admin123     |
| Manager  | manager@acaifactory.com   | manager123   |
| Empleado | empleado@acaifactory.com  | empleado123  |

## Estructura

```
src/
├── app/
│   ├── (app)/          # Pantallas autenticadas
│   ├── api/            # API REST
│   └── login/
├── components/
│   ├── layout/         # Sidebar, BottomNav
│   ├── ui/             # Componentes base
│   ├── forms/          # Formularios de movimientos
│   └── reports/
└── lib/
    ├── inventory/      # Lógica de stock y valorización
    ├── auth.ts
    └── prisma.ts
```

## Reglas de inventario

1. **Entrada** → aumenta stock y actualiza costo promedio
2. **Salida** → reduce stock
3. **Transferencia** → descuenta origen, suma destino
4. **Ajuste** → corrige stock y deja historial
5. Los movimientos **nunca se borran**; se pueden revertir

## Próximos pasos

- Escaneo de código de barras
- Importación CSV de productos
- Modo oscuro
- Backup automático
- PostgreSQL para producción
