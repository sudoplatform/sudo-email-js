/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailConfigurationDataService } from '../../domain/entities/configuration/configurationDataService'
import { EmailConfigurationDataEntity } from '../../domain/entities/configuration/emailConfigurationDataEntity'
import { ApiClient } from '../common/apiClient'
import { ConfigurationDataAPITransformer } from './transformer/configurationDataAPITransformer'

export class DefaultConfigurationDataService
  implements EmailConfigurationDataService
{
  constructor(private readonly appSync: ApiClient) {}

  async getConfigurationData(): Promise<EmailConfigurationDataEntity> {
    const result = await this.appSync.getEmailConfig()
    const transformer = new ConfigurationDataAPITransformer()
    return transformer.transformGraphQL(result)
  }
}
