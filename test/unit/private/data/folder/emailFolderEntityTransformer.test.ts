/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset } from 'ts-mockito'
import { EmailFolderEntityTransformer } from '../../../../../src/private/data/folder/transformer/emailFolderEntityTransformer'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import { DeviceKeyWorker } from '../../../../../src/private/data/common/deviceKeyWorker'

describe('EmailFolderEntityTransformer Test Suite', () => {
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailFolderEntityTransformer

  beforeEach(() => {
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new EmailFolderEntityTransformer(
      instance(mockDeviceKeyWorker),
    )
  })

  describe('transformGraphQL', () => {
    it('transforms successfully', async () => {
      await expect(
        instanceUnderTest.transformGraphQL(GraphQLDataFactory.emailFolder),
      ).resolves.toStrictEqual(EntityDataFactory.emailFolder)
    })
  })
})
