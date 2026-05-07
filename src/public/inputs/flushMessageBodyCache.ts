/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Input for `SudoEmailClient.flushMessageBodyCache`.
 * Exactly one of `sudoId` or `emailAddressId` must be provided.
 *
 * @interface FlushMessageBodyCacheInput
 * @property {string} [sudoId] Flush all cached entries belonging to this sudo ID.
 * @property {string} [emailAddressId] Flush all cached entries belonging to this email address ID.
 */
export interface FlushMessageBodyCacheInput {
  sudoId?: string
  emailAddressId?: string
}
