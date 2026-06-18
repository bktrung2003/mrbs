/** In-app release notes — keep in sync with CHANGELOG.md and VERSION. */
export const APP_VERSION = "1.0.2"

export type ReleaseNote = {
  version: string
  date: string
  items: string[]
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.0.2",
    date: "16/06/2026",
    items: [
      "Lịch mobile (khách) — giao diện mobile đúng như app: danh sách phòng, timeline, sự kiện; bấm đặt phòng → đăng nhập",
    ],
  },
  {
    version: "1.0.1",
    date: "16/06/2026",
    items: [
      "Lịch mobile (khách) — xem schedule public giống desktop; đặt phòng cần đăng nhập",
      "Sự kiện — chỉ học viên đã check-in mới làm khảo sát sau sự kiện",
      "Sự kiện — check-in và đăng ký không trùng email hoặc số điện thoại",
    ],
  },
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
