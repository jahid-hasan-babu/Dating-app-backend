import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { notificationServices } from '../notifications/notification.service';
import { User } from '@prisma/client';
import { channelClients } from '../../../server';

// const createMessageInDB = async (req: any) => {
//   const { content } = req.body; // Assuming `req.body.content` holds the message content
//   const senderId = req.user.id; // ID of the sender
//   const receiverId = req.params.userId; // ID of the receiver

//   // Check if the sender has an active subscription
//   const subscription = await prisma.subscription.findFirst({
//     where: {
//       userID: senderId,
//       status: 'active', // Assuming 'active' indicates a valid subscription
//     },
//   });

//   if (!subscription) {
//     // Count the messages sent by the user
//     const messageCount = await prisma.message.count({
//       where: { senderId },
//     });

//     // If the user has already sent one message, deny further messages
//     if (messageCount >= 1) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         'You need a subscription to send more messages.',
//       );
//     }
//   }

//   // Find or create the channel between the sender and receiver
//   let channel = await prisma.channel.findUnique({
//     where: {
//       participant1Id_participant2Id: {
//         participant1Id: senderId,
//         participant2Id: receiverId,
//       },
//     },
//   });

//   if (!channel) {
//     channel = await prisma.channel.create({
//       data: {
//         participant1Id: senderId,
//         participant2Id: receiverId,
//       },
//     });
//   }

//   // Create a new message linked to the channel
//   const newMessage = await prisma.message.create({
//     data: {
//       content, // Add message content
//       senderId, // Link to the sender
//       receiverId, // Link to the receiver
//       channelId: channel.id, // Link to the channel
//     },
//   });

//   return newMessage;
// };

const createMessageInDB = async (
  usersenderId: string,
  userId: string,
  req: any,
) => {
  const { content } = req.body; // Assuming `req.body.content` holds the message content
  const senderId = usersenderId;
  const receiverId = userId; // ID of the receiver

  // Find or create the channel between the sender and receiver
  let channel = await prisma.channel.findUnique({
    where: {
      participant1Id_participant2Id: {
        participant1Id: senderId,
        participant2Id: receiverId,
      },
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
      content, // Add message content
      senderId, // Link to the sender
      receiverId, // Link to the receiver
      channelId: channel.id, // Link to the channel
    },
  });

  const allMessage = await prisma.message.findMany({
    where: {
      receiverId,
      senderId,
    },
  });

  // Fetch sender's profile (e.g., full name) for notification
  const senderProfile = await prisma.profile.findUnique({
    where: { userId: senderId },
    select: { fullName: true }, // Fetch only the full name
  });

  // Prepare notification data
  const notificationData = {
    title: 'New Message Received',
    body: `${senderProfile?.fullName || 'Someone'} has sent you a new message.`,
  };

  // Send a notification to the receiver
  try {
    await notificationServices.sendSingleNotification({
      params: { userId: receiverId }, // Receiver ID
      body: notificationData, // Notification content
    });
  } catch (error: any) {
    console.error('Failed to send notification:', error.message);
    // Log or handle the error as needed
  }

  // Broadcast the new message to all WebSocket clients subscribed to the channel
  const connectedClients = channelClients.get(channel.id) || new Set();

  const messagePayload = {
    type: 'newMessage',
    channelId: channel.id,
    data: allMessage,
  };

  connectedClients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(messagePayload));
    }
  });

  return allMessage;
};

const getMessagesFromDB = async (channelId: string) => {
  try {
    const messages = await prisma.message.findMany({
      where: {
        channelId: channelId,
      },
    });

    return messages;
  } catch (err) {
    console.error('Error fetching messages:', err);
    throw err;
  }
};

// const getMessagesFromDB = async (channelId: string) => {
//   try {
//     const messages = await prisma.message.findMany({
//       where: {
//         channelId: channelId,
//       },
//       include: {
//         receiver: {
//           select: {
//             id: true,
//             email: true,
//             role: true,
//             status: true,
//           },
//         },
//       },
//     });

//     // // Handle case when no receiver is found for some messages
//     // const filteredMessages = messages.filter(
//     //   message => message.receiver !== null,
//     // );

//     // console.log('Fetched messages:', filteredMessages);
//     return messages;
//   } catch (error: any) {
//     console.error('Error fetching messages:', error.message);
//     throw error; // Re-throw to handle it elsewhere
//   }
// };

const getMyChat = async (userId: string) => {
  // Check if the user exists by verifying they have sent at least one message
  const existingUser = await prisma.message.findFirst({
    where: {
      senderId: userId,
    },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Fetch the receiver's profile and the last message for each receiver
  const chats = await prisma.message.groupBy({
    by: ['receiverId'], // Group messages by receiverId
    where: {
      senderId: userId,
    },
    _max: {
      createdAt: true, // Get the most recent message date for each receiver
    },
    orderBy: {
      _max: {
        createdAt: 'desc',
      },
    },
  });

  // Fetch full profile and last message for each receiver
  const results = await Promise.all(
    chats.map(async chat => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          senderId: userId,
          receiverId: chat.receiverId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const receiverProfile = await prisma.profile.findUnique({
        where: {
          id: chat.receiverId,
        },
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      });

      return {
        receiver: receiverProfile,
        lastMessage: lastMessage?.content || null,
        lastMessageDate: lastMessage?.createdAt || null,
      };
    }),
  );

  return results;
};

export const messageService = {
  createMessageInDB,
  getMessagesFromDB,
  getMyChat,
};
