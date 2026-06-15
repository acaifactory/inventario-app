import { NextRequest, NextResponse } from "next/server";
import type { StoreType } from "@prisma/client";
import { requireSession, canManageCatalog } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pickDefaultStoreLocation } from "@/lib/stores/default-location";
import {
  DEFAULT_STORE_LOCATIONS,
  suggestStoreCode,
  uniqueStoreCode,
} from "@/lib/stores/store-setup";

function mapStore(
  store: {
    id: string;
    name: string;
    code: string;
    type: StoreType;
    city: string | null;
    address: string | null;
    locations: { id: string; name: string; active: boolean }[];
    _count: { locations: number };
  }
) {
  return {
    id: store.id,
    name: store.name,
    code: store.code,
    type: store.type,
    city: store.city,
    address: store.address,
    locationCount: store._count.locations,
    defaultLocationId: pickDefaultStoreLocation(store.locations)?.id ?? null,
    locations: store.locations,
  };
}

export async function GET() {
  const stores = await prisma.store.findMany({
    where: { active: true },
    include: {
      locations: { where: { active: true }, orderBy: { name: "asc" } },
      _count: { select: { locations: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(stores.map(mapStore));
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!canManageCatalog(session.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name as string)?.trim();
    const rawCode = (body.code as string)?.trim();
    const type = (body.type as StoreType) || "OWNED";
    const city = (body.city as string)?.trim() || null;
    const address = (body.address as string)?.trim() || null;

    if (!name) {
      return NextResponse.json({ error: "Nombre obligatorio" }, { status: 400 });
    }

    if (type !== "OWNED" && type !== "FRANCHISE") {
      return NextResponse.json({ error: "Tipo de tienda no válido" }, { status: 400 });
    }

    const existingName = await prisma.store.findUnique({ where: { name } });
    if (existingName?.active) {
      return NextResponse.json(
        { error: "Ya existe una tienda con ese nombre" },
        { status: 409 }
      );
    }

    const preferredCode = (rawCode || suggestStoreCode(name)).toUpperCase();
    const code = await uniqueStoreCode(preferredCode, async (candidate) => {
      const found = await prisma.store.findUnique({ where: { code: candidate } });
      return Boolean(found);
    });

    const store = await prisma.$transaction(async (tx) => {
      const created =
        existingName && !existingName.active
          ? await tx.store.update({
              where: { id: existingName.id },
              data: { name, code, type, city, address, active: true },
            })
          : await tx.store.create({
              data: { name, code, type, city, address },
            });

      for (const loc of DEFAULT_STORE_LOCATIONS) {
        await tx.location.upsert({
          where: {
            storeId_name: { storeId: created.id, name: loc.name },
          },
          update: { description: loc.description, active: true },
          create: {
            name: loc.name,
            description: loc.description,
            storeId: created.id,
          },
        });
      }

      return tx.store.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          locations: { where: { active: true }, orderBy: { name: "asc" } },
          _count: { select: { locations: true } },
        },
      });
    });

    return NextResponse.json(mapStore(store), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
