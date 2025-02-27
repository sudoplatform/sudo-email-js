/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockedAddressAction } from '../../../../gen/graphqlTypes'
import { BlockedEmailAddressAction } from '../../../../public/typings/blockedAddresses'

export class BlockedEmailAddressActionTransfomer {
  static fromAPItoGraphQL(
    action: BlockedEmailAddressAction,
  ): BlockedAddressAction {
    switch (action) {
      case BlockedEmailAddressAction.DROP:
        return BlockedAddressAction.Drop
      case BlockedEmailAddressAction.SPAM:
        return BlockedAddressAction.Spam
    }
  }

  static fromGraphQLtoAPI(
    action: BlockedAddressAction,
  ): BlockedEmailAddressAction {
    switch (action) {
      case BlockedAddressAction.Drop:
        return BlockedEmailAddressAction.DROP
      case BlockedAddressAction.Spam:
        return BlockedEmailAddressAction.SPAM
    }
  }
}
