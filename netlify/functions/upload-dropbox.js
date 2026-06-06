exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
  
    try {
      const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
      const DROPBOX_FOLDER = '/cav_intake_v2/tait-cav-internal-testing/incoming';
  
      const boundary = event.headers['content-type'].split('boundary=')[1];
      const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  
      const parts = parseMultipart(body, boundary);
      const fields = {};
      let fileBuffer, fileOriginalName;
  
      for (const part of parts) {
        if (part.filename) {
          fileBuffer = part.data;
          fileOriginalName = part.filename;
        } else {
          fields[part.name] = part.data.toString();
        }
      }
  
      if (!fileBuffer) {
        return { statusCode: 400, body: JSON.stringify({ error: 'No file found in submission' }) };
      }
  
      const timestamp   = new Date().toISOString().replace(/[:.]/g, '-');
      const safeElement = (fields.projectElement || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
      const version     = (fields.version || 'v1').replace(/[^a-zA-Z0-9]/g, '_');
      const dropboxPath = `${DROPBOX_FOLDER}/${safeElement}__${version}__${timestamp}__${fileOriginalName}`;
  
      console.log('Uploading to Dropbox path:', dropboxPath);
      console.log('Token present:', !!DROPBOX_ACCESS_TOKEN);
  
      const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path: dropboxPath,
            mode: 'add',
            autorename: true,
            mute: false
          })
        },
        body: fileBuffer
      });
  
      const rawResponse = await uploadRes.text();
      console.log('Dropbox response status:', uploadRes.status);
      console.log('Dropbox response body:', rawResponse);
  
      if (!uploadRes.ok) {
        return { 
          statusCode: 500, 
          body: JSON.stringify({ error: `Dropbox error: ${rawResponse}` }) 
        };
      }
  
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, dropboxPath })
      };
  
    } catch (err) {
      console.error('Function error:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  };
  
  function parseMultipart(buffer, boundary) {
    const parts = [];
    const boundaryBuf = Buffer.from('--' + boundary);
    let start = 0;
  
    while (true) {
      const boundaryIndex = buffer.indexOf(boundaryBuf, start);
      if (boundaryIndex === -1) break;
      const headerStart = boundaryIndex + boundaryBuf.length + 2;
      const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
      if (headerEnd === -1) break;
      const headers = buffer.slice(headerStart, headerEnd).toString();
      const dataStart = headerEnd + 4;
      const nextBoundary = buffer.indexOf(boundaryBuf, dataStart);
      if (nextBoundary === -1) break;
      const data = buffer.slice(dataStart, nextBoundary - 2);
  
      const nameMatch = headers.match(/name="([^"]+)"/);
      const filenameMatch = headers.match(/filename="([^"]+)"/);
  
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : null,
          data
        });
      }
      start = nextBoundary;
    }
    return parts;
  }