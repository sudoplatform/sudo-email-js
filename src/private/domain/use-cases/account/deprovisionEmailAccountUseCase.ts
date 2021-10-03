import { DefaultLogger } from '@sudoplatform/sudo-common'
import { EmailAccountEntity } from '../../entities/account/emailAccountEntity'
import { EmailAccountService } from '../../entities/account/emailAccountService'

/**
 * Application business logic for deprovisioning an email account.
 */
export class DeprovisionEmailAccountUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  public constructor(
    private readonly emailAccountService: EmailAccountService,
  ) {}

  async execute(id: string): Promise<EmailAccountEntity> {
    this.log.debug(this.constructor.name, {
      id,
    })
    return await this.emailAccountService.delete({
      emailAddressId: id,
    })
  }
}
