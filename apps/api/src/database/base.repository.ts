// The minimal shape every Prisma model delegate (prisma.tenant,
// prisma.user, prisma.setting, ...) satisfies — just enough for
// TypeScript to know these six methods exist, nothing about their real
// argument/return types. `Parameters<>`/`ReturnType<>` below recover the
// REAL, per-model types from whatever concrete TDelegate a subclass
// passes in, so a real repository still gets full type safety on its
// actual model's fields — this loose constraint only exists to let
// BaseRepository itself compile generically over any delegate, without
// pinning it to one specific generated Prisma type.
/* eslint-disable @typescript-eslint/no-explicit-any --
   The standard TS pattern for this kind of generic extraction: `any`
   here is the loosest-possible CONSTRAINT so any real Prisma delegate
   satisfies it, while Parameters<>/ReturnType<> below recover the real,
   per-model types from whatever concrete TDelegate a subclass provides.
   A stricter constraint (e.g. `unknown[]`) breaks assignability from
   real Prisma delegates entirely, since their methods take specific
   argument types, not `unknown`. */
type CrudDelegate = {
  findUnique: (...args: any[]) => any;
  findMany: (...args: any[]) => any;
  create: (...args: any[]) => any;
  update: (...args: any[]) => any;
  delete: (...args: any[]) => any;
  count: (...args: any[]) => any;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// The minimal shape `findManyAndCount()` below needs from a Prisma
// client to run its two queries atomically — Prisma's own real
// `$transaction()` overload set is considerably richer than this (array
// form, interactive form, options), but this is the only piece any
// caller here actually uses, and a narrow structural type is what lets a
// concrete `PrismaService` (or a plain mock in a unit test) satisfy it
// without importing the real class.
type TransactionCapable = {
  $transaction<T extends readonly unknown[]>(ops: readonly [...T]): Promise<T>;
};

// Generic CRUD infrastructure every future repository (Phase 1.2D.4+)
// extends — see docs/architecture/domain-module-guide.md's "Repository
// layer." Depends only on the delegate object passed to its
// constructor, never on PrismaService or Nest's DI container directly —
// a concrete subclass (e.g. ExampleRepository) is what's @Injectable()
// and constructor-injects PrismaService, then hands this class the one
// model delegate it owns (e.g. `prisma.setting`). This is what keeps
// BaseRepository itself framework-agnostic and trivially unit-testable
// with a plain mock object, no real Prisma/Postgres needed.
//
// No query builders, no caching, no model-specific helpers — a genuine
// second requirement surfacing across multiple real repositories (Phase
// 1.2D.4+) is what would justify adding one, not anticipation now.
// `count()` (Milestone 5 — Product Catalog Foundation) is exactly that:
// CategoryRepository/CollectionRepository/ProductRepository all need it
// simultaneously for paginated-list total counts, a genuine,
// multi-repository need, not anticipation. `findManyAndCount()`
// (architecture review, Backend v1.0) is the same story one level up:
// by the time of this review, ~20 repositories across every business
// module had each hand-written the IDENTICAL `this.prisma.$transaction([
// this.delegate.findMany(...), this.delegate.count(...)])` body (originally
// justified per-repository, e.g. category.repository.ts's own comment,
// as "`this.delegate` alone only exposes the generic CRUD surface
// BaseRepository defines") — a real, proven, repeated need, not
// speculative. Still takes the transaction-capable client as a
// PARAMETER, not a constructor dependency: BaseRepository itself stays
// exactly as framework-agnostic/mockable as every method above it —
// only the concrete repository subclass (which already injects
// PrismaService for its own extra queries) supplies `this.prisma` at the
// call site.
export abstract class BaseRepository<TDelegate extends CrudDelegate> {
  protected constructor(protected readonly delegate: TDelegate) {}

  findOne(...args: Parameters<TDelegate['findUnique']>): ReturnType<TDelegate['findUnique']> {
    return this.delegate.findUnique(...args);
  }

  findMany(...args: Parameters<TDelegate['findMany']>): ReturnType<TDelegate['findMany']> {
    return this.delegate.findMany(...args);
  }

  count(...args: Parameters<TDelegate['count']>): ReturnType<TDelegate['count']> {
    return this.delegate.count(...args);
  }

  create(...args: Parameters<TDelegate['create']>): ReturnType<TDelegate['create']> {
    return this.delegate.create(...args);
  }

  update(...args: Parameters<TDelegate['update']>): ReturnType<TDelegate['update']> {
    return this.delegate.update(...args);
  }

  delete(...args: Parameters<TDelegate['delete']>): ReturnType<TDelegate['delete']> {
    return this.delegate.delete(...args);
  }

  // `findMany`+`count` inside one `$transaction([...])` (array form, not
  // interactive) so both queries run against the same snapshot — without
  // it, a row inserted/removed between the two separate queries could
  // make `total` disagree with `items` under concurrent writes. Same
  // "Transactions where appropriate" reasoning every call site already
  // documented individually (see e.g. catalog/repositories/
  // category.repository.ts's own now-superseded comment); centralized
  // here since every one of those call sites turned out to run the exact
  // same two queries. `args` reuses `findMany`'s own parameter type
  // directly — `where`/`orderBy`/`skip`/`take` are already fields of
  // that same object on every real Prisma delegate — so a caller passes
  // exactly what it already passed to a bare `findMany()` call, nothing
  // new to learn.
  // Phase 10, Module 3 (Security Hardening) — `PrismaService`'s own RLS
  // wiring (`$extends` query hook, see that file's constructor comment)
  // now means each of the two array members below independently opens
  // its own SET-LOCAL transaction rather than sharing this method's
  // outer one when RLS session context is active — the two queries see
  // two independent (though near-simultaneous) snapshots instead of one
  // truly shared one. Under a rare concurrent write landing between them,
  // `total` could disagree with `items` by one row — a display/pagination
  // nicety, not a security property, judged acceptable against RLS
  // coverage on every read. See `PrismaService`'s own comment for the
  // full reasoning; this note exists here too since this is the other
  // half of that trade-off's call site.
  protected async findManyAndCount(
    transactionClient: TransactionCapable,
    args: Parameters<TDelegate['findMany']>[0],
  ): Promise<{ items: Awaited<ReturnType<TDelegate['findMany']>>; total: number }> {
    const whereArg = (
      args as { where?: Parameters<TDelegate['count']>[0] extends { where?: infer W } ? W : never }
    )?.where;
    const [items, total] = await transactionClient.$transaction([
      this.delegate.findMany(args),
      this.delegate.count({ where: whereArg } as Parameters<TDelegate['count']>[0]),
    ]);
    return { items: items as Awaited<ReturnType<TDelegate['findMany']>>, total: total as number };
  }
}
