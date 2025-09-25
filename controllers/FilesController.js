import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const STORAGE_ROOT = process.env.FOLDER_PATH || '/tmp/files_manager';

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let ownerId;
    try {
      ownerId = new ObjectId(userId);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usersCol = dbClient.db.collection('users');
    const user = await usersCol.findOne({ _id: ownerId });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'Missing name' });
    const allowed = ['folder', 'file', 'image'];
    if (!type || !allowed.includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    let parent = null;
    if (parentId && parentId !== 0 && parentId !== '0') {
      let _pid;
      try {
        _pid = new ObjectId(String(parentId));
      } catch (e) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      const filesCol = dbClient.db.collection('files');
      parent = await filesCol.findOne({ _id: _pid });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const filesCol = dbClient.db.collection('files');

    if (type === 'folder') {
      const doc = {
        userId: ownerId,
        name,
        type,
        isPublic: Boolean(isPublic),
        parentId: parent ? parent._id : 0,
      };
      const result = await filesCol.insertOne(doc);
      return res.status(201).json({
        id: result.insertedId.toString(),
        userId: ownerId.toString(),
        name,
        type,
        isPublic: Boolean(isPublic),
        parentId: parent ? parent._id.toString() : 0,
      });
    }

    try {
      await fs.promises.mkdir(STORAGE_ROOT, { recursive: true });
      const localName = uuidv4();
      const localPath = path.join(STORAGE_ROOT, localName);

      const buffer = Buffer.from(data, 'base64');
      await fs.promises.writeFile(localPath, buffer, { mode: 0o644 });

      const doc = {
        userId: ownerId,
        name,
        type,
        isPublic: Boolean(isPublic),
        parentId: parent ? parent._id : 0,
        localPath,
      };
      const result = await filesCol.insertOne(doc);

      return res.status(201).json({
        id: result.insertedId.toString(),
        userId: ownerId.toString(),
        name,
        type,
        isPublic: Boolean(isPublic),
        parentId: parent ? parent._id.toString() : 0,
      });
    } catch (e) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
}
