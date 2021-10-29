import {
  CachePolicy,
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { DefaultEmailAccountService } from '../../../../../src/private/data/account/defaultEmailAccountService'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import {
  DeviceKeyWorker,
  DeviceKeyWorkerKeyFormat,
  KeyType,
} from '../../../../../src/private/data/common/deviceKeyWorker'
import {
  CheckEmailAddressAvailabilityInput,
  CreateEmailAccountInput,
  DeleteEmailAccountInput,
  UpdateEmailAccountMetadataInput,
} from '../../../../../src/private/domain/entities/account/emailAccountService'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('DefaultEmailAccountService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: DefaultEmailAccountService

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailAccountService(
      instance(mockAppSync),
      instance(mockDeviceKeyWorker),
    )
  })

  describe('create', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.generateKeyPair()).thenResolve({
        id: 'dummyKeyId',
        algorithm: 'dummyAlgorithm',
        data: 'dummyPublicKey',
        format: DeviceKeyWorkerKeyFormat.RsaPublicKey,
      })
    })
    it('calls appSync correctly', async () => {
      when(mockAppSync.provisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const input: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAccount.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
      }
      const provisionedEmailAccount = await instanceUnderTest.create(input)
      expect(provisionedEmailAccount).toStrictEqual(
        EntityDataFactory.emailAccount,
      )
      const [inputArgs] = capture(mockAppSync.provisionEmailAddress).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddress: EntityDataFactory.emailAddress.emailAddress,
        ownershipProofTokens: [EntityDataFactory.owner.id],
        key: GraphQLDataFactory.provisionKeyInput,
      })
      verify(mockAppSync.provisionEmailAddress(anything())).once()
    })

    it('calls sealString and unsealString when alias provided', async () => {
      when(mockAppSync.provisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddressWithAlias,
      )
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )

      const input: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAddressWithAlias,
        ownershipProofToken: EntityDataFactory.owner.id,
      }

      const provisionedEmailAccount = await instanceUnderTest.create(input)

      expect(provisionedEmailAccount).toStrictEqual(
        EntityDataFactory.emailAccountWithEmailAddressAlias,
      )
      const [inputArgs] = capture(mockAppSync.provisionEmailAddress).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddress: EntityDataFactory.emailAddress.emailAddress,
        ownershipProofTokens: [EntityDataFactory.owner.id],
        key: GraphQLDataFactory.provisionKeyInput,
        alias: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: 'keyId',
          plainTextType: 'string',
          base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
        },
      })
      verify(mockAppSync.provisionEmailAddress(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })
  })

  it('Update alias', async () => {
    when(mockAppSync.updateEmailAddressMetadata(anything())).thenResolve(
      GraphQLDataFactory.emailAddressWithAlias.id,
    )
    when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
    when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
      true,
    )
    when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
      'TxsJ3delkBH2I1t0qQDscg==',
    )
    when(mockDeviceKeyWorker.unsealString(anything())).thenResolve('Some Alias')

    const input: UpdateEmailAccountMetadataInput = {
      id: EntityDataFactory.emailAccountWithEmailAddressAlias.id,
      values: {
        alias: 'alias',
      },
    }

    const emailAddressId = await instanceUnderTest.updateMetadata(input)

    expect(emailAddressId).toStrictEqual(
      EntityDataFactory.emailAccountWithEmailAddressAlias.id,
    )
    const [inputArgs] = capture(mockAppSync.updateEmailAddressMetadata).first()
    expect(inputArgs).toStrictEqual<typeof inputArgs>({
      id: EntityDataFactory.emailAccountWithEmailAddressAlias.id,
      values: {
        alias: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: 'keyId',
          plainTextType: 'string',
          base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
        },
      },
    })
    verify(mockAppSync.updateEmailAddressMetadata(anything())).once()
    verify(mockDeviceKeyWorker.sealString(anything())).once()
  })

  describe('delete', () => {
    it('calls appSync correctly', async () => {
      when(mockAppSync.deprovisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddressWithoutFolders,
      )
      const input: DeleteEmailAccountInput = {
        emailAddressId: EntityDataFactory.emailAccount.id,
      }
      const deprovisionedEmailAccount = await instanceUnderTest.delete(input)
      expect(deprovisionedEmailAccount).toStrictEqual({
        ...EntityDataFactory.emailAccount,
        folders: [],
      })
      const [inputArgs] = capture(mockAppSync.deprovisionEmailAddress).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })
      verify(mockAppSync.deprovisionEmailAddress(anything())).once()
    })
  })

  describe('get', () => {
    it('calls appsync correctly', async () => {
      when(mockAppSync.getEmailAddress(anything(), anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const id = v4()
      const result = await instanceUnderTest.get({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailAddress(anything(), anything())).once()
      const [inputArg, policyArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual(EntityDataFactory.emailAccount)
    })

    it('calls unseal when email address has alias', async () => {
      when(mockAppSync.getEmailAddress(anything(), anything())).thenResolve(
        GraphQLDataFactory.emailAddressWithAlias,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )

      const id = v4()
      const result = await instanceUnderTest.get({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailAddress(anything(), anything())).once()
      const [inputArg, policyArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual(
        EntityDataFactory.emailAccountWithEmailAddressAlias,
      )
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })

    it('calls appsync correctly with undefined result', async () => {
      when(mockAppSync.getEmailAddress(anything(), anything())).thenResolve(
        undefined,
      )
      const id = v4()
      const result = await instanceUnderTest.get({
        id,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(mockAppSync.getEmailAddress(anything(), anything())).once()
      const [inputArg, policyArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toEqual(undefined)
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(mockAppSync.getEmailAddress(anything(), anything())).thenResolve(
          GraphQLDataFactory.emailAddress,
        )
        const id = v4()
        await expect(
          instanceUnderTest.get({
            id,
            cachePolicy,
          }),
        ).resolves.toEqual(EntityDataFactory.emailAccount)
        verify(mockAppSync.getEmailAddress(anything(), anything())).once()
      },
    )
  })

  describe('list', () => {
    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressConnection)
      const result = await instanceUnderTest.list({
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [policyArg] = capture(mockAppSync.listEmailAddresses).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: undefined,
      })
    })

    it('calls unseal when alias found', async () => {
      when(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressWithAliasConnection)
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )
      const numberOfEmailAddresses =
        GraphQLDataFactory.emailAddressWithAliasConnection.items.length

      const result = await instanceUnderTest.list({
        cachePolicy: CachePolicy.CacheOnly,
      })

      verify(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        numberOfEmailAddresses,
      )
      const [policyArg] = capture(mockAppSync.listEmailAddresses).first()
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccountWithEmailAddressAlias],
        nextToken: undefined,
      })
    })

    it('returns partial result with KeyNotFoundError when alias key missing', async () => {
      when(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve({
        items: [
          GraphQLDataFactory.emailAddressWithAlias,
          {
            ...GraphQLDataFactory.emailAddressWithAlias,
            alias: {
              algorithm: 'AES/CBC/PKCS7Padding',
              keyId: 'badKeyId',
              plainTextType: 'string',
              base64EncodedSealedData: 'U29tZSBBbGlhcw==',
            },
          },
        ],
        nextToken: undefined,
      })
      when(
        mockDeviceKeyWorker.keyExists('keyId', KeyType.SymmetricKey),
      ).thenResolve(true)
      when(
        mockDeviceKeyWorker.keyExists('badKeyId', KeyType.SymmetricKey),
      ).thenResolve(false)
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )
      const result = await instanceUnderTest.list({
        cachePolicy: CachePolicy.CacheOnly,
      })

      verify(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      expect(result).toStrictEqual({
        emailAccounts: [
          {
            ...EntityDataFactory.emailAccountWithEmailAddressAlias,
            status: { type: 'Completed' },
          },
          {
            ...EntityDataFactory.emailAccountWithEmailAddressAlias,
            emailAddress: {
              emailAddress: 'testie@unittest.org',
            },
            status: { type: 'Failed', cause: new KeyNotFoundError() },
          },
        ],
        nextToken: undefined,
      })
    })

    it('returns partial result with KeyNotFoundError when message key missing', async () => {
      when(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve({
        items: [
          GraphQLDataFactory.emailAddressWithAlias,
          {
            ...GraphQLDataFactory.emailAddress,
            keyIds: ['badKeyId'],
          },
        ],
        nextToken: undefined,
      })
      when(
        mockDeviceKeyWorker.keyExists('keyId', KeyType.SymmetricKey),
      ).thenResolve(true)
      when(
        mockDeviceKeyWorker.keyExists('badKeyId', KeyType.KeyPair),
      ).thenResolve(false)
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )

      const result = await instanceUnderTest.list({
        cachePolicy: CachePolicy.CacheOnly,
      })

      verify(
        mockAppSync.listEmailAddresses(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      expect(result).toStrictEqual({
        emailAccounts: [
          {
            ...EntityDataFactory.emailAccountWithEmailAddressAlias,
            status: { type: 'Completed' },
          },
          {
            ...EntityDataFactory.emailAccount,
            emailAddress: {
              emailAddress: 'testie@unittest.org',
            },
            status: { type: 'Failed', cause: new KeyNotFoundError() },
          },
        ],
        nextToken: undefined,
      })
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(
          mockAppSync.listEmailAddresses(
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailAddressConnection)
        await expect(
          instanceUnderTest.list({
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          emailAccounts: [EntityDataFactory.emailAccount],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailAddresses(
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )
  })

  describe('listForSudoId', () => {
    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressConnection)
      const sudoId = v4()
      const result = await instanceUnderTest.listForSudoId({
        sudoId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailAddressesForSudoId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(sudoId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: undefined,
      })
    })

    it('calls unseal correctly', async () => {
      when(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressWithAliasConnection)
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )

      const sudoId = v4()
      const result = await instanceUnderTest.listForSudoId({
        sudoId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      const [inputArg, policyArg] = capture(
        mockAppSync.listEmailAddressesForSudoId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(sudoId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccountWithEmailAddressAlias],
        nextToken: undefined,
      })
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(
          mockAppSync.listEmailAddressesForSudoId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(GraphQLDataFactory.emailAddressConnection)
        const sudoId = v4()
        await expect(
          instanceUnderTest.listForSudoId({
            sudoId,
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          emailAccounts: [EntityDataFactory.emailAccount],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailAddressesForSudoId(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )
  })

  describe('checkAvailability', () => {
    it('calls appSync correctly', async () => {
      when(mockAppSync.checkEmailAddressAvailability(anything())).thenResolve(
        GraphQLDataFactory.availableAddresses,
      )
      const input: CheckEmailAddressAvailabilityInput = {
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain],
      }
      const availableAddress = await instanceUnderTest.checkAvailability(input)
      expect(availableAddress).toStrictEqual([EntityDataFactory.emailAddress])
      const [inputArgs] = capture(
        mockAppSync.checkEmailAddressAvailability,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        localParts: ['foo'],
        domains: [EntityDataFactory.emailDomain.domain],
      })
      verify(mockAppSync.checkEmailAddressAvailability(anything())).once()
    })
  })

  describe('getSupportedEmailDomains', () => {
    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        when(mockAppSync.getSupportedEmailDomains(anything())).thenResolve(
          GraphQLDataFactory.supportedEmailDomains,
        )
        await expect(
          instanceUnderTest.getSupportedEmailDomains({ cachePolicy }),
        ).resolves.toStrictEqual([EntityDataFactory.emailDomain])
        verify(mockAppSync.getSupportedEmailDomains(anything())).once()
      },
    )
  })
})
