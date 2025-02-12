/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEmailClient } from '../../../src'
import { setupEmailClient } from '../util/emailClientLifecycle'

describe('SudoEmailClient GetConfigurationData Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
  })

  describe('GetConfigurationData', () => {
    it('returns expected result', async () => {
      const result = await instanceUnderTest.getConfigurationData()
      expect(result.deleteEmailMessagesLimit).toBeGreaterThanOrEqual(1)
      expect(result.updateEmailMessagesLimit).toBeGreaterThanOrEqual(1)
      expect(result.emailMessageMaxInboundMessageSize).toBeGreaterThanOrEqual(1)
      expect(result.emailMessageMaxOutboundMessageSize).toBeGreaterThanOrEqual(
        1,
      )
      expect(result.emailMessageRecipientsLimit).toBeGreaterThanOrEqual(1)
      expect(result).toHaveProperty('sendEncryptedEmailEnabled')
    })
  })
})
