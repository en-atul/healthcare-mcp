import mongoose, { ConnectionStates } from 'mongoose';
import { ChromaClient } from 'chromadb';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin';
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = process.env.CHROMA_PORT || '8001';
// const CHROMA_COLLECTION_NAME =
//   process.env.CHROMA_COLLECTION_NAME || 'healthcare_conversations';

interface ClearOptions {
  mongo: boolean;
  chroma: boolean;
  confirm: boolean;
}

async function clearMongoDB() {
  try {
    console.log('🗄️  Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections in MongoDB`);

    if (collections.length === 0) {
      console.log('ℹ️  No collections found in MongoDB');
      return;
    }

    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await db.collection(collectionName).countDocuments();

      if (count > 0) {
        console.log(
          `🗑️  Clearing collection: ${collectionName} (${count} documents)`,
        );
        await db.collection(collectionName).deleteMany({});
        console.log(`✅ Cleared ${collectionName}`);
      } else {
        console.log(`ℹ️  Collection ${collectionName} is already empty`);
      }
    }

    console.log('✅ MongoDB cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error clearing MongoDB:', error);
    throw error;
  } finally {
    try {
      if (
        mongoose.connection &&
        mongoose.connection.readyState === ConnectionStates.connected
      ) {
        await mongoose.disconnect();
        console.log('🔌 MongoDB connection closed');
      }
    } catch (disconnectError) {
      console.log(
        '⚠️  Error during disconnect:',
        disconnectError instanceof Error
          ? disconnectError.message
          : 'Unknown error',
      );
    }
  }
}

async function clearChromaDB() {
  try {
    console.log('🧠 Connecting to ChromaDB...');
    const chromaClient = new ChromaClient({
      host: CHROMA_HOST,
      port: parseInt(CHROMA_PORT),
    });

    await chromaClient.heartbeat();
    console.log('✅ Connected to ChromaDB successfully!');

    const collections = await chromaClient.listCollections();
    console.log(`📋 Found ${collections.length} collections in ChromaDB`);

    if (collections.length === 0) {
      console.log('ℹ️  No collections found in ChromaDB');
      return;
    }

    for (const collection of collections) {
      const collectionName = collection.name;
      const count = await collection.count();

      if (count > 0) {
        console.log(
          `🗑️  Clearing collection: ${collectionName} (${count} documents)`,
        );
        try {
          await chromaClient.deleteCollection({ name: collectionName });
          console.log(`✅ Deleted collection: ${collectionName}`);
        } catch (deleteError) {
          console.log(
            `⚠️  Could not delete collection ${collectionName}: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`,
          );
        }
      } else {
        console.log(`ℹ️  Collection ${collectionName} is already empty`);
      }
    }

    console.log('✅ ChromaDB cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error clearing ChromaDB:', error);
    throw error;
  }
}

async function clearDatabases(options: ClearOptions) {
  console.log('🚀 Starting database cleanup...');
  console.log('='.repeat(50));

  const startTime = Date.now();
  let successCount = 0;
  const errorCount = 0;

  try {
    if (options.mongo) {
      console.log('\n📊 MongoDB Cleanup');
      console.log('-'.repeat(20));
      await clearMongoDB();
      successCount++;
    }

    if (options.chroma) {
      console.log('\n🧠 ChromaDB Cleanup');
      console.log('-'.repeat(20));
      await clearChromaDB();
      successCount++;
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database cleanup completed!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n💡 Next steps:');
      console.log('   • Run "pnpm run seed:therapists" to seed therapist data');
      console.log('   • Run "pnpm run seed:patients" to seed patient data');
      console.log('   • Start your application with "pnpm run start:dev"');
    }
  } catch (error) {
    console.error('\n💥 Database cleanup failed:', error);
    process.exit(1);
  }
}

function parseArguments(): ClearOptions {
  const args = process.argv.slice(2);

  const options: ClearOptions = {
    mongo: true,
    chroma: true,
    confirm: false,
  };

  for (const arg of args) {
    switch (arg) {
      case '--mongo-only':
        options.mongo = true;
        options.chroma = false;
        break;
      case '--chroma-only':
        options.mongo = false;
        options.chroma = true;
        break;
      case '--confirm':
        options.confirm = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🗄️  Database Cleanup Script

Usage: pnpm run clear:databases [options]

Options:
  --mongo-only     Clear only MongoDB
  --chroma-only    Clear only ChromaDB
  --confirm        Skip confirmation prompt
  --help, -h       Show this help message

Examples:
  pnpm run clear:databases                    # Clear both databases
  pnpm run clear:databases --mongo-only       # Clear only MongoDB
  pnpm run clear:databases --chroma-only      # Clear only ChromaDB
  pnpm run clear:databases --confirm          # Skip confirmation

Environment Variables:
  MONGODB_URI              MongoDB connection string
  CHROMA_HOST              ChromaDB host (default: localhost)
  CHROMA_PORT              ChromaDB port (default: 8001)
  CHROMA_COLLECTION_NAME   ChromaDB collection name
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

async function main() {
  const options = parseArguments();

  console.log('🎯 Database Cleanup Plan:');
  if (options.mongo) {
    console.log('   • MongoDB: All collections will be cleared');
  }
  if (options.chroma) {
    console.log('   • ChromaDB: All collections will be cleared');
  }

  if (!options.confirm) {
    console.log('\n⚠️  WARNING: This will permanently delete all data!');
    console.log('   Make sure you have backups if needed.');

    console.log('\n💡 To skip this confirmation, use --confirm flag');
    console.log('   Continuing in 3 seconds...');

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  await clearDatabases(options);
}

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { clearMongoDB, clearChromaDB, clearDatabases };
