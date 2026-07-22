import { ExampleRepository } from './example.repository';
import { PrismaService } from '../../../database/prisma.service';

// No real PrismaService/Postgres involved — ExampleRepository's
// constructor only ever reads `prisma.setting`, so a plain fake object
// exposing just that property is enough to prove the wiring (constructor
// extracts the one delegate it owns and hands it to BaseRepository),
// same reasoning as base.repository.spec.ts's mock delegate.
function createFakePrisma() {
  return {
    setting: {
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({}) as unknown),
      delete: jest.fn(async () => ({}) as unknown),
    },
  } as unknown as PrismaService;
}

describe('ExampleRepository', () => {
  it('delegates findMany() to prisma.setting.findMany()', async () => {
    const prisma = createFakePrisma();
    const repository = new ExampleRepository(prisma);

    await repository.findMany({ where: { tenantId: 't1' } });

    expect(prisma.setting.findMany).toHaveBeenCalledWith({ where: { tenantId: 't1' } });
  });

  it('delegates findOne() to prisma.setting.findUnique()', async () => {
    const prisma = createFakePrisma();
    const repository = new ExampleRepository(prisma);

    await repository.findOne({ where: { id: 's1' } });

    expect(prisma.setting.findUnique).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('findOne()/create() reject a field that does not exist on Setting at compile time (typecheck-only, not a runtime test)', () => {
    const prisma = createFakePrisma();
    const repository = new ExampleRepository(prisma);

    // Confirms BaseRepository's Parameters<>/ReturnType<> generics
    // actually recover Setting's real, per-model argument types from
    // PrismaService['setting'] — not just structurally accepting
    // anything the way the loose `any`-based CrudDelegate constraint
    // alone would. If either line below stops erroring (e.g. because a
    // future change widens the argument type back to `any`), the
    // unused `@ts-expect-error` directive itself becomes a compile
    // error, failing this test.
    // @ts-expect-error — `thisFieldDoesNotExistOnSetting` isn't a real Setting column.
    void repository.findOne({ where: { thisFieldDoesNotExistOnSetting: 'x' } });
    // @ts-expect-error — `thisFieldAlsoDoesNotExist` isn't a real Setting column.
    void repository.create({ data: { thisFieldAlsoDoesNotExist: 1 } });
  });
});
