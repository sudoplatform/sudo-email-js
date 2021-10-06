import {
  AvailableAddresses,
  EmailAddress,
  EmailAddressConnection,
  EmailFolder,
  EmailFolderConnection,
  EmailMessageConnection,
  EmailMessageDirection,
  EmailMessageState,
  KeyFormat,
  Owner,
  ProvisionEmailAddressPublicKeyInput,
  PublicKey,
  SealedAttribute,
  SealedEmailMessage,
  SupportedDomains,
} from '../../../src/gen/graphqlTypes'

export class GraphQLDataFactory {
  private static readonly commonProps = {
    id: 'testId',
    owner: 'testOwner',
    version: 1,
    createdAtEpochMs: 1.0,
    updatedAtEpochMs: 2.0,
  }

  private static readonly sealedProps = {
    algorithm: 'testAlgorithm',
    keyId: 'testKeyId',
  }

  static readonly owner: Owner = {
    id: 'testId',
    issuer: 'testIssuer',
  }

  static readonly emailAddress: EmailAddress = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    identityId: 'testIdentityId',
    keyRingId: 'testKeyRingId',
    keyIds: [],
    emailAddress: 'testie@unittest.org',
    lastReceivedAtEpochMs: 3.0,
    size: 0,
  }

  static readonly emailAddressAlias: SealedAttribute = {
    algorithm: 'AES/CBC/PKCS7Padding',
    keyId: 'keyId',
    plainTextType: 'string',
    base64EncodedSealedData: 'U29tZSBBbGlhcw==',
  }

  static readonly emailAddressWithAlias: EmailAddress = {
    ...GraphQLDataFactory.emailAddress,
    alias: GraphQLDataFactory.emailAddressAlias,
  }

  static readonly emailAddressConnection: EmailAddressConnection = {
    items: [GraphQLDataFactory.emailAddress],
    nextToken: undefined,
  }

  static readonly emailAddressWithAliasConnection: EmailAddressConnection = {
    items: [GraphQLDataFactory.emailAddressWithAlias],
    nextToken: undefined,
  }

  static readonly availableAddresses: AvailableAddresses = {
    addresses: ['testie@unittest.org'],
  }

  static readonly supportedEmailDomains: SupportedDomains = {
    domains: ['testDomain'],
  }

  static readonly emailFolder: EmailFolder = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderName: 'testName',
    size: 1,
    unseenCount: 1,
    ttl: undefined,
  }

  static readonly emailFolderConnection: EmailFolderConnection = {
    items: [GraphQLDataFactory.emailFolder],
    nextToken: undefined,
  }

  static readonly sealedEmailMessage: SealedEmailMessage = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderId: 'testFolderId',
    direction: EmailMessageDirection.Outbound,
    seen: false,
    state: EmailMessageState.Sent,
    clientRefId: 'testClientRefId',
    rfc822Header: {
      algorithm: 'testAlgorithm',
      keyId: 'testKeyId',
      plainTextType: 'json-string',
      base64EncodedSealedData: 'rfc822Header',
    },
    sortDateEpochMs: 1.0,
    size: 12345,
  }

  static readonly emailMessageConnection: EmailMessageConnection = {
    items: [GraphQLDataFactory.sealedEmailMessage],
    nextToken: undefined,
  }

  static readonly publicKey: PublicKey = {
    ...GraphQLDataFactory.commonProps,
    ...GraphQLDataFactory.sealedProps,
    keyRingId: 'testKeyRingId',
    keyFormat: KeyFormat.RsaPublicKey,
    publicKey: 'testPublicKey',
  }

  static readonly provisionKeyInput: ProvisionEmailAddressPublicKeyInput = {
    keyId: 'dummyKeyId',
    keyFormat: KeyFormat.RsaPublicKey,
    algorithm: 'dummyAlgorithm',
    publicKey: 'dummyPublicKey',
  }
}
