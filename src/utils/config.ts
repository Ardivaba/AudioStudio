import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

(() => {
    dotenv.config();
    if (process.env.NODE_ENV === 'test') {
        const envConfig = dotenv.parse(
            fs.readFileSync(path.join(__dirname, '..', '..', '.env.test'))
        );

        for (const [key, value] of Object.entries(envConfig)) {
            if (process.env[key] !== undefined) {
                process.env[key] = value;
            }
        }
    }
})();

interface AppConfig {
    port: number;
    jwtUsername: string;
    jwtPassword: string;
    jwtSecret: string;
    corsAllowedOrigins: string;
    sentryDsn: string;
    viteBaseUrl: string;
    isProduction: boolean;
}

interface DatabaseConfig {
    host: string;
    username: string;
    password: string;
    database: string;
    port: number;
}

interface Config {
    app: AppConfig;
    database: DatabaseConfig;
}

export const config = {
    app: {
        port: Number(process.env.APP_PORT),
        jwtUsername: process.env.JWT_USERNAME,
        jwtPassword: process.env.JWT_PASSWORD,
        jwtSecret: process.env.JWT_SECRET,
        corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
        sentryDsn: process.env.SENTRY_DSN,
        viteBaseUrl: process.env.VITE_BASE_URL,
        isProduction: process.env.IS_PRODUCTION === 'true',
    },
    database: {
        host: process.env.DB_HOST || '',
        username: process.env.DB_USERNAME || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || '',
        port: Number(process.env.DB_PORT) || 3306,
    },
} as Config;