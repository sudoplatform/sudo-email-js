/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ScheduledDraftMessageTransformer } from '../../../../../../src/private/data/message/transformer/scheduledDraftMessageTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('ScheduledDraftMessageTransformer Test Suite', () => {
  describe('toEntity', () => {
    it('transforms graphql to entity', () => {
      expect(
        ScheduledDraftMessageTransformer.toEntity(
          GraphQLDataFactory.scheduledDraftMessage,
        ),
      ).toStrictEqual(EntityDataFactory.scheduledDraftMessage)
    })
  })
})
