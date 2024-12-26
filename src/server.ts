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


// import { Server } from 'http';
// import { WebSocketServer, WebSocket } from 'ws';
// import app from './app';
// import config from './config';
// import { messageService } from './app/modules/message/message.service';
// import prisma from './app/utils/prisma';

// // Store WebSocket connections per userId (channel)
// const channelClients = new Map<string, Set<WebSocket>>();

// let wss: WebSocketServer;

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

//     // Listen for messages
//     ws.on('message', async message => {
//       try {
//         const parsedMessage = JSON.parse(message.toString());
//         const { type, userId, channelId, offer, answer, candidate } =
//           parsedMessage;

//         // Handle subscription to a channel
//         if (type === 'subscribe') {
//           if (!channelId) {
//             ws.send(
//               JSON.stringify({ error: 'ChannelId is required to subscribe' }),
//             );
//             return;
//           }

//           // Unsubscribe from the previous channel if necessary
//           if (subscribedChannel) {
//             const previousSet = channelClients.get(subscribedChannel);
//             previousSet?.delete(ws);
//             if (previousSet?.size === 0) {
//               channelClients.delete(subscribedChannel);
//             }
//           }

//           // Subscribe to the new channel
//           if (!channelClients.has(channelId)) {
//             channelClients.set(channelId, new Set());
//           }
//           channelClients.get(channelId)?.add(ws);
//           subscribedChannel = channelId;

//           // Mark past messages as read when they are retrieved
//           if (userId) {
//             await messageService.markMessagesAsRead(userId, channelId);
//           }

//           // Send past messages to the client
//           const pastMessages =
//             await messageService.getMessagesFromDB(channelId);
//           ws.send(
//             JSON.stringify({ type: 'pastMessages', messages: pastMessages }),
//           );

//           // Send updated unread message count after marking messages as read
//           const unreadMessagesCount = await prisma.message.count({
//             where: {
//               receiverId: userId,
//               isRead: false,
//             },
//           });

//           ws.send(
//             JSON.stringify({
//               type: 'unreadCountUpdate',
//               unreadCount: unreadMessagesCount,
//             }),
//           );
//         }

//         // Handle receiving a new message
//         else if (type === 'newMessage' && userId && channelId) {
//           const newMessage = await messageService.createMessageInDB(
//             userId,
//             channelId,
//             parsedMessage,
//           );

//           // Send the unread message count
//           const unreadMessagesCount = await prisma.message.count({
//             where: {
//               receiverId: userId,
//               isRead: false,
//             },
//           });

//           const messagePayload = {
//             type: 'newMessage',
//             channelId: channelId,
//             data: newMessage,
//             unreadCount: unreadMessagesCount, // Include unread count
//           };

//           // Broadcast message to all subscribers of the channel
//           channelClients.get(channelId)?.forEach(client => {
//             if (client !== ws && client.readyState === WebSocket.OPEN) {
//               client.send(JSON.stringify(messagePayload));
//             }
//           });
//         }

//         // Handle WebRTC offer (client is initiating a connection)
//         else if (type === 'offer' && userId && channelId && offer) {
//           // Relay the offer to other peers in the same channel
//           channelClients.get(channelId)?.forEach(client => {
//             if (client !== ws && client.readyState === WebSocket.OPEN) {
//               client.send(
//                 JSON.stringify({
//                   type: 'offer',
//                   from: userId,
//                   offer: offer,
//                 }),
//               );
//             }
//           });
//         }

//         // Handle WebRTC answer (client is responding to an offer)
//         else if (type === 'answer' && userId && channelId && answer) {
//           // Relay the answer to the peer who made the offer
//           channelClients.get(channelId)?.forEach(client => {
//             if (client !== ws && client.readyState === WebSocket.OPEN) {
//               client.send(
//                 JSON.stringify({
//                   type: 'answer',
//                   from: userId,
//                   answer: answer,
//                 }),
//               );
//             }
//           });
//         }

//         // Handle WebRTC ICE candidate
//         else if (type === 'candidate' && userId && channelId && candidate) {
//           // Relay the ICE candidate to the other peer(s) in the channel
//           channelClients.get(channelId)?.forEach(client => {
//             if (client !== ws && client.readyState === WebSocket.OPEN) {
//               client.send(
//                 JSON.stringify({
//                   type: 'candidate',
//                   from: userId,
//                   candidate: candidate,
//                 }),
//               );
//             }
//           });
//         }

//         // Handle marking messages as read
//         else if (type === 'markAsRead' && userId && channelId) {
//           // Mark messages as read in the database
//           await messageService.markMessagesAsRead(userId, channelId);

//           // Get the updated unread message count
//           const unreadMessagesCount = await prisma.message.count({
//             where: {
//               receiverId: userId,
//               isRead: false,
//             },
//           });

//           // Send the updated unread count to the client
//           ws.send(
//             JSON.stringify({
//               type: 'unreadCountUpdate',
//               unreadCount: unreadMessagesCount,
//             }),
//           );

//           // Notify all subscribers about the unread count update
//           channelClients.get(channelId)?.forEach(client => {
//             if (client.readyState === WebSocket.OPEN) {
//               client.send(
//                 JSON.stringify({
//                   type: 'unreadCountUpdate',
//                   unreadCount: unreadMessagesCount,
//                 }),
//               );
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
//         if (clientsInChannel?.size === 0) {
//           channelClients.delete(subscribedChannel);
//         }
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
import prisma from './app/utils/prisma';
import { notificationServices } from './app/modules/notifications/notification.service';

// Store WebSocket connections per channelId (unique per user)
const channelClients = new Map<string, Set<WebSocket>>();

let wss: WebSocketServer;

async function main() {
  const server: Server = app.listen(config.port, () => {
    console.log('Server is running on port', config.port);
  });

  // WebSocket Server setup
  wss = new WebSocketServer({ server });

  // Handle WebSocket connections
  // wss.on('connection', ws => {
  //   console.log('New WebSocket connection established!');

  //   let subscribedChannel: string | null = null; // Track the client's subscribed channel

  //   // Listen for messages
  //   ws.on('message', async message => {
  //     try {
  //       const parsedMessage = JSON.parse(message.toString());
  //       const { type, userId, channelId, reciverId, content, offer, answer, candidate } =
  //         parsedMessage;

  //       // Handle subscription to a channel
  //       if (type === 'subscribe') {
  //         if (!channelId) {
  //           ws.send(
  //             JSON.stringify({ error: 'ChannelId is required to subscribe' }),
  //           );
  //           return;
  //         }

  //         // Unsubscribe from the previous channel if necessary
  //         if (subscribedChannel) {
  //           const previousSet = channelClients.get(subscribedChannel);
  //           previousSet?.delete(ws);
  //           if (previousSet?.size === 0) {
  //             channelClients.delete(subscribedChannel);
  //           }
  //         }

  //         // Subscribe to the new channel
  //         if (!channelClients.has(channelId)) {
  //           channelClients.set(channelId, new Set());
  //         }
  //         channelClients.get(channelId)?.add(ws);
  //         subscribedChannel = channelId;

  //         // Mark past messages as read when they are retrieved
  //         if (userId) {
  //           await messageService.markMessagesAsRead(userId, channelId);
  //         }

  //         // Send past messages to the client
  //         const pastMessages =
  //           await messageService.getMessagesFromDB(channelId);
  //         ws.send(
  //           JSON.stringify({ type: 'pastMessages', messages: pastMessages }),
  //         );

  //         // Send updated unread message count after marking messages as read
  //         const unreadMessagesCount = await prisma.message.count({
  //           where: {
  //             receiverId: userId,
  //             isRead: false,
  //           },
  //         });

  //         ws.send(
  //           JSON.stringify({
  //             type: 'unreadCountUpdate',
  //             unreadCount: unreadMessagesCount,
  //           }),
  //         );
  //       }

  //       // Handle receiving a new message
  //       else if (type === 'newMessage' && userId && reciverId && content) {
  //         try {
  //           // Step 1: Create the message in the database
  //           const newMessage = await createMessageInDB(
  //             userId,
  //             reciverId,
  //             parsedMessage,
  //           );

  //           // Step 2: Prepare the message payload
  //           const messagePayload = {
  //             type: 'newMessage',
  //             data: newMessage, // The actual message returned from createMessageInDB
  //           };

  //           // Step 3: Fetch past messages for the channel (if needed)
  //           const pastMessages =
  //             await messageService.getMessagesFromDB(channelId);
  //           console.log(pastMessages); // Debugging output

  //           // Step 4: Broadcast the new message to all connected clients in the channel
  //           // Step 4: Broadcast the new message to all connected clients in the channel
  //           channelClients.get(channelId)?.forEach(client => {
  //             if (client !== ws && client.readyState === WebSocket.OPEN) {
  //               // Send the new message to all other clients in the channel
  //               client.send(JSON.stringify(messagePayload)); // Broadcast the new message
  //             }
  //           });

  //           // Optionally: Log or debug to verify message creation and broadcasting
  //           console.log(`Message sent to channel ${channelId}:`, newMessage);

  //           // Step 5: Return the past messages to the client (or handle broadcasting here)
  //           // Send the past messages (including the newly added message) back to the client who sent it
  //           ws.send(
  //             JSON.stringify({
  //               type: 'pastMessages',
  //               data: pastMessages, // Send all past messages (including the new one)
  //             }),
  //           );

  //           // Return past messages to the client
  //           return pastMessages;
  //         } catch (error) {
  //           console.error('Error processing new message:', error);
  //         }
  //       }

  //       // Handle WebRTC offer (client is initiating a connection)
  //       else if (type === 'offer' && userId && channelId && offer) {
  //         // Relay the offer to other peers in the same channel
  //         channelClients.get(channelId)?.forEach(client => {
  //           if (client !== ws && client.readyState === WebSocket.OPEN) {
  //             client.send(
  //               JSON.stringify({
  //                 type: 'offer',
  //                 from: userId,
  //                 offer: offer,
  //               }),
  //             );
  //           }
  //         });
  //       }

  //       // Handle WebRTC answer (client is responding to an offer)
  //       else if (type === 'answer' && userId && channelId && answer) {
  //         // Relay the answer to the peer who made the offer
  //         channelClients.get(channelId)?.forEach(client => {
  //           if (client !== ws && client.readyState === WebSocket.OPEN) {
  //             client.send(
  //               JSON.stringify({
  //                 type: 'answer',
  //                 from: userId,
  //                 answer: answer,
  //               }),
  //             );
  //           }
  //         });
  //       }

  //       // Handle WebRTC ICE candidate
  //       else if (type === 'candidate' && userId && channelId && candidate) {
  //         // Relay the ICE candidate to the other peer(s) in the channel
  //         channelClients.get(channelId)?.forEach(client => {
  //           if (client !== ws && client.readyState === WebSocket.OPEN) {
  //             client.send(
  //               JSON.stringify({
  //                 type: 'candidate',
  //                 from: userId,
  //                 candidate: candidate,
  //               }),
  //             );
  //           }
  //         });
  //       }

  //       // Handle marking messages as read
  //       else if (type === 'markAsRead' && userId && channelId) {
  //         // Mark messages as read in the database
  //         await messageService.markMessagesAsRead(userId, channelId);

  //         // Get the updated unread message count
  //         const unreadMessagesCount = await prisma.message.count({
  //           where: {
  //             receiverId: userId,
  //             isRead: false,
  //           },
  //         });

  //         // Send the updated unread count to the client
  //         ws.send(
  //           JSON.stringify({
  //             type: 'unreadCountUpdate',
  //             unreadCount: unreadMessagesCount,
  //           }),
  //         );

  //         // Notify all subscribers about the unread count update
  //         channelClients.get(channelId)?.forEach(client => {
  //           if (client.readyState === WebSocket.OPEN) {
  //             client.send(
  //               JSON.stringify({
  //                 type: 'unreadCountUpdate',
  //                 unreadCount: unreadMessagesCount,
  //               }),
  //             );
  //           }
  //         });
  //       }
  //     } catch (err: any) {
  //       console.error('Error processing WebSocket message:', err.message);
  //     }
  //   });

  //   // Handle client disconnections
  //   ws.on('close', () => {
  //     if (subscribedChannel) {
  //       const clientsInChannel = channelClients.get(subscribedChannel);
  //       clientsInChannel?.delete(ws);
  //       if (clientsInChannel?.size === 0) {
  //         channelClients.delete(subscribedChannel);
  //       }
  //     }
  //     console.log('WebSocket client disconnected!');
  //   });
  // });

  wss.on('connection', ws => {
    console.log('New WebSocket connection established!');

    let subscribedChannel: string | null = null; // Track the client's subscribed channel

    // Listen for messages
    ws.on('message', async message => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        const {
          type,
          userId,
          channelId,
          reciverId,
          content,
          offer,
          answer,
          candidate,
        } = parsedMessage;

        // Handle subscription to a channel
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

          // Mark past messages as read when they are retrieved
          if (userId) {
            await messageService.markMessagesAsRead(userId, channelId);
          }

          // Send past messages to the client
          const pastMessages =
            await messageService.getMessagesFromDB(channelId);
          ws.send(
            JSON.stringify({ type: 'pastMessages', messages: pastMessages }),
          );

          // Send updated unread message count after marking messages as read
          const unreadMessagesCount = await prisma.message.count({
            where: {
              receiverId: userId,
              isRead: false,
            },
          });

          ws.send(
            JSON.stringify({
              type: 'unreadCountUpdate',
              unreadCount: unreadMessagesCount,
            }),
          );
        }

        // Handle receiving a new message
        else if (type === 'newMessage' && userId && reciverId && content) {
          try {
            // Step 1: Create the message in the database
            const newMessage = await createMessageInDB(
              userId,
              reciverId,
              parsedMessage,
            );

            // Step 2: Prepare the message payload
            const messagePayload = {
              type: 'newMessage',
              data: newMessage, // The actual message returned from createMessageInDB
            };

            // Step 3: Fetch past messages for the channel (if needed)
            const pastMessages =
              await messageService.getMessagesFromDB(channelId);
            console.log(pastMessages); // Debugging output

            // Step 4: Broadcast the new message to all connected clients in the channel
            channelClients.get(channelId)?.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                // Send the new message to all other clients in the channel
                client.send(JSON.stringify(messagePayload)); // Broadcast the new message
              }
            });

            // Optionally: Log or debug to verify message creation and broadcasting
            console.log(`Message sent to channel ${channelId}:`, newMessage);

            // Step 5: Return the past messages to the client (or handle broadcasting here)
            // Send the past messages (including the newly added message) back to the client who sent it
            ws.send(
              JSON.stringify({
                type: 'pastMessages',
                data: pastMessages, // Send all past messages (including the new one)
              }),
            );

            // Return past messages to the client
            return pastMessages;
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }

        // Handle WebRTC offer (client is initiating a connection)
        else if (type === 'offer' && userId && channelId && offer) {
          // Relay the offer to other peers in the same channel
          channelClients.get(channelId)?.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'offer',
                  from: userId,
                  offer: offer,
                }),
              );
            }
          });
        }

        // Handle WebRTC answer (client is responding to an offer)
        else if (type === 'answer' && userId && channelId && answer) {
          // Relay the answer to the peer who made the offer
          channelClients.get(channelId)?.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'answer',
                  from: userId,
                  answer: answer,
                }),
              );
            }
          });
        }

        // Handle WebRTC ICE candidate
        else if (type === 'candidate' && userId && channelId && candidate) {
          // Relay the ICE candidate to the other peer(s) in the channel
          channelClients.get(channelId)?.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'candidate',
                  from: userId,
                  candidate: candidate,
                }),
              );
            }
          });
        }

        // Handle marking messages as read
        else if (type === 'markAsRead' && userId && channelId) {
          // Mark messages as read in the database
          await messageService.markMessagesAsRead(userId, channelId);

          // Get the updated unread message count
          const unreadMessagesCount = await prisma.message.count({
            where: {
              receiverId: userId,
              isRead: false,
            },
          });

          // Send the updated unread count to the client
          ws.send(
            JSON.stringify({
              type: 'unreadCountUpdate',
              unreadCount: unreadMessagesCount,
            }),
          );

          // Notify all subscribers about the unread count update
          channelClients.get(channelId)?.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: 'unreadCountUpdate',
                  unreadCount: unreadMessagesCount,
                }),
              );
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
        if (clientsInChannel?.size === 0) {
          channelClients.delete(subscribedChannel);
        }
      }
      console.log('WebSocket client disconnected!');
    });
  });
}

main();

// Create a new message and store it in the database
const createMessageInDB = async (
  senderId: string,
  receiverId: string,
  req: any,
) => {
  const { content } = req; // Assuming `req.content` holds the message content

  // Find or create the channel between the sender and receiver
  let channel = await prisma.channel.findFirst({
    where: {
      OR: [
        { participant1Id: senderId, participant2Id: receiverId },
        { participant1Id: receiverId, participant2Id: senderId },
      ],
    },
  });

  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        participant1Id: senderId,
        participant2Id: receiverId,
      },
    });
  }

  // Create a new message linked to the channel
  const newMessage = await prisma.message.create({
    data: {
      content,
      senderId,
      receiverId,
      channelId: channel.id,
    },
  });

  const allMessages = await prisma.message.findMany({
    where: {
      receiverId,
      senderId,
    },
  });

  // Fetch sender's profile (e.g., full name) for notification
  const senderProfile = await prisma.profile.findUnique({
    where: { userId: senderId },
    select: { fullName: true },
  });

  // Prepare notification data
  const notificationData = {
    title: 'New Message Received',
    body: `${senderProfile?.fullName || 'Someone'} has sent you a new message.`,
  };

  // Send a notification to the receiver
  try {
    await notificationServices.sendSingleNotification({
      params: { userId: receiverId },
      body: notificationData,
    });
  } catch (error: any) {
    console.error('Failed to send notification:', error.message);
  }

  // Update unread message count
  const unreadMessagesCount = await prisma.message.count({
    where: {
      receiverId,
      isRead: false,
    },
  });

  // Broadcast the new message to all WebSocket clients subscribed to the channel
  const connectedClients = channelClients.get(channel.id) || new Set();

  const messagePayload = {
    type: 'newMessage',
    channelId: channel.id,
    data: allMessages,
    unreadCount: unreadMessagesCount,
  };

  connectedClients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(messagePayload));
    }
  });

  return allMessages;
};

export { wss, channelClients };

