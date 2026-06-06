exports.handler = async (event) => {
  try {
    const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
    const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;

    const body = new URLSearchParams(event.body);
    const payload_raw = body.get('payload');

    // ── Slash command — open modal ────────────────────────────────
    if (!payload_raw) {
      const trigger_id = body.get('trigger_id');

      fetch('https://slack.com/api/views.open', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SLACK_USER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger_id,
          view: {
            type: 'modal',
            callback_id: 'add_element_modal',
            title: { type: 'plain_text', text: 'Add Project Element' },
            submit: { type: 'plain_text', text: 'Add Element' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
              {
                type: 'input',
                block_id: 'element_name',
                label: { type: 'plain_text', text: 'Element Name' },
                element: {
                  type: 'plain_text_input',
                  action_id: 'element_name_input',
                  placeholder: { type: 'plain_text', text: 'e.g. Load Cells, FOH Layout' }
                }
              },
              {
                type: 'input',
                block_id: 'department',
                label: { type: 'plain_text', text: 'Department' },
                element: {
                  type: 'static_select',
                  action_id: 'department_select',
                  placeholder: { type: 'plain_text', text: 'Select department...' },
                  options: [
                    { text: { type: 'plain_text', text: 'Rigging' }, value: 'Rigging' },
                    { text: { type: 'plain_text', text: 'Lighting' }, value: 'Lighting' },
                    { text: { type: 'plain_text', text: 'Audio' }, value: 'Audio' },
                    { text: { type: 'plain_text', text: 'Video' }, value: 'Video' },
                    { text: { type: 'plain_text', text: 'Staging' }, value: 'Staging' },
                    { text: { type: 'plain_text', text: 'Automation' }, value: 'Automation' },
                    { text: { type: 'plain_text', text: 'Scenic' }, value: 'Scenic' },
                    { text: { type: 'plain_text', text: 'SFX' }, value: 'SFX' },
                    { text: { type: 'plain_text', text: 'Infrastructure' }, value: 'Infrastructure' },
                    { text: { type: 'plain_text', text: 'Other' }, value: 'Other' }
                  ]
                }
              }
            ]
          }
        })
      }).catch(err => console.error('Modal open error:', err));

      // Respond immediately to Slack
      return { statusCode: 200, body: '' };
    }

    // ── Modal submission ──────────────────────────────────────────
    const payload = JSON.parse(payload_raw);

    if (payload.type === 'view_submission' && payload.view.callback_id === 'add_element_modal') {
      const values = payload.view.state.values;
      const elementName = values.element_name.element_name_input.value;
      const department = values.department.department_select.selected_option.value;

      // Acknowledge Slack immediately — do GitHub work after
      const githubWork = async () => {
        try {
          const getRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/elements.json`,
            {
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          );

          let elements = [];
          let sha = null;

          if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
            elements = JSON.parse(Buffer.from(fileData.content, 'base64').toString());
          }

          elements.push({ name: elementName, department });
          elements.sort((a, b) => {
            if (a.department !== b.department) return a.department.localeCompare(b.department);
            return a.name.localeCompare(b.name);
          });

          const updateRes = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/elements.json`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Add element: ${elementName} (${department})`,
                content: Buffer.from(JSON.stringify(elements, null, 2)).toString('base64'),
                ...(sha && { sha })
              })
            }
          );

          if (updateRes.ok) {
            console.log(`Successfully added: ${elementName} (${department})`);
          } else {
            const err = await updateRes.json();
            console.error('GitHub write error:', JSON.stringify(err));
          }
        } catch (err) {
          console.error('GitHub work error:', err.message);
        }
      };

      // Fire and forget — don't await
      githubWork();

      // Return immediately to Slack
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_action: 'clear' })
      };
    }

    return { statusCode: 200, body: '' };

  } catch (err) {
    console.error('Function error:', err.message);
    return { statusCode: 200, body: '' };
  }
};