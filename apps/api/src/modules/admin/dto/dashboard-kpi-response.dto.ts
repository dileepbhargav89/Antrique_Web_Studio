// One module's own worth of KPIs — deliberately a loosely-typed
// `metrics` bag (`Record<string, string | number>`) rather than one
// rigid DTO shape per module: each of the four modules this milestone
// aggregates (Orders/Inventory/CRM/Billing) computes genuinely different
// metrics (revenue vs. stock valuation vs. conversion rate vs.
// collection rate) — a single shared response shape is more honest than
// forcing them into one fixed field set with mostly-null values.
export class DashboardKpiResponseDto {
  constructor(
    readonly module: string,
    readonly metrics: Record<string, string | number>,
  ) {}
}
