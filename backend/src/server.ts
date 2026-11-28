import { app } from './app.js';
import { host, port } from './config/env.js';

app.listen(port, host, () => {
  console.log(`English Center API listening on http://${host}:${port}`);
});
