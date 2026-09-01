/**
 * Health Check Routes
 */

import { Router, type Router as RouterType } from 'express';

export const healthRouter: RouterType = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/ready', (req, res) => {
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});
