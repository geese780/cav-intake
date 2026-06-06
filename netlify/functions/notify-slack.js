exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    try {
      const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
      const data = JSON.parse(event.body);
  
      const now        = new Date();
      const timeString = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  
      const slackPayload = {
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: '📁 New File Submission', emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Project*\n${data.projectName}` },
              { type: 'mrkdwn', text: `*Submitted*\n${timeString}` },
              { type: 'mrkdwn', text: `*Submitted By*\n${data.submittedBy}` },
              { type: 'mrkdwn', text: `*Company / Team*\n${data.company}` },
              { type: 'mrkdwn', text: `*Project Element*\n${data.projectElement}` },
              { type: 'mrkdwn', text: `*Document Type*\n${data.documentType}` },
              { type: 'mrkdwn', text: `*Version*\n${data.version}` },
              { type: 'mrkdwn', text: `*Supersedes / Related To*\n${data.supersedes || '—'}` }
            ]
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*File*\n\`${data.fileName}\`` }
          },
          ...(data.notes ? [{
            type: 'section',
            text: { type: 'mrkdwn', text: `*Notes*\n${data.notes}` }
          }] : []),
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Dropbox path: \`${data.dropboxPath}\`` }
            ]
          },
          { type: 'divider' }
        ]
      };
  
      const slackRes = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload)
      });
  
      if (!slackRes.ok) throw new Error('Slack webhook failed');
  
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
  
    } catch (err) {
      console.error(err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  };