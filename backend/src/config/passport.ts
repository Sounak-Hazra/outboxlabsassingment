import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { prisma } from "../lib/prisma.js";
import { getRequiredEnv } from "../utils/env.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      callbackURL: getRequiredEnv("GOOGLE_CALLBACK_URL"),
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account does not provide an email address."));
        }

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value,
          },
          create: {
            googleId: profile.id,
            email,
            name: profile.displayName || email,
            avatarUrl: profile.photos?.[0]?.value,
          },
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);

export { passport };
