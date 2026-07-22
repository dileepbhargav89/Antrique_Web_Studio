export class CustomerAddressResponseDto {
  constructor(
    readonly id: string,
    readonly label: string | null,
    readonly line1: string,
    readonly line2: string | null,
    readonly city: string,
    readonly region: string | null,
    readonly postalCode: string | null,
    readonly country: string,
    readonly phone: string | null,
    readonly isDefaultShipping: boolean,
    readonly isDefaultBilling: boolean,
  ) {}
}
