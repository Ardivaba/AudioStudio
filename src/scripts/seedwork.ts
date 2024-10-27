import { Production } from '../entities/Production';
import { Worker } from '../entities/Worker';
import { ProductionWorkLog } from '../entities/ProductionWorkLog';
import { config } from '../utils/config';
import { Machine } from '../entities/Machine';
import { Order } from '../entities/Order';
import { Recipe } from '../entities/Recipe';
import { Settings } from '../entities/Settings';
import { Connection } from 'typeorm';
import { createConnection } from '../utils/createConnection';

async function seedProductionWorkLogs() {
    try {
        await createConnection();
        console.log('Database connected');

        // Clear existing ProductionWorkLog data
        await ProductionWorkLog.delete({});

        const productions = await Production.find();
        const workers = await Worker.find();

        for (const production of productions) {
            const duration = production.end_date
                ? Math.floor((production.end_date.getTime() - production.start_date.getTime()) / 1000)
                : 0;

            const numWorkers = (production.produced_quantity < 100 || Math.random() < 0.9) ? 1 : 2;
            const selectedWorkers = workers
                .sort(() => 0.5 - Math.random())
                .filter(x => x.name != 'Priit')
                .slice(0, numWorkers);

            // Determine the created_at date
            const createdAt = production.end_date || production.start_date;

            if (numWorkers === 1) {
                const workLog = new ProductionWorkLog();
                workLog.production_id = production.id;
                workLog.worker_id = selectedWorkers[0].id;
                workLog.duration_seconds = duration;
                workLog.produced_quantity = production.produced_quantity;
                workLog.created_at = createdAt;
                await workLog.save();
            } else {
                // Distribute work between two workers
                const firstWorkerPercentage = 0.4 + Math.random() * 0.2; // 40% to 60%
                const secondWorkerPercentage = 1 - firstWorkerPercentage;

                const firstWorkerDuration = Math.floor(duration * firstWorkerPercentage);
                const secondWorkerDuration = duration - firstWorkerDuration;

                const firstWorkerQuantity = Math.floor(production.produced_quantity * firstWorkerPercentage);
                const secondWorkerQuantity = production.produced_quantity - firstWorkerQuantity;

                const firstWorkLog = new ProductionWorkLog();
                firstWorkLog.production_id = production.id;
                firstWorkLog.worker_id = selectedWorkers[0].id;
                firstWorkLog.duration_seconds = firstWorkerDuration;
                firstWorkLog.produced_quantity = firstWorkerQuantity;
                firstWorkLog.created_at = createdAt;
                await firstWorkLog.save();

                const secondWorkLog = new ProductionWorkLog();
                secondWorkLog.production_id = production.id;
                secondWorkLog.worker_id = selectedWorkers[1].id;
                secondWorkLog.duration_seconds = secondWorkerDuration;
                secondWorkLog.produced_quantity = secondWorkerQuantity;
                secondWorkLog.created_at = createdAt;
                await secondWorkLog.save();
            }
        }

        console.log('ProductionWorkLog seeding completed successfully');
    } catch (error) {
        console.error('Error during ProductionWorkLog seeding:', error);
    } finally {
        // If you need to close the connection, do it here
    }
}

seedProductionWorkLogs().catch(error => console.error(error));