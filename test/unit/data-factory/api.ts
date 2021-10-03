import { ListOutput, Owner } from '@sudoplatform/sudo-common'
import { EmailAddress } from '../../../src/public/typings/emailAddress'
import { EmailFolder } from '../../../src/public/typings/emailFolder'
import {
  Direction,
  EmailMessage,
  State,
} from '../../../src/public/typings/emailMessage'

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

  static readonly emailAddress: EmailAddress = {
    ...APIDataFactory.commonProps,
    lastReceivedAt: new Date(3.0),
    owners: [APIDataFactory.owner],
    identityId: 'testIdentityId',
    emailAddress: 'testie@unittest.org',
    size: 0,
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

  static readonly emailFolderListOutput: ListOutput<EmailFolder> = {
    items: [APIDataFactory.emailFolder],
    nextToken: undefined,
  }

  static readonly emailMessage: EmailMessage = {
    ...APIDataFactory.commonProps,
    owners: [APIDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderId: 'testFolderId',
    seen: false,
    direction: Direction.Outbound,
    state: State.Sent,
    clientRefId: 'testClientRefId',
    from: [{ emailAddress: 'testie@unittest.org' }],
    to: [{ emailAddress: 'testie@unittest.org' }],
    bcc: [],
    cc: [],
    replyTo: [],
    subject: 'testSubject',
    sortDate: new Date(1.0),
  }
}
