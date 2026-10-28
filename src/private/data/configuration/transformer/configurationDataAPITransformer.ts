/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailConfigurationData } from '../../../../gen/graphqlTypes'
import { ConfigurationData as EmailConfigurationDataApi } from '../../../../public'
import { EmailConfigurationDataEntity } from '../../../domain/entities/configuration/emailConfigurationDataEntity'

export class ConfigurationDataAPITransformer {
  transformEntity(
    entity: EmailConfigurationDataEntity,
  ): EmailConfigurationDataApi {
    const transformed: EmailConfigurationDataApi = {
      deleteEmailMessagesLimit: entity.deleteEmailMessagesLimit,
      updateEmailMessagesLimit: entity.updateEmailMessagesLimit,
      emailMessageMaxInboundMessageSize:
        entity.emailMessageMaxInboundMessageSize,
      emailMessageMaxOutboundMessageSize:
        entity.emailMessageMaxOutboundMessageSize,
      emailMessageRecipientsLimit: entity.emailMessageRecipientsLimit,
      encryptedEmailMessageRecipientsLimit:
        entity.encryptedEmailMessageRecipientsLimit,
      sendEncryptedEmailEnabled: entity.sendEncryptedEmailEnabled,
      prohibitedFileExtensions: entity.prohibitedFileExtensions,
      emailAliasesEnabled: entity.emailAliasesEnabled,
      externalEmailAliasesEnabled: entity.externalEmailAliasesEnabled,
      allowOwnerEmailAddressReuse: entity.allowOwnerEmailAddressReuse,
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
      emailMessageRecipientsLimit: data.emailMessageRecipientsLimit,
      encryptedEmailMessageRecipientsLimit:
        data.encryptedEmailMessageRecipientsLimit,
      sendEncryptedEmailEnabled: data.sendEncryptedEmailEnabled,
      prohibitedFileExtensions: data.prohibitedFileExtensions,
      emailAliasesEnabled: data.emailMasksEnabled,
      externalEmailAliasesEnabled: data.externalEmailMasksEnabled,
      allowOwnerEmailAddressReuse: data.allowOwnerEmailAddressReuse,
    }
  }
}
