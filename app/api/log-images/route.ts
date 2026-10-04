import {
  actor,
  admin,
  ApiError,
  checkOrigin,
  db,
  first,
  json,
  journalAssetUpdates,
  journalHealthNote,
  media,
  newId,
  now,
  safe,
  statement,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const kinds = new Set([
  "growth",
  "food",
  "medicine",
  "fertilizer",
  "care",
  "health",
  "flowering",
  "fruiting",
]);

function value(form: FormData, key: string, max: number, required = true) {
  const result = String(form.get(key) || "").trim();
  if ((required && !result) || result.length > max)
    throw new ApiError(400, "Vui lòng kiểm tra lại thông tin cập nhật.");
  return result;
}

export const POST = (req: Request) =>
  safe(async () => {
    checkOrigin(req);
    const a = await actor(req);
    admin(a);
    const form = await req.formData();
    const assetId = value(form, "asset_id", 200);
    const kind = value(form, "kind", 40);
    if (!kinds.has(kind))
      throw new ApiError(400, "Loại cập nhật không hợp lệ.");
    const title = value(form, "title", 200);
    const note = value(form, "body", 5000);
    const metric = value(form, "metric", 100, false);
    const health = value(form, "health", 30, false);
    const assetUpdates = journalAssetUpdates(
      a.tenant,
      assetId,
      kind,
      metric,
      health,
    );
    const files = form
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length > 6) throw new ApiError(400, "Mỗi cập nhật tối đa 6 ảnh.");
    let total = 0;
    for (const file of files) {
      total += file.size;
      if (!allowedTypes.has(file.type))
        throw new ApiError(400, "Ảnh phải có định dạng JPG, PNG hoặc WebP.");
      if (file.size > 8 * 1024 * 1024)
        throw new ApiError(400, "Mỗi ảnh phải nhỏ hơn 8 MB.");
    }
    if (total > 30 * 1024 * 1024)
      throw new ApiError(400, "Tổng dung lượng ảnh phải nhỏ hơn 30 MB.");
    const asset = await first<{ id: string }>(
      "SELECT id FROM assets WHERE tenant=? AND id=?",
      a.tenant,
      assetId,
    );
    if (!asset) throw new ApiError(404, "Không tìm thấy cây hoặc vật nuôi.");

    const logId = newId("NK");
    const createdAt = now();
    const uploaded: string[] = [];
    const imageRows: {
      id: string;
      key: string;
      type: string;
      name: string;
      size: number;
    }[] = [];
    try {
      for (const file of files) {
        const imageId = newId("ANH");
        const extension =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";
        const key = `${a.tenant}/${assetId}/${logId}/${imageId}.${extension}`;
        await media().put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
          customMetadata: { tenant: a.tenant, assetId, logId },
        });
        uploaded.push(key);
        imageRows.push({
          id: imageId,
          key,
          type: file.type,
          name: file.name.slice(0, 180),
          size: file.size,
        });
      }
      await db().batch([
        ...assetUpdates,
        statement(
          "INSERT INTO logs (tenant,id,asset_id,title,body,kind,metric,image_url,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
          a.tenant,
          logId,
          assetId,
          title,
          journalHealthNote(note, health),
          kind,
          metric,
          "",
          createdAt,
        ),
        ...imageRows.map((image) =>
          statement(
            "INSERT INTO log_images (tenant,id,log_id,asset_id,object_key,content_type,file_name,byte_size,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            a.tenant,
            image.id,
            logId,
            assetId,
            image.key,
            image.type,
            image.name,
            image.size,
            createdAt,
          ),
        ),
      ]);
    } catch (error) {
      await Promise.allSettled(uploaded.map((key) => media().delete(key)));
      throw error;
    }
    return json({ id: logId, imageCount: imageRows.length }, 201);
  });
