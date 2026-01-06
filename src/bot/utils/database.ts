import mongoose from 'mongoose';
import { logger } from './logger';

let isConnected = false;

export const connectDatabase = async (uri: string): Promise<void> => {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    logger.info('Database connected successfully');

    mongoose.connection.on('error', (error) => {
      logger.error('Database connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
      isConnected = false;
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Database connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('Database disconnected');
  }
};

export const getDatabaseStatus = (): string => {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
};
