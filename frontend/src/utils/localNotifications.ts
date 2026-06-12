import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_MESSAGES = [
  '👑 King is waiting for you, game time!',
  '🃏 The Joker card is set. Are you ready to play?',
  '⏱️ Quick 5-minute match? Your seat is waiting!',
  '🏆 Show off your card skills! Jump in now.',
  '🔔 Time to declare "5 Cards"! Can you get a correct tick?',
  '🌟 A new round is starting. Beat the bots or play online!',
  '🃏 The deck is shuffled. Time for a quick match!',
  '👑 Ready to defeat the King? Join the table now!'
];

/**
 * Checks/requests notifications permission and schedules 3 random daily notifications.
 */
export async function setupLocalNotifications(): Promise<void> {
  // Only run inside native Capacitor mobile apps
  if (!(window as any).Capacitor) {
    return;
  }

  try {
    // 1. Check and request notification permissions
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      const requestResult = await LocalNotifications.requestPermissions();
      if (requestResult.display !== 'granted') {
        console.log('Local notifications permission denied.');
        return;
      }
    }

    // 2. Cancel previously scheduled notifications to reset clean slots
    await LocalNotifications.cancel({ 
      notifications: [{ id: 1 }, { id: 2 }, { id: 3 }] 
    });

    // 3. Shuffle messages and select 3 distinct random ones
    const shuffled = [...REMINDER_MESSAGES].sort(() => 0.5 - Math.random());

    // 4. Schedule three daily reminders
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 1,
          title: 'Five Cards',
          body: shuffled[0],
          schedule: {
            on: { hour: 12, minute: 30 }, // Lunch hour slot
            repeats: true
          }
        },
        {
          id: 2,
          title: 'Five Cards',
          body: shuffled[1],
          schedule: {
            on: { hour: 17, minute: 45 }, // Evening slot
            repeats: true
          }
        },
        {
          id: 3,
          title: 'Five Cards',
          body: shuffled[2],
          schedule: {
            on: { hour: 20, minute: 30 }, // Prime gaming night slot
            repeats: true
          }
        }
      ]
    });

    console.log('Local notifications scheduled successfully!');
  } catch (e) {
    console.error('Failed to configure local notifications:', e);
  }
}
