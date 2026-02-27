
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Opportunities from './pages/Opportunities';
import Strategies from './pages/Strategies';
import Analytics from './pages/Analytics';
import Terminal from './pages/Terminal';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/strategies" element={<Strategies />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/terminal" element={<Terminal />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
