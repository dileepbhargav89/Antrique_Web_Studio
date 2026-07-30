import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Data-access only — same shape as category.repository.ts. This
// repository genuinely didn't exist before Phase 7: `ProductImage` had
// no standalone CRUD surface at all (images were only ever created as a
// nested write inside `POST /products` — see product.service.ts's own
// `create()`). `ProductImage` carries no soft-delete columns (no
// `deletedAt`/`version` — see schema.prisma's own comment, same
// line-item shape as `ProductVariant`), so unlike CategoryRepository
// there's no `findActiveById()`-style helper here to write.
@Injectable()
export class ProductImageRepository extends BaseRepository<PrismaService['productImage']> {
  constructor(prisma: PrismaService) {
    super(prisma.productImage);
  }
}
