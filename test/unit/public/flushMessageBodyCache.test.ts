/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SudoEmailClient } from '../../../src'
import { InvalidArgumentError } from '../../../src/public/errors'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

describe('SudoEmailClient.flushMessageBodyCache and setCacheSizeLimit Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  beforeEach(() => {
    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })

  describe('flushMessageBodyCache', () => {
    it('should not throw when called with sudoId', async () => {
      await expect(
        instanceUnderTest.flushMessageBodyCache({ sudoId: 'test-sudo' }),
      ).resolves.toBeUndefined()
    })

    it('should not throw when called with emailAddressId', async () => {
      await expect(
        instanceUnderTest.flushMessageBodyCache({
          emailAddressId: 'test-addr',
        }),
      ).resolves.toBeUndefined()
    })
  })

  describe('setCacheSizeLimit', () => {
    it('should not throw when called with a valid value', async () => {
      await expect(
        instanceUnderTest.setCacheSizeLimit(1024 * 1024),
      ).resolves.toBeUndefined()
    })

    it('should throw InvalidArgumentError when called with a negative value', async () => {
      await expect(instanceUnderTest.setCacheSizeLimit(-1)).rejects.toThrow(
        InvalidArgumentError,
      )
    })
  })
})
