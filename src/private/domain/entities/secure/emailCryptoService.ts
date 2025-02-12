/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAddressPublicInfoEntity } from '../account/emailAddressPublicInfoEntity'
import { SecurePackage } from './securePackage'

/**
 * Core entity representation of an email crypto service used for encryption
 * and decryption of in-network email messages
 *
 * @interface EmailCryptoService
 */
export interface EmailCryptoService {
  /**
   * Encrypt email data that can be decrypted by all the recipients.
   *
   * @param {ArrayBuffer} data The body of the email that should be encrypted.
   * @param {EmailAddressPublicInfoEntity[]} emailAddressPublicInfo The list of public key ids that must be able to decrypt the message.
   * @return Return the encrypted body and a sealed key for each recipient.
   */
  encrypt(
    data: ArrayBuffer,
    emailAddressPublicInfo: EmailAddressPublicInfoEntity[],
  ): Promise<SecurePackage>

  /**
   * Decrypt email body using the key belonging to the current recipient.
   *
   * @param {SecurePackage} securePackage Contains the secureEmailBody and sealedKeys:
   *    secureEmailBody: Contains the encrypted body of the email message.
   *    sealedKeys: Contains the decryption keys for the email message.
   * @return Return the decrypted body of the email message.
   */
  decrypt(securePackage: SecurePackage): Promise<ArrayBuffer>
}
