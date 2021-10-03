import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailDomainEntity } from '../../entities/account/emailDomainEntity'

/**
 * Application business logic for retrieving supported email domains.
 */
export class GetSupportedEmailDomainsUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(private readonly emailAccountService: EmailAccountService) {}

  async execute(cachePolicy: CachePolicy): Promise<EmailDomainEntity[]> {
    this.log.debug(this.constructor.name, {
      cachePolicy,
    })
    return await this.emailAccountService.getSupportedEmailDomains({
      cachePolicy,
    })
  }
}
