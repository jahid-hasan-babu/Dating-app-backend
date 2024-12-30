import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import app from './app';
import { chatServices } from './app/modules/chat/chat.services';
import config from './config';
import prisma from './app/utils/prisma';
import { notificationServices } from './app/modules/notifications/notification.service';

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

            // Step 1: Create a new message in the conversation
            const message = await chatServices.createMessageIntoDB(
              chatroomId,
              senderId,
              receiverId,
              content,
            );

            // Step 2: Send the message to the current client immediately (sender)
            ws.send(
              JSON.stringify({
                type: 'messageSent',
                message,
              }),
            );

            // Step 3: Broadcast the message to all users in the same chatroom (receivers)
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

            // Step 4: Update unread count for the receiver
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

            // Step 5: Check if the receiver is active (connected to WebSocket)
            const isReceiverActive = Array.from(wss.clients).some(
              (client: ExtendedWebSocket) =>
                client.userId === receiverId &&
                client.readyState === WebSocket.OPEN,
            );

            // If receiver is not active, send a notification
            if (!isReceiverActive) {
              // Prepare notification data
              const senderProfile = await prisma.profile.findUnique({
                where: { userId: senderId },
                select: { fullName: true },
              });

              const notificationData = {
                title: 'New Message Received!',
                body: `${senderProfile?.fullName || 'Someone'} has sent you a new message.`,
              };

              // Step 6: Send a notification to the receiver
              try {
                await notificationServices.sendSingleNotification({
                  params: { userId: receiverId }, // The ID of the user receiving the message
                  body: notificationData, // Notification content
                });
              } catch (error: any) {
                console.error('Failed to send notification:', error.message);
                // Optionally, handle the notification failure (e.g., log it or notify admins)
              }
            }

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

          // WebRTC signaling cases
          case 'offer': {
            const { offer, receiverId, roomId } = parsedData;


            // Broadcast the offer to all users in the same room (excluding the sender)
            wss.clients.forEach((client: ExtendedWebSocket) => {
              // Check if the client is in the correct room and is ready to receive messages
              if (
                client.roomId === roomId && // The client is in the same room
                client.readyState === 1 &&
                client.userId !== receiverId // Exclude the sender from receiving their own offer
              ) {
                console.log(`Sending offer to client in room ${roomId}`);
                client.send(
                  JSON.stringify({
                    type: 'sendOffer',
                    offer,
                    roomId,
                    receiverId,
                  }),
                );
              }
            });
            break;
          }

          case 'answer': {
            const { answer, receiverId, roomId } = parsedData;

            // Send the answer to the sender to complete the WebRTC connection
            wss.clients.forEach((client: ExtendedWebSocket) => {
              if (client.roomId === roomId && client.readyState === 1) {
                client.send(
                  JSON.stringify({
                    type: 'receiveAnswer',
                    answer,
                    receiverId,
                  }),
                );
              }
            });
            break;
          }

          case 'iceCandidate': {
            const { candidate, senderId, receiverId, roomId } = parsedData;

            // Broadcast the ICE candidate to the other user in the room
            wss.clients.forEach((client: ExtendedWebSocket) => {
              if (
                client.userId === receiverId &&
                client.roomId === roomId &&
                client.readyState === WebSocket.OPEN
              ) {
                client.send(
                  JSON.stringify({
                    type: 'receiveIceCandidate',
                    candidate,
                    senderId,
                  }),
                );
              }
            });
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
