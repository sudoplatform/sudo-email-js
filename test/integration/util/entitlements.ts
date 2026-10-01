/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import {
  Entitlement,
  SudoEntitlementsAdminClient,
} from '@sudoplatform/sudo-entitlements-admin'
import waitForExpect from 'wait-for-expect'

export const sudoMaxPerUser = 'sudoplatform.sudo.max'

export const emailStorageMaxPerEmailAddressEntitlement =
  'sudoplatform.email.emailStorageMaxPerEmailAddress'

export const emailStorageMaxPerUserEntitlement =
  'sudoplatform.email.emailStorageMaxPerUser'

export const emailAddressMaxProvisionsExpendableEntitlement =
  'sudoplatform.email.emailAddressMaxProvisionsExpendable'

export const emailAddressMaxPerSudoEntitlement =
  'sudoplatform.email.emailAddressMaxPerSudo'

export const emailMaskUserEntitledEntitlement =
  'sudoplatform.email.emailMaskUserEntitled'

export const emailMaskMaxPerUserEntitlement =
  'sudoplatform.email.emailMaskMaxPerUser'

export const emailMaskMaxProvisionsExpendableEntitlement =
  'sudoplatform.email.emailMaskMaxProvisionsExpendable'

export const emailAddressUserEntitledEntitlement =
  'sudoplatform.email.emailAddressUserEntitled'

export const emailMessageSendUserEntitledEntitlement =
  'sudoplatform.email.emailMessageSendUserEntitled'

export const emailMessageReceiveUserEntitledEntitlement =
  'sudoplatform.email.emailMessageReceiveUserEntitled'

export const DefaultTestEntitlements: Entitlement[] = [
  {
    name: sudoMaxPerUser,
    description: 'Maximum number of Sudos',
    value: 3,
  },
  {
    name: emailAddressUserEntitledEntitlement,
    description: 'System Test Entitlement',
    value: 1,
  },
  {
    name: emailAddressMaxPerSudoEntitlement,
    description: 'Test Max Addresses Entitlement',
    value: 3,
  },
  {
    name: emailStorageMaxPerEmailAddressEntitlement,
    description: 'Test Max Storage Per Email Address Entitlement',
    value: 500000,
  },
  {
    name: emailStorageMaxPerUserEntitlement,
    description: 'Test Max Storage Per User Entitlement',
    value: 500000,
  },
  {
    name: emailAddressMaxProvisionsExpendableEntitlement,
    description: 'Test Max Addresses Per User Entitlement',
    value: 60, // Equivalent to SudoMax value
  },
  {
    name: emailMessageSendUserEntitledEntitlement,
    description: 'Test Email Message Send User Entitlement',
    value: 1,
  },
  {
    name: emailMessageReceiveUserEntitledEntitlement,
    description: 'Test Email Message Receive User Entitlement',
    value: 1,
  },
  {
    name: emailMaskUserEntitledEntitlement,
    description: 'System Test Mask Provision Entitlement',
    value: 1,
  },
  {
    name: emailMaskMaxPerUserEntitlement,
    description: 'Test Email Mask Max Per User Entitlement',
    value: 50,
  },
  {
    name: emailMaskMaxProvisionsExpendableEntitlement,
    description:
      'Maximum number of email masks a user can provision over the lifetime of the account',
    value: 100,
  },
]

export class EntitlementsBuilder {
  private entitlementsClient?: SudoEntitlementsClient
  private entitlementsAdminClient?: SudoEntitlementsAdminClient
  private entitlements: Entitlement[] = DefaultTestEntitlements

  private log: Logger = new DefaultLogger(this.constructor.name)

  setEntitlementsClient(
    entitlementsClient: SudoEntitlementsClient,
  ): EntitlementsBuilder {
    this.entitlementsClient = entitlementsClient
    return this
  }

  setEntitlementsAdminClient(
    entitlementsAdminClient: SudoEntitlementsAdminClient,
  ): EntitlementsBuilder {
    this.entitlementsAdminClient = entitlementsAdminClient
    return this
  }

  setEntitlement(entitlement: Entitlement): EntitlementsBuilder {
    const existing = this.entitlements.find((e) => e.name === entitlement.name)
    if (existing) {
      existing.value = entitlement.value
    } else {
      this.entitlements.push(entitlement)
    }
    return this
  }

  setLogger(log: Logger): EntitlementsBuilder {
    this.log = log
    return this
  }

  async apply(): Promise<void> {
    if (!this.entitlementsClient) {
      throw 'Entitlements client not set'
    }
    if (!this.entitlementsAdminClient) {
      throw 'Entitlements admin client not set'
    }

    this.log.info('Retrieving users external ID')
    const externalId = await this.entitlementsClient
      .getExternalId()
      .catch((err) => {
        this.log.error('Cannot retrieve external ID', { err })
        throw err
      })

    this.log.info('Applying entitlements')
    const appliedEntitlements = await this.entitlementsAdminClient
      .applyEntitlementsToUser(externalId, this.entitlements)
      .catch((err) => {
        this.log.error('Cannot apply entitlements', { err })
        throw err
      })

    this.log.debug('applied entitlements to user', {
      externalId,
      entitlements: appliedEntitlements,
    })

    this.log.info('Redeeming entitlements')
    const redeemedEntitlements = await this.entitlementsClient
      .redeemEntitlements()
      .catch((err) => {
        this.log.error('Cannot redeem entitlements', { err })
        throw err
      })

    this.log.debug('redeemed entitlements', { redeemedEntitlements })
    this.log.debug('redeemed entitlements details', {
      redeemedDetails: redeemedEntitlements.entitlements,
    })

    await waitForExpect(
      async () => {
        const emailEntitlements =
          await this.entitlementsClient?.getEntitlements()
        const emailUserEntitled = emailEntitlements?.entitlements.find(
          (e) => e.name === 'sudoplatform.email.emailAddressUserEntitled',
        )
        expect(emailUserEntitled?.value).toBeGreaterThanOrEqual(1)
      },
      30000,
      1000,
    )
  }
}
