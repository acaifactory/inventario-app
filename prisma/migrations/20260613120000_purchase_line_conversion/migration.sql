-- AlterTable
ALTER TABLE "PurchaseInvoiceLine" ADD COLUMN "contentsPerUnit" DOUBLE PRECISION,
ADD COLUMN "baseUnit" "UnitOfMeasure",
ADD COLUMN "baseQuantity" DOUBLE PRECISION,
ADD COLUMN "baseUnitCost" DOUBLE PRECISION;
