import { Settings } from "../../entities/Settings";

export async function seedSettings() {
    const settings = new Settings();
    settings.example_setting = 123;

    await settings.save();
    console.log('Settings seeded');
}