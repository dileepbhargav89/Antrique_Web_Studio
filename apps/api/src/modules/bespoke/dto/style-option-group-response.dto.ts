// A lighter shape than StyleOptionResponseDto (no
// incompatibleStyleOptionIds) — this is the nested "as seen from the
// customization" view; the standalone GET /style-options/:id is where
// the full shape (incompatibilities included) lives.
export class NestedStyleOptionResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string | null,
    readonly priceAdjustment: string,
    readonly status: string,
    readonly sortOrder: number,
  ) {}
}

export class StyleOptionGroupResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string | null,
    readonly isRequired: boolean,
    readonly sortOrder: number,
    readonly styleOptions: NestedStyleOptionResponseDto[],
  ) {}
}
