import axios from 'axios';
import { Plan } from '@prisma/client';
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

// const createSubscription = async (plan: Plan, email: string) => {
//   const accessToken = await getAccessToken();

//   try {
//     // Create product if not exists
//     const productResponse = await axios.post(
//       `${config.paypal.apiUrl}/v1/catalogs/products`,
//       {
//         name: `${plan} Plan`,
//         type: 'SERVICE',
//         description: `Subscription plan for ${plan} tier`,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );

//     // Create billing plan
//     const planResponse = await axios.post(
//       `${config.paypal.apiUrl}/v1/billing/plans`,
//       {
//         product_id: productResponse.data.id,
//         name: `${plan} Plan`,
//         billing_cycles: [
//           {
//             frequency: {
//               interval_unit: 'MONTH',
//               interval_count: 1,
//             },
//             tenure_type: 'REGULAR',
//             sequence: 1,
//             total_cycles: 0,
//             pricing_scheme: {
//               fixed_price: {
//                 value: PLAN_PRICES[plan].toString(),
//                 currency_code: 'USD',
//               },
//             },
//           },
//         ],
//         payment_preferences: {
//           auto_bill_outstanding: true,
//           setup_fee: {
//             value: '0',
//             currency_code: 'USD',
//           },
//           setup_fee_failure_action: 'CONTINUE',
//           payment_failure_threshold: 3,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//           Prefer: 'return=representation',
//         },
//       },
//     );

//     // Create subscription
//     const subscriptionResponse = await axios.post(
//       `${config.paypal.apiUrl}/v1/billing/subscriptions`,
//       {
//         plan_id: planResponse.data.id,
//         subscriber: {
//           email_address: email,
//         },
//         application_context: {
//           brand_name: 'MaddVlog',
//           locale: 'en-US',
//           shipping_preference: 'NO_SHIPPING',
//           user_action: 'SUBSCRIBE_NOW',
//           payment_method: {
//             payer_selected: 'PAYPAL',
//             payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
//           },
//           return_url: `${config.frontend_url}/subscription/success`,
//           cancel_url: `${config.frontend_url}/subscription/cancel`,
//         },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );

//     return {
//       id: subscriptionResponse.data.id,
//       status: subscriptionResponse.data.status,
//       approve_url: subscriptionResponse.data.links.find(
//         (link: any) => link.rel === 'approve',
//       ).href,
//     };
//   } catch (error: any) {
//     if (error.response) {
//       throw new Error(
//         `PayPal API Error: ${
//           error.response.data.message || error.response.data.error_description
//         }`,
//       );
//     }
//     throw error;
//   }
// };
