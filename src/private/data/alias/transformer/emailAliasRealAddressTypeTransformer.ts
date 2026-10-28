/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL } from '../../../../gen/graphqlTypes'
import { EmailAliasRealAddressType } from '../../../../public'
import { EmailAliasEntityRealAddressType } from '../../../domain/entities/alias/emailAliasEntity'

export class EmailAliasRealAddressTypeTransformer {
  static graphQLToEntity(
    data: EmailMaskRealAddressTypeGraphQL,
  ): EmailAliasEntityRealAddressType {
    switch (data) {
      case EmailMaskRealAddressTypeGraphQL.External:
        return EmailAliasEntityRealAddressType.EXTERNAL
      case EmailMaskRealAddressTypeGraphQL.Internal:
        return EmailAliasEntityRealAddressType.INTERNAL
    }
  }

  static entityToGraphQL(
    entity: EmailAliasEntityRealAddressType,
  ): EmailMaskRealAddressTypeGraphQL {
    switch (entity) {
      case EmailAliasEntityRealAddressType.EXTERNAL:
        return EmailMaskRealAddressTypeGraphQL.External
      case EmailAliasEntityRealAddressType.INTERNAL:
        return EmailMaskRealAddressTypeGraphQL.Internal
    }
  }

  static entityToApi(
    entity: EmailAliasEntityRealAddressType,
  ): EmailAliasRealAddressType {
    switch (entity) {
      case EmailAliasEntityRealAddressType.EXTERNAL:
        return EmailAliasRealAddressType.EXTERNAL
      case EmailAliasEntityRealAddressType.INTERNAL:
        return EmailAliasRealAddressType.INTERNAL
    }
  }

  static apiToEntity(
    api: EmailAliasRealAddressType,
  ): EmailAliasEntityRealAddressType {
    switch (api) {
      case EmailAliasRealAddressType.EXTERNAL:
        return EmailAliasEntityRealAddressType.EXTERNAL
      case EmailAliasRealAddressType.INTERNAL:
        return EmailAliasEntityRealAddressType.INTERNAL
    }
  }
}
