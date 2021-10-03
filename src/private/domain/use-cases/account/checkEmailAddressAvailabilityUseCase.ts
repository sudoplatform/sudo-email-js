import { DefaultLogger } from '@sudoplatform/sudo-common'
import { InvalidArgumentError } from '../../../../public'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailAddressEntity } from '../../entities/account/emailAddressEntity'
import { EmailDomainEntity } from '../../entities/account/emailDomainEntity'

/**
 * Input for `CheckEmailAddressAvailabilityUseCase` use case.
 *
 * @property {string[]} localParts The local parts of the email address to check.
 * @property {EmailDomainEntity[]} domains The domains of the email address to check.
 */
interface CheckEmailAddressAvailabilityUseCaseInput {
  localParts: string[]
  domains?: EmailDomainEntity[]
}

/**
 * Application business logic for checking the availability of an email address.
 */
export class CheckEmailAddressAvailabilityUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  constructor(private readonly emailAccountService: EmailAccountService) {}

  async execute({
    localParts,
    domains,
  }: CheckEmailAddressAvailabilityUseCaseInput): Promise<EmailAddressEntity[]> {
    this.log.debug(this.constructor.name, {
      localParts,
      domains,
    })
    if (!localParts.length) {
      throw new InvalidArgumentError()
    }
    const availableAddresses = await this.emailAccountService.checkAvailability(
      {
        localParts,
        domains,
      },
    )
    return availableAddresses
  }
}
