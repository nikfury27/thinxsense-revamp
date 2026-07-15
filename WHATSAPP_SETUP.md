# Meta WhatsApp Business API & Webhook Integration Setup

This guide walks you through setting up a Meta WhatsApp application, configuring webhooks, verifying signatures, and managing live customer escalation flows for the thinxsense platform.

---

## 1. Setup Meta Developer App

1. Go to [Meta for Developers](https://developers.facebook.com/) and register as a developer.
2. Click **Create App** and choose **Other** -> **Business** (or Choose WhatsApp directly if presented).
3. Under **Add products to your app**, select **WhatsApp** and click **Set up**.
4. In the left panel, navigate to **WhatsApp** -> **API Setup**:
   * You will find your **Temporary access token** (valid for 24 hours) or configure a permanent System User Token.
   * You will find your test phone number details and **Phone number ID**. Copy this to your `server/.env` as `META_PHONE_NUMBER_ID`.

---

## 2. Configure Webhooks

To route WhatsApp replies from the support agent back to the web user, you must register the server webhook endpoint on Meta.

1. Navigate to **WhatsApp** -> **Configuration** in the Meta App settings.
2. Under **Webhook**, click **Edit**:
   * **Callback URL**: The public URL of your server's endpoint: `https://your-domain.com/webhooks/whatsapp`.
     * *Note: For local testing, use a tunneling tool like `ngrok` (e.g. `ngrok http 5000`) to expose port 5000 and get a public `https` URL.*
   * **Verify Token**: Enter the exact same string configured in your `server/.env` as `WEBHOOK_VERIFY_TOKEN` (default: `thinxsense_token`).
3. Click **Verify and Save**. The Meta Graph API will send a GET request to verify this endpoint, which our server responds to automatically.
4. Click **Manage** under Webhook Fields and check the subscription box for **`messages`**. This ensures Meta triggers a POST request to our webhook whenever the agent sends a message.

---

## 3. Webhook Security: Signature Verification

Meta sends the `X-Hub-Signature-256` header in webhook POST requests. The signature is computed as an HMAC-SHA256 hash of the raw JSON body using your app's **App Secret** as the key.

Our backend verifies this signature using the following flow:
1. Extract the `X-Hub-Signature-256` header.
2. Read the raw request body buffer.
3. Compute `hmac('sha256', appSecret).update(rawBody).digest('hex')`.
4. Block and reject the request with HTTP `401 Unauthorized` if the computed signature does not match.

---

## 4. Operational Messaging Flows

Here are the flows mapped between the Web client, the Backend Bridge, and the Agent's WhatsApp:

```
[ Web User ]                   [ Backend Bridge ]                 [ Support Agent ]
     |                                 |                                  |
     |---- Escalate to Human --------->|                                  |
     |                                 |---- WhatsApp Notification ------>| (Agent receives User ID)
     |                                 |     "⚠️ [NEW SUPPORT REQUEST]"   |
     |                                 |                                  |
     |<--- "Connecting you..." --------|                                  |
     |                                 |                                  |
     |====== Chat Mode Switched to "HUMAN" (Agent is mapped exclusively) =======|
     |                                 |                                  |
     |---- "Is Room 2 temperature..."->|                                  |
     |                                 |---- Forward to Agent ----------->| (Agent receives User text)
     |                                 |     "👤 User: Is Room 2..."      |
     |                                 |                                  |
     |                                 |<--- Agent replies text ----------| (Agent types text on WhatsApp)
     |<--- Push Agent msg (WebSockets)-|     (Webhook /webhooks/whatsapp) |
     |                                 |                                  |
     |                                 |<--- Agent types "/end" ----------| (Agent resolves session)
     |<--- "Support agent closed..." --|     (Triggers reset to BOT mode) |
     |                                 |                                  |
```

### Command Handlers:
* `/end`: Resets session mode back to `"BOT"`, deletes the active mapping, and notifies the agent they are free. It then checks the queue and assigns the next user automatically.
