export class FabricImageResponseDto {
  constructor(
    readonly id: string,
    readonly url: string,
    readonly altText: string | null,
    readonly sortOrder: number,
  ) {}
}
