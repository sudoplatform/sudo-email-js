/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { SudoEmailClient } from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'

describe('SudoEmailClient getEmailMaskDomains Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let runTests = true

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    const config = await instanceUnderTest.getConfigurationData()
    runTests = config.emailMasksEnabled
    if (runTests) {
      userClient = result.userClient
      entitlementsClient = result.entitlementsClient
      profilesClient = result.profilesClient
      sudo = result.sudo
    } else {
      log.debug('Email masks are not enabled, skipping tests')
    }
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('returns email mask domains', async () => {
    if (!runTests) {
      log.debug('Email Masks not enabled. Skipping.')
      return
    }
    const domains = await instanceUnderTest.getEmailMaskDomains()

    expect(domains).toBeDefined()
    expect(domains.length).toBeGreaterThan(0)
  })
})
