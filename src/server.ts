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

// import { Server } from 'http';
// import { WebSocketServer, WebSocket } from 'ws';
// import app from './app';
// import config from './config';
// import { messageService } from './app/modules/message/message.service';

// let wss: WebSocketServer;
// const channelClients = new Map<string, Set<WebSocket>>();

// async function main() {
//   const server: Server = app.listen(config.port, () => {
//     console.log('Server is running on port', config.port);
//   });

//   // WebSocket Server setup
//   wss = new WebSocketServer({ server });

//   // Handle WebSocket connections
//   wss.on('connection', ws => {
//     console.log('New WebSocket connection established!');

//     let subscribedChannel: string | null = null; // Track the client's subscribed channel

//     // Listen for subscription messages
//     ws.on('message', async message => {
//       try {
//         const parsedMessage = JSON.parse(message.toString());
//         const { type, userId } = parsedMessage;

//         if (type === 'subscribe') {
//           if (!userId) {
//             ws.send(
//               JSON.stringify({ error: 'userId is required to subscribe' }),
//             );
//             return;
//           }

//           // Manage subscription
//           if (subscribedChannel) {
//             // If already subscribed, remove from the previous channel
//             const previousSet = channelClients.get(subscribedChannel);
//             previousSet?.delete(ws);
//             if (previousSet?.size === 0)
//               channelClients.delete(subscribedChannel);
//           }

//           // Add to the new channel
//           if (!channelClients.has(userId)) {
//             channelClients.set(userId, new Set());
//           }
//           channelClients.get(userId)?.add(ws);
//           subscribedChannel = userId;

//           // Fetch past messages for the channel and send to the client
//           const pastMessages = await messageService.getMessagesFromDB(userId);
//           ws.send(
//             JSON.stringify({
//               type: 'pastMessages',
//               message: pastMessages,
//             }),
//           );
//         } else if (
//           type === 'message' && // Check if the type is "message"
//           userId && // Ensure channelId is present
//           subscribedChannel === userId // Ensure the client is subscribed to the correct channel
//         ) {
//           // Broadcast new messages to all clients in the same channel
//           const messagePayload = {
//             type: 'message',
//             userId,
//             message: parsedMessage.message,
//           };

//           // Send to all clients subscribed to the channel
//           channelClients.get(userId)?.forEach(client => {
//             if (client.readyState === WebSocket.OPEN) {
//               client.send(JSON.stringify(messagePayload));
//             }
//           });
//         }
//       } catch (err: any) {
//         console.error('Error processing WebSocket message:', err.message);
//       }
//     });

//     // Handle client disconnections
//     ws.on('close', () => {
//       if (subscribedChannel) {
//         const clientsInChannel = channelClients.get(subscribedChannel);
//         clientsInChannel?.delete(ws);
//         if (clientsInChannel?.size === 0)
//           channelClients.delete(subscribedChannel);
//       }
//       console.log('WebSocket client disconnected!');
//     });
//   });
// }

// main();

// export { wss, channelClients };


import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import app from './app';
import config from './config';
import { messageService } from './app/modules/message/message.service';

// Store WebSocket connections per userId (channel)
const channelClients = new Map<string, Set<WebSocket>>();

// Store peer connections for signaling (to manage offer/answer/candidate)
const peerConnections = new Map<WebSocket, RTCPeerConnection>();

let wss: WebSocketServer;

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

    // Listen for messages
    ws.on('message', async message => {
       try {
         const parsedMessage = JSON.parse(message.toString());
         const { type, userId, channelId } = parsedMessage;

         if (type === 'subscribe') {
           if (!channelId) {
             ws.send(
               JSON.stringify({ error: 'ChannelId is required to subscribe' }),
             );
             return;
           }

           // Unsubscribe from the previous channel if necessary
           if (subscribedChannel) {
             const previousSet = channelClients.get(subscribedChannel);
             previousSet?.delete(ws);
             if (previousSet?.size === 0) {
               channelClients.delete(subscribedChannel);
             }
           }

           // Subscribe to the new channel
           if (!channelClients.has(channelId)) {
             channelClients.set(channelId, new Set());
           }
           channelClients.get(channelId)?.add(ws);
           subscribedChannel = channelId;

           // Send past messages to the client
           const pastMessages =
             await messageService.getMessagesFromDB(channelId);
           ws.send(
             JSON.stringify({ type: 'pastMessages', messages: pastMessages }),
           );
         } else if (type === 'offer' && userId) {
           // Handle WebRTC offer (from a client)
           const offer = parsedMessage.offer;
           const peerConnection = new RTCPeerConnection();

           // Set up ICE candidate handling
           peerConnection.onicecandidate = event => {
             if (event.candidate) {
               ws.send(
                 JSON.stringify({
                   type: 'candidate',
                   candidate: event.candidate,
                 }),
               );
             }
           };

           // Handle remote stream
           peerConnection.ontrack = event => {
             // Broadcast the remote stream to other clients in the same channel
             channelClients.get(userId)?.forEach(client => {
               if (client !== ws && client.readyState === WebSocket.OPEN) {
                 client.send(
                   JSON.stringify({
                     type: 'remoteStream',
                     stream: event.streams[0],
                   }),
                 );
               }
             });
           };

           // Set the remote offer and create an answer
           await peerConnection.setRemoteDescription(
             new RTCSessionDescription(offer),
           );

           const answer = await peerConnection.createAnswer();
           await peerConnection.setLocalDescription(answer);

           // Send the answer back to the client that made the offer
           ws.send(JSON.stringify({ type: 'answer', answer }));

           // Store the peer connection to send ICE candidates
           peerConnections.set(ws, peerConnection);

           // Broadcast the offer to all clients in the same channel
           channelClients.get(userId)?.forEach(client => {
             if (client !== ws && client.readyState === WebSocket.OPEN) {
               client.send(
                 JSON.stringify({
                   type: 'offer',
                   offer,
                 }),
               );
             }
           });
         } else if (type === 'answer' && userId) {
           // Handle WebRTC answer (from a client)
           const answer = parsedMessage.answer;
           const peerConnection = peerConnections.get(ws);
           if (peerConnection) {
             await peerConnection.setRemoteDescription(
               new RTCSessionDescription(answer),
             );
           }
         } else if (type === 'candidate' && userId) {
           // Handle ICE candidate (from a client)
           const candidate = parsedMessage.candidate;
           const peerConnection = peerConnections.get(ws);
           if (peerConnection && candidate) {
             await peerConnection.addIceCandidate(
               new RTCIceCandidate(candidate),
             );
           }
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
        if (clientsInChannel?.size === 0) {
          channelClients.delete(subscribedChannel);
        }
      }

      // Cleanup peer connection if it exists
      const peerConnection = peerConnections.get(ws);
      if (peerConnection) {
        peerConnection.close();
        peerConnections.delete(ws);
      }

      console.log('WebSocket client disconnected!');
    });
  });
}

main();

export { wss, channelClients, peerConnections };

