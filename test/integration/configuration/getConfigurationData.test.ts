/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
      const expectedResult = {
        deleteEmailMessagesLimit: 100,
        updateEmailMessagesLimit: 100,
        emailMessageMaxInboundMessageSize: 10485760,
        emailMessageMaxOutboundMessageSize: 10485760,
        emailMessageRecipientsLimit: 10,
        encryptedEmailMessageRecipientsLimit: 10,
      }

      const result = await instanceUnderTest.getConfigurationData()
      expect(result).toMatchObject(expectedResult)
      expect(result).toHaveProperty('sendEncryptedEmailEnabled')
    })
  })
})
