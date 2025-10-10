import { device } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    permissions: { notifications: 'YES', camera: 'YES', microphone: 'YES' },
    newInstance: true,
  });
});

beforeEach(async () => {
  await device.reloadReactNative();
});

afterAll(async () => {
  await device.terminateApp();
});

