/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */


/**
 * Input for `EmailMaskService.verifyExternalEmailAddress`
 *
 * @interface VerifyExternalEmailAddressInput
 * @property {string} emailAddress The external email address to be verified.
 * @property {string} emailMaskId The id of the email mask associated with the email address.
 * @property {string} verificationCode The verification code to verify.
 */
export interface VerifyExternalEmailAddressInput {
  emailAddress: string
  emailMaskId: string
  verificationCode?: string
}

/**
 * Core entity reprentation for a result of verifying an external email address.
 *
 * @interface VerifyExternalEmailAddressResult
 * @property {boolean} isVerified True if verification passes, otherwise false.
 * @property {string} reason If not verified, the reason why.
 */
export interface VerifyExternalEmailAddressResult {
  isVerified: boolean
  reason?: string
}
