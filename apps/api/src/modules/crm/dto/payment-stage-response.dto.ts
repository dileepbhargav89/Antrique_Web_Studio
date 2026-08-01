export class PaymentStageResponseDto {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly triggerNote: string | null,
    readonly percentage: string,
    readonly amount: string,
    readonly sortOrder: number,
  ) {}
}
