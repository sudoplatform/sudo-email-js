/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecodeError,
  DefaultLogger,
  EncryptionAlgorithm,
  KeyNotFoundError,
  Logger,
} from '@sudoplatform/sudo-common'
import {
  BlockEmailAddressesBulkUpdateOutput,
  BlockEmailAddressesForOwnerInput,
  EmailAddressBlocklistService,
  UnblockEmailAddressesByHashedValueInput,
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
import { UnsealedBlockedAddress } from '../../../public/typings/blockedAddresses'

export class DefaultEmailAddressBlocklistService
  implements EmailAddressBlocklistService
{
  private readonly log: Logger
  private readonly parser: EmailAddressParser
  constructor(
    private readonly appSync: ApiClient,
    private readonly deviceKeyWorker: DeviceKeyWorker,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.parser = new DefaultEmailAddressParser()
  }

  async blockEmailAddressesForOwner(
    input: BlockEmailAddressesForOwnerInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput> {
    this.log.debug('blockEmailAddressesForOwner init', { input })
    const { blockedAddresses: cleartextBlockedAddresses, owner } = input
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
        hashedBlockedValues.push(generateHash(`${owner}|${address}`))
      })

    const sealedBlockedEmailAddresses = await Promise.all(
      sealedBlockedEmailAddressesPromises,
    )

    const blockEmailAddressesInput: BlockEmailAddressesInput = {
      owner,
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
    this.log.debug('unblockEmailAddressesForOwner init', { input })
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

  async unblockEmailAddressesByHashedValue(
    input: UnblockEmailAddressesByHashedValueInput,
  ): Promise<BlockEmailAddressesBulkUpdateOutput> {
    this.log.debug('unblockEmailAddressesByHashedValue init', { input })
    const { hashedValues, owner } = input
    if (hashedValues.length === 0) {
      throw new InvalidArgumentError('At least one hashed value must be passed')
    }

    const unblockEmailAddressesInput: UnblockEmailAddressesInput = {
      owner,
      unblockedAddresses: [...new Set(hashedValues)],
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

    return {
      status: result.status,
      failedAddresses: result.failedAddresses ?? [],
      successAddresses: result.successAddresses ?? [],
    }
  }

  async getEmailAddressBlocklistForOwner(
    owner: string,
  ): Promise<UnsealedBlockedAddress[]> {
    this.log.debug('getEmailAddressBlocklistForOwner init', { owner })
    const response = await this.appSync.getEmailAddressBlocklist(owner)

    if (response.blockedAddresses.length === 0) {
      return []
    }

    let unsealedBlockedEmailAddressesPromises: UnsealedBlockedAddress[] = []

    unsealedBlockedEmailAddressesPromises = await Promise.all(
      response.blockedAddresses.map(
        async (sealed): Promise<UnsealedBlockedAddress> => {
          if (
            await this.deviceKeyWorker.keyExists(
              sealed.sealedValue.keyId,
              KeyType.SymmetricKey,
            )
          ) {
            let unsealedAddress = ''
            try {
              unsealedAddress = await this.deviceKeyWorker.unsealString({
                encrypted: sealed.sealedValue.base64EncodedSealedData,
                keyType: KeyType.SymmetricKey,
                keyId: sealed.sealedValue.keyId,
              })
            } catch (e) {
              this.log.error('Error decoding blocked address', { e })
              return {
                hashedBlockedValue: sealed.hashedBlockedValue,
                status: {
                  type: 'Failed',
                  cause: new DecodeError(),
                },
                address: '',
              }
            }
            return {
              hashedBlockedValue: sealed.hashedBlockedValue,
              status: {
                type: 'Completed',
              },
              address: unsealedAddress,
            }
          } else {
            return {
              hashedBlockedValue: sealed.hashedBlockedValue,
              status: {
                type: 'Failed',
                cause: new KeyNotFoundError(),
              },
              address: '',
            }
          }
        },
      ),
    )

    return unsealedBlockedEmailAddressesPromises
  }
}
