import { ConfigurationData } from '../../../../gen/graphqlTypes'
import { ConfigurationDataEntity } from '../../../domain/entities/configuration/configurationDataEntity'

export class ConfigurationDataAPITransformer {
  transformEntity(entity: ConfigurationDataEntity): ConfigurationData {
    const transformed: ConfigurationData = {
      deleteEmailMessagesLimit: entity.deleteEmailMessagesLimit,
      updateEmailMessagesLimit: entity.updateEmailMessagesLimit,
      emailMessageMaxInboundMessageSize:
        entity.emailMessageMaxInboundMessageSize,
      emailMessageMaxOutboundMessageSize:
        entity.emailMessageMaxOutboundMessageSize,
    }

    return transformed
  }

  transformGraphQL(data: ConfigurationData): ConfigurationDataEntity {
    return {
      deleteEmailMessagesLimit: data.deleteEmailMessagesLimit,
      updateEmailMessagesLimit: data.updateEmailMessagesLimit,
      emailMessageMaxInboundMessageSize: data.emailMessageMaxInboundMessageSize,
      emailMessageMaxOutboundMessageSize:
        data.emailMessageMaxOutboundMessageSize,
    }
  }
}
