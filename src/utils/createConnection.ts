import { DataSource } from "typeorm";
import { config } from "./config";
import { Settings } from '../entities/Settings';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Video } from "../entities/Video";

export async function createConnection() {
    const dataSource = new DataSource({
        type: "mysql",
        host: config.database.host,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password,
        database: config.database.database,
        entities: [
            Settings,
            Video,
        ],
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy()
    });

    await dataSource.initialize();
}