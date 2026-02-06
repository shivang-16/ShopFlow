import { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { User, IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("[Auth] Middleware execution started");

  try {
    const { userId } = getAuth(req);
    console.log("[Auth] Auth context extracted", { userId });

    if (!userId) {
      console.log("[Auth] No userId found in auth context");
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user = await User.findById(userId);

    if (!user) {
      console.log(`[Auth] User not found in DB. Creating new user for: ${userId}`);

      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(userId);
      } catch (clerkError: any) {
        console.error(`[Auth] Failed to fetch user from Clerk: ${clerkError}`);
        if (clerkError?.status === 429) {
          return res.status(429).json({
            message: "Too many requests. Please try again.",
            error: "Rate limit exceeded",
          });
        }
        return res.status(500).json({ message: "Failed to authenticate user" });
      }

      const newUser = new User({
        _id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        firstName: clerkUser.firstName || clerkUser.username || "User",
        lastName: clerkUser.lastName || "",
        username: clerkUser.username || `user_${Date.now()}`,
        avatarUrl: clerkUser.imageUrl || "",
      });

      user = await newUser.save();
      console.log(`[Auth] New user created: ${user.username}`);
    } else {
      console.log(`[Auth] User found: ${user.username}`);
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error(`[Auth] Authentication failed:`, err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
