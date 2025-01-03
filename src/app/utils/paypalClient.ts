import paypal from '@paypal/checkout-server-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_SECRET!,
);

const paypalClient = new paypal.core.PayPalHttpClient(environment);

export default paypalClient;
