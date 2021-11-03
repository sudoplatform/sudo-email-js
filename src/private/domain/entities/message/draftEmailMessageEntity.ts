import { DraftEmailMessageMetadataEntity } from './draftEmailMessageMetadataEntity'

/**
 * Core entity representation of a draft email message.
 *
 * @interface DraftEmailMessageEntity
 * @extends DraftEmailMessageMetadataEntity
 * @property {ArrayBuffer} rfc822Data The encrypted RFC822 data of the draft
 */
export interface DraftEmailMessageEntity
  extends DraftEmailMessageMetadataEntity {
  rfc822Data: ArrayBuffer
}
