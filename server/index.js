import { WebSocketServer } from 'ws';
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import { generateCard } from './cardGenerator.js';

const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";
const distPath = resolve('dist');

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = resolve(distPath, `.${decodeURIComponent(requestPath)}`);

  if (!filePath.startsWith(distPath) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'text/plain',
  });
  createReadStream(filePath).pipe(response);
});

const wss = new WebSocketServer({ server });

const sendJson = (socket, payload) => {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const parseMessage = (rawMessage) => {
  try {
    return JSON.parse(rawMessage.toString());
  } catch {
    return null;
  }
};

const validateTopic = (topic) =>
  typeof topic === 'string' && topic.trim().length > 0;

async function streamCards(socket, { topic, mode }) {
  if (!validateTopic(topic)) {
    sendJson(socket, {
      type: 'error',
      message: 'Please enter a topic before generating cards.',
    });
    return;
  }

  socket.currentTopic = topic.trim();
  socket.failedCard = null;

  sendJson(socket, { type: 'started', topic: socket.currentTopic });

  for (let cardNumber = 1; cardNumber <= 3; cardNumber += 1) {
    if (mode === 'failure' && cardNumber === 3) {
      socket.failedCard = 3;
      sendJson(socket, {
        type: 'card-error',
        cardNumber,
        message: 'Card 3 failed intentionally for recovery testing.',
      });
      return;
    }

    const card = await generateCard(socket.currentTopic, cardNumber);
    sendJson(socket, { type: 'card', card });
  }

  sendJson(socket, {
    type: 'complete',
    message: 'All 3 learning cards generated successfully.',
  });
}

async function retryFailedCard(socket) {
  if (!socket.currentTopic || socket.failedCard !== 3) {
    sendJson(socket, {
      type: 'error',
      message: 'There is no failed card to retry.',
    });
    return;
  }

  const card = await generateCard(socket.currentTopic, 3);
  socket.failedCard = null;

  sendJson(socket, { type: 'card', card });
  sendJson(socket, {
    type: 'complete',
    message: 'Retry succeeded. All 3 learning cards are ready.',
  });
}

wss.on('connection', (socket) => {
  sendJson(socket, {
    type: 'connection',
    message: 'Connected to the learning card generator.',
  });

  socket.on('message', async (rawMessage) => {
    const message = parseMessage(rawMessage);

    if (!message) {
      sendJson(socket, {
        type: 'error',
        message: 'Invalid message format.',
      });
      return;
    }

    if (message.type === 'generate') {
      await streamCards(socket, {
        topic: message.topic,
        mode: message.mode === 'failure' ? 'failure' : 'success',
      });
      return;
    }

    if (message.type === 'retry-card') {
      await retryFailedCard(socket);
      return;
    }

    sendJson(socket, {
      type: 'error',
      message: `Unknown message type: ${message.type}`,
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`App running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
