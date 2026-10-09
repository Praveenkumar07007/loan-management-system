import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});


app.listen(process.env.PORT || 3000, (error) => {
  if (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
  console.log(`Server is listening on port ${process.env.PORT || 3000}`);
});