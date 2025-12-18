/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DraftEmailMessageMetadataEntity } from './draftEmailMessageMetadataEntity'

/**
 * Core entity representation of a draft email message.
 *
 * @interface DraftEmailMessageEntity
 * @extends DraftEmailMessageMetadataEntity
 * @property {ArrayBuffer} rfc822Data The encrypted RFC822 data of the draft
 */
export interface DraftEmailMessageEntity extends DraftEmailMessageMetadataEntity {
  rfc822Data: ArrayBuffer
}
