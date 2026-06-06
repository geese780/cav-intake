exports.handler = async (event) => {
  try {
    const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN;

    // First let's see what we can get from the lists API
    const res = await fetch(`https://slack.com/api/lists.getList?list_id=F0AD8RUFQ7M`, {
      headers: {
        'Authorization': `Bearer ${SLACK_USER_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    console.log('Lists API response:', JSON.stringify(data, null, 2));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error('Error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};