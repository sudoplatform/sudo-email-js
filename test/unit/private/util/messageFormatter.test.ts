import { EmailAddressDetail } from '../../../../src/public'
import { MessageFormatter } from '../../../../src/private/util/messageFormatter'

describe('messageFormatter unit tests', () => {
  const fromAddress: EmailAddressDetail = {
    emailAddress: 'from@example.com',
    displayName: 'from',
  }
  const toAddresses: EmailAddressDetail[] = [
    { emailAddress: 'to1@example.com', displayName: 'to1' },
    { emailAddress: 'to2@example.com', displayName: 'to2' },
  ]
  const ccAddresses: EmailAddressDetail[] = [
    { emailAddress: 'cc1@example.com', displayName: 'cc1' },
    { emailAddress: 'cc2@example.com', displayName: 'cc2' },
  ]
  const dates = [
    new Date(1715312211228), // 'Friday, 10 May 2024 at 1:36 PM'
    new Date(1635312211228), // 'Wednesday, 27 October 2021 at 3:23 PM'
  ]
  const subject = 'Dummy subject'
  const body = 'Dummy message body'

  it.each([[dates[0]], [dates[1]]])(
    'should format date object into valid email message date string',
    (date) => {
      // Crude regex to match date string format, as this can vary depending on the system
      const timestampRegex =
        /(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, \d{1,2} [A-Z][a-z]{2,8} \d{4} at \d{1,2}:\d{2} (AM|PM)/
      expect(MessageFormatter.formatDateForEmail(date)).toMatch(timestampRegex)
    },
  )

  it('should correctly encode reply message details', () => {
    const replyMessageDetails = {
      from: [fromAddress],
      date: dates[0],
      subject,
      body,
    }
    const expectedEncodedReplyMessage =
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<hr>\n' +
      `<div class="replyMessage">From: ${replyMessageDetails.from[0].displayName} <${replyMessageDetails.from[0].emailAddress}></div>\n` +
      `<div class="replyMessage">Date: ${MessageFormatter.formatDateForEmail(replyMessageDetails.date)}</div>\n` +
      `<div class="replyMessage">Subject: ${replyMessageDetails.subject}</div>\n` +
      `<div><br/>${replyMessageDetails.body}<br/></div>`

    const formattedReplyMessage =
      MessageFormatter.encodeReplyMessage(replyMessageDetails)
    expect(formattedReplyMessage).toEqual(expectedEncodedReplyMessage)
  })

  it('should strip and replace html image tags encoded reply message body', () => {
    const replyMessageDetails = {
      from: [fromAddress],
      date: dates[0],
      subject,
      body: 'Some body text with multiple <img src="image-source" /> images <img src="another-image-source" />',
    }
    const expectedEncodedReplyMessage =
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<hr>\n' +
      `<div class="replyMessage">From: ${replyMessageDetails.from[0].displayName} <${replyMessageDetails.from[0].emailAddress}></div>\n` +
      `<div class="replyMessage">Date: ${MessageFormatter.formatDateForEmail(replyMessageDetails.date)}</div>\n` +
      `<div class="replyMessage">Subject: ${replyMessageDetails.subject}</div>\n` +
      `<div><br/>Some body text with multiple -IMAGE REMOVED-<br/> images -IMAGE REMOVED-<br/><br/></div>`

    const formattedReplyMessage =
      MessageFormatter.encodeReplyMessage(replyMessageDetails)
    expect(formattedReplyMessage).toEqual(expectedEncodedReplyMessage)
  })

  it('should correctly format email message details when reply message details are provided', () => {
    const messageDetails = {
      from: [fromAddress],
      body: 'Dummy message body of first message',
      subject: '',
    }
    const replyMessageDetails = {
      from: [fromAddress],
      date: dates[0],
      subject,
      body,
    }
    const expectedEncodedReplyMessage =
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<hr>\n' +
      `<div class="replyMessage">From: ${replyMessageDetails.from[0].displayName} <${replyMessageDetails.from[0].emailAddress}></div>\n` +
      `<div class="replyMessage">Date: ${MessageFormatter.formatDateForEmail(replyMessageDetails.date)}</div>\n` +
      `<div class="replyMessage">Subject: ${replyMessageDetails.subject}</div>\n` +
      `<div><br/>${replyMessageDetails.body}<br/></div>`

    const formattedMessageDetails = MessageFormatter.formatAsReplyingMessage(
      messageDetails,
      replyMessageDetails,
    )
    expect(formattedMessageDetails.body).toContain(messageDetails.body)
    expect(formattedMessageDetails.body).toContain(expectedEncodedReplyMessage)
    expect(formattedMessageDetails.subject).toEqual(
      `Re: ${replyMessageDetails.subject}`,
    )
  })

  it('should correctly encode forward message details', () => {
    const forwardMessageDetails = {
      from: [fromAddress],
      date: dates[1],
      to: toAddresses,
      cc: ccAddresses,
      subject,
      body,
    }
    const expectedEncodedForwardMessage =
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage">---------- Forwarded message ----------</div>\n' +
      `<div class="forwardMessage">From: ${forwardMessageDetails.from[0].displayName} <${forwardMessageDetails.from[0].emailAddress}></div>\n` +
      `<div class="forwardMessage">Date: ${MessageFormatter.formatDateForEmail(forwardMessageDetails.date)}</div>\n` +
      `<div class="forwardMessage">Subject: ${forwardMessageDetails.subject}</div>\n` +
      `<div class="forwardMessage">\n` +
      `To: ${forwardMessageDetails.to[0].displayName} <${forwardMessageDetails.to[0].emailAddress}>,${forwardMessageDetails.to[1].displayName} <${forwardMessageDetails.to[1].emailAddress}><br/>\n` +
      `Cc: ${forwardMessageDetails.cc[0].displayName} <${forwardMessageDetails.cc[0].emailAddress}>,${forwardMessageDetails.cc[1].displayName} <${forwardMessageDetails.cc[1].emailAddress}><br/>\n` +
      '</div>\n' +
      `<div><br/>${body}<br/></div>`

    const formattedForwardMessage = MessageFormatter.encodeForwardMessage(
      forwardMessageDetails,
    )
    expect(formattedForwardMessage).toEqual(expectedEncodedForwardMessage)
  })

  it('should correctly format email message details when forward message details are provided', () => {
    const messageDetails = {
      from: [fromAddress],
      body: 'Dummy message body of first message',
      subject: '',
    }
    const forwardMessageDetails = {
      from: [fromAddress],
      date: dates[1],
      to: toAddresses,
      cc: ccAddresses,
      subject,
      body,
    }
    const expectedEncodedForwardMessage =
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage">---------- Forwarded message ----------</div>\n' +
      `<div class="forwardMessage">From: ${forwardMessageDetails.from[0].displayName} <${forwardMessageDetails.from[0].emailAddress}></div>\n` +
      `<div class="forwardMessage">Date: ${MessageFormatter.formatDateForEmail(forwardMessageDetails.date)}</div>\n` +
      `<div class="forwardMessage">Subject: ${forwardMessageDetails.subject}</div>\n` +
      `<div class="forwardMessage">\n` +
      `To: ${forwardMessageDetails.to[0].displayName} <${forwardMessageDetails.to[0].emailAddress}>,${forwardMessageDetails.to[1].displayName} <${forwardMessageDetails.to[1].emailAddress}><br/>\n` +
      `Cc: ${forwardMessageDetails.cc[0].displayName} <${forwardMessageDetails.cc[0].emailAddress}>,${forwardMessageDetails.cc[1].displayName} <${forwardMessageDetails.cc[1].emailAddress}><br/>\n` +
      '</div>\n' +
      `<div><br/>${body}<br/></div>`

    const formattedMessageDetails = MessageFormatter.formatAsForwardingMessage(
      messageDetails,
      forwardMessageDetails,
    )
    expect(formattedMessageDetails.body).toContain(messageDetails.body)
    expect(formattedMessageDetails.body).toContain(
      expectedEncodedForwardMessage,
    )
    expect(formattedMessageDetails.subject).toEqual(
      'Fwd: ' + forwardMessageDetails.subject,
    )
  })
})
