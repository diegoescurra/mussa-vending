import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';


const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.send('Hello World!');
});

app.use('/api', routes);

app.use(errorMiddleware);
export default app;
