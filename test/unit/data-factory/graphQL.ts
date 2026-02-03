/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AvailableAddresses,
  BlockEmailAddressesBulkUpdateResult,
  ConfiguredDomains,
  EmailAddress,
  EmailAddressConnection,
  EmailAddressPublicInfo,
  EmailAddressWithoutFoldersFragment,
  EmailConfigurationData,
  EmailFolder,
  EmailFolderConnection,
  EmailMask,
  EmailMaskConnection,
  EmailMaskRealAddressType,
  EmailMaskStatus,
  EmailMessageConnection,
  EmailMessageDirection,
  EmailMessageState,
  GetEmailAddressBlocklistResponseFragment,
  KeyFormat,
  Owner,
  ProvisionEmailAddressPublicKeyInput,
  ProvisionEmailMaskPublicKeyInput,
  PublicKey,
  ScheduledDraftMessage,
  ScheduledDraftMessageConnection,
  ScheduledDraftMessageState,
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
    emailMessageRecipientsLimit: 10,
    encryptedEmailMessageRecipientsLimit: 10,
    sendEncryptedEmailEnabled: true,
    prohibitedFileExtensions: ['.js', '.exe', '.lib'],
    emailMasksEnabled: true,
    externalEmailMasksEnabled: false,
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
      numberOfEmailMessages: 0,
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
    domains: ['unittest.org'],
  }

  static readonly configuredEmailDomains: ConfiguredDomains = {
    domains: ['unittest.org', 'foobar.com'],
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
    repliedTo: false,
    forwarded: false,
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
    emailMaskId: undefined,
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

  static readonly provisionKeyInput: ProvisionEmailMaskPublicKeyInput = {
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
      publicKeyDetails: {
        __typename: 'EmailAddressPublicKey',
        publicKey: GraphQLDataFactory.publicKey.publicKey,
        keyFormat: KeyFormat.RsaPublicKey,
        algorithm: 'testAlgorithm',
      },
    },
    {
      emailAddress: `${GraphQLDataFactory.emailAddress.emailAddress}_2`,
      keyId: `${GraphQLDataFactory.publicKey.keyId}_2`,
      publicKey: `${GraphQLDataFactory.publicKey.publicKey}_2`,
      publicKeyDetails: {
        __typename: 'EmailAddressPublicKey',
        publicKey: `${GraphQLDataFactory.publicKey.publicKey}_2`,
        keyFormat: KeyFormat.Spki,
        algorithm: 'testAlgorithm_2',
      },
    },
  ]

  static readonly scheduledDraftMessage: ScheduledDraftMessage = {
    draftMessageKey: 'dummyPrefix/dummyId',
    emailAddressId: 'dummyEmailAddress',
    owner: 'dummyOwner',
    owners: [GraphQLDataFactory.owner],
    state: ScheduledDraftMessageState.Scheduled,
    sendAtEpochMs: new Date(1.0).getTime(),
    createdAtEpochMs: new Date(1.0).getTime(),
    updatedAtEpochMs: new Date(1.0).getTime(),
    __typename: 'ScheduledDraftMessage',
  }

  static readonly scheduledDraftMessageConnection: ScheduledDraftMessageConnection =
    {
      items: [GraphQLDataFactory.scheduledDraftMessage],
      nextToken: undefined,
    }

  static readonly emailMask: EmailMask = {
    ...GraphQLDataFactory.commonProps,
    owners: [GraphQLDataFactory.owner],
    keyRingId: 'testKeyRingId',
    identityId: 'testIdentityId',
    maskAddress: 'test-mask@anonyome.com',
    realAddress: 'test-real@anonyome.com',
    realAddressType: EmailMaskRealAddressType.Internal,
    status: EmailMaskStatus.Enabled,
    inboundReceived: 0,
    inboundDelivered: 0,
    outboundReceived: 0,
    outboundDelivered: 0,
    spamCount: 0,
    virusCount: 0,
    expiresAtEpochSec: 0.001,
    metadata: {
      algorithm: 'AES/CBC/PKCS7Padding',
      keyId: 'keyId',
      plainTextType: 'json-string',
      base64EncodedSealedData: 'dummySealedData',
    },
  }

  static readonly emailMaskConnection: EmailMaskConnection = {
    items: [GraphQLDataFactory.emailMask],
    nextToken: undefined,
  }
}
