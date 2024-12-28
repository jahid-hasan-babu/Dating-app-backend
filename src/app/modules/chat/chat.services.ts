import { PrismaClient } from '@prisma/client';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';

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
  receiverId: string,
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
      receiverId,
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
      throw new AppError(httpStatus.NOT_FOUND, 'Conversation not found');
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
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Could not delete conversation',
      );
    }

    return result;
  });
};

const countUnreadMessages = async (userId: string, chatroomId: string) => {
  const unreadCount = await prisma.message.count({
    where: {
      conversationId: chatroomId,
      receiverId: userId,
      isRead: false, // Only count unread messages
    },
  });

  return unreadCount;
};
const markMessagesAsRead = async (userId: string, chatroomId: string) => {
  await prisma.message.updateMany({
    where: {
      receiverId: userId,
      conversationId: chatroomId,
      isRead: false, // Only update unread messages
    },
    data: {
      isRead: true, // Mark as read
    },
  });
};

// const getMyChat = async (userId: string) => {
//   // Step 1: Check if the user exists by verifying they have sent at least one message
//   const existingUser = await prisma.message.findFirst({
//     where: {
//       senderId: userId,
//     },
//   });

//   if (!existingUser) {
//     throw new AppError(httpStatus.NOT_FOUND, 'User not found');
//   }

//   // Step 2: Fetch all distinct receiverIds the user has interacted with
//   const chats = await prisma.message.groupBy({
//     by: ['receiverId'],
//     where: {
//       senderId: userId,
//     },
//     _max: {
//       createdAt: true, // Get the most recent message date for each receiver
//     },
//     orderBy: {
//       _max: {
//         createdAt: 'desc',
//       },
//     },
//   });

//   // Step 3: Fetch last messages and receiver profiles
//   const results = await Promise.all(
//     chats.map(async chat => {
//       // Fetch the last message for this conversation
//       const lastMessage = await prisma.message.findFirst({
//         where: {
//           senderId: userId,
//           receiverId: chat.receiverId,
//         },
//         orderBy: {
//           createdAt: 'desc',
//         },
//         select: {
//           content: true,
//           createdAt: true,
//         },
//       });

//       // Fetch receiver's profile
//       const receiverProfile = await prisma.profile.findUnique({
//         where: {
//           userId: chat.receiverId,
//         },
//         select: {
//           userId: true,
//           username: true,
//           profileImage: true,
//         },
//       });

//       return {
//         receiver: receiverProfile,
//         lastMessage: lastMessage?.content || null,
//         lastMessageDate: lastMessage?.createdAt || null,
//       };
//     }),
//   );

//   return results;
// };
const getMyChat = async (userId: string) => {
  // Fetch conversations where the user is either sender or receiver
  const result = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' }, // Get the latest message first
        take: 1, // Get only the latest message
      },
    },
  });

  // Map the result to get the last message, user details, and profile info
  const chatList = await Promise.all(
    result.map(async conversation => {
      const lastMessage = conversation.messages[0]; // Get the last message from the messages array
      const targetUserId =
        conversation.user1Id === userId
          ? conversation.user2Id
          : conversation.user1Id; // Determine the other user

      // Fetch the profile details for the target user
      const targetUserProfile = await prisma.profile.findUnique({
        where: { userId: targetUserId },
        select: {
          userId: true,
          fullName: true,
          profileImage: true,
        },
      });

      return {
        user: targetUserProfile || null, // Return the user's profile details (or null if not found)
        lastMessage: lastMessage ? lastMessage.content : null, // Last message content
        lastMessageDate: lastMessage ? lastMessage.createdAt : null, // Last message timestamp
      };
    }),
  );

  return chatList;
};














export const chatServices = {
  createConversationIntoDB,
  getConversationsByUserIdIntoDB,
  getMessagesByConversationIntoDB,
  createMessageIntoDB,
  getChatUsersForUser,
  deleteConversation,
  countUnreadMessages,
  markMessagesAsRead,
  getMyChat,
};
