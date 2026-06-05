import { Injectable } from '@nestjs/common'
import type { AuthProvider, User } from '../users/entities/user.entity'
import { getFirestore } from '../config/firebase.config'
import { normalizeUsername } from '../common/utils/username.util'

const USERS_COLLECTION = 'users'
const USERNAMES_COLLECTION = 'usernames'

export interface CreateUserStubData {
  uid: string
  firstName: string
  lastName: string
  email: string
  authProvider: AuthProvider
}

export interface CompleteProfileData {
  uid: string
  firstName: string
  lastName: string
  email: string
  username: string
  avatarUrl: string
  authProvider: AuthProvider
}

@Injectable()
export class UsersDao {
  private get users() {
    return getFirestore().collection(USERS_COLLECTION)
  }

  private get usernames() {
    return getFirestore().collection(USERNAMES_COLLECTION)
  }

  private docToUser(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined,
  ): User | null {
    if (!data) return null

    return {
      uid: id,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      email: data.email ?? '',
      username: data.username,
      avatarUrl: data.avatarUrl,
      authProvider: data.authProvider ?? 'password',
      profileComplete: Boolean(data.profileComplete),
      createdAt: data.createdAt ?? '',
      updatedAt: data.updatedAt ?? '',
    }
  }

  async findById(uid: string): Promise<User | null> {
    const snapshot = await this.users.doc(uid).get()
    if (!snapshot.exists) return null
    return this.docToUser(snapshot.id, snapshot.data())
  }

  async isUsernameTaken(
    username: string,
    excludeUid?: string,
  ): Promise<boolean> {
    const normalized = normalizeUsername(username)
    const snapshot = await this.usernames.doc(normalized).get()

    if (!snapshot.exists) return false

    const data = snapshot.data()
    if (!data?.uid) return false

    return excludeUid ? data.uid !== excludeUid : true
  }

  async isEmailTaken(email: string, excludeUid?: string): Promise<boolean> {
    const query = this.users.where('email', '==', email.trim().toLowerCase())
    const snapshot = await query.get()
    if (snapshot.empty) return false

    if (excludeUid) {
      const docs = snapshot.docs
      return docs.some((doc) => doc.id !== excludeUid)
    }
    return true
  }

  async createStub(data: CreateUserStubData): Promise<User> {
    const now = new Date().toISOString()
    const user: User = {
      uid: data.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      authProvider: data.authProvider,
      profileComplete: false,
      createdAt: now,
      updatedAt: now,
    }

    await this.users.doc(data.uid).set(user)
    return user
  }

  async saveCompleteProfile(data: CompleteProfileData): Promise<User> {
    const normalizedUsername = normalizeUsername(data.username)
    const now = new Date().toISOString()
    const db = getFirestore()
    const userRef = db.collection(USERS_COLLECTION).doc(data.uid)
    const usernameRef = db
      .collection(USERNAMES_COLLECTION)
      .doc(normalizedUsername)

    const existing = await userRef.get()
    const createdAt =
      existing.exists && existing.data()?.createdAt
        ? String(existing.data()?.createdAt)
        : now

    const user: User = {
      uid: data.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      username: normalizedUsername,
      avatarUrl: data.avatarUrl,
      authProvider: data.authProvider,
      profileComplete: true,
      createdAt,
      updatedAt: now,
    }

    await db.runTransaction(async (transaction) => {
      const usernameDoc = await transaction.get(usernameRef)

      if (usernameDoc.exists && usernameDoc.data()?.uid !== data.uid) {
        throw new Error('USERNAME_TAKEN')
      }

      transaction.set(userRef, user)
      transaction.set(usernameRef, { uid: data.uid })
    })

    return user
  }

  async update(uid: string, partial: Partial<User>): Promise<User> {
    const current = await this.findById(uid)
    if (!current) {
      throw new Error('USER_NOT_FOUND')
    }

    const db = getFirestore()
    const userRef = db.collection(USERS_COLLECTION).doc(uid)
    const oldUsername = current.username
      ? normalizeUsername(current.username)
      : undefined
    const newUsername = partial.username
      ? normalizeUsername(partial.username)
      : undefined
    const now = new Date().toISOString()

    const updated: User = {
      ...current,
      ...partial,
      username: newUsername ?? current.username,
      updatedAt: now,
    }

    await db.runTransaction(async (transaction) => {
      if (newUsername && newUsername !== oldUsername) {
        const newUsernameRef = db
          .collection(USERNAMES_COLLECTION)
          .doc(newUsername)
        const newUsernameDoc = await transaction.get(newUsernameRef)

        if (newUsernameDoc.exists && newUsernameDoc.data()?.uid !== uid) {
          throw new Error('USERNAME_TAKEN')
        }

        if (oldUsername) {
          transaction.delete(
            db.collection(USERNAMES_COLLECTION).doc(oldUsername),
          )
        }

        transaction.set(newUsernameRef, { uid })
      }

      transaction.set(userRef, updated)
    })

    return updated
  }

  async delete(uid: string): Promise<void> {
    const current = await this.findById(uid)
    if (!current) {
      throw new Error('USER_NOT_FOUND')
    }

    const db = getFirestore()
    const userRef = db.collection(USERS_COLLECTION).doc(uid)

    await db.runTransaction(async (transaction) => {
      transaction.delete(userRef)

      if (current.username) {
        transaction.delete(
          db
            .collection(USERNAMES_COLLECTION)
            .doc(normalizeUsername(current.username)),
        )
      }
    })
  }
}
