import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./login.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      {children}
    </div>
  );
}
