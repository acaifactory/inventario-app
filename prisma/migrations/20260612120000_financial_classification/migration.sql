-- CreateEnum
CREATE TYPE "FinancialClassification" AS ENUM ('FOOD_COST', 'PACKAGING_COST', 'CLEANING_SUPPLIES', 'OPERATING_SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('OWNED', 'FRANCHISE');

-- AlterEnum
ALTER TYPE "UnitOfMeasure" ADD VALUE 'ROLL';

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "StoreType" NOT NULL DEFAULT 'OWNED',
    "address" TEXT,
    "city" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- DropIndex
DROP INDEX IF EXISTS "Location_name_key";

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "storeId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "subcategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN "financialClassification" "FinancialClassification" NOT NULL DEFAULT 'FOOD_COST';
ALTER TABLE "Product" ADD COLUMN "includeInFoodCost" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");
CREATE INDEX "Location_storeId_idx" ON "Location"("storeId");
CREATE UNIQUE INDEX "Location_storeId_name_key" ON "Location"("storeId", "name");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
