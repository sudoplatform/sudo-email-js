import { v4 } from 'uuid'
import {
  CANNED_TEXT_BODY,
  EMAIL_HEADER_NAME_ENCRYPTION,
  EmailMessageDetails,
  PLATFORM_ENCRYPTION,
  Rfc822MessageDataProcessor,
} from '../../../../src/private/util/rfc822MessageDataProcessor'
import {
  EmailAddressDetail,
  EmailAttachment,
  EncryptionStatus,
} from '../../../../src/public'
import { Base64 } from '@sudoplatform/sudo-common'
import { arrayBufferToString } from '../../../../src/private/util/buffer'

const eol = '\n'
describe('rfc822MessageDataProcessor unit tests', () => {
  const fromAddress: EmailAddressDetail = {
    emailAddress: 'from@example.com',
    displayName: 'Morf',
  }
  const toAddresses: EmailAddressDetail[] = [
    { emailAddress: 'to1@example.com', displayName: '1ot' },
    { emailAddress: 'to2@example.com', displayName: '2ot' },
  ]
  const ccAddresses: EmailAddressDetail[] = [
    { emailAddress: 'cc1@example.com', displayName: '1cc' },
    { emailAddress: 'cc2@example.com', displayName: '2cc' },
  ]
  const bccAddresses: EmailAddressDetail[] = [
    { emailAddress: 'bcc1@example.com', displayName: '1bcc' },
    { emailAddress: 'bcc2@example.com', displayName: '2bcc' },
  ]
  const replyToAddresses: EmailAddressDetail[] = [
    { emailAddress: 'replyTo1@example.com', displayName: '1OtYlper' },
    { emailAddress: 'replyTo2@example.com', displayName: '2OtYlper' },
  ]

  describe('encodeToInternetMessageStr', () => {
    describe('from', () => {
      it('works with no display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      it('works with a display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('to', () => {
      test('works with one address', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [{ emailAddress: toAddresses[0].emailAddress }],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(
          `To: <${toAddresses[0].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with two addresses', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [
            { emailAddress: toAddresses[0].emailAddress },
            { emailAddress: toAddresses[1].emailAddress },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(
          `To: <${toAddresses[0].emailAddress}>,${eol} <${toAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with or without display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [
            { emailAddress: toAddresses[0].emailAddress },
            {
              emailAddress: toAddresses[1].emailAddress,
              displayName: toAddresses[1].displayName,
            },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(
          `To: <${toAddresses[0].emailAddress}>,${eol} ${toAddresses[1].displayName} <${toAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('cc', () => {
      test('works with one address', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [{ emailAddress: ccAddresses[0].emailAddress }],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(
          `Cc: <${ccAddresses[0].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with two addresses', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [
            { emailAddress: ccAddresses[0].emailAddress },
            { emailAddress: ccAddresses[1].emailAddress },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(
          `Cc: <${ccAddresses[0].emailAddress}>,${eol} <${ccAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with or without display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [
            {
              emailAddress: ccAddresses[0].emailAddress,
              displayName: ccAddresses[0].displayName,
            },
            { emailAddress: ccAddresses[1].emailAddress },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(
          `Cc: ${ccAddresses[0].displayName} <${ccAddresses[0].emailAddress}>,${eol} <${ccAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('bcc', () => {
      test('works with one address', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [{ emailAddress: bccAddresses[0].emailAddress }],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(
          `Bcc: <${bccAddresses[0].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with two addresses', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [
            { emailAddress: bccAddresses[0].emailAddress },
            { emailAddress: bccAddresses[1].emailAddress },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(
          `Bcc: <${bccAddresses[0].emailAddress}>,${eol} <${bccAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with or without display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [
            { emailAddress: bccAddresses[0].emailAddress },
            {
              emailAddress: bccAddresses[1].emailAddress,
              displayName: bccAddresses[1].displayName,
            },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(
          `Bcc: <${bccAddresses[0].emailAddress}>,${eol} ${bccAddresses[1].displayName} <${bccAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('replyTo', () => {
      test('works with one address', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(
          `Reply-To: <${replyToAddresses[0].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      // mimetext currently only supports a single `replyTo` address
      // https://github.com/muratgozel/MIMEText/issues/69
      test.skip('works with two addresses', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [
            { emailAddress: replyToAddresses[0].emailAddress },
            { emailAddress: replyToAddresses[1].emailAddress },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(
          `Reply-To: <${replyToAddresses[0].emailAddress}>,${eol} <${replyToAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      test('works with display name', () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [
            // mimetext currently only supports a single `replyTo` address
            // https://github.com/muratgozel/MIMEText/issues/69
            // { emailAddress: replyToAddresses[0].emailAddress },
            {
              emailAddress: replyToAddresses[1].emailAddress,
              displayName: replyToAddresses[1].displayName,
            },
          ],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(
          `Reply-To: ${replyToAddresses[1].displayName} <${replyToAddresses[1].emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('subject', () => {
      it('works with a short subject', () => {
        const subject = 'This is a short subject'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${subject}${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      it('works with a long subject', () => {
        const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${subject}${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })

      it('works with emojis 😎', () => {
        const subject = `Is this the real life? Is this just fantasy? 🤔 Caught in a landslide, no escape from reality 😱 Open your eyes, look up to the skies and see 👀 I'm just a poor boy, I need no sympathy 💐`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${subject}${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
      })
    })

    describe('body', () => {
      it('works with a short body', () => {
        const body = 'This is a short body'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
        expect(resultString).toContain(body)
      })

      it('works with a long body', () => {
        const body =
          "Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy"
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
        expect(resultString).toContain(body)
      })

      it('works with emojis 😎', () => {
        const body = `Is this the real life? Is this just fantasy? 🤔 Caught in a landslide, no escape from reality 😱 Open your eyes, look up to the skies and see 👀 I'm just a poor boy, I need no sympathy 💐`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
        expect(resultString).toContain(body)
      })

      it('works with a multiline body', () => {
        const body = `
        Is this the real life? Is this just fantasy?
        Caught in a landslide, no escape from reality
        Open your eyes, look up to the skies and see
        I'm just a poor boy, I need no sympathy
        Because I'm easy come, easy go, little high, little low
        Any way the wind blows doesn't really matter to me, to me

        Mama, just killed a man
        Put a gun against his head, pulled my trigger, now he's dead
        Mama, life had just begun
        But now I've gone and thrown it all away
        Mama, ooh, didn't mean to make you cry
        If I'm not back again this time tomorrow
        Carry on, carry on as if nothing really matters
        `
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
        expect(resultString).toContain(body)
      })

      it('does not set the html body if it trims down to an empty string', () => {
        const body = '       '
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `Content-Type: text/html; charset=UTF-8${eol}`,
        )
        expect(resultString).toContain(body)
      })
    })

    describe('attachments', () => {
      it('works with one attachment', () => {
        const body = 'Message body'
        const attachment: EmailAttachment = {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        }

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          attachments: [attachment],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(body)
        expect(resultString).toContain(
          `Content-Type: multipart/mixed; boundary=`,
        )
        expect(resultString).toContain(
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"${eol}`,
        )
        expect(resultString).toContain(
          `Content-Transfer-Encoding: ${attachment.contentTransferEncoding}${eol}`,
        )
        expect(resultString).toContain(attachment.data)
      })

      it('works with two attachments of different types', () => {
        const attachments: EmailAttachment[] = [
          {
            filename: 'attachment1.jpg',
            contentTransferEncoding: 'base64',
            inlineAttachment: false,
            mimeType: 'image/jpg',
            data: Base64.encodeString(`${v4()}-attachment`),
          },
          {
            filename: 'attachment2.txt',
            contentTransferEncoding: 'base64',
            inlineAttachment: false,
            mimeType: 'text/plain',
            data: Base64.encodeString(`${v4()}-attachment`),
          },
        ]
        const body = 'Message body'

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          attachments,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(body)
        expect(resultString).toContain(
          `Content-Type: multipart/mixed; boundary=`,
        )
        expect(resultString).toContain(
          `Content-Type: ${attachments[0].mimeType}; name="${attachments[0].filename}"${eol}`,
        )
        expect(resultString).toContain(
          `Content-Transfer-Encoding: ${attachments[0].contentTransferEncoding}${eol}`,
        )
        expect(resultString).toContain(attachments[0].data)
        expect(resultString).toContain(
          `Content-Type: ${attachments[1].mimeType}; name="${attachments[1].filename}"${eol}`,
        )
        expect(resultString).toContain(
          `Content-Transfer-Encoding: ${attachments[1].contentTransferEncoding}${eol}`,
        )
        expect(resultString).toContain(attachments[1].data)
      })
    })

    describe('inlineAttachments', () => {
      it('works with one attachment', () => {
        const contentId = v4()
        const attachment: EmailAttachment = {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: true,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
          contentId,
        }
        const body = `Message body <img src="cid:${contentId}">`

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          inlineAttachments: [attachment],
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        // expect(resultString).toContain(`Reply-To: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(body)
        expect(resultString).toContain(
          `Content-Type: multipart/mixed; boundary=`,
        )
        expect(resultString).toContain(
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"${eol}`,
        )
        expect(resultString).toContain(
          `Content-Transfer-Encoding: ${attachment.contentTransferEncoding}${eol}`,
        )
        expect(resultString).toContain(attachment.data)
      })
    })

    describe('encryptionStatus', () => {
      it('replaces the body and adds appropriate headers', () => {
        const body = 'This is a secret 🤫'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          encryptionStatus: EncryptionStatus.ENCRYPTED,
          body,
        }

        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        expect(resultString).toContain(
          `From: <${fromAddress.emailAddress}>${eol}`,
        )
        expect(resultString).toContain(`To: ${eol}`)
        expect(resultString).toContain(`Cc: ${eol}`)
        expect(resultString).toContain(`Bcc: ${eol}`)
        expect(resultString).toContain(`Subject: ${eol}`)
        expect(resultString).toContain(
          `${EMAIL_HEADER_NAME_ENCRYPTION}: ${PLATFORM_ENCRYPTION}${eol}`,
        )
        expect(resultString).not.toContain(body)
        expect(resultString).toContain(CANNED_TEXT_BODY)
        expect(resultString).toContain(
          `Content-Type: text/plain; charset=UTF-8${eol}`,
        )
      })
    })

    describe('reply/forward message inclusion', () => {
      it('adds correct header when replying message id is provided', () => {
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          replyMessageId: 'Dummy reply message id',
        }
        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)
        expect(resultString).toContain(
          `In-Reply-To: <${messageDetails.replyMessageId}>`,
        )
      })

      it('adds correct header when forwarding message id is provided', () => {
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          forwardMessageId: 'Dummy forward message id',
        }
        const resultString =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)
        expect(resultString).toContain(
          `References: <${messageDetails.forwardMessageId}>`,
        )
      })
    })

    it('handles a complicated message properly', () => {
      const contentId = v4()
      const inlineAttachment: EmailAttachment = {
        filename: 'attachment1.jpg',
        contentTransferEncoding: 'base64',
        inlineAttachment: true,
        mimeType: 'image/jpg',
        data: Base64.encodeString(`${v4()}-attachment`),
        contentId,
      }
      const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
      const body = `
        🎶🎶🎶🎶
        Is this the real life? Is this just fantasy?
        Caught in a landslide, no escape from reality
        Open your eyes, look up to the skies and see
        I'm just a poor boy, I need no sympathy
        Because I'm easy come, easy go, little high, little low
        Any way the wind blows doesn't really matter to me, to me

        Mama, just killed a man
        Put a gun against his head, pulled my trigger, now he's dead
        Mama, life had just begun
        But now I've gone and thrown it all away
        Mama, ooh, didn't mean to make you cry
        If I'm not back again this time tomorrow
        Carry on, carry on as if nothing really matters
        <img src="cid:${contentId}">
        `
      const attachments: EmailAttachment[] = [
        {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
        {
          filename: 'attachment2.txt',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'text/plain',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
      ]
      const messageDetails: EmailMessageDetails = {
        from: [fromAddress],
        to: [
          { emailAddress: toAddresses[0].emailAddress },
          {
            emailAddress: toAddresses[1].emailAddress,
            displayName: toAddresses[1].displayName,
          },
        ],
        cc: [
          {
            emailAddress: ccAddresses[0].emailAddress,
            displayName: ccAddresses[0].displayName,
          },
          { emailAddress: ccAddresses[1].emailAddress },
        ],
        bcc: [
          { emailAddress: bccAddresses[0].emailAddress },
          { emailAddress: bccAddresses[1].emailAddress },
        ],
        replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        subject,
        body,
        attachments,
        inlineAttachments: [inlineAttachment],
      }

      const resultString =
        Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

      expect(resultString).toContain(
        `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `To: <${toAddresses[0].emailAddress}>,${eol} ${toAddresses[1].displayName} <${toAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Cc: ${ccAddresses[0].displayName} <${ccAddresses[0].emailAddress}>,${eol} <${ccAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Bcc: <${bccAddresses[0].emailAddress}>,${eol} <${bccAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Reply-To: <${replyToAddresses[0].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(`Subject: ${subject}${eol}`)
      expect(resultString).toContain(body)
      expect(resultString).toContain(`Content-Type: multipart/mixed; boundary=`)
      expect(resultString).toContain(
        `Content-Type: ${attachments[0].mimeType}; name="${attachments[0].filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${attachments[0].contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(attachments[0].data)
      expect(resultString).toContain(
        `Content-Type: ${attachments[1].mimeType}; name="${attachments[1].filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${attachments[1].contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(attachments[1].data)
      expect(resultString).toContain(
        `Content-Type: ${inlineAttachment.mimeType}; name="${inlineAttachment.filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${inlineAttachment.contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(inlineAttachment.data)
    })
  })

  describe('encodeToInternetMessageBuffer', () => {
    it('returns the correct buffer', () => {
      // Using the exact same message as the test above
      const contentId = v4()
      const inlineAttachment: EmailAttachment = {
        filename: 'inlineAttachment1.jpg',
        contentTransferEncoding: 'base64',
        inlineAttachment: true,
        mimeType: 'image/jpg',
        data: Base64.encodeString(`${v4()}-attachment`),
        contentId,
      }
      const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
      const body = `
        🎶🎶🎶🎶
        Is this the real life? Is this just fantasy?
        Caught in a landslide, no escape from reality
        Open your eyes, look up to the skies and see
        I'm just a poor boy, I need no sympathy
        Because I'm easy come, easy go, little high, little low
        Any way the wind blows doesn't really matter to me, to me

        Mama, just killed a man
        Put a gun against his head, pulled my trigger, now he's dead
        Mama, life had just begun
        But now I've gone and thrown it all away
        Mama, ooh, didn't mean to make you cry
        If I'm not back again this time tomorrow
        Carry on, carry on as if nothing really matters
        <img src="cid:${contentId}">
        `
      const attachments: EmailAttachment[] = [
        {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
        {
          filename: 'attachment2.txt',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'text/plain',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
      ]
      const messageDetails: EmailMessageDetails = {
        from: [fromAddress],
        to: [
          { emailAddress: toAddresses[0].emailAddress },
          {
            emailAddress: toAddresses[1].emailAddress,
            displayName: toAddresses[1].displayName,
          },
        ],
        cc: [
          {
            emailAddress: ccAddresses[0].emailAddress,
            displayName: ccAddresses[0].displayName,
          },
          { emailAddress: ccAddresses[1].emailAddress },
        ],
        bcc: [
          { emailAddress: bccAddresses[0].emailAddress },
          { emailAddress: bccAddresses[1].emailAddress },
        ],
        replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        subject,
        body,
        attachments,
        inlineAttachments: [inlineAttachment],
      }

      const resultBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer(messageDetails)

      // We can't test for a match against another buffer because each message includes some randomly generated ids
      const resultString = arrayBufferToString(resultBuffer)
      expect(resultString).toContain(
        `From: ${fromAddress.displayName} <${fromAddress.emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `To: <${toAddresses[0].emailAddress}>,${eol} ${toAddresses[1].displayName} <${toAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Cc: ${ccAddresses[0].displayName} <${ccAddresses[0].emailAddress}>,${eol} <${ccAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Bcc: <${bccAddresses[0].emailAddress}>,${eol} <${bccAddresses[1].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(
        `Reply-To: <${replyToAddresses[0].emailAddress}>${eol}`,
      )
      expect(resultString).toContain(`Subject: ${subject}${eol}`)
      expect(resultString).toContain(body)
      expect(resultString).toContain(`Content-Type: multipart/mixed; boundary=`)
      expect(resultString).toContain(
        `Content-Type: ${attachments[0].mimeType}; name="${attachments[0].filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${attachments[0].contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(attachments[0].data)
      expect(resultString).toContain(
        `Content-Type: ${attachments[1].mimeType}; name="${attachments[1].filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${attachments[1].contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(attachments[1].data)
      expect(resultString).toContain(
        `Content-Type: ${inlineAttachment.mimeType}; name="${inlineAttachment.filename}"${eol}`,
      )
      expect(resultString).toContain(
        `Content-Transfer-Encoding: ${inlineAttachment.contentTransferEncoding}${eol}`,
      )
      expect(resultString).toContain(inlineAttachment.data)
    })
  })

  describe('parseInternetMessageData', () => {
    describe('from', () => {
      it('works with no display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with a display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('to', () => {
      test('works with one address', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [{ emailAddress: toAddresses[0].emailAddress }],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(1)
        expect(result.to![0].emailAddress).toEqual(toAddresses[0].emailAddress)
        expect(result.to![0].displayName).toBeFalsy()
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with two addresses', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [
            { emailAddress: toAddresses[0].emailAddress },
            { emailAddress: toAddresses[1].emailAddress },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(2)
        expect(result.to![0].emailAddress).toEqual(toAddresses[0].emailAddress)
        expect(result.to![0].displayName).toBeFalsy()
        expect(result.to![1].emailAddress).toEqual(toAddresses[1].emailAddress)
        expect(result.to![1].displayName).toBeFalsy()
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with or without display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          to: [
            { emailAddress: toAddresses[0].emailAddress },
            {
              emailAddress: toAddresses[1].emailAddress,
              displayName: toAddresses[1].displayName,
            },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(2)
        expect(result.to![0].emailAddress).toEqual(toAddresses[0].emailAddress)
        expect(result.to![0].displayName).toBeFalsy()
        expect(result.to![1].emailAddress).toEqual(toAddresses[1].emailAddress)
        expect(result.to![1].displayName).toEqual(toAddresses[1].displayName)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('cc', () => {
      test('works with one address', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [{ emailAddress: ccAddresses[0].emailAddress }],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(1)
        expect(result.cc![0].emailAddress).toEqual(ccAddresses[0].emailAddress)
        expect(result.cc![0].displayName).toBeFalsy()
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with two addresses', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [
            { emailAddress: ccAddresses[0].emailAddress },
            { emailAddress: ccAddresses[1].emailAddress },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(2)
        expect(result.cc![0].emailAddress).toEqual(ccAddresses[0].emailAddress)
        expect(result.cc![0].displayName).toBeFalsy()
        expect(result.cc![1].emailAddress).toEqual(ccAddresses[1].emailAddress)
        expect(result.cc![1].displayName).toBeFalsy()
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with or without display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          cc: [
            {
              emailAddress: ccAddresses[0].emailAddress,
              displayName: ccAddresses[0].displayName,
            },
            { emailAddress: ccAddresses[1].emailAddress },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(2)
        expect(result.cc![0].emailAddress).toEqual(ccAddresses[0].emailAddress)
        expect(result.cc![0].displayName).toEqual(ccAddresses[0].displayName)
        expect(result.cc![1].emailAddress).toEqual(ccAddresses[1].emailAddress)
        expect(result.cc![1].displayName).toBeFalsy()
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('bcc', () => {
      test('works with one address', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [{ emailAddress: bccAddresses[0].emailAddress }],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(1)
        expect(result.bcc![0].emailAddress).toEqual(
          bccAddresses[0].emailAddress,
        )
        expect(result.bcc![0].displayName).toBeFalsy()
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with two addresses', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [
            { emailAddress: bccAddresses[0].emailAddress },
            { emailAddress: bccAddresses[1].emailAddress },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(2)
        expect(result.bcc![0].emailAddress).toEqual(
          bccAddresses[0].emailAddress,
        )
        expect(result.bcc![0].displayName).toBeFalsy()
        expect(result.bcc![1].emailAddress).toEqual(
          bccAddresses[1].emailAddress,
        )
        expect(result.bcc![1].displayName).toBeFalsy()
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with or without display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          bcc: [
            { emailAddress: bccAddresses[0].emailAddress },
            {
              emailAddress: bccAddresses[1].emailAddress,
              displayName: bccAddresses[1].displayName,
            },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(2)
        expect(result.bcc![0].emailAddress).toEqual(
          bccAddresses[0].emailAddress,
        )
        expect(result.bcc![0].displayName).toBeFalsy()
        expect(result.bcc![1].emailAddress).toEqual(
          bccAddresses[1].emailAddress,
        )
        expect(result.bcc![1].displayName).toEqual(bccAddresses[1].displayName)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('replyTo', () => {
      test('works with one address', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(1)
        expect(result.replyTo![0].emailAddress).toEqual(
          replyToAddresses[0].emailAddress,
        )
        expect(result.replyTo![0].displayName).toBeFalsy()
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      // mimetext currently only supports a single `replyTo` address
      // https://github.com/muratgozel/MIMEText/issues/69
      test.skip('works with two addresses', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [
            { emailAddress: replyToAddresses[0].emailAddress },
            { emailAddress: replyToAddresses[1].emailAddress },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        // mimetext currently only supports a single `replyTo` address
        // https://github.com/muratgozel/MIMEText/issues/69
        expect(result.replyTo).toHaveLength(1)
        expect(result.replyTo![0].emailAddress).toEqual(
          replyToAddresses[0].emailAddress,
        )
        expect(result.replyTo![0].displayName).toBeFalsy()
        // mimetext currently only supports a single `replyTo` address
        // https://github.com/muratgozel/MIMEText/issues/69
        expect(result.replyTo![1].emailAddress).toEqual(
          replyToAddresses[1].emailAddress,
        )
        expect(result.replyTo![1].displayName).toBeFalsy()
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      test('works with or without display name', async () => {
        const messageDetails: EmailMessageDetails = {
          from: [fromAddress],
          replyTo: [
            // mimetext currently only supports a single `replyTo` address
            // https://github.com/muratgozel/MIMEText/issues/69
            // { emailAddress: replyToAddresses[0].emailAddress },
            {
              emailAddress: replyToAddresses[1].emailAddress,
              displayName: replyToAddresses[1].displayName,
            },
          ],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toEqual(fromAddress.displayName)
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        // mimetext currently only supports a single `replyTo` address
        // https://github.com/muratgozel/MIMEText/issues/69
        expect(result.replyTo).toHaveLength(1)
        // mimetext currently only supports a single `replyTo` address
        // https://github.com/muratgozel/MIMEText/issues/69
        // expect(result.replyTo![0].emailAddress).toEqual(
        //   replyToAddresses[0].emailAddress,
        // )
        // expect(result.replyTo![0].displayName).toBeFalsy()
        // mimetext currently only supports a single `replyTo` address so checking only 0th item here. Change to 1st when updated
        // https://github.com/muratgozel/MIMEText/issues/69
        expect(result.replyTo![0].emailAddress).toEqual(
          replyToAddresses[1].emailAddress,
        )
        expect(result.replyTo![0].displayName).toEqual(
          replyToAddresses[1].displayName,
        )
        expect(result.body).toBeFalsy()
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('subject', () => {
      it('works with a short subject', async () => {
        const subject = 'This is a short subject'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toEqual(subject)
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with a long subject', async () => {
        const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toEqual(subject)
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with emojis 😎', async () => {
        const subject = `Is this the real life? Is this just fantasy? 🤔 Caught in a landslide, no escape from reality 😱 Open your eyes, look up to the skies and see 👀 I'm just a poor boy, I need no sympathy 💐`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          subject,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toBeFalsy()
        expect(result.subject).toEqual(subject)
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('body', () => {
      it('works with a short body', async () => {
        const body = 'This is a short body'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with a long body', async () => {
        const body =
          "Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy"
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with emojis 😎', async () => {
        const body = `Is this the real life? Is this just fantasy? 🤔 Caught in a landslide, no escape from reality 😱 Open your eyes, look up to the skies and see 👀 I'm just a poor boy, I need no sympathy 💐`
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with a multiline body', async () => {
        const body = `
        Is this the real life? Is this just fantasy?
        Caught in a landslide, no escape from reality
        Open your eyes, look up to the skies and see
        I'm just a poor boy, I need no sympathy
        Because I'm easy come, easy go, little high, little low
        Any way the wind blows doesn't really matter to me, to me

        Mama, just killed a man
        Put a gun against his head, pulled my trigger, now he's dead
        Mama, life had just begun
        But now I've gone and thrown it all away
        Mama, ooh, didn't mean to make you cry
        If I'm not back again this time tomorrow
        Carry on, carry on as if nothing really matters
        `
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body.trim())
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('attachments', () => {
      it('works with one attachment', async () => {
        const body = 'This is a short body'
        const attachment: EmailAttachment = {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        }

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          attachments: [attachment],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)
        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(1)
        expect(result.attachments![0].contentId).toBeUndefined()
        expect(result.attachments![0].contentTransferEncoding).toEqual(
          attachment.contentTransferEncoding,
        )
        expect(result.attachments![0].data).toEqual(attachment.data)
        expect(result.attachments![0].filename).toEqual(attachment.filename)
        expect(result.attachments![0].inlineAttachment).toEqual(
          attachment.inlineAttachment,
        )
        expect(result.attachments![0].mimeType).toEqual(attachment.mimeType)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })

      it('works with two attachments of different types', async () => {
        const attachments: EmailAttachment[] = [
          {
            filename: 'attachment1.jpg',
            contentTransferEncoding: 'base64',
            inlineAttachment: false,
            mimeType: 'image/jpg',
            data: Base64.encodeString(`${v4()}-attachment`),
          },
          {
            filename: 'attachment2.txt',
            contentTransferEncoding: 'base64',
            inlineAttachment: false,
            mimeType: 'text/plain',
            data: Base64.encodeString(`${v4()}-attachment`),
          },
        ]
        const body = 'Message body'

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          attachments,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)
        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(2)
        expect(result.attachments![0].contentId).toBeUndefined()
        expect(result.attachments![0].contentTransferEncoding).toEqual(
          attachments[0].contentTransferEncoding,
        )
        expect(result.attachments![0].data).toEqual(attachments[0].data)
        expect(result.attachments![0].filename).toEqual(attachments[0].filename)
        expect(result.attachments![0].inlineAttachment).toEqual(
          attachments[0].inlineAttachment,
        )
        expect(result.attachments![0].mimeType).toEqual(attachments[0].mimeType)
        expect(result.attachments![1].contentId).toBeUndefined()
        expect(result.attachments![1].contentTransferEncoding).toEqual(
          attachments[1].contentTransferEncoding,
        )
        expect(result.attachments![1].data).toEqual(attachments[1].data)
        expect(result.attachments![1].filename).toEqual(attachments[1].filename)
        expect(result.attachments![1].inlineAttachment).toEqual(
          attachments[1].inlineAttachment,
        )
        expect(result.attachments![1].mimeType).toEqual(attachments[1].mimeType)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('inlineAttachments', () => {
      it('works with one attachment', async () => {
        const contentId = v4()
        const attachment: EmailAttachment = {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: true,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
          contentId,
        }
        const body = `Message body <img src="cid:${contentId}">`

        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          body,
          inlineAttachments: [attachment],
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)
        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body?.trim()).toEqual(body)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(1)
        expect(result.inlineAttachments![0].contentId).toEqual(contentId)
        expect(result.inlineAttachments![0].contentTransferEncoding).toEqual(
          attachment.contentTransferEncoding,
        )
        expect(result.inlineAttachments![0].data).toEqual(attachment.data)
        expect(result.inlineAttachments![0].filename).toEqual(
          attachment.filename,
        )
        expect(result.inlineAttachments![0].inlineAttachment).toEqual(
          attachment.inlineAttachment,
        )
        expect(result.inlineAttachments![0].mimeType).toEqual(
          attachment.mimeType,
        )
        expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
      })
    })

    describe('encryptionStatus', () => {
      it('replaces the body and adds appropriate headers', async () => {
        const body = 'This is a secret 🤫'
        const messageDetails: EmailMessageDetails = {
          from: [{ emailAddress: fromAddress.emailAddress }],
          encryptionStatus: EncryptionStatus.ENCRYPTED,
          body,
        }

        const msgStr =
          Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

        const result =
          await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

        expect(result.from).toHaveLength(1)
        expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
        expect(result.from[0].displayName).toBeFalsy()
        expect(result.to).toHaveLength(0)
        expect(result.cc).toHaveLength(0)
        expect(result.bcc).toHaveLength(0)
        expect(result.replyTo).toHaveLength(0)
        expect(result.body).toEqual(CANNED_TEXT_BODY)
        expect(result.subject).toBeFalsy()
        expect(result.attachments).toHaveLength(0)
        expect(result.inlineAttachments).toHaveLength(0)
        expect(result.encryptionStatus).toEqual(EncryptionStatus.ENCRYPTED)
      })
    })

    it('handles a complicated message properly', async () => {
      const contentId = v4()
      const inlineAttachment: EmailAttachment = {
        filename: 'inlineAttachment1.jpg',
        contentTransferEncoding: 'base64',
        inlineAttachment: true,
        mimeType: 'image/jpg',
        data: Base64.encodeString(`${v4()}-attachment`),
        contentId,
      }
      const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
      const body =
        '🎶🎶🎶🎶\n' +
        'Is this the real life? Is this just fantasy?\n' +
        'Caught in a landslide, no escape from reality\n' +
        'Open your eyes, look up to the skies and see\n' +
        "I'm just a poor boy, I need no sympathy\n" +
        "Because I'm easy come, easy go, little high, little low\n" +
        "Any way the wind blows doesn't really matter to me, to me\n" +
        '\n' +
        'Mama, just killed a man\n' +
        "Put a gun against his head, pulled my trigger, now he's dead\n" +
        'Mama, life had just begun\n' +
        "But now I've gone and thrown it all away\n" +
        "Mama, ooh, didn't mean to make you cry\n" +
        "If I'm not back again this time tomorrow\n" +
        'Carry on, carry on as if nothing really matters\n' +
        `<img src="cid:${contentId}">`

      const attachments: EmailAttachment[] = [
        {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
        {
          filename: 'attachment2.txt',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'text/plain',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
      ]
      const messageDetails: EmailMessageDetails = {
        from: [fromAddress],
        to: [
          { emailAddress: toAddresses[0].emailAddress },
          {
            emailAddress: toAddresses[1].emailAddress,
            displayName: toAddresses[1].displayName,
          },
        ],
        cc: [
          {
            emailAddress: ccAddresses[0].emailAddress,
            displayName: ccAddresses[0].displayName,
          },
          { emailAddress: ccAddresses[1].emailAddress },
        ],
        bcc: [
          { emailAddress: bccAddresses[0].emailAddress },
          { emailAddress: bccAddresses[1].emailAddress },
        ],
        replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        subject,
        body: body.trim(),
        attachments,
        inlineAttachments: [inlineAttachment],
      }

      const msgStr =
        Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

      const result =
        await Rfc822MessageDataProcessor.parseInternetMessageData(msgStr)

      expect(result.from).toHaveLength(1)
      expect(result.from[0].emailAddress).toEqual(fromAddress.emailAddress)
      expect(result.from[0].displayName).toEqual(fromAddress.displayName)
      expect(result.to).toHaveLength(2)
      expect(result.to![0].emailAddress).toEqual(toAddresses[0].emailAddress)
      expect(result.to![0].displayName).toBeFalsy()
      expect(result.to![1].emailAddress).toEqual(toAddresses[1].emailAddress)
      expect(result.to![1].displayName).toEqual(toAddresses[1].displayName)
      expect(result.cc).toHaveLength(2)
      expect(result.cc![0].emailAddress).toEqual(ccAddresses[0].emailAddress)
      expect(result.cc![0].displayName).toEqual(ccAddresses[0].displayName)
      expect(result.cc![1].emailAddress).toEqual(ccAddresses[1].emailAddress)
      expect(result.cc![1].displayName).toBeFalsy()
      expect(result.bcc).toHaveLength(2)
      expect(result.bcc![0].emailAddress).toEqual(bccAddresses[0].emailAddress)
      expect(result.bcc![0].displayName).toBeFalsy()
      expect(result.bcc![1].emailAddress).toEqual(bccAddresses[1].emailAddress)
      expect(result.bcc![1].displayName).toBeFalsy()
      expect(result.replyTo).toHaveLength(1)
      expect(result.replyTo![0].emailAddress).toEqual(
        replyToAddresses[0].emailAddress,
      )
      expect(result.replyTo![0].displayName).toBeFalsy()
      expect(result.body?.trim()).toEqual(body)
      expect(result.subject).toEqual(subject)

      expect(result.attachments).toHaveLength(2)
      expect(result.attachments![0].contentId).toBeUndefined()
      expect(result.attachments![0].contentTransferEncoding).toEqual(
        attachments[0].contentTransferEncoding,
      )
      expect(result.attachments![0].data).toEqual(attachments[0].data)
      expect(result.attachments![0].filename).toEqual(attachments[0].filename)
      expect(result.attachments![0].inlineAttachment).toEqual(
        attachments[0].inlineAttachment,
      )
      expect(result.attachments![0].mimeType).toEqual(attachments[0].mimeType)
      expect(result.attachments![1].contentId).toBeUndefined()
      expect(result.attachments![1].contentTransferEncoding).toEqual(
        attachments[1].contentTransferEncoding,
      )
      expect(result.attachments![1].data).toEqual(attachments[1].data)
      expect(result.attachments![1].filename).toEqual(attachments[1].filename)
      expect(result.attachments![1].inlineAttachment).toEqual(
        attachments[1].inlineAttachment,
      )
      expect(result.attachments![1].mimeType).toEqual(attachments[1].mimeType)
      expect(result.inlineAttachments).toHaveLength(1)
      expect(result.inlineAttachments![0].contentId).toEqual(contentId)
      expect(result.inlineAttachments![0].contentTransferEncoding).toEqual(
        inlineAttachment.contentTransferEncoding,
      )
      expect(result.inlineAttachments![0].data).toEqual(inlineAttachment.data)
      expect(result.inlineAttachments![0].filename).toEqual(
        inlineAttachment.filename,
      )
      expect(result.inlineAttachments![0].inlineAttachment).toEqual(
        inlineAttachment.inlineAttachment,
      )
      expect(result.inlineAttachments![0].mimeType).toEqual(
        inlineAttachment.mimeType,
      )
      expect(result.encryptionStatus).toEqual(EncryptionStatus.UNENCRYPTED)
    })
  })

  describe('interoperability test', () => {
    it('object going into encodeToInternetMessageStr matches object coming out of ParseInternetMessageData', async () => {
      const contentId = v4()
      const inlineAttachment: EmailAttachment = {
        filename: 'inlineAttachment1.jpg',
        contentTransferEncoding: 'base64',
        inlineAttachment: true,
        mimeType: 'image/jpg',
        data: Base64.encodeString(`${v4()}-attachment`),
        contentId,
      }
      const subject = `Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality Open your eyes, look up to the skies and see I'm just a poor boy, I need no sympathy`
      const body =
        '🎶🎶🎶🎶\n' +
        'Is this the real life? Is this just fantasy?\n' +
        'Caught in a landslide, no escape from reality\n' +
        'Open your eyes, look up to the skies and see\n' +
        "I'm just a poor boy, I need no sympathy\n" +
        "Because I'm easy come, easy go, little high, little low\n" +
        "Any way the wind blows doesn't really matter to me, to me\n" +
        '\n' +
        'Mama, just killed a man\n' +
        "Put a gun against his head, pulled my trigger, now he's dead\n" +
        'Mama, life had just begun\n' +
        "But now I've gone and thrown it all away\n" +
        "Mama, ooh, didn't mean to make you cry\n" +
        "If I'm not back again this time tomorrow\n" +
        'Carry on, carry on as if nothing really matters\n' +
        `<img src="cid:${contentId}">`

      const attachments: EmailAttachment[] = [
        {
          filename: 'attachment1.jpg',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'image/jpg',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
        {
          filename: 'attachment2.txt',
          contentTransferEncoding: 'base64',
          inlineAttachment: false,
          mimeType: 'text/plain',
          data: Base64.encodeString(`${v4()}-attachment`),
        },
      ]
      const messageDetails: EmailMessageDetails = {
        from: [fromAddress],
        to: [
          { emailAddress: toAddresses[0].emailAddress },
          {
            emailAddress: toAddresses[1].emailAddress,
            displayName: toAddresses[1].displayName,
          },
        ],
        cc: [
          {
            emailAddress: ccAddresses[0].emailAddress,
            displayName: ccAddresses[0].displayName,
          },
          { emailAddress: ccAddresses[1].emailAddress },
        ],
        bcc: [
          { emailAddress: bccAddresses[0].emailAddress },
          { emailAddress: bccAddresses[1].emailAddress },
        ],
        replyTo: [{ emailAddress: replyToAddresses[0].emailAddress }],
        subject,
        body: body.trim(),
        attachments,
        inlineAttachments: [inlineAttachment],
      }

      const encodedRfc822String =
        Rfc822MessageDataProcessor.encodeToInternetMessageStr(messageDetails)

      const decodedRfc822Object =
        await Rfc822MessageDataProcessor.parseInternetMessageData(
          encodedRfc822String,
        )

      expect({
        ...decodedRfc822Object,
        body: decodedRfc822Object.body?.trim(),
      }).toMatchObject<EmailMessageDetails>({
        ...messageDetails,
        body: messageDetails.body?.trim(),
      })
    })
  })
})
