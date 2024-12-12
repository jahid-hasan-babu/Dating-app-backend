import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';

const createMessageInDB = async (req: any) => {
  const { content } = req.body; // Assuming `payload.content` holds the message content
  const senderId = req.user.id; // ID of the sender
  const receiverId = req.params.userId; // ID of the receiver

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
