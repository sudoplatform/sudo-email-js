/**
 * The Sudo Platform SDK representation of the draft email message data.
 *
 * @interface DraftEmailMessage
 * @property {string} id Unique identifier of the draft email message.
 * @property {ArrayBuffer} rfc822Data The RFC 822 formatted draft email message content.
 */
export interface DraftEmailMessage {
  id: string
  rfc822Data: ArrayBuffer
}
