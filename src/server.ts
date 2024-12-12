// import { Server } from "http";
// import app from './app';
// import config from "./config";

// const port = config.port || 5000;

// async function main() {
//   const server: Server = app.listen(port, () => {
//     console.log('Sever is running on port ', port);
//     // seedSuperAdmin();
//   });
//   const exitHandler = () => {
//     if (server) {
//       server.close(() => {
//         console.info("Server closed!");
//       });
//     }
//     process.exit(1);
//   };

//   process.on("uncaughtException", (error) => {
//     console.log(error);
//     exitHandler();
//   });

//   process.on("unhandledRejection", (error) => {
//     console.log(error);
//     exitHandler();
//   });
// }

// main();

import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './app';
import config from './config';
import { messageService } from './app/modules/message/message.service';

let wss: WebSocketServer;
const channelClients = new Map<string, Set<WebSocket>>();

async function main() {
  const server: Server = app.listen(config.port, () => {
    console.log('Server is running on port', config.port);
  });

  // WebSocket Server setup
  wss = new WebSocketServer({ server });

  // Handle WebSocket connections
  wss.on('connection', ws => {
    console.log('New WebSocket connection established!');

    let subscribedChannel: string | null = null; // Track the client's subscribed channel

    // Listen for subscription messages
    ws.on('message', async message => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        const { type, userId } = parsedMessage;

        if (type === 'subscribe') {
          if (!userId) {
            ws.send(
              JSON.stringify({ error: 'userId is required to subscribe' }),
            );
            return;
          }

          // Manage subscription
          if (subscribedChannel) {
            // If already subscribed, remove from the previous channel
            const previousSet = channelClients.get(subscribedChannel);
            previousSet?.delete(ws);
            if (previousSet?.size === 0)
              channelClients.delete(subscribedChannel);
          }

          // Add to the new channel
          if (!channelClients.has(userId)) {
            channelClients.set(userId, new Set());
          }
          channelClients.get(userId)?.add(ws);
          subscribedChannel = userId;

          // Fetch past messages for the channel and send to the client
          const pastMessages = await messageService.getMessagesFromDB(userId);
          ws.send(
            JSON.stringify({
              type: 'pastMessages',
              message: pastMessages,
            }),
          );
        } else if (
          type === 'message' && // Check if the type is "message"
          userId && // Ensure channelId is present
          subscribedChannel === userId // Ensure the client is subscribed to the correct channel
        ) {
          // Broadcast new messages to all clients in the same channel
          const messagePayload = {
            type: 'message',
            userId,
            message: parsedMessage.message,
          };

          // Send to all clients subscribed to the channel
          channelClients.get(userId)?.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(messagePayload));
            }
          });
        }
      } catch (err: any) {
        console.error('Error processing WebSocket message:', err.message);
      }
    });

    // Handle client disconnections
    ws.on('close', () => {
      if (subscribedChannel) {
        const clientsInChannel = channelClients.get(subscribedChannel);
        clientsInChannel?.delete(ws);
        if (clientsInChannel?.size === 0)
          channelClients.delete(subscribedChannel);
      }
      console.log('WebSocket client disconnected!');
    });
  });
}

main();

export { wss, channelClients };
