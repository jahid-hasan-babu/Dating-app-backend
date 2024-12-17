import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import Stripe from 'stripe';
import cron from 'node-cron';
import axios from 'axios';
import config from '../../../config';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-11-20.acacia',
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily subscription expiration check...');

  try {
    // Fetch subscriptions that have expired
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        endDate: {
          lt: new Date(), // Get subscriptions where the end date is in the past
        },
        status: 'active', // Only check active subscriptions
      },
    });

    // Update the status of expired subscriptions
    for (const subscription of expiredSubscriptions) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'canceled' }, // Set the status to canceled
      });

      console.log(
        `Subscription with ID ${subscription.id} has expired and was canceled.`,
      );
    }
  } catch (error) {
    console.error('Error during subscription expiration check:', error);
  }
});

// const createPaypalSubscription = async (
//   userId: string,
//   payload: {
//     subscriptionPlanId: string;
//   },
// ) => {
//   const { subscriptionPlanId } = payload;

//   // Fetch user details
//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: {
//       id: true,
//       email: true,
//       profile: {
//         select: {
//           id: true,
//           fullName: true,
//         },
//       },
//     },
//   });

//   if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

//   // Fetch subscription plan
//   const subscriptionPlan = await prisma.plan.findUnique({
//     where: { id: subscriptionPlanId },
//     select: {
//       id: true,
//       planName: true,
//       price: true,
//       paypalPlanId: true,
//     },
//   });

//   if (!subscriptionPlan)
//     throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');

//   if (!subscriptionPlan.paypalPlanId)
//     throw new AppError(
//       httpStatus.BAD_REQUEST,
//       'PayPal plan ID is missing for the subscription plan',
//     );

//   // Create PayPal subscription
//   const request = new paypal.subscriptions.SubscriptionsCreateRequest();
//   request.requestBody({
//     plan_id: subscriptionPlan.paypalPlanId,
//     subscriber: {
//       name: {
//         given_name: user.profile?.fullName?.split(' ')[0] || 'User',
//         surname: user.profile?.fullName?.split(' ')[1] || 'LastName',
//       },
//       email_address: user.email,
//     },
//     application_context: {
//       brand_name: 'Your App Name',
//       locale: 'en-US',
//       shipping_preference: 'NO_SHIPPING',
//       user_action: 'SUBSCRIBE_NOW',
//     },
//   });

//   const response = await paypalClient.execute(request);

//   // Save payment and subscription details
//   const subscription = await prisma.subscription.create({
//     data: {
//       userID: userId,
//       planID: subscriptionPlan.id,
//       paypalSubscriptionId: response.result.id,
//       status: response.result.status,
//       startDate: new Date(), // Optional: Adjust based on PayPal response
//       endDate: null, // Optional: Update when the subscription is canceled
//     },
//   });

//   return {
//     subscriptionId: subscription.id,
//     approvalUrl: response.result.links.find(link => link.rel === 'approve')
//       ?.href,
//   };
// };

export const createPayment = async (
  userId: string,
  payload: {
    subscriptionPlanId: string;
    paymentMethodId: string;
  },
) => {
  const { subscriptionPlanId, paymentMethodId } = payload;

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          id: true,
          customerId: true,
          fullName: true,
        },
      },
    },
  });

  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  // Fetch subscription plan
  const subscriptionPlan = await prisma.plan.findUnique({
    where: { id: subscriptionPlanId },
    select: {
      id: true,
      planName: true,
      price: true,
      priceId: true,
    },
  });

  if (!subscriptionPlan)
    throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found');

  let customerId = user?.profile?.customerId;

  // Create a new Stripe customer if not already existing
  if (!customerId) {
    const customer = await stripe.customers.create();
    customerId = customer.id;

    // Save the new customerId to the database
    await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: { customerId },
        },
      },
    });
  }

  // Attach the payment method to the customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set the payment method as the default for the customer
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  // Create a subscription
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: subscriptionPlan.priceId }],
    expand: ['latest_invoice.payment_intent'], // Retrieve payment details
  });

  const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

  // Save payment information to the Payment table
  const payment = await prisma.payment.create({
    data: {
      userID: userId,
      totalAmount: subscriptionPlan.price,
      paymentMethod: paymentMethodId,
      cardName: 'Card Name', // You may need to extract this from the payment method or user
      securityCode: 'Security Code', // You cannot store security codes in your database, avoid doing so
      billingZipCode: 'ZipCode', // You can extract zip code from the user or payment method
    },
  });

  // Create the subscription in the Subscription model
  const newSubscription = await prisma.subscription.create({
    data: {
      userID: userId,
      planID: subscriptionPlan.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status, // active, canceled, etc.
      startDate: new Date(), // You can set this to the actual start date if needed
      endDate: new Date(subscription.current_period_end * 1000), // Convert Unix timestamp to Date
      renewedAt: null, // Can be updated on renewal
    },
  });

  // Return subscription and payment details
  return {
    subscriptionId: newSubscription.id, // Return the subscription ID from your database
    amount: subscriptionPlan.price,
    currency: 'USD',
    status: paymentIntent?.status || subscription.status,
    paymentId: payment.id, // Return paymentId for reference
  };
};

const getAccessToken = async () => {
  const auth = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`,
  ).toString('base64');
  const response = await axios.post(
    `${config.paypal.apiUrl}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return response.data.access_token;
};

const createPaypalSubscription = async (
  userId: string,
  payload: { subscriptionPlanId: string },
) => {
  const { subscriptionPlanId } = payload;

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  if (!user) throw new Error('User not found');

  // Fetch subscription plan
  const subscriptionPlan = await prisma.plan.findUnique({
    where: { id: subscriptionPlanId },
    select: {
      id: true,
      planName: true,
      price: true,
      paypalPlanId: true,
      duration: true, // Add duration field for plan
    },
  });

  if (!subscriptionPlan) throw new Error('Subscription plan not found');
  if (!subscriptionPlan.paypalPlanId)
    throw new Error('PayPal plan ID is missing');

  // PayPal subscription request
  const accessToken = await getAccessToken();
  const response = await axios.post(
    `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions`,
    {
      plan_id: subscriptionPlan.paypalPlanId,
      subscriber: {
        name: {
          given_name: user.profile?.fullName?.split(' ')[0] || 'User',
          surname: user.profile?.fullName?.split(' ')[1] || 'LastName',
        },
        email_address: 'sb-jdhfh34972712@personal.example.com',
        //sb-1ytwi34951237@business.example.com
      },
      application_context: {
        brand_name: 'Your App Name',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: 'https://yourdomain.com/success',
        cancel_url: 'https://yourdomain.com/cancel',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  console.dir({ response }, { depth: Infinity });

  // Calculate startDate and endDate
  const startDate = new Date();
  const endDate = new Date(startDate);

  if (subscriptionPlan.duration) {
    const durationInMonths = parseInt(subscriptionPlan.duration, 10);
    endDate.setMonth(endDate.getMonth() + durationInMonths);
  }

  // Save subscription details in the database
  const subscription = await prisma.subscription.create({
    data: {
      userID: userId,
      planID: subscriptionPlan.id,
      paypalSubscriptionId: response.data.id,
      status: response.data.status,
      startDate, // Set calculated startDate
      endDate, // Set calculated endDate
    },
  });

  // Return approval link for user
  const approvalUrl = response.data.links.find(
    (link: any) => link.rel === 'approve',
  )?.href;

  return { subscriptionId: subscription.id, approvalUrl };
};

export const PaymentServices = { createPayment, createPaypalSubscription };
