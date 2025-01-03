import { z } from 'zod';

const registerProfileSchema = z.object({
  body: z.object({
    firstName: z.string({
      required_error: 'First name is required!',
    }),
    country: z.string({
      required_error: 'Country is required!',
    }),
    city: z.string({
      required_error: 'City is required!',
    }),
    gender: z.string({
      required_error: 'Gender is required!',
    }),
    dateOfBirth: z.string({
      required_error: 'Date of birth is required!',
    }),
    userId: z.string({
      required_error: 'User Id is required!',
    }),
  }),
});

export const ProfileValidation = { registerProfileSchema };
