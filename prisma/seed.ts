import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIES } from "../src/lib/constants";
import { ACAI_FACTORY_CATALOG } from "../src/lib/catalog/acaifactory-catalog";
import { defaultCountUnitsForBase } from "../src/lib/catalog/default-count-units";
import { normalizeAllProductNames } from "../src/lib/products/normalize";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@acaifactory.com" },
    update: {},
    create: {
      email: "admin@acaifactory.com",
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@acaifactory.com" },
    update: {},
    create: {
      email: "manager@acaifactory.com",
      name: "Manager",
      passwordHash: await bcrypt.hash("manager123", 12),
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "empleado@acaifactory.com" },
    update: {},
    create: {
      email: "empleado@acaifactory.com",
      name: "Empleado",
      passwordHash: await bcrypt.hash("empleado123", 12),
      role: "EMPLOYEE",
    },
  });

  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug },
    });
  }

  const store = await prisma.store.upsert({
    where: { code: "AF-PR-001" },
    update: { name: "Açaí Factory — Principal" },
    create: {
      name: "Açaí Factory — Principal",
      code: "AF-PR-001",
      type: "OWNED",
      address: "Puerto Rico",
      city: "Bayamón",
    },
  });

  const locationDefs = [
    { name: "Cocina", description: "Prep y línea de bowls" },
    { name: "Freezer", description: "Bases congeladas" },
    { name: "Almacén seco", description: "Toppings, empaques, seco" },
    { name: "Mostrador", description: "Bebidas y empaques frente" },
  ];

  const locations = [];
  for (const loc of locationDefs) {
    const orphan = await prisma.location.findFirst({
      where: { name: loc.name, storeId: null },
    });

    const location = orphan
      ? await prisma.location.update({
          where: { id: orphan.id },
          data: { storeId: store.id, description: loc.description },
        })
      : await prisma.location.upsert({
          where: {
            storeId_name: { storeId: store.id, name: loc.name },
          },
          update: { description: loc.description },
          create: {
            name: loc.name,
            description: loc.description,
            storeId: store.id,
          },
        });

    locations.push(location);
  }

  const supplierNames = [
    "Distribuidora Tropical",
    "Empaques del Norte",
    "Frutas Frescas SA",
    "Suministros Limpieza PR",
  ];

  const suppliers = await Promise.all(
    supplierNames.map((name) =>
      prisma.supplier.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const supplierByName = Object.fromEntries(suppliers.map((s) => [s.name, s.id]));
  const categories = await prisma.category.findMany();
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const cocina = locations.find((l) => l.name === "Cocina")!;
  const freezer = locations.find((l) => l.name === "Freezer")!;
  const almacen = locations.find((l) => l.name === "Almacén seco")!;
  const mostrador = locations.find((l) => l.name === "Mostrador")!;

  function defaultLocationFor(slug: string) {
    if (slug === "bases-sorbetes") return freezer.id;
    if (slug === "frutas") return cocina.id;
    if (slug === "empaques") return mostrador.id;
    if (slug === "limpieza" || slug === "operativos") return almacen.id;
    return almacen.id;
  }

  for (const item of ACAI_FACTORY_CATALOG) {
    const categoryId = categoryBySlug[item.categorySlug];
    if (!categoryId) {
      console.warn(`Categoría no encontrada: ${item.categorySlug}`);
      continue;
    }

    const existing = await prisma.product.findFirst({
      where: { sku: item.sku },
    });

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: item.name,
            categoryId,
            subcategory: item.subcategory,
            financialClassification: item.financialClassification,
            includeInFoodCost: item.includeInFoodCost ?? true,
            unit: item.unit,
            minQuantity: item.minQuantity,
            averageCost: item.averageCost,
            notes: item.notes ?? null,
            supplierId: item.supplier ? supplierByName[item.supplier] : null,
            active: true,
          },
        })
      : await prisma.product.create({
          data: {
            name: item.name,
            categoryId,
            subcategory: item.subcategory,
            financialClassification: item.financialClassification,
            includeInFoodCost: item.includeInFoodCost ?? true,
            unit: item.unit,
            sku: item.sku,
            minQuantity: item.minQuantity,
            averageCost: item.averageCost,
            notes: item.notes ?? null,
            supplierId: item.supplier ? supplierByName[item.supplier] : null,
          },
        });

    await prisma.productUnit.upsert({
      where: {
        productId_unit: { productId: product.id, unit: item.unit },
      },
      create: {
        productId: product.id,
        unit: item.unit,
        conversionFactor: 1,
      },
      update: {},
    });

    if (item.countUnits?.length) {
      for (const cu of item.countUnits) {
        if (cu.unit === item.unit) continue;
        await prisma.productUnit.upsert({
          where: {
            productId_unit: { productId: product.id, unit: cu.unit },
          },
          create: {
            productId: product.id,
            unit: cu.unit,
            conversionFactor: cu.conversionFactor,
            label: cu.label ?? null,
          },
          update: {
            conversionFactor: cu.conversionFactor,
            label: cu.label ?? null,
          },
        });
      }
    } else {
      for (const cu of defaultCountUnitsForBase(item.unit)) {
        await prisma.productUnit.upsert({
          where: {
            productId_unit: { productId: product.id, unit: cu.unit },
          },
          create: {
            productId: product.id,
            unit: cu.unit,
            conversionFactor: cu.conversionFactor,
            label: cu.label ?? null,
          },
          update: {},
        });
      }
    }

    const locationId = defaultLocationFor(item.categorySlug);
    const demoQty =
      item.financialClassification === "FOOD_COST"
        ? Math.max(item.minQuantity, 8)
        : item.financialClassification === "PACKAGING_COST"
          ? Math.max(2, Math.floor(item.minQuantity / 2))
          : Math.max(1, Math.floor(item.minQuantity / 2));

    await prisma.productStock.upsert({
      where: {
        productId_locationId: { productId: product.id, locationId },
      },
      update: {},
      create: {
        productId: product.id,
        locationId,
        quantity: demoQty,
      },
    });
  }

  // Demo exits para analytics (productos clave)
  const keySkus = ["FC-BAS-001", "FC-FRU-001", "FC-TOP-001", "PK-VAS-016"];
  const products = await prisma.product.findMany({
    where: { sku: { in: keySkus } },
  });

  for (const sku of keySkus) {
    const product = products.find((p) => p.sku === sku);
    if (!product) continue;

    const locationId =
      product.sku === "FC-BAS-001"
        ? freezer.id
        : product.sku === "FC-FRU-001"
          ? cocina.id
          : product.sku === "PK-VAS-016"
            ? mostrador.id
            : almacen.id;

    for (const daysAgo of [3, 10, 17]) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const existing = await prisma.inventoryMovement.findFirst({
        where: { productId: product.id, date, type: "EXIT" },
      });
      if (existing) continue;

      const qty = product.sku === "FC-FRU-001" ? 10 : 5;
      await prisma.inventoryMovement.create({
        data: {
          type: "EXIT",
          productId: product.id,
          locationId,
          quantity: qty,
          unitCost: product.averageCost,
          totalCost: qty * product.averageCost,
          exitReason: "SALE",
        userId: admin.id,
        registeredByName: "Administrador",
        date,
        notes: "Movimiento demo — consumo semanal",
        },
      });
    }
  }

  console.log(
    `Seed completado. Catálogo: ${ACAI_FACTORY_CATALOG.length} productos. Admin: ${admin.email}`
  );

  const allProducts = await prisma.product.findMany({ where: { active: true } });
  for (const p of allProducts) {
    await prisma.productUnit.upsert({
      where: { productId_unit: { productId: p.id, unit: p.unit } },
      create: { productId: p.id, unit: p.unit, conversionFactor: 1 },
      update: {},
    });
  }

  const normalized = await normalizeAllProductNames();
  if (normalized > 0) {
    console.log(`Nombres normalizados: ${normalized} productos`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
