/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src/public/sudoEmailClient'
import { EmailAddress } from '../../../src/public/typings/emailAddress'
import { delay } from '../../util/delay'

export const provisionEmailAddress = async (
  ownershipProofToken: string,
  emailClient: SudoEmailClient,
  options?: { address?: string; localPart?: string; alias?: string },
): Promise<EmailAddress> => {
  const localPart = options?.localPart ?? generateSafeLocalPart()
  let address = options?.address
  if (!address) {
    const [domain] = await emailClient
      .getSupportedEmailDomains(CachePolicy.RemoteOnly)
      .catch((err) => {
        console.log('Error getting supported email domains', { err })
        throw err
      })
    address = `${localPart}@${domain}`
  }

  const provisioned = await emailClient.provisionEmailAddress({
    emailAddress: address,
    ownershipProofToken: ownershipProofToken,
    alias: options?.alias,
  })

  // Delay after provisioning to allow settling of eventual consistency of the new address.
  // In particular, ingress lookup by address may not find the new address immediately.
  await delay(3000)

  return provisioned
}

/**
 *
 * @param prefix generate a safe email address local part by converting hexadecimal uuid
 * characters to their decimal equivalents. This ensures that excluded words, eg, 'dead' are not
 * inadvertently included in the email address local part.
 * @returns a valid, 'random' email address local part
 */
export function generateSafeLocalPart(prefix?: string): string {
  prefix = prefix ?? 'safe-'
  const safeMap = new Map([
    ['-', '-'],
    ['0', '0'],
    ['1', '1'],
    ['2', '2'],
    ['3', '3'],
    ['4', '4'],
    ['5', '5'],
    ['6', '6'],
    ['7', '7'],
    ['8', '8'],
    ['9', '9'],
    ['a', '10'],
    ['b', '11'],
    ['c', '12'],
    ['d', '13'],
    ['e', '14'],
    ['f', '15'],
  ])

  const pref = prefix.endsWith('-') ? prefix : prefix + '-'
  const uuid = v4().split('')
  const safePart = (pref + uuid.map((c) => safeMap.get(c)).join('')).substring(
    0,
    63,
  )

  return safePart
}
