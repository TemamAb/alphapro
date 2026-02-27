const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8081;

// Simple withdrawal endpoint
app.post('/withdraw', (req, res) => {
  const { mode, amount, address, threshold } = req.body;
  if (mode === 'manual') {
    // Mock manual withdrawal
    console.log(`Manual withdrawal: ${amount} to ${address}`);
    res.json({ success: true, txHash: `0x${Math.random().toString(16).substr(2, 64)}` });
  } else if (mode === 'auto') {
    // Mock auto withdrawal setup
    console.log(`Auto withdrawal setup: threshold ${threshold} to ${address}`);
    res.json({ success: true, message: 'Auto withdrawal enabled' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid mode' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Withdrawal Service listening on port ${PORT}`);
});
