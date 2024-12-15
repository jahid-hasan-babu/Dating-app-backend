import admin from '../../../helpers/firebaseAdmin';
import AppError from '../../errors/AppError';
import prisma from '../../utils/prisma';

// Send notification to a single user
const sendSingleNotification = async (req: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId },
  });

  if (!user?.fcpmToken) {
    throw new AppError(404, 'User not found with FCM token');
  }

  const message = {
    notification: {
      title: req.body.title,
      body: req.body.body,
    },
    token: user.fcpmToken,
  };

  await prisma.notifications.create({
    data: {
      receiverId: req.params.userId,
      title: req.body.title,
      body: req.body.body,
    },
  });

  try {
    const response = await admin.messaging().send(message);
    return response;
  } catch (error: any) {
    if (error.code === 'messaging/invalid-registration-token') {
      throw new AppError(400, 'Invalid FCM registration token');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      throw new AppError(404, 'FCM token is no longer registered');
    } else {
      throw new AppError(500, 'Failed to send notification');
    }
  }
};

// Send notifications to all users with valid FCM tokens
const sendNotifications = async (req: any) => {
  const users = await prisma.user.findMany({
    where: {
      fcpmToken: {
        not: null, // Ensure the token is not null
      },
    },
    select: {
      id: true,
      fcpmToken: true,
    },
  });

  if (!users || users.length === 0) {
    throw new AppError(404, 'No users found with FCM tokens');
  }

  const fcmTokens = users.map(user => user.fcpmToken);

  const message = {
    notification: {
      title: req.body.title,
      body: req.body.body,
    },
    tokens: fcmTokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message as any);

  // Find indices of successful responses
  const successIndices = response.responses
    .map((res, idx) => (res.success ? idx : null))
    .filter(idx => idx !== null) as number[];

  // Filter users by success indices
  const successfulUsers = successIndices.map(idx => users[idx]);

  // Prepare notifications data for only successfully notified users
  const notificationData = successfulUsers.map(user => ({
    receiverId: user.id,
    title: req.body.title,
    body: req.body.body,
  }));

  // Save notifications for successfully notified users
  await prisma.notifications.createMany({
    data: notificationData,
  });

  // Collect failed tokens
  const failedTokens = response.responses
    .map((res, idx) => (!res.success ? fcmTokens[idx] : null))
    .filter(token => token !== null);

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
};

const getNotificationsFromDB = async (req: any) => {
  const notifications = await prisma.notifications.findMany({
    where: {
      receiverId: req.user.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (notifications.length === 0) {
    throw new AppError(404, 'No notifications found for the user');
  }

  return notifications;
};

const getSingleNotificationFromDB = async (
  req: any,
  notificationId: string,
) => {
  const notification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      receiverId: req.user.id,
    },
  });

  if (!notification) {
    throw new AppError(404, 'Notification not found for the user');
  }

  await prisma.notifications.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return notification;
};

export const notificationServices = {
  sendSingleNotification,
  sendNotifications,
  getNotificationsFromDB,
  getSingleNotificationFromDB,
};
