import { Owner } from '@sudoplatform/sudo-common'

/**
 * The Sudo Platform SDK representation of an email folder.
 *
 * @interface EmailFolder
 * @property {string} id Unique identifier of the email folder.
 * @property {string} owner Identifier of the user that owns the email folder.
 * @property {Owner[]} owners List of identifiers of user/accounts associated with this email folder.
 * @property {string} emailAddressId Identifier of the email address associated with the email folder.
 * @property {string} folderName Name assigned to the email folder (i.e. INBOX, SENT, TRASH, OUTBOX).
 * @property {number} size The total size of all email messages assigned to the email folder.
 * @property {number} unseenCount The total count of unseen email messages assigned to the email folder.
 * @property {number} ttl An optional TTL signifying when email messages are deleted from the email folder.
 * @property {Date} createdAt Date when the email folder was created.
 * @property {Date} updatedAt Date when the email folder was last updated.
 */
export interface EmailFolder {
  id: string
  owner: string
  owners: Owner[]
  emailAddressId: string
  folderName: string
  size: number
  unseenCount: number
  ttl?: number
  version: number
  createdAt: Date
  updatedAt: Date
}
