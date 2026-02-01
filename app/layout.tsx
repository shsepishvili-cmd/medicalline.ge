import "./globals.css";

export const metadata = {
  title: "Medical Line Georgia",
  description: "Eighteeth-ის ოფიციალური დისტრიბუტორი",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ka">
      <body>
        {/* აქ არაფერი ჩაწერო (არც Navbar, არც Footer), 
            რადგან ყველაფერი უკვე გვიწერია page.js-ში */}
        {children}
      </body>
    </html>
  );
}