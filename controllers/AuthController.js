import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AuthController {
  static async getConnect(req, res) {
    const auth = req.header('Authorization') || '';
    if (!auth.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64 = auth.replace('Basic ', '');
    let decoded = '';
    try {
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [email, password] = decoded.split(':');
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ email, password: sha1(password) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = uuidv4();
    await redisClient.set(`auth_${token}`, String(user._id), 24 * 3600);

    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}
