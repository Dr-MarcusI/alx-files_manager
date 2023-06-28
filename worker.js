import Queue from 'bull';
import { promises } from 'fs';
import generateThumbnail from 'image-thumbnail';
import dBClient from './utils/db';
import { FilesCollection } from './utils/file';

const { writeFile } = promises;

const THUMBNAIL_SIZES = [500, 250, 100];

const fileQueue = new Queue('image-thumbnail-worker', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

async function createAndSaveThumbnail(path, width) {
  const thumbnail = await generateThumbnail(
    path, { width, responseType: 'base64' },
  );
  const filePath = `${path}_${width}`;
  await writeFile(filePath, Buffer.from(thumbnail, 'base64'));
}

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) { done(new Error('Missing fileId')); }
  if (!userId) { done(new Error('Missing userId')); }

  const filesCollection = new FilesCollection();
  const file = await filesCollection.findUserFileById(userId, fileId, false);
  if (!file) { done(new Error('File not found')); }

  THUMBNAIL_SIZES.forEach(async (size) => {
    await createAndSaveThumbnail(file.localPath, size);
  });
  done();
});

export const userQueue = new Queue('user-welcome-worker', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;
  if (!userId) { done(new Error('Missing userId')); }

  const user = await dBClient.findUserById(userId);
  if (!user) { done(new Error('User not found')); }

  console.log(`Welcome ${user.email}`);
  done();
});

export default fileQueue;
