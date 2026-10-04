import type { Metadata } from "next";
import "./globals.css";
import "./stitch.css";
import { Toaster } from "@/components/ui/sonner";
export const metadata: Metadata = {
  title: "M FARM — Gắn bó từ ngày gieo mầm",
  description:
    "Chọn một cây, nhận nuôi một con. Cùng M FARM theo dõi từng ngày lớn lên.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
