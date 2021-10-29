import {
  PublicKeyEntity,
  PublicKeyEntityFormat,
} from '@sudoplatform/sudo-common-internal'
import { EmailAccountEntity } from '../../../src/private/domain/entities/account/emailAccountEntity'
import { EmailAddressEntity } from '../../../src/private/domain/entities/account/emailAddressEntity'
import { EmailDomainEntity } from '../../../src/private/domain/entities/account/emailDomainEntity'
import { OwnerEntity } from '../../../src/private/domain/entities/common/ownerEntity'
import { EmailFolderEntity } from '../../../src/private/domain/entities/folder/emailFolderEntity'
import { EmailMessageEntity } from '../../../src/private/domain/entities/message/emailMessageEntity'
import { SealedEmailMessageEntity } from '../../../src/private/domain/entities/message/sealedEmailMessageEntity'
import { Direction, State } from '../../../src/public/typings/emailMessage'

export class EntityDataFactory {
  private static readonly commonProps = {
    id: 'testId',
    owner: 'testOwner',
    version: 1,
    createdAt: new Date(1.0),
    updatedAt: new Date(2.0),
  }

  static readonly owner: OwnerEntity = {
    id: 'testId',
    issuer: 'testIssuer',
  }

  static readonly emailAddress: EmailAddressEntity = {
    emailAddress: 'testie@unittest.org',
  }

  static readonly emailAddressWithAlias: EmailAddressEntity = {
    ...EntityDataFactory.emailAddress,
    alias: 'Some Alias',
  }

  static readonly emailFolder: EmailFolderEntity = {
    ...EntityDataFactory.commonProps,
    owners: [EntityDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderName: 'testName',
    size: 1,
    unseenCount: 1,
    ttl: undefined,
  }

  static readonly emailAccount: EmailAccountEntity = {
    ...EntityDataFactory.commonProps,
    owners: [EntityDataFactory.owner],
    identityId: 'testIdentityId',
    keyRingId: 'testKeyRingId',
    emailAddress: EntityDataFactory.emailAddress,
    size: 0,
    lastReceivedAt: new Date(3.0),
    status: { type: 'Completed' },
    folders: [EntityDataFactory.emailFolder],
  }

  static readonly emailAccountWithEmailAddressAlias: EmailAccountEntity = {
    ...EntityDataFactory.commonProps,
    owners: [EntityDataFactory.owner],
    identityId: 'testIdentityId',
    keyRingId: 'testKeyRingId',
    emailAddress: EntityDataFactory.emailAddressWithAlias,
    size: 0,
    lastReceivedAt: new Date(3.0),
    status: { type: 'Completed' },
    folders: [EntityDataFactory.emailFolder],
  }

  static readonly emailDomain: EmailDomainEntity = {
    domain: 'testDomain',
  }

  static readonly emailMessage: EmailMessageEntity = {
    ...EntityDataFactory.commonProps,
    owners: [EntityDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    keyId: 'testKeyId',
    algorithm: 'testAlgorithm',
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
    status: { type: 'Completed' },
    sortDate: new Date(1.0),
    size: 12345,
  }

  static readonly sealedEmailMessage: SealedEmailMessageEntity = {
    ...EntityDataFactory.commonProps,
    owners: [EntityDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    keyId: 'testKeyId',
    algorithm: 'testAlgorithm',
    folderId: 'testFolderId',
    seen: false,
    direction: Direction.Outbound,
    state: State.Sent,
    clientRefId: 'testClientRefId',
    rfc822Header: 'rfc822Header',
    sortDate: new Date(1.0),
    size: 12345,
  }

  static readonly publicKey: PublicKeyEntity = {
    keyId: 'testKeyId',
    keyData: 'testPublicKey',
    keyRingId: 'testKeyRingId',
    keyFormat: PublicKeyEntityFormat.RSAPublicKey,
  }

  static readonly uuidV4Regex = new RegExp(
    /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
  )
}
