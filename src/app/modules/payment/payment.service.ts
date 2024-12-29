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

  // Fetch subscription plan details
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

  // Check and cancel the user's existing local subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: { userID: userId, status: 'active' },
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'canceled' },
    });
  }

  // Handle active Stripe subscriptions
 if (!customerId) {
   // Create a new customer in Stripe
   const customer = await stripe.customers.create({
     metadata: {
       userId: userId, // Optional: Store a reference to your user ID
     },
   });
   customerId = customer.id;

   // Update the user profile with the new customerId
   await prisma.user.update({
     where: { id: userId },
     data: {
       profile: {
         update: { customerId },
       },
     },
   });
 } else {
   // List and cancel active Stripe subscriptions
   const stripeSubscriptions = await stripe.subscriptions.list({
     customer: customerId,
     status: 'active',
   });

   for (const sub of stripeSubscriptions.data) {
     await stripe.subscriptions.cancel(sub.id);
   }
 }

  // Attach the payment method to the customer
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Set the payment method as the default
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  // Create a new subscription in Stripe
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: subscriptionPlan.priceId }],
    expand: ['latest_invoice.payment_intent'], // Include payment details
  });

  const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;

  // Save payment information in the Payment table
  const payment = await prisma.payment.create({
    data: {
      userID: userId,
      totalAmount: subscriptionPlan.price,
      paymentMethod: paymentMethodId,
      cardName: 'Card Name', // Extract from payment method if available
      billingZipCode: 'ZipCode', // Extract from payment details
      securityCode: '', // Never store sensitive details
    },
  });

  // Save the new subscription in the Subscription table
  const newSubscription = await prisma.subscription.create({
    data: {
      userID: userId,
      planID: subscriptionPlan.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      startDate: new Date(),
      endDate: new Date(subscription.current_period_end * 1000),
      renewedAt: null,
    },
  });

  // Return details for confirmation
  return {
    subscriptionId: newSubscription.id,
    amount: subscriptionPlan.price,
    currency: 'USD',
    status: paymentIntent?.status || subscription.status,
    paymentId: payment.id,
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

// const createPaypalSubscription = async (
//   userId: string,
//   payload: { subscriptionPlanId: string },
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

//   if (!user) throw new Error('User not found');

//   // Fetch subscription plan
//   const subscriptionPlan = await prisma.plan.findUnique({
//     where: { id: subscriptionPlanId },
//     select: {
//       id: true,
//       planName: true,
//       price: true,
//       paypalPlanId: true,
//       duration: true,
//     },
//   });

//   if (!subscriptionPlan) throw new Error('Subscription plan not found');
//   if (!subscriptionPlan.paypalPlanId)
//     throw new Error('PayPal plan ID is missing');

//   // Check if user has an active subscription in the database
//   const existingSubscription = await prisma.subscription.findFirst({
//     where: { userID: userId, status: 'ACTIVE' },
//   });

//   if (existingSubscription) {
//     // Check the status of the subscription in PayPal
//     const accessToken = await getAccessToken();
//     const paypalSubscription = await axios.get(
//       `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions/${existingSubscription.paypalSubscriptionId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       },
//     );

//     const paypalStatus = paypalSubscription.data.status;

//     if (paypalStatus === 'ACTIVE') {
//       // Cancel the subscription on PayPal
//       await axios.post(
//         `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions/${existingSubscription.paypalSubscriptionId}/cancel`,
//         {
//           reason: 'User switched to a new subscription plan',
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             'Content-Type': 'application/json',
//           },
//         },
//       );

//       // Update the subscription status in the database
//       await prisma.subscription.update({
//         where: { id: existingSubscription.id },
//         data: {
//           status: 'CANCELED',
//           canceledAt: new Date(),
//         },
//       });
//     }
//   }

//   // Create a new PayPal subscription
//   const accessToken = await getAccessToken();
//   const response = await axios.post(
//     `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions`,
//     {
//       plan_id: subscriptionPlan.paypalPlanId,
//       subscriber: {
//         name: {
//           given_name: user.profile?.fullName?.split(' ')[0] || 'User',
//           surname: user.profile?.fullName?.split(' ')[1] || 'LastName',
//         },
//         email_address: user.email,
//       },
//       application_context: {
//         brand_name: 'Your App Name',
//         locale: 'en-US',
//         shipping_preference: 'NO_SHIPPING',
//         user_action: 'SUBSCRIBE_NOW',
//         return_url: 'https://yourdomain.com/success',
//         cancel_url: 'https://yourdomain.com/cancel',
//       },
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${accessToken}`,
//         'Content-Type': 'application/json',
//       },
//     },
//   );

//   // Calculate startDate and endDate
//   const startDate = new Date();
//   const endDate = new Date(startDate);

//   if (subscriptionPlan.duration) {
//     const durationInMonths = parseInt(subscriptionPlan.duration, 10);
//     endDate.setMonth(endDate.getMonth() + durationInMonths);
//   }

//   // Save the new subscription in the database
//   const newSubscription = await prisma.subscription.create({
//     data: {
//       userID: userId,
//       planID: subscriptionPlan.id,
//       paypalSubscriptionId: response.data.id,
//       status: response.data.status,
//       startDate,
//       endDate,
//     },
//   });

//   // Return approval link for user to approve the payment
//   const approvalUrl = response.data.links.find(
//     (link: any) => link.rel === 'approve',
//   )?.href;

//   return { subscriptionId: newSubscription.id, approvalUrl };
// };


export const PaymentServices = { createPayment, createPaypalSubscription };
