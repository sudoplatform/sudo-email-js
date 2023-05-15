/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of the draft email message metadata.
 *
 * @interface DraftEmailMessageMetadata
 * @property {string} id Unique identifier of the draft email message.
 * @property {Date} updatedAt Time at which the draft was last updated
 */
export interface DraftEmailMessageMetadata {
  id: string
  updatedAt: Date
}
