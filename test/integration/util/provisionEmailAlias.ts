/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { SudoEmailClient } from '../../../src/public/sudoEmailClient'
import { EmailAlias } from '../../../src/public/typings/emailAlias'
import { delay } from '../../util/delay'
import { generateSafeLocalPart } from './provisionEmailAddress'

let aliasDomain: string | undefined = undefined
export const provisionEmailAlias = async (
  ownershipProofToken: string,
  emailClient: SudoEmailClient,
  options?: {
    aliasAddress?: string
    localPart?: string
    realAddress?: string
    metadata?: Record<string, any>
    expiresAt?: Date
  },
): Promise<EmailAlias> => {
  const localPart = options?.localPart ?? generateSafeLocalPart()
  const realAddress =
    options?.realAddress ?? `${generateSafeLocalPart()}@anonyome.com`
  let aliasAddress = options?.aliasAddress
  if (!aliasAddress) {
    if (!aliasDomain) {
      const domainConfigs = await emailClient.listEmailDomains()
      const aliasDomains = domainConfigs
        .filter((config) => config.isAliasDomain === true)
        .map((config) => config.domain)
      if (aliasDomains.length === 0) {
        throw new Error(
          'No supported email domains available to provision alias',
        )
      }
      aliasDomain = aliasDomains[0]
    }
    aliasAddress = `${localPart}@${aliasDomain}`
  }

  const provisioned = await emailClient.provisionEmailAlias({
    aliasAddress,
    ownershipProofToken: ownershipProofToken,
    realAddress,
    metadata: options?.metadata,
    expiresAt: options?.expiresAt,
  })

  // Delay after provisioning to allow settling of eventual consistency of the new alias.
  // In particular, ingress lookup by alias may not find the new alias immediately.
  await delay(3000)

  return provisioned
}
