import {
  actor,
  body,
  checkOrigin,
  json,
  mutate,
  safe,
  snapshot,
} from "@/lib/server";
export const dynamic = "force-dynamic";
export const GET = (req: Request) =>
  safe(async () => json(await snapshot(await actor(req))));
export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    const a = await actor(req);
    const result = await mutate(a, await body(req));
    return json({ id: result });
  });
