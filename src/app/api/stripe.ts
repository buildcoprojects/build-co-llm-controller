import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil', // Use the latest API version
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderSize,
      companyName,
      contactEmail,
      nodeReference,
      leadType,
      customerId
    } = body;

    if (!orderSize || orderSize <= 0) {
      return NextResponse.json(
        { error: 'Order size must be greater than 0' },
        { status: 400 }
      );
    }

    // Calculate amount in cents
    const amount = Math.round(orderSize * 100);

    // Create or get customer
    let customer;
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
    } else if (contactEmail) {
      // Look up customer by email
      const customers = await stripe.customers.list({
        email: contactEmail,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: contactEmail,
          name: companyName,
          metadata: {
            nodeReference,
            leadType
          }
        });
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customer?.id,
      metadata: {
        companyName,
        contactEmail,
        nodeReference,
        leadType,
        orderSize: orderSize.toString(),
        signalSource: 'llm-controller'
      }
    });

    return NextResponse.json({
      status: 'success',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe API error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to create Stripe checkout session' },
      { status: 500 }
    );
  }
}
