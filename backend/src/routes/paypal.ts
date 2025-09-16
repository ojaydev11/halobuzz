import express from 'express';
import { paymentService } from '../services/PaymentService';
import { logger } from '../config/logger';

const router = express.Router();

// PayPal webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const { event_type, resource } = req.body;

    logger.info('PayPal webhook received', { event_type, resource_id: resource?.id });

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Order approved, ready for capture
        logger.info('PayPal order approved', { orderId: resource.id });
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        // Payment captured successfully
        await handlePaymentCapture(resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        // Payment capture denied
        await handlePaymentDenied(resource);
        break;

      default:
        logger.info('Unhandled PayPal webhook event', { event_type });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('PayPal webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// PayPal payment success callback
router.get('/success', async (req, res) => {
  try {
    const { token, PayerID } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment token'
      });
    }

    // Capture the PayPal order
    const captureResult = await paymentService.capturePayPalOrder(token as string);

    if (captureResult.success) {
      res.redirect(`${process.env.FRONTEND_URL}/payment/success?transactionId=${captureResult.transactionId}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/payment/error?error=${encodeURIComponent(captureResult.error)}`);
    }
  } catch (error) {
    logger.error('PayPal success callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error?error=Payment processing failed`);
  }
});

// PayPal payment cancel callback
router.get('/cancel', async (req, res) => {
  try {
    logger.info('PayPal payment cancelled by user');
    res.redirect(`${process.env.FRONTEND_URL}/payment/cancel`);
  } catch (error) {
    logger.error('PayPal cancel callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error?error=Payment cancelled`);
  }
});

async function handlePaymentCapture(resource: any) {
  try {
    const captureId = resource.id;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    
    if (orderId) {
      // Find and update transaction
      const transaction = await paymentService.getTransactionByOrderId(orderId);
      if (transaction) {
        transaction.status = 'completed';
        transaction.referenceId = captureId;
        await transaction.save();

        // Update user coins
        await paymentService.updateUserCoins(transaction.userId.toString(), transaction.amount);

        logger.info('PayPal payment processed successfully', {
          userId: transaction.userId,
          amount: transaction.amount,
          captureId
        });
      }
    }
  } catch (error) {
    logger.error('Error handling PayPal payment capture:', error);
  }
}

async function handlePaymentDenied(resource: any) {
  try {
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    
    if (orderId) {
      // Find and update transaction
      const transaction = await paymentService.getTransactionByOrderId(orderId);
      if (transaction) {
        transaction.status = 'failed';
        await transaction.save();

        logger.info('PayPal payment denied', {
          userId: transaction.userId,
          amount: transaction.amount,
          orderId
        });
      }
    }
  } catch (error) {
    logger.error('Error handling PayPal payment denial:', error);
  }
}

export default router;
