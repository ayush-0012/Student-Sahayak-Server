import { NextFunction, Request, Response } from "express";
import db from "../db/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function checkSignedIn(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { userId } = req.body;

  if (!userId) {
    return res.status(404).json({
      message: "Please register or login first",
    });
  }

  try {
    const user = await db.select().from(users).where(eq(userId, userId));

    if (user) {
      console.log("user is signed in");
      return res.status(200).json({ message: "User is registered", user });
    } else {
      return res
        .status(404)
        .json({ message: "Please register yourself first" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Error Occurred", error });
  }
}
