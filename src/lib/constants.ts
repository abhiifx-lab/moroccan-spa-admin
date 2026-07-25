export const APP_NAME = "Moroccan Spa Admin";
export const DOMAIN_NAME = "moroccanspa.in";
export const LOCATION_CITY = "Lucknow";
export const CURRENCY_SYMBOL = "₹";

export const MOCK_ADMIN_USER = {
  id: "usr_super_admin_001",
  email: "admin@moroccanspa.in",
  fullName: "Super Administrator",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
  role: "super_admin" as const,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
