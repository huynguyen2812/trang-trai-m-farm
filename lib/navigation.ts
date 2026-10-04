/** Only carry an asset ID through login; never redirect to a supplied URL. */
export function destinationAfterLogin(
  owner: boolean,
  mobile: boolean,
  search: string,
) {
  const asset = new URLSearchParams(search).get("asset")?.trim();
  const base = owner ? (mobile ? "/cap-nhat" : "/quan-tri") : "/tai-san";
  return asset && asset.length <= 200
    ? `${base}?asset=${encodeURIComponent(asset)}`
    : base;
}
