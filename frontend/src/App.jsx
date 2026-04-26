import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BarcodeGenerator from './components/BarcodeGenerator';
import BarcodeScanner from './components/BarcodeScanner';

function App() {
  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BarcodeGenerator />} />
          <Route path="/scan" element={<BarcodeScanner />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;