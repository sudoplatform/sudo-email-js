import { DraftEmailMessageMetadata } from './draftEmailMessageMetadata'
/**
 * The Sudo Platform SDK representation of the draft email message data.
 *
 * @interface DraftEmailMessage
 * @extends DraftEmailMessageMetadata
 * @property {ArrayBuffer} rfc822Data The RFC 822 formatted draft email message content.
 */
export interface DraftEmailMessage extends DraftEmailMessageMetadata {
  rfc822Data: ArrayBuffer
}
