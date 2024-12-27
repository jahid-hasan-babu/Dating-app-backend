// import { Server } from 'http';
// import { WebSocket, WebSocketServer } from 'ws';
// import app from './app';
// import seedSuperAdmin from './app/DB';
// import { chatServices } from './app/modules/chat/chat.services';
// import config from './config';

// interface ExtendedWebSocket extends WebSocket {
//   roomId?: string;
//   userId?: string;
// }

// const port = config.port || 5000;

// async function main() {
//   const server: Server = app.listen(port, () => {
//     console.log('Server is running on port ', port);
//     seedSuperAdmin();
//   });

//   const activeUsers: Map<string, boolean> = new Map();

//   // Initialize WebSocket server
//   const wss = new WebSocketServer({ server });
//   wss.on('connection', (ws: ExtendedWebSocket) => {
//     console.log('New client connected');

//     // Handle incoming messages
//     ws.on('message', async (data: string) => {
//       try {
//         const parsedData = JSON.parse(data);

//         switch (parsedData.type) {
//           case 'joinRoom': {
//             const { user1Id, user2Id } = parsedData;

//             // Mark the user as active
//             ws.userId = user1Id; // Assuming user1Id is the ID of the connecting user
//             activeUsers.set(user1Id, true);

//             console.log(`User ${user1Id} is now active`);

//             // Notify all clients of the updated active user list
//             broadcastActiveUsers();

//             // Create or get the conversation
//             const conversation = await chatServices.createConversationIntoDB(
//               user1Id,
//               user2Id,
//             );

//             // Assign roomId to WebSocket connection
//             ws.roomId = conversation.id;

//             // Load all messages and send them to the user
//             const conversationWithMessages =
//               await chatServices.getMessagesByConversationIntoDB(
//                 user1Id,
//                 user2Id,
//               );
//             ws.send(
//               JSON.stringify({
//                 type: 'loadMessages',
//                 conversation: conversationWithMessages,
//               }),
//             );
//             break;
//           }

//           case 'sendMessage': {
//             const { chatroomId, senderId, reciverId, content } = parsedData;

//             // Create a new message in the conversation
//             const message = await chatServices.createMessageIntoDB(
//               chatroomId,
//               senderId,
//               reciverId,
//               content,
//             );

//             // Send message to the current client immediately
//             ws.send(
//               JSON.stringify({
//                 type: 'messageSent',
//                 message,
//               }),
//             );

//             // Broadcast the message to all users in the same chatroom
//             wss.clients.forEach((client: ExtendedWebSocket) => {
//               if (
//                 client.roomId === chatroomId &&
//                 client.readyState === WebSocket.OPEN
//               ) {
//                 client.send(
//                   JSON.stringify({
//                     type: 'receiveMessage',
//                     message,
//                   }),
//                 );
//               }
//             });
//             break;
//           }

//           case 'typing': {
//             const { typingRoomId, username } = parsedData;

//             // Broadcast typing status to other users in the room
//             wss.clients.forEach((client: ExtendedWebSocket) => {
//               if (
//                 client.roomId === typingRoomId &&
//                 client !== ws &&
//                 client.readyState === WebSocket.OPEN
//               ) {
//                 client.send(JSON.stringify({ type: 'typing', username }));
//               }
//             });
//             break;
//           }

//           case 'getActiveUsers': {
//             // Send the list of active users to the requesting client
//             const activeUserList = Array.from(activeUsers.entries())
//               .filter(([_, status]) => status === true)
//               .map(([userId]) => userId);

//             ws.send(
//               JSON.stringify({
//                 type: 'activeUsers',
//                 activeUsers: activeUserList,
//               }),
//             );
//             break;
//           }

//           default: {
//             console.log('Unknown message type:', parsedData.type);
//           }
//         }
//       } catch (error) {
//         console.error('Error handling WebSocket message:', error);
//       }
//     });

//     // Handle WebSocket disconnect
//     ws.on('close', () => {
//       if (ws.userId) {
//         activeUsers.set(ws.userId, false); // Mark the user as inactive
//         console.log(`User ${ws.userId} is now inactive`);

//         // Notify all clients of the updated active user list
//         broadcastActiveUsers();
//       }
//     });
//   });

//   // Function to broadcast the list of active users to all clients
//   const broadcastActiveUsers = () => {
//     const activeUserList = Array.from(activeUsers.entries())
//       .filter(([_, status]) => status === true)
//       .map(([userId]) => userId);

//     wss.clients.forEach(client => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(
//           JSON.stringify({
//             type: 'activeUsers',
//             activeUsers: activeUserList,
//           }),
//         );
//       }
//     });
//   };

//   const exitHandler = () => {
//     if (server) {
//       server.close(() => {
//         console.info('Server closed!');
//       });
//     }
//     process.exit(1);
//   };

//   process.on('uncaughtException', error => {
//     console.log(error);
//     exitHandler();
//   });

//   process.on('unhandledRejection', error => {
//     console.log(error);
//     exitHandler();
//   });
// }

// main();

import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import app from './app';
import { chatServices } from './app/modules/chat/chat.services';
import config from './config';

interface ExtendedWebSocket extends WebSocket {
  roomId?: string;
  userId?: string;
}

const port = config.port || 5000;

async function main() {
  const server: Server = app.listen(port, () => {
    console.log('Server is running on port ', port);
  });

  const activeUsers: Map<string, boolean> = new Map();

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New client connected');

    // Handle incoming messages
    ws.on('message', async (data: string) => {
      try {
        const parsedData = JSON.parse(data);

        switch (parsedData.type) {
          case 'joinRoom': {
            const { user1Id, user2Id } = parsedData;

            // Mark the user as active
            ws.userId = user1Id; // Assuming user1Id is the ID of the connecting user
            activeUsers.set(user1Id, true);

            console.log(`User ${user1Id} is now active`);

            // Create or get the conversation
            const conversation = await chatServices.createConversationIntoDB(
              user1Id,
              user2Id,
            );
            ws.roomId = conversation.id;

            // Get unread message count for the user
            const unreadCount = await chatServices.countUnreadMessages(
              user1Id,
              ws.roomId,
            );

            // Load all messages and send them to the user
            const conversationWithMessages =
              await chatServices.getMessagesByConversationIntoDB(
                user1Id,
                user2Id,
              );
            ws.send(
              JSON.stringify({
                type: 'loadMessages',
                conversation: conversationWithMessages,
                unreadCount, // Send unread message count
              }),
            );
            break;
          }

          case 'sendMessage': {
            const { chatroomId, senderId, receiverId, content } = parsedData;

            // Create a new message in the conversation
            const message = await chatServices.createMessageIntoDB(
              chatroomId,
              senderId,
              receiverId,
              content,
            );

            // Send the message to the current client immediately
            ws.send(
              JSON.stringify({
                type: 'messageSent',
                message,
              }),
            );

            // Broadcast the message to all users in the same chatroom
            wss.clients.forEach((client: ExtendedWebSocket) => {
              if (
                client.roomId === chatroomId &&
                client.readyState === WebSocket.OPEN
              ) {
                client.send(
                  JSON.stringify({
                    type: 'receiveMessage',
                    message,
                  }),
                );
              }
            });

            // After sending the message, update unread count for the receiver
            const unreadCount = await chatServices.countUnreadMessages(
              receiverId,
              chatroomId,
            );

            // Optionally, send the updated unread count to the receiver
            wss.clients.forEach((client: ExtendedWebSocket) => {
              if (
                client.userId === receiverId &&
                client.readyState === WebSocket.OPEN
              ) {
                client.send(
                  JSON.stringify({
                    type: 'unreadCount',
                    unreadCount,
                  }),
                );
              }
            });
            break;
          }

          case 'viewMessages': {
            const { chatroomId, userId } = parsedData;

            // Mark messages as read when the user views the chat
            await chatServices.markMessagesAsRead(userId, chatroomId);

            // Optionally, send the updated unread count after marking as read
            const unreadCount = await chatServices.countUnreadMessages(
              userId,
              chatroomId,
            );
            ws.send(
              JSON.stringify({
                type: 'unreadCount',
                unreadCount,
              }),
            );
            break;
          }

          default: {
            console.log('Unknown message type:', parsedData.type);
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle WebSocket disconnect
    ws.on('close', () => {
      if (ws.userId) {
        activeUsers.set(ws.userId, false); // Mark the user as inactive
        console.log(`User ${ws.userId} is now inactive`);
      }
    });
  });
}

main();
