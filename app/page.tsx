import {
  Sprout,
  ShieldCheck,
  CalendarDays,
  ScanLine,
  Leaf,
  HeartHandshake,
} from "lucide-react";
export default function Home() {
  return (
    <>
      <header className="public-nav">
        <a href="/" className="brand">
          <Sprout /> M FARM<span>TRANG TRẠI CỦA CHÚNG TA</span>
        </a>
        <nav>
          <a href="#cau-chuyen">Câu chuyện M Farm</a>
          <a href="/nhan-nuoi">Nuôi con gì · Trồng cây gì</a>
          <a href="#cach-thuc">Cách tham gia</a>
        </nav>
        <a className="button small outline" href="/dang-nhap">
          Đăng nhập
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="hero-photo" />
          <div className="hero-content">
            <div className="eyebrow light">TỪ TRANG TRẠI, ĐẾN GIA ĐÌNH BẠN</div>
            <h1>
              Một mầm xanh.
              <br />
              Một sự gắn bó.
            </h1>
            <p>
              Chọn một cây, nhận nuôi một con.
              <br />
              Cùng chúng tôi chăm chút từng ngày lớn lên,
              <br />
              để biết rõ điều lành mình mang về nhà.
            </p>
            <div className="hero-actions">
              <a href="/nhan-nuoi" className="button lime">
                Khám phá trang trại
              </a>
              <a href="#cach-thuc" className="text-link">
                M FARM hoạt động thế nào?
              </a>
            </div>
          </div>
          <div className="hero-note">
            <Sprout size={27} />
            <div>
              <strong>Gieo hôm nay. Gắn bó mỗi ngày.</strong>
              <span>Nhật ký chăm sóc theo từng mã QR</span>
            </div>
          </div>
          <span className="photo-credit">
            Ảnh đồi chè minh họa · Karthika Manikandan / CC0
          </span>
        </section>
        <section className="trust-strip">
          <span>
            <ScanLine /> Mỗi cây, mỗi con một mã riêng
          </span>
          <span>
            <Leaf /> Theo dõi cả hành trình sinh trưởng
          </span>
          <span>
            <HeartHandshake /> Rõ gói chăm sóc, rõ thời gian
          </span>
        </section>
        <section className="section intro" id="cau-chuyen">
          <div>
            <div className="eyebrow">CÂU CHUYỆN M FARM</div>
            <h2>
              Không chỉ biết nguồn gốc.
              <br />
              Bạn là một phần của hành trình.
            </h2>
          </div>
          <p>
            M FARM kết nối gia đình với trang trại qua từng cây trồng, từng vật
            nuôi cụ thể. Người chăm sóc ghi lại quá trình sinh trưởng; bạn theo
            dõi từ xa và đón thành quả khi đến mùa.
          </p>
        </section>
        <section className="section offerings">
          <div className="section-heading">
            <div>
              <div className="eyebrow">BẮT ĐẦU TỪ ĐIỀU BẠN THÍCH</div>
              <h2>Nuôi con gì? Trồng cây gì?</h2>
            </div>
            <span className="badge">Đợt đầu · Danh mục minh họa</span>
          </div>
          <div className="offer-grid">
            <a href="/nhan-nuoi?loai=animal" className="offer-card animal">
              <div className="offer-top">
                <span>01 / VẬT NUÔI</span>
                <HeartHandshake />
              </div>
              <h3>
                Một đàn gà nhỏ.
                <br />
                Một niềm vui lớn.
              </h3>
              <p>
                Gà ta thả vườn · Theo dõi theo tuần
                <br />
                Nhận nuôi theo vòng đời
              </p>
              <span className="button dark">Xem gói nuôi gà</span>
            </a>
            <a href="/nhan-nuoi?loai=plant" className="offer-card plant">
              <div className="offer-top">
                <span>02 / CÂY TRỒNG</span>
                <Sprout />
              </div>
              <h3>
                Chăm một cây.
                <br />
                Chờ một mùa trái.
              </h3>
              <p>
                Cây ổi · Nhật ký theo mùa vụ
                <br />
                Gắn bó từ ra hoa đến thu hoạch
              </p>
              <span className="button dark">Xem gói trồng cây</span>
            </a>
          </div>
        </section>
        <section className="section how" id="cach-thuc">
          <div className="eyebrow">MỘT HÀNH TRÌNH RÕ RÀNG</div>
          <h2>
            Ở xa trang trại.
            <br />
            Vẫn gần từng ngày.
          </h2>
          <div className="steps">
            {[
              [
                "01",
                "Chọn điều muốn chăm",
                "Tìm cây hoặc vật nuôi và gói chăm sóc phù hợp với gia đình.",
              ],
              [
                "02",
                "Xác thực & đăng ký",
                "Xác thực email, số điện thoại và kiểm tra điều kiện trước khi đặt mua.",
              ],
              [
                "03",
                "Theo dõi lớn lên",
                "Mở hồ sơ riêng để xem nhật ký, hình ảnh và những mốc sinh trưởng.",
              ],
              [
                "04",
                "Đón thành quả",
                "Nhận sản phẩm hoặc đề nghị trại mua lại theo hợp đồng.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="section closing">
          <ShieldCheck />
          <h2>
            Chăm sóc có nhật ký.
            <br />
            Đồng hành có cam kết.
          </h2>
          <p>
            Giá, thời hạn và điều kiện được ghi theo từng đơn hàng.
            <br />
            Mô hình nhận nuôi không phải sản phẩm tiết kiệm hay cam kết lợi
            nhuận.
          </p>
          <a href="/nhan-nuoi" className="button lime">
            Chọn hành trình của bạn
          </a>
        </section>
      </main>
      <footer>
        <a href="/" className="brand">
          <Sprout /> M FARM
        </a>
        <span>Gắn bó từ ngày gieo mầm.</span>
        <a href="/demo">Trải nghiệm bản mẫu</a>
        <a href="/quan-tri">Dành cho chủ trang trại</a>
      </footer>
    </>
  );
}
