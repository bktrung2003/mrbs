/** In-app release notes — keep in sync with CHANGELOG.md and VERSION. */
export const APP_VERSION = "1.0.0"

export type ReleaseNote = {
  version: string
  date: string
  items: string[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.0",
    date: "16/06/2026",
    items: [
      "Lịch phòng công khai — xem lịch đã duyệt không cần đăng nhập; bấm đặt phòng sẽ chuyển sang trang đăng nhập",
      "Đặt phòng & sự kiện — tạo booking nội bộ / khách, lặp lịch, kéo thả trên lịch ngày (desktop)",
      "Duyệt booking — Admin/HR duyệt hoặc từ chối qua trang Admin",
      "Sự kiện & đăng ký — link public cho khách đăng ký, check-in, khảo sát sau sự kiện",
      "Mobile — lịch theo từng phòng, menu dưới màn hình (Schedule, Bookings, Events, Account)",
      "Báo cáo & import — xuất báo cáo booking, import từ Excel",
      "Thương hiệu — IT Admin đổi logo và màu header",
      "PWA — cài app trên điện thoại từ trình duyệt",
    ],
  },
]
