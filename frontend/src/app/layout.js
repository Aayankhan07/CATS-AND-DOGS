import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "Pet Classifier | Cat, Dog, or Neither?",
  description: "A Text CNN Classifier built with PyTorch and Next.js that predicts whether a phrase is about a cat, a dog, or neither.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
