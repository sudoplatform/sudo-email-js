/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash'

export class EmailMessageDataFactory {
  static generateTestIdSet(numberIds: number): Set<string> {
    const ids = _.range(numberIds).map((i) => `${i}`)
    return new Set(ids)
  }
}
