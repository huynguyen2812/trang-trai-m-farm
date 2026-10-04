"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

type Detector = {
  detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};
type DetectorConstructor = {
  new (options: { formats: string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

export function assetCodeFromScan(raw: string) {
  const value = raw.trim();
  try {
    return new URL(value).searchParams.get("asset")?.trim() || value;
  } catch {
    return value;
  }
}

export function QrScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      stream?.getTracks().forEach((track) => track.stop());
    }
    async function open() {
      try {
        const BarcodeDetector = (
          window as unknown as { BarcodeDetector?: DetectorConstructor }
        ).BarcodeDetector;
        if (!window.isSecureContext)
          throw new Error(
            "Quét camera cần HTTPS hoặc localhost. Bạn vẫn có thể nhập mã vào ô tìm kiếm.",
          );
        if (
          !BarcodeDetector ||
          !(await BarcodeDetector.getSupportedFormats()).includes("qr_code")
        )
          throw new Error(
            "Trình duyệt này chưa hỗ trợ quét QR trực tiếp. Hãy dùng camera điện thoại mở mã QR hoặc nhập mã vào ô tìm kiếm.",
          );
        if (disposed) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (disposed) {
          stop();
          return;
        }
        if (!video.current) {
          stop();
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        async function scan() {
          if (disposed || !video.current) return;
          try {
            const results = await detector.detect(video.current);
            if (disposed) return;
            if (results[0]?.rawValue) {
              stop();
              setActive(false);
              onDetected(assetCodeFromScan(results[0].rawValue));
              return;
            }
            timer = setTimeout(scan, 250);
          } catch {
            stop();
            if (!disposed) {
              setError("Không đọc được camera. Đóng rồi thử lại hoặc nhập mã.");
              setActive(false);
            }
          }
        }
        if (!disposed) await scan();
      } catch (cause) {
        stop();
        if (!disposed) {
          const message =
            cause instanceof Error ? cause.message : "Không mở được camera.";
          setError(
            cause instanceof DOMException && cause.name === "NotAllowedError"
              ? "Camera chưa được cấp quyền. Bạn có thể cấp quyền trong trình duyệt hoặc nhập mã."
              : message,
          );
          setActive(false);
        }
      }
    }
    void open();
    return () => {
      disposed = true;
      clearTimeout(timer);
      stop();
    };
  }, [active, onDetected]);

  return (
    <div className="qr-scanner">
      <button
        type="button"
        className="button outline"
        onClick={() => {
          setError("");
          setActive(!active);
        }}
      >
        {active ? <X size={18} /> : <Camera size={18} />}{" "}
        {active ? "Đóng camera" : "Quét mã QR"}
      </button>
      {active && (
        <>
          <video ref={video} muted playsInline aria-label="Camera quét mã QR" />
          <p>
            Đưa mã QR vào khung hình. Chỉ tìm hồ sơ trong tài khoản của bạn.
          </p>
        </>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
