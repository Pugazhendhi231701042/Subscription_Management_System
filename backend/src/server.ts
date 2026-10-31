import { app } from './app.js';
import { initDatabase } from './db.js';

const PORT = process.env.PORT || 5000;

// Initialize native SQLite schema and data
initDatabase();

app.listen(PORT, () => {
  console.log(`🚀 Brightloop Native SQLite Backend is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`💾 Local Database: subscription.db (Zero BAAS, Pure SQLite relational tables)`);
});
