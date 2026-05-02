const express = require('express');
const Stripe = require('stripe');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const PLANS = {
  starter: { label: 'Starter', seconds_limit: 14400,
    yearly:  { amount: 11988, interval: 'year' },
    monthly: { amount: 1299,  interval: 'month' },
  },
  pro: { label: 'Pro', seconds_limit: 36000,
    yearly:  { amount: 23988, interval: 'year' },
    monthly: { amount: 2399,  interval: 'month' },
  },
  max: { label: 'Max', seconds_limit: 72000,
    yearly:  { amount: 47988, interval: 'year' },
    monthly: { amount: 4499,  interval: 'month' },
  },
};

// POST /api/stripe/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan, billing = 'yearly' } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    const pricing = PLANS[plan][billing];

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.user.id)
      .single();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: pricing.interval },
            product_data: { name: `GetFrench ${PLANS[plan].label}` },
            unit_amount: pricing.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/app?upgraded=true`,
      cancel_url: `${process.env.FRONTEND_URL}/app`,
      metadata: { user_id: req.user.id, plan },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// POST /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, plan } = session.metadata || {};
    if (user_id && plan && PLANS[plan]) {
      await supabase
        .from('users')
        .update({
          plan,
          seconds_limit: PLANS[plan].seconds_limit,
          seconds_used: 0,
        })
        .eq('id', user_id);
      console.log(`[Stripe] upgraded user ${user_id} to ${plan}`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = event.data.object.customer;
    await supabase
      .from('users')
      .update({ plan: 'free', seconds_limit: 7200, seconds_used: 0 })
      .eq('stripe_customer_id', customerId);
    console.log(`[Stripe] subscription cancelled for customer ${customerId}`);
  }

  res.json({ received: true });
});

// POST /api/stripe/portal
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const customers = await stripe.customers.list({ email: req.user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    if (!customerId) return res.status(404).json({ error: 'No subscription found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/app`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Portal failed' });
  }
});

module.exports = router;
