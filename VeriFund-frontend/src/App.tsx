import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./contexts/WalletContext";
import { PublicPage } from "./pages/PublicPage";
import { AdminPage } from "./pages/AdminPage";

const App: React.FC = () => {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  );
};

export default App;
