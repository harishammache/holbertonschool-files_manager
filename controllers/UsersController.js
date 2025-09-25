import sha1 from 'sha1';
import dbClient from '../utils/db';

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
}
