/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { DeviceKeyWorkerKeyFormat } from '../../../../../../src/private/data/common/deviceKeyWorker'
import { PublicKeyFormatTransformer } from '../../../../../../src/private/data/common/transformer/publicKeyFormatTransformer'

describe('PublicKeyFormatTransformer Test Suite', () => {
  const instanceUnderTest = new PublicKeyFormatTransformer()

  describe('transformPublicKeyFormat', () => {
    it.each`
      input                           | expected
      ${PublicKeyFormat.RSAPublicKey} | ${DeviceKeyWorkerKeyFormat.RsaPublicKey}
      ${PublicKeyFormat.SPKI}         | ${DeviceKeyWorkerKeyFormat.Spki}
    `(
      'converts cache policy ($input) to fetch policy ($expected)',
      ({ input, expected }) => {
        expect(
          instanceUnderTest.toDeviceKeyWorkerKeyFormat(input),
        ).toStrictEqual(expected)
      },
    )
  })
})
