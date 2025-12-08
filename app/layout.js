import './globals.css'

export const metadata = {
  title: 'Focus To-Do',
  description: 'Your focus task manager',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
