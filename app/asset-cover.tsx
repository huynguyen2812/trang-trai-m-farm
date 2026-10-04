"use client";

import { useState } from "react";
import { Bird, Sprout } from "lucide-react";
import type { Asset, LogImage } from "@/lib/model";

/** Images remain behind the existing owner/customer authorization endpoint. */
export function AssetCover({
  asset,
  images,
  compact = false,
}: {
  asset: Asset;
  images: LogImage[];
  compact?: boolean;
}) {
  const photo = images
    .filter((image) => image.asset_id === asset.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <div className={`asset-cover ${asset.kind}${compact ? " compact" : ""}`}>
      {photo && failed !== photo.id ? (
        <img
          src={`/api/log-images/${encodeURIComponent(photo.id)}`}
          alt={`Ảnh cập nhật ${asset.name}`}
          loading="lazy"
          onError={() => setFailed(photo.id)}
        />
      ) : (
        <>
          <span className="asset-cover-icon">
            {asset.kind === "plant" ? <Sprout /> : <Bird />}
          </span>
          {!compact && <span>Chưa có ảnh hồ sơ</span>}
        </>
      )}
    </div>
  );
}
