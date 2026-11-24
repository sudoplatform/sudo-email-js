/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
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
  const generatedPKDeviceKey = EntityDataFactory.deviceKey
  const userPKDeviceKey = {
    ...EntityDataFactory.deviceKey,
    data: 'dummyUserPublicKey',
  }
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: DefaultEmailAccountService

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailAccountService(
      instance(mockAppSync),
      instance(mockDeviceKeyWorker),
      {
        allowCallerManagedKeys: true,
        enforceSingletonPublicKey: false,
      },
    )
  })

  describe('create', () => {
    beforeEach(() => {
      when(mockDeviceKeyWorker.generateKeyPair()).thenResolve(
        generatedPKDeviceKey,
      )
      when(mockDeviceKeyWorker.getSingletonKeyPair()).thenResolve(
        userPKDeviceKey,
      )
    })

    it('calls appSync correctly', async () => {
      when(mockAppSync.provisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const input: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAddress,
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

    it('gets singleton Public Key from keychain when enforced', async () => {
      when(mockAppSync.provisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const iat = new DefaultEmailAccountService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        {
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        },
      )
      const createEmailAccountInput: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
      }
      const provisionedEmailAccount = await iat.create(createEmailAccountInput)
      expect(provisionedEmailAccount).toStrictEqual(
        EntityDataFactory.emailAccount,
      )

      const [inputArgs] = capture(mockAppSync.provisionEmailAddress).first()
      const expectedPublicKeyInput = {
        ...GraphQLDataFactory.provisionKeyInput,
        publicKey: userPKDeviceKey.data,
      }
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddress: EntityDataFactory.emailAddress.emailAddress,
        ownershipProofTokens: [EntityDataFactory.owner.id],
        key: expectedPublicKeyInput,
      })

      verify(mockAppSync.provisionEmailAddress(anything())).once()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).once()
    })

    it('failed result with KeyNotFoundError if symmetric key does not exist and allowSymmeticKeyGeneration false', async () => {
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      const iat = new DefaultEmailAccountService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        {
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        },
      )
      const createEmailAccountInput: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
        allowSymmetricKeyGeneration: false,
      }
      await expect(iat.create(createEmailAccountInput)).rejects.toThrow(
        KeyNotFoundError,
      )

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).never()
      verify(mockAppSync.provisionEmailAddress(anything())).never()
    })

    it('succeeds and generates new key if no key id found', async () => {
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      when(mockAppSync.provisionEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const iat = new DefaultEmailAccountService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        {
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        },
      )
      const createEmailAccountInput: CreateEmailAccountInput = {
        emailAddressEntity: EntityDataFactory.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
      }
      const provisionedEmailAccount = await iat.create(createEmailAccountInput)
      expect(provisionedEmailAccount).toStrictEqual(
        EntityDataFactory.emailAccount,
      )

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
      verify(mockAppSync.provisionEmailAddress(anything())).once()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).once()

      const [inputArgs] = capture(mockAppSync.provisionEmailAddress).first()
      const expectedPublicKeyInput = {
        ...GraphQLDataFactory.provisionKeyInput,
        publicKey: userPKDeviceKey.data,
      }
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddress: EntityDataFactory.emailAddress.emailAddress,
        ownershipProofTokens: [EntityDataFactory.owner.id],
        key: expectedPublicKeyInput,
      })
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
        emailAccount: { ...EntityDataFactory.emailAccount, folders: [] },
        keyIdsNotRemoved: [],
      })
      const [inputArgs] = capture(mockAppSync.deprovisionEmailAddress).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })
      verify(mockAppSync.deprovisionEmailAddress(anything())).once()
    })

    it('does not delete key id of deprovisioned email address if singleton public key is enforced', async () => {
      const deletedKeyId = 'dummyKeyId'
      when(mockAppSync.deprovisionEmailAddress(anything())).thenResolve({
        ...GraphQLDataFactory.emailAddressWithoutFolders,
        keyIds: [deletedKeyId],
      })
      const iat = new DefaultEmailAccountService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        {
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        },
      )

      const input: DeleteEmailAccountInput = {
        emailAddressId: EntityDataFactory.emailAccount.id,
      }
      const deprovisionedEmailAccount = await iat.delete(input)
      expect(deprovisionedEmailAccount).toStrictEqual({
        emailAccount: { ...EntityDataFactory.emailAccount, folders: [] },
        keyIdsNotRemoved: [],
      })

      const [inputArgs] = capture(mockAppSync.deprovisionEmailAddress).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })

      verify(mockAppSync.deprovisionEmailAddress(anything())).once()
      verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
    })

    it('does not remove key pairs when caller managed keys are allowed (the default)', async () => {
      when(mockAppSync.deprovisionEmailAddress(anything())).thenResolve({
        ...GraphQLDataFactory.emailAddressWithoutFolders,
        keyIds: ['keyA'],
      })
      const result = await instanceUnderTest.delete({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })
      expect(result.keyIdsNotRemoved).toStrictEqual([])
      verify(
        mockAppSync.getPublicKeys(anything(), anything(), anything()),
      ).never()
      verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
    })

    describe('when caller managed keys are not allowed', () => {
      const keyRingId = 'deprovisionedKeyRing'
      let service: DefaultEmailAccountService

      const registration = (keyId: string, ring: string) => ({
        ...GraphQLDataFactory.publicKey,
        keyId,
        keyRingId: ring,
      })

      beforeEach(() => {
        service = new DefaultEmailAccountService(
          instance(mockAppSync),
          instance(mockDeviceKeyWorker),
          { allowCallerManagedKeys: false, enforceSingletonPublicKey: false },
        )
        when(mockDeviceKeyWorker.getSingletonKeyId()).thenResolve(undefined)
        when(mockAppSync.deprovisionEmailAddress(anything())).thenResolve({
          ...GraphQLDataFactory.emailAddressWithoutFolders,
          keyRingId,
          keyIds: ['keyA', 'keyB'],
        })
      })

      const deleteAccount = async () =>
        await service.delete({
          emailAddressId: EntityDataFactory.emailAccount.id,
        })

      it('removes key pairs that nothing else uses, ignoring its own key ring', async () => {
        when(
          mockAppSync.getPublicKeys(anything(), anything(), anything()),
        ).thenResolve({
          items: [
            registration('keyA', keyRingId),
            registration('keyB', keyRingId),
          ],
        })
        const result = await deleteAccount()
        expect(result.keyIdsNotRemoved).toStrictEqual([])
        verify(mockDeviceKeyWorker.removeKey('keyA', KeyType.KeyPair)).once()
        verify(mockDeviceKeyWorker.removeKey('keyB', KeyType.KeyPair)).once()
        const [, , keyFormats] = capture(mockAppSync.getPublicKeys).first()
        expect(keyFormats).toStrictEqual([])
      })

      it('keeps a key pair that another address or alias still uses', async () => {
        when(
          mockAppSync.getPublicKeys(anything(), anything(), anything()),
        ).thenResolve({
          items: [registration('keyA', 'otherKeyRing')],
        })
        await deleteAccount()
        verify(mockDeviceKeyWorker.removeKey('keyA', KeyType.KeyPair)).never()
        verify(mockDeviceKeyWorker.removeKey('keyB', KeyType.KeyPair)).once()
      })

      it('reads every page of registrations', async () => {
        when(
          mockAppSync.getPublicKeys(anything(), undefined, anything()),
        ).thenResolve({
          items: [],
          nextToken: 'page2',
        })
        when(
          mockAppSync.getPublicKeys(anything(), 'page2', anything()),
        ).thenResolve({
          items: [registration('keyA', 'otherKeyRing')],
        })
        await deleteAccount()
        verify(mockDeviceKeyWorker.removeKey('keyA', KeyType.KeyPair)).never()
        verify(mockDeviceKeyWorker.removeKey('keyB', KeyType.KeyPair)).once()
      })

      it('never removes the singleton key pair', async () => {
        when(mockDeviceKeyWorker.getSingletonKeyId()).thenResolve('keyA')
        when(
          mockAppSync.getPublicKeys(anything(), anything(), anything()),
        ).thenResolve({
          items: [],
        })
        await deleteAccount()
        verify(mockDeviceKeyWorker.removeKey('keyA', KeyType.KeyPair)).never()
        verify(mockDeviceKeyWorker.removeKey('keyB', KeyType.KeyPair)).once()
      })

      it('removes nothing if the registrations cannot be listed', async () => {
        when(
          mockAppSync.getPublicKeys(anything(), anything(), anything()),
        ).thenReject(new Error('lookup failed'))
        const result = await deleteAccount()
        expect(result.keyIdsNotRemoved).toStrictEqual([])
        verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
      })

      it('removes nothing if the singleton key id cannot be read', async () => {
        when(mockDeviceKeyWorker.getSingletonKeyId()).thenReject(
          new Error('read failed'),
        )
        const result = await deleteAccount()
        expect(result.keyIdsNotRemoved).toStrictEqual([])
        verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
      })

      it('reports key pairs that could not be removed', async () => {
        when(
          mockAppSync.getPublicKeys(anything(), anything(), anything()),
        ).thenResolve({
          items: [],
        })
        when(mockDeviceKeyWorker.removeKey('keyA', KeyType.KeyPair)).thenReject(
          new Error('remove failed'),
        )
        const result = await deleteAccount()
        expect(result.keyIdsNotRemoved).toStrictEqual(['keyA'])
        verify(mockDeviceKeyWorker.removeKey('keyB', KeyType.KeyPair)).once()
      })
    })
  })

  describe('get', () => {
    it('calls appsync correctly', async () => {
      when(mockAppSync.getEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const id = v4()
      const result = await instanceUnderTest.get({
        id,
      })
      verify(mockAppSync.getEmailAddress(anything())).once()
      const [inputArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(result).toEqual(EntityDataFactory.emailAccount)
    })

    it('calls unseal when email address has alias', async () => {
      when(mockAppSync.getEmailAddress(anything())).thenResolve(
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
      })
      verify(mockAppSync.getEmailAddress(anything())).once()
      const [inputArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(result).toEqual(
        EntityDataFactory.emailAccountWithEmailAddressAlias,
      )
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })

    it('tolerates unseal failure on alias', async () => {
      when(mockAppSync.getEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddressWithAlias,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenReject(
        new Error('Some Error'),
      )

      const id = v4()
      const result = await instanceUnderTest.get({
        id,
      })
      verify(mockAppSync.getEmailAddress(anything())).once()
      const [inputArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(result).toEqual({
        ...EntityDataFactory.emailAccountWithEmailAddressAlias,
        displayName: '',
      })
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })

    it('calls appsync correctly with undefined result', async () => {
      when(mockAppSync.getEmailAddress(anything())).thenResolve(undefined)
      const id = v4()
      const result = await instanceUnderTest.get({
        id,
      })
      verify(mockAppSync.getEmailAddress(anything())).once()
      const [inputArg] = capture(mockAppSync.getEmailAddress).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(id)
      expect(result).toEqual(undefined)
    })

    it('returns transformed result when calling getEmailAddress', async () => {
      when(mockAppSync.getEmailAddress(anything())).thenResolve(
        GraphQLDataFactory.emailAddress,
      )
      const id = v4()
      await expect(
        instanceUnderTest.get({
          id,
        }),
      ).resolves.toEqual(EntityDataFactory.emailAccount)
      verify(mockAppSync.getEmailAddress(anything())).once()
    })
  })

  describe('list', () => {
    it('calls appsync correctly', async () => {
      when(mockAppSync.listEmailAddresses(anything(), anything())).thenResolve(
        GraphQLDataFactory.emailAddressConnection,
      )
      const result = await instanceUnderTest.list({})
      verify(mockAppSync.listEmailAddresses(anything(), anything())).once()
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: undefined,
      })
    })

    it('calls unseal when alias found', async () => {
      when(mockAppSync.listEmailAddresses(anything(), anything())).thenResolve(
        GraphQLDataFactory.emailAddressWithAliasConnection,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        'Some Alias',
      )
      const numberOfEmailAddresses =
        GraphQLDataFactory.emailAddressWithAliasConnection.items.length

      const result = await instanceUnderTest.list({})

      verify(mockAppSync.listEmailAddresses(anything(), anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        numberOfEmailAddresses,
      )
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccountWithEmailAddressAlias],
        nextToken: undefined,
      })
    })

    it('returns partial result with KeyNotFoundError when alias key missing', async () => {
      when(mockAppSync.listEmailAddresses(anything(), anything())).thenResolve({
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
      const result = await instanceUnderTest.list({})

      verify(mockAppSync.listEmailAddresses(anything(), anything())).once()
      expect(result).toStrictEqual({
        emailAccounts: [
          {
            ...EntityDataFactory.emailAccountWithEmailAddressAlias,
            status: { type: 'Completed' },
          },
          {
            ...EntityDataFactory.emailAccount,
            status: { type: 'Failed', cause: new KeyNotFoundError() },
          },
        ],
        nextToken: undefined,
      })
    })

    it('returns partial result with KeyNotFoundError when message key missing', async () => {
      when(mockAppSync.listEmailAddresses(anything(), anything())).thenResolve({
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

      const result = await instanceUnderTest.list({})

      verify(mockAppSync.listEmailAddresses(anything(), anything())).once()
      expect(result).toStrictEqual({
        emailAccounts: [
          {
            ...EntityDataFactory.emailAccountWithEmailAddressAlias,
            status: { type: 'Completed' },
          },
          {
            ...EntityDataFactory.emailAccount,
            status: { type: 'Failed', cause: new KeyNotFoundError() },
          },
        ],
        nextToken: undefined,
      })
    })

    it('returns transformed result', async () => {
      when(mockAppSync.listEmailAddresses(anything(), anything())).thenResolve(
        GraphQLDataFactory.emailAddressConnection,
      )
      await expect(instanceUnderTest.list({})).resolves.toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
        nextToken: undefined,
      })
      verify(mockAppSync.listEmailAddresses(anything(), anything())).once()
    })
  })

  describe('listForSudoId', () => {
    it('calls appsync correctly', async () => {
      when(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressConnection)
      const sudoId = v4()
      const result = await instanceUnderTest.listForSudoId({
        sudoId,
      })
      verify(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArg] = capture(
        mockAppSync.listEmailAddressesForSudoId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(sudoId)
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
      })
      verify(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
      const [inputArg] = capture(
        mockAppSync.listEmailAddressesForSudoId,
      ).first()
      expect(inputArg).toStrictEqual<typeof inputArg>(sudoId)
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccountWithEmailAddressAlias],
        nextToken: undefined,
      })
    })

    it('returns transformed result when calling $test', async () => {
      when(
        mockAppSync.listEmailAddressesForSudoId(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(GraphQLDataFactory.emailAddressConnection)
      const sudoId = v4()
      await expect(
        instanceUnderTest.listForSudoId({
          sudoId,
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
        ),
      ).once()
    })
  })

  describe('lookupPublicInfo', () => {
    const emailAddresses = GraphQLDataFactory.emailAddressesPublicInfo.map(
      ({ emailAddress }) => emailAddress,
    )

    it('calls appsync correctly', async () => {
      when(mockAppSync.lookupEmailAddressesPublicInfo(anything())).thenResolve({
        items: GraphQLDataFactory.emailAddressesPublicInfo,
      })

      await expect(
        instanceUnderTest.lookupPublicInfo({
          emailAddresses,
        }),
      ).resolves.toEqual(EntityDataFactory.emailAddressesPublicInfo)

      verify(mockAppSync.lookupEmailAddressesPublicInfo(anything())).once()
      const [inputArgs] = capture(
        mockAppSync.lookupEmailAddressesPublicInfo,
      ).first()
      expect(inputArgs).toStrictEqual(emailAddresses)
    })
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
})
