import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body || {};

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    try {
      const usersCol = dbClient.db.collection('users');

      const exists = await usersCol.findOne({ email });
      if (exists) return res.status(400).json({ error: 'Already exist' });

      const doc = { email, password: sha1(password) };
      const result = await usersCol.insertOne(doc);

      return res.status(201).json({
        id: result.insertedId.toString(),
        email,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Server error' });
    }
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let _id;
    try {
      _id = new ObjectId(userId);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ _id });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}
