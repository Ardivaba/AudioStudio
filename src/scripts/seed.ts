import { createConnection, Connection } from 'typeorm';
import { Settings } from '../entities/Settings';
import { config } from '../utils/config';
import { seedSettings } from './seeds/seedSettings';

export const NumOrders = 30;
export const NumMachines = 1;
export const NumProductions = 50;
export const NumEvents = 100;

async function main() {
    console.log('Starting database seeding...');

    let connection: Connection;

    try {
        connection = await createConnection({
            type: "mysql",
            host: config.database.host,
            port: config.database.port,
            username: config.database.username,
            password: config.database.password,
            database: config.database.database,
            entities: [Settings],
            synchronize: true,
        });

        console.log('Database connected');

        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        await connection.query("TRUNCATE TABLE `settings`");
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");

        // Seed data
        await seedSettings();

        console.log('Seeding completed successfully');
    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}

main().catch(error => console.error(error));
