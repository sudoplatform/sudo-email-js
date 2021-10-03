import { EmailDomainEntity } from '../../../domain/entities/account/emailDomainEntity'

export class EmailDomainEntityTransformer {
  transformGraphQL(domain: string): EmailDomainEntity {
    return {
      domain,
    }
  }
}
