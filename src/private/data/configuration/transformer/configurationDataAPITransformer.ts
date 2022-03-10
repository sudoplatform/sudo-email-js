import { EmailConfigurationData } from '../../../../gen/graphqlTypes'
import { EmailConfigurationDataEntity } from '../../../domain/entities/configuration/emailConfigurationDataEntity'

export class ConfigurationDataAPITransformer {
  transformEntity(
    entity: EmailConfigurationDataEntity,
  ): EmailConfigurationData {
    const transformed: EmailConfigurationData = {
      deleteEmailMessagesLimit: entity.deleteEmailMessagesLimit,
      updateEmailMessagesLimit: entity.updateEmailMessagesLimit,
      emailMessageMaxInboundMessageSize:
        entity.emailMessageMaxInboundMessageSize,
      emailMessageMaxOutboundMessageSize:
        entity.emailMessageMaxOutboundMessageSize,
    }

    return transformed
  }

  transformGraphQL(data: EmailConfigurationData): EmailConfigurationDataEntity {
    return {
      deleteEmailMessagesLimit: data.deleteEmailMessagesLimit,
      updateEmailMessagesLimit: data.updateEmailMessagesLimit,
      emailMessageMaxInboundMessageSize: data.emailMessageMaxInboundMessageSize,
      emailMessageMaxOutboundMessageSize:
        data.emailMessageMaxOutboundMessageSize,
    }
  }
}
