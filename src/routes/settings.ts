import { Router, Request, Response } from 'express';
import { Settings } from '../entities/Settings';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = Settings.create({
                max_parking_time: 0,
                parking_lot_active: true,
                total_spaces: 0,
                taken_spaces: 0,
                signal_delay_time: 0
            });
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        console.error('Error in GET /settings', error);
        res.status(500).json({ error: 'Failed to retrieve settings' });
    }
});

router.put('/', async (req: Request, res: Response) => {
    try {
        let settings = await Settings.findOne({ where: { id: 1 } });
        if (!settings) {
            settings = Settings.create(req.body);
        } else {
            Settings.merge(settings, req.body);
        }
        if (settings.max_parking_time < 0) {
            return res.status(400).json({ error: 'MaxParkingTime must be 0 or greater' });
        }
        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error in PUT /settings', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
