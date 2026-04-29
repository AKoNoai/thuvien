const mongoose = require('mongoose');

/**
 * Serverless-friendly MongoDB connection helper using a global cache.
 * Call with the `MONGODB_URI` and it will reuse the existing connection
 * if present (avoids creating new connections per lambda invocation).
 */
async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not provided');
  }

  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  // Use mongoose connect and cache the promise on global to reuse across invocations
  global._mongoClientPromise = mongoose.connect(uri, {
    // useNewUrlParser and useUnifiedTopology are defaults on modern mongoose
  });

  return global._mongoClientPromise;
}

module.exports = connectDB;
