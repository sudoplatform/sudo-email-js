import { EmailAddressEntity } from '../../../domain/entities/account/emailAddressEntity'

export class EmailAddressEntityTransformer {
  transform(address: string, alias?: string): EmailAddressEntity {
    return alias ? { emailAddress: address, alias } : { emailAddress: address }
  }
}
