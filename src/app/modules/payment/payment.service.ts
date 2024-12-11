import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import Stripe from 'stripe';
import cron from 'node-cron';
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

export const PaymentServices = { createPayment };
