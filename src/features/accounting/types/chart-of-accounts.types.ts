export type AccountCategory = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE';

export interface AccountHead {
  code: string;
  name: string;
  category: AccountCategory;
  description: string;
}

export const CHART_OF_ACCOUNTS: AccountHead[] = [
  // ASSETS (1000 Series)
  { code: '1010', name: 'Cash in Hand', category: 'ASSET', description: 'Physical cash held in reception drawer' },
  { code: '1020', name: 'Bank Account', category: 'ASSET', description: 'Primary spa bank account' },
  { code: '1030', name: 'UPI Wallet', category: 'ASSET', description: 'Digital UPI payments clearing' },
  { code: '1040', name: 'Card Settlement Clearing', category: 'ASSET', description: 'POS card terminal settlements' },
  { code: '1050', name: 'Petty Cash Vault', category: 'ASSET', description: 'Emergency cash vault' },
  { code: '1060', name: 'Inventory Asset', category: 'ASSET', description: 'Stock value of oils & products' },
  { code: '1070', name: 'Staff Advances Outstanding', category: 'ASSET', description: 'Salary advances given to staff' },

  // LIABILITIES (2000 Series)
  { code: '2010', name: 'Customer Advances', category: 'LIABILITY', description: 'Unearned customer advance deposits' },
  { code: '2020', name: 'Gift Card Liability', category: 'LIABILITY', description: 'Unredeemed gift card vouchers' },
  { code: '2030', name: 'Membership Liability', category: 'LIABILITY', description: 'Unused membership pass credits' },
  { code: '2040', name: 'GST Payable', category: 'LIABILITY', description: 'Tax liabilities collected' },
  { code: '2050', name: 'Salary Payable', category: 'LIABILITY', description: 'Accrued staff wages' },
  { code: '2060', name: 'Vendor Payable', category: 'LIABILITY', description: 'Outstanding supplier bills' },

  // INCOME (3000 Series)
  { code: '3010', name: 'Service Revenue', category: 'INCOME', description: 'Hammam & treatment service sales' },
  { code: '3020', name: 'Product Revenue', category: 'INCOME', description: 'Retail spa product sales' },
  { code: '3030', name: 'Membership Revenue', category: 'INCOME', description: 'VIP membership subscription sales' },
  { code: '3040', name: 'Gift Card Revenue', category: 'INCOME', description: 'Expired or redeemed gift cards' },
  { code: '3050', name: 'Commission Income', category: 'INCOME', description: 'Partner referral commissions' },
  { code: '3060', name: 'Other Income', category: 'INCOME', description: 'Miscellaneous operational income' },

  // EXPENSES (4000 Series)
  { code: '4010', name: 'Staff Salary & Wages', category: 'EXPENSE', description: 'Therapist & reception payroll' },
  { code: '4020', name: 'Electricity & Utilities', category: 'EXPENSE', description: 'Power, water & heating bills' },
  { code: '4030', name: 'Laundry & Linen', category: 'EXPENSE', description: 'Towel & robe cleaning' },
  { code: '4040', name: 'Refreshments (Tea & Coffee)', category: 'EXPENSE', description: 'Moroccan mint tea & snacks' },
  { code: '4050', name: 'Housekeeping & Cleaning', category: 'EXPENSE', description: 'Sanitation & cleaning supplies' },
  { code: '4060', name: 'Marketing & Ads', category: 'EXPENSE', description: 'Promotional campaigns' },
  { code: '4070', name: 'Property Rent', category: 'EXPENSE', description: 'Monthly centre lease rent' },
  { code: '4080', name: 'Internet & Software', category: 'EXPENSE', description: 'Broadband & POS software' },
  { code: '4090', name: 'Repairs & Maintenance', category: 'EXPENSE', description: 'Facility maintenance' },
  { code: '4100', name: 'Refunds Paid', category: 'EXPENSE', description: 'Customer refund payouts' },
  { code: '4110', name: 'Consumables & Spa Oils', category: 'EXPENSE', description: 'Argan oil, black soap & clay' },
  { code: '4120', name: 'Miscellaneous Expense', category: 'EXPENSE', description: 'Uncategorized petty expenses' },
];
