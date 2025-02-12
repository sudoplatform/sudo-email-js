/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { SudoEmailClient } from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'

describe('SudoEmailClient GetSupportedEmailDomains Test Suite', () => {
  jest.setTimeout(240000)

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })
  it('returns expected output', async () => {
    const supportedEmailDomains =
      await instanceUnderTest.getSupportedEmailDomains(CachePolicy.RemoteOnly)
    expect(supportedEmailDomains.length).toBeGreaterThanOrEqual(1)
  })
})
