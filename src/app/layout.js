import './globals.css'

export const metadata = {
  title: 'Lovebox Bill Cloud',
  description: 'Hệ thống quản lý khách sạn đa chi nhánh',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="bg-[#EAF7EA] min-h-screen text-gray-800 antialiased">
        {children}
      </body>
    </html>
  )
}