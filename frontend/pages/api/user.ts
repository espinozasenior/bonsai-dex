import db from "prisma/index";
import cache from "utils/cache";
import type { StateUser } from "state/global";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Collects StateUser object for address or throws
 * @param {string} address to collect
 * @returns {Promise<StateUser>}
 */
export async function getStateUser(address: string): Promise<StateUser> {
  // Force lowercase
  const lowerAddress: string = address.toLowerCase();

  // Check for cache
  const cached = await cache.get(`state_user_${lowerAddress}`);
  // If cached, return
  if (cached) return JSON.parse(cached) as StateUser;

  // Collect from db
  const { twitterPfpUrl: image, twitterUsername: username } =
    await db.user.findUniqueOrThrow({
      where: {
        address: lowerAddress,
      },
      select: {
        twitterPfpUrl: true,
        twitterUsername: true,
      },
    });

  // Setup user
  const user: StateUser = {
    address: lowerAddress,
    image,
    username,
  };

  // Store in cache
  const ok = await cache.set(
    `state_user_${lowerAddress}`,
    JSON.stringify(user)
  );
  if (ok !== "OK") throw new Error("Error updating cache");

  // Return data
  return user;
}

export default async function (req: NextApiRequest, res: NextApiResponse) {
  // Collect address from body
  const { address }: { address: string } = req.body;
  // Throw if missing parameter
  if (!address) return res.status(400).json({ error: "Missing address" });

  try {
    // Check for user
    const user = await getStateUser(address);
    return res.status(200).json(user);
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}
