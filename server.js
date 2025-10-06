import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Location endpoint
app.post('/api/location', (req, res) => {
  const { lat, lng, title } = req.body;
  
  console.log('🗺️ LOCATION SELECTED:');
  console.log(`📍 Coordinates: ${lat}, ${lng}`);
  console.log(`🏷️  Title: ${title}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log('------------------------');
  
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('🚀 Server running on port 3001');
  console.log('Ready to receive location data...');
});