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
  let emailAliasesEnabled = false

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    userClient = result.userClient
    entitlementsClient = result.entitlementsClient
    profilesClient = result.profilesClient
    sudo = result.sudo
    const config = await instanceUnderTest.getConfigurationData()
    emailAliasesEnabled = config.emailAliasesEnabled
  })

  it('returns expected output', async () => {
    const listedDomains = await instanceUnderTest.listEmailDomains()

    expect(listedDomains).toBeDefined()
    expect(listedDomains.length).toBeGreaterThan(0)

    const supportedEmailDomains = listedDomains.filter(
      (listedDomain) => !listedDomain.isAliasDomain,
    )
    const aliasDomains = emailAliasesEnabled
      ? listedDomains.filter((listedDomain) => listedDomain.isAliasDomain)
      : []

    expect(supportedEmailDomains.length).toBeGreaterThan(0)

    const matchedDomaains: EmailDomain[] = []

    supportedEmailDomains.forEach((supportedDomain) => {
      const foundDomain = listedDomains.find(
        (listedDomain) => listedDomain.domain === supportedDomain.domain,
      )
      expect(foundDomain).toBeDefined()
      expect(foundDomain?.isAliasDomain).toBe(false)
      matchedDomaains.push(foundDomain!)
    })

    aliasDomains.forEach((aliasDomain) => {
      const foundDomain = listedDomains.find(
        (listedDomain) => listedDomain.domain === aliasDomain.domain,
      )
      expect(foundDomain).toBeDefined()
      expect(foundDomain?.isAliasDomain).toBe(true)
      matchedDomaains.push(foundDomain!)
    })

    expect(matchedDomaains.length).toEqual(
      supportedEmailDomains.length + aliasDomains.length,
    )
  })
})
