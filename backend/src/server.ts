import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Brightloop Subscription Backend is running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
