import type { UserData } from "../types/firestore";
import { firestore } from "./firebase";

/**
 * Create or update a user in Firestore
 */
export async function createOrUpdateUser(
  uid: string,
  data: Partial<UserData>
): Promise<void> {
  const userRef = firestore.collection("users").doc(uid);
  const timestamp = new Date();

  const userData: Partial<UserData> = {
    ...data,
    uid,
    updatedAt: timestamp,
  };

  // Check if user exists
  const docSnapshot = await userRef.get();

  if (docSnapshot.exists) {
    // Update existing user
    await userRef.update(userData);
  } else {
    // Create new user with createdAt
    await userRef.set({
      ...userData,
      createdAt: timestamp,
    });
  }
}

/**
 * Get user data from Firestore
 */
export async function getUser(uid: string): Promise<UserData | null> {
  const userRef = firestore.collection("users").doc(uid);
  const docSnapshot = await userRef.get();

  if (docSnapshot.exists) {
    return docSnapshot.data() as UserData;
  }

  return null;
}

/**
 * Delete user from Firestore
 */
export async function deleteUser(uid: string): Promise<void> {
  const userRef = firestore.collection("users").doc(uid);
  await userRef.delete();
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserData>
): Promise<void> {
  const userRef = firestore.collection("users").doc(uid);
  await userRef.update({
    ...data,
    updatedAt: new Date(),
  });
}
