import express from 'express';
const router = express.Router();

router.get('/test-env', (req, res) => {
  res.json({
    JWT_SECRET: process.env.JWT_SECRET ? 'Definido' : 'NO DEFINIDO',
    JWT_SECRET_length: process.env.JWT_SECRET?.length || 0,
    DB_NAME: process.env.DB_NAME,
    NODE_ENV: process.env.NODE_ENV
  });
});

export default router;
