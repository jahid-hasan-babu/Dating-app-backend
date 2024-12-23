import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { messageService } from './message.service';
import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { channelClients } from '../../../server';

const createMessage = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const usersenderId = req.user.id;
    const userId = req.params.userId;

    // Create the message in the database and get the response back
    const newMessage = await messageService.createMessageInDB(
      usersenderId,
      userId,
      req,
    );

    // Fetch all messages for the receiver (userId)
    const results = await prisma.message.findMany({
      where: {
        receiverId: userId, // Adjust based on the specific channel and receiverId if needed
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // Prepare the message payload
    const messagePayload = {
      type: 'message',
      receiverId: userId, // Corrected spelling for consistency
      message: results, // You might want to send only the new message or all
    };

    // Send the message only to clients connected to the specific channel
    const channelClient = channelClients.get(userId) || [];

    // Ensure sending the message to all connected WebSocket clients for the user
    [...channelClient].forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(messagePayload));
      }
    });

    // Respond to the client with a success message
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: 'Message created successfully',
      data: results,
    });
  },
);

const getMyChat = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.body.id;
    const result = await messageService.getMyChat(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Message Retrieve successfully',
      data: result,
    });
  },
);

export const MessageControllers = {
  createMessage,
  getMyChat,
};
