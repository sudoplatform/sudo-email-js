/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { EmailAccountEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailAccountEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'
import { DeviceKeyWorker } from '../../../../../../src/private/data/common/deviceKeyWorker'

describe('EmailAccountEntityTransformer Test Suite', () => {
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailAccountEntityTransformer

  beforeEach(() => {
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new EmailAccountEntityTransformer(
      instance(mockDeviceKeyWorker),
    )
  })

  describe('transformGraphQL', () => {
    it('transforms successfully with optionals present', async () => {
      await expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailAddress),
      ).resolves.toStrictEqual(EntityDataFactory.emailAccount)
    })

    it.each`
      optional
      ${undefined}
      ${null}
    `(
      'transforms successfully with optionals absent by value $optional',
      async ({ optional }) => {
        await expect(
          instanceUnderTest.transformGraphQL({
            ...GraphQLDataFactory.emailAddress,
            lastReceivedAtEpochMs: optional,
          }),
        ).resolves.toStrictEqual({
          ...EntityDataFactory.emailAccount,
          lastReceivedAt: undefined,
        })
      },
    )
  })
})
