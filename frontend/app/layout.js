import { title } from "@/app/info";
export const metadata = {
  title: title,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="/logo.svg"
          type="image/<generated>"
          sizes="<generated>"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      
      <body style={{ margin: 0, overflow: 'hidden' }}>{children}</body>
    </html>
  );
}