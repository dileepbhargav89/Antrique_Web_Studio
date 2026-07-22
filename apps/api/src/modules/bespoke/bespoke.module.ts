import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { FabricController } from './fabric.controller';
import { FabricService } from './fabric.service';
import { FabricRepository } from './repositories/fabric.repository';
import { MeasurementProfileController } from './measurement-profile.controller';
import { MeasurementService } from './measurement.service';
import { MeasurementRepository } from './repositories/measurement.repository';
import { StyleOptionController } from './style-option.controller';
import { StyleOptionService } from './style-option.service';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { ProductCustomizationController } from './product-customization.controller';
import { ProductCustomizationService } from './product-customization.service';
import { ProductCustomizationRepository } from './repositories/product-customization.repository';

// Bespoke Customizer Engine (Milestone 6) — same shape as CatalogModule:
// four parallel controller/service/repository triads (Fabric/
// MeasurementProfile/StyleOption/ProductCustomization), one module. Not
// @Global() — domain modules are scoped by default, matching every prior
// business module's own precedent.
//
// Imports CatalogModule (not just its ProductRepository directly as an
// extra provider) — FabricService/ProductCustomizationService both need
// to validate a client-supplied `productId` belongs to the caller's
// tenant before referencing it (this milestone's own "Fabrics belong to
// the current tenant"/tenant-ownership discipline), reusing
// ProductRepository rather than duplicating a second DI instance of it.
// One-directional (bespoke → catalog); catalog never imports bespoke —
// "Zero circular dependencies" (this milestone's own requirement).
@Module({
  imports: [CatalogModule],
  controllers: [
    FabricController,
    MeasurementProfileController,
    StyleOptionController,
    ProductCustomizationController,
  ],
  providers: [
    FabricService,
    FabricRepository,
    MeasurementService,
    MeasurementRepository,
    StyleOptionService,
    StyleOptionRepository,
    ProductCustomizationService,
    ProductCustomizationRepository,
  ],
  // Milestone 8 (Order Management & Checkout) — OrdersModule imports this
  // module to reuse ProductCustomizationRepository for "Validate bespoke
  // customization" (an order item's `productCustomizationId`, if given,
  // must belong to the caller's tenant AND to the same product as the
  // item's own `productVariantId`). Only ProductCustomizationRepository
  // is exported — "real, used values only," the same discipline
  // CatalogModule's own Milestone-6 export already established.
  exports: [ProductCustomizationRepository],
})
export class BespokeModule {}
