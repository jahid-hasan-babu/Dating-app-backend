import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { notificationServices } from '../notifications/notification.service';

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

const createMessageInDB = async (req: any) => {
  const { content } = req.body; // Message content
  const senderId = req.user.id; // Sender's ID
  const receiverId = req.params.userId; // Receiver's ID

  // Check if the sender has an active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userID: senderId,
      status: 'active', // Assuming 'active' indicates a valid subscription
    },
  });

  if (!subscription) {
    // Count the messages sent by the user
    const messageCount = await prisma.message.count({
      where: { senderId },
    });

    // If the user has already sent one message, deny further messages
    if (messageCount >= 1) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You need a subscription to send more messages.',
      );
    }
  }

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

  return newMessage;
};


const getMessagesFromDB = async (channelId: string) => {
  const message = await prisma.message.findMany({
    where: {
      channelId: channelId,
    },
    include: {
      receiver: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      },
    },
  });

  return message;
};

export const messageService = {
  createMessageInDB,
  getMessagesFromDB,
};
