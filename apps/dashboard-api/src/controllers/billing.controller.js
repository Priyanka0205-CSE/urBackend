const { Developer, AppError } = require('@urbackend/common');
const crypto = require('crypto');

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

/**
 * Creates a Lemon Squeezy checkout session for the authenticated developer.
 * POST /api/billing/checkout
 */
module.exports.createCheckout = async (req, res, next) => {
    try {
        const apiKey = process.env.LEMONSQUEEZY_API_KEY;
        const storeId = process.env.LEMONSQUEEZY_STORE_ID;
        const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

        if (!apiKey || !storeId || !variantId) {
            return next(new AppError(503, 'Billing is not configured yet. Please contact support.'));
        }

        const developer = await Developer.findById(req.user._id).select('email plan');
        if (!developer) return next(new AppError(404, 'Developer not found'));

        if (developer.plan === 'pro') {
            return next(new AppError(400, 'You are already on the Pro plan.'));
        }

        const body = {
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        email: developer.email,
                        custom: {
                            developer_id: developer._id.toString()
                        }
                    },
                    product_options: {
                        redirect_url: `${process.env.FRONTEND_URL}/billing/success`,
                    }
                },
                relationships: {
                    store: {
                        data: { type: 'stores', id: storeId }
                    },
                    variant: {
                        data: { type: 'variants', id: variantId }
                    }
                }
            }
        };

        const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json'
            },
            body: JSON.stringify(body)
        });

        const json = await response.json();

        if (!response.ok) {
            console.error('Lemon Squeezy checkout error:', json);
            return next(new AppError(502, 'Failed to create checkout session. Please try again.'));
        }

        const checkoutUrl = json?.data?.attributes?.url;
        if (!checkoutUrl) {
            return next(new AppError(502, 'No checkout URL returned from billing provider.'));
        }

        res.json({ success: true, data: { checkoutUrl }, message: '' });
    } catch (err) {
        next(err);
    }
};

/**
 * Handles Lemon Squeezy webhook events.
 * POST /api/billing/webhook
 *
 * Supported events:
 *   - order_created (one-time purchase)
 *   - subscription_created
 *   - subscription_renewed
 *   - subscription_cancelled (no action — auto-degrade on expiry)
 */
module.exports.handleWebhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

        // Validate HMAC signature
        if (webhookSecret) {
            const signature = req.headers['x-signature'];
            if (!signature) {
                return res.status(401).json({ success: false, message: 'Missing webhook signature.' });
            }

            const hmac = crypto.createHmac('sha256', webhookSecret);
            const digest = hmac.update(req.rawBody || JSON.stringify(req.body)).digest('hex');

            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
                return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
            }
        }

        const eventName = req.headers['x-event-name'];
        const payload = req.body;
        const meta = payload?.meta?.custom_data || payload?.data?.attributes?.first_order_item;
        const developerId = payload?.meta?.custom_data?.developer_id;

        if (!developerId) {
            // Unknown origin — acknowledge but skip
            return res.json({ success: true, message: 'No developer_id in payload. Skipped.' });
        }

        const developer = await Developer.findById(developerId);
        if (!developer) {
            console.warn(`Billing webhook: developer not found for id ${developerId}`);
            return res.json({ success: true, message: 'Developer not found. Skipped.' });
        }

        const now = new Date();

        if (eventName === 'order_created' || eventName === 'subscription_created') {
            // Set plan to pro for 30 days (or subscription period)
            const renewsAt = payload?.data?.attributes?.renews_at;
            const planExpiresAt = renewsAt ? new Date(renewsAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            developer.plan = 'pro';
            developer.planActivatedAt = now;
            developer.planExpiresAt = planExpiresAt;
            await developer.save();

            console.log(`✅ Developer ${developerId} upgraded to pro. Expires: ${planExpiresAt}`);
        } else if (eventName === 'subscription_renewed') {
            const renewsAt = payload?.data?.attributes?.renews_at;
            if (renewsAt) {
                developer.planExpiresAt = new Date(renewsAt);
                await developer.save();
                console.log(`🔄 Developer ${developerId} plan renewed. New expiry: ${developer.planExpiresAt}`);
            }
        } else if (eventName === 'subscription_cancelled') {
            // Do NOT downgrade immediately — resolveEffectivePlan handles auto-degrade on expiry
            console.log(`ℹ️ Subscription cancelled for ${developerId}. Will degrade on ${developer.planExpiresAt}`);
        }

        // Always respond 200 to acknowledge
        res.json({ success: true, message: 'Webhook processed.' });
    } catch (err) {
        console.error('Billing webhook error:', err);
        // Still return 200 to avoid Lemon Squeezy retry storms
        res.json({ success: true, message: 'Internal error. Logged.' });
    }
};
