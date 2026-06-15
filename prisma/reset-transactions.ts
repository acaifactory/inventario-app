/**
 * Borra compras, movimientos, transferencias, préstamos, conteos, finanzas y auditoría.
 * Conserva usuarios, catálogo, tiendas, ubicaciones y proveedores.
 */
import "dotenv/config";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  console.log("Reiniciando datos transaccionales...");

  await prisma.$transaction(
    async (tx) => {
      const transfers = await tx.transfer.deleteMany();
      const loanReturns = await tx.loanReturn.deleteMany();
      const costHistory = await tx.costHistory.deleteMany();
      const adjustments = await tx.inventoryAdjustment.deleteMany();
      const physicalCounts = await tx.physicalCount.deleteMany();

      await tx.purchaseInvoiceLine.updateMany({ data: { movementId: null } });
      await tx.inventoryMovement.updateMany({ data: { reversalOfId: null } });

      const reversals = await tx.inventoryMovement.deleteMany({
        where: { isReversal: true },
      });
      const movements = await tx.inventoryMovement.deleteMany();

      const invoices = await tx.purchaseInvoice.deleteMany();
      const loans = await tx.loan.deleteMany();
      const periods = await tx.financialPeriod.deleteMany();
      const snapshots = await tx.weeklySnapshot.deleteMany();
      const audit = await tx.auditLog.deleteMany();
      const exports = await tx.exportHistory.deleteMany();

      const stocks = await tx.productStock.updateMany({ data: { quantity: 0 } });
      const products = await tx.product.updateMany({
        data: {
          averageCost: 0,
          lastPurchaseCost: null,
          lastPurchaseDate: null,
        },
      });

      console.log({
        transfers: transfers.count,
        loanReturns: loanReturns.count,
        costHistory: costHistory.count,
        adjustments: adjustments.count,
        physicalCounts: physicalCounts.count,
        movementReversals: reversals.count,
        movements: movements.count,
        invoices: invoices.count,
        loans: loans.count,
        financialPeriods: periods.count,
        weeklySnapshots: snapshots.count,
        auditLogs: audit.count,
        exportHistory: exports.count,
        stocksZeroed: stocks.count,
        productsCostReset: products.count,
      });
    },
    { timeout: 120_000 }
  );

  console.log("Listo. Inventarios en cero; catálogo y usuarios intactos.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
