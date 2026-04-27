'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const {
  listSeries,
  getStandings,
  getGroups,
  BrasileiroApiError
} = require('../../index.js');

const PORT = Number(process.env.PORT || 3020);
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const FIXTURES_DIR = path.join(__dirname, '..', '..', 'test', 'fixtures');
const USE_FIXTURES = process.env.DEMO_USE_FIXTURES === '1';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  try {
    if (url.pathname === '/api/series') {
      return sendJson(response, 200, {
        items: listSeries()
      });
    }

    if (url.pathname === '/api/groups') {
      const serie = url.searchParams.get('serie') || 'd';
      const groups = await getGroups(serie, resolveDemoOptions(serie));

      return sendJson(response, 200, {
        items: groups.map((group) => ({
          id: group.id,
          name: group.name
        }))
      });
    }

    if (url.pathname === '/api/standings') {
      const serie = url.searchParams.get('serie') || 'a';
      const group = url.searchParams.get('group');
      const standings = await getStandings(serie, {
        ...resolveDemoOptions(serie),
        ...(group ? { group } : {})
      });

      return sendJson(response, 200, standings);
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return sendFile(response, path.join(PUBLIC_DIR, 'index.html'));
    }

    const filePath = safePublicPath(url.pathname);

    if (!filePath) {
      return sendJson(response, 404, {
        error: 'Not Found'
      });
    }

    return sendFile(response, filePath);
  } catch (error) {
    if (error instanceof BrasileiroApiError) {
      return sendJson(response, statusFromError(error), {
        name: error.name,
        code: error.code,
        message: error.message,
        details: error.details || null
      });
    }

    return sendJson(response, 500, {
      name: 'InternalServerError',
      message: error instanceof Error ? error.message : 'Unexpected error'
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Demo running at http://${HOST}:${PORT}`);
  if (USE_FIXTURES) {
    console.log('Fixture mode enabled');
  }
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': CONTENT_TYPES['.json'],
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendFile(response, filePath) {
  let stat;

  try {
    stat = fs.statSync(filePath);
  } catch {
    response.writeHead(404, {
      'content-type': CONTENT_TYPES['.json']
    });
    response.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  if (!stat.isFile()) {
    response.writeHead(404, {
      'content-type': CONTENT_TYPES['.json']
    });
    response.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  const extension = path.extname(filePath).toLowerCase();

  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extension] || 'application/octet-stream',
    'cache-control': extension === '.html' ? 'no-store' : 'public, max-age=300'
  });

  fs.createReadStream(filePath).pipe(response);
}

function safePublicPath(pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const normalized = path.normalize(requested).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, normalized);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return filePath;
}

function statusFromError(error) {
  switch (error.code) {
    case 'INVALID_SERIE':
    case 'GROUP_REQUIRED':
    case 'FETCH_UNAVAILABLE':
      return 400;
    case 'GROUP_NOT_FOUND':
      return 404;
    case 'ROUND_NOT_AVAILABLE':
      return 422;
    default:
      return 502;
  }
}

function resolveDemoOptions(serie) {
  if (!USE_FIXTURES) {
    return {};
  }

  const fixturePath = path.join(FIXTURES_DIR, `serie-${serie}.html`);

  return {
    html: fs.readFileSync(fixturePath, 'utf8')
  };
}
