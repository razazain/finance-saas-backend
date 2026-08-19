export const businessScope = (req) => {
  return {
    businessId: req.user.businessId
  };
};