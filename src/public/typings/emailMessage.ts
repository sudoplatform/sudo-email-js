import { Owner } from '@sudoplatform/sudo-common'

/**
 * The Sudo Platform SDK representation of an email message.
 *
 * @interface EmailMessage
 * @property {string} id Unique identifier of the email message.
 * @property {string} owner Identifier of the user that owns the email message.
 * @property {OwnerEntity[]} owners List of identifiers of user/accounts associated with this email message.
 * @property {string} emailAddressId Identifier of the email address that is associated with the
 *   email message - which address sent/received this message.
 * @property {string} folderId Unique identifier of the email folder which the message is assigned to.
 * @property {string} previousFolderId Unique identifier of the previous email folder which the message resource was assigned to, if any.
 * @property {boolean} seen True if the user has previously seen the email message.
 * @property {Direction} direction Direction of the email message.
 * @property {State} state Current state of the email message.
 * @property {string} clientRefId Unique client reference identifier.
 * @property {EmailMessageAddress[]} from List of recipients that the email message was sent from.
 * @property {EmailMessageAddress[]} to List of recipients that the email message is being sent to.
 * @property {EmailMessageAddress[]} cc List of carbon copy recipients of the email message.
 * @property {EmailMessageAddress[]} bcc List of blind carbon copy recipients of the email message.
 * @property {EmailMessageAddress[]} replyTo List of recipients that a reply to this email message will be sent to.
 * @property {string} subject Subject header of the email message.
 * @property {Date} sortDate Date when the email message was processed by the service.
 * @property {Date} createdAt Date when the email message was created.
 * @property {Date} updatedAt Date when the email message was last updated.
 * @property {number} size The size of the encrypted RFC822 data stored in the backend. This value is used to
 * calculate the total storage used by an email address or user and used to enforce email storage related
 * entitlements.
 * @property {Date} sentAt Date when the email message was sent.
 * @property {Date} receivedAt Date when the email message was received.
 */
export interface EmailMessage
  extends EmailMessageProps,
    SealedEmailMessageProps {}

export interface EmailMessageProps {
  id: string
  clientRefId?: string
  owner: string
  owners: Owner[]
  emailAddressId: string
  folderId: string
  previousFolderId?: string
  seen: boolean
  direction: Direction
  state: State
  version: number
  sortDate: Date
  createdAt: Date
  updatedAt: Date
  size: number
}

export interface SealedEmailMessageProps {
  from: EmailMessageAddress[]
  to: EmailMessageAddress[]
  cc: EmailMessageAddress[]
  bcc: EmailMessageAddress[]
  replyTo: EmailMessageAddress[]
  subject?: string
  sentAt?: Date
  receivedAt?: Date
}

export enum Direction {
  Inbound = 'INBOUND',
  Outbound = 'OUTBOUND',
}

export enum State {
  Queued = 'QUEUED',
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  Undelivered = 'UNDELIVERED',
  Failed = 'FAILED',
  Received = 'RECEIVED',
}

export type UpdateEmailMessagesResult = {
  result: boolean
  failedMessageIds: [string]
}

export type EmailMessageAddress = {
  emailAddress: string
  displayName?: string
}
