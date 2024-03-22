/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Base64,
  DecodeError,
  DefaultLogger,
  EncryptionAlgorithm,
  Logger,
} from '@sudoplatform/sudo-common'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import { arrayBufferToString, stringToArrayBuffer } from '../../util/buffer'
import { SealedKey } from '../../domain/entities/secure/sealedKey'
import { SecureData } from '../../domain/entities/secure/secureData'
import { SecurePackage } from '../../domain/entities/secure/securePackage'
import { EmailAttachment, InvalidEmailContentsError } from '../../../public'
import {
  SecureEmailAttachmentType,
  SecureEmailAttachmentTypeInterface,
} from '../../domain/entities/secure/secureEmailAttachmentType'
import { EmailMessageCryptoService } from '../../domain/entities/secure/emailMessageCryptoService'
import { SecureDataTransformer } from './transformer/secureDataTransformer'
import { SealedKeyTransformer } from './transformer/sealedKeyTransformer'

const IV_BYTES_SIZE = 16

export class DefaultEmailMessageCryptoService
  implements EmailMessageCryptoService
{
  private readonly log: Logger

  constructor(private readonly deviceKeyWorker: DeviceKeyWorker) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async encrypt(data: ArrayBuffer, keyIds: string[]): Promise<SecurePackage> {
    if (data.byteLength === 0) {
      throw new InvalidEmailContentsError('Encrypted email data empty')
    }

    if (keyIds.length === 0) {
      throw new InvalidEmailContentsError('No recipients for encrypted email')
    }

    try {
      const iv = await this.deviceKeyWorker.generateRandomData(IV_BYTES_SIZE)
      const sealingResults = await this.deviceKeyWorker.sealWithKeyPairIds({
        keyIds,
        payload: data,
        iv,
      })

      const secureEmailData: SecureData = {
        encryptedData: sealingResults.sealedPayload,
        initVectorData: iv,
      }
      const serializedEmailData = stringToArrayBuffer(
        SecureDataTransformer.toJson(secureEmailData),
      )
      const secureBodyAttachment = this.buildEmailAttachment(
        serializedEmailData,
        SecureEmailAttachmentType.BODY,
      )

      const secureKeyAttachments = sealingResults.sealedCipherKeys.map(
        (sealedResult, index) => {
          const sealedKey: SealedKey = {
            publicKeyId: sealedResult.keyId,
            encryptedKey: Base64.encode(sealedResult.sealedValue),
            algorithm: EncryptionAlgorithm.RsaOaepSha1,
          }

          return this.buildEmailAttachment(
            stringToArrayBuffer(SealedKeyTransformer.toJson(sealedKey)),
            SecureEmailAttachmentType.KEY_EXCHANGE,
            index + 1,
          )
        },
      )

      return new SecurePackage(
        new Set(secureKeyAttachments),
        secureBodyAttachment,
      )
    } catch (error) {
      this.log.error('Error encrypting email body and keys', { error })
      throw error
    }
  }

  async decrypt(securePackage: SecurePackage): Promise<ArrayBuffer> {
    const keyAttachments = securePackage.getKeyAttachments()
    const bodyAttachment = securePackage.getBodyAttachment()
    try {
      const keyExistPromises = await Promise.all(
        keyAttachments.map(async (keyAttachment) => {
          const keyData = SealedKeyTransformer.fromJson(keyAttachment.data)
          return {
            exists: await this.deviceKeyWorker.keyExists(
              keyData.publicKeyId,
              KeyType.KeyPair,
            ),
            keyData,
          }
        }),
      )
      const sealedKey = keyExistPromises.find((val) => val.exists)?.keyData

      if (!sealedKey) {
        throw new DecodeError('No public key for this user found')
      }
      const secureData = SecureDataTransformer.fromJson(bodyAttachment.data)

      const decryptedBody = await this.deviceKeyWorker.unsealWithKeyPairId({
        keyPairId: sealedKey.publicKeyId,
        sealedCipherKey: Base64.decode(sealedKey.encryptedKey),
        sealedPayload: secureData.encryptedData,
        iv: secureData.initVectorData,
      })
      return decryptedBody
    } catch (error) {
      this.log.error('Error decrypting email body and keys', { error })
      throw error
    }
  }

  private buildEmailAttachment(
    data: ArrayBuffer,
    attachmentType: SecureEmailAttachmentTypeInterface,
    attachmentNumber = -1,
  ): EmailAttachment {
    const filename =
      attachmentNumber >= 0
        ? `${attachmentType.fileName} ${attachmentNumber}`
        : attachmentType.fileName

    return {
      filename,
      contentId: attachmentType.contentId,
      inlineAttachment: false,
      mimeType: attachmentType.mimeType,
      data: arrayBufferToString(data),
      contentTransferEncoding: 'binary',
    }
  }
}
