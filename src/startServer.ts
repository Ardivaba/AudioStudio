import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import app from "./app";
import { Settings } from "./entities/Settings";
import { config } from "./utils/config";

// Database connection and server start
export const startServer = async () => {
    try {
        async function createConnection() {
            const dataSource = new DataSource({
                type: "mysql",
                host: config.database.host,
                port: config.database.port,
                username: config.database.username,
                password: config.database.password,
                database: config.database.database,
                entities: [
                    Settings,
                ],
                synchronize: true,
                namingStrategy: new SnakeNamingStrategy()
            });

            await dataSource.initialize();
        }
        await createConnection();
        console.log('Database connected');

        app.listen(config.app.port, () => {
            console.log(`Server running on port ${config.app.port}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};
