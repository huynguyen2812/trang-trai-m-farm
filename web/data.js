/* Dữ liệu mẫu — giá là số minh họa, chưa phải giá trại. */
window.MFARM = {
  farm: {
    name: "Trang trại M Farm",
    tagline: "Nhận một con. Nhận một cây. Không mua một kg.",
    phone: "0900 000 000",
    zalo: "0900000000",
  },
  accounts: {
    "0901111111": { name: "Chị Mai", kind: "nhà", pin: "111111", google: "mai.nguyen@gmail.com", codes: ["GA-0142"] },
    "0902222222": { name: "Anh Khoa", kind: "quán", pin: "222222", google: "khoa.bep@gmail.com", codes: ["XO-017", "XO-018"] },
    "0903333333": { name: "Cô Hạnh", kind: "biếu", pin: "333333", google: null, codes: ["GA-0008"] },
    "0900000000": { name: "Sổ trại", kind: "trại", pin: "000000", google: null, codes: ["*"] }
  },
  googleMap: {
    "mai.nguyen@gmail.com": "0901111111",
    "khoa.bep@gmail.com": "0902222222"
  },
  units: {
    "GA-0142": { code: "GA-0142", type: "ga", label: "Gà ta", name: "Gà ta thả vườn", status: "den_han", statusLabel: "Đến hạn xuất", ownerPhone: "0901111111", born: "2026-07-20", start: "2026-07-22", due: "2026-09-30", weight: "1,4 kg", place: "Chuồng vườn A, ô 12", feed: "Ngô + cám trại, thả vườn", medicine: "Không kháng sinh", adoptPrice: 420000, marketPrice: 180000, marketUnit: "đ/kg hơi", buybackRate: 0.9, estWeightKg: 1.4, photo: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=1200&q=80" },
    "GA-0008": { code: "GA-0008", type: "ga", label: "Gà ta", name: "Gà ta biếu họ", status: "dang_nuoi", statusLabel: "Đang nuôi", ownerPhone: "0903333333", born: "2026-08-28", start: "2026-09-01", due: "2026-11-10", weight: "0,6 kg", place: "Chuồng vườn A, ô 3", feed: "Ngô + cám trại, thả vườn", medicine: "Chưa dùng thuốc", adoptPrice: 380000, marketPrice: 180000, marketUnit: "đ/kg hơi", buybackRate: 0.9, estWeightKg: 0.6, photo: "https://images.unsplash.com/photo-1563281577-a7be47e20f07?auto=format&fit=crop&w=1200&q=80" },
    "GA-0031": { code: "GA-0031", type: "ga", label: "Gà ta", name: "Gà ta thả vườn", status: "chua_ban", statusLabel: "Còn suất", ownerPhone: null, born: "2026-09-18", start: null, due: "2026-12-01", weight: "0,35 kg", place: "Chuồng vườn B, ô 7", feed: "Ngô + cám trại", medicine: "Chưa dùng thuốc", adoptPrice: 390000, marketPrice: 180000, marketUnit: "đ/kg hơi", buybackRate: 0.9, estWeightKg: 0.35, photo: "https://images.unsplash.com/photo-1612170153139-6f881ff06760?auto=format&fit=crop&w=1200&q=80" },
    "XO-017": { code: "XO-017", type: "cay", label: "Xoài cát", name: "Xoài cát Hòa Lộc, một vụ", status: "den_han", statusLabel: "Sắp hái", ownerPhone: "0902222222", born: "2022-04-01", start: "2026-03-01", due: "2026-10-05", weight: "Ước 28 kg trái", place: "Lô xoài 2, cây số 17", feed: "Phân hữu cơ, tưới nhỏ giọt", medicine: "Không xịt trong 21 ngày gần hái", adoptPrice: 2500000, marketPrice: 35000, marketUnit: "đ/kg tại vườn", buybackRate: 0.85, estWeightKg: 28, photo: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80" },
    "XO-018": { code: "XO-018", type: "cay", label: "Xoài cát", name: "Xoài cát Hòa Lộc, một vụ", status: "dang_nuoi", statusLabel: "Nuôi trái", ownerPhone: "0902222222", born: "2022-04-01", start: "2026-03-01", due: "2026-10-20", weight: "Ước 18 kg trái", place: "Lô xoài 2, cây số 18", feed: "Phân hữu cơ", medicine: "Trị rầy tuần 12, đã ghi sổ", adoptPrice: 2500000, marketPrice: 35000, marketUnit: "đ/kg tại vườn", buybackRate: 0.85, estWeightKg: 18, photo: "https://images.unsplash.com/photo-1591073113121-f79068d1d0aa?auto=format&fit=crop&w=1200&q=80" },
    "XO-021": { code: "XO-021", type: "cay", label: "Xoài cát", name: "Xoài cát Hòa Lộc, một vụ", status: "chua_ban", statusLabel: "Còn suất", ownerPhone: null, born: "2023-05-01", start: null, due: "2026-11-15", weight: "Chưa vào vụ hái", place: "Lô xoài 3, cây số 21", feed: "Phân hữu cơ", medicine: "Chưa dùng thuốc vụ này", adoptPrice: 2300000, marketPrice: 35000, marketUnit: "đ/kg tại vườn", buybackRate: 0.85, estWeightKg: 0, photo: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1200&q=80" }
  },
  logs: {
    "GA-0142": [
      { week: "Tuần 10", date: "2026-09-28", text: "1,4 kg. Thả vườn. Không kháng sinh. Sắp xuất.", medicine: false },
      { week: "Tuần 8", date: "2026-09-14", text: "1,1 kg. Thả vườn. Không kháng sinh.", medicine: false },
      { week: "Tuần 6", date: "2026-08-31", text: "0,85 kg. Đổi sang chuồng A ô 12.", medicine: false },
      { week: "Tuần 4", date: "2026-08-17", text: "0,6 kg. Ăn ngô + cám. Khỏe.", medicine: false },
      { week: "Tuần 1", date: "2026-07-22", text: "Gắn vòng GA-0142. Ảnh lúc nhận nuôi.", medicine: false }
    ],
    "GA-0008": [
      { week: "Tuần 4", date: "2026-09-29", text: "0,6 kg. Thả vườn buổi sáng. Chưa thuốc.", medicine: false },
      { week: "Tuần 3", date: "2026-09-22", text: "0,52 kg. Ăn tốt.", medicine: false },
      { week: "Tuần 2", date: "2026-09-15", text: "0,44 kg. Nhốt đêm, thả ngày.", medicine: false },
      { week: "Tuần 1", date: "2026-09-01", text: "Gắn vòng GA-0008. Nhận nuôi cho cô Hạnh biếu họ.", medicine: false }
    ],
    "XO-017": [
      { week: "Gần hái", date: "2026-09-27", text: "Trái già. Không xịt. Ước 28 kg.", medicine: false },
      { week: "Nuôi trái", date: "2026-09-10", text: "Tỉa trái non. Tưới 2 lần.", medicine: false },
      { week: "Đậu trái", date: "2026-08-02", text: "Đậu đều. Không sâu đục.", medicine: false },
      { week: "Ra hoa", date: "2026-06-18", text: "Hoa rộ. Ghi sổ.", medicine: false }
    ],
    "XO-018": [
      { week: "Nuôi trái", date: "2026-09-26", text: "Trái đang lớn. Ước 18 kg.", medicine: false },
      { week: "Tuần 12", date: "2026-08-20", text: "Trị rầy. Ghi thuốc. Ngưng trước hạn hái.", medicine: true },
      { week: "Đậu trái", date: "2026-08-01", text: "Đậu thưa hơn cây 17.", medicine: false }
    ]
  }
};
