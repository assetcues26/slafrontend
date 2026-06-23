const alert = $('Build Email HTML').item.json;
const gmail = $('Send Email Alert').item?.json || {};

const emailSent = !gmail.error && !!(gmail.id || gmail.threadId);

return {
  json: {
    ...alert,
    _emailSent: emailSent,
    _gmailMessageId: gmail.id || '',
    _gmailThreadId: gmail.threadId || '',
  },
};
