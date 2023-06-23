import { existsSync, promises } from 'fs';
import { ObjectId } from 'mongodb';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dBClient from './db';

export const FOLDER = 'folder';
const FILE = 'file';
const IMAGE = 'image';
const VALID_FILE_TYPES = [FOLDER, FILE, IMAGE];
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const MAX_PAGE_SIZE = 20;
const { mkdir, writeFile } = promises;

/**
 * FilesCollection class to manage file documents
 */
export class FilesCollection {
  constructor() {
    this.files = dBClient.filesCollection();
  }

  /**
   * Async function that finds a document by its ID.
   *
   * @param {string} id - The ID of the document to find.
   * @return {Promise<Object>} A promise that resolves to the document with the
   * given ID, or null if not found.
   */
  async findById(id) {
    return this.files.findOne({ _id: ObjectId(id) });
  }

  /**
   * Asynchronously adds a file to the database.
   *
   * @param {Object} file - The file to be added to the database.
   * @return {Object} An object containing the id and the rest of the properties
   * of the added file.
   */
  async addFile(file) {
    const result = await this.files.insertOne(file);
    const { _id, ...rest } = result.ops[0];
    return { id: _id, ...rest };
  }

  /**
   * Finds a user file by id.
   *
   * @param {string} userId - The id of the user.
   * @param {string} fileId - The id of the file.
   * @param {boolean} [removeLocalPath=true] - Whether or not to remove the
   * local path.
   * @return {Object} The file object.
   */
  async findUserFileById(userId, fileId, removeLocalPath = true) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const result = await this.files.findOne({
      userId: ObjectId(userId),
      _id: ObjectId(fileId),
    });
    if (!result) { return null; }
    if (removeLocalPath) {
      return FilesCollection.removeLocalPath(
        FilesCollection.replaceDefaultMongoId(result),
      );
    }
    return FilesCollection.replaceDefaultMongoId(result);
  }

  /**
   * Asynchronously finds and returns a file if it is public or owned by a given
   * user.
   *
   * @param {string} userId - the ID of the user
   * @param {string} fileId - the ID of the file
   * @return {Object} Returns the file object with the local path removed and
   * default mongo ID replaced; null if the file is not found or is not public
   * and not owned by the user.
   */
  async findPublicOrOwnFile(userId, fileId) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }

    const result = await this.files.findOne({
      _id: ObjectId(fileId),
    });
    if (!result) { return null; }

    if (!result.isPublic && (!userId || !result.userId.equals(userId))) {
      return null;
    }

    if (result.type !== FOLDER && !existsSync(result.localPath)) {
      return null;
    }

    return FilesCollection.replaceDefaultMongoId(result);
  }

  /**
   * Finds all files belonging to a user that has a specific parentId.
   *
   * @param {string} userId - The id of the user to search files for.
   * @param {string} parentId - The id of the parent file to search for.
   * @param {number} page - The page number to return.
   * @return {Array} An array containing files belonging to the user.
   */
  async findAllUserFilesByParentId(userId, parentId, page) {
    let query = { userId: ObjectId(userId) };

    if (parentId !== 0) {
      if (!ObjectId.isValid(parentId)) {
        return [];
      }
      const parent = await this.findById(parentId);
      if (!parent || parent.type !== FOLDER) {
        return [];
      }
      query = {
        ...query,
        parentId: ObjectId(parentId),
      };
    }
    const results = await this.files
      .find(query)
      .skip(page * MAX_PAGE_SIZE)
      .limit(MAX_PAGE_SIZE)
      .toArray();
    return results.map(
      FilesCollection.replaceDefaultMongoId,
    ).map(FilesCollection.removeLocalPath);
  }

  /**
   * Updates a file's publication status for a given user.
   *
   * @param {string} userId - The ID of the user who owns the file.
   * @param {string} fileId - The ID of the file to update.
   * @param {boolean} isPublished - The new publication status of the file.
   * @return {Object|null} The updated file, or null if the update failed.
   */
  async updateFilePublication(userId, fileId, isPublished) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const result = await this.files.updateOne(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublic: isPublished } },
    );
    if (result.matchedCount !== 1) {
      return null;
    }
    const doc = await this.findById(fileId);
    return FilesCollection.removeLocalPath(
      FilesCollection.replaceDefaultMongoId(doc),
    );
  }

  /**
   * Replaces the default MongoDB _id field with a new 'id' field in the given
   * document object.
   *
   * @param {Object} document - An object representing a MongoDB document.
   * @return {Object} An object with the '_id' field replaced by a new 'id'
   * field.
   */
  static replaceDefaultMongoId(document) {
    const { _id, ...rest } = document;
    return { id: _id, ...rest };
  }

  /**
   * Removes the localPath property from a document object.
   *
   * @param {Object} document - The document object to remove localPath property
   * from.
   * @return {Object} A new document object without the localPath property.
   */
  static removeLocalPath(document) {
    const doc = { ...document };
    delete doc.localPath;
    return doc;
  }
}

/**
 * A File class that represents a file document
 */
export default class File {
  constructor(userId, name, type, parentId, isPublic, data) {
    this.userId = userId;
    this.name = name;
    this.type = type;
    this.parentId = parentId || 0;
    this.isPublic = isPublic || false;
    this.data = data;
    this.filesCollection = new FilesCollection();
  }

  /**
   * Asynchronously validates the object and returns an error message if
   * invalid.
   *
   * @return {Promise<string>} An error message if invalid, otherwise null.
   */
  async validate() {
    if (!this.name) {
      return 'Missing name';
    }

    if (!this.type || !VALID_FILE_TYPES.includes(this.type)) {
      return 'Missing type';
    }

    if (!this.data && this.type !== FOLDER) {
      return 'Missing data';
    }

    if (this.parentId) {
      const parent = await this.filesCollection.findById(this.parentId);
      if (!parent) {
        return 'Parent not found';
      }

      if (parent.type !== FOLDER) {
        return 'Parent is not a folder';
      }
    }

    return null;
  }

  /**
   * Asynchronously saves data to the file system or database.
   *
   * @return {Promise} A Promise that resolves to the saved file object.
   * @throws {Error} If the provided data is invalid.
   */
  async save() {
    const error = await this.validate();
    if (error) {
      throw new Error(error);
    }

    if (this.type === FOLDER) {
      return this.filesCollection.addFile({
        userId: ObjectId(this.userId),
        name: this.name,
        type: FOLDER,
        parentId: this.parentId,
      });
    }
    await mkdir(FOLDER_PATH, { recursive: true });
    const localPath = join(FOLDER_PATH, uuidv4());
    await writeFile(localPath, Buffer.from(this.data, 'base64'));
    return this.filesCollection.addFile({
      userId: ObjectId(this.userId),
      name: this.name,
      type: this.type,
      isPublic: this.isPublic,
      parentId: this.parentId ? ObjectId(this.parentId) : 0,
      localPath,
    });
  }
}
