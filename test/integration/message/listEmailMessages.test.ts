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
import { Direction, EmailAddress, State, SudoEmailClient } from '../../../src'
import { DateRange } from '../../../src/public/typings/dateRange'
import { SortOrder } from '../../../src/public/typings/sortOrder'
import { str2ab } from '../../util/buffer'
import {
  createEmailMessageRfc822String,
  EmailMessageDetails,
} from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { getFolderByName } from '../util/folder'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient ListEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress

  let messageDetails: EmailMessageDetails
  const simAddress = { emailAddress: 'MAILER-DAEMON@amazonses.com' }

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
    }
    const messageString = createEmailMessageRfc822String(messageDetails)
    await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: emailAddress.id,
    })
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  describe('listEmailMessagesForEmailAddressId', () => {
    it('lists expected email messages', async () => {
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
          expect(outbound[0].size).toBeGreaterThan(0)

          expect(inbound).toHaveLength(1)
          expect(inbound[0].from).toEqual([simAddress])
          expect(inbound[0].to).toEqual(messageDetails.from)
          expect(inbound[0].size).toBeGreaterThan(0)
        },
        10000,
        1000,
      )
    })

    it('returns results for or filter', async () => {
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              filter: {
                or: [
                  { state: { eq: State.Sent } },
                  { direction: { eq: Direction.Inbound } },
                ],
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(2)
          const inbound = messages.items.filter(
            (message) => message.direction === Direction.Inbound,
          )
          const outbound = messages.items.filter(
            (message) => message.direction === Direction.Outbound,
          )
          expect(outbound[0].from).toEqual(messageDetails.from)
          expect(outbound[0].to).toEqual(messageDetails.to)
          expect(inbound[0].from).toEqual([simAddress])
          expect(inbound[0].to).toEqual(messageDetails.from)
        },
        10000,
        1000,
      )
    })

    it('returns results for and filter', async () => {
      await expect(
        instanceUnderTest.listEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          cachePolicy: CachePolicy.RemoteOnly,
          filter: {
            and: [
              { state: { eq: State.Sent } },
              { direction: { eq: Direction.Inbound } },
            ],
          },
        }),
      ).resolves.toEqual({
        status: 'Success',
        items: [],
      })
    })

    it('returns results for not filter', async () => {
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              filter: {
                not: { state: { eq: State.Received } },
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(1)
          expect(messages.items[0].from).toEqual(messageDetails.from)
          expect(messages.items[0].to).toEqual(messageDetails.to)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting limit', async () => {
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
          expect(messages.items).toHaveLength(1)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages respecting date range', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const dateRange: DateRange = {
        startDate: emailAddress.createdAt,
        endDate: new Date(emailAddress.createdAt.getTime() + 100000),
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange,
            })
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
        10000,
        1000,
      )
    })

    it('returns empty list for out of range date', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange: {
                startDate: sudo.createdAt,
                endDate: emailAddress.createdAt,
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages in ascending order', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const dateRange: DateRange = {
        startDate: emailAddress.createdAt,
        endDate: new Date(emailAddress.createdAt.getTime() + 100000),
      }
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange,
              sortOrder: SortOrder.Asc,
            })
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
        10000,
        1000,
      )
    })

    it('lists expected email messages in descending order', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
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
          expect(messages.items).toHaveLength(4)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        10000,
        1000,
      )
    })

    it('returns empty list for no criteria matches', async () => {
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
      await waitForExpect(
        async () => {
          await instanceUnderTest.reset()
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailAddressId({
              emailAddressId: emailAddress.id,
              cachePolicy: CachePolicy.RemoteOnly,
            })
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
        10000,
        1000,
      )
    })
  })

  describe('listEmailMessagesForEmailFolderId', () => {
    it('lists expected email messages', async () => {
      const inboxFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
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
          expect(messages.items).toHaveLength(1)
          expect(messages.items[0].folderId).toEqual(
            expect.stringContaining('INBOX'),
          )
          expect(messages.items[0].from).toEqual([simAddress])
          expect(messages.items[0].to).toEqual(messageDetails.from)
        },
        10000,
        1000,
      )
    })

    it('returns empty list for no criteria matches', async () => {
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

    it('lists expected email messages respecting date range', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const dateRange: DateRange = {
        startDate: emailAddress.createdAt,
        endDate: new Date(emailAddress.createdAt.getTime() + 100000),
      }
      const inboxFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(2)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        10000,
        1000,
      )
    })

    it('returns empty list for out of range date', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const inboxFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange: {
                startDate: sudo.createdAt,
                endDate: emailAddress.createdAt,
              },
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(0)
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages in ascending order', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const dateRange: DateRange = {
        startDate: emailAddress.createdAt,
        endDate: new Date(emailAddress.createdAt.getTime() + 100000),
      }
      const inboxFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
              dateRange,
              sortOrder: SortOrder.Asc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(2)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeLessThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        10000,
        1000,
      )
    })

    it('lists expected email messages in descending order', async () => {
      const messageString = createEmailMessageRfc822String(messageDetails)
      await instanceUnderTest.sendEmailMessage({
        rfc822Data: str2ab(messageString),
        senderEmailAddressId: emailAddress.id,
      })
      const inboxFolder = await getFolderByName({
        emailClient: instanceUnderTest,
        emailAddressId: emailAddress.id,
        folderName: 'INBOX',
      })
      await waitForExpect(
        async () => {
          const messages =
            await instanceUnderTest.listEmailMessagesForEmailFolderId({
              folderId: inboxFolder?.id ?? '',
              cachePolicy: CachePolicy.RemoteOnly,
              sortOrder: SortOrder.Desc,
            })
          if (messages.status !== ListOperationResultStatus.Success) {
            fail(`Expect result not returned: ${messages}`)
          }
          expect(messages.items).toHaveLength(2)
          messages.items.forEach((item, index) => {
            if (index < messages.items.length - 1) {
              expect(item.sortDate.getTime()).toBeGreaterThan(
                messages.items[index + 1].sortDate.getTime(),
              )
            }
          })
        },
        10000,
        1000,
      )
    })
  })
})
