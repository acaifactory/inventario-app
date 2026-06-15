/**
 * Contrato único de conversión de unidades en toda la app.
 *
 * Regla de oro:
 *   inventario_base = cantidad × factor
 *
 * - cantidad: lo que el usuario registra (1 caja, 2 mangas, etc.)
 * - factor: cuántas unidades BASE contiene cada una (definido en cada operación)
 * - unidad base: Product.unit (libra, each, galón… configurado por producto)
 *
 * Módulos que usan este contrato:
 * - Compras / facturas
 * - Conteo físico (por columna)
 * - Transferencias, entradas, salidas, ajustes, préstamos
 * - Valorización (lee stock ya convertido a unidad base)
 *
 * UI compartida: PurchaseLineUnitInput + TRANSACTION_PACKAGING_UNITS
 * Motor servidor: resolveQuantityToBase() + assertDynamicConversion()
 */

export {
  resolveQuantityToBase,
  assertDynamicConversion,
} from "./units";

export {
  computeBaseQuantityFromLine,
  contentsPerUnitForSubmit,
  validateDynamicLineConversion,
  onDynamicUnitChange,
  getPurchaseUnitOptionsForProduct,
  purchaseUnitNeedsConversion,
  suggestedContentsPerUnit,
  defaultPurchaseUnitForProduct,
} from "../product-units-ui";

export {
  computePhysicalCountResult,
  parseCountedUnits,
  parseUnitFactors,
} from "./physical-count";
