/**
 * The Sudo Platform SDK representation of an email message's RFC 822 data.
 *
 * @interface EmailMessageRfc822Data
 * @property {string} id Unique identifier of the email message.
 * @property {ArrayBuffer} rfc822Data The RFC 822 formatted email message content.
 */
export interface EmailMessageRfc822Data {
  id: string
  rfc822Data: ArrayBuffer
}
