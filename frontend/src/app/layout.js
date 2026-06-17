import "./globals.css";

export const metadata = {
  title:       "PayHub — Compliant Payment Rail for AI Agents",
  description: "PayHub gives every agent a verifiable identity, programmable spending limits, and built-in regulatory compliance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
