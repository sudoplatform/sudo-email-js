/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListOutput, Owner, PublicKeyFormat } from '@sudoplatform/sudo-common'
import { ConfigurationData } from '../../../src/public/typings/configurationData'
import { EmailAddress } from '../../../src/public/typings/emailAddress'
import { EmailAddressPublicInfo } from '../../../src/public/typings/emailAddressPublicInfo'
import { EmailFolder } from '../../../src/public/typings/emailFolder'
import {
  Direction,
  EmailMessage,
  State,
} from '../../../src/public/typings/emailMessage'
import { EncryptionStatus } from '../../../src/public'

export class APIDataFactory {
  private static readonly commonProps = {
    id: 'testId',
    owner: 'testOwner',
    version: 1,
    createdAt: new Date(1.0),
    updatedAt: new Date(2.0),
  }

  static readonly owner: Owner = {
    id: 'testId',
    issuer: 'testIssuer',
  }

  static readonly configurationData: ConfigurationData = {
    deleteEmailMessagesLimit: 100,
    updateEmailMessagesLimit: 100,
    emailMessageMaxInboundMessageSize: 10485760,
    emailMessageMaxOutboundMessageSize: 10485760,
    emailMessageRecipientsLimit: 10,
    encryptedEmailMessageRecipientsLimit: 10,
    sendEncryptedEmailEnabled: true,
  }

  static readonly emailFolder: EmailFolder = {
    ...APIDataFactory.commonProps,
    owners: [APIDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderName: 'testName',
    size: 1,
    unseenCount: 1,
    ttl: undefined,
  }

  static readonly emailFolderWithCustomFolderName: EmailFolder = {
    ...APIDataFactory.emailFolder,
    customFolderName: 'CUSTOM',
  }

  static readonly emailAddress: EmailAddress = {
    ...APIDataFactory.commonProps,
    lastReceivedAt: new Date(3.0),
    owners: [APIDataFactory.owner],
    identityId: 'testIdentityId',
    emailAddress: 'testie@unittest.org',
    size: 0,
    numberOfEmailMessages: 0,
    folders: [{ ...APIDataFactory.emailFolder }],
  }

  static readonly emailAddressPublicInfo: EmailAddressPublicInfo = {
    emailAddress: APIDataFactory.emailAddress.emailAddress,
    keyId: 'testKeyId',
    publicKey: 'testPublicKey',
    publicKeyDetails: {
      publicKey: 'testPublicKey',
      keyFormat: PublicKeyFormat.RSAPublicKey,
      algorithm: 'testAlgorithm',
    },
  }

  static readonly emailFolderListOutput: ListOutput<EmailFolder> = {
    items: [APIDataFactory.emailFolder],
    nextToken: undefined,
  }

  static readonly emailMessage: EmailMessage = {
    ...APIDataFactory.commonProps,
    owners: [APIDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderId: 'testFolderId',
    previousFolderId: 'testPreviousFolderId',
    seen: false,
    repliedTo: false,
    forwarded: false,
    direction: Direction.Outbound,
    state: State.Sent,
    clientRefId: 'testClientRefId',
    from: [{ emailAddress: 'testie@unittest.org' }],
    to: [{ emailAddress: 'testie@unittest.org' }],
    bcc: [],
    cc: [],
    replyTo: [],
    subject: 'testSubject',
    hasAttachments: false,
    sortDate: new Date(1.0),
    size: 12345,
    encryptionStatus: EncryptionStatus.UNENCRYPTED,
    date: new Date(2.0),
  }
}
