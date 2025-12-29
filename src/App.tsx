import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/UserPortal";
import AdminPortal from "./pages/AdminPortal";


function App() {
const bg = {
    backgroundColor: "#f7ece6"
  };
  return(
    <div style={bg} className=' min-h-screen'>
      <Router>
        <main className=''>
          <Routes>
            <Route path="/" element={<Home/>} />
            <Route path="/admin" element={<AdminPortal/>} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App
