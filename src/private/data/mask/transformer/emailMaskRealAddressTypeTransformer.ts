/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskRealAddressType as EmailMaskRealAddressTypeGraphQL } from '../../../../gen/graphqlTypes'
import { EmailMaskRealAddressType } from '../../../../public'
import { EmailMaskEntityRealAddressType } from '../../../domain/entities/mask/emailMaskEntity'

export class EmailMaskRealAddressTypeTransformer {
  static graphQLToEntity(
    data: EmailMaskRealAddressTypeGraphQL,
  ): EmailMaskEntityRealAddressType {
    switch (data) {
      case EmailMaskRealAddressTypeGraphQL.External:
        return EmailMaskEntityRealAddressType.EXTERNAL
      case EmailMaskRealAddressTypeGraphQL.Internal:
        return EmailMaskEntityRealAddressType.INTERNAL
    }
  }

  static entityToGraphQL(
    entity: EmailMaskEntityRealAddressType,
  ): EmailMaskRealAddressTypeGraphQL {
    switch (entity) {
      case EmailMaskEntityRealAddressType.EXTERNAL:
        return EmailMaskRealAddressTypeGraphQL.External
      case EmailMaskEntityRealAddressType.INTERNAL:
        return EmailMaskRealAddressTypeGraphQL.Internal
    }
  }

  static entityToApi(
    entity: EmailMaskEntityRealAddressType,
  ): EmailMaskRealAddressType {
    switch (entity) {
      case EmailMaskEntityRealAddressType.EXTERNAL:
        return EmailMaskRealAddressType.EXTERNAL
      case EmailMaskEntityRealAddressType.INTERNAL:
        return EmailMaskRealAddressType.INTERNAL
    }
  }

  static apiToEntity(
    api: EmailMaskRealAddressType,
  ): EmailMaskEntityRealAddressType {
    switch (api) {
      case EmailMaskRealAddressType.EXTERNAL:
        return EmailMaskEntityRealAddressType.EXTERNAL
      case EmailMaskRealAddressType.INTERNAL:
        return EmailMaskEntityRealAddressType.INTERNAL
    }
  }
}
