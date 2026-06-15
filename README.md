# Inventario Açaí Factory

Aplicación web/mobile para **controlar compras, inventario, uso y food cost** — saber cuánto te cuesta en $ la mercancía que usas para vender en un período (semana, mes, etc.).

**Producción:** https://inventario-app-blond-eight.vercel.app

## Objetivo del negocio

1. **Registrar compras** (facturas con empaque y conversión a unidad base)
2. **Controlar inventario** (conteo físico, transferencias, valorización)
3. **Registrar uso** (salidas por venta, desperdicio, etc.)
4. **Calcular Food Cost** = costo de mercancía usada ÷ ventas del período

## Rutina semanal recomendada

| Día | Acción |
|-----|--------|
| Cuando llegan facturas | **Compras** → registrar con unidad y factor |
| Al preparar/vender | **Salidas** → motivo *Venta* |
| Fin de semana | **Conteo físico** (opcional pero mejora precisión) |
| Fin de semana | **Food Cost** → fechas + ventas en $ → *Guardar período analizado* |
| Revisión | **Uso** y **Dashboard** → consumo y sugerencias de compra |

## Stack

- **Next.js 16** + **TypeScript** + **Tailwind CSS**
- **Prisma** + **PostgreSQL** (Neon en producción)
- **Vercel** (hosting)
- **JWT** + roles (Admin, Manager, Empleado)

## Módulos principales

| Módulo | Ruta | Para qué |
|--------|------|----------|
| Compras / facturas | `/purchases` | Entrada de mercancía + costo real |
| Salidas | `/movements/exit` | Uso / venta de producto |
| Conteo físico | `/physical-count` | Inventario real vs sistema |
| Uso y consumo | `/usage` | $ y cantidad usada por período |
| Food Cost | `/food-cost` | Full Cost % vs ventas |
| Valorización | `/valuation` | Inventario en $ (unidad base) |
| Reportes | `/reports` | Exportar compras, uso, costos |

## Inicio local

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Abre http://localhost:3000

### Usuarios demo

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Admin | admin@acaifactory.com | admin123 |
| Manager | manager@acaifactory.com | manager123 |
| Empleado | empleado@acaifactory.com | empleado123 |

## Publicar (GitHub + Vercel)

```powershell
cd c:\Users\onixo\inventario-app
gh auth login
.\scripts\publish-github-vercel.ps1
```

Repositorio: `https://github.com/acaifactory/inventario-app`

## Variables de entorno (producción)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL (Neon) |
| `JWT_SECRET` | Sesiones |
| `APP_URL` | URL pública de la app |
| `RESEND_API_KEY` | Emails (reset contraseña) |
| `EMAIL_FROM` | Remitente de emails |

## Reglas de inventario

Todas las áreas usan el **mismo idioma de unidades**: cantidad × factor → unidad base del producto.

1. **Compra** → aumenta stock y actualiza costo promedio
2. **Salida** → reduce stock y registra uso en $
3. **Transferencia** → mueve stock entre tiendas
4. **Conteo físico** → ajusta diferencias
5. Los movimientos **no se borran**; se pueden revertir
