/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptionAlgorithm } from '@sudoplatform/sudo-common'
import {
  BlockEmailAddressesBulkUpdateOutput,
  BlockEmailAddressesForOwnerInput,
  EmailAddressBlocklistService,
  UnblockEmailAddressesForOwnerInput,
} from '../../domain/entities/blocklist/emailAddressBlocklistService'
import { ApiClient } from '../common/apiClient'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import {
  BlockEmailAddressesInput,
  BlockedAddressHashAlgorithm,
  UnblockEmailAddressesInput,
  UpdateEmailMessagesStatus,
} from '../../../gen/graphqlTypes'
import EmailAddressParser from '../../domain/entities/common/mechanisms/emailAddressParser'
import { DefaultEmailAddressParser } from '../common/mechanisms/defaultEmailAddressParser'
import { InvalidArgumentError, MissingKeyError } from '../../../public'
import { generateHash } from '../../util/stringUtils'

export class DefaultEmailAddressBlocklistService
  implements EmailAddressBlocklistService
{
  private readonly parser: EmailAddressParser
  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
  ) {
    this.parser = new DefaultEmailAddressParser()
  }

  async blockEmailAddressesForOwner(
    input: BlockEmailAddressesForOwnerInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput> {
    const { blockedAddresses: cleartextBlockedAddresses } = input
    if (cleartextBlockedAddresses.length === 0) {
      throw new InvalidArgumentError(
        'At least one valid email address must be passed',
      )
    }
    const symmetricKeyId = await this.deviceKeyWorker.getCurrentSymmetricKeyId()

    if (!symmetricKeyId) {
      throw new MissingKeyError('No key found')
    }
    const sealedBlockedEmailAddressesPromises: Promise<string>[] = []
    const hashedBlockedValues: string[] = []
    cleartextBlockedAddresses
      .reduce((accum, address) => {
        const normalized = this.parser.normalize(address)
        if (accum.includes(normalized)) {
          throw new InvalidArgumentError(
            'Duplicate email address found. Please include each address only once.',
          )
        }
        accum.push(normalized)
        return accum
      }, [] as string[])
      .forEach((address) => {
        sealedBlockedEmailAddressesPromises.push(
          this.deviceKeyWorker.sealString({
            keyId: symmetricKeyId,
            payload: new TextEncoder().encode(address),
            keyType: KeyType.SymmetricKey,
          }),
        )
        hashedBlockedValues.push(generateHash(`${input.owner}|${address}`))
      })

    const sealedBlockedEmailAddresses = await Promise.all(
      sealedBlockedEmailAddressesPromises,
    )

    const blockEmailAddressesInput: BlockEmailAddressesInput = {
      owner: input.owner,
      blockedAddresses: input.blockedAddresses.map((_, index) => ({
        hashAlgorithm: BlockedAddressHashAlgorithm.Sha256,
        hashedBlockedValue: hashedBlockedValues[index],
        sealedValue: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: symmetricKeyId,
          plainTextType: 'string',
          base64EncodedSealedData: sealedBlockedEmailAddresses[index],
        },
      })),
    }

    const result = await this.appSync.blockEmailAddresses(
      blockEmailAddressesInput,
    )

    if (
      result.status === UpdateEmailMessagesStatus.Failed ||
      result.status === UpdateEmailMessagesStatus.Success
    ) {
      return { status: result.status }
    }

    // We have a partial status so we need to map the hashed values that were returned in each array
    // to the cleartext email addresses we passed in and return those
    return {
      status: result.status,
      failedAddresses: result.failedAddresses?.map((hashedAddress) => {
        const index = hashedBlockedValues.indexOf(hashedAddress)
        return cleartextBlockedAddresses[index]
      }),
      successAddresses: result.successAddresses?.map((hashedAddress) => {
        const index = hashedBlockedValues.indexOf(hashedAddress)
        return cleartextBlockedAddresses[index]
      }),
    }
  }

  async unblockEmailAddressesForOwner(
    input: UnblockEmailAddressesForOwnerInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput> {
    const { unblockedAddresses: cleartextUnblockedAddresses, owner } = input
    if (cleartextUnblockedAddresses.length === 0) {
      throw new InvalidArgumentError(
        'At least one valid email address must be passed',
      )
    }

    const hashedBlockedValues: string[] = []
    cleartextUnblockedAddresses
      .reduce((accum, address) => {
        const normalized = this.parser.normalize(address)
        if (accum.includes(normalized)) {
          throw new InvalidArgumentError(
            'Duplicate email address found. Please include each address only once.',
          )
        }
        accum.push(normalized)
        return accum
      }, [] as string[])
      .forEach((address) => {
        hashedBlockedValues.push(generateHash(`${owner}|${address}`))
      })

    const unblockEmailAddressesInput: UnblockEmailAddressesInput = {
      owner,
      unblockedAddresses: hashedBlockedValues,
    }
    const result = await this.appSync.unblockEmailAddresses(
      unblockEmailAddressesInput,
    )

    if (
      result.status === UpdateEmailMessagesStatus.Failed ||
      result.status === UpdateEmailMessagesStatus.Success
    ) {
      return { status: result.status }
    }

    // We have a partial status so we need to map the hashed values that were returned in each array
    // to the cleartext email addresses we passed in and return those
    return {
      status: result.status,
      failedAddresses: result.failedAddresses?.map((hashedAddress) => {
        const index = hashedBlockedValues.indexOf(hashedAddress)
        return cleartextUnblockedAddresses[index]
      }),
      successAddresses: result.successAddresses?.map((hashedAddress) => {
        const index = hashedBlockedValues.indexOf(hashedAddress)
        return cleartextUnblockedAddresses[index]
      }),
    }
  }

  async getEmailAddressBlocklistForOwner(input: {
    owner: string
  }): Promise<string[]> {
    const response = await this.appSync.getEmailAddressBlocklist(input.owner)

    if (response.sealedBlockedAddresses.length === 0) {
      return []
    }

    const unsealedBlockedEmailAddressesPromises: Promise<string>[] = []

    response.sealedBlockedAddresses.forEach((sealedAddress) => {
      unsealedBlockedEmailAddressesPromises.push(
        this.deviceKeyWorker.unsealString({
          encrypted: sealedAddress.base64EncodedSealedData,
          keyId: sealedAddress.keyId,
          keyType: KeyType.SymmetricKey,
        }),
      )
    })

    return await Promise.all(unsealedBlockedEmailAddressesPromises)
  }
}
