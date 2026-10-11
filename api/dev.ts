import app from './index.js';

const port = Number(process.env.API_PORT || 3001);

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
