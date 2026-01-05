import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const events = await kv.get('events') || [];
      const allUsers = await kv.get('allUsers') || [];
      const activityLogs = await kv.get('activityLogs') || [];
      res.status(200).json({ events, allUsers, activityLogs });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  } else if (req.method === 'POST') {
    try {
      const { events, allUsers, activityLogs } = req.body;
      if (events !== undefined) {
        await kv.set('events', events);
      }
      if (allUsers !== undefined) {
        await kv.set('allUsers', allUsers);
      }
      if (activityLogs !== undefined) {
        await kv.set('activityLogs', activityLogs);
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving data:', error);
      res.status(500).json({ error: 'Failed to save data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
