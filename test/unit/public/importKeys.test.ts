/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvalidArgumentError, SudoEmailClient } from '../../../src'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

describe('SudoEmailClient.importKeys Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
  })
  it('throws InvalidArgumentError if no data provided to import', async () => {
    await expect(
      instanceUnderTest.importKeys(new ArrayBuffer(0)),
    ).rejects.toThrow(InvalidArgumentError)
  })
})
