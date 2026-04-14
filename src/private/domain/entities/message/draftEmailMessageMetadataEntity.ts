/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core entity representation of a draft email message metadata.
 *
 * @interface DraftEmailMessageDraftEntity
 * @property {string} id The unique ID of the draft email message.
 * @property emailAddressId [String] Unique identifier of the email address associated with the draft
 *  email message.
 * @property {Date} updatedAt The time at which the draft was last updated.
 * @property {string} emailMaskId Optional unique identifier of the email mask associated with the draft
 */
export interface DraftEmailMessageMetadataEntity {
  id: string
  emailAddressId: string
  updatedAt: Date
  emailMaskId?: string
}
