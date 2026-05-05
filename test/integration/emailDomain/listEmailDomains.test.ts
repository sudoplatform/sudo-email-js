/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { SudoProfilesClient, Sudo } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { EmailDomain, SudoEmailClient } from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'

describe('SudoEmailClient listEmailDomains Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let emailMasksEnabled = false

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    userClient = result.userClient
    entitlementsClient = result.entitlementsClient
    profilesClient = result.profilesClient
    sudo = result.sudo
    const config = await instanceUnderTest.getConfigurationData()
    emailMasksEnabled = config.emailMasksEnabled
  })

  it('returns expected output', async () => {
    const supportedEmailDomains =
      await instanceUnderTest.getSupportedEmailDomains()
    let maskDomains: string[] = []
    if (emailMasksEnabled) {
      maskDomains = await instanceUnderTest.getEmailMaskDomains()
    }

    const listedDomains = await instanceUnderTest.listEmailDomains()
    const matchedDomaains: EmailDomain[] = []

    expect(listedDomains).toBeDefined()
    expect(listedDomains.length).toBeGreaterThan(0)

    supportedEmailDomains.forEach((supportedDomain) => {
      const foundDomain = listedDomains.find(
        (listedDomain) => listedDomain.domain === supportedDomain,
      )
      expect(foundDomain).toBeDefined()
      expect(foundDomain?.isMaskDomain).toBe(false)
      matchedDomaains.push(foundDomain!)
    })

    maskDomains.forEach((maskDomain) => {
      const foundDomain = listedDomains.find(
        (listedDomain) => listedDomain.domain === maskDomain,
      )
      expect(foundDomain).toBeDefined()
      expect(foundDomain?.isMaskDomain).toBe(true)
      matchedDomaains.push(foundDomain!)
    })

    expect(matchedDomaains.length).toEqual(
      supportedEmailDomains.length + maskDomains.length,
    )
  })
})
