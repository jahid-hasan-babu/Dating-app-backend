import { PrismaClient } from '@prisma/client';
import ApiError from '../../errors/ApiErrors';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

// Create a new conversation between two users
const createConversationIntoDB = async (user1Id: string, user2Id: string) => {
  // Check if a conversation already exists between these two users
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
    },
  });

  if (existingConversation) {
    return existingConversation; // If it exists, return the existing conversation
  }

  // Create a new conversation if it doesn't exist
  const result = await prisma.conversation.create({
    data: {
      user1Id,
      user2Id,
    },
  });
  return result;
};

// Get all conversations for a specific user
const getConversationsByUserIdIntoDB = async (userId: string) => {
  const result = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: true, // Include details of user1
      user2: true, // Include details of user2
      messages: {
        orderBy: { createdAt: 'desc' }, // Include the latest message
        take: 1, // Just get the latest message for preview
      },
    },
  });
  return result;
};

// Get messages for a specific conversation between two users
const getMessagesByConversationIntoDB = async (
  user1Id: string,
  user2Id: string,
) => {
  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { user1Id: user1Id, user2Id: user2Id },
        { user1Id: user2Id, user2Id: user1Id },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return conversation || [];
};

// Create a message in a specific conversation
const createMessageIntoDB = async (
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
) => {
  // Ensure the conversation exists before adding a message
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Create a message in the existing conversation
  const result = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId,
      senderName,
      content,
    },
  });

  return result;
};
const getChatUsersForUser = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: true,
      user2: true,
      messages: {
        orderBy: { createdAt: 'desc' }, // Get the most recent message
        take: 1, // Only return the latest message
      },
    },
  });

  // Extract the unique list of users the user is chatting with and their last message
  const chatUsersData = conversations.map(conversation => {
    const chatUser =
      conversation.user1Id === userId ? conversation.user2 : conversation.user1;
    const lastMessage = conversation.messages[0]; // The most recent message
    return {
      chatUser,
      lastMessage, // Include the latest message
    };
  });

  return chatUsersData;
};

const deleteConversation = async (id: string) => {
  // Start a transaction
  return await prisma.$transaction(async prisma => {
    // Check if the conversation exists
    const isConversationExist = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: true }, // Include messages in the conversation
    });

    if (!isConversationExist) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Conversation not found');
    }

    // First, delete all related messages
    await prisma.message.deleteMany({
      where: { conversationId: id },
    });

    // Then, delete the conversation
    const result = await prisma.conversation.delete({
      where: { id },
    });

    if (!result) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Could not delete conversation',
      );
    }

    return result;
  });
};

export const chatServices = {
  createConversationIntoDB,
  getConversationsByUserIdIntoDB,
  getMessagesByConversationIntoDB,
  createMessageIntoDB,
  getChatUsersForUser,
  deleteConversation,
};
