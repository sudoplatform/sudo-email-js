/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  KeyNotFoundError,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import { EmailAddress, SudoEmailClient } from '../../../src'
import { createSudo } from '../util/createSudo'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient ListEmailAddresses Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClient-ListEmailAddresses')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo1: Sudo
  let sudo1OwnershipProofToken: string
  let sudo2: Sudo
  let sudo2OwnershipProofToken: string
  let sudosToDelete: Sudo[]
  let beforeEachComplete = false

  beforeEach(async () => {
    sudosToDelete = []
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo1 = result.sudo
    sudosToDelete.push(sudo1)

    sudo1OwnershipProofToken = result.ownershipProofToken

    // Get another sudo
    const sudo2Result = await createSudo('New Sudo', profilesClient)
    sudo2 = sudo2Result.sudo
    sudosToDelete.push(sudo2)
    sudo2OwnershipProofToken = sudo2Result.ownershipProofToken

    const sudo1EmailAddresses = await Promise.all(
      _.range(3).map(
        async () =>
          await provisionEmailAddress(
            sudo1OwnershipProofToken,
            instanceUnderTest,
            { alias: 'dummy_alias' },
          ),
      ),
    )
    const sudo2EmailAddresses = await Promise.all(
      _.range(3).map(
        async () =>
          await provisionEmailAddress(
            sudo2OwnershipProofToken,
            instanceUnderTest,
          ),
      ),
    )
    emailAddresses = sudo1EmailAddresses.concat(sudo2EmailAddresses)
    beforeEachComplete = true
  })

  afterEach(async () => {
    beforeEachComplete = false
    await teardown(
      { emailAddresses, sudos: sudosToDelete },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
    sudosToDelete = []
  })

  function expectSetupComplete(): void {
    expect({ beforeEachComplete }).toEqual({ beforeEachComplete: true })
  }

  describe('listEmailAddresses', () => {
    it('returns email addresses', async () => {
      expectSetupComplete()

      const result = await instanceUnderTest.listEmailAddresses({
        cachePolicy: CachePolicy.RemoteOnly,
      })
      if (result.status === ListOperationResultStatus.Success) {
        expect(result.items).toHaveLength(emailAddresses.length)
        expect(result.items).toStrictEqual(
          expect.arrayContaining(emailAddresses),
        )
      } else {
        fail(`Unexpected result: ${result}`)
      }
    })
  })

  describe('listEmailAddressesForSudoId', () => {
    it('lists expected output', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailAddressesForSudoId({
          sudoId: sudo1.id ?? '',
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: expect.arrayContaining(emailAddresses.slice(0, 3)),
      })
      await expect(
        instanceUnderTest.listEmailAddressesForSudoId({
          sudoId: sudo2.id ?? '',
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: expect.arrayContaining(emailAddresses.slice(3, 10)),
      })
    })

    it('returns empty list of email addresses when non-existent sudo id used', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailAddressesForSudoId({
          sudoId: v4(),
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('returns partial result for missing alias key', async () => {
      expectSetupComplete()

      await instanceUnderTest.reset()
      const result = await instanceUnderTest.listEmailAddressesForSudoId({
        sudoId: sudo1.id ?? '',
        cachePolicy: CachePolicy.RemoteOnly,
        limit: 2,
      })
      if (result.status === ListOperationResultStatus.Partial) {
        expect(result.items.length).toBe(0)
        expect(result.failed.length).toBe(2)
        result.failed.forEach((element) => {
          expect(element.cause).toBeInstanceOf(KeyNotFoundError)
          const found = emailAddresses.filter(
            (emailAddress) => element.item.id === emailAddress.id,
          )
          delete found[0].alias
          expect(element.item).toStrictEqual(found[0])
        })
      } else {
        fail(`Expected result not returned: ${result}`)
      }
    })

    it('returns partial result for missing message key', async () => {
      expectSetupComplete()

      await instanceUnderTest.reset()
      const result = await instanceUnderTest.listEmailAddressesForSudoId({
        sudoId: sudo2.id ?? '',
        cachePolicy: CachePolicy.RemoteOnly,
        limit: 2,
      })
      if (result.status === ListOperationResultStatus.Partial) {
        expect(result.items.length).toBe(0)
        expect(result.failed.length).toBe(2)
        result.failed.forEach((element) => {
          expect(element.cause).toBeInstanceOf(KeyNotFoundError)
          const found = emailAddresses.filter(
            (emailAddress) => element.item.id === emailAddress.id,
          )
          expect(element.item).toStrictEqual(found[0])
        })
      } else {
        fail(`Expected result not returned: ${result}`)
      }
    })
  })
})
