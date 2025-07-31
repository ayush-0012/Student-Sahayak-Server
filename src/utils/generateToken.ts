import crypto from "crypto";

export function generateToken(): string {
  const token: string = crypto.randomBytes(32).toString("hex");

  console.log("generated token", token);

  return token;
}
