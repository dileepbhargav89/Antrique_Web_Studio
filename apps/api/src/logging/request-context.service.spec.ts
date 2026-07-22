import { RequestContextService } from './request-context.service';
import { RequestContext } from './types/request-context.type';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  const ctx = (overrides: Partial<RequestContext> = {}): RequestContext => ({
    requestId: 'req-1',
    correlationId: 'corr-1',
    ...overrides,
  });

  it('getContext() is undefined outside any run()', () => {
    expect(service.getContext()).toBeUndefined();
  });

  it('run() makes getContext() return exactly what was passed, for the callback duration', () => {
    const context = ctx();
    const observed = service.run(context, () => service.getContext());
    expect(observed).toEqual(context);
  });

  it('returns the callback result', () => {
    const result = service.run(ctx(), () => 42);
    expect(result).toBe(42);
  });

  it('getContext() is undefined again after run() returns', () => {
    service.run(ctx(), () => service.getContext());
    expect(service.getContext()).toBeUndefined();
  });

  it('context survives a real async boundary (setTimeout) inside the callback', async () => {
    const context = ctx({ requestId: 'async-req' });

    const observed = await service.run(context, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return service.getContext();
    });

    expect(observed).toEqual(context);
  });

  it("two concurrent run() calls never see each other's context", async () => {
    const observations: Array<RequestContext | undefined> = [];

    const runOne = (id: string, delayMs: number) =>
      service.run(ctx({ requestId: id }), async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        observations.push(service.getContext());
      });

    // Staggered delays so the two run()s genuinely overlap in time —
    // the slower one is still "inside" its run() while the faster one
    // resolves and captures its observation.
    await Promise.all([runOne('req-a', 20), runOne('req-b', 5)]);

    // Exactly one observation per run() — no missing or duplicated pushes —
    // and each is the full, correct context for its own request, never a
    // mix of the two (e.g. req-a's requestId with req-b's other fields).
    expect(observations).toHaveLength(2);
    expect(observations).toContainEqual(ctx({ requestId: 'req-a' }));
    expect(observations).toContainEqual(ctx({ requestId: 'req-b' }));
  });

  it('getContext() is restored even if the callback throws', () => {
    expect(() =>
      service.run(ctx(), () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    // AsyncLocalStorage guarantees the previous store is restored on
    // unwind — if this ever silently failed, a request handler that threw
    // would leave its context "stuck" for whatever ran after it.
    expect(service.getContext()).toBeUndefined();
  });

  it('a nested run() shadows the outer context, then the outer context is restored', () => {
    const outer = ctx({ requestId: 'outer' });
    const inner = ctx({ requestId: 'inner' });
    const observedDuringInner: Array<RequestContext | undefined> = [];

    service.run(outer, () => {
      observedDuringInner.push(service.getContext());
      service.run(inner, () => {
        observedDuringInner.push(service.getContext());
      });
      observedDuringInner.push(service.getContext());
    });

    expect(observedDuringInner).toEqual([outer, inner, outer]);
  });
});
