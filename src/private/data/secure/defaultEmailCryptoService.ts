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
import { EmailAttachment, InvalidArgumentError } from '../../../public'
import { EmailAddressPublicInfoEntity } from '../../domain/entities/account/emailAddressPublicInfoEntity'
import { EmailCryptoService } from '../../domain/entities/secure/emailCryptoService'
import { SealedKey } from '../../domain/entities/secure/sealedKey'
import { SecureData } from '../../domain/entities/secure/secureData'
import {
  SecureEmailAttachmentType,
  SecureEmailAttachmentTypeInterface,
} from '../../domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../../domain/entities/secure/securePackage'
import { arrayBufferToString, stringToArrayBuffer } from '../../util/buffer'
import { DeviceKeyWorker, KeyType } from '../common/deviceKeyWorker'
import { SealedKeyTransformer } from './transformer/sealedKeyTransformer'
import { SecureDataTransformer } from './transformer/secureDataTransformer'

const IV_BYTES_SIZE = 16

export class DefaultEmailCryptoService implements EmailCryptoService {
  private readonly log: Logger

  constructor(private readonly deviceKeyWorker: DeviceKeyWorker) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async encrypt(
    data: ArrayBuffer,
    emailAddressPublicInfo: EmailAddressPublicInfoEntity[],
  ): Promise<SecurePackage> {
    if (data.byteLength === 0 || emailAddressPublicInfo.length === 0) {
      throw new InvalidArgumentError()
    }

    try {
      // Create a symmetric key that will be used to encrypt the input data
      const symmetricKey =
        await this.deviceKeyWorker.generateRandomSymmetricKey()

      // Encrypt the input data using the symmetric key with an AES/CBC/PKCS7Padding cipher
      const iv = await this.deviceKeyWorker.generateRandomData(IV_BYTES_SIZE)
      const encryptedBodyData =
        await this.deviceKeyWorker.encryptWithSymmetricKey({
          key: symmetricKey,
          data,
          iv,
        })

      const secureEmailData: SecureData = {
        encryptedData: encryptedBodyData,
        initVectorKeyID: iv,
      }
      const serializedEmailData = stringToArrayBuffer(
        SecureDataTransformer.toJson(secureEmailData),
      )

      // Build an email attachment of the secure email body data
      const secureBodyAttachment = this.buildEmailAttachment(
        serializedEmailData,
        SecureEmailAttachmentType.BODY,
      )

      // Iterate through each public key for each recipient and encrypt the symmetric key with the public key
      const distinctPublicInfo = emailAddressPublicInfo.filter(
        (value, index, self) =>
          index === self.findIndex((t) => t.keyId === value.keyId),
      )
      const secureKeyAttachments = await Promise.all(
        distinctPublicInfo.map(async (publicInfo, index) => {
          // Seal the symmetric key using the publicKey and RSA_ECB_OAEPSHA1 algorithm
          const encryptedSymmetricKey =
            await this.deviceKeyWorker.encryptWithPublicKey({
              key: Base64.decode(publicInfo.publicKey),
              data: symmetricKey,
              algorithm: EncryptionAlgorithm.RsaOaepSha1,
            })
          const sealedKey: SealedKey = {
            publicKeyId: publicInfo.keyId,
            encryptedKey: Base64.encode(encryptedSymmetricKey),
            algorithm: EncryptionAlgorithm.RsaOaepSha1,
          }
          const sealedKeyData = stringToArrayBuffer(
            SealedKeyTransformer.toJson(sealedKey),
          )

          // Build an email attachment of the sealed keys
          return this.buildEmailAttachment(
            sealedKeyData,
            SecureEmailAttachmentType.KEY_EXCHANGE,
            index + 1,
          )
        }),
      )

      // Return a secure package with the secure key attachments and the secure body attachment
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
          let keyData = keyAttachment.data
          if (keyAttachment.contentTransferEncoding === 'base64') {
            keyData = Base64.decodeString(keyData)
          }
          const keyDataJson = SealedKeyTransformer.fromJson(keyData)
          return {
            exists: await this.deviceKeyWorker.keyExists(
              keyDataJson.publicKeyId,
              KeyType.KeyPair,
            ),
            keyData: keyDataJson,
          }
        }),
      )
      const sealedKey = keyExistPromises.find((val) => val.exists)?.keyData

      if (!sealedKey) {
        throw new DecodeError('No public key for this user found')
      }
      let bodyData = bodyAttachment.data
      if (bodyAttachment.contentTransferEncoding === 'base64') {
        bodyData = Base64.decodeString(bodyData)
      }

      const secureData = SecureDataTransformer.fromJson(bodyData)
      const decryptedBody = await this.deviceKeyWorker.unsealWithKeyPairId({
        keyPairId: sealedKey.publicKeyId,
        sealedCipherKey: Base64.decode(sealedKey.encryptedKey),
        sealedPayload: secureData.encryptedData,
        iv: secureData.initVectorKeyID,
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
