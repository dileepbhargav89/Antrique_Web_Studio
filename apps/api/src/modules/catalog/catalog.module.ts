import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './repositories/category.repository';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './repositories/collection.repository';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';

// Product Catalog Foundation (Milestone 5) — the first real business
// module with more than one controller/service/repository, built on the
// same template modules/auth/'s single-controller shape established
// (see docs/architecture/domain-module-guide.md): three parallel
// controller/service/repository triads (Category/Collection/Product),
// one module. Not @Global() — domain modules are scoped by default,
// matching AuthModule's own precedent. Neither ProductService's own
// cross-repository dependency (CategoryRepository/CollectionRepository,
// for tenant-ownership validation — see product.service.ts) needs any
// special wiring: all three repositories are registered as providers of
// this SAME module, so Nest's DI resolves the dependency without an
// export/import round-trip.
@Module({
  controllers: [CategoryController, CollectionController, ProductController],
  providers: [
    CategoryService,
    CategoryRepository,
    CollectionService,
    CollectionRepository,
    ProductService,
    ProductRepository,
  ],
  // Milestone 6 (Bespoke Customizer Engine) — BespokeModule imports this
  // module to reuse ProductRepository for its own cross-module tenant-
  // ownership checks (a ProductCustomization/Fabric-to-Product link must
  // verify the referenced Product genuinely belongs to the caller's
  // tenant, the same "Milestone 5 own" pattern ProductService already
  // established for categoryId/collectionId — see
  // bespoke/product-customization.service.ts and
  // bespoke/fabric.service.ts). Only ProductRepository is exported — "real,
  // used values only," the same discipline every export list in this
  // codebase follows.
  exports: [ProductRepository],
})
export class CatalogModule {}
