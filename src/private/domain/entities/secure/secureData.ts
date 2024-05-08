/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Representation of secure data items that can be encoded and decoded to and from
 * JSON.
 *
 * @interface SecureData
 * @property {ArrayBuffer} encryptedData The secure encrypted base64 encoded data.
 * @property {ArrayBuffer} initVectorKeyID The base64 encoded initialization vector.
 */
export interface SecureData {
  encryptedData: ArrayBuffer
  initVectorKeyID: ArrayBuffer
}
