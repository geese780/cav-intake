exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
    const DROPBOX_FOLDER = process.env.DROPBOX_FOLDER || '/cav_intake_v2/incoming';
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

    const data = JSON.parse(event.body);

    console.log('Workflow intake received:', JSON.stringify(data));

    const {
      submitted_by,
      company,
      project_element,
      document_type,
      version,
      supersedes,
      notes,
      file_link,
      channel_name
    } = data;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeElement = (project_element || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const safeVersion = (version || 'v1').replace(/[^a-zA-Z0-9]/g, '_');
    const dropboxPath = `${DROPBOX_FOLDER}/${safeElement}__${safeVersion}__${timestamp}`;

    const now = new Date();
    const timeString = now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    // Post confirmation to Slack
    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📁 New File Submission', emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Submitted By*\n${submitted_by}` },
            { type: 'mrkdwn', text: `*Company / Team*\n${company}` },
            { type: 'mrkdwn', text: `*Project Element*\n${project_element}` },
            { type: 'mrkdwn', text: `*Document Type*\n${document_type}` },
            { type: 'mrkdwn', text: `*Version*\n${version}` },
            { type: 'mrkdwn', text: `*Supersedes / Related To*\n${supersedes || '—'}` }
          ]
        },
        ...(file_link ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*File Link*\n${file_link}` }
        }] : []),
        ...(notes ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `*Notes*\n${notes}` }
        }] : []),
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Submitted at ${timeString} via Slack Workflow${channel_name ? ` in #${channel_name}` : ''}` }
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error('workflow-intake error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};