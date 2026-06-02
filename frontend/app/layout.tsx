import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { UserProvider } from "@/components/providers/user-provider"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Avfallsregistrering",
  description: "Registrer avfall for Miljøfyrtårn-sertifisering",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="nb"
      className={cn("h-full antialiased", geistSans.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        <UserProvider>
          {children}
          <Toaster position="top-center" />
        </UserProvider>
      </body>
    </html>
  )
}
