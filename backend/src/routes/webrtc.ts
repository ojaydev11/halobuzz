import express from 'express';
import { webRTCService } from '../services/WebRTCService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /webrtc/offer
 * @desc Create WebRTC offer for streaming
 */
router.post('/offer', authMiddleware, async (req, res) => {
  try {
    const { streamId, quality = 'medium' } = req.body;
    const userId = (req as any).user?.id;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID is required'
      });
    }

    const result = await webRTCService.createOffer(userId, streamId, quality);

    res.json({
      success: result.success,
      data: result.offer,
      error: result.error
    });
  } catch (error) {
    console.error('Error creating WebRTC offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create WebRTC offer'
    });
  }
});

/**
 * @route POST /webrtc/answer
 * @desc Process WebRTC answer
 */
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { peerId, answer } = req.body;

    if (!peerId || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Peer ID and answer are required'
      });
    }

    const result = await webRTCService.processAnswer(peerId, answer);

    res.json({
      success: result.success,
      error: result.error
    });
  } catch (error) {
    console.error('Error processing WebRTC answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process WebRTC answer'
    });
  }
});

/**
 * @route GET /webrtc/peer/:peerId/stats
 * @desc Get peer connection stats
 */
router.get('/peer/:peerId/stats', authMiddleware, async (req, res) => {
  try {
    const { peerId } = req.params;

    const stats = await webRTCService.getPeerStats(peerId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Peer not found'
      });
    }

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting peer stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get peer stats'
    });
  }
});

/**
 * @route DELETE /webrtc/peer/:peerId
 * @desc Close peer connection
 */
router.delete('/peer/:peerId', authMiddleware, async (req, res) => {
  try {
    const { peerId } = req.params;

    const result = await webRTCService.closePeerConnection(peerId);

    res.json({
      success: result.success,
      error: result.error
    });
  } catch (error) {
    console.error('Error closing peer connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close peer connection'
    });
  }
});

/**
 * @route GET /webrtc/peers
 * @desc Get all active peers
 */
router.get('/peers', authMiddleware, async (req, res) => {
  try {
    const peers = await webRTCService.getActivePeers();

    res.json({
      success: true,
      peers
    });
  } catch (error) {
    console.error('Error getting active peers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active peers'
    });
  }
});

/**
 * @route GET /webrtc/status
 * @desc Get WebRTC service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await webRTCService.getServiceStatus();

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting WebRTC status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebRTC status'
    });
  }
});

/**
 * @route POST /webrtc/cleanup
 * @desc Cleanup inactive peers
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    await webRTCService.cleanupInactivePeers();

    res.json({
      success: true,
      message: 'Inactive peers cleaned up successfully'
    });
  } catch (error) {
    console.error('Error cleaning up inactive peers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup inactive peers'
    });
  }
});

export default router;

