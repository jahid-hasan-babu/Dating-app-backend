import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';
import { Request } from 'express';
import { searchFilter } from '../../utils/searchFilter';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import axios from 'axios';
import config from '../../../config';

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

const getAllPlans = async () => {
  const result = await prisma.plan.findMany();
  return result;
};

const createPlan = async (payload: any) => {
  const result = await prisma.plan.create({
    data: payload,
  });
  return result;
};
const updatePlan = async (id: string, payload: any) => {
  try {
    const result = await prisma.plan.update({
      where: { id }, // Ensure `id` is the correct unique identifier
      data: payload, // `payload` should be an object with valid fields to update
    });
    return result;
  } catch (error: any) {
    console.error('Error updating plan:', error.message);
    throw error;
  }
};

// Step 1: Create PayPal Product and Plan (Using Existing Access Token)
const createPayPalProductAndPlan = async (
  accessToken: string,
  planName: string,
  price: number,
  description?: string,
) => {
  try {
    // Create Product
    const productResponse = await axios.post(
      `${config.paypal.apiUrl}/v1/catalogs/products`,
      {
        name: planName,
        type: 'SERVICE',
        description: description || `${planName} subscription plan.`,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Send the access token here
          'Content-Type': 'application/json',
        },
      },
    );

    const productId = productResponse.data.id;

    // Create Billing Plan using Product ID
    const planResponse = await axios.post(
      `${config.paypal.apiUrl}/v1/billing/plans`,
      {
        product_id: productId,
        name: `${planName} Plan`,
        billing_cycles: [
          {
            frequency: {
              interval_unit: 'MONTH',
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite billing cycles
            pricing_scheme: {
              fixed_price: {
                value: price.toFixed(2),
                currency_code: 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`, // Send the same access token
          'Content-Type': 'application/json',
        },
      },
    );

    const planId = planResponse.data.id;
    console.log({ planResponse });
    console.dir({ productResponse }, { depth: Infinity });
    // Return both productId and planId
    return {
      productId,
      planId,
    };
  } catch (error: any) {
    console.error('Error creating PayPal product/plan:', error.response?.data);
    throw new Error(
      error.response?.data.message ||
        'Failed to create PayPal Product and Plan',
    );
  }
};

// <div id="paypal-button-container-P-2NH89360L0165294HM5QXBCI"></div>
// <script src="https://www.paypal.com/sdk/js?client-id=ARWNjK4PbU9yjcB7nDDfzT_qVNyXdoYThYXdQN_mViqZCeEZZIgzriPev6xRWNorM82d2m3jj9UkS0ic&vault=true&intent=subscription" data-sdk-integration-source="button-factory"></script>
// <script>
//   paypal.Buttons({
//       style: {
//           shape: 'rect',
//           color: 'gold',
//           layout: 'vertical',
//           label: 'subscribe'
//       },
//       createSubscription: function(data, actions) {
//         return actions.subscription.create({
//           /* Creates the subscription */
//           plan_id: 'P-2NH89360L0165294HM5QXBCI'
//         });
//       },
//       onApprove: function(data, actions) {
//         alert(data.subscriptionID); // You can add optional success message for the subscriber here
//       }
//   }).render('#paypal-button-container-P-2NH89360L0165294HM5QXBCI'); // Renders the PayPal button
// </script>
export const PlanServices = {
  getAllPlans,
  createPlan,
  getAccessToken,
  updatePlan,
  createPayPalProductAndPlan,
};
