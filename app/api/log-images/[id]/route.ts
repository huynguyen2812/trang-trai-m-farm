import { actor, ApiError, first, json, media, safe } from "@/lib/server";

export const dynamic = "force-dynamic";

export const GET = (req: Request, context: { params: Promise<{ id: string }> }) =>
  safe(async () => {
    const a = await actor(req);
    const { id } = await context.params;
    const image = await first<{
      object_key: string;
      content_type: string;
      customer_id: string | null;
    }>(
      `SELECT i.object_key,i.content_type,a.customer_id
       FROM log_images i
       JOIN assets a ON a.tenant=i.tenant AND a.id=i.asset_id
       WHERE i.tenant=? AND i.id=?`,
      a.tenant,
      id,
    );
    if (!image || (a.role !== "admin" && image.customer_id !== a.id))
      throw new ApiError(404, "Không tìm thấy ảnh.");
    const object = await media().get(image.object_key);
    if (!object) throw new ApiError(404, "Không tìm thấy ảnh.");
    return new Response(object.body, {
      headers: {
        "Content-Type": image.content_type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
