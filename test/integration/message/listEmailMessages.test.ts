/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  BatchOperationResultStatus,
  Direction,
  EmailAddress,
  EmailFolder,
  EncryptionStatus,
  InvalidArgumentError,
  SudoEmailClient,
} from '../../../src'
import { EmailMessageDetails } from '../../../src/private/util/rfc822MessageDataProcessor'
import { EmailMessageDateRange } from '../../../src/public/typings/emailMessageDateRange'
import { SortOrder } from '../../../src/public/typings/sortOrder'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { getFolderByName } from '../util/folder'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { readAllPages } from '../util/paginator'

describe('SudoEmailClient ListEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let inboxFolder: EmailFolder

  let messageDetails: EmailMessageDetails
  const simAddress = { emailAddress: 'MAILER-DAEMON@amazonses.com' }

  let beforeEachComplete = false

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken
    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    messageDetails = {
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: 'Important Subject',
      body: 'Hello, World',
      attachments: [],
      encryptionStatus: EncryptionStatus.UNENCRYPTED,
    }
    await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: messageDetails.from[0],
        to: messageDetails.to ?? [],
        cc: messageDetails.cc ?? [],
        bcc: messageDetails.bcc ?? [],
        replyTo: messageDetails.replyTo ?? [],
        subject: messageDetails.subject ?? 'Important Subject',
      },
      body: messageDetails.body ?? 'Hello, World',
      attachments: messageDetails.attachments ?? [],
      inlineAttachments: messageDetails.inlineAttachments ?? [],
    })

    const folder = await getFolderByName({
      emailClient: instanceUnderTest,
      emailAddressId: emailAddress.id,
      folderName: 'INBOX',
    })
    expect(folder).toBeDefined()
    if (!folder) {
      fail('Unable to get INBOX folder in setup')
    }

    inboxFolder = folder

    await waitForExpect(
      async () => {
        const result =
          await instanceUnderTest.listEmailMessagesForEmailFolderId({
            folderId: inboxFolder.id,
          })
        expect(result.status).toEqual(ListOperationResultStatus.Success)
        if (result.status !== ListOperationResultStatus.Success) {
          fail(`result status unexpectedly not Success`)
        }
        expect(result.items).toHaveLength(1)
        beforeEachComplete = true
      },
      45000,
      1000,
    )
  }, 60000)

  afterEach(async () => {
    beforeEachComplete = false

    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  function expectSetupComplete() {
    expect({ beforeEachComplete }).toEqual({ beforeEachComplete: true })
  }

  describe('listEmailMessages', () => {
    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
              nextToken,
            }),
          )

          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(1)
          expect(outbound[0].from).toEqual(messageDetails.from)
          expect(outbound[0].to).toEqual(messageDetails.to)
          expect(outbound[0].hasAttachments).toEqual(false)
          expect(outbound[0].size).toBeGreaterThan(0)

          expect(inbound).toHaveLength(1)
          expect(inbound[0].from).toEqual([simAddress])
          expect(inbound[0].to).toEqual(messageDetails.from)
          expect(inbound[0].hasAttachments).toEqual(false)
          expect(inbound[0].size).toBeGreaterThan(0)
          expect(inbound[0].encryptionStatus).toEqual(
            EncryptionStatus.UNENCRYPTED,
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
            cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
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
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            sortDate: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sortDate date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            sortDate: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessages({
          dateRange: {
            updatedAt: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
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
          await instanceUnderTest.reset()
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
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
          expect(messages.failed).toHaveLength(2)
          const inbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Inbound,
          )
          const outbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(1)
          expect(inbound).toHaveLength(1)

          expect(outbound[0].cause).toBeInstanceOf(KeyNotFoundError)
          expect(inbound[0].cause).toBeInstanceOf(KeyNotFoundError)
        },
        20000,
        1000,
      )
    })

    it('should respect includeDeletedMessages flag', async () => {
      expectSetupComplete()

      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Desc,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(4)
        },
        30000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult.id),
      ).resolves.toEqual(sendResult.id)
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(3)
        },
        30000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages = await readAllPages((nextToken?: string) =>
            instanceUnderTest.listEmailMessages({
              cachePolicy: CachePolicy.RemoteOnly,
              includeDeletedMessages: true,
              nextToken,
            }),
          )
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(4)
        },
        30000,
        1000,
      )
    })
  })

  describe('listEmailMessagesForEmailAddressId', () => {
    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(1)
          expect(outbound[0].from).toEqual(messageDetails.from)
          expect(outbound[0].to).toEqual(messageDetails.to)
          expect(outbound[0].hasAttachments).toEqual(false)
          expect(outbound[0].size).toBeGreaterThan(0)

          expect(inbound).toHaveLength(1)
          expect(inbound[0].from).toEqual([simAddress])
          expect(inbound[0].to).toEqual(messageDetails.from)
          expect(inbound[0].hasAttachments).toEqual(false)
          expect(inbound[0].size).toBeGreaterThan(0)
          expect(inbound[0].encryptionStatus).toEqual(
            EncryptionStatus.UNENCRYPTED,
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
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await instanceUnderTest.listEmailMessages({
            cachePolicy: CachePolicy.RemoteOnly,
          })
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
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              dateRange: {
                updatedAt: {
                  startDate: timestamp,
                  endDate: new Date(timestamp.getTime() + 100000),
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
        },
        20000,
        1000,
      )
    })

    it('returns empty list for out of range sort date', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          dateRange: {
            sortDate: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sort date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          dateRange: {
            sortDate: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          dateRange: {
            updatedAt: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Asc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Desc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
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

    it('returns empty list for no criteria matches', async () => {
      expectSetupComplete()

      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: v4(),
          cachePolicy: CachePolicy.RemoteOnly,
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
          await instanceUnderTest.reset()
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
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
          expect(messages.failed).toHaveLength(2)
          const inbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Inbound,
          )
          const outbound = messages.failed.filter(
            (message) => message.item.direction === Direction.Outbound,
          )
          expect(outbound).toHaveLength(1)
          expect(inbound).toHaveLength(1)

          expect(outbound[0].cause).toBeInstanceOf(KeyNotFoundError)
          expect(inbound[0].cause).toBeInstanceOf(KeyNotFoundError)
        },
        20000,
        1000,
      )
    })

    it('should respect includeDeletedMessages flag', async () => {
      expectSetupComplete()

      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(4)
        },
        30000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult.id),
      ).resolves.toEqual(sendResult.id)
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(3)
        },
        30000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              includeDeletedMessages: true,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(4)
        },
        30000,
        1000,
      )
    })
  })

  describe('listEmailMessagesForEmailFolderId', () => {
    it('lists expected email messages', async () => {
      expectSetupComplete()

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(1)
          expect(messages.items[0].folderId).toEqual(
            expect.stringContaining('INBOX'),
          )
          expect(messages.items[0].from).toEqual([simAddress])
          expect(messages.items[0].to).toEqual(messageDetails.from)
          expect(messages.items[0].encryptionStatus).toEqual(
            EncryptionStatus.UNENCRYPTED,
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
          cachePolicy: CachePolicy.RemoteOnly,
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
        emailAddressId: emailAddress.id,
        folderName: 'TRASH',
      })
      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: trashFolder?.id ?? '',
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('lists expected email messages respecting sortDate date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      // List all inbound messages
      let inboundMessageIds: string[] = []
      await waitForExpect(
        async () => {
          const allMessages = await instanceUnderTest.listEmailMessages({
            cachePolicy: CachePolicy.RemoteOnly,
          })
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
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                updatedAt: {
                  startDate: timestamp,
                  endDate: new Date(timestamp.getTime() + 100000),
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
        },
        20000,
        1000,
      )
    })

    it('returns empty list for out of range sort date', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                sortDate: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange: {
                updatedAt: {
                  startDate: sudo.createdAt,
                  endDate: emailAddress.createdAt,
                },
              },
              cachePolicy: CachePolicy.RemoteOnly,
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            sortDate: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
            updatedAt: {
              startDate: emailAddress.createdAt,
              endDate: new Date(emailAddress.createdAt.getTime() + 100000),
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for sort date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            sortDate: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('should throw when input start date greater than end date for updatedAt date range', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await expect(
        instanceUnderTest.listEmailMessagesForEmailFolderId({
          folderId: inboxFolder?.id ?? '',
          dateRange: {
            updatedAt: {
              startDate: new Date(emailAddress.createdAt.getTime() + 100000),
              endDate: emailAddress.createdAt,
            },
          },
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('lists expected email messages in ascending order', async () => {
      expectSetupComplete()

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const dateRange: EmailMessageDateRange = {
        sortDate: {
          startDate: emailAddress.createdAt,
          endDate: new Date(emailAddress.createdAt.getTime() + 100000),
        },
      }

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              dateRange,
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Asc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
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

      await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })

      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder.id,
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Desc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
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

      const sendResult = await instanceUnderTest.sendEmailMessage({
        senderEmailAddressId: emailAddress.id,
        emailMessageHeader: {
          from: messageDetails.from[0],
          to: messageDetails.to ?? [],
          cc: messageDetails.cc ?? [],
          bcc: messageDetails.bcc ?? [],
          replyTo: messageDetails.replyTo ?? [],
          subject: messageDetails.subject ?? 'Important Subject',
        },
        body: messageDetails.body ?? 'Hello, World',
        attachments: messageDetails.attachments ?? [],
        inlineAttachments: messageDetails.inlineAttachments ?? [],
      })
      const sentFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'SENT',
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
        },
        30000,
        1000,
      )
      await expect(
        instanceUnderTest.deleteEmailMessage(sendResult.id),
      ).resolves.toEqual(sendResult.id)
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(1)
        },
        30000,
        1000,
      )
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: sentFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
              includeDeletedMessages: true,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.nextToken).toBeFalsy()
          expect(messages.items).toHaveLength(2)
        },
        30000,
        1000,
      )
    })
  })
})
