const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');
dotenv.config();

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(`mongodb+srv://${process.env.ATLAS_DB_USER}:${process.env.ATLAS_DB_PASSWORD}@${process.env.ATLAS_HOST}/${process.env.ATLAST_DATABASE}?retryWrites=true&w=majority`);

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
  console.log('Connected to db')
  app.listen(process.env.PORT || 3030, () => {
    console.log('Listening on port 3030');
  });
}