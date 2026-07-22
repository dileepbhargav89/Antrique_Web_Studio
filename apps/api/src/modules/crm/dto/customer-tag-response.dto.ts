export class CustomerTagResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly color: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
