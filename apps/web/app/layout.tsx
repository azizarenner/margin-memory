import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Margin Memory", description:"A quiet place for the words you meet."};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
