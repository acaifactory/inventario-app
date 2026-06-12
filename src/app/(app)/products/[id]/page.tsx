import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { ProductUnitsEditor } from "@/components/products/ProductUnitsEditor";

export default async function ProductUnitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { units: true, category: true },
  });

  if (!product) notFound();

  return (
    <div>
      <PageHeader
        title="Unidades de medida"
        description={`${product.name} · ${product.category.name}`}
        action={
          <Link href="/products">
            <Button variant="secondary">Volver al catálogo</Button>
          </Link>
        }
      />
      <ProductUnitsEditor
        productId={product.id}
        productName={product.name}
        baseUnit={product.unit}
        units={product.units}
      />
    </div>
  );
}
