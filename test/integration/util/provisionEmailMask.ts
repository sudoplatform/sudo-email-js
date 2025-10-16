/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'

import { SudoEmailClient } from '../../../src/public/sudoEmailClient'
import { EmailMask } from '../../../src/public/typings/emailMask'
import { delay } from '../../util/delay'
import { generateSafeLocalPart } from './provisionEmailAddress'

let maskDomain: string | undefined = undefined
export const provisionEmailMask = async (
  ownershipProofToken: string,
  emailClient: SudoEmailClient,
  options?: {
    maskAddress?: string
    localPart?: string
    realAddress?: string
    metadata?: Record<string, any>
    expiresAt?: Date
  },
): Promise<EmailMask> => {
  const localPart = options?.localPart ?? generateSafeLocalPart()
  const realAddress =
    options?.realAddress ?? `${generateSafeLocalPart()}@anonyome.com`
  let maskAddress = options?.maskAddress
  if (!maskAddress) {
    if (!maskDomain) {
      const domains = await emailClient.getEmailMaskDomains(
        CachePolicy.RemoteOnly,
      )
      if (domains.length === 0) {
        throw new Error(
          'No supported email domains available to provision mask',
        )
      }
      maskDomain = domains[0]
    }
    maskAddress = `${localPart}@${maskDomain}`
  }

  const provisioned = await emailClient.provisionEmailMask({
    maskAddress,
    ownershipProofToken: ownershipProofToken,
    realAddress,
    metadata: options?.metadata,
    expiresAt: options?.expiresAt,
  })

  // Delay after provisioning to allow settling of eventual consistency of the new mask.
  // In particular, ingress lookup by mask may not find the new mask immediately.
  await delay(3000)

  return provisioned
}
