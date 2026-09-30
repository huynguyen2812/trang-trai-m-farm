import { actor, first, json, rows, safe } from "@/lib/server";
import { samplePackages } from "@/lib/model";
export const dynamic = "force-dynamic";
export const GET = (req: Request) =>
  safe(async () => {
    let tenant = "production";
    let demo = false;
    try {
      const a = await actor(req);
      tenant = a.tenant;
      demo = a.demo;
    } catch {}
    const packages = await rows(
      "SELECT * FROM packages WHERE tenant=? AND active=1 ORDER BY kind,name",
      tenant,
    );
    const assets = await rows(
      "SELECT id,name,species,kind,weight,health,location FROM assets WHERE tenant=? AND status=?",
      tenant,
      "available",
    );
    return json({
      packages: packages.length ? packages : samplePackages,
      assets,
      demo: demo || !packages.length,
      illustrative: !packages.length,
    });
  });
