/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AvailableAddresses,
  BlockEmailAddressesBulkUpdateResult,
  EmailAddress,
  EmailAddressConnection,
  EmailAddressPublicInfo,
  EmailAddressWithoutFoldersFragment,
  EmailConfigurationData,
  EmailFolder,
  EmailFolderConnection,
  EmailMessageConnection,
  EmailMessageDirection,
  EmailMessageState,
  GetEmailAddressBlocklistResponse,
  GetEmailAddressBlocklistResponseFragment,
  KeyFormat,
  Owner,
  ProvisionEmailAddressPublicKeyInput,
  PublicKey,
  SealedAttribute,
  SealedEmailMessage,
  SupportedDomains,
  UpdateEmailMessagesStatus,
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

  static readonly configurationData: EmailConfigurationData = {
    deleteEmailMessagesLimit: 100,
    updateEmailMessagesLimit: 100,
    emailMessageMaxInboundMessageSize: 10485760,
    emailMessageMaxOutboundMessageSize: 10485760,
  }

  static readonly emailFolder: EmailFolder = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderName: 'testName',
    size: 1,
    unseenCount: 1,
    ttl: undefined,
    customFolderName: undefined,
  }

  static readonly customEmailFolderName: SealedAttribute = {
    algorithm: 'AES/CBC/PKCS7Padding',
    keyId: 'keyId',
    plainTextType: 'string',
    base64EncodedSealedData: 'XCetZSBBbGlzzz==',
  }

  static readonly emailFolderWithCustomFolderName: EmailFolder = {
    ...GraphQLDataFactory.emailFolder,
    customFolderName: GraphQLDataFactory.customEmailFolderName,
  }

  static readonly emailAddressWithoutFolders: EmailAddressWithoutFoldersFragment =
    {
      ...GraphQLDataFactory.commonProps,
      owners: [GraphQLDataFactory.owner],
      identityId: 'testIdentityId',
      keyRingId: 'testKeyRingId',
      keyIds: [],
      emailAddress: 'testie@unittest.org',
      lastReceivedAtEpochMs: 3.0,
      size: 0,
    }

  static readonly emailAddress: EmailAddress = {
    ...GraphQLDataFactory.emailAddressWithoutFolders,
    folders: [GraphQLDataFactory.emailFolder],
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

  static readonly emailFolderConnection: EmailFolderConnection = {
    items: [GraphQLDataFactory.emailFolder],
    nextToken: undefined,
  }

  static readonly blockedAddressUpdateResult: BlockEmailAddressesBulkUpdateResult =
    {
      status: UpdateEmailMessagesStatus.Success,
    }

  static readonly getEmailAddressBlocklistResult: GetEmailAddressBlocklistResponseFragment =
    {
      blockedAddresses: [
        {
          hashedBlockedValue: 'hashedValue',
          sealedValue: {
            algorithm: 'sealingAlgorithm',
            base64EncodedSealedData: 'sealedData1',
            keyId: 'keyId',
            plainTextType: ' string',
          },
        },
        {
          hashedBlockedValue: 'hashedValue',
          sealedValue: {
            algorithm: 'sealingAlgorithm',
            base64EncodedSealedData: 'sealedData2',
            keyId: 'keyId',
            plainTextType: ' string',
          },
        },
      ],
    }

  static readonly sealedEmailMessage: SealedEmailMessage = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    emailAddressId: 'testEmailAddressId',
    folderId: 'testFolderId',
    previousFolderId: 'testPreviousFolderId',
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

  static readonly emailAddressesPublicInfo: EmailAddressPublicInfo[] = [
    {
      emailAddress: GraphQLDataFactory.emailAddress.emailAddress,
      keyId: GraphQLDataFactory.publicKey.keyId,
      publicKey: GraphQLDataFactory.publicKey.publicKey,
    },
    {
      emailAddress: `${GraphQLDataFactory.emailAddress.emailAddress}_2`,
      keyId: `${GraphQLDataFactory.publicKey.keyId}_2`,
      publicKey: `${GraphQLDataFactory.publicKey.publicKey}_2`,
    },
  ]
}
