import { Throne } from '../models/Throne';
import { logger } from '../config/logger';

export async function throneExpiryJob() {
  try {
    logger.info('Starting throne expiry check job');

    // Find expired thrones
    const expiredThrones = await Throne.findExpired();
    
    if (expiredThrones.length === 0) {
      logger.info('No expired thrones found');
      return;
    }

    logger.info(`Found ${expiredThrones.length} expired thrones`);

    let processedCount = 0;
    let errorCount = 0;

    for (const throne of expiredThrones) {
      try {
        // Mark throne as inactive
        throne.isActive = false;
        await throne.save();

        // TODO: Broadcast throne expiry event via Socket.IO
        // This would notify all connected clients about the throne expiry
        await broadcastThroneExpiry(throne);

        processedCount++;
        logger.info(`Throne ${throne._id} expired and cleared`);

      } catch (error) {
        errorCount++;
        logger.error(`Failed to process expired throne ${throne._id}:`, error);
      }
    }

    logger.info(`Throne expiry job completed: ${processedCount} processed, ${errorCount} errors`);

  } catch (error) {
    logger.error('Throne expiry job failed:', error);
    throw error;
  }
}

async function broadcastThroneExpiry(throne: any) {
  try {
    // This would be implemented with Socket.IO to broadcast to all connected clients
    // For now, we'll just log the event
    logger.info(`Broadcasting throne expiry for stream ${throne.streamId}: ${throne.username} throne expired`);
    
    // TODO: Implement Socket.IO broadcast
    // io.to(`stream:${throne.streamId}`).emit('throne:expired', {
    //   throneId: throne._id,
    //   streamId: throne.streamId,
    //   username: throne.username,
    //   totalCoins: throne.totalCoins
    // });
    
  } catch (error) {
    logger.error('Failed to broadcast throne expiry:', error);
  }
}
