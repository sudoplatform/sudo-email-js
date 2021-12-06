import { DefaultLogger } from '@sudoplatform/sudo-common'
import { ConfigurationDataService } from '../../entities/configuration/configurationDataService'

export interface GetConfigurationDataUseCaseOutput {
  deleteEmailMessagesLimit: number
  updateEmailMessagesLimit: number
  emailMessageMaxInboundMessageSize: number
  emailMessageMaxOutboundMessageSize: number
}

/**
 * Application business logic for retrieving configuration data.
 */
export class GetConfigurationDataUseCase {
  private readonly log = new DefaultLogger(this.constructor.name)

  public constructor(
    private readonly configurationDataService: ConfigurationDataService,
  ) {}

  async execute(): Promise<GetConfigurationDataUseCaseOutput> {
    this.log.debug(this.constructor.name)
    return await this.configurationDataService.getConfigurationData()
  }
}
