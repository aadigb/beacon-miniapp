import NeynarProvider from "../components/NeynarProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NeynarProvider>
          {children}
        </NeynarProvider>
      </body>
    </html>
  );
}
