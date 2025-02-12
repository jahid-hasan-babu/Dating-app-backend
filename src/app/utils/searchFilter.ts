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
