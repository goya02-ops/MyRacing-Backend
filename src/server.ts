import { app } from './app.js';
import { syncSchema } from './shared/orm.js';

await syncSchema(); //never in production

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
