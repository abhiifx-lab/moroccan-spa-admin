export interface AppVersionConfig {
  version: string;
  buildId: string;
  appName: string;
  environment: string;
  database: string;
  lastDeployment: string;
}

export const APP_VERSION_CONFIG: AppVersionConfig = {
  appName: 'Moroccan Booking OS',
  version: 'v0.1.0',
  buildId: '2026.07.26.001',
  environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
  database: 'Supabase PostgreSQL',
  lastDeployment: '2026-07-26 09:22 AM IST',
};

let hasLogged = false;

export function logAppStartupInfo(selectedCentreName?: string) {
  if (typeof window === 'undefined' || hasLogged) return;
  hasLogged = true;

  console.log(
    `%c 👑 ${APP_VERSION_CONFIG.appName} %c ${APP_VERSION_CONFIG.version} (Build ${APP_VERSION_CONFIG.buildId}) `,
    'background: #2563eb; color: #ffffff; font-weight: bold; padding: 4px 8px; border-radius: 4px 0 0 4px;',
    'background: #1e293b; color: #38bdf8; font-weight: bold; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
  console.log(
    `%c Environment: ${APP_VERSION_CONFIG.environment} | DB: ${APP_VERSION_CONFIG.database} | Deployed: ${APP_VERSION_CONFIG.lastDeployment} | Scope: ${selectedCentreName || 'All Spa Centres'} `,
    'color: #64748b; font-size: 11px; font-weight: 600;'
  );
}
