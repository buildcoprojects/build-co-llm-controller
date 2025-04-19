const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Netlify Function: Create Stripe Checkout Session
 *
 * Creates a checkout session for freight capacity payments
 * Linked to artefact: AR-FRT-CAP-USD10K-ERC20
 */
exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { amount, currency = 'usd', customerEmail, customerName, nodeReference } = data;

    // Validate the required fields
    if (!amount || isNaN(parseFloat(amount))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid amount is required' })
      };
    }

    // Convert amount to cents (Stripe requires)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    // Create the checkout session with metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Freight Capacity Purchase',
              description: 'ERC20-backed freight capacity token',
              metadata: {
                artefact: 'AR-FRT-CAP-USD10K-ERC20',
                nodeRef: nodeReference || 'DIRECT',
              },
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        artefact: 'AR-FRT-CAP-USD10K-ERC20',
        nodeReference: nodeReference || 'DIRECT',
        customerName,
        wormholeEnabled: 'true',
        signalTrace: `FRT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      },
      mode: 'payment',
      success_url: `${process.env.URL || 'https://freightnode-api.netlify.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'https://freightnode-api.netlify.app'}/checkout/cancel`,
      customer_email: customerEmail,
    });

    // Return the session ID and URL
    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        status: 'success',
        metadata: session.metadata
      })
    };
  } catch (error) {
    console.error('Stripe checkout error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        message: error.message
      })
    };
  }
};
