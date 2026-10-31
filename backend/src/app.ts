import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Brightloop Subscription Engine', timestamp: new Date().toISOString() });
});

// Main API routes
app.use('/api', apiRouter);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: 'An unexpected internal server error occurred.' });
});
