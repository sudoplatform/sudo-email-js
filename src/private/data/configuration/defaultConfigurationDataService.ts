import { ConfigurationDataEntity } from '../../domain/entities/configuration/configurationDataEntity'
import { ConfigurationDataService } from '../../domain/entities/configuration/configurationDataService'
import { ApiClient } from '../common/apiClient'
import { ConfigurationDataAPITransformer } from './transformer/configurationDataAPITransformer'

export class DefaultConfigurationDataService
  implements ConfigurationDataService
{
  constructor(private readonly appSync: ApiClient) {}

  async getConfigurationData(): Promise<ConfigurationDataEntity> {
    const result = await this.appSync.getConfigurationData()
    const transformer = new ConfigurationDataAPITransformer()
    return transformer.transformGraphQL(result)
  }
}
