/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  KeyNotFoundError,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  BatchOperationResultStatus,
  Direction,
  EmailAddress,
  EmailFolder,
  EncryptionStatus,
  InvalidArgumentError,
  SendEmailMessageResult,
  SudoEmailClient,
} from '../../../src'
import { EmailMessageDetails } from '../../../src/private/util/rfc822MessageDataProcessor'
import { EmailMessageDateRange } from '../../../src/public/typings/emailMessageDateRange'
import { SortOrder } from '../../../src/public/typings/sortOrder'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { getFolderByName } from '../util/folder'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import { readAllPages } from '../util/paginator'

describe('SudoEmailClient ListEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let senderAddress: EmailAddress
  let receiverAddress: EmailAddress
  let inboxFolder: EmailFolder

  let messageDetails: EmailMessageDetails
  const totalMessagesSent = 2
  let sendResult: SendEmailMessageResult | undefined

  let beforeEachComplete = false

  function expectSetupComplete() {
    expect({ beforeEachComplete }).toEqual({ beforeEachComplete: true })
  }

  describe('listEmailMessages', () => {
    beforeAll(async () => {
      const result = await setupEmailClient(log)
      instanceUnderTest = result.emailClient
      profilesClient = result.profilesClient
      userClient = result.userClient
      sudo = result.sudo
      sudoOwnershipProofToken = result.ownershipProofToken
      senderAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-sender') },
      )
      receiverAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-receiver') },
      )
      for (let i = 0; i < totalMessagesSent; i++) {
        const subjectRandomizer = v4()
        const bodyRandomizer = v4()

        messageDetails = {
          from: [{ emailAddress: senderAddress.emailAddress }],
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [{ emailAddress: senderAddress.emailAddress }],
          subject: 'Important Subject ' + subjectRandomizer,
          body: 'Hello, World ' + bodyRandomizer,
          attachments: [],
          encryptionStatus: EncryptionStatus.ENCRYPTED,
        }

        sendResult = await instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: senderAddress.id,
          emailMessageHeader: {
            from: messageDetails.from[0],
            to: messageDetails.to ?? [],
            cc: messageDetails.cc ?? [],
            bcc: messageDetails.bcc ?? [],
            replyTo: messageDetails.replyTo ?? [],
            subject: messageDetails.subject ?? '',
          },
          body: messageDetails.body ?? 'Hello, World',
          attachments: messageDetails.attachments ?? [],
          inlineAttachments: messageDetails.inlineAttachments ?? [],
        })
      }

      const folder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: receiverAddress.id,
        folderName: 'INBOX',
      })
      expect(folder).toBeDefined()
      if (!folder) {
        fail('Unable to get INBOX folder in setup')
      }

      inboxFolder = folder

      await waitForExpect(async () => {
        const messagesList =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder.id,
          })

        expect(messagesList.status).toEqual(ListOperationResultStatus.Success)
        if (messagesList.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        expect(messagesList.items).toHaveLength(2)
      })
      beforeEachComplete = true
    })

    afterAll(async () => {
      beforeEachComplete = false

      await teardown(
        { emailAddresses: [senderAddress, receiverAddress], sudos: [sudo] },
        { emailClient: instanceUnderTest, profilesClient, userClient },
      )
    })

    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              nextToken,
            }),
          )

          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent * 2)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(totalMessagesSent)
          expect(outbound[0].from).toEqual(messageDetails.from)
          expect(outbound[0].to).toEqual(messageDetails.to)
          expect(outbound[0].hasAttachments).toEqual(false)
          expect(outbound[0].size).toBeGreaterThan(0)

          expect(inbound).toHaveLength(totalMessagesSent)
          expect(inbound[0].from).toEqual(messageDetails.from)
          expect(inbound[0].to).toEqual(messageDetails.to)
          expect(inbound[0].hasAttachments).toEqual(false)
          expect(inbound[0].size).toBeGreaterThan(0)
          expect(inbound[0].encryptionStatus).toEqual(
            EncryptionStatus.ENCRYPTED,
          )
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting limit', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await instanceUnderTest.listEmailMessages({
            limit: 1,
          })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeTruthy()
          expect(messages.items).toHaveLength(1)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting sortDate date range', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: senderAddress.createdAt,
          endDate: new Date(senderAddress.createdAt.getTime() + 100000),
        },
      }

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(4)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        20000,
        1000,
      )
    })

    it('lists expected email messages respecting updatedAt date range', async () => {
      expectSetupComplete()

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              nextToken,
            }),
          )
          if (allMessages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${allMessages}`)
          }
          expect(allMessages.items).toHaveLength(4)

          inboundMessageIds = allMessages.items
            .filter((m) => m.direction == Direction.Inbound)
            .map((m) => m.id)
        },
        20000,
        1000,
      )

      // Update each inbound message's seen flag subsequently updating the modified date
      const timestamp = new Date()
      await waitForExpect(async () => {
        await expect(
          instanceUnderTest.updateEmailMessages({
            ids: inboundMessageIds,
            values: { seen: true },
          }),
        ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
      })

      // List the newly updated email messages
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange: {
                updatedAt: {
                  startDate: timestamp,
                  endDate: new Date(timestamp.getTime() + 100000),
                },
              },
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(2)
        },
        20000,
        1000,
      )
    })

    it('returns empty list for out of range sort date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: senderAddress.createdAt,
                },
              },
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('returns empty list for out of range updatedAt date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: senderAddress.createdAt,
                },
              },
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('should throw for multiple date ranges specified', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            sortDate: {
              startDate: senderAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: senderAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sortDate date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            sortDate: {
              startDate: new Date(senderAddress.createdAt.getTime() + 100000),
              endDate: senderAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            updatedAt: {
              startDate: new Date(senderAddress.createdAt.getTime() + 100000),
              endDate: senderAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: senderAddress.createdAt,
          endDate: new Date(senderAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange,
              sortOrder: SortOrder.Asc,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(4)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeLessThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        30000,
        1000,
      )
    })

    it('lists expected email messages in descending order', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              sortOrder: SortOrder.Desc,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(4)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        30000,
        1000,
      )
    })

    it('should return partial result', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const keyArchive = await instanceUnderTest.exportKeys()
          await instanceUnderTest.reset()
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              nextToken,
            }),
          )
          expect(messages.status).toStrictEqual(
            ListOperationResultStatus.Partial,
          )
          if (messages.status !== ListOperationResultStatus.Partial) {
            fail(`Expect result not returned: ${messages}`)
          }

          expect(messages.items).toHaveLength(0)
          expect(messages.failed).toHaveLength(totalMessagesSent * 2)
          const inbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Inbound,
          )
          const outbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(totalMessagesSent)
          expect(inbound).toHaveLength(totalMessagesSent)

          expect(outbound[0].cause).toBeInstanceOf(KeyNotFoundError)
          expect(inbound[0].cause).toBeInstanceOf(KeyNotFoundError)
          await instanceUnderTest.importKeys(keyArchive)
        },
        20000,
        1000,
      )
    })

    it('should respect includeDeletedMessages flag', async () => {
      expectSetupComplete()
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              sortOrder: SortOrder.Desc,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(totalMessagesSent * 2)
        },
        30000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult!.id),
      ).resolves.toEqual({ id: sendResult!.id })
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(totalMessagesSent * 2 - 1)
        },
        30000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              includeDeletedMessages: true,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(totalMessagesSent * 2)
        },
        30000,
        1000,
      )
    })
  })

  describe('listEmailMessagesForEmailAddressId', () => {
    beforeAll(async () => {
      const result = await setupEmailClient(log)
      instanceUnderTest = result.emailClient
      profilesClient = result.profilesClient
      userClient = result.userClient
      sudo = result.sudo
      sudoOwnershipProofToken = result.ownershipProofToken
      senderAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-sender') },
      )
      receiverAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-receiver') },
      )
      for (let i = 0; i < totalMessagesSent; i++) {
        const subjectRandomizer = v4()
        const bodyRandomizer = v4()

        messageDetails = {
          from: [{ emailAddress: senderAddress.emailAddress }],
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [{ emailAddress: senderAddress.emailAddress }],
          subject: 'Important Subject ' + subjectRandomizer,
          body: 'Hello, World ' + bodyRandomizer,
          attachments: [],
          encryptionStatus: EncryptionStatus.ENCRYPTED,
        }

        sendResult = await instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: senderAddress.id,
          emailMessageHeader: {
            from: messageDetails.from[0],
            to: messageDetails.to ?? [],
            cc: messageDetails.cc ?? [],
            bcc: messageDetails.bcc ?? [],
            replyTo: messageDetails.replyTo ?? [],
            subject: messageDetails.subject ?? '',
          },
          body: messageDetails.body ?? 'Hello, World',
          attachments: messageDetails.attachments ?? [],
          inlineAttachments: messageDetails.inlineAttachments ?? [],
        })
      }

      const folder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: receiverAddress.id,
        folderName: 'INBOX',
      })
      expect(folder).toBeDefined()
      if (!folder) {
        fail('Unable to get INBOX folder in setup')
      }

      inboxFolder = folder

      await waitForExpect(async () => {
        const messagesList =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder.id,
          })

        expect(messagesList.status).toEqual(ListOperationResultStatus.Success)
        if (messagesList.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        expect(messagesList.items).toHaveLength(2)
      })
      beforeEachComplete = true
    })

    afterAll(async () => {
      beforeEachComplete = false

      await teardown(
        { emailAddresses: [senderAddress, receiverAddress], sudos: [sudo] },
        { emailClient: instanceUnderTest, profilesClient, userClient },
      )
    })
    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(totalMessagesSent)
          expect(outbound[0].from).toEqual(messageDetails.from)
          expect(outbound[0].to).toEqual(messageDetails.to)
          expect(outbound[0].hasAttachments).toEqual(false)
          expect(outbound[0].size).toBeGreaterThan(0)

          expect(inbound).toHaveLength(0)
        },
        10000,
        1000,
      )

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: receiverAddress.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(0)

          expect(inbound).toHaveLength(totalMessagesSent)
          expect(inbound[0].from).toEqual(messageDetails.from)
          expect(inbound[0].to).toEqual(messageDetails.to)
          expect(inbound[0].hasAttachments).toEqual(false)
          expect(inbound[0].size).toBeGreaterThan(0)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting limit', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              limit: 1,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeTruthy()
          expect(messages.items).toHaveLength(1)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting sortDate date range', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: senderAddress.createdAt,
          endDate: new Date(senderAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              dateRange,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        20000,
        1000,
      )
    })

    it('lists expected email messages respecting updatedAt date range', async () => {
      expectSetupComplete()

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await instanceUnderTest.listEmailMessages({})
          if (allMessages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${allMessages}`)
          }
          expect(allMessages.items).toHaveLength(totalMessagesSent * 2)

          inboundMessageIds = allMessages.items
            .filter((m) => m.direction == Direction.Inbound)
            .map((m) => m.id)
        },
        20000,
        1000,
      )

      // Update each inbound message's seen flag subsequently updating the modified date
      const timestamp = new Date()
      await waitForExpect(async () => {
        await expect(
          instanceUnderTest.updateEmailMessages({
            ids: inboundMessageIds,
            values: { seen: true },
          }),
        ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
      })

      // List the newly updated email messages
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: receiverAddress.id,
              dateRange: {
                updatedAt: {
                  startDate: timestamp,
                  endDate: new Date(timestamp.getTime() + 100000),
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        20000,
        1000,
      )
    })

    it('returns empty list for out of range sort date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: senderAddress.createdAt,
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('returns empty list for out of range updatedAt date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: senderAddress.createdAt,
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('should throw for multiple date ranges specified', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: senderAddress.id,
          dateRange: {
            sortDate: {
              startDate: senderAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: senderAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sort date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: senderAddress.id,
          dateRange: {
            sortDate: {
              startDate: new Date(senderAddress.createdAt.getTime() + 100000),
              endDate: senderAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: senderAddress.id,
          dateRange: {
            updatedAt: {
              startDate: new Date(senderAddress.createdAt.getTime() + 100000),
              endDate: senderAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: senderAddress.createdAt,
          endDate: new Date(senderAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              dateRange,
              sortOrder: SortOrder.Asc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeLessThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        30000,
        1000,
      )
    })

    it('lists expected email messages in descending order', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              sortOrder: SortOrder.Desc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        30000,
        1000,
      )
    })

    it('returns empty list for no criteria matches', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: v4(),
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('should return partial result', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const keyArchive = await instanceUnderTest.exportKeys()
          await instanceUnderTest.reset()
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
            })

          expect(messages).not.toBeNull()
          expect(messages.status).toStrictEqual(
            ListOperationResultStatus.Partial,
          )
          if (messages.status !== ListOperationResultStatus.Partial) {
            fail(`Expect result not returned: ${messages}`)
          }

          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(0)
          expect(messages.failed).toHaveLength(totalMessagesSent)
          const inbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Inbound,
          )
          const outbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(totalMessagesSent)
          expect(inbound).toHaveLength(0)

          expect(outbound[0].cause).toBeInstanceOf(KeyNotFoundError)
          expect(outbound[1].cause).toBeInstanceOf(KeyNotFoundError)
          await instanceUnderTest.importKeys(keyArchive)
        },
        20000,
        1000,
      )
    })

    it('should respect includeDeletedMessages flag', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        40000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult!.id),
      ).resolves.toEqual({ id: sendResult!.id })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent - 1)
        },
        40000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: senderAddress.id,
              includeDeletedMessages: true,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        40000,
        1000,
      )
    })
  })

  describe('listEmailMessagesForEmailFolderId', () => {
    beforeAll(async () => {
      const result = await setupEmailClient(log)
      instanceUnderTest = result.emailClient
      profilesClient = result.profilesClient
      userClient = result.userClient
      sudo = result.sudo
      sudoOwnershipProofToken = result.ownershipProofToken
      senderAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-sender') },
      )
      receiverAddress = await provisionEmailAddress(
        sudoOwnershipProofToken,
        instanceUnderTest,
        { localPart: generateSafeLocalPart('list-test-receiver') },
      )
      for (let i = 0; i < totalMessagesSent; i++) {
        const subjectRandomizer = v4()
        const bodyRandomizer = v4()

        messageDetails = {
          from: [{ emailAddress: senderAddress.emailAddress }],
          to: [{ emailAddress: receiverAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [{ emailAddress: senderAddress.emailAddress }],
          subject: 'Important Subject ' + subjectRandomizer,
          body: 'Hello, World ' + bodyRandomizer,
          attachments: [],
          encryptionStatus: EncryptionStatus.ENCRYPTED,
        }

        sendResult = await instanceUnderTest.sendEmailMessage({
          senderEmailAddressId: senderAddress.id,
          emailMessageHeader: {
            from: messageDetails.from[0],
            to: messageDetails.to ?? [],
            cc: messageDetails.cc ?? [],
            bcc: messageDetails.bcc ?? [],
            replyTo: messageDetails.replyTo ?? [],
            subject: messageDetails.subject ?? '',
          },
          body: messageDetails.body ?? 'Hello, World',
          attachments: messageDetails.attachments ?? [],
          inlineAttachments: messageDetails.inlineAttachments ?? [],
        })
      }

      const folder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: receiverAddress.id,
        folderName: 'INBOX',
      })
      expect(folder).toBeDefined()
      if (!folder) {
        fail('Unable to get INBOX folder in setup')
      }

      inboxFolder = folder

      await waitForExpect(async () => {
        const messagesList =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder.id,
          })

        expect(messagesList.status).toEqual(ListOperationResultStatus.Success)
        if (messagesList.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        expect(messagesList.items).toHaveLength(2)
      })
      beforeEachComplete = true
    })

    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          expect(messages.items[0].folderId).toEqual(
            expect.stringContaining('INBOX'),
          )
          expect(messages.items[0].from).toEqual(messageDetails.from)
          expect(messages.items[0].to).toEqual(messageDetails.to)
          expect(messages.items[0].encryptionStatus).toEqual(
            EncryptionStatus.ENCRYPTED,
          )
        },
        10000,
        1000,
      )
    })

    it('returns empty list for no criteria matches', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: v4(),
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('returns empty list when folder contains no messages', async () => {
      expectSetupComplete()

      const trashFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: senderAddress.id,
        folderName: 'TRASH',
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder?.id ?? '',
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('lists expected email messages respecting sortDate date range', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: receiverAddress.createdAt,
          endDate: new Date(receiverAddress.createdAt.getTime() + 100000),
        },
      }

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        20000,
        1000,
      )
    })

    it('lists expected email messages respecting updatedAt date range', async () => {
      expectSetupComplete()

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await instanceUnderTest.listEmailMessages({})
          if (allMessages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${allMessages}`)
          }
          expect(allMessages.items).toHaveLength(totalMessagesSent * 2)

          inboundMessageIds = allMessages.items
            .filter((m) => m.direction == Direction.Inbound)
            .map((m) => m.id)
        },
        20000,
        1000,
      )

      // Update each inbound message's seen flag subsequently updating the modified date
      const timestamp = new Date()
      await waitForExpect(async () => {
        await expect(
          instanceUnderTest.updateEmailMessages({
            ids: inboundMessageIds,
            values: { seen: true },
          }),
        ).resolves.toMatchObject({ status: BatchOperationResultStatus.Success })
      })

      // List the newly updated email messages
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                updatedAt: {
                  startDate: timestamp,
                  endDate: new Date(timestamp.getTime() + 100000),
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        20000,
        1000,
      )
    })

    it('returns empty list for out of range sort date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: receiverAddress.createdAt,
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('returns empty list for out of range updatedAt date', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: receiverAddress.createdAt,
                },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('should throw for multiple date ranges specified', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            sortDate: {
              startDate: receiverAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: receiverAddress.createdAt,
              endDate: new Date(senderAddress.createdAt.getTime() + 100000),
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sort date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            sortDate: {
              startDate: new Date(receiverAddress.createdAt.getTime() + 100000),
              endDate: receiverAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            updatedAt: {
              startDate: new Date(receiverAddress.createdAt.getTime() + 100000),
              endDate: receiverAddress.createdAt,
            },
          },
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: receiverAddress.createdAt,
          endDate: new Date(receiverAddress.createdAt.getTime() + 100000),
        },
      }

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange,
              sortOrder: SortOrder.Asc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeLessThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        35000,
        1000,
      )
    })

    it('lists expected email messages in descending order', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder.id,
              sortOrder: SortOrder.Desc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        30000,
        1000,
      )
    })

    it('should respect includeDeletedMessages flag', async () => {
      expectSetupComplete()

      const sentFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: senderAddress.id,
        folderName: 'SENT',
      })
      if (!sentFolder) {
        fail('Could not find sent folder')
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        30000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult!.id),
      ).resolves.toEqual({ id: sendResult!.id })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder.id,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent - 1)
        },
        30000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder.id,
              includeDeletedMessages: true,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(totalMessagesSent)
        },
        30000,
        1000,
      )
    })
  })
})
