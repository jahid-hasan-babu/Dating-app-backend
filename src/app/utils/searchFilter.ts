// export const searchFilter = (search: string) => {
//   if (!search) {
//     return {};
//   }

//   return {
//     OR: [
//       { country: { contains: search, mode: 'insensitive' } },
//       { city: { contains: search, mode: 'insensitive' } },
//     ],
//   };
// };export const searchFilter = (search: string) => {
export const searchFilter = (search: string | null) => {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { country: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
    ],
  };
};
